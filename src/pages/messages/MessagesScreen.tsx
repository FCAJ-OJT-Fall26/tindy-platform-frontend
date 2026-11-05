import { MessageCircle, Search, Send, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { EmptyState, PageHeader } from "../../components/ui"
import { ApiError } from "../../services/apiClient"
import {
  createDirectConversation,
  getChatMessages,
  markChatRead,
  searchChatUsers,
  type ChatMessage,
  type ChatUser,
  type ChatMessagesPage,
} from "../../services/chat.service"

import {
  mergeChatMessages as merge,
  firstUnreadMessageId as findFirstUnread,
} from "../../services/chat-state"
import { useChat, CHAT_MESSAGE, CHAT_RESYNC } from "../../services/ChatContext"

export type { ChatMessage } from "../../services/chat.service"

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  )
}

function formatMessageTime(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return ""
  }
}

export function Messages() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ChatUser[]>([])
  const {
    conversations,
    loading,
    error: inboxError,
    refresh,
    status,
    send,
  } = useChat()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<ChatMessagesPage | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [olderLoading, setOlderLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadId, setUnreadId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const firstUnreadRef = useRef<HTMLDivElement | null>(null)
  const conversationId = params.get("conversation")
  const activeRef = useRef(conversationId)
  activeRef.current = conversationId
  const sendingRef = useRef(false)
  const newestRef = useRef<string | null>(null)
  const retryRef = useRef(new Map<string, string>())
  const draft = conversationId ? (drafts[conversationId] ?? "") : ""
  const setDraft = (value: string) => {
    if (conversationId)
      setDrafts((current) => ({ ...current, [conversationId]: value }))
  }
  const selected = useMemo(
    () =>
      conversations.find((c) => c.conversationId === conversationId) ?? null,
    [conversations, conversationId],
  )
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const scrollRef = useRef<"initial" | "bottom" | null>(null)
  const loadedRef = useRef<string | null>(null)
  useEffect(() => {
    newestRef.current = messages.at(-1)?.messageId ?? null
  }, [messages])
  useEffect(() => {
    if (!conversationId && conversations[0])
      setParams({ conversation: conversations[0].conversationId }, {
        replace: true,
      })
  }, [conversations, conversationId, setParams])
  useEffect(() => {
    let cancelled = false
    if (query.trim().length < 2) {
      setUsers([])
      return
    }
    const timer = setTimeout(
      () =>
        void searchChatUsers(query)
          .then((rows) => {
            if (!cancelled) setUsers(rows)
          })
          .catch(() => {
            if (!cancelled) setUsers([])
          }),
      250,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])
  useEffect(() => {
    const controller = new AbortController()
    loadedRef.current = null
    newestRef.current = null
    setMessages([])
    setPage(null)
    setUnreadId(null)
    setError(null)
    if (!conversationId || !selectedRef.current) return
    setMessagesLoading(true)
    const firstUnreadAt = selectedRef.current?.firstUnreadAt
    const firstUnreadMessageId = selectedRef.current?.firstUnreadMessageId
    void (async () => {
      let result = await getChatMessages(
        conversationId,
        null,
        null,
        controller.signal,
      )
      let rows = result.items
      while (
        result.hasMore &&
        (firstUnreadMessageId
          ? !rows.some((m) => m.messageId === firstUnreadMessageId)
          : firstUnreadAt &&
            rows[0] &&
            new Date(rows[0].createdAt) >= new Date(firstUnreadAt))
      ) {
        result = await getChatMessages(
          conversationId,
          result.nextBefore,
          result.nextBeforeMessageId,
          controller.signal,
        )
        rows = merge(result.items, rows)
      }
      if (controller.signal.aborted) return
      const other = selectedRef.current?.otherParticipant.userId
      setUnreadId(
        firstUnreadMessageId ?? findFirstUnread(rows, other, firstUnreadAt),
      )
      loadedRef.current = conversationId
      scrollRef.current = "initial"
      setPage(result)
      setMessages((current) => merge(rows, current))
    })()
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Could not load messages. Reopen this conversation to retry.",
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setMessagesLoading(false)
      })
    return () => controller.abort()
  }, [conversationId, selected?.conversationId])
  useEffect(() => {
    const controller = new AbortController()
    let syncing = false
    const receive = (event: Event) => {
      const message = (event as CustomEvent<ChatMessage>).detail
      if (message.conversationId !== conversationId) return
      const c = messagesContainerRef.current
      if (c && c.scrollHeight - c.scrollTop - c.clientHeight < 80)
        scrollRef.current = "bottom"
      setMessages((current) => merge(current, [message]))
    }
    const resync = async () => {
      if (!conversationId || loadedRef.current !== conversationId || syncing)
        return
      syncing = true
      const newest = newestRef.current
      try {
        let result = await getChatMessages(
          conversationId,
          null,
          null,
          controller.signal,
        )
        let rows = result.items
        while (
          result.hasMore &&
          newest &&
          !rows.some((m) => m.messageId === newest)
        ) {
          result = await getChatMessages(
            conversationId,
            result.nextBefore,
            result.nextBeforeMessageId,
            controller.signal,
          )
          rows = merge(result.items, rows)
        }
        if (!controller.signal.aborted) {
          const c = messagesContainerRef.current
          if (c && c.scrollHeight - c.scrollTop - c.clientHeight < 80)
            scrollRef.current = "bottom"
          setMessages((current) => merge(current, rows))
        }
      } catch {
        /* Next foreground/poll/reconnect retries. */
      } finally {
        syncing = false
      }
    }
    window.addEventListener(CHAT_MESSAGE, receive)
    window.addEventListener(CHAT_RESYNC, resync)
    return () => {
      controller.abort()
      window.removeEventListener(CHAT_MESSAGE, receive)
      window.removeEventListener(CHAT_RESYNC, resync)
    }
  }, [conversationId])
  useEffect(() => {
    const c = messagesContainerRef.current
    if (!c || !scrollRef.current || messagesLoading) return
    if (scrollRef.current === "initial" && firstUnreadRef.current)
      firstUnreadRef.current.scrollIntoView({ block: "center" })
    else c.scrollTop = c.scrollHeight
    scrollRef.current = null
  }, [messages, messagesLoading])
  useEffect(() => {
    const c = messagesContainerRef.current
    if (!c || !conversationId || messagesLoading) return
    let timer: ReturnType<typeof setTimeout>
    let busy = false
    let lastSent: string | null = null
    const readVisible = async () => {
      if (
        busy ||
        document.visibilityState !== "visible" ||
        !document.hasFocus()
      )
        return
      const bounds = c.getBoundingClientRect()
      const visible = Array.from(
        c.querySelectorAll<HTMLElement>("[data-message-id]"),
      ).filter((el) => {
        const r = el.getBoundingClientRect()
        return r.bottom > bounds.top && r.bottom <= bounds.bottom
      })
      const id = visible.at(-1)?.dataset.messageId
      if (!id || id === lastSent) return
      busy = true
      try {
        await markChatRead(conversationId, id)
        lastSent = id
        await refresh()
      } catch {
        /* Retry on next scroll/focus. */
      } finally {
        busy = false
      }
    }
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void readVisible(), 400)
    }
    c.addEventListener("scroll", schedule)
    document.addEventListener("visibilitychange", schedule)
    window.addEventListener("focus", schedule)
    schedule()
    return () => {
      clearTimeout(timer)
      c.removeEventListener("scroll", schedule)
      document.removeEventListener("visibilitychange", schedule)
      window.removeEventListener("focus", schedule)
    }
  }, [conversationId, messages, messagesLoading, refresh])
  async function selectUser(user: ChatUser) {
    try {
      const c = await createDirectConversation(user.userId)
      setQuery("")
      setUsers([])
      await refresh()
      setParams({ conversation: c.conversationId })
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Could not start conversation.",
      )
    }
  }
  async function submitMessage() {
    const body = draft.trim(),
      id = conversationId
    if (!body || !id || sendingRef.current || messagesLoading) return
    const attempt = JSON.stringify([id, body])
    const key = retryRef.current.get(attempt) ?? crypto.randomUUID()
    retryRef.current.set(attempt, key)
    sendingRef.current = true
    setSending(true)
    setError(null)
    try {
      const message = await send(id, body, key)
      if (activeRef.current === id) {
        scrollRef.current = "bottom"
        setMessages((current) => merge(current, [message]))
      }
      setDrafts((current) =>
        current[id]?.trim() === body ? { ...current, [id]: "" } : current,
      )
      retryRef.current.delete(attempt)
    } catch {
      setError("Could not confirm delivery. Send again to retry safely.")
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }
  async function loadOlder() {
    if (!conversationId || !page?.hasMore || olderLoading) return
    const id = conversationId,
      c = messagesContainerRef.current
    const height = c?.scrollHeight ?? 0,
      top = c?.scrollTop ?? 0
    setOlderLoading(true)
    try {
      const result = await getChatMessages(
        id,
        page.nextBefore,
        page.nextBeforeMessageId,
      )
      if (activeRef.current !== id) return
      setPage(result)
      setMessages((current) => merge(result.items, current))
      requestAnimationFrame(() => {
        if (c && activeRef.current === id)
          c.scrollTop = top + c.scrollHeight - height
      })
    } catch {
      if (activeRef.current === id) setError("Could not load older messages.")
    } finally {
      setOlderLoading(false)
    }
  }
  function jumpToFirstUnread() {
    firstUnreadRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    })
  }
  function dayLabel(value: string) {
    const date = new Date(value),
      today = new Date(),
      yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    return date.toDateString() === today.toDateString()
      ? "Today"
      : date.toDateString() === yesterday.toDateString()
        ? "Yesterday"
        : date.toLocaleDateString("vi-VN")
  }

  return (
    <>
      <PageHeader
        title="Conversations that move things forward."
        description="Connect directly with the people building projects with you."
      />
      <section className="messaging chat-workspace">
        <aside className="conversation-sidebar chat-inbox">
          <div className="conversation-heading chat-inbox-heading">
            <div>
              <span className="chat-eyebrow">INBOX</span>
              <h3>Messages</h3>
            </div>
            <span className="chat-count">{conversations.length}</span>
          </div>
          <label className="search-input chat-search">
            <Search size={16} />
            <input
              aria-label="Search users"
              placeholder="Search people to chat…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {users.length > 0 && (
            <div className="chat-results">
              <span className="chat-section-label">People</span>
              {users.map((user) => (
                <button
                  className="chat-contact"
                  key={user.userId}
                  onClick={() => void selectUser(user)}
                >
                  <span className="chat-avatar chat-avatar-search">
                    {initials(user.displayName)}
                  </span>
                  <span>
                    <strong>{user.displayName}</strong>
                    <small>
                      {user.username ? `@${user.username}` : "Tindy account"}
                    </small>
                  </span>
                  <MessageCircle size={16} />
                </button>
              ))}
            </div>
          )}
          <div className="chat-conversation-list">
            <span className="chat-section-label">Conversations</span>
            {loading ? (
              <p className="chat-muted">Loading…</p>
            ) : (
              conversations.map((item) => (
                <button
                  className={`chat-contact ${
                    item.conversationId === conversationId ? "active" : ""
                  }`}
                  key={item.conversationId}
                  onClick={() =>
                    setParams({ conversation: item.conversationId })
                  }
                >
                  <span className="chat-avatar">
                    {initials(item.otherParticipant.displayName)}
                  </span>
                  <span className="chat-contact-copy">
                    <strong>{item.otherParticipant.displayName}</strong>
                    <small>
                      {item.lastMessageAt
                        ? "Active conversation"
                        : "Start a conversation"}
                    </small>
                  </span>
                  {item.unreadCount > 0 && (
                    <span className="chat-unread">{item.unreadCount}</span>
                  )}
                </button>
              ))
            )}
            {!loading && !conversations.length && !users.length && (
              <EmptyState
                title="No conversations yet"
                description="Search for a real account to start chatting."
              />
            )}
          </div>
        </aside>
        <div className="chat-main chat-room">
          {selected ? (
            <>
              <header className="chat-header chat-room-header">
                <div className="chat-avatar chat-avatar-large">
                  {initials(selected.otherParticipant.displayName)}
                </div>
                <div className="chat-room-identity">
                  <h3>{selected.otherParticipant.displayName}</h3>
                  <p>Private conversation · {status}</p>
                </div>
              </header>
              <div
                ref={messagesContainerRef}
                className="chat-messages chat-message-stream"
              >
                {messagesLoading && <p role="status">Loading messages…</p>}
                {page?.hasMore && (
                  <button
                    type="button"
                    disabled={olderLoading}
                    onClick={() => void loadOlder()}
                  >
                    {olderLoading ? "Loading…" : "Load older messages"}
                  </button>
                )}
                {unreadId && selected.unreadCount > 0 && (
                  <button
                    className="chat-unread-jump"
                    type="button"
                    onClick={() => void jumpToFirstUnread()}
                  >
                    Jump to first unread <span>{selected.unreadCount}</span>
                  </button>
                )}
                {messages.map((message, index) => {
                  const outgoing =
                    message.senderId !== selected.otherParticipant.userId
                  const isFirstUnread = message.messageId === unreadId
                  return (
                    <div
                      className={`chat-message-row ${
                        outgoing ? "outgoing" : "incoming"
                      } ${isFirstUnread ? "first-unread" : ""}`}
                      key={message.messageId}
                      data-message-id={message.messageId}
                      ref={isFirstUnread ? firstUnreadRef : undefined}
                    >
                      {(index === 0 ||
                        new Date(
                          messages[index - 1].createdAt,
                        ).toDateString() !==
                          new Date(message.createdAt).toDateString()) && (
                        <div className="chat-day-divider">
                          <span>{dayLabel(message.createdAt)}</span>
                        </div>
                      )}
                      {isFirstUnread && (
                        <div className="chat-unread-divider">
                          <span>New messages</span>
                        </div>
                      )}
                      <div className="chat-message-stack">
                        <div className="chat-bubble">{message.body}</div>
                        <div className="chat-message-meta">
                          <span>{formatMessageTime(message.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <form
                className="chat-composer"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitMessage()
                }}
              >
                <input
                  aria-label="Message"
                  placeholder="Write a message…"
                  maxLength={4000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  className="chat-send-button"
                  disabled={sending || messagesLoading || !draft.trim()}
                  type="submit"
                  aria-label="Send"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty">
              <div className="chat-empty-orbit">
                <MessageCircle size={28} />
              </div>
              <h3>Start a conversation</h3>
              <p>
                Search for an account on the left to send a private message.
              </p>
            </div>
          )}
          {(error || inboxError) && (
            <div className="chat-error" role="alert">
              <span>{error ?? "Could not refresh conversations."}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default Messages
