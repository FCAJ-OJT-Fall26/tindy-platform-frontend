import { ApiError, getStoredToken } from "./apiClient"
import {
  cancelProjectInvitation,
  findMyInvitation,
  getRecipientInvitationHistory,
  INVITATIONS_CHANGED_EVENT,
  respondToProjectInvitation,
  sendProjectInvitation,
} from "./invitations.service"
import { isGuid } from "./projects.service"
import { sameId } from "./teammates.service"
import type { ProjectInvitationDto } from "../types/invitation"

// Intent journal only. Every confirmed status and membership still comes from the API.
// Scope is account/project/recipient, deliberately NOT position: pending/cooldown span positions.
const prefix = "tindy:invitation-attempt:v1:"
const locks = new Set<string>()
type SendAttempt = {
  kind: "send"
  owner: string
  project: string
  user: string
  position: string
  message: string | null
  knownIds: string[]
}
type ResponseAttempt = {
  kind: "accept" | "decline" | "cancel"
  owner: string
  invitation: ProjectInvitationDto
}
export type InvitationAttempt = SendAttempt | ResponseAttempt
const pairKey = (owner: string, project: string, user: string) =>
  `${prefix}${owner.toLowerCase()}:${project.toLowerCase()}:${user.toLowerCase()}`
function key(attempt: InvitationAttempt) {
  return attempt.kind === "send"
    ? pairKey(attempt.owner, attempt.project, attempt.user)
    : pairKey(
        attempt.owner,
        attempt.invitation.project_id,
        attempt.invitation.invited_user_id,
      )
}
export function readInvitationAttempt(
  owner: string,
  project: string,
  user: string,
): InvitationAttempt | null {
  const raw = sessionStorage.getItem(pairKey(owner, project, user))
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as InvitationAttempt
    if (!value || !sameId(value.owner ?? "", owner)) throw Error()
    if (
      value.kind === "send" &&
      sameId(value.project ?? "", project) &&
      sameId(value.user ?? "", user) &&
      isGuid(value.position) &&
      Array.isArray(value.knownIds) &&
      value.knownIds.every(isGuid) &&
      (value.message === null || typeof value.message === "string")
    )
      return value
    if (
      ["accept", "decline", "cancel"].includes(value.kind) &&
      value.kind !== "send" &&
      sameId(value.invitation.project_id, project) &&
      sameId(value.invitation.invited_user_id, user)
    )
      return value
  } catch {
    /* a damaged journal cannot authorize a second POST */
  }
  throw Error(
    "An unresolved invitation attempt could not be read. Check backend history before continuing in this browser session.",
  )
}
const write = (attempt: InvitationAttempt) =>
  sessionStorage.setItem(key(attempt), JSON.stringify(attempt))
const clear = (attempt: InvitationAttempt) =>
  sessionStorage.removeItem(key(attempt))
export const unknownInvitationOutcome = (reason: unknown) =>
  !(reason instanceof ApiError) ||
  reason.status >= 500 ||
  reason.status < 400 ||
  reason.status === 408
