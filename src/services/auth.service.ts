import { apiRequest, setStoredToken, clearStoredToken } from './apiClient'
import type {
  RegisterRequest,
  AuthSessionData,
  LoginRequest,
  AuthUser,
  OnboardingProgressData,
  OnboardingStep1Request,
  OnboardingStep2Request,
  OnboardingStep3Request,
  OnboardingStep4Request,
  OnboardingStep5Request,
  OnboardingStep6Request,
  OnboardingStep7Request,
  OnboardingStepSavedData,
  OnboardingCompleteRequest,
  OnboardingCompleteData,
} from '../types/auth'

/**
 * Authentication & Onboarding API Services
 * Corresponding exactly to TINDY_FRONTEND_AUTH_ONBOARDING_API.md
 */

// ================= AUTH APIs =================

/**
 * POST /api/auth/register
 * Register a new user account.
 * Response: 201 Created with access_token and user info.
 */
export async function registerApi(data: RegisterRequest) {
  const res = await apiRequest<AuthSessionData>('/api/auth/register', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify(data),
  })
  if (res.data?.access_token) {
    setStoredToken(res.data.access_token)
  }
  return res.data
}

/**
 * POST /api/auth/login
 * Log in via email or username.
 * Response: 200 OK with access_token and user info.
 */
export async function loginApi(data: LoginRequest) {
  const res = await apiRequest<AuthSessionData>('/api/auth/login', {
    method: 'POST',
    requiresAuth: false,
    body: JSON.stringify(data),
  })
  if (res.data?.access_token) {
    setStoredToken(res.data.access_token)
  }
  return res.data
}

/**
 * POST /api/auth/logout
 * Stateless token logout. Always clear client-side token after calling.
 */
export async function logoutApi() {
  try {
    await apiRequest<null>('/api/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    })
  } finally {
    clearStoredToken()
  }
}

/**
 * GET /api/me
 * Retrieve current user session and account information.
 */
export async function getMeApi() {
  const res = await apiRequest<AuthUser>('/api/me', {
    method: 'GET',
    requiresAuth: true,
  })
  return res.data
}

// ================= ONBOARDING APIs =================

/**
 * GET /api/me/onboarding
 * Get saved progress and form draft data for Onboarding steps.
 */
export async function getOnboardingProgressApi() {
  const res = await apiRequest<OnboardingProgressData>('/api/me/onboarding', {
    method: 'GET',
    requiresAuth: true,
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/1
 * Step 1: Username, Display Name, University
 */
export async function saveOnboardingStep1Api(data: OnboardingStep1Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/1', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/2
 * Step 2: Skills list (replaces current list completely)
 */
export async function saveOnboardingStep2Api(data: OnboardingStep2Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/2', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/3
 * Step 3: Preferred Role (1 of 6 allowed values)
 */
export async function saveOnboardingStep3Api(data: OnboardingStep3Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/3', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/4
 * Step 4: Professional Interests & Learning Goals
 */
export async function saveOnboardingStep4Api(data: OnboardingStep4Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/4', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/5
 * Step 5: Available hours per week (1 - 40)
 */
export async function saveOnboardingStep5Api(data: OnboardingStep5Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/5', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/6
 * Step 6: Previous projects & Technologies to learn
 */
export async function saveOnboardingStep6Api(data: OnboardingStep6Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/6', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * PUT /api/me/onboarding/7
 * Step 7: GitHub & Personal Website URLs (URLs can be null but must call PUT)
 */
export async function saveOnboardingStep7Api(data: OnboardingStep7Request) {
  const res = await apiRequest<OnboardingStepSavedData>('/api/me/onboarding/7', {
    method: 'PUT',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}

/**
 * POST /api/me/onboarding/complete
 * Step 8: Confirm completion and optionally provide bio
 */
export async function completeOnboardingApi(data: OnboardingCompleteRequest) {
  const res = await apiRequest<OnboardingCompleteData>('/api/me/onboarding/complete', {
    method: 'POST',
    requiresAuth: true,
    body: JSON.stringify(data),
  })
  return res.data
}
