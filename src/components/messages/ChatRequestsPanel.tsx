import {
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FolderKanban,
  Clock3,
  Check,
  ShieldCheck,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useChat, CHAT_RESYNC } from "../../services/ChatContext"
import {
  actOnChatRequest,
  chatRequestError,
  getChatBlocks,
  getChatRequests,
  requestReason,
  setChatBlock,
  type ChatBlock,
  type RequestPage,
  type ChatRequest,
} from "../../services/chat-requests.service"

const labels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
}
function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"
  )
}
function formatDate(value: string, short = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(short ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(value))
}
export default function ChatRequestsPanel() {
  const [params, setParams] = useSearchParams()
  const direction = params.get("direction") === "sent" ? "sent" : "received"
  const [history, setHistory] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<RequestPage | null>(null)
  const [blocks, setBlocks] = useState<ChatBlock[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const lock = useRef(false)
  const { refresh, pendingRequests } = useChat()
  useEffect(() => {
    const c = new AbortController()
    setLoading(true)
    void Promise.all([
      getChatRequests(direction, history, page, c.signal),
      getChatBlocks(c.signal),
    ])
      .then(([rows, blocked]) => {
        if (!c.signal.aborted) {
          setData(rows)
          setBlocks(blocked)
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(chatRequestError(e))
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false)
      })
    return () => c.abort()
  }, [direction, history, page, revision])
  useEffect(() => {
    const changed = () => setRevision((v) => v + 1)
    window.addEventListener(CHAT_RESYNC, changed)
    return () => window.removeEventListener(CHAT_RESYNC, changed)
  }, [])
  async function run(action: () => Promise<unknown>, openRoom = false) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    try {
      const result = (await action()) as ChatRequest | undefined
      await refresh()
      if (openRoom && result?.status === "accepted" && result.conversation_id)
        setParams({ conversation: result.conversation_id })
    } catch (e) {
      setError(chatRequestError(e))
    } finally {
      lock.current = false
      setBusy(false)
      setRevision((v) => v + 1)
    }
  }
  return (
    <section className="message-requests" aria-label="Message requests">
      <div className="request-inbox" aria-busy={loading}>
        <header className="request-inbox-heading">
          <div className="request-heading-icon">
            <Inbox size={21} />
          </div>
          <div>
            <h2>Message requests</h2>
            <p>A new connection starts with a conversation.</p>
          </div>
          <button
            className="request-refresh"
            aria-label="Refresh requests"
            title="Refresh requests"
            disabled={busy || loading}
            onClick={() => {
              setError("")
              setRevision((v) => v + 1)
            }}
          >
            <RefreshCw
              size={17}
              className={loading ? "request-spinning" : ""}
            />
          </button>
        </header>
        <div className="request-inbox-controls">
          <div className="request-direction" aria-label="Request direction">
            <button
              aria-pressed={direction === "received"}
              onClick={() => {
                setPage(1)
                setData(null)
                setError("")
                setParams({ tab: "requests", direction: "received" })
              }}
            >
              <ArrowDownLeft size={16} />
              Received{pendingRequests > 0 && <span>{pendingRequests}</span>}
            </button>
            <button
              aria-pressed={direction === "sent"}
              onClick={() => {
                setPage(1)
                setData(null)
                setError("")
                setParams({ tab: "requests", direction: "sent" })
              }}
            >
              <ArrowUpRight size={16} />
              Sent
            </button>
          </div>
          <select
            aria-label="Request status"
            className="request-filter"
            value={history ? "all" : "pending"}
            onChange={(e) => {
              setHistory(e.target.value === "all")
              setPage(1)
              setError("")
            }}
          >
            <option value="pending">Pending requests</option>
            <option value="all">All activity</option>
          </select>
        </div>
        {error && (
          <div role="alert" className="chat-request-error">
            {error}
          </div>
        )}
        {loading && !data ? (
          <div className="request-loading" role="status">
            <span className="request-skeleton" />
            <span className="request-skeleton" />
            <span className="request-skeleton" />
            <p>Loading requests…</p>
          </div>
        ) : data?.items.length ? (
          <div className="request-list">
            {data.items.map((r) => (
              <article
                className="request-item"
                key={r.request_id}
                data-request-id={r.request_id}
              >
                <div className="request-person">
                  <span className="request-avatar">
                    {initials(r.other_user.display_name)}
                  </span>
                  <div className="request-person-copy">
                    <h3>{r.other_user.display_name}</h3>
                    <span>
                      {direction === "sent" ? "Sent " : "Received "}
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  <span className={"request-status " + r.status}>
                    <span />
                    {labels[r.status] ?? r.status}
                  </span>
                </div>
                <div className="request-project">
                  <span className="request-project-icon">
                    <FolderKanban size={18} />
                  </span>
                  <div>
                    <Link to={"/project/" + r.project_id}>
                      {r.project_name}
                    </Link>
                    <small>
                      {r.position_title ?? "General project inquiry"}
                    </small>
                  </div>
                  <ArrowUpRight size={15} />
                </div>
                <div className="request-opening">
                  <span className="request-purpose">
                    {r.kind === "application"
                      ? "APPLICATION CONVERSATION"
                      : r.kind === "opportunity"
                        ? "PROJECT OPPORTUNITY"
                        : "PROJECT INQUIRY"}
                  </span>
                  <p>{r.body}</p>
                </div>
                {r.end_reason && (
                  <p className="request-end-reason">
                    {requestReason[r.end_reason] ??
                      "This request is no longer active."}
                  </p>
                )}
                <footer className="request-item-footer">
                  <span className="request-expiry">
                    {r.status === "pending" && (
                      <>
                        <Clock3 size={13} />
                        Expires {formatDate(r.expires_at, true)}
                      </>
                    )}
                  </span>
                  <div className="request-item-actions">
                    {r.status === "pending" &&
                      (direction === "received" ? (
                        <>
                          <button
                            className="request-action-primary"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => actOnChatRequest(r.request_id, "accept"),
                                true,
                              )
                            }
                          >
                            <Check size={15} />
                            Accept request
                          </button>
                          <button
                            className="request-action-secondary"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                actOnChatRequest(r.request_id, "reject"),
                              )
                            }
                          >
                            Decline
                          </button>
                          <button
                            className="request-action-quiet"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                setChatBlock(r.other_user.user_id, true),
                              )
                            }
                          >
                            Block
                          </button>
                        </>
                      ) : (
                        <button
                          className="request-action-secondary"
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              actOnChatRequest(r.request_id, "cancel"),
                            )
                          }
                        >
                          Cancel request
                        </button>
                      ))}
                    {r.status === "accepted" && r.conversation_id && (
                      <Link
                        className="request-action-primary"
                        to={"/messages?conversation=" + r.conversation_id}
                      >
                        Open conversation
                        <ArrowUpRight size={15} />
                      </Link>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="request-empty">
            <div className="request-empty-art">
              <span />
              <Inbox size={32} strokeWidth={1.5} />
              <span className="request-empty-check">
                <Check size={14} />
              </span>
            </div>
            <span className="request-empty-eyebrow">
              {history
                ? "A FRESH START"
                : direction === "received"
                  ? "ALL CAUGHT UP"
                  : "MAKE THE FIRST MOVE"}
            </span>
            <h3>
              {history
                ? "No requests yet"
                : direction === "received"
                  ? "A little quiet. A lot of possibility."
                  : "Your next connection is out there."}
            </h3>
            <p>
              {direction === "received"
                ? "When someone wants to connect about a project, their request will appear here. You decide who gets to start a conversation."
                : "Send a request from a project or a member’s profile. Once they accept, you can start chatting."}
            </p>
            <Link to="/discover" className="request-discover">
              Explore projects
              <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
        {data && (page > 1 || data.has_more) && (
          <nav className="request-pagination" aria-label="Request pages">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={15} />
              Previous
            </button>
            <span>Page {page}</span>
            <button
              disabled={!data.has_more || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </nav>
        )}
      </div>
      <aside className="request-sidebar">
        <section className="request-safety-card">
          <span className="request-safety-icon">
            <ShieldCheck size={22} strokeWidth={1.6} />
          </span>
          <h3>Your inbox. Your choice.</h3>
          <p>
            Accept the people you want to connect with. Decline or block anyone
            else.
          </p>
          <div>
            <Clock3 size={14} />
            <span>Requests expire after 7 days.</span>
          </div>
        </section>
        <section className="request-blocked-card">
          <header>
            <h3>
              <ShieldOff size={16} />
              Blocked contacts
            </h3>
            <span>{blocks.length}</span>
          </header>
          {blocks.length ? (
            <>
              <p className="request-blocked-description">
                These people can’t message you.
              </p>
              <div className="request-blocked-list">
                {blocks.map((b) => (
                  <div className="request-blocked-person" key={b.user_id}>
                    <span className="request-avatar small">
                      {initials(b.display_name)}
                    </span>
                    <span
                      className="request-blocked-name"
                      title={b.display_name}
                    >
                      {b.display_name}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(() => setChatBlock(b.user_id, false))
                      }
                      aria-label={"Unblock " + b.display_name}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
              <p className="request-blocked-note">
                Unblocking won’t restore cancelled requests.
              </p>
            </>
          ) : (
            <div className="request-no-blocks">
              <Check size={16} />
              <p>
                No blocked contacts.
                <span>You’re in control if that changes.</span>
              </p>
            </div>
          )}
        </section>
      </aside>
    </section>
  )
}