const changed = () => window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT))
function validateActor(
  row: ProjectInvitationDto,
  owner: string,
  leader: boolean,
) {
  if (!sameId(leader ? row.inviting_leader_id : row.invited_user_id, owner))
    throw Error("Invitation actor could not be confirmed.")
}
function assertSession(token: string | null) {
  if (!token || getStoredToken() !== token)
    throw Error(
      "The account session changed. Check history in the current account.",
    )
}
export async function reconcileInvitationAttempt(
  attempt: InvitationAttempt,
): Promise<ProjectInvitationDto | null> {
  const token = getStoredToken()
  if (attempt.kind === "send") {
    const rows = await getRecipientInvitationHistory(
      attempt.project,
      attempt.user,
    )
    assertSession(token)
    const matches = rows.filter(
      (row) =>
        !attempt.knownIds.some((id) => sameId(id, row.invitation_id)) &&
        sameId(row.position_id, attempt.position) &&
        sameId(row.inviting_leader_id, attempt.owner) &&
        row.message === attempt.message,
    )
    if (matches.length !== 1) return null
    clear(attempt)
    changed()
    return matches[0]
  }
  const original = attempt.invitation
  const row =
    attempt.kind === "cancel"
      ? ((
          await getRecipientInvitationHistory(
            original.project_id,
            original.invited_user_id,
          )
        ).find((r) => sameId(r.invitation_id, original.invitation_id)) ?? null)
      : await findMyInvitation(original.invitation_id, original.project_id)
  assertSession(token)
  if (!row) return null
  if (attempt.kind !== "cancel") validateActor(row, attempt.owner, false)
  if (
    !sameId(row.position_id, original.position_id) ||
    !sameId(row.invited_user_id, original.invited_user_id) ||
    !sameId(row.inviting_leader_id, original.inviting_leader_id)
  )
    throw Error("Invitation identity changed in history.")
  // A terminal status resolves the attempt, even if it differs from the intended action.
  // Pending/absent is insufficient evidence to retry a possibly committed request.
  if (row.status === "pending") return null
  clear(attempt)
  changed()
  return row
}
export async function sendInvitationSafely(
  owner: string,
  project: string,
  position: string,
  user: string,
  message: string,
): Promise<ProjectInvitationDto> {
  const pair = pairKey(owner, project, user)
  if (locks.has(pair))
    throw Error("An invitation request is already in progress.")
  locks.add(pair)
  const token = getStoredToken()
  let attempt: SendAttempt | null = null
  try {
    const existing = readInvitationAttempt(owner, project, user)
    if (existing)
      throw Error(
        "The previous invitation outcome is unknown. Check status before sending again.",
      )
    const baseline = await getRecipientInvitationHistory(project, user)
    assertSession(token)
    const pending = baseline.find((row) => row.status === "pending")
    if (pending) return pending // actual position retained, never pretend this was a new send
    attempt = {
      kind: "send",
      owner,
      project,
      user,
      position,
      message: message.trim() || null,
      knownIds: baseline.map((i) => i.invitation_id),
    }
    write(attempt) // fail closed if safe intent persistence is unavailable
    const result = await sendProjectInvitation(project, {
      position_id: position,
      invited_user_id: user,
      message: attempt.message,
    })
    assertSession(token)
    validateActor(result, owner, true)
    clear(attempt)
    return result
  } catch (reason) {
    if (attempt && getStoredToken() === token) {
      if (unknownInvitationOutcome(reason)) {
        try {
          const confirmed = await reconcileInvitationAttempt(attempt)
          if (confirmed) return confirmed
        } catch {
          /* journal remains unresolved */
        }
      } else {
        clear(attempt)
        if (
          reason instanceof ApiError &&
          reason.errorCode === "INVITATION_ALREADY_PENDING"
        ) {
          const rows = await getRecipientInvitationHistory(project, user)
          assertSession(token)
          const pending = rows.filter(
            (r) =>
              r.status === "pending",
          )
          if (pending.length === 1) return pending[0]
        }
      }
    }
    throw reason
  } finally {
    locks.delete(pair)
  }
}
export async function respondInvitationSafely(
  owner: string,
  invitation: ProjectInvitationDto,
  action: "accept" | "decline" | "cancel",
): Promise<ProjectInvitationDto> {
  const attempt: ResponseAttempt = { kind: action, owner, invitation }
  const pair = key(attempt)
  if (locks.has(pair))
    throw Error("An invitation request is already in progress.")
  locks.add(pair)
  const token = getStoredToken()
  let written = false
  try {
    if (action !== "cancel") validateActor(invitation, owner, false)
    if (
      readInvitationAttempt(
        owner,
        invitation.project_id,
        invitation.invited_user_id,
      )
    )
      throw Error("A previous outcome is unknown. Check its status first.")
    write(attempt)
    written = true
    const result =
      action === "cancel"
        ? await cancelProjectInvitation(
            invitation.project_id,
            invitation.invitation_id,
          )
        : await respondToProjectInvitation(invitation.invitation_id, action)
    assertSession(token)
    if (action !== "cancel") validateActor(result, owner, false)
    if (
      !sameId(result.project_id, invitation.project_id) ||
      !sameId(result.position_id, invitation.position_id) ||
      !sameId(result.invited_user_id, invitation.invited_user_id) ||
      !sameId(result.inviting_leader_id, invitation.inviting_leader_id)
    )
      throw Error("Invitation context could not be confirmed.")
    clear(attempt)
    return result
  } catch (reason) {
    if (written && getStoredToken() === token) {
      if (unknownInvitationOutcome(reason)) {
        try {
          const result = await reconcileInvitationAttempt(attempt)
          if (result) return result
        } catch {
          /* keep unconfirmed intent */
        }
      } else clear(attempt)
    }
    throw reason
  } finally {
    locks.delete(pair)
  }
}
