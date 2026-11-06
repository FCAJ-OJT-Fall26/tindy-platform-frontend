import type { ChatMessage } from "./chat.service"
function timestamp(value: string) {
  // API UTC timestamps have variable fractional precision; compare at DB precision.
  return value.replace(
    /(?:\.(\d+))?Z$/,
    (_, fraction: string | undefined) =>
      "." + (fraction ?? "").padEnd(7, "0") + "Z",
  )
}
export function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
) {
  const rows = Array.from(
    new Map([...current, ...incoming].map((m) => [m.messageId, m])).values(),
  ).sort(
    (a, b) =>
      timestamp(a.createdAt).localeCompare(timestamp(b.createdAt)) ||
      a.messageId.localeCompare(b.messageId),
  )
  return rows.length === current.length &&
    rows.every(
      (m, i) =>
        m.messageId === current[i].messageId && m.body === current[i].body,
    )
    ? current
    : rows
}
export function firstUnreadMessageId(
  rows: ChatMessage[],
  senderId?: string,
  firstUnreadAt?: string | null,
  currentUserId?: string,
) {
  return (
    rows.find(
      (m) =>
        (currentUserId ? m.senderId !== currentUserId : m.senderId === senderId) &&
        firstUnreadAt &&
        timestamp(m.createdAt) >= timestamp(firstUnreadAt),
    )?.messageId ?? null
  )
}
