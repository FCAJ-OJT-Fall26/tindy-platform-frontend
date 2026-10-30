import { HubConnectionBuilder, LogLevel, type HubConnection } from "@microsoft/signalr"
import { CheckCheck, MessageCircle, MoreHorizontal, Paperclip, Search, Send, Smile, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { EmptyState, PageHeader } from "../../components/ui"
import { apiOrigin } from "../../services/apiConfig"
import { ApiError, getStoredToken } from "../../services/apiClient"
import { createDirectConversation, getChatConversations, getChatMessages, mapChatMessage, markChatRead, searchChatUsers, sendChatMessage, type ChatConversation, type ChatMessage, type ChatUser } from "../../services/chat.service"

export type { ChatMessage } from "../../services/chat.service"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?"
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

// Conversations are server-owned. No local/demo conversation is used as a fallback.
export function Messages() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ChatUser[]>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const connection = useRef<HubConnection | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const firstUnreadRef = useRef<HTMLDivElement | null>(null)
  const conversationId = params.get("conversation")
  const selected = useMemo(() => conversations.find((item) => item.conversationId === conversationId) ?? null, [conversations, conversationId])

  const refresh = useCallback(async () => {
    const data = await getChatConversations()
    setConversations(data)
    if (!conversationId && data[0]) setParams({ conversation: data[0].conversationId })
  }, [conversationId, setParams])

  useEffect(() => {
    void refresh().catch(() => setError("Could not load your conversations.")).finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    if (query.trim().length < 2) { setUsers([]); return }
    const timer = window.setTimeout(() => void searchChatUsers(query).then(setUsers).catch(() => setUsers([])), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!conversationId) { setMessages([]); return }
    firstUnreadRef.current = null
    void getChatMessages(conversationId)
      .then((page) => {
        setMessages(page.items)
      })
      .catch(() => setError("Could not load messages."))
  }, [conversationId])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages.length, conversationId])

  useEffect(() => {
    if (!getStoredToken()) return
    const hub = new HubConnectionBuilder().withUrl(`${apiOrigin()}/hubs/chat`, { accessTokenFactory: () => getStoredToken() ?? "" }).withAutomaticReconnect().configureLogging(LogLevel.Warning).build()
    connection.current = hub
    hub.on("message.created", (message: ChatMessage) => {
      const normalizedMessage = mapChatMessage(message)
      if (normalizedMessage.conversationId === conversationId) setMessages((current) => current.some((item) => item.messageId === normalizedMessage.messageId) ? current : [...current, normalizedMessage])
      void refresh()
    })
    void hub.start().then(() => {
      if (conversationId) return hub.invoke("JoinConversation", conversationId).catch(() => undefined)
      return undefined
    }).catch(() => undefined)
    return () => { connection.current = null; void hub.stop() }
  }, [conversationId, refresh])

  async function selectUser(user: ChatUser) {
    try { const conversation = await createDirectConversation(user.userId); setQuery(""); setUsers([]); await refresh(); setParams({ conversation: conversation.conversationId }) }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Could not start the conversation.") }
  }

  async function submitMessage() {
    const body = draft.trim()
    if (!body || !conversationId) return
    const clientMessageId = crypto.randomUUID()
    setDraft("")
    try {
      if (connection.current?.state === "Connected") await connection.current.invoke("SendMessage", conversationId, body, clientMessageId)
      else { const message = await sendChatMessage(conversationId, body, clientMessageId); setMessages((current) => [...current, message]); await refresh() }
    } catch { setDraft(body); setError("Could not send the message.") }
  }

  async function jumpToFirstUnread() {
    const container = messagesContainerRef.current
    const target = firstUnreadRef.current
    if (container && target) {
      const targetTop = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
      container.scrollTo({ top: Math.max(0, targetTop - container.clientHeight / 3), behavior: "smooth" })
    }
    if (conversationId) {
      await markChatRead(conversationId).catch(() => undefined)
      await refresh().catch(() => undefined)
    }
  }

  return (
    <>
      <PageHeader
        title="Conversations that move things forward."
        description="Connect directly with the people building projects with you."
      />
      <section className="messaging chat-workspace">
        <aside className="conversation-sidebar chat-inbox">
          <div className="conversation-heading chat-inbox-heading"><div><span className="chat-eyebrow">INBOX</span><h3>Messages</h3></div><span className="chat-count">{conversations.length}</span></div>
          <label className="search-input chat-search">
            <Search size={16} />
            <input
              aria-label="Search users"
              placeholder="Search people to chat…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {users.length > 0 && <div className="chat-results"><span className="chat-section-label">People</span>{users.map((user) => <button className="chat-contact" key={user.userId} onClick={() => void selectUser(user)}><span className="chat-avatar chat-avatar-search">{initials(user.displayName)}</span><span><strong>{user.displayName}</strong><small>{user.username ? `@${user.username}` : "Tindy account"}</small></span><MessageCircle size={16} /></button>)}</div>}
          <div className="chat-conversation-list"><span className="chat-section-label">Conversations</span>{loading ? <p className="chat-muted">Loading…</p> : conversations.map((item) => <button className={`chat-contact ${item.conversationId === conversationId ? "active" : ""}`} key={item.conversationId} onClick={() => setParams({ conversation: item.conversationId })}><span className="chat-avatar">{initials(item.otherParticipant.displayName)}</span><span className="chat-contact-copy"><strong>{item.otherParticipant.displayName}</strong><small>{item.lastMessageAt ? "Active conversation" : "Start a conversation"}</small></span>{item.unreadCount > 0 && <span className="chat-unread">{item.unreadCount}</span>}</button>)}{!loading && !conversations.length && !users.length && <EmptyState title="No conversations yet" description="Search for a real account to start chatting." />}</div>
        </aside>
        <div className="chat-main chat-room">
          {selected ? <><header className="chat-header chat-room-header"><div className="chat-avatar chat-avatar-large">{initials(selected.otherParticipant.displayName)}</div><div className="chat-room-identity"><h3>{selected.otherParticipant.displayName}</h3><p><span className="chat-online-dot" />Active on Tindy</p></div><button className="chat-icon-button" type="button" aria-label="More options"><MoreHorizontal size={20} /></button></header><div ref={messagesContainerRef} className="chat-messages chat-message-stream"><div className="chat-day-divider"><span>Today</span></div>{selected.unreadCount > 0 && <button className="chat-unread-jump" type="button" onClick={() => void jumpToFirstUnread()}>Jump to first unread <span>{selected.unreadCount}</span></button>}{messages.map((message) => { const outgoing = message.senderId !== selected.otherParticipant.userId; const isFirstUnread = !outgoing && selected.firstUnreadAt && new Date(message.createdAt) >= new Date(selected.firstUnreadAt); return <div className={`chat-message-row ${outgoing ? "outgoing" : "incoming"} ${isFirstUnread ? "first-unread" : ""}`} key={message.messageId} ref={isFirstUnread && !firstUnreadRef.current ? firstUnreadRef : undefined}>{isFirstUnread && <div className="chat-unread-divider"><span>New messages</span></div>}<div className="chat-message-stack"><div className="chat-bubble">{message.body}</div><div className="chat-message-meta"><span>{formatMessageTime(message.createdAt)}</span>{outgoing && <CheckCheck size={14} />}</div></div></div> })}</div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void submitMessage() }}><button className="chat-composer-icon" type="button" aria-label="Attach file"><Paperclip size={19} /></button><input aria-label="Message" placeholder="Write a message…" maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} /><button className="chat-composer-icon" type="button" aria-label="Emoji"><Smile size={19} /></button><button className="chat-send-button" type="submit" aria-label="Send"><Send size={17} /></button></form></> : <div className="chat-empty"><div className="chat-empty-orbit"><MessageCircle size={28} /></div><h3>Start a conversation</h3><p>Search for an account on the left to send a private message.</p></div>}
          {error && <div className="chat-error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button></div>}
        </div>
      </section>
    </>
  )
}

export default Messages
