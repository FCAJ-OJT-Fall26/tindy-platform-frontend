import { apiRequest } from "./apiClient"

type ApiChatUser = {
  user_id: string
  display_name: string
  username?: string | null
  avatar_url?: string | null
}

type ApiChatConversation = {
  conversation_id: string
  other_participant: ApiChatUser | null
  type?: "direct" | "project"
  project_id?: string | null
  name?: string | null
  can_send?: boolean
  left_at?: string | null
  participants?: {
    user_id: string
    display_name: string
    avatar_url?: string | null
    is_leader: boolean
    is_active: boolean
    left_at?: string | null
  }[]
  last_message_at?: string | null
  unread_count: number
  first_unread_at?: string | null
  is_blocked?: boolean
  blocked_by_me?: boolean
  first_unread_message_id?: string | null
}

type ApiChatMessage = {
  message_type?: "text" | "system"
  message_id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  context_project_id?: string | null
  context_project_name?: string | null
  context_position_title?: string | null
  client_message_id?: string | null
}

export type ChatUser = {
  userId: string
  displayName: string
  username?: string | null
  avatarUrl?: string | null
}

export type ChatConversation = {
  conversationId: string
  otherParticipant: ChatUser | null
  type: "direct" | "project"
  projectId?: string | null
  name?: string | null
  canSend: boolean
  leftAt?: string | null
  participants: ChatGroupMember[]
  lastMessageAt?: string | null
  unreadCount: number
  isBlocked?: boolean
  blockedByMe?: boolean
  firstUnreadMessageId?: string | null
  firstUnreadAt?: string | null
}

export type ChatGroupMember = {
  userId: string
  displayName: string
  avatarUrl?: string | null
  isLeader: boolean
  isActive: boolean
  leftAt?: string | null
}

export type ChatMessage = {
  messageType?: "text" | "system"
  messageId: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  contextProjectId?: string | null
  contextProjectName?: string | null
  contextPositionTitle?: string | null
  clientMessageId?: string | null
}

export type ChatMessagesPage = {
  items: ChatMessage[]
  hasMore: boolean
  nextBefore?: string | null
  nextBeforeMessageId?: string | null
}

function mapUser(user: ApiChatUser): ChatUser {
  return {
    userId: user.user_id,
    displayName: user.display_name,
    username: user.username,
    avatarUrl: user.avatar_url,
  }

}

function mapConversation(item: ApiChatConversation): ChatConversation {
  return {
    conversationId: item.conversation_id,
    otherParticipant: item.other_participant
      ? mapUser(item.other_participant)
      : null,
    type: item.type ?? "direct",
    projectId: item.project_id,
    name: item.name,
    canSend: item.can_send ?? true,
    leftAt: item.left_at,
    participants: (item.participants ?? []).map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      isLeader: p.is_leader,
      isActive: p.is_active,
      leftAt: p.left_at,
    })),
    lastMessageAt: item.last_message_at,
    unreadCount: item.unread_count,
    isBlocked: item.is_blocked,
    blockedByMe: item.blocked_by_me,
    firstUnreadAt: item.first_unread_at,
    firstUnreadMessageId: item.first_unread_message_id,
  }

}

export function mapChatMessage(
  item: ApiChatMessage | ChatMessage,
): ChatMessage {
  const value = item as ApiChatMessage & ChatMessage
  return {
    messageId: value.message_id ?? value.messageId,
    messageType: value.message_type ?? value.messageType ?? "text",
    conversationId: value.conversation_id ?? value.conversationId,
    senderId: value.sender_id ?? value.senderId,
    body: value.body,
    createdAt: value.created_at ?? value.createdAt,
    contextProjectId: value.context_project_id ?? value.contextProjectId,
    contextProjectName: value.context_project_name ?? value.contextProjectName,
    contextPositionTitle:
      value.context_position_title ?? value.contextPositionTitle,
    clientMessageId: value.client_message_id ?? value.clientMessageId,
  }

}

export async function searchChatUsers(query: string) {
  return (
    await apiRequest<ApiChatUser[]>(
      `/api/chat/users?q=${encodeURIComponent(query)}`,
    )
  ).data.map(mapUser)
}

export async function getChatConversations() {
  return (
    await apiRequest<ApiChatConversation[]>("/api/chat/conversations")
  ).data.map(mapConversation)
}

export async function createDirectConversation(userId: string) {
  return mapConversation(
    (
      await apiRequest<ApiChatConversation>("/api/chat/conversations/direct", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      })
    ).data,
  )
}

export async function getChatMessages(
  conversationId: string,
  before?: string | null,
  beforeMessageId?: string | null,
  signal?: AbortSignal,
) {
  const page = (
    await apiRequest<{
      items: ApiChatMessage[]
      has_more: boolean
      next_before?: string | null
      next_before_message_id?: string | null
    }>(
      `/api/chat/conversations/${conversationId}/messages?limit=50${
        before
          ? `&before=${encodeURIComponent(before)}&before_message_id=${beforeMessageId ?? ""}`
          : ""
      }`,
      { signal },
    )
  ).data
  return {
    items: page.items.map(mapChatMessage),
    hasMore: page.has_more,
    nextBefore: page.next_before,
    nextBeforeMessageId: page.next_before_message_id,
  }

}

export async function sendChatMessage(
  conversationId: string,
  body: string,
  clientMessageId: string,
) {
  return mapChatMessage(
    (
      await apiRequest<ApiChatMessage>(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body, client_message_id: clientMessageId }),
        },
      )
    ).data,
  )
}

export async function markChatRead(
  conversationId: string,
  lastReadMessageId: string,
) {
  await apiRequest(`/api/chat/conversations/${conversationId}/read`, {
    method: "POST",
    body: JSON.stringify({ last_read_message_id: lastReadMessageId }),
  })
}

export function chatConversationName(room: ChatConversation) {
  return room.type === "project"
    ? (room.name ?? "Project chat")
    : (room.otherParticipant?.displayName ?? "User")
}

export async function getProjectChat(projectId: string) {
  return mapConversation(
    (await apiRequest<ApiChatConversation>("/api/chat/projects/" + projectId))
      .data,
  )
}

export async function leaveChatProject(projectId: string) {
  await apiRequest("/api/chat/projects/" + projectId + "/leave", {
    method: "POST",
  })
}

export async function removeChatProjectMember(
  projectId: string,
  userId: string,
) {
  await apiRequest("/api/chat/projects/" + projectId + "/members/" + userId, {
    method: "DELETE",
  })
}
