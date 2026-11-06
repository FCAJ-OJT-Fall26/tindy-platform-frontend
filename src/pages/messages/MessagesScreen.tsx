import { MessageCircle, FolderKanban, Inbox, Search, Send, X, Users, ChevronDown, UserMinus, LogOut } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useTindy } from "../../store"
import "./project-chat.css"
import { EmptyState, PageHeader } from "../../components/ui"
import { ChatRequestComposer } from "../../components/messages/ChatRequestButton"
import ChatRequestsPanel from "../../components/messages/ChatRequestsPanel"
import {
  setChatBlock,
  chatRequestError,
} from "../../services/chat-requests.service"
import {
  getProjectChat,
  chatConversationName,
  leaveChatProject,
  removeChatProjectMember,
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
      .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
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
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return ""
  }
}

export function Messages() {
  const [params, setParams] = useSearchParams()
  const { authUser } = useTindy()
  const projectId = params.get("project")
  const [membershipBusy, setMembershipBusy] = useState(false)
  const membershipBusyRef = useRef(false)
  const [requestTarget, setRequestTarget] = useState<ChatUser | null>(null)
  const requestTab = params.get("tab") === "requests"
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ChatUser[]>([])
  const {
    pendingRequests,
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
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
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
  useLayoutEffect(() => {
    const composer = composerRef.current
    if (!composer) return
    composer.style.height = "0px"
    composer.style.height = Math.min(composer.scrollHeight, 144) + "px"
    composer.style.overflowY = composer.scrollHeight > 144 ? "auto" : "hidden"
  }, [draft, conversationId, selected?.conversationId, requestTab])
  const projectChats = useMemo(() => conversations.filter(c => c.type === "project"), [conversations])
  const directChats = useMemo(() => conversations.filter(c => c.type !== "project"), [conversations])
  // Deep links select the matching section without needing an extra query parameter.
  const chatSection = projectId || selected?.type === "project"
    ? "projects" : selected ? "direct" : params.get("tab") === "direct" ? "direct" : "projects"
  const sectionChats = chatSection === "projects" ? projectChats : directChats
  const visibleChats = chatSection === "projects" && query.trim()
    ? sectionChats.filter(c => chatConversationName(c).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : sectionChats
  const sectionTitle = chatSection === "projects" ? "Project chats" : "Direct messages"
  function switchSection(tab: "projects" | "direct") {
    setQuery("")
    setUsers([])
    const first = (tab === "projects" ? projectChats : directChats)[0]
    setParams(first ? { tab, conversation: first.conversationId } : { tab })
  }
  useEffect(() => { setQuery(""); setUsers([]) }, [chatSection])
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    void getProjectChat(projectId)
      .then(async (room) => {
        await refresh()
        if (!cancelled)
          setParams({ conversation: room.conversationId }, { replace: true })
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Could not open this project's chat. Please try again from the project workspace.",
          )
      })
    return () => {
      cancelled = true
    }
  }, [projectId, refresh, setParams])
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const scrollRef = useRef<"initial" | "bottom" | null>(null)
  const loadedRef = useRef<string | null>(null)
  useEffect(() => {
    newestRef.current = messages.at(-1)?.messageId ?? null
  }, [messages])
  useEffect(() => {
    if (!requestTab && !projectId && !conversationId && sectionChats[0])
      setParams({ tab: chatSection, conversation: sectionChats[0].conversationId }, {
        replace: true,
      })
  }, [sectionChats, chatSection, conversationId, setParams, requestTab, projectId])
  useEffect(() => {
    let cancelled = false
    if (chatSection !== "direct" || requestTab || query.trim().length < 2) {
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
  }, [query, chatSection, requestTab])
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
      const other = selectedRef.current?.otherParticipant?.userId
      setUnreadId(firstUnreadMessageId ?? findFirstUnread(
        rows, other, firstUnreadAt,
        selectedRef.current?.type === "project" ? authUser?.user_id : undefined,
      ))
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
  }, [
    conversationId,
    selected?.conversationId,
    selected?.leftAt,
    authUser?.user_id,
  ])
  useEffect(() => {
    const controller = new AbortController()
    let syncing = false
    const receive = (event: Event) => {
      const message = (event as CustomEvent<ChatMessage>).detail
      if (message.conversationId !== conversationId) return
      const cutoff = selectedRef.current?.leftAt
      if (cutoff && new Date(message.createdAt) > new Date(cutoff)) return
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
  function selectUser(user: ChatUser) {
    const room = conversations.find(
      (c) => c.otherParticipant?.userId === user.userId,
    )
    setQuery("")
    setUsers([])
    if (room) setParams({ conversation: room.conversationId })
    else setRequestTarget(user)
  }

  async function toggleBlock() {
    if (!selected?.otherParticipant) return
    try {
      await setChatBlock(
        selected.otherParticipant.userId,
        !selected.blockedByMe,
      )
      await refresh()
    } catch (e) {
      setError(chatRequestError(e))
    }
  }

  async function changeMembership(memberId?: string) {
    if (!selected?.projectId || membershipBusyRef.current) return
    if (
      !window.confirm(
        memberId
          ? "Remove this member from the project? They will retain messages up to their removal."
          : "Leave this project? You will retain messages up to your departure.",
      )
    )
      return
    membershipBusyRef.current = true
    setMembershipBusy(true)
    try {
      if (memberId) await removeChatProjectMember(selected.projectId, memberId)
      else await leaveChatProject(selected.projectId)
      await refresh()
      window.dispatchEvent(new Event(CHAT_RESYNC))
    } catch (error) {
      setError(chatRequestError(error))
    } finally {
      membershipBusyRef.current = false
      setMembershipBusy(false)
    }
  }

  async function submitMessage() {
    const body = draft.trim(),
      id = conversationId
    if (
      !body ||
      !id ||
      sendingRef.current ||
      messagesLoading ||
      selected?.isBlocked ||
      selected?.canSend === false
    )
      return
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
        : date.toLocaleDateString("en-US")
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Good projects start with a conversation. Find your people here."
      />
      <div className="messages-navigation" aria-label="Messages">
        <button aria-pressed={!requestTab && chatSection === "projects"} onClick={() => switchSection("projects")}>
          <FolderKanban size={17} />
          Project chats <span>{projectChats.length}</span>
          {projectChats.some(c => c.unreadCount > 0) && <i className="messages-section-unread" aria-label="Unread project messages" />}
        </button>
        <button aria-pressed={!requestTab && chatSection === "direct"} onClick={() => switchSection("direct")}>
          <MessageCircle size={17} />
          Direct messages <span>{directChats.length}</span>
          {directChats.some(c => c.unreadCount > 0) && <i className="messages-section-unread" aria-label="Unread direct messages" />}
        </button>
        <button
          aria-pressed={requestTab}
          onClick={() => setParams({ tab: "requests" })}
        >
          <Inbox size={17} />
          Requests {pendingRequests > 0 && <span>{pendingRequests}</span>}
        </button>
      </div>
      {requestTarget && (
        <ChatRequestComposer
          userId={requestTarget.userId}
          name={requestTarget.displayName}
          onClose={() => setRequestTarget(null)}
        />
      )}
      {requestTab ? (
        <ChatRequestsPanel />
      ) : (
        <section className="messaging chat-workspace">
          <aside className="conversation-sidebar chat-inbox">
            <div className="conversation-heading chat-inbox-heading">
              <div>
                <span className="chat-eyebrow">INBOX</span>
                <h3>{sectionTitle}</h3>
              </div>
              <span className="chat-count">{sectionChats.length}</span>
            </div>
            <label className="search-input chat-search">
              <Search size={16} />
              <input
                aria-label={chatSection === "projects" ? "Search project chats" : "Search users"}
                placeholder={chatSection === "projects" ? "Find a project chat…" : "Search people to chat…"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {chatSection === "direct" && users.length > 0 && (
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
              <span className="chat-section-label">{chatSection === "projects" ? "YOUR PROJECTS" : "PRIVATE CONVERSATIONS"}</span>
              {loading ? (
                <p className="chat-muted">Loading…</p>
              ) : (
                visibleChats.map((item) => (
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
                      {initials(chatConversationName(item))}
                    </span>
                    <span className="chat-contact-copy">
                      <strong>{chatConversationName(item)}</strong>
                      <small>
                        {item.type === "project"
                          ? item.leftAt
                            ? "Project · Past member"
                            : "Project group"
                          : item.lastMessageAt
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
              {!loading && !visibleChats.length && (chatSection === "projects" || !users.length) && (
                <EmptyState
                  title={chatSection === "projects" ? query.trim() ? "No matching projects" : "No project chats yet" : "No direct messages yet"}
                  description={chatSection === "projects" ? query.trim() ? "Try another project name." : "Your project chats appear here when you create or join a project." : "Search for someone to request a private conversation."}
                />
              )}
            </div>
          </aside>
          <div className="chat-main chat-room">
            {selected ? (
              <>
                <header className="chat-header chat-room-header">
                  <div className="chat-avatar chat-avatar-large">
                    {initials(chatConversationName(selected))}
                  </div>
                  <div className="chat-room-identity">
                    <h3>{chatConversationName(selected)}</h3>
                    <p>
                      {selected.type === "project"
                        ? "Project group"
                        : "Private conversation"}{" "}
                      · {status}
                    </p>
                  </div>
                  {selected.type === "direct" && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => void toggleBlock()}
                    >
                      {selected.blockedByMe ? "Unblock" : "Block"}
                    </button>
                  )}
                </header>
                {selected.type === "project" && (
                  <details
                    className="project-chat-members"
                    key={selected.conversationId}
                  >
                    <summary>
                      <Users size={15} aria-hidden="true" />
                      <span>Project members</span>
                      <span className="project-chat-member-count">{selected.participants.filter((p) => p.isActive).length}</span>
                      <ChevronDown className="project-chat-member-chevron" size={15} aria-hidden="true" />
                    </summary>
                    <div className="project-chat-member-list">
                      {selected.participants.map((member) => (
                        <div
                          className="project-chat-member"
                          key={member.userId}
                        >
                          <span className="project-chat-member-avatar" aria-hidden="true" data-leader={member.isLeader}>{initials(member.displayName)}</span>
                          <div className="project-chat-member-identity">
                            <strong>{member.displayName}{member.userId === authUser?.user_id && <small>You</small>}</strong>
                            <span>{!member.isActive ? "Past member" : member.isLeader ? "Project leader" : "Project member"}</span>
                          </div>
                          {member.isLeader && <span className="project-chat-leader-badge">Leader</span>}
                          {selected.canSend &&
                            member.isActive &&
                            !member.isLeader &&
                            member.userId !== authUser?.user_id &&
                            selected.participants.some(
                              (p) =>
                                p.userId === authUser?.user_id && p.isLeader,
                            ) && (
                              <button
                                className="project-chat-remove"
                                type="button"
                                title="Remove from project"
                                aria-label={"Remove " + member.displayName + " from project"}
                                disabled={membershipBusy}
                                onClick={() =>
                                  void changeMembership(member.userId)
                                }

                              >
                                <UserMinus size={14} aria-hidden="true" /><span>Remove</span>
                              </button>
                            )}
                        </div>
                      ))}
                      {selected.canSend &&
                        !selected.participants.some(
                          (p) => p.userId === authUser?.user_id && p.isLeader,
                        ) && (
                          <button
                            className="project-chat-leave"
                            type="button"
                            disabled={membershipBusy}
                            onClick={() => void changeMembership()}
                          >
                            <LogOut size={14} aria-hidden="true" />Leave project
                          </button>
                        )}
                    </div>
                  </details>
                )}
                {selected.type === "project" && !selected.canSend && (
                  <p className="info-banner">
                    You left this project
                    {selected.leftAt
                      ? " on " + new Date(selected.leftAt).toLocaleString()
                      : ""}
                    . You can read messages up to your departure. Sending is
                    disabled.
                  </p>
                )}
                {selected.isBlocked && (
                  <p className="info-banner">
                    Messaging is unavailable for this contact. You can chat
                    again once neither person has the other blocked.
                  </p>
                )}
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
                    const outgoing = message.senderId === authUser?.user_id
                    const isFirstUnread = message.messageId === unreadId
                    return (
                      <div
                        className={`chat-message-row ${
                          message.messageType === "system"
                            ? "chat-system-message"
                            : outgoing
                              ? "outgoing"
                              : "incoming"
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
                          {selected.type === "project" &&
                            !outgoing &&
                            message.messageType !== "system" && (
                              <strong className="project-chat-sender">
                                {selected.participants.find(
                                  (p) => p.userId === message.senderId,
                                )?.displayName ?? "Member"}
                              </strong>
                            )}
                          <div className="chat-bubble">
                            {message.contextProjectId && (
                              <div className="chat-context-card">
                                <Link
                                  to={"/project/" + message.contextProjectId}
                                >
                                  {message.contextProjectName ?? "Project"}
                                </Link>
                                {message.contextPositionTitle && (
                                  <small>{message.contextPositionTitle}</small>
                                )}
                              </div>
                            )}
                            <span className="chat-message-text">{message.body}</span>
                          </div>
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
                  <textarea
                    ref={composerRef}
                    rows={1}
                    title="Enter to send · Shift+Enter for a new line"
                    disabled={selected.isBlocked || !selected.canSend}
                    aria-label="Message"
                    placeholder="Write a message…"
                    maxLength={4000}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                      event.preventDefault()
                      void submitMessage()
                    }}
                  />
                  <button
                    className="chat-send-button"
                    disabled={
                      sending ||
                      messagesLoading ||
                      selected.isBlocked ||
                      !selected.canSend ||
                      !draft.trim()
                    }

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
                <h3>{chatSection === "projects" ? "Your team conversations" : "Start a private conversation"}</h3>
                <p>{chatSection === "projects" ? "Select a project chat to catch up with your team." : "Search for an account on the left to send a private message."}</p>
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
      )}
    </>
  )
}

export default Messages
