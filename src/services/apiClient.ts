import type { ApiProblemDetails, ApiResponse } from "../types/auth"

import { apiUrl } from "./apiConfig"

const TOKEN_KEY = "tindy_access_token"

export const SESSION_EXPIRED_EVENT = "tindy:session-expired"

export const ONBOARDING_REQUIRED_EVENT = "tindy:onboarding-required"

export const SESSION_CHANGED_EVENT = "tindy:session-changed"

let sessionController = new AbortController()

function sessionChanged() {
  sessionController.abort()

  sessionController = new AbortController()

  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
}

export class ApiError extends Error {
  status: number

  problem: ApiProblemDetails

  constructor(status: number, problem: ApiProblemDetails) {
    super(problem.detail || problem.title || `API Error: ${status}`)

    this.name = "ApiError"

    this.status = status

    this.problem = problem
  }

  get errorCode(): string | undefined {
    return this.problem.error_code
  }

  get validationErrors(): Record<string, string[]> | undefined {
    return this.problem.errors
  }

  get missingSteps(): number[] | undefined {
    return this.problem.missing_steps
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null): void {
  const previous = getStoredToken()

  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {}

  if (previous !== getStoredToken()) sessionChanged()
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}

  sessionChanged()
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isEnvelope<T>(value: unknown): value is ApiResponse<T> {
  return (
    isRecord(value) &&
    typeof value.success === "boolean" &&
    typeof value.message === "string" &&
    "data" in value
  )
}

function parseProblem(
  value: unknown,
  status: number,
  title: string,
): ApiProblemDetails {
  if (!isRecord(value)) {
    return {
      status,
      title,
      detail:
        typeof value === "string" ? value : "An unexpected error occurred.",
    }
  }

  const errors: Record<string, string[]> = {}

  if (isRecord(value.errors)) {
    for (const [field, messages] of Object.entries(value.errors)) {
      if (Array.isArray(messages))
        errors[field] = messages.filter(
          (message): message is string => typeof message === "string",
        )
    }
  }

  return {
    status,

    title: typeof value.title === "string" ? value.title : title,

    detail: typeof value.detail === "string" ? value.detail : undefined,

    instance: typeof value.instance === "string" ? value.instance : undefined,

    error_code:
      typeof value.error_code === "string" ? value.error_code : undefined,

    traceId: typeof value.traceId === "string" ? value.traceId : undefined,

    errors: Object.keys(errors).length ? errors : undefined,

    missing_steps: Array.isArray(value.missing_steps)
      ? value.missing_steps.filter(
          (step): step is number => typeof step === "number",
        )
      : undefined,
  }
}

/**
 * Standard fetch wrapper handling:
 * - Content-Type: application/json
 * - Authorization: Bearer <token>
 * - Parsing success envelope { success, message, data }
 * - Parsing ASP.NET Core ProblemDetails error responses
 */

async function request<T>(
  endpoint: string,

  options: RequestOptions,

  binary: boolean,
): Promise<ApiResponse<T> | Blob> {
  // Bearer credentials may only go to a path on the configured backend.

  if (
    !/^\/api\//.test(endpoint) ||
    endpoint.includes("\\") ||
    endpoint.includes("#")
  )
    throw new Error("Invalid API endpoint")

  const { requiresAuth = true, headers: customHeaders, ...rest } = options

  const headers = new Headers(customHeaders || {})

  if (!headers.has("Content-Type") && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const requestToken = requiresAuth ? getStoredToken() : null

  if (requiresAuth) {
    if (requestToken) {
      headers.set("Authorization", `Bearer ${requestToken}`)
    }
  }

  const sessionSignal = sessionController.signal

  const timeout = AbortSignal.timeout(15_000)

  const response = await fetch(apiUrl(endpoint), {
    credentials: "omit",

    cache: "no-store",

    referrerPolicy: "no-referrer",

    ...rest,

    headers,

    redirect: "error",

    signal: AbortSignal.any([
      timeout,
      ...(requiresAuth ? [sessionSignal] : []),
      ...(rest.signal ? [rest.signal] : []),
    ]),
  })

  const assertSession = () => {
    if (
      requiresAuth &&
      (sessionSignal.aborted || getStoredToken() !== requestToken)
    )
      throw new DOMException("Session changed", "AbortError")
  }

  assertSession()

  if (binary && response.ok) {
    const blob = await response.blob()

    assertSession()

    return blob
  }

  // Handle empty or 204 response

  if (response.status === 204) {
    return { success: true, message: "No content", data: null as unknown as T }
  }

  const contentType = response.headers.get("content-type") || ""

  const isJson =
    contentType.includes("application/json") ||
    contentType.includes("problem+json")

  let responseData: unknown = null

  if (isJson) {
    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }
  } else {
    responseData = await response.text()
  }

  assertSession()

  if (!response.ok) {
    // Backend returns ProblemDetails

    const problem = parseProblem(
      responseData,
      response.status,
      response.statusText,
    )

    // An invalid link ticket is not an invalid JWT. Do not end a valid session.

    // A stale request must also never clear a newer account's token.

    if (
      requiresAuth &&
      requestToken &&
      getStoredToken() === requestToken &&
      ((response.status === 401 &&
        problem.error_code !== "AUTH_INVALID_CREDENTIALS") ||
        (response.status === 403 && problem.error_code === "AUTH_FORBIDDEN"))
    ) {
      clearStoredToken()

      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }

    if (
      requiresAuth &&
      response.status === 403 &&
      problem.error_code === "ONBOARDING_REQUIRED" &&
      getStoredToken() === requestToken
    ) {
      window.dispatchEvent(new Event(ONBOARDING_REQUIRED_EVENT))
    }

    throw new ApiError(response.status, problem)
  }

  // A failed or malformed envelope must not advance onboarding as a success.

  if (!isEnvelope<T>(responseData)) {
    throw new ApiError(response.status, {
      status: response.status,
      title: "Invalid server response. Please try again.",
    })
  }

  if (!responseData.success) {
    throw new ApiError(response.status, {
      ...parseProblem(responseData, response.status, "Request failed"),
      detail: responseData.message,
    })
  }

  return responseData
}

export function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, options, false) as Promise<ApiResponse<T>>
}

export function apiBlobRequest(
  endpoint: string,
  options: RequestOptions = {},
): Promise<Blob> {
  return request(endpoint, options, true) as Promise<Blob>
}
