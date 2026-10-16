import type {
  AccountConnections,
  OAuthProvider,
  LinkConfirmation,
} from "../types/auth"
import { apiRequest } from "./apiClient"
import { apiOrigin, apiUrl } from "./apiConfig"
import {
  invalidAuthResponse,
  isRecord,
  readAuthSession,
} from "./authValidation"

const LINK_CONTEXT_KEY = "tindy_oauth_link_context"

export function startOAuthLogin(provider: OAuthProvider): void {
  window.location.assign(apiUrl(`/api/auth/${provider}`))
}

export async function exchangeOAuthTicketApi(ticket: string) {
  const response = await apiRequest<unknown>("/api/auth/oauth/exchange", {
    method: "POST",
    requiresAuth: false,
    body: JSON.stringify({ ticket }),
  })
  // The mounted callback commits this validated session, never an abandoned request.
  return readAuthSession(response.data)
}

export async function getAccountConnectionsApi(
  signal?: AbortSignal,
): Promise<AccountConnections> {
  const response = await apiRequest<unknown>("/api/auth/connections", {
    signal,
  })
  const data = response.data
  if (
    !isRecord(data) ||
    typeof data.has_local_password !== "boolean" ||
    !Array.isArray(data.providers) ||
    !data.providers.every(
      (provider) =>
        isRecord(provider) &&
        (provider.provider === "Google" || provider.provider === "GitHub") &&
        (provider.provider_username === null ||
          typeof provider.provider_username === "string") &&
        typeof provider.linked_at === "string",
    )
  )
    throw invalidAuthResponse()
  return data as unknown as AccountConnections
}

export async function startAccountConnectionApi(
  provider: OAuthProvider,
): Promise<string> {
  const response = await apiRequest<unknown>(
    `/api/auth/connections/${provider}/start`,
    { method: "POST" },
  )
  if (
    !isRecord(response.data) ||
    typeof response.data.authorization_url !== "string"
  )
    throw invalidAuthResponse()
  let url: URL
  try {
    url = new URL(response.data.authorization_url)
  } catch {
    throw invalidAuthResponse()
  }
  if (
    url.origin !== apiOrigin() ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== `/api/auth/connections/${provider}/challenge` ||
    [...url.searchParams.keys()].length !== 1 ||
    !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get("request") ?? "")
  ) {
    throw invalidAuthResponse()
  }
  return url.href
}

export function rememberLinkUser(userId: string): void {
  // Only the initiating UserId/time is stored: no JWT, start token or ticket.
  sessionStorage.setItem(
    LINK_CONTEXT_KEY,
    JSON.stringify({ userId, startedAt: Date.now() }),
  )
}

export function readLinkUser(): string | null {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(LINK_CONTEXT_KEY) ?? "null",
    )
    return isRecord(value) &&
      typeof value.userId === "string" &&
      typeof value.startedAt === "number" &&
      Date.now() - value.startedAt >= 0 &&
      Date.now() - value.startedAt <= 390_000
      ? value.userId
      : null
  } catch {
    return null
  }
}

export function clearLinkUser(): void {
  try {
    sessionStorage.removeItem(LINK_CONTEXT_KEY)
  } catch {
    /* Storage may be disabled. */
  }
}

export async function confirmAccountConnectionApi(
  linkTicket: string,
): Promise<LinkConfirmation> {
  const response = await apiRequest<unknown>("/api/auth/connections/confirm", {
    method: "POST",
    body: JSON.stringify({ link_ticket: linkTicket }),
  })
  if (
    !isRecord(response.data) ||
    response.data.linked !== true ||
    typeof response.data.created !== "boolean"
  ) {
    throw invalidAuthResponse()
  }
  return { linked: true, created: response.data.created }
}

export async function disconnectAccountApi(
  provider: OAuthProvider,
): Promise<void> {
  await apiRequest<null>(`/api/auth/connections/${provider}`, {
    method: "DELETE",
  })
}
