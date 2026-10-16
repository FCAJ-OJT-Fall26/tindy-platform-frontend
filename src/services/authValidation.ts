import type { AuthSessionData, AuthUser } from "../types/auth"
import { ApiError } from "./apiClient"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

export function invalidAuthResponse(): ApiError {
  return new ApiError(200, {
    status: 200,
    error_code: "INVALID_AUTH_RESPONSE",
    title:
      "The server returned an unexpected authentication response. Please try again.",
  })
}

export function readAuthUser(value: unknown): AuthUser {
  if (
    !isRecord(value) ||
    typeof value.user_id !== "string" ||
    !value.user_id ||
    typeof value.display_name !== "string" ||
    !nullableString(value.email) ||
    !nullableString(value.university) ||
    !nullableString(value.username) ||
    value.status !== "active" ||
    typeof value.is_onboarding_completed !== "boolean" ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === "string")
  ) {
    throw invalidAuthResponse()
  }
  return value as unknown as AuthUser
}

export function readAuthSession(value: unknown): AuthSessionData {
  if (
    !isRecord(value) ||
    typeof value.access_token !== "string" ||
    !value.access_token.trim() ||
    value.token_type !== "Bearer" ||
    typeof value.expires_in !== "number" ||
    !Number.isFinite(value.expires_in) ||
    value.expires_in <= 0
  )
    throw invalidAuthResponse()
  const user = readAuthUser(value.user)
  const destination = user.is_onboarding_completed ? "/discover" : "/onboarding"
  if (value.redirect_to !== destination) throw invalidAuthResponse()
  return {
    access_token: value.access_token,
    token_type: "Bearer",
    expires_in: value.expires_in,
    user,
    redirect_to: destination,
  }
}

// Never render arbitrary provider/backend exception text in an auth banner.
export function authErrorMessage(error: unknown, linking = false): string {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return "Too many attempts. Please wait a minute and try again."
    if (error.status === 503)
      return "Sign-in is temporarily unavailable. Please try again later."
    if (error.status === 401)
      return linking
        ? "The connection request expired or could not be confirmed. Sign in to the original Tindy account and start again."
        : "Sign-in expired or could not be verified. Please start again."
    if (error.status === 403)
      return "This account cannot access this service. Please sign in again or contact support."
    if (error.status === 409)
      return linking
        ? "This identity is already connected to a Tindy account, or the connection changed. Reload your connections and try again."
        : "An existing Tindy account uses this email. Sign in to it, then connect the provider in Settings."
    if (error.status === 400 || error.status === 422)
      return "The request is invalid or has expired. Please start again."
    if (error.status >= 500)
      return "The server is unavailable. Please try again later."
    return "The server returned an unexpected response. Please try again."
  }
  return "Unable to reach Tindy. Check your connection, browser access to the HTTPS API, and try again."
}
