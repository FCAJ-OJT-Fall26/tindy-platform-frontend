import { apiRequest } from "./apiClient"
import { isGuid, requireProjectId } from "./projects.service"
import {
  assertPagination,
  queryString,
  sameId,
  validDate,
} from "./teammates.service"
import type {
  CreateProjectInvitationRequest,
  InvitationStatus,
  LeaderInvitationsQuery,
  MyInvitationsQuery,
  ProjectInvitationDto,
  ProjectInvitationsPageDto,
} from "../types/invitation"

export const INVITATIONS_CHANGED_EVENT = "tindy:invitations-changed"
export const invitationStatuses: InvitationStatus[] = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "expired",
]
const base = (project: string) => {
  requireProjectId(project, "Project")
  return `/api/projects/${encodeURIComponent(project)}/invitations`
}
export function assertInvitation(row: ProjectInvitationDto): void {
  if (
    !row ||
    ![
      row.invitation_id,
      row.project_id,
      row.position_id,
      row.invited_user_id,
      row.inviting_leader_id,
    ].every(isGuid) ||
    !invitationStatuses.includes(row.status) ||
    !(row.message === null || typeof row.message === "string") ||
    ![row.created_at, row.updated_at, row.expires_at].every(validDate) ||
    !(row.responded_at === null || validDate(row.responded_at)) ||
    Date.parse(row.expires_at) - Date.parse(row.created_at) !== 168 * 3600000 ||
    (["accepted", "declined"].includes(row.status) && row.responded_at === null)
  )
    throw Error(
      "Invitation result could not be confirmed. Check its backend history.",
    )
}
function page(
  data: ProjectInvitationsPageDto,
  expected: number,
): ProjectInvitationsPageDto {
  if (!data || !Array.isArray(data.items))
    throw Error("Invalid invitation history response.")
  assertPagination(data.pagination, expected)
  data.items.forEach(assertInvitation)
  if (data.pagination.has_next && data.items.length === 0)
    throw Error("Incomplete invitation history response.")
  return data
}
export async function getProjectInvitations(
  project: string,
  query: LeaderInvitationsQuery = {},
  signal?: AbortSignal,
): Promise<ProjectInvitationsPageDto> {
  const { data } = await apiRequest<ProjectInvitationsPageDto>(
    `${base(project)}?${queryString({ page: 1, page_size: 20, ...query })}`,
    { signal },
  )
  page(data, query.page ?? 1)
  if (
    data.items.some(
      (i) =>
        !sameId(i.project_id, project) ||
        (query.invited_user_id &&
          !sameId(i.invited_user_id, query.invited_user_id)) ||
        (query.position_id && !sameId(i.position_id, query.position_id)),
    )
  )
    throw Error("Invitation history returned a different context.")
  return data
}
export async function getMyProjectInvitations(
  query: MyInvitationsQuery = {},
  signal?: AbortSignal,
): Promise<ProjectInvitationsPageDto> {
  const { data } = await apiRequest<ProjectInvitationsPageDto>(
    `/api/me/project-invitations?${queryString({ page: 1, page_size: 20, ...query })}`,
    { signal },
  )
  page(data, query.page ?? 1)
  if (
    query.project_id &&
    data.items.some((i) => !sameId(i.project_id, query.project_id!))
  )
    throw Error("Invitation history returned a different project.")
  return data
}
export async function getRecipientInvitationHistory(
  project: string,
  user: string,
  signal?: AbortSignal,
): Promise<ProjectInvitationDto[]> {
  requireProjectId(user, "Recipient")
  const rows = new Map<string, ProjectInvitationDto>()
  for (let current = 1; ; current++) {
    const result = await getProjectInvitations(
      project,
      { invited_user_id: user, status: "all", page: current, page_size: 50 },
      signal,
    )
    result.items.forEach((i) => rows.set(i.invitation_id, i))
    if (!result.pagination.has_next) return [...rows.values()]
  }
}
export async function findMyInvitation(
  id: string,
  project: string,
  signal?: AbortSignal,
): Promise<ProjectInvitationDto | null> {
  requireProjectId(id, "Invitation")
  for (let current = 1; ; current++) {
    const result = await getMyProjectInvitations(
      { project_id: project, status: "all", page: current, page_size: 50 },
      signal,
    )
    const found = result.items.find((i) => sameId(i.invitation_id, id))
    if (found) return found
    if (!result.pagination.has_next) return null
  }
}
export async function sendProjectInvitation(
  project: string,
  request: CreateProjectInvitationRequest,
  signal?: AbortSignal,
): Promise<ProjectInvitationDto> {
  requireProjectId(request.position_id, "Position")
  requireProjectId(request.invited_user_id, "Recipient")
  if ((request.message?.length ?? 0) > 2000)
    throw Error("Message cannot exceed 2000 characters.")
  const { data } = await apiRequest<ProjectInvitationDto>(base(project), {
    method: "POST",
    body: JSON.stringify({
      position_id: request.position_id,
      invited_user_id: request.invited_user_id,
      message: request.message?.trim() || null,
    }),
    signal,
  })
  assertInvitation(data)
  if (
    !sameId(data.project_id, project) ||
    !sameId(data.position_id, request.position_id) ||
    !sameId(data.invited_user_id, request.invited_user_id) ||
    data.status !== "pending"
  )
    throw Error(
      "Invitation submission could not be confirmed. Check history before sending again.",
    )
  window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT))
  return data
}
export async function cancelProjectInvitation(
  project: string,
  id: string,
  signal?: AbortSignal,
): Promise<ProjectInvitationDto> {
  requireProjectId(id, "Invitation")
  const { data } = await apiRequest<ProjectInvitationDto>(
    `${base(project)}/${encodeURIComponent(id)}/cancel`,
    { method: "POST", signal },
  )
  assertInvitation(data)
  if (
    !sameId(data.project_id, project) ||
    !sameId(data.invitation_id, id) ||
    data.status !== "cancelled"
  )
    throw Error("Cancellation could not be confirmed. Check history.")
  window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT))
  return data
}
export async function respondToProjectInvitation(
  id: string,
  action: "accept" | "decline",
  signal?: AbortSignal,
): Promise<ProjectInvitationDto> {
  requireProjectId(id, "Invitation")
  const { data } = await apiRequest<ProjectInvitationDto>(
    `/api/me/project-invitations/${encodeURIComponent(id)}/${action}`,
    { method: "POST", signal },
  )
  assertInvitation(data)
  if (
    !sameId(data.invitation_id, id) ||
    data.status !== (action === "accept" ? "accepted" : "declined")
  )
    throw Error(
      "Invitation response could not be confirmed. Check its status before retrying.",
    )
  window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT))
  return data
}
