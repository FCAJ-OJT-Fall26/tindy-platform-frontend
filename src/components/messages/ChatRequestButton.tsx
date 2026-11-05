import { MessageCircle, Share2 } from "lucide-react"
import "./chat-contact-actions.css"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { Modal } from "../ui"
import { useChat } from "../../services/ChatContext"
import {
  chatRequestError,
  createChatRequest,
  shareChatContext,
  getRequestContexts,
  type RequestContext,
} from "../../services/chat-requests.service"

export function ChatRequestComposer({
  userId,
  name,
  projectId,
  positionId,
  conversationId,
  onClose,
}: {
  userId: string
  name: string
  projectId?: string
  positionId?: string
  conversationId?: string
  onClose: () => void
}) {
  const { refresh } = useChat()
  const navigate = useNavigate()
  const [options, setOptions] = useState<RequestContext[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const attempts = useRef(new Map<string, string>())
  const keyOf = (o: RequestContext) =>
    `${o.project_id}:${o.position_id ?? "general"}`
  useEffect(() => {
    const c = new AbortController()
    void getRequestContexts(userId, c.signal)
      .then((rows) => {
        if (c.signal.aborted) return
        setOptions(rows)
        const preferred =
          rows.find(
            (o) =>
              o.project_id === projectId &&
              (positionId ? o.position_id === positionId : !o.position_id),
          ) ??
          rows.find((o) => o.project_id === projectId) ??
          rows[0]
        setSelected(preferred ? keyOf(preferred) : "")
        setSelectedProject(preferred?.project_id ?? "")
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(chatRequestError(e))
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false)
      })
    return () => c.abort()
  }, [userId, projectId, positionId])
  const projects = Array.from(
    new Map(options.map((o) => [o.project_id, o.project_name])).entries(),
  )
  const topics = options.filter((o) => o.project_id === selectedProject)
  const context = topics.find((o) => keyOf(o) === selected)
  const send = async () => {
    if (!context || !body.trim() || lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    const input = JSON.stringify([
      userId,
      selected,
      context.application_id,
      body.trim(),
    ])
    const key = attempts.current.get(input) ?? crypto.randomUUID()
    attempts.current.set(input, key)
    try {
      if (conversationId) {
        await shareChatContext(conversationId, context, body.trim(), key)
        await refresh()
        onClose()
        navigate("/messages?conversation=" + conversationId)
        return
      }
      const result = await createChatRequest(userId, context, body.trim(), key)
      await refresh()
      onClose()
      navigate(
        result.conversation_id
          ? `/messages?conversation=${result.conversation_id}`
          : `/messages?tab=requests&direction=${
              result.request?.sender_id === userId ? "received" : "sent"
            }`,
      )
    } catch (e) {
      setError(chatRequestError(e))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`Request a conversation · ${name}`}
      onClose={onClose}
      dismissible={!busy}
      className="chat-request-dialog"
    >
      <p>
        {conversationId
          ? "Share a project in your existing conversation. No new request needed."
          : "Introduce yourself and the project you’d like to discuss. They’ll need to accept before you can chat."}
      </p>
      {loading ? (
        <p role="status">Loading projects…</p>
      ) : (
        <>
          <label className="form-field">
            Project
            <select
              aria-label="Project"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value)
                setSelected("")
              }}
              disabled={busy || !projects.length}
            >
              <option value="">Choose a project</option>
              {projects.map(([id, projectName]) => (
                <option key={id} value={id}>
                  {projectName}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Position / topic
            <select
              aria-label="Position / topic"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy || !selectedProject || !topics.length}
            >
              <option value="">{selectedProject ? "Choose a position or topic" : "Choose a project first"}</option>
              {topics.map((o) => (
                <option key={keyOf(o)} value={keyOf(o)}>
                  {o.position_title ?? "General project inquiry"}
                  {o.application_id ? " · Application" : ""}
                </option>
              ))}
            </select>
          </label>
          {!options.length && !error && (
            <p>There are no open projects to connect about right now.</p>
          )}
          {context && (
            <p className="helper-text">
              {context.application_id
                ? "Discuss application"
                : context.position_id
                  ? "Discuss a project opportunity"
                  : "General project inquiry"}
            </p>
          )}
          <label className="form-field">
            Opening message
            <textarea
              aria-label="Opening message"
              maxLength={500}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              placeholder="Say hello and tell them what you’d like to discuss…"
            />
          </label>
          <small>{body.length}/500 · Requests expire after 7 days</small>
        </>
      )}
      {error && (
        <p role="alert" className="chat-request-error">
          {error}
        </p>
      )}
      <div className="chat-request-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Close
        </button>
        <button
          className="btn btn-primary"
          disabled={busy || loading || !context || !body.trim()}
          onClick={() => void send()}
        >
          {busy
            ? "Sending…"
            : conversationId
              ? "Share project"
              : "Send request"}
        </button>
      </div>
    </Modal>
  )
}

export default function ChatRequestButton({
  userId,
  name,
  projectId,
  positionId,
  disabled,
  label = "Request a conversation",
  variant = "default",
}: {
  userId: string
  name: string
  projectId?: string
  positionId?: string
  disabled?: boolean
  label?: string
  variant?: "default" | "project"
}) {
  const [open, setOpen] = useState(false)
  const { conversations } = useChat()
  const navigate = useNavigate()
  const room = conversations.find((c) => c.otherParticipant.userId === userId)
  return (
    <div
      className={
        "chat-contact-actions" +
        (variant === "project" ? " chat-contact-actions--project" : "")
      }
      role="group"
      aria-label="Conversation actions"
    >
      <button
        type="button"
        className="btn btn-secondary"
        disabled={!room && disabled}
        onClick={() =>
          room
            ? navigate(`/messages?conversation=${room.conversationId}`)
            : setOpen(true)
        }
      >
        <MessageCircle size={15} strokeWidth={1.7} />
        {variant === "project"
          ? "Message leader"
          : room
            ? "Open conversation"
            : label}
      </button>
      {room && projectId && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || room.isBlocked}
          onClick={() => setOpen(true)}
        >
          <Share2 size={14} strokeWidth={1.7} />
          {variant === "project" ? "Share project" : "Share project in chat"}
        </button>
      )}
      {open && (
        <ChatRequestComposer
          conversationId={room?.conversationId}
          userId={userId}
          name={name}
          projectId={projectId}
          positionId={positionId}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
