import { apiRequest } from "./apiClient"

type ApiChatUser = { user_id: string; display_name: string; username?: string | null; avatar_url?: string | null }
type ApiChatConversation = { conversation_id: string; other_participant: ApiChatUser; last_message_at?: string | null; unread_count: number; first_unread_at?: string | null }
type ApiChatMessage = { message_id: string; conversation_id: string; sender_id: string; body: string; created_at: string; client_message_id?: string | null }

export type ChatUser = {
  userId: string
  displayName: string
  username?: string | null
  avatarUrl?: string | null
}

export type ChatConversation = {
  conversationId: string
  otherParticipant: ChatUser
  lastMessageAt?: string | null
  unreadCount: number
  firstUnreadAt?: string | null
}

export type ChatMessage = {
  messageId: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  clientMessageId?: string | null
}

export type ChatMessagesPage = { items: ChatMessage[]; hasMore: boolean; nextBefore?: string | null }

function mapUser(user: ApiChatUser): ChatUser {
  return { userId: user.user_id, displayName: user.display_name, username: user.username, avatarUrl: user.avatar_url }
}

function mapConversation(item: ApiChatConversation): ChatConversation {
  return { conversationId: item.conversation_id, otherParticipant: mapUser(item.other_participant), lastMessageAt: item.last_message_at, unreadCount: item.unread_count, firstUnreadAt: item.first_unread_at }
}

export function mapChatMessage(item: ApiChatMessage | ChatMessage): ChatMessage {
  const value = item as ApiChatMessage & ChatMessage
  return { messageId: value.message_id ?? value.messageId, conversationId: value.conversation_id ?? value.conversationId, senderId: value.sender_id ?? value.senderId, body: value.body, createdAt: value.created_at ?? value.createdAt, clientMessageId: value.client_message_id ?? value.clientMessageId }
}

export async function searchChatUsers(query: string) {
  return (await apiRequest<ApiChatUser[]>(`/api/chat/users?q=${encodeURIComponent(query)}`)).data.map(mapUser)
}
export async function getChatConversations() {
  return (await apiRequest<ApiChatConversation[]>("/api/chat/conversations")).data.map(mapConversation)
}
export async function createDirectConversation(userId: string) {
  return mapConversation((await apiRequest<ApiChatConversation>("/api/chat/conversations/direct", { method: "POST", body: JSON.stringify({ user_id: userId }) })).data)
}
export async function getChatMessages(conversationId: string) {
  const page = (await apiRequest<{ items: ApiChatMessage[]; has_more: boolean; next_before?: string | null }>(`/api/chat/conversations/${conversationId}/messages?limit=100`)).data
  return { items: page.items.map(mapChatMessage), hasMore: page.has_more, nextBefore: page.next_before }
}
export async function sendChatMessage(conversationId: string, body: string, clientMessageId: string) {
  return mapChatMessage((await apiRequest<ApiChatMessage>(`/api/chat/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ body, client_message_id: clientMessageId }) })).data)
}
export async function markChatRead(conversationId: string) {
  await apiRequest(`/api/chat/conversations/${conversationId}/read`, { method: "POST" })
}
