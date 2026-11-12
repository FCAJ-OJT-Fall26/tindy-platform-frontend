import { apiRequest } from "./apiClient"
import { isGuid, requireProjectId, getMyProjectsApi } from "./projects.service"
import { assertPagination, sameId, validDate } from "./teammates.service"
import { getProjectInvitations } from "./invitations.service"
import type {
  NotificationDto,
  NotificationFilter,
  NotificationsPageDto,
  NotificationUnreadCountDto,
  NotificationsMarkedReadDto,
} from "../types/notification"

const base = "/api/me/notifications"
const types = [
  "invitation_received",
  "invitation_accepted",
  "invitation_declined",
  "invitation_cancelled",
  "application_nudged",
]
const invalid = () =>
  Error("The notification response could not be confirmed. Please retry.")
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
const uuid = (value: unknown) => typeof value === "string" && isGuid(value)
export function assertNotification(row: NotificationDto): void {
  if (
    !row ||
    !uuid(row.notification_id) ||
    !(row.invitation_id === null || uuid(row.invitation_id)) ||
    !(row.application_id === null || row.application_id === undefined || uuid(row.application_id)) ||
    !(row.actor_user_id === null || uuid(row.actor_user_id)) ||
    !types.includes(row.type) ||
    !record(row.payload) ||
    ["project_name", "position_title", "actor_display_name"].some(
      (k) =>
        row.payload[(k as keyof typeof row.payload)] !== undefined &&
        typeof row.payload[(k as keyof typeof row.payload)] !== "string",
    ) ||
    typeof row.is_read !== "boolean" ||
    !(row.read_at === null || validDate(row.read_at)) ||
    row.is_read !== (row.read_at !== null) ||
    !validDate(row.created_at)
  )
    throw invalid()
}
export async function getNotifications(
  filter: NotificationFilter,
  page: number,
  signal?: AbortSignal,
): Promise<NotificationsPageDto> {
  const { data } = await apiRequest<NotificationsPageDto>(
    `${base}?filter=${filter}&page=${page}&page_size=20`,
    { signal },
  )
  if (!data || !Array.isArray(data.items)) throw invalid()
  assertPagination(data.pagination, page)
  const hasNext = page < data.pagination.total_pages
  const hasPrevious = page > 1
  if (
    ![
      data.pagination.current_page,
      data.pagination.total_items,
      data.pagination.total_pages,
    ].every(Number.isSafeInteger) ||
    data.pagination.total_pages !==
      Math.ceil(data.pagination.total_items / 20) ||
    data.pagination.has_next !== hasNext ||
    data.pagination.has_previous !== hasPrevious ||
    data.pagination.page_size !== 20 ||
    data.items.length > 20 ||
    (data.pagination.has_next && data.items.length === 0)
  )
    throw invalid()
  data.items.forEach(assertNotification)
  if (
    new Set(data.items.map((n) => n.notification_id)).size !==
      data.items.length ||
    (filter === "unread" && data.items.some((n) => n.is_read))
  )
    throw invalid()
  return data
}
export async function getNotificationUnreadCount(
  signal?: AbortSignal,
): Promise<number> {
  const { data } = await apiRequest<NotificationUnreadCountDto>(
    base + "/unread-count",
    { signal },
  )
  if (
    !data ||
    !Number.isSafeInteger(data.unread_count) ||
    data.unread_count < 0
  )
    throw invalid()
  return data.unread_count
}
export async function markNotificationRead(
  id: string,
  signal?: AbortSignal,
): Promise<NotificationDto> {
  requireProjectId(id, "Notification")
  const { data } = await apiRequest<NotificationDto>(
    `${base}/${encodeURIComponent(id)}/read`,
    { method: "PATCH", signal },
  )
  assertNotification(data)
  if (!sameId(data.notification_id, id) || !data.is_read) throw invalid()
  return data
}
export async function markAllNotificationsRead(
  signal?: AbortSignal,
): Promise<number> {
  const { data } = await apiRequest<NotificationsMarkedReadDto>(
    base + "/mark-all-read",
    { method: "POST", signal },
  )
  if (
    !data ||
    !Number.isSafeInteger(data.updated_count) ||
    data.updated_count < 0
  )
    throw invalid()
  return data.updated_count
}
export const notificationFallback = (n: NotificationDto) =>
  n.type === "invitation_received" || n.type === "invitation_cancelled"
    ? `/projects?tab=Invited&invitation_id=${encodeURIComponent(n.invitation_id || "")}`
    : n.type === "invitation_declined"
      ? "/candidates?tab=Invited"
      : n.type === "application_nudged"
        ? "/candidates?tab=Applications"
        : "/team"

// V1 notifications carry no project_id. Resolve only through the caller's actual
// leader projects and authorized invitation history; payload never authorizes actions.
export async function notificationDestination(
  n: NotificationDto,
  signal: AbortSignal,
): Promise<string> {
  if (n.type === "application_nudged") {
    return "/candidates?tab=Applications"
  }
  if (!n.invitation_id) {
    return notificationFallback(n)
  }
  if (n.type === "invitation_received" || n.type === "invitation_cancelled")
    return notificationFallback(n)
  const mine = await getMyProjectsApi(signal)
  for (const project of mine.leading_projects) {
    for (let page = 1; ; page++) {
      const history = await getProjectInvitations(
        project.project_id,
        {
          status: n.type === "invitation_accepted" ? "accepted" : "declined",
          page,
          page_size: 50,
        },
        signal,
      )
      const found = history.items.find((i) =>
        sameId(i.invitation_id, n.invitation_id!),
      )
      if (found)
        return n.type === "invitation_accepted"
          ? `/project/${found.project_id}`
          : `/candidates?tab=Invited&project_id=${found.project_id}&position_id=${found.position_id}`
      if (!history.pagination.has_next) break
    }
  }
  return notificationFallback(n)
}
export function notificationText(n: NotificationDto) {
  const actor = n.payload.actor_display_name || "A Tindy member"
  const project = n.payload.project_name || "your project"
  const position = n.payload.position_title || "a project position"
  const title = {
    invitation_received: "Project invitation",
    invitation_accepted: "Invitation accepted",
    invitation_declined: "Invitation declined",
    invitation_cancelled: "Invitation cancelled",
    application_nudged: "Application Reminder",
  }[n.type]
  const description =
    n.type === "application_nudged"
      ? `${actor} is waiting for your response for position ${position} in ${project}.`
      : n.type === "invitation_received"
        ? `${actor} invited you to ${project} as ${position}.`
        : n.type === "invitation_cancelled"
          ? `${actor} cancelled the invitation to ${project} for ${position}.`
          : `${actor} ${
              n.type === "invitation_accepted" ? "accepted" : "declined"
            } the invitation to ${project} for ${position}.`
  return { title, description }
}
export const notificationDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
