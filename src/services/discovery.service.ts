import { apiRequest } from "./apiClient"
import { isGuid, requireProjectId } from "./projects.service"
import type { DiscoveryCardDto, DiscoveryPage, DiscoveryProject, DiscoveryQuery, RuleMatch, SavedDiscoveryPage } from "../types/discovery"
import type { Project } from "../data"
import { fromApiDifficulty } from "./projects.service"

export function assertRuleMatch(match: RuleMatch): void {
  const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
  const validSkills = (skills: RuleMatch["matched_skills"]) => Array.isArray(skills) && skills.every(skill =>
    isGuid(skill.skill_id) && typeof skill.name === "string" && typeof skill.is_required === "boolean")
  if (!match || match.algorithm_version !== "rule-v1" || !Number.isInteger(match.match_score) || match.match_score < 0 || match.match_score > 100 ||
    !isGuid(match.best_position?.position_id) || !isGuid(match.best_position?.role_id) ||
    !Number.isInteger(match.best_position.remaining_slots) || typeof match.best_position.title !== "string" ||
    !Array.isArray(match.match_factors) || !match.match_factors.every(factor => typeof factor.name === "string" &&
      (factor.factor === null || finite(factor.factor)) && finite(factor.normalized_weight) && finite(factor.contribution)) ||
    !validSkills(match.matched_skills) || !validSkills(match.missing_skills) || typeof match.data_incomplete !== "boolean" || typeof match.explanation !== "string")
    throw new Error("The backend returned an unsupported match response. Refresh the feed or try again later.")
}

export async function getDiscoveryProjects(query: DiscoveryQuery = {}, cursor?: string | null, signal?: AbortSignal): Promise<DiscoveryPage> {
  const params = new URLSearchParams({ limit: "20" })
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  if (cursor) params.set("cursor", cursor)
  const { data } = await apiRequest<DiscoveryPage>(`/api/discovery/projects?${params}`, { signal })
  if (!Array.isArray(data.items) || data.feed_version !== "feed-v1" || typeof data.has_more !== "boolean" || (data.has_more && !data.next_cursor))
    throw new Error("The backend returned an invalid discovery page.")
  for (const card of data.items) { requireProjectId(card.project_id, "Project"); assertRuleMatch(card) }
  return data
}

export function mapDiscoveryCard(card: DiscoveryCardDto): DiscoveryProject {
  const skills = [...card.matched_skills, ...card.missing_skills]
  return {
    id: card.project_id, name: card.name, tagline: card.tagline ?? "", desc: card.description, category: card.category,
    role: card.best_position.title, skills: skills.filter(s => s.is_required).map(s => s.name),
    niceToHave: skills.filter(s => !s.is_required).map(s => s.name), hours: `${card.expected_commitment_hours} hrs/week`,
    duration: card.duration, teamSize: card.current_team_size, maxTeamSize: card.max_team_capacity,
    teamMembers: [], goals: [], techStack: skills.map(s => s.name), leadName: card.leader.display_name,
    leadRole: "Project Leader", leadAvatar: card.leader.avatar_url ?? "", color: "blue", matchAvailable: true,
    ruleMatch: card, closingDate: card.recruitment_closing_date,
    match: { overall: card.match_score, verdict: "Rule-based match", factors: [],
      strongMatches: card.matched_skills.map(s => s.name), skillGaps: card.missing_skills.map(s => ({ skill: s.name, note: s.is_required ? "Required skill not matched" : "Optional skill not matched" })),
      explanationSummary: card.explanation },
  }
}

export function mapDiscoveryToProject(card: DiscoveryCardDto): Project {
  const skills = [...card.matched_skills, ...card.missing_skills]
  return { id: card.project_id, name: card.name, tagline: card.tagline ?? undefined, description: card.description,
    type: card.category, skills: skills.map(s => s.name), requiredSkills: skills.filter(s => s.is_required).map(s => s.name),
    gap: skills.filter(s => !s.is_required).map(s => s.name), role: card.best_position.title, hours: card.expected_commitment_hours,
    duration: card.duration, difficulty: fromApiDifficulty(card.difficulty_level), team: card.current_team_size,
    capacity: card.max_team_capacity, openings: card.best_position.remaining_slots, leader: card.leader.display_name,
    leaderId: card.leader.user_id, initials: card.name.split(" ").slice(0, 2).map(part => part[0]).join(""),
    color: card.color_theme ?? "indigo", created: Date.parse(card.created_at), closing: card.closing_days_left,
    recruitmentClosingDate: card.recruitment_closing_date, recruitmentClosesAt: card.recruitment_closes_at,
    isRecruitmentOpen: card.is_recruitment_open, matchAvailable: true, serverMatch: card, factors: [], goals: [] }
}

export const getSavedProjects = (page = 1, signal?: AbortSignal) => apiRequest<SavedDiscoveryPage>(`/api/me/discovery/saved?page=${page}&page_size=50`, { signal }).then(res => res.data)
export async function getAllSavedProjects(signal?: AbortSignal) {
  const items: SavedDiscoveryPage["items"] = []
  for (let page = 1; ; page++) {
    const response = await getSavedProjects(page, signal)
    if (!Array.isArray(response.items) || response.pagination.current_page !== page) throw Error("Invalid saved projects response.")
    items.push(...response.items)
    if (!response.pagination.has_next) return items
  }
}

export async function setDiscoveryFlag(projectId: string, flag: "saved" | "skipped", value: boolean, signal?: AbortSignal): Promise<void> {
  requireProjectId(projectId, "Project")
  await apiRequest(`/api/me/discovery/${flag}/${encodeURIComponent(projectId)}`, { method: value ? "PUT" : "DELETE", signal })
}
