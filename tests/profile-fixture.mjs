// Profile DTO for existing UI-only regression suites after API integration.
export function makeProfileFixture(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    display_name: user.display_name,
    university: user.university,
    headline: null,
    bio: null,
    location: null,
    current_role: null,
    preferred_role: { professional_role_id: "22222222-2222-4222-8222-222222222222", name: "Developer" },
    available_hours_per_week: 10,
    professional_interests: null,
    learning_goals: null,
    previous_projects_and_contribution: null,
    technologies_to_learn: null,
    github_url: null,
    linkedin_url: null,
    personal_website_url: null,
    public_email: null,
    avatar_url: null,
    cover_image_url: null,
    avatar_source: "default",
    avatar_media_asset_id: null,
    cover_media_asset_id: null,
    phone_number: null,
    resume_url: null,
    skills: [{ skill_id: "33333333-3333-4333-8333-333333333333", name: "React" }],
    experiences_count: 0,
    certificates_count: 0,
  }
}

export async function waitForBrowser(evaluate, predicate) {
  for (let attempt = 0; attempt < 160; attempt++) {
    if (await evaluate(predicate)) return
    await new Promise(resolve => setTimeout(resolve, 75))
  }
  throw new Error(`Browser condition timed out: ${predicate}`)
}
