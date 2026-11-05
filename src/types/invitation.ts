import type { PaginationMeta } from "./project"

export type InvitationStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired"
export interface ProjectInvitationDto {
  invitation_id: string
  project_id: string
  position_id: string
  invited_user_id: string
  inviting_leader_id: string
  message: string | null
  status: InvitationStatus
  created_at: string
  updated_at: string
  expires_at: string
  responded_at: string | null
}
export interface CreateProjectInvitationRequest {
  position_id: string
  invited_user_id: string
  message?: string | null
}
export interface ProjectInvitationsPageDto {
  items: ProjectInvitationDto[]
  pagination: PaginationMeta
}
export interface LeaderInvitationsQuery {
  status?: InvitationStatus | "all"
  position_id?: string
  invited_user_id?: string
  page?: number
  page_size?: number
}
export interface MyInvitationsQuery {
  status?: InvitationStatus | "all"
  project_id?: string
  page?: number
  page_size?: number
}
