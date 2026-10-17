import { apiRequest } from "./apiClient"
import type {
  CatalogSkill,
  ProfessionalRole,
  SkillCategory,
} from "../types/catalog"

let cachedCategories: SkillCategory[] | null = null
let cachedSkills: CatalogSkill[] | null = null
let cachedRoles: ProfessionalRole[] | null = null

let categoriesPromise: Promise<SkillCategory[]> | null = null
let skillsPromise: Promise<CatalogSkill[]> | null = null
let rolesPromise: Promise<ProfessionalRole[]> | null = null

export function getCachedCategories(): SkillCategory[] | null {
  return cachedCategories
}

export function getCachedSkills(): CatalogSkill[] | null {
  return cachedSkills
}

export function getCachedRoles(): ProfessionalRole[] | null {
  return cachedRoles
}

export function clearCatalogCache(): void {
  cachedCategories = null
  cachedSkills = null
  cachedRoles = null
  categoriesPromise = null
  skillsPromise = null
  rolesPromise = null
}

export async function prefetchOnboardingCatalog(): Promise<void> {
  const p1 = getSkillCategoriesApi().catch(() => null)
  const p2 = getSkillsApi().catch(() => null)
  const p3 = getProfessionalRolesApi().catch(() => null)
  await Promise.allSettled([p1, p2, p3])
}

export async function getSkillCategoriesApi(
  signal?: AbortSignal,
  forceRefresh = false,
) {
  if (!forceRefresh && !signal && cachedCategories) {
    return cachedCategories
  }
  if (!forceRefresh && !signal && categoriesPromise) {
    return categoriesPromise
  }

  const promise = apiRequest<SkillCategory[]>(
    "/api/catalog/skill-categories",
    { signal },
  )
    .then((res) => {
      cachedCategories = res.data
      categoriesPromise = null
      return res.data
    })
    .catch((err) => {
      categoriesPromise = null
      throw err
    })

  if (!signal) {
    categoriesPromise = promise
  }

  return promise
}

export async function getSkillsApi(
  categoryId?: string,
  search?: string,
  signal?: AbortSignal,
  forceRefresh = false,
) {
  const isBaseCatalog = !categoryId && !search?.trim()
  if (isBaseCatalog && !forceRefresh && !signal && cachedSkills) {
    return cachedSkills
  }
  if (isBaseCatalog && !forceRefresh && !signal && skillsPromise) {
    return skillsPromise
  }

  const query = new URLSearchParams()
  if (categoryId) query.set("category_id", categoryId)
  if (search?.trim()) query.set("search", search.trim().slice(0, 100))

  const promise = apiRequest<CatalogSkill[]>(
    `/api/catalog/skills${query.size ? `?${query}` : ""}`,
    { signal },
  )
    .then((res) => {
      if (isBaseCatalog) {
        cachedSkills = res.data
        skillsPromise = null
      }
      return res.data
    })
    .catch((err) => {
      if (isBaseCatalog) {
        skillsPromise = null
      }
      throw err
    })

  if (isBaseCatalog && !signal) {
    skillsPromise = promise
  }

  return promise
}

export async function getProfessionalRolesApi(
  search?: string,
  signal?: AbortSignal,
  forceRefresh = false,
) {
  const isBaseRoles = !search?.trim()
  if (isBaseRoles && !forceRefresh && !signal && cachedRoles) {
    return cachedRoles
  }
  if (isBaseRoles && !forceRefresh && !signal && rolesPromise) {
    return rolesPromise
  }

  const query = new URLSearchParams()
  if (search?.trim()) query.set("search", search.trim())

  const promise = apiRequest<ProfessionalRole[]>(
    `/api/catalog/professional-roles${query.size ? `?${query}` : ""}`,
    { signal },
  )
    .then((res) => {
      if (isBaseRoles) {
        cachedRoles = res.data
        rolesPromise = null
      }
      return res.data
    })
    .catch((err) => {
      if (isBaseRoles) {
        rolesPromise = null
      }
      throw err
    })

  if (isBaseRoles && !signal) {
    rolesPromise = promise
  }

  return promise
}
