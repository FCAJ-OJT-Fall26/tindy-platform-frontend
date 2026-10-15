import { useState } from "react"
import { useSearchParams, Link } from "react-router"
import {
  Search,
  ShieldCheck,
  FolderKanban,
  Paperclip,
  CheckCheck,
  Send,
  ArrowUpRight,
} from "lucide-react"
import { useTindy } from "../../store"
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  EmptyState,
} from "../../components/ui"

export type ChatMessage = {
  body: string
  outgoing: boolean
  file?: boolean
}

export function Messages() {
  const [params, setParams] = useSearchParams()
  const { notify, profile } = useTindy()
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState("")
  const [tab, setTab] = useState("General chat")
  const [history, setHistory] = useState<Record<string, ChatMessage[]>>({})
  const current = params.get("conversation") || "Minh Nguyen"
  const people = [
    ...new Set(["Minh Nguyen", "EcoTrack team", "Cao Thanh Nhan", current]),
  ]
  const team = current.includes("team")
  const initial: ChatMessage[] =
    current === "Minh Nguyen"
      ? [
          {
            body: `Hey ${profile.name.split(" ")[0]}! Your experience with .NET and RAG caught my eye. I think you’d be a great fit for our AI Customer Support project.`,
            outgoing: false,
          },
          {
            body: "Thanks for reaching out! The project sounds really interesting. I’d love to learn more about the architecture.",
            outgoing: true,
          },
          {
            body: "Absolutely. We’re building the backend on .NET, with PostgreSQL and AWS. Would you have 8–10 hours a week to collaborate?",
            outgoing: false,
          },
        ]
      : [
          {
            body: team
              ? "Welcome to the team! Our next check-in is Friday at 5 PM. Share what you’re working on here."
              : `Hi! I’d love to connect about AI Customer Support System.`,
            outgoing: !team,
          },
        ]
  const messages = history[current] || initial
  const send = (body: string, file = false) => {
    if (!body.trim()) return
    setHistory((old) => ({
      ...old,
      [current]: [...messages, { body, outgoing: true, file }],
    }))
    setDraft("")
    if (!file) notify("Message sent")
  }

  return (
    <>
      <PageHeader
        title="Conversations that move things forward."
        description="Connect with project leaders, candidates, and your team."
      />
      <section className="messaging">
        <aside className="conversation-sidebar">
          <div className="conversation-heading">
            <h3>Messages</h3>
            <span className="badge">{people.length}</span>
          </div>
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="conversation-list">
            {people
              .filter((person) =>
                person.toLowerCase().includes(query.toLowerCase()),
              )
              .map((person, index) => (
                <button
                  key={person}
                  className={`conversation ${
                    current === person ? "active" : ""
                  }`}
                  onClick={() => {
                    setParams({ conversation: person })
                    setTab("General chat")
                    setDraft("")
                  }}
                >
                  <Avatar
                    name={person}
                    color={index === 0 ? "teal" : index === 1 ? "green" : "sky"}
                  />
                  <div>
                    <div>
                      <strong>{person}</strong>
                      <small>{index === 0 ? "10:42" : "Yesterday"}</small>
                    </div>
                    <span>
                      {person.includes("team")
                        ? "EcoTrack · Team conversation"
                        : "AI Customer Support System"}
                    </span>
                    <p>
                      {history[person]?.at(-1)?.body ||
                        (index === 0
                          ? "Would you have 8–10 hours a week?"
                          : "Let’s build something meaningful.")}
                    </p>
                  </div>
                  {index === 0 && <i />}
                </button>
              ))}
          </div>
          {query &&
            !people.some((person) =>
              person.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <EmptyState
                title="No conversations found"
                description="Try a different name."
              />
            )}
          <div className="conversation-context">
            <ShieldCheck size={15} />
            <span>
              Your project conversations,
              <br />
              all in one place.
            </span>
          </div>
        </aside>
        <div className="chat-main">
          <div className="chat-header">
            <Avatar name={current} color="teal" />
            <div>
              <h3>{current}</h3>
              <p>
                <span className="online-dot" />
                {team ? "Team conversation" : "Project leader / candidate"}{" "}
                <b>·</b> FCAJ
              </p>
            </div>
            <Link
              to={team ? "/project/ecotrack" : "/project/cloud-desk"}
              className="btn btn-secondary"
            >
              View project <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="chat-project-context">
            <FolderKanban size={15} />
            <span>{team ? "EcoTrack" : "AI Customer Support System"}</span>
            <Badge>PROJECT CONTEXT</Badge>
          </div>
          {team && (
            <div className="tabs chat-tabs">
              {["General chat", "Announcements", "Team members"].map((item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          {tab === "Announcements" ? (
            <div className="chat-announcement">
              <Badge tone="blue">TEAM UPDATE</Badge>
              <h3>Kickoff · Friday, 5 PM</h3>
              <p>
                Bring your ideas and questions. We’ll review the architecture
                and plan our first sprint.
              </p>
            </div>
          ) : tab === "Team members" ? (
            <div className="chat-announcement">
              {["Jamie Le", profile.name, "An Hoang", "Linh Tran"].map(
                (person) => (
                  <div className="team-person" key={person}>
                    <Avatar name={person} />
                    <strong>{person}</strong>
                    <Badge>MEMBER</Badge>
                  </div>
                ),
              )}
            </div>
          ) : (
            <>
              <div className="chat-messages">
                <div className="chat-date">
                  <span>Today</span>
                </div>
                {messages.map((message, index) => (
                  <div
                    className={`message-row ${
                      message.outgoing ? "outgoing" : ""
                    }`}
                    key={index}
                  >
                    {!message.outgoing && (
                      <Avatar name={current} color="teal" />
                    )}
                    <div>
                      <div className="chat-bubble">
                        {message.file && <Paperclip size={15} />} {message.body}
                      </div>
                      <small>
                        {message.outgoing ? "You" : current.split(" ")[0]} · 10:
                        {(32 + index).toString().padStart(2, "0")}{" "}
                        {message.outgoing && <CheckCheck size={12} />}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="message-composer"
                onSubmit={(event) => {
                  event.preventDefault()
                  send(draft)
                }}
              >
                <label className="attach-file" title="Attach a file">
                  <Paperclip size={20} />
                  <input
                    type="file"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        send(file.name, true)
                        notify(
                          "Attachment added · Filename only in this prototype",
                        )
                      }
                    }}
                  />
                </label>
                <input
                  aria-label="Write a message"
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button disabled={!draft.trim()} aria-label="Send message">
                  <Send size={17} />
                </Button>
              </form>
              <div className="chat-demo-note">
                Local demo conversation · Messages are not sent to a server.
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

export default Messages
