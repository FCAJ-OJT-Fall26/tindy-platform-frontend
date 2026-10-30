export const projectFixtureId = "90000000-0000-4000-8000-000000000001"
const positionId = "90000000-0000-4000-8000-000000000011"
const saved = new Set()
const pagination = { current_page: 1, page_size: 50, total_items: 0, total_pages: 0, has_next: false, has_previous: false }
export function projectApiFixture(pathname, method = "GET") {
  const closingDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const detail = {
    project_id: projectFixtureId, name: "Persisted UI Test Project", tagline: "Browser fixture", description: "A project returned by the contract fixture for UI-only regression tests.",
    category: "Web Application", difficulty_level: "intermediate", status: "recruiting", expected_commitment_hours: 10,
    duration: "3 months", current_team_size: 1, max_team_capacity: 4, color_theme: "indigo", initials: "PT",
    created_at: "2026-10-29T00:00:00Z", closing_days_left: 14, goals: [],
    recruitment_closing_date: closingDate, recruitment_closes_at: closingDate + "T17:00:00Z", is_recruitment_open: true,
    leader: { user_id: "90000000-0000-4000-8000-000000000099", display_name: "Fixture Leader", initials: "FL", avatar_url: null },
    team_members: [], positions: [{ position_id: positionId, project_id: projectFixtureId, role_id: "90000000-0000-4000-8000-000000000021", title: "Developer", description: null, required_count: 1, filled_count: 0, experience_level: "intermediate", status: "open", skills: [] }],
  }
  let data
  if (pathname === "/api/projects") data = { items: [{ ...detail, open_positions: [{ position_id: positionId, title: "Developer", role_name: "Developer", required_count: 1, required_skills: [], nice_to_have_skills: [] }] }], pagination: { current_page: 1, page_size: 10, total_items: 1, total_pages: 1, has_next: false, has_previous: false } }
  if (pathname === "/api/projects/" + projectFixtureId) data = detail
  if (pathname === "/api/me/projects") data = { leading_projects: [], joined_projects: [] }
  if (pathname === "/api/discovery/projects") data = { items: [{ ...detail, match_score: 73, algorithm_version: "rule-v1", best_position: { ...detail.positions[0], role_name: "Developer", remaining_slots: 1 }, match_factors: [], matched_skills: [], missing_skills: [], data_incomplete: true, explanation: "Synthetic contract fixture for save animation checks.", feed_bucket: "best_match", is_saved: saved.has(projectFixtureId) }], next_cursor: null, has_more: false, feed_version: "feed-v1" }
  if (pathname === "/api/me/project-applications") data = { items: [], pagination }
  if (pathname === "/api/me/discovery/saved") data = { items: [...saved].map(project_id => ({ ...detail, project_id, is_skipped: false, updated_at: new Date().toISOString() })), pagination: { ...pagination, total_items: saved.size, total_pages: saved.size ? 1 : 0 } }
  if (pathname.startsWith("/api/me/discovery/saved/")) {
    const id = pathname.split("/").at(-1)
    if (method === "PUT") saved.add(id)
    if (method === "DELETE") saved.delete(id)
    data = { project_id: id, is_saved: saved.has(id) }
  }
  if (pathname.startsWith("/api/me/discovery/skipped/")) data = { project_id: pathname.split("/").at(-1), is_skipped: method === "PUT" }
  return data ? { success: true, message: "OK", data } : null
}
