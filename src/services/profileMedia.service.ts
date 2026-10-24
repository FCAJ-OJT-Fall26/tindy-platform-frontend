import {
  ApiError,
  apiBlobRequest,
  apiRequest,
  getStoredToken,
} from "./apiClient"
import type { OAuthProvider } from "../types/auth"
import type {
  AttachmentVisibility,
  CertificateAttachment,
  MediaQuota,
  ProfileMediaState,
} from "../types/profile"

const owner = "/api/me/profile"
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const formatMB = (bytes: number) =>
  `${(bytes / 1_000_000).toLocaleString("en", { maximumFractionDigits: 2 })} MB`
export function validateMediaFile(
  file: File,
  max: number,
  pdf = false,
): string | null {
  if (file.size === 0) return "Choose a non-empty file."
  if (file.size > max) return `File must be ${formatMB(max)} or smaller.`
  if (
    ![...IMAGE_TYPES, ...(pdf ? ["application/pdf"] : [])].includes(file.type)
  )
    return pdf
      ? "Choose a JPEG, PNG, WebP image or PDF."
      : "Choose a JPEG, PNG or WebP image."
  return null
}
export function mediaErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (error instanceof ApiError) {
    if (error.errorCode === "MEDIA_ATTACHMENT_LIMIT")
      return "This certificate already has a file. Delete the existing attachment before uploading another."
    const messages: Record<number, string> = {
      400: "Check the file and selected options, then try again.",
      401: "Your session has expired. Please sign in again.",
      403: "This action is unavailable for your account. Complete onboarding or sign in again if needed.",
      404: "This media is unavailable. Refresh and try again.",
      409: "The media changed or a limit was reached. Refresh and check your quota, attachment count or selected provider.",
      413: "The file is too large for this upload.",
      415: "This file format is unsupported. Choose JPEG, PNG, WebP or a supported PDF.",
      429: "Too many requests. Wait before trying again.",
    }
    return (
      messages[error.status] ??
      "Media could not be updated. Please try again later."
    )
  }
  if (error instanceof DOMException && error.name === "AbortError")
    return "Request cancelled. Refresh to check the latest media state."
  return "Could not reach the media service or the request timed out. Check your connection and try again."
}

// Shared across all media controls: at most two HTTP uploads for this session.
const uploads = new Map<string, number>()
async function upload<T>(
  path: string,
  file: File,
  signal?: AbortSignal,
): Promise<T> {
  const session = getStoredToken() ?? ""
  const count = uploads.get(session) ?? 0
  if (count >= 2)
    throw new ApiError(429, {
      status: 429,
      error_code: "MEDIA_CONCURRENT_LIMIT",
    })
  uploads.set(session, count + 1)
  const body = new FormData()
  body.append("file", file)
  try {
    return (await apiRequest<T>(path, { method: "POST", body, signal })).data
  } finally {
    const remaining = (uploads.get(session) ?? 1) - 1
    if (remaining) uploads.set(session, remaining)
    else uploads.delete(session)
  }
}
export const uploadProfileImage = (
  kind: "avatar" | "cover-image",
  file: File,
  signal?: AbortSignal,
) => upload<ProfileMediaState>(`${owner}/${kind}`, file, signal)
export const removeProfileImage = (
  kind: "avatar" | "cover-image",
  signal?: AbortSignal,
) => apiRequest<void>(`${owner}/${kind}`, { method: "DELETE", signal })
export const selectAvatarSource = (
  provider?: OAuthProvider,
  signal?: AbortSignal,
) =>
  apiRequest<ProfileMediaState>(`${owner}/avatar/source`, {
    method: "PUT",
    signal,
    body: JSON.stringify(
      provider ? { source: "oauth", provider } : { source: "default" },
    ),
  }).then((res) => res.data)
const attachmentsPath = (certificateId: string, userId?: string) =>
  `${
    userId ? `/api/users/${encodeURIComponent(userId)}/profile` : owner
  }/certificates/${encodeURIComponent(certificateId)}/attachments`
export const getAttachments = (
  certificateId: string,
  userId?: string,
  signal?: AbortSignal,
) =>
  apiRequest<CertificateAttachment[]>(attachmentsPath(certificateId, userId), {
    signal,
  }).then((res) => res.data)
export const uploadAttachment = (
  certificateId: string,
  file: File,
  signal?: AbortSignal,
) => upload<CertificateAttachment>(attachmentsPath(certificateId), file, signal)
export const changeAttachmentVisibility = (
  certificateId: string,
  id: string,
  visibility: AttachmentVisibility,
  signal?: AbortSignal,
) =>
  apiRequest<CertificateAttachment>(
    `${attachmentsPath(certificateId)}/${encodeURIComponent(id)}/visibility`,
    {
      method: "PATCH",
      signal,
      body: JSON.stringify({ visibility }),
    },
  ).then((res) => res.data)
export const deleteAttachment = (
  certificateId: string,
  id: string,
  signal?: AbortSignal,
) =>
  apiRequest<void>(
    `${attachmentsPath(certificateId)}/${encodeURIComponent(id)}`,
    { method: "DELETE", signal },
  )
export const getMediaQuota = (signal?: AbortSignal) =>
  apiRequest<MediaQuota>(`${owner}/media/quota`, { signal }).then(
    (res) => res.data,
  )
export const getMediaContent = (id: string, signal?: AbortSignal) =>
  apiBlobRequest(`/api/media/${encodeURIComponent(id)}/content`, { signal })
