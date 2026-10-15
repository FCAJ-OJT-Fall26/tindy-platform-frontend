import { apiRequest } from "./apiClient"
import type {
  CatalogSkill,
  ProfessionalRole,
  SkillCategory,
} from "../types/catalog"

export async function getSkillCategoriesApi(signal?: AbortSignal) {
  const res = await apiRequest<SkillCategory[]>(
    "/api/catalog/skill-categories",
    { signal },
  )
  return res.data
}

export async function getSkillsApi(
  categoryId?: string,
  search?: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams()
  if (categoryId) query.set("category_id", categoryId)
  if (search?.trim()) query.set("search", search.trim().slice(0, 100))
  const res = await apiRequest<CatalogSkill[]>(
    `/api/catalog/skills${query.size ? `?${query}` : ""}`,
    { signal },
  )
  return res.data
}

export async function getProfessionalRolesApi(
  search?: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams()
  if (search?.trim()) query.set("search", search.trim())
  const res = await apiRequest<ProfessionalRole[]>(
    `/api/catalog/professional-roles${query.size ? `?${query}` : ""}`,
    { signal },
  )
  return res.data
}
