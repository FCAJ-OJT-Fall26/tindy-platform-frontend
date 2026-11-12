import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { HubConnectionBuilder, type HubConnection } from "@microsoft/signalr"
import { getStoredToken, SESSION_CHANGED_EVENT } from "./apiClient"
import { useTindy } from "../store"
import { apiOrigin } from "./apiConfig"
import {
  getChatConversations,
  mapChatMessage,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "./chat.service"
import { getChatRequests } from "./chat-requests.service"
export const CHAT_MESSAGE = "tindy:chat-message"
export const CHAT_RESYNC = "tindy:chat-resync"
const Context = createContext<{
  pendingRequests: number
  conversations: ChatConversation[]
  loading: boolean
  error: boolean
  status: string
  refresh: () => Promise<void>
  send: (id: string, body: string, key: string) => Promise<ChatMessage>
}>(null!)
export function ChatProvider({ children }: { children: ReactNode }) {
  const { authUser, authLoading } = useTindy()
  const [storedToken, setToken] = useState(getStoredToken)
  const token =
    !authLoading && authUser?.is_onboarding_completed ? storedToken : null
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [pendingRequests, setPendingRequests] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState("Connecting…")
  const hubRef = useRef<HubConnection | null>(null)
  const request = useRef(0)
  const observedToken = useRef(storedToken)
  const refresh = useCallback(async () => {
    const version = ++request.current
    if (!token) {
      setPendingRequests(0)
      setConversations([])
      setError(false)
      setLoading(false)
      return
    }
    try {
      const [rows, requests] = await Promise.all([
        getChatConversations(),
        getChatRequests(),
      ])
      if (version === request.current && token === getStoredToken()) {
        setPendingRequests(requests.pending_received)
        setConversations(rows)
        setError(false)
      }
    } catch {
      if (version === request.current) setError(true)
    } finally {
      if (version === request.current) setLoading(false)
    }
  }, [token])
  useEffect(() => {
    const changed = () => {
      const nextToken = getStoredToken()
      if (nextToken === observedToken.current) return
      observedToken.current = nextToken
      ++request.current
      setPendingRequests(0)
      setConversations([])
      setToken(nextToken)
      setLoading(true)
    }
    window.addEventListener(SESSION_CHANGED_EVENT, changed)
    window.addEventListener("storage", changed)
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, changed)
      window.removeEventListener("storage", changed)
    }
  }, [])
  useEffect(() => {
    void refresh()
    if (!token) return
    setStatus("Connecting…")
    let stopped = false
    let retry: ReturnType<typeof setTimeout>
    let debounceTimer: ReturnType<typeof setTimeout> | undefined

    const debouncedRefresh = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!stopped) void refresh()
      }, 500)
    }

    const updateLocalConversationOnMessage = (msg: ChatMessage) => {
      setConversations((current) => {
        const idx = current.findIndex((c) => c.conversationId === msg.conversationId)
        if (idx === -1) {
          debouncedRefresh()
          return current
        }
        const room = current[idx]
        const isFromMe = msg.senderId === authUser?.user_id
        const updated: ChatConversation = {
          ...room,
          lastMessageAt: msg.createdAt,
          unreadCount: isFromMe ? room.unreadCount : room.unreadCount + 1,
        }
        const next = [...current]
        next.splice(idx, 1)
        return [updated, ...next]
      })
    }

    const hub = new HubConnectionBuilder()
      .withUrl(apiOrigin() + "/hubs/chat", { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build()
    hubRef.current = hub
    const resync = () => {
      if (!stopped) {
        void refresh()
        window.dispatchEvent(new Event(CHAT_RESYNC))
      }
    }
    hub.on("message.created", (raw) => {
      if (!stopped && token === getStoredToken()) {
        const mapped = mapChatMessage(raw)
        window.dispatchEvent(
          new CustomEvent(CHAT_MESSAGE, { detail: mapped }),
        )
        updateLocalConversationOnMessage(mapped)
      }
    })
    hub.on("chat.requests.changed", resync)
    hub.on("conversation.read", (payload?: { conversationId?: string }) => {
      if (payload?.conversationId) {
        setConversations((current) =>
          current.map((c) =>
            c.conversationId === payload.conversationId
              ? { ...c, unreadCount: 0 }
              : c,
          ),
        )
      } else {
        debouncedRefresh()
      }
    })
    hub.onreconnecting(() => setStatus("Reconnecting…"))
    hub.onreconnected(() => {
      setStatus("Connected")
      resync()
    })
    const start = async () => {
      try {
        await hub.start()
        if (stopped) {
          await hub.stop()
          return
        }
        setStatus("Connected")
        resync()
      } catch {
        if (!stopped) {
          setStatus("Offline — retrying…")
          retry = setTimeout(() => void start(), 5000)
        }
      }
    }
    hub.onclose(() => {
      if (!stopped) {
        setStatus("Offline — retrying…")
        retry = setTimeout(() => void start(), 5000)
      }
    })
    void start()

    // Polling fallback only when SignalR is NOT connected (offline / reconnecting)
    const poll = setInterval(() => {
      if (
        hubRef.current?.state !== "Connected" &&
        document.visibilityState === "visible"
      ) {
        resync()
      }
    }, 30000)

    const visible = () => {
      if (document.visibilityState === "visible") resync()
    }
    document.addEventListener("visibilitychange", visible)
    return () => {
      stopped = true
      ++request.current
      clearTimeout(retry)
      clearTimeout(debounceTimer)
      clearInterval(poll)
      document.removeEventListener("visibilitychange", visible)
      hubRef.current = null
      void hub.stop()
    }
  }, [token, refresh, authUser?.user_id])
  const send = async (id: string, body: string, key: string) => {
    const requestToken = getStoredToken()
    const message =
      hubRef.current?.state === "Connected"
        ? mapChatMessage(
            await hubRef.current.invoke("SendMessage", id, body, key),
          )
        : await sendChatMessage(id, body, key)
    if (getStoredToken() !== requestToken) throw new Error("Session changed")
    setConversations((current) => {
      const idx = current.findIndex((c) => c.conversationId === id)
      if (idx === -1) return current
      const room = current[idx]
      const updated: ChatConversation = {
        ...room,
        lastMessageAt: message.createdAt,
      }
      const next = [...current]
      next.splice(idx, 1)
      return [updated, ...next]
    })
    return message
  }
  return (
    <Context.Provider
      value={{
        pendingRequests,
        conversations,
        loading,
        error,
        status,
        refresh,
        send,
      }}
    >
      {children}
    </Context.Provider>
  )
}
export const useChat = () => useContext(Context)
