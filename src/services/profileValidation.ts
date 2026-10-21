import { ApiError } from "./apiClient"
import type { MyProfileResponse, ProfilePatch } from "../types/profile"

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const nullable = (value: string) => value.trim() || null

export function safeHttpUrl(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol === "http:" || url.protocol === "https:") return url.href
  } catch {
    /* Invalid links are never rendered as clickable URLs. */
  }
  return undefined
}

export const profileFields = [
  { key: "display_name", label: "Full name", max: 100, required: true },
  {
    key: "university",
    label: "University / community",
    max: 255,
    required: true,
  },
  { key: "headline", label: "Headline", max: 255 },
  { key: "current_role", label: "Current role", max: 255 },
  { key: "location", label: "Location", max: 255 },
  { key: "phone_number", label: "Phone number (only you)", max: 20 },
  {
    key: "public_email",
    label: "Public contact email",
    max: 255,
    type: "email",
  },
  { key: "github_url", label: "GitHub URL", max: 1000, type: "url" },
  { key: "linkedin_url", label: "LinkedIn URL", max: 1000, type: "url" },
  {
    key: "personal_website_url",
    label: "Personal website URL",
    max: 1000,
    type: "url",
  },
  { key: "resume_url", label: "Resume URL (only you)", max: 1000, type: "url" },
  { key: "bio", label: "About / profile summary", max: 2000, multiline: true },
  {
    key: "professional_interests",
    label: "Professional interests",
    max: 5000,
    multiline: true,
  },
  {
    key: "learning_goals",
    label: "Learning goals",
    max: 5000,
    multiline: true,
  },
  {
    key: "previous_projects_and_contribution",
    label: "Experience summary",
    max: 5000,
    multiline: true,
  },
  {
    key: "technologies_to_learn",
    label: "Technologies I want to learn",
    max: 5000,
    multiline: true,
  },
] as const

export type ProfileTextField = typeof profileFields[number]["key"]
export type ProfileDraft = Record<ProfileTextField, string> & {
  preferred_role_id: string
  available_hours_per_week: string
  skill_ids: string[]
}

export function profileDraft(profile: MyProfileResponse): ProfileDraft {
  const text = Object.fromEntries(
    profileFields.map(({ key }) => [key, profile[key] ?? ""]),
  ) as Record<ProfileTextField, string>
  return {
    ...text,
    preferred_role_id: profile.preferred_role?.professional_role_id ?? "",
    available_hours_per_week: String(profile.available_hours_per_week ?? ""),
    skill_ids: profile.skills.map((skill) => skill.skill_id),
  }
}

export function buildProfilePatch(
  original: MyProfileResponse,
  draft: ProfileDraft,
): ProfilePatch {
  const before = profileDraft(original)
  const patch: ProfilePatch = {}
  for (const { key } of profileFields) {
    const value = nullable(draft[key])
    if (value !== nullable(before[key])) Object.assign(patch, { [key]: value })
  }
  if (draft.preferred_role_id !== before.preferred_role_id)
    patch.preferred_role_id = draft.preferred_role_id
  if (
    Number(draft.available_hours_per_week) !== original.available_hours_per_week
  )
    patch.available_hours_per_week = Number(draft.available_hours_per_week)
  if (
    [...draft.skill_ids].sort().join(",") !==
    [...before.skill_ids].sort().join(",")
  )
    patch.skill_ids = draft.skill_ids
  return patch
}

export function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Your session has expired. Please sign in again."
    if (error.errorCode === "ONBOARDING_REQUIRED")
      return "Complete onboarding before opening profiles."
    if (error.status === 403) return "Your account cannot access this profile."
    if (error.status === 404)
      return "This profile or item is unavailable, or it does not belong to you."
    if (error.status === 400 || error.status === 422)
      return "Check the highlighted fields. The selected role or skills may no longer be available."
    if (error.status === 429)
      return "Too many requests. Please wait and try again."
    return "Tindy could not complete this request. Please try again."
  }
  return "Unable to reach Tindy. Check your connection and try again."
}
