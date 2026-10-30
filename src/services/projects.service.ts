import { apiRequest, getStoredToken } from "./apiClient"
import type { Project } from "../data"
import type {
  AddPositionSkillRequest,
  AddPositionSkillResponse,
  CreatePositionRequest,
  CreateProjectRequest,
  CreateProjectResponse,
  DeleteProjectResponse,
  GetProjectsQuery,
  MyProjectsResponse,
  PagedProjectsResponse,
  ProjectDetailDto,
  ProjectDifficultyLevel,
  ProjectPositionDto,
  ProjectSummaryDto,
  UpdatePositionRequest,
  UpdateProjectRequest,
} from "../types/project"

/**
 * Project Management & Positions API Services
 * Implements Section 4 (4.1 - 4.6) & Section 5 (5.1 - 5.5) of docs/API_Profile.md
 */

const projectsBase = "/api/projects"

function optionalAuthHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function isGuid(value?: string | null): boolean {
  if (!value || value === "00000000-0000-0000-0000-000000000000") return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function requireProjectId(id: string, kind: string): void {
  if (!isGuid(id)) throw new Error(`${kind} ID is invalid. Reload the project and try again.`)
}

export function toApiDifficulty(uiDifficulty: string): ProjectDifficultyLevel {
  const normalized = uiDifficulty.trim().toLowerCase()
  if (normalized.includes("beginner")) return "beginner_friendly"
  if (normalized.includes("advanced")) return "advanced"
  return "intermediate"
}

export function fromApiDifficulty(level?: ProjectDifficultyLevel | string | null): string {
  if (!level) return "Intermediate"
  if (level === "beginner_friendly") return "Beginner-friendly"
  if (level === "advanced") return "Advanced"
  return "Intermediate"
}

export function mapProjectSummaryToUiProject(dto: ProjectSummaryDto, existing?: Project): Project {
  const primaryPosition = dto.open_positions?.[0]
  const requiredSkills = primaryPosition?.required_skills ?? existing?.requiredSkills ?? []
  const niceSkills = primaryPosition?.nice_to_have_skills ?? existing?.gap ?? []
  const allSkills = Array.from(new Set([...requiredSkills, ...niceSkills]))

  return {
    id: dto.project_id,
    recruitmentClosingDate: dto.recruitment_closing_date,
    recruitmentClosesAt: dto.recruitment_closes_at,
    isRecruitmentOpen: dto.is_recruitment_open,
    name: dto.name,
    tagline: dto.tagline ?? undefined,
    description: dto.description,
    type: dto.category,
    skills: allSkills,
    requiredSkills: requiredSkills.length ? requiredSkills : undefined,
    role: primaryPosition?.title || primaryPosition?.role_name || existing?.role || "No open positions",
    hours: dto.expected_commitment_hours,
    duration: dto.duration,
    difficulty: fromApiDifficulty(dto.difficulty_level),
    team: dto.current_team_size,
    capacity: dto.max_team_capacity,
    openings: dto.open_positions.reduce((sum, position) => sum + position.required_count, 0),
    leader: dto.leader.display_name,
    leaderId: dto.leader.user_id,
    matchAvailable: true, serverMatch: existing?.serverMatch,
    initials:
      dto.initials ||
      dto.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase(),
    color: dto.color_theme || existing?.color || "indigo",
    created: Date.parse(dto.created_at),
    closing: dto.closing_days_left ?? existing?.closing ?? 14,
    factors: existing?.factors ?? [0, 0, 0, 0, 0],
    goals: existing?.goals ?? [],
    gap: niceSkills,
  }
}

export function mapProjectDetailToUiProject(dto: ProjectDetailDto, existing?: Project): Project {
  const primaryPosition = dto.positions?.[0]
  const requiredSkills =
    primaryPosition?.skills?.filter((s) => s.is_required).map((s) => s.name) ??
    existing?.requiredSkills ??
    []
  const niceSkills =
    primaryPosition?.skills?.filter((s) => !s.is_required).map((s) => s.name) ??
    existing?.gap ??
    []
  const allSkills = Array.from(new Set([...requiredSkills, ...niceSkills]))

  return {
    id: dto.project_id,
    recruitmentClosingDate: dto.recruitment_closing_date,
    recruitmentClosesAt: dto.recruitment_closes_at,
    isRecruitmentOpen: dto.is_recruitment_open,
    name: dto.name,
    tagline: dto.tagline ?? undefined,
    description: dto.description,
    type: dto.category,
    skills: allSkills,
    requiredSkills: requiredSkills.length ? requiredSkills : undefined,
    role: primaryPosition?.title || existing?.role || "No open positions",
    hours: dto.expected_commitment_hours,
    duration: dto.duration,
    difficulty: fromApiDifficulty(dto.difficulty_level),
    team: dto.current_team_size,
    capacity: dto.max_team_capacity,
    openings: dto.positions.filter(position => position.status === "open").reduce((sum, position) => sum + Math.max(0, position.required_count - position.filled_count), 0),
    leader: dto.leader.display_name,
    leaderId: dto.leader.user_id,
    matchAvailable: true, serverMatch: existing?.serverMatch,
    initials:
      dto.initials ||
      dto.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase(),
    color: dto.color_theme || existing?.color || "indigo",
    created: Date.parse(dto.created_at),
    closing: dto.closing_days_left ?? existing?.closing ?? 14,
    factors: existing?.factors ?? [0, 0, 0, 0, 0],
    goals: dto.goals ?? existing?.goals ?? [],
    status: dto.status,
    gap: niceSkills,
  }
}

// ================= B. PROJECT MANAGEMENT APIs (Section 4) =================

/**
 * 4.1. POST /api/projects — Tạo Dự án mới kèm danh sách vị trí tuyển dụng
 */
export async function createProjectApi(
  payload: CreateProjectRequest,
  signal?: AbortSignal,
): Promise<CreateProjectResponse> {
  const res = await apiRequest<CreateProjectResponse>(projectsBase, {
    method: "POST",
    requiresAuth: true,
    body: JSON.stringify(payload),
    signal,
  })
  return res.data
}

/**
 * 4.2. GET /api/projects — Tìm kiếm & Phân trang Dự án
 */
export async function getProjectsApi(
  query?: GetProjectsQuery,
  signal?: AbortSignal,
): Promise<PagedProjectsResponse> {
  const params = new URLSearchParams()
  if (query?.q?.trim()) params.set("q", query.q.trim())
  if (query?.category?.trim()) params.set("category", query.category.trim())
  if (query?.role?.trim()) params.set("role", query.role.trim())
  if (query?.skill?.trim()) params.set("skill", query.skill.trim())
  if (query?.status) params.set("status", query.status)
  if (query?.page) params.set("page", String(query.page))
  if (query?.page_size) params.set("page_size", String(query.page_size))
  if (query?.sort_by) params.set("sort_by", query.sort_by)

  const endpoint = `${projectsBase}${params.size ? `?${params}` : ""}`
  const res = await apiRequest<PagedProjectsResponse>(endpoint, {
    method: "GET",
    requiresAuth: false,
    headers: optionalAuthHeaders(),
    signal,
  })
  return res.data
}

/**
 * 4.3. GET /api/projects/{project_id} — Chi tiết Dự án
 */
export async function getProjectByIdApi(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectDetailDto> {
  requireProjectId(projectId, "Project")
  const res = await apiRequest<ProjectDetailDto>(
    `${projectsBase}/${encodeURIComponent(projectId)}`,
    {
      method: "GET",
      requiresAuth: false,
      headers: optionalAuthHeaders(),
      signal,
    },
  )
  return res.data
}

/**
 * 4.4. PUT /api/projects/{project_id} — Cập nhật Dự án (Chỉ Leader)
 */
export async function updateProjectApi(
  projectId: string,
  payload: UpdateProjectRequest,
  signal?: AbortSignal,
): Promise<ProjectDetailDto> {
  requireProjectId(projectId, "Project")
  const res = await apiRequest<ProjectDetailDto>(
    `${projectsBase}/${encodeURIComponent(projectId)}`,
    {
      method: "PUT",
      requiresAuth: true,
      body: JSON.stringify(payload),
      signal,
    },
  )
  return res.data
}

/**
 * 4.5. DELETE /api/projects/{project_id} — Đóng hoặc Lưu trữ Dự án (Soft Delete)
 */
export async function deleteProjectApi(
  projectId: string,
  signal?: AbortSignal,
): Promise<DeleteProjectResponse> {
  requireProjectId(projectId, "Project")
  const res = await apiRequest<DeleteProjectResponse>(
    `${projectsBase}/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
      requiresAuth: true,
      signal,
    },
  )
  return res.data
}

/**
 * 4.6. GET /api/me/projects — Danh sách Dự án của Tôi (Leading & Joined)
 */
export async function getMyProjectsApi(
  signal?: AbortSignal,
): Promise<MyProjectsResponse> {
  const res = await apiRequest<MyProjectsResponse>("/api/me/projects", {
    method: "GET",
    requiresAuth: true,
    signal,
  })
  return res.data
}

// ================= C. PROJECT POSITIONS & SKILLS APIs (Section 5) =================

/**
 * GET /api/projects/{project_id}/positions — Lấy danh sách vị trí tuyển dụng của dự án
 */
export async function getProjectPositionsApi(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectPositionDto[]> {
  requireProjectId(projectId, "Project")
  const res = await apiRequest<ProjectPositionDto[]>(
    `${projectsBase}/${encodeURIComponent(projectId)}/positions`,
    {
      method: "GET",
      requiresAuth: false,
      headers: optionalAuthHeaders(),
      signal,
    },
  )
  return res.data
}

/**
 * 5.1. POST /api/projects/{project_id}/positions — Thêm Vị trí Tuyển dụng
 */
export async function createProjectPositionApi(
  projectId: string,
  payload: CreatePositionRequest,
  signal?: AbortSignal,
): Promise<ProjectPositionDto> {
  requireProjectId(projectId, "Project")
  requireProjectId(payload.role_id, "Role")
  const res = await apiRequest<ProjectPositionDto>(
    `${projectsBase}/${encodeURIComponent(projectId)}/positions`,
    {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(payload),
      signal,
    },
  )
  return res.data
}

/**
 * 5.2. PUT /api/projects/{project_id}/positions/{position_id} — Sửa Vị trí Tuyển dụng
 */
export async function updateProjectPositionApi(
  projectId: string,
  positionId: string,
  payload: UpdatePositionRequest,
  signal?: AbortSignal,
): Promise<ProjectPositionDto> {
  requireProjectId(projectId, "Project")
  requireProjectId(positionId, "Position")
  const res = await apiRequest<ProjectPositionDto>(
    `${projectsBase}/${encodeURIComponent(projectId)}/positions/${encodeURIComponent(positionId)}`,
    {
      method: "PUT",
      requiresAuth: true,
      body: JSON.stringify(payload),
      signal,
    },
  )
  return res.data
}

/**
 * 5.3. DELETE /api/projects/{project_id}/positions/{position_id} — Xóa Vị trí Tuyển dụng
 */
export async function deleteProjectPositionApi(
  projectId: string,
  positionId: string,
  signal?: AbortSignal,
): Promise<void> {
  requireProjectId(projectId, "Project")
  requireProjectId(positionId, "Position")
  await apiRequest<unknown>(
    `${projectsBase}/${encodeURIComponent(projectId)}/positions/${encodeURIComponent(positionId)}`,
    {
      method: "DELETE",
      requiresAuth: true,
      signal,
    },
  )
}

/**
 * 5.4. POST /api/projects/{project_id}/positions/{position_id}/skills — Gán Kỹ năng cho Vị trí
 */
export async function addPositionSkillApi(
  projectId: string,
  positionId: string,
  payload: AddPositionSkillRequest,
  signal?: AbortSignal,
): Promise<AddPositionSkillResponse> {
  requireProjectId(projectId, "Project")
  requireProjectId(positionId, "Position")
  requireProjectId(payload.skill_id, "Skill")
  const res = await apiRequest<AddPositionSkillResponse>(
    `${projectsBase}/${encodeURIComponent(projectId)}/positions/${encodeURIComponent(positionId)}/skills`,
    {
      method: "POST",
      requiresAuth: true,
      body: JSON.stringify(payload),
      signal,
    },
  )
  return res.data
}

/**
 * 5.5. DELETE /api/projects/{project_id}/positions/{position_id}/skills/{skill_id} — Gỡ Kỹ năng
 */
export async function removePositionSkillApi(
  projectId: string,
  positionId: string,
  skillId: string,
  signal?: AbortSignal,
): Promise<void> {
  requireProjectId(projectId, "Project")
  requireProjectId(positionId, "Position")
  requireProjectId(skillId, "Skill")
  await apiRequest<unknown>(
    `${projectsBase}/${encodeURIComponent(projectId)}/positions/${encodeURIComponent(positionId)}/skills/${encodeURIComponent(skillId)}`,
    {
      method: "DELETE",
      requiresAuth: true,
      signal,
    },
  )
}
