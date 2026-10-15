/**
 * Type definitions based on TINDY_FRONTEND_AUTH_ONBOARDING_API.md
 * and TINDY_AUTH_ONBOARDING_FLOW.md
 */
import type { CatalogSkill } from './catalog'

// Success Envelope
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

// Error ProblemDetails (ASP.NET Core standard format)
export interface ApiProblemDetails {
  title?: string
  status: number
  detail?: string
  instance?: string
  error_code?: string
  traceId?: string
  errors?: Record<string, string[]>
  missing_steps?: number[]
}

// User Model
export interface AuthUser {
  user_id: string
  display_name: string
  university: string
  email: string
  username: string | null
  status: 'active' | 'suspended' | string
  roles: string[]
  is_onboarding_completed: boolean
}

// Register
export interface RegisterRequest {
  display_name: string
  university: string
  email: string
  password: string
  accept_terms: boolean
}

export interface AuthSessionData {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
  redirect_to: string
}

// Login
export interface LoginRequest {
  identifier: string // email or username
  password: string
}

// Onboarding Step 1..7 Requests
export interface OnboardingStep1Request {
  username: string
  display_name: string
  university: string
}

export interface OnboardingStep2Request {
  skill_ids: string[]
}

export interface OnboardingStep3Request {
  preferred_role_id: string
}

export interface OnboardingStep4Request {
  professional_interests?: string | null
  learning_goals?: string | null
}

export interface OnboardingStep5Request {
  available_hours_per_week: number // 1 - 40
}

export interface OnboardingStep6Request {
  previous_projects_and_contribution?: string | null
  technologies_to_learn?: string | null
}

export interface OnboardingStep7Request {
  github_url: string | null
  personal_website_url: string | null
}

// Step 1..7 Response
export interface OnboardingStepSavedData {
  saved_step: number
  completed_steps: number[]
  next_step: number
  is_onboarding_completed: boolean
}

// Step 8 Complete Request
export interface OnboardingCompleteRequest {
  confirmed: boolean
  bio?: string | null
}

export interface OnboardingCompleteData {
  is_onboarding_completed: boolean
  completed_steps: number[]
  redirect_to: string
}

// GET /api/me/onboarding Progress Data
export interface OnboardingStepDataMap {
  '1': {
    username: string | null
    display_name: string
    university: string
  }
  '2': {
    skill_ids: string[]
    skills: CatalogSkill[]
  }
  '3': {
    preferred_role_id: string | null
    preferred_role: string | null
  }
  '4': {
    professional_interests: string | null
    learning_goals: string | null
  }
  '5': {
    available_hours_per_week: number | null
  }
  '6': {
    previous_projects_and_contribution: string | null
    technologies_to_learn: string | null
  }
  '7': {
    github_url: string | null
    personal_website_url: string | null
  }
  '8': {
    bio: string | null
  }
}

export interface OnboardingProgressData {
  total_steps: number
  completed_steps: number[]
  current_step: number
  is_onboarding_completed: boolean
  step_data?: {
    [Step in keyof OnboardingStepDataMap]?: {
      [Field in keyof OnboardingStepDataMap[Step]]?: OnboardingStepDataMap[Step][Field] | null
    } | null
  } | null
}
