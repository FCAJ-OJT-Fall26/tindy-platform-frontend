import type { PaginationMeta, ProjectDetailDto, ProjectDifficultyLevel, PositionSkillDto } from "./project"
import type { RuleMatch } from "./discovery"

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn"
export interface ProjectApplicationDto {
  application_id: string; project_id: string; position_id: string; applicant_id: string
  status: ApplicationStatus; message: string | null; created_at: string; updated_at: string
  reviewed_at: string | null; reviewed_by: string | null
}
export interface MyApplicationsPage { items: ProjectApplicationDto[]; pagination: PaginationMeta }
export interface ApplicantPreview {
  user_id: string; display_name: string; preferred_role_id: string | null; preferred_role_name: string | null
  available_hours_per_week: number | null; skills: { skill_id: string; name: string }[]
  experiences_count: number; certificates_count: number
  profile_url: string; experiences_url: string; certificates_url: string
}
export interface AppliedPosition {
  position_id: string; title: string; role_id: string; role_name: string; experience_level: ProjectDifficultyLevel
  required_count: number; filled_count: number; status: "open" | "filled" | "closed"; skills: PositionSkillDto[]
}
export interface ApplicationReviewDto { application: ProjectApplicationDto; applicant: ApplicantPreview; applied_position: AppliedPosition; matching: RuleMatch }
export interface ApplicationReviewPage { items: ApplicationReviewDto[]; pagination: PaginationMeta }
export interface ApplicationReviewQuery { position_id?: string; status?: ApplicationStatus | "all"; sort_by?: "match" | "newest"; page?: number; page_size?: number }

export function applicationBlocker(project: ProjectDetailDto, userId: string, history: ProjectApplicationDto[]): string | null {
  if (project.leader.user_id === userId) return "You lead this project."
  if (project.team_members.some(member => member.user_id === userId)) return "You are already an active member."
  if (history.some(a => a.project_id === project.project_id && a.status === "pending")) return "You have a pending application to this project."
  if (!project.recruitment_closes_at || typeof project.is_recruitment_open !== "boolean") return "Recruitment availability could not be verified."
  if (project.status !== "recruiting" || !project.is_recruitment_open || Date.now() >= Date.parse(project.recruitment_closes_at)) return "Recruitment is closed."
  if (project.current_team_size >= project.max_team_capacity) return "The project team is full."
  if (!project.positions.some(p => p.status === "open" && p.filled_count < p.required_count)) return "There are no open position slots."
  return null
}
