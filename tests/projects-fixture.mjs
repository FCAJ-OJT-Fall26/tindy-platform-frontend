export const projectFixtureId = "90000000-0000-4000-8000-000000000001"
const positionId = "90000000-0000-4000-8000-000000000011"
export function projectApiFixture(pathname) {
  const detail = {
    project_id: projectFixtureId, name: "Persisted UI Test Project", tagline: "Browser fixture", description: "A project returned by the contract fixture for UI-only regression tests.",
    category: "Web Application", difficulty_level: "intermediate", status: "recruiting", expected_commitment_hours: 10,
    duration: "3 months", current_team_size: 1, max_team_capacity: 4, color_theme: "indigo", initials: "PT",
    created_at: "2026-10-29T00:00:00Z", closing_days_left: 14, goals: [],
    leader: { user_id: "90000000-0000-4000-8000-000000000099", display_name: "Fixture Leader", initials: "FL", avatar_url: null },
    team_members: [], positions: [{ position_id: positionId, project_id: projectFixtureId, role_id: "90000000-0000-4000-8000-000000000021", title: "Developer", description: null, required_count: 1, filled_count: 0, experience_level: "intermediate", status: "open", skills: [] }],
  }
  let data
  if (pathname === "/api/projects") data = { items: [{ ...detail, open_positions: [{ position_id: positionId, title: "Developer", role_name: "Developer", required_count: 1, required_skills: [], nice_to_have_skills: [] }] }], pagination: { current_page: 1, page_size: 10, total_items: 1, total_pages: 1, has_next: false, has_previous: false } }
  if (pathname === "/api/projects/" + projectFixtureId) data = detail
  if (pathname === "/api/me/projects") data = { leading_projects: [], joined_projects: [] }
  return data ? { success: true, message: "OK", data } : null
}
