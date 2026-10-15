export interface SkillCategory {
  category_id: string
  name: string
  description: string | null
  display_order: number
}

export interface CatalogSkill {
  skill_id: string
  name: string
}

export interface ProfessionalRole {
  professional_role_id: string
  name: string
  description: string | null
  display_order: number
}

// A saved ID may no longer have a display name in the active catalog.
export interface SelectedSkill {
  skill_id: string
  name: string | null
}
