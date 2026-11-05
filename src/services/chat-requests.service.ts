import { apiRequest, ApiError } from "./apiClient"
export type RequestUser = {
  user_id: string
  display_name: string
  username?: string | null
  avatar_url?: string | null
}
export type ChatRequest = {
  request_id: string
  sender_id: string
  recipient_id: string
  other_user: RequestUser
  project_id: string
  project_name: string
  position_id?: string | null
  position_title?: string | null
  application_id?: string | null
  kind: string
  body: string
  status: string
  end_reason?: string | null
  created_at: string
  expires_at: string
  responded_at?: string | null
  conversation_id?: string | null
}
export type RequestPage = {
  items: ChatRequest[]
  pending_received: number
  has_more: boolean
}
export type RequestContext = {
  user_id: string
  display_name: string
  project_id: string
  project_name: string
  position_id?: string | null
  position_title?: string | null
  application_id?: string | null
}
export type ChatBlock = {
  user_id: string
  display_name: string
  created_at: string
}
export async function getChatRequests(
  direction = "received",
  history = false,
  page = 1,
  signal?: AbortSignal,
) {
  return (
    await apiRequest<RequestPage>(
      `/api/chat/requests?direction=${direction}&history=${history}&page=${page}`,
      { signal },
    )
  ).data
}
export async function getRequestContexts(user: string, signal?: AbortSignal) {
  return (
    await apiRequest<RequestContext[]>(
      `/api/chat/request-contexts?user_id=${encodeURIComponent(user)}`,
      { signal },
    )
  ).data
}
export async function createChatRequest(
  user: string,
  context: RequestContext,
  body: string,
  key: string,
) {
  return (
    await apiRequest<{
      request?: ChatRequest | null
      conversation_id?: string | null
    }>("/api/chat/requests", {
      method: "POST",
      body: JSON.stringify({
        user_id: user,
        project_id: context.project_id,
        position_id: context.position_id,
        application_id: context.application_id,
        body,
        client_request_id: key,
      }),
    })
  ).data
}
export async function actOnChatRequest(
  id: string,
  action: "accept" | "reject" | "cancel",
) {
  return (
    await apiRequest<ChatRequest>(`/api/chat/requests/${id}/${action}`, {
      method: "POST",
    })
  ).data
}
export async function setChatBlock(user: string, blocked: boolean) {
  await apiRequest(`/api/chat/blocks/${user}`, {
    method: blocked ? "PUT" : "DELETE",
  })
}
export async function getChatBlocks(signal?: AbortSignal) {
  return (await apiRequest<ChatBlock[]>("/api/chat/blocks", { signal })).data
}
export function chatRequestError(error: unknown) {
  if (!(error instanceof ApiError))
    return "We couldn’t confirm the result. Your message is saved here. Please try again."
  const retry = error.problem.retry_at
  return (
    error.message +
    (typeof retry === "string"
      ? ` You can send another request at ${new Date(retry).toLocaleString("en-US")}.`
      : "")
  )
}
export async function shareChatContext(
  conversation: string,
  context: RequestContext,
  body: string,
  key: string,
) {
  await apiRequest("/api/chat/conversations/" + conversation + "/context", {
    method: "POST",
    body: JSON.stringify({
      project_id: context.project_id,
      position_id: context.position_id,
      body,
      client_message_id: key,
    }),
  })
}
export const requestReason: Record<string, string> = {
  project_closed: "This project is no longer recruiting.",
  position_closed: "This position is no longer recruiting.",
  application_accepted: "The application was accepted.",
  application_rejected: "The application was declined.",
  application_withdrawn: "The application was withdrawn.",
  sender_cancelled: "Cancelled by the sender.",
  blocked: "This contact is blocked.",
  contact_unavailable: "This contact is unavailable.",
  expired: "Expired after 7 days.",
}
