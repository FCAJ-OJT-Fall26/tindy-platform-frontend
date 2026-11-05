import type { RuleMatch } from "./discovery"
import type { PaginationMeta } from "./project"

export type CandidateAction = "saved" | "shortlisted" | "skipped"
export interface TeammateCandidatePreviewDto {
  user_id: string
  display_name: string
  headline: string | null
  avatar_url: string | null
  preferred_role_id: string | null
  preferred_role_name: string | null
  available_hours_per_week: number | null
  skills: { skill_id: string; name: string }[]
  experiences_count: number
  certificates_count: number
  profile_url: string
  experiences_url: string
  certificates_url: string
}
export interface TeammateCandidateCardDto {
  candidate: TeammateCandidatePreviewDto
  interaction_action: CandidateAction | null
  matching: RuleMatch
}
export interface TeammateCandidatesPageDto {
  project_id: string
  position_id: string
  scored_at: string
  items: TeammateCandidateCardDto[]
  next_cursor: string | null
  has_more: boolean
  feed_version: "teammates-v1"
}
export interface TeammateCandidateQuery {
  limit?: number
  sort_by?: "match"
  role_id?: string
  skill_id?: string
  min_available_hours_per_week?: number
}
export interface CandidateInteractionDto {
  project_id: string
  position_id: string
  candidate_user_id: string
  action: CandidateAction
  created_at: string
  updated_at: string
}
export interface CandidateInteractionListItemDto
  extends CandidateInteractionDto {
  candidate: TeammateCandidatePreviewDto | null
  is_discoverable: boolean
}
export interface CandidateInteractionsPageDto {
  items: CandidateInteractionListItemDto[]
  pagination: PaginationMeta
}
export interface ResetCandidateInteractionDto {
  project_id: string
  position_id: string
  candidate_user_id: string
  action: null
}
// Presentation adapter only: the original backend matching object stays intact.
export interface LiveTeammateCard extends TeammateCandidateCardDto {
  source: "live-teammate"
  id: string
  name: string
}
