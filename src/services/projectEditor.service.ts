import { ApiError } from "./apiClient"
import {
  addPositionSkillApi, createProjectApi, createProjectPositionApi, deleteProjectPositionApi,
  getMyProjectsApi, getProjectByIdApi, removePositionSkillApi, toApiDifficulty,
  updateProjectApi, updateProjectPositionApi, isGuid,
} from "./projects.service"
import type { CatalogSkill, ProfessionalRole, SelectedSkill } from "../types/catalog"
import type { CreateProjectRequest, ProjectDetailDto, ProjectPositionDto, PositionStatus, UpdateProjectRequest } from "../types/project"

export interface ProjectDraftPosition {
  id: string // A form key; only positionId identifies a persisted Position.
  positionId?: string
  roleId: string
  role: string
  title: string
  description: string
  count: number
  level: string
  status: PositionStatus
  requiredSkills: SelectedSkill[]
  niceSkills: SelectedSkill[]
}

export interface ProjectSaveProgress {
  projectId?: string
  creationAttempt?: { knownIds: string[]; payload: CreateProjectRequest }
  positionIds: Record<string, string>
  creationDraftKeys?: string[]
  positionAttempt?: { key: string; knownIds: string[] }
}

export function projectErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = Object.values(error.validationErrors ?? {}).flat().join(" ") || error.message
    const messages: Record<number, string> = {
      400: "Check the project details and catalog selections.",
      401: "Your session has expired. Sign in again; your project draft is kept in this tab.",
      403: "You do not have permission to change this project. Complete onboarding if required.",
      404: "This project, position or catalog item is no longer available. Reload and check your selections.",
      409: "The project conflicts with a recent change. Refresh its saved state and retry.",
      500: "The server could not complete the operation. Check the saved state before retrying.",
    }
    return `${messages[error.status] ?? "The request failed."} ${detail}`
  }
  if (error instanceof TypeError || (error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name)))
    return "Could not confirm the save because the connection was interrupted. Your input has been kept. Check the saved state before retrying."
  return error instanceof Error ? error.message : "Unable to save. Your input has been kept; please retry."
}

export function positionFromDto(position: ProjectPositionDto, roles: ProfessionalRole[] = []): ProjectDraftPosition {
  return {
    id: position.position_id, positionId: position.position_id,
    roleId: position.role_id,
    role: roles.find(role => role.professional_role_id === position.role_id)?.name ?? position.title,
    title: position.title, description: position.description ?? "", count: position.required_count,
    level: position.experience_level, status: position.status,
    requiredSkills: position.skills.filter(skill => skill.is_required),
    niceSkills: position.skills.filter(skill => !skill.is_required),
  }
}

export function validatePositionCatalog(positions: ProjectDraftPosition[], roles: ProfessionalRole[], skills: CatalogSkill[]): string | null {
  for (const position of positions) {
    if (!isGuid(position.roleId) || !roles.some(role => role.professional_role_id === position.roleId))
      return `The role for "${position.title || "New position"}" is unavailable. Select an active catalog role; existing roles cannot be replaced.`
    const selected = [...position.requiredSkills, ...position.niceSkills]
    if (selected.some(skill => !isGuid(skill.skill_id) || !skills.some(active => active.skill_id === skill.skill_id)))
      return `A skill selected for "${position.title}" is no longer in the active catalog. Remove it or select an available skill.`
    if (new Set(selected.map(skill => skill.skill_id)).size !== selected.length)
      return `Select each skill only once for "${position.title}".`
  }
  return null
}

const text = (value?: string | null) => value?.trim() ?? ""
const positionSkills = (position: ProjectDraftPosition) => [
  ...position.requiredSkills.map(skill => ({ skill_id: skill.skill_id, is_required: true })),
  ...position.niceSkills.map(skill => ({ skill_id: skill.skill_id, is_required: false })),
]

