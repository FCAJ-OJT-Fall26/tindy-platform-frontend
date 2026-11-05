import { ApiError, apiRequest } from "./apiClient"
import { isGuid, requireProjectId } from "./projects.service"
import { assertRuleMatch } from "./discovery.service"
import type { PaginationMeta } from "../types/project"
import type {
  CandidateAction,
  CandidateInteractionDto,
  CandidateInteractionsPageDto,
  ResetCandidateInteractionDto,
  TeammateCandidatePreviewDto,
  TeammateCandidateQuery,
  TeammateCandidatesPageDto,
} from "../types/teammate"

export const CANDIDATE_INTERACTIONS_CHANGED_EVENT =
  "tindy:candidate-interactions-changed"
export const sameId = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase()
export const validDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
export const candidateActions: CandidateAction[] = [
  "saved",
  "shortlisted",
  "skipped",
]
export const queryString = (query: object) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value))
  return params.toString()
}
export function assertPagination(
  p: PaginationMeta,
  expectedPage?: number,
): void {
  if (
    !p ||
    ![p.current_page, p.page_size, p.total_items, p.total_pages].every(
      Number.isInteger,
    ) ||
    p.current_page < 1 ||
    p.page_size < 1 ||
    p.page_size > 50 ||
    p.total_items < 0 ||
    p.total_pages < 0 ||
    typeof p.has_next !== "boolean" ||
    typeof p.has_previous !== "boolean" ||
    (expectedPage !== undefined && p.current_page !== expectedPage)
  )
    throw Error("Invalid server pagination.")
}
export function assertCandidate(candidate: TeammateCandidatePreviewDto): void {
  const nullableText = (v: unknown) => v === null || typeof v === "string"
  if (
    !candidate ||
    !isGuid(candidate.user_id) ||
    typeof candidate.display_name !== "string" ||
    !nullableText(candidate.avatar_url) ||
    !nullableText(candidate.headline) ||
    !(
      candidate.preferred_role_id === null ||
      isGuid(candidate.preferred_role_id)
    ) ||
    !nullableText(candidate.preferred_role_name) ||
    !(
      candidate.available_hours_per_week === null ||
      (Number.isInteger(candidate.available_hours_per_week) &&
        candidate.available_hours_per_week >= 0)
    ) ||
    !Array.isArray(candidate.skills) ||
    !candidate.skills.every(
      (s) => isGuid(s.skill_id) && typeof s.name === "string",
    ) ||
    !Number.isInteger(candidate.experiences_count) ||
    candidate.experiences_count < 0 ||
    !Number.isInteger(candidate.certificates_count) ||
    candidate.certificates_count < 0 ||
    ![
      candidate.profile_url,
      candidate.experiences_url,
      candidate.certificates_url,
    ].every(
      (v) =>
        typeof v === "string" &&
        v.startsWith(`/api/users/${candidate.user_id}/profile`),
    )
  )
    throw Error("Invalid candidate preview from backend.")
}
const contextPath = (project: string) => {
  requireProjectId(project, "Project")
  return `/api/projects/${encodeURIComponent(project)}`
}
const positionParams = (position: string) => {
  requireProjectId(position, "Position")
  return { position_id: position }
}
export async function getTeammateCandidates(
  project: string,
  position: string,
  query: TeammateCandidateQuery = {},
  cursor?: string | null,
  signal?: AbortSignal,
): Promise<TeammateCandidatesPageDto> {
  positionParams(position)
  const params = queryString({
    limit: 20,
    sort_by: "match",
    ...query,
    cursor: cursor ?? undefined,
  })
  const { data } = await apiRequest<TeammateCandidatesPageDto>(
    `${contextPath(project)}/positions/${encodeURIComponent(position)}/candidates?${params}`,
    { signal },
  )
  if (
    !data ||
    !sameId(data.project_id ?? "", project) ||
    !sameId(data.position_id ?? "", position) ||
    data.feed_version !== "teammates-v1" ||
    !validDate(data.scored_at) ||
    !Array.isArray(data.items) ||
    typeof data.has_more !== "boolean" ||
    !(data.next_cursor === null || typeof data.next_cursor === "string") ||
    (data.has_more && !data.next_cursor)
  )
    throw Error("Invalid candidate feed response. Refresh this position.")
  const ids = new Set<string>()
  for (const card of data.items) {
    assertCandidate(card.candidate)
    assertRuleMatch(card.matching)
    const names = card.matching.match_factors.map((f) => f.name)
    if (
      names.length !== 4 ||
      new Set(names).size !== 4 ||
      [
        "required_skills",
        "preferred_role",
        "availability",
        "optional_skills",
      ].some((name) => !names.includes(name)) ||
      card.matching.match_factors.some(
        (f) =>
          (f.factor !== null && (f.factor < 0 || f.factor > 1)) ||
          f.normalized_weight < 0 ||
          f.normalized_weight > 100 ||
          f.contribution < 0 ||
          f.contribution > 100,
      )
    )
      throw Error("Unsupported teammate matching factors.")
    if (
      !sameId(card.matching.best_position.position_id, position) ||
      !(
        card.interaction_action === null ||
        candidateActions.includes(card.interaction_action)
      ) ||
      ids.has(card.candidate.user_id.toLowerCase())
    )
      throw Error("Candidate matching/context could not be confirmed.")
    ids.add(card.candidate.user_id.toLowerCase())
  }
  return data
}
function assertInteraction(
  row: CandidateInteractionDto,
  project: string,
  position: string,
  candidate?: string,
): void {
  if (
    !row ||
    !sameId(row.project_id ?? "", project) ||
    !sameId(row.position_id ?? "", position) ||
    !isGuid(row.candidate_user_id) ||
    (candidate && !sameId(row.candidate_user_id, candidate)) ||
    !candidateActions.includes(row.action) ||
    !validDate(row.created_at) ||
    !validDate(row.updated_at)
  )
    throw Error(
      "Candidate interaction response could not be confirmed. Reload stored interactions.",
    )
}
export async function getCandidateInteractions(
  project: string,
  position: string,
  query: { action?: CandidateAction; page?: number; page_size?: number } = {},
  signal?: AbortSignal,
): Promise<CandidateInteractionsPageDto> {
  const { data } = await apiRequest<CandidateInteractionsPageDto>(
    `${contextPath(project)}/candidate-interactions?${queryString({ ...positionParams(position), page: 1, page_size: 20, ...query })}`,
    { signal },
  )
  if (!data || !Array.isArray(data.items))
    throw Error("Invalid candidate interactions response.")
  assertPagination(data.pagination, query.page ?? 1)
  if (data.pagination.has_next && data.items.length === 0) throw Error("Incomplete candidate interaction history.")
  for (const row of data.items) {
    assertInteraction(row, project, position)
    if (row.candidate !== null) {
      assertCandidate(row.candidate)
      if (!sameId(row.candidate.user_id, row.candidate_user_id))
        throw Error("Invalid candidate interaction identity.")
    }
    if (typeof row.is_discoverable !== "boolean")
      throw Error("Invalid candidate availability response.")
  }
  return data
}
export async function setCandidateInteraction(
  project: string,
  position: string,
  candidate: string,
  action: CandidateAction,
  signal?: AbortSignal,
): Promise<CandidateInteractionDto> {
  requireProjectId(candidate, "Candidate")
  const { data } = await apiRequest<CandidateInteractionDto>(
    `${contextPath(project)}/candidate-interactions/${encodeURIComponent(candidate)}?${queryString(positionParams(position))}`,
    { method: "PUT", body: JSON.stringify({ action }), signal },
  )
  assertInteraction(data, project, position, candidate)
  if (data.action !== action)
    throw Error("Candidate action could not be confirmed.")
  window.dispatchEvent(new Event(CANDIDATE_INTERACTIONS_CHANGED_EVENT))
  return data
}
export async function resetCandidateInteraction(
  project: string,
  position: string,
  candidate: string,
  signal?: AbortSignal,
): Promise<ResetCandidateInteractionDto> {
  requireProjectId(candidate, "Candidate")
  const { data } = await apiRequest<ResetCandidateInteractionDto>(
    `${contextPath(project)}/candidate-interactions/${encodeURIComponent(candidate)}?${queryString(positionParams(position))}`,
    { method: "DELETE", signal },
  )
  if (
    !data ||
    !sameId(data.project_id ?? "", project) ||
    !sameId(data.position_id ?? "", position) ||
    !sameId(data.candidate_user_id ?? "", candidate) ||
    data.action !== null
  )
    throw Error(
      "Interaction reset could not be confirmed. Reload stored interactions.",
    )
  window.dispatchEvent(new Event(CANDIDATE_INTERACTIONS_CHANGED_EVENT))
  return data
}
export function teammateErrorMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    const messages: Record<string, string> = {
      PROJECT_ACCESS_DENIED:
        "Only the actual project leader can manage these candidates.",
      PROJECT_NOT_FOUND: "This project is unavailable. Choose another project.",
      POSITION_NOT_FOUND:
        "This position is unavailable. Choose another position.",
      CANDIDATE_NOT_FOUND:
        "This candidate is no longer available. Refresh the list.",
      CANNOT_INVITE_SELF: "You cannot invite yourself.",
      ALREADY_PROJECT_MEMBER: "This member already belongs to the project.",
      APPLICATION_ALREADY_PENDING:
        "This member has a pending application. Review Applications instead.",
      INVITATION_ALREADY_PENDING:
        "A pending invitation already exists for this member and project, possibly for another position.",
      INVITATION_COOLDOWN_ACTIVE:
        "Wait 7 days after this member declined before inviting them again.",
      INVITATION_EXPIRED:
        "This invitation has expired. Refresh its recorded status.",
      INVITATION_NOT_PENDING:
        "This invitation has already been answered or cancelled. Refresh its status.",
      INVITATION_NOT_FOUND:
        "This invitation is unavailable or does not belong to you.",
      PROJECT_NOT_ELIGIBLE:
        "This project is no longer eligible for new invitations. Refresh the project and its positions.",
      PROJECT_NOT_RECRUITING: "This project is no longer recruiting.",
      POSITION_UNAVAILABLE:
        "This position is closed or full. No membership was confirmed.",
      PROJECT_CAPACITY_EXCEEDED:
        "The project team is full. No membership was confirmed.",
      CANDIDATE_UNAVAILABLE:
        "This member's account or invitation consent is unavailable. The recipient may need to re-enable invitations in Profile Settings before accepting.",
      INVITATION_SENDER_UNAVAILABLE:
        "The original sender is no longer the project leader.",
      INVITATION_RATE_LIMITED: "Too many attempts. Wait before trying again.",
      INVALID_TEAMMATE_DISCOVERY_CURSOR:
        "The candidate session is invalid. Refresh the feed.",
      TEAMMATE_DISCOVERY_CURSOR_EXPIRED:
        "The candidate session expired. Refresh the feed.",
      TEAMMATE_DISCOVERY_SNAPSHOT_TOO_LARGE:
        "Too many candidates for this snapshot. Narrow the backend filters.",
    }
    return messages[reason.errorCode ?? ""] ?? reason.message
  }
  return reason instanceof Error
    ? reason.message
    : "The result is unconfirmed. Check the backend state before retrying."
}
