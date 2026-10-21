import type { CatalogSkill } from "./catalog"

export interface MemberProfileResponse {
  user_id: string
  username: string | null
  display_name: string
  university: string | null
  headline: string | null
  bio: string | null
  location: string | null
  current_role: string | null
  preferred_role: {
    professional_role_id: string
    name: string
  } | null
  available_hours_per_week: number | null
  professional_interests: string | null
  learning_goals: string | null
  previous_projects_and_contribution: string | null
  technologies_to_learn: string | null
  github_url: string | null
  linkedin_url: string | null
  personal_website_url: string | null
  public_email: string | null
  avatar_url: string | null
  cover_image_url: string | null
  skills: CatalogSkill[]
  experiences_count: number
  certificates_count: number
}

export interface MyProfileResponse extends MemberProfileResponse {
  phone_number: string | null
  resume_url: string | null
}

export interface ProfilePatch {
  display_name?: string
  university?: string
  phone_number?: string | null
  headline?: string | null
  bio?: string | null
  location?: string | null
  current_role?: string | null
  preferred_role_id?: string
  available_hours_per_week?: number
  professional_interests?: string | null
  learning_goals?: string | null
  previous_projects_and_contribution?: string | null
  technologies_to_learn?: string | null
  github_url?: string | null
  linkedin_url?: string | null
  personal_website_url?: string | null
  resume_url?: string | null
  public_email?: string | null
  skill_ids?: string[]
}

export interface ExperienceUpsert {
  project_name: string
  role_title: string
  description: string
  repo_url: string | null
  start_date: string | null
  end_date: string | null
  is_ongoing: boolean
  skill_ids: string[]
}

export interface ExperienceResponse
  extends Omit<ExperienceUpsert, "skill_ids"> {
  experience_id: string
  technologies: CatalogSkill[]
  created_at: string
  updated_at: string | null
}

export interface CertificateUpsert {
  title: string
  issuer: string
  credential_id: string | null
  credential_url: string | null
  issued_at: string | null
  expires_at: string | null
}

export interface CertificateResponse extends CertificateUpsert {
  certificate_id: string
  created_at: string
  updated_at: string | null
}
