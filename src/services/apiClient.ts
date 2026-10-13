import type { ApiProblemDetails } from '../types/auth'

const TOKEN_KEY = 'tindy_access_token'

export class ApiError extends Error {
  status: number
  problem: ApiProblemDetails

  constructor(status: number, problem: ApiProblemDetails) {
    super(problem.detail || problem.title || `API Error: ${status}`)
    this.name = 'ApiError'
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
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean
}

/**
 * Standard fetch wrapper handling:
 * - Content-Type: application/json
 * - Authorization: Bearer <token>
 * - Parsing success envelope { success, message, data }
 * - Parsing ASP.NET Core ProblemDetails error responses
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; message: string; data: T }> {
  const { requiresAuth = true, headers: customHeaders, ...rest } = options

  const headers = new Headers(customHeaders || {})

  if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (requiresAuth) {
    const token = getStoredToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...rest,
    headers,
  })

  // Handle empty or 204 response
  if (response.status === 204) {
    return { success: true, message: 'No content', data: null as unknown as T }
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json') || contentType.includes('problem+json')

  let responseData: any = null
  if (isJson) {
    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }
  } else {
    responseData = await response.text()
  }

  if (!response.ok) {
    // Backend returns ProblemDetails
    const problem: ApiProblemDetails = typeof responseData === 'object' && responseData !== null
      ? responseData
      : {
          status: response.status,
          title: response.statusText,
          detail: typeof responseData === 'string' ? responseData : 'An unexpected error occurred.',
        }

    // Auto-clean token on 401 AUTH_UNAUTHORIZED
    if (response.status === 401 && requiresAuth) {
      clearStoredToken()
    }

    throw new ApiError(response.status, problem)
  }

  // Response matches { success: boolean, message: string, data: T }
  return responseData
}