function matchesProject(project: ProjectDetailDto, request: UpdateProjectRequest): boolean {
  return project.name === text(request.name) && text(project.tagline) === text(request.tagline) &&
    project.description === text(request.description) && project.category === text(request.category) &&
    project.difficulty_level === request.difficulty_level && project.expected_commitment_hours === request.expected_commitment_hours &&
    project.duration === text(request.duration) && project.max_team_capacity === request.max_team_capacity &&
    text(project.color_theme) === text(request.color_theme) && JSON.stringify(project.goals) === JSON.stringify(request.goals)
}

function matchesPosition(position: ProjectPositionDto, draft: ProjectDraftPosition): boolean {
  return position.role_id === draft.roleId && position.title === text(draft.title) &&
    text(position.description) === text(draft.description) && position.required_count === draft.count &&
    position.experience_level === toApiDifficulty(draft.level) && position.status === draft.status
}

function matchesSkills(position: ProjectPositionDto, draft: ProjectDraftPosition): boolean {
  const skills = positionSkills(draft)
  return position.skills.length === skills.length && skills.every(skill => position.skills.some(saved =>
    saved.skill_id === skill.skill_id && saved.is_required === skill.is_required))
}

export function bindCreatedPositions(project: ProjectDetailDto, progress: ProjectSaveProgress): void {
  const attempt = progress.creationAttempt
  if (!attempt || !progress.creationDraftKeys) return
  const used = new Set(Object.values(progress.positionIds))
  attempt.payload.positions.forEach((input, index) => {
    const key = progress.creationDraftKeys![index]
    if (progress.positionIds[key]) return
    const position = project.positions.find(position => !used.has(position.position_id) && position.role_id === input.role_id &&
      position.title === text(input.title) && text(position.description) === text(input.description) && position.required_count === input.required_count)
    if (!position) throw new Error("The created project's positions could not be matched to the saved request. Check the saved project before retrying.")
    progress.positionIds[key] = position.position_id
    used.add(position.position_id)
  })
}

// A successful POST receipt is retained even if the subsequent GET fails. For an
// unknown POST outcome, reconcile first; never automatically issue a second POST.
export async function createProjectOnce(payload: CreateProjectRequest, progress: ProjectSaveProgress, checkpoint: () => void): Promise<string> {
  if (progress.projectId) return progress.projectId
  if (progress.creationAttempt) {
    const attempt = progress.creationAttempt
    const mine = await getMyProjectsApi()
    const candidates = await Promise.all(mine.leading_projects.filter(project => !attempt.knownIds.includes(project.project_id))
      .map(project => getProjectByIdApi(project.project_id)))
    const drafts = attempt.payload.positions.map((position, index): ProjectDraftPosition => ({
      id: String(index), roleId: position.role_id, role: position.title, title: position.title,
      description: position.description ?? "", count: position.required_count, level: position.experience_level, status: "open",
      requiredSkills: position.skills.filter(skill => skill.is_required).map(skill => ({ ...skill, name: null })),
      niceSkills: position.skills.filter(skill => !skill.is_required).map(skill => ({ ...skill, name: null })),
    }))
    const matches = candidates.filter(project => {
      if (!matchesProject(project, attempt.payload) || project.positions.length !== drafts.length) return false
      const remaining = [...project.positions]
      return drafts.every(draft => {
        const index = remaining.findIndex(position => matchesPosition(position, draft) && matchesSkills(position, draft))
        if (index < 0) return false
        remaining.splice(index, 1)
        return true
      })
    })
    if (matches.length !== 1) throw new Error("The previous create request has an unknown outcome. Check My Projects or retry checking save status. Publishing again is blocked to avoid creating a duplicate project.")
    progress.projectId = matches[0].project_id
    checkpoint()
    return progress.projectId
  }
  const mine = await getMyProjectsApi()
  progress.creationAttempt = { knownIds: mine.leading_projects.map(project => project.project_id), payload }
  checkpoint()
  try {
    const created = await createProjectApi(payload)
    progress.projectId = created.project_id
    checkpoint()
    return created.project_id
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      delete progress.creationAttempt
      checkpoint()
    }
    throw error
  }
}

