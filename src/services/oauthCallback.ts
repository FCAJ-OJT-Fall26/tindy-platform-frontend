import type { AuthSessionData, LinkConfirmation } from "../types/auth"

export interface OAuthCallbackAttempt {
  key: string
  flow: "login" | "link"
  ticket: string | null
  error: string | null
  handled: boolean
  loginRequest?: Promise<AuthSessionData>
  linkRequest?: Promise<LinkConfirmation>
}

let captured: OAuthCallbackAttempt | null = null

export function settleOAuthCallback(attempt: OAuthCallbackAttempt): void {
  attempt.handled = true
  attempt.ticket = null
  // A settled Promise can retain its JWT/user result after logout. Keep only the
  // processed marker, including when every subscriber has already unmounted.
  attempt.loginRequest = undefined
  attempt.linkRequest = undefined
}

export function captureOAuthCallback(): OAuthCallbackAttempt | null {
  if (window.location.pathname !== "/auth/oauth/callback") return null
  const key = String(window.history.state?.key ?? "default")
  const { hash, search } = window.location
  if (!hash && !search && captured?.key === key) return captured
  const fragment = new URLSearchParams(hash.slice(1))
  const query = new URLSearchParams(search)
  const loginTicket = fragment.get("ticket")
  const linkTicket = fragment.get("link_ticket")
  const flow =
    linkTicket !== null || query.get("flow") === "link" ? "link" : "login"
  const ticket = flow === "link" ? linkTicket : loginTicket
  const valid = fragment.size === 1 && /^[A-Za-z0-9_-]{43}$/.test(ticket ?? "")
  // Do this before React effects, session restoration, API calls or any banners.
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname,
  )
  captured = {
    key,
    flow,
    ticket: valid && !query.has("error") ? ticket : null,
    error: query.get("error") ?? (valid ? null : "invalid_callback"),
    handled: false,
  }
  return captured
}

export function callbackErrorMessage(
  code: string | null,
  linking: boolean,
): string {
  if (code === "account_link_required")
    return "An existing Tindy account uses this email. Sign in to that account, then connect Google or GitHub in Settings. Accounts are never merged automatically."
  if (code === "account_unavailable")
    return "This Tindy account is unavailable. Please contact support."
  if (code === "access_denied" || code === "oauth_cancelled")
    return "Sign-in was cancelled. You can try again whenever you are ready."
  if (code === "oauth_link_expired")
    return "The connection request expired. Return to Settings and start again."
  return linking
    ? "The account connection could not be completed. Return to Settings and start again."
    : "Sign-in could not be completed. The request may have expired or already been used. Please start again."
}
