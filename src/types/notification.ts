import type { PaginationMeta } from "./project"

export type NotificationType = "invitation_received" | "invitation_accepted" | "invitation_declined" | "invitation_cancelled" | "application_nudged"
export type NotificationFilter = "all" | "unread"
export interface NotificationDto {
  notification_id: string
  type: NotificationType
  invitation_id: string | null
  application_id?: string | null
  actor_user_id: string | null
  payload: {
    project_name?: string
    position_title?: string
    actor_display_name?: string
  }
  is_read: boolean
  read_at: string | null
  created_at: string
}
export interface NotificationsPageDto {
  items: NotificationDto[]
  pagination: PaginationMeta
}
export interface NotificationUnreadCountDto {
  unread_count: number
}
export interface NotificationsMarkedReadDto {
  updated_count: number
}