export async function saveProjectEdits(
  projectId: string, request: UpdateProjectRequest, drafts: ProjectDraftPosition[], originalPositionIds: string[],
  progress: ProjectSaveProgress, checkpoint: () => void,
): Promise<ProjectDetailDto> {
  let server = await getProjectByIdApi(projectId)
  // Recover an interrupted position POST without recreating a saved Position.
  if (progress.positionAttempt) {
    const attempt = progress.positionAttempt
    const draft = drafts.find(position => position.id === attempt.key)
    const matches = draft ? server.positions.filter(position => !attempt.knownIds.includes(position.position_id) && matchesPosition(position, draft)) : []
    if (matches.length !== 1) throw new Error("A previous position creation could not be confirmed. Check saved positions before adding another; retry checking the saved state to avoid duplicates.")
    progress.positionIds[attempt.key] = matches[0].position_id
    delete progress.positionAttempt
    checkpoint()
  }
  if (!matchesProject(server, request)) await updateProjectApi(projectId, request)
  for (const draft of drafts) {
    let id = draft.positionId ?? progress.positionIds[draft.id]
    let position = server.positions.find(item => item.position_id === id)
    if (id && !position) throw new Error(`Position "${draft.title}" was removed on the server. Reload the project before editing it.`)
    if (position && position.role_id !== draft.roleId) throw new Error("An existing position's role cannot be changed. Reload its saved role.")
    if (!position) {
      progress.positionAttempt = { key: draft.id, knownIds: server.positions.map(item => item.position_id) }
      checkpoint()
      try {
        position = await createProjectPositionApi(projectId, {
          role_id: draft.roleId, title: draft.title.trim(), description: draft.description.trim(),
          required_count: draft.count, experience_level: toApiDifficulty(draft.level),
        })
        id = position.position_id
        progress.positionIds[draft.id] = id
        delete progress.positionAttempt
        checkpoint()
        server.positions.push(position)
      } catch (error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          delete progress.positionAttempt
          checkpoint()
        }
        throw error
      }
    } else if (!matchesPosition(position, draft)) {
      position = await updateProjectPositionApi(projectId, position.position_id, {
        title: draft.title.trim(), description: draft.description.trim(), required_count: draft.count,
        experience_level: toApiDifficulty(draft.level), status: draft.status,
      })
    }
    const targetSkills = positionSkills(draft)
    for (const skill of targetSkills) {
      if (!position.skills.some(saved => saved.skill_id === skill.skill_id && saved.is_required === skill.is_required))
        await addPositionSkillApi(projectId, position.position_id, skill)
    }
    for (const saved of position.skills) {
      if (!targetSkills.some(skill => skill.skill_id === saved.skill_id))
        await removePositionSkillApi(projectId, position.position_id, saved.skill_id)
    }
  }
  const retained = new Set(drafts.map(draft => draft.positionId ?? progress.positionIds[draft.id]))
  const ownedPositionIds = [...new Set([...originalPositionIds, ...Object.values(progress.positionIds)])]
  for (const id of ownedPositionIds) {
    if (!retained.has(id) && server.positions.some(position => position.position_id === id)) await deleteProjectPositionApi(projectId, id)
  }
  server = await getProjectByIdApi(projectId)
  if (!matchesProject(server, request) || drafts.some(draft => {
    const position = server.positions.find(item => item.position_id === (draft.positionId ?? progress.positionIds[draft.id]))
    return !position || !matchesPosition(position, draft) || !matchesSkills(position, draft)
  }) || ownedPositionIds.some(id => !retained.has(id) && server.positions.some(position => position.position_id === id)))
    throw new Error("The saved state differs from your draft. Some changes may have been saved. Review the server state and retry the remaining changes.")
  return server
}
