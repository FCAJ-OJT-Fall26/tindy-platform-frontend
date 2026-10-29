/**
 * Project Management & Positions API Types
 * Corresponding to Section 4 & Section 5 of docs/API_Profile.md
 */

export type ProjectDifficultyLevel = "beginner_friendly" | "intermediate" | "advanced"

export type ProjectStatus = "recruiting" | "in_progress" | "completed" | "archived"

export type PositionStatus = "open" | "filled" | "closed"

export interface ProjectLeaderSummary {
  user_id: string
  display_name: string
  avatar_url?: string | null
  initials?: string
}

export interface ProjectTeamMemberDto {
  user_id: string
  display_name: string
  role_title: string
  avatar_url?: string | null
  initials: string
  is_leader: boolean
  joined_at: string
}

export interface PositionSkillDto {
  skill_id: string
  name: string
  is_required: boolean
}

export interface ProjectPositionDto {
  position_id: string
  project_id?: string
  role_id: string
  title: string
  description?: string | null
  required_count: number
  filled_count: number
  experience_level: ProjectDifficultyLevel
  status: PositionStatus
  skills: PositionSkillDto[]
}

export interface OpenPositionSummaryDto {
  position_id: string
  title: string
  role_name: string
  required_count: number
  required_skills: string[]
  nice_to_have_skills: string[]
}

export interface ProjectSummaryDto {
  project_id: string
  name: string
  tagline?: string | null
  description: string
  category: string
  difficulty_level: ProjectDifficultyLevel
  expected_commitment_hours: number
  duration: string
  current_team_size: number
  max_team_capacity: number
  color_theme?: string | null
  initials?: string | null
  leader: ProjectLeaderSummary
  open_positions: OpenPositionSummaryDto[]
  created_at: string
  closing_days_left?: number
}

export interface PaginationMeta {
  current_page: number
  page_size: number
  total_items: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export interface PagedProjectsResponse {
  items: ProjectSummaryDto[]
  pagination: PaginationMeta
}

export interface ProjectDetailDto {
  project_id: string
  name: string
  tagline?: string | null
  description: string
  category: string
  difficulty_level: ProjectDifficultyLevel
  status: ProjectStatus
  expected_commitment_hours: number
  duration: string
  current_team_size: number
  max_team_capacity: number
  color_theme?: string | null
  initials?: string | null
  created_at: string
  closing_days_left?: number
  leader: ProjectLeaderSummary
  goals: string[]
  team_members: ProjectTeamMemberDto[]
  positions: ProjectPositionDto[]
}

export interface CreateProjectPositionSkillInput {
  skill_id: string
  is_required: boolean
}

export interface CreateProjectPositionInput {
  role_id: string
  title: string
  required_count: number
  experience_level: ProjectDifficultyLevel
  description?: string | null
  skills: CreateProjectPositionSkillInput[]
}

export interface CreateProjectRequest {
  name: string
  tagline?: string
  description: string
  category: string
  difficulty_level: ProjectDifficultyLevel
  expected_commitment_hours: number
  duration: string
  initial_team_size: number
  max_team_capacity: number
  color_theme?: string
  recruitment_closing_days?: number
  goals: string[]
  positions: CreateProjectPositionInput[]
}

export interface CreateProjectResponse {
  project_id: string
  name: string
  tagline?: string | null
  category: string
  status: ProjectStatus
  leader: ProjectLeaderSummary
  current_team_size: number
  max_team_capacity: number
  positions_count: number
  created_at: string
}

export interface UpdateProjectRequest {
  name: string
  tagline?: string
  description: string
  category: string
  difficulty_level: ProjectDifficultyLevel
  expected_commitment_hours: number
  duration: string
  max_team_capacity: number
  color_theme?: string
  goals: string[]
}

export interface DeleteProjectResponse {
  project_id: string
  status: "archived"
}

export interface MyLeadingProjectDto {
  project_id: string
  name: string
  status: ProjectStatus
  current_team_size: number
  max_team_capacity: number
  pending_applications_count: number
  created_at: string
}

export interface MyJoinedProjectDto {
  project_id: string
  name: string
  status: ProjectStatus
  my_role: string
  leader_name: string
  joined_at: string
}

export interface MyProjectsResponse {
  leading_projects: MyLeadingProjectDto[]
  joined_projects: MyJoinedProjectDto[]
}

export interface GetProjectsQuery {
  q?: string
  category?: string
  role?: string
  skill?: string
  status?: ProjectStatus | "all"
  page?: number
  page_size?: number
  sort_by?: "newest" | "deadline" | "popular"
}

export interface CreatePositionRequest {
  role_id: string
  title: string
  required_count: number
  experience_level: ProjectDifficultyLevel
  description?: string
}

export interface UpdatePositionRequest {
  title: string
  required_count: number
  experience_level: ProjectDifficultyLevel
  status: PositionStatus
  description?: string
}

export interface AddPositionSkillRequest {
  skill_id: string
  is_required: boolean
  minimum_experience_level?: ProjectDifficultyLevel
}

export interface AddPositionSkillResponse {
  position_id: string
  skill_id: string
  skill_name: string
  is_required: boolean
}
