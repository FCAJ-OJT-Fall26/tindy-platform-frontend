// Stateful local test double, derived from docs/api/PROFILE_API.md and
// PROFILE_OPENAPI.yaml in the sibling backend repo. Synthetic data only.
// Test controls under /__test are fixture-only, never frontend endpoints.
const http = require("node:http")
const { randomUUID } = require("node:crypto")
const userId = "11111111-1111-4111-8111-111111111111"
const memberId = "44444444-4444-4444-8444-444444444444"
const skills = [
  { skill_id: "33333333-3333-4333-8333-333333333333", name: ".NET" },
  { skill_id: "33333333-3333-4333-8333-333333333334", name: "React" },
]
const role = {
  professional_role_id: "22222222-2222-4222-8222-222222222222",
  name: "Backend Developer",
}
const seed = () => ({
  me: {
    user_id: userId,
    display_name: "Old Account Name",
    university: "Old Account University",
    email: "private-login@example.test",
    username: "profile_member",
    status: "active",
    roles: ["member"],
    is_onboarding_completed: true,
  },
  profile: {
    user_id: userId,
    username: "profile_member",
    display_name: "Profile Student",
    university: "FPT University",
    phone_number: "private-phone-123",
    headline: "Backend Developer",
    bio: "Server profile introduction",
    location: "Ho Chi Minh City",
    current_role: "Student",
    preferred_role: role,
    available_hours_per_week: 10,
    professional_interests: "Cloud",
    learning_goals: "Original learning goal",
    previous_projects_and_contribution: "Summary only; never a collection item",
    technologies_to_learn: null,
    github_url: "https://github.com/example",
    linkedin_url: null,
    personal_website_url: null,
    resume_url: "https://example.test/private-resume",
    public_email: "public-contact@example.test",
    avatar_url: "https://example.invalid/avatar.png",
    cover_image_url: null,
    skills: [skills[0]],
    experiences_count: 0,
    certificates_count: 0,
  },
  experiences: [],
  certificates: [],
  faults: {},
})
const stateKey = "tindy-profile-v1:state"
const validIds = (ids) =>
  Array.isArray(ids) &&
  new Set(ids).size === ids.length &&
  ids.every((id) => skills.some((skill) => skill.skill_id === id))
const send = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type":
      status >= 400 ? "application/problem+json" : "application/json",
  })
  res.end(status === 204 ? undefined : JSON.stringify(data))
}
const envelope = (data) => ({
  success: true,
  message: "Profile V1 fixture response",
  data,
})
const problem = (status, error_code, field) => ({
  status,
  title: "Request failed",
  error_code,
  detail: "private-stack-trace-canary",
  ...(field ? { errors: { [field]: ["Invalid fixture input"] } } : {}),
})

http
  .createServer(async (req, res) => {
    const path = new URL(req.url, "http://fixture.invalid").pathname
    const state = (await pm.state.get(stateKey)) || seed()
    const body = req.body || {}
    const save = () => pm.state.set(stateKey, state)
    if (path === "/__test/reset") {
      await pm.state.set(stateKey, seed())
      return send(res, 200, envelope(true))
    }
    if (path === "/__test/state") return send(res, 200, envelope(state))
    if (path === "/__test/control") {
      Object.assign(state, body)
      await save()
      return send(res, 200, envelope(true))
    }
    if (req.headers.authorization !== "Bearer synthetic-profile-token")
      return send(res, 401, problem(401, "AUTH_UNAUTHORIZED"))
    if (path === "/api/me") return send(res, 200, envelope(state.me))
    if (path === "/api/me/connections")
      return send(
        res,
        200,
        envelope({ has_local_password: true, providers: [] }),
      )
    const fault = state.faults[`${req.method} ${path}`]
    if (fault?.delay)
      await new Promise((resolve) => setTimeout(resolve, fault.delay))
    if (fault?.disconnect) return req.socket.destroy()
    if (fault?.status)
      return send(
        res,
        fault.status,
        problem(fault.status, fault.code || "VALIDATION_FAILED", fault.field),
      )
    if (path === "/api/catalog/skills") return send(res, 200, envelope(skills))
    if (path === "/api/catalog/professional-roles")
      return send(
        res,
        200,
        envelope([{ ...role, description: null, display_order: 1 }]),
      )
    const owner =
      path === "/api/me/profile" || path.startsWith("/api/me/profile/")
    const member = path.match(/^\/api\/users\/([^/]+)\/profile(.*)$/)
    if (member && ![memberId, userId].includes(member[1]))
      return send(res, 404, problem(404, "NOT_FOUND"))
    if (!owner && !member)
      return send(res, 501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
    if (member && req.method !== "GET")
      return send(res, 501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
    const suffix = owner ? path.slice("/api/me/profile".length) : member[2]
    if (!suffix && req.method === "GET") {
      const profile = {
        ...state.profile,
        experiences_count: state.experiences.length,
        certificates_count: state.certificates.length,
      }
      if (member) {
        delete profile.phone_number
        delete profile.resume_url
        profile.user_id = member[1]
        if (member[1] === memberId) profile.display_name = "Another Member"
      }
      return send(res, 200, envelope(profile))
    }
    if (!suffix && owner && req.method === "PATCH") {
      const allowed = [
        "display_name",
        "university",
        "phone_number",
        "headline",
        "bio",
        "location",
        "current_role",
        "preferred_role_id",
        "available_hours_per_week",
        "professional_interests",
        "learning_goals",
        "previous_projects_and_contribution",
        "technologies_to_learn",
        "github_url",
        "linkedin_url",
        "personal_website_url",
        "resume_url",
        "public_email",
        "skill_ids",
      ]
      if (
        !Object.keys(body).length ||
        Object.keys(body).some((key) => !allowed.includes(key))
      )
        return send(res, 400, problem(400, "VALIDATION_FAILED"))
      if (
        "skill_ids" in body &&
        (!validIds(body.skill_ids) ||
          body.skill_ids.length < 1 ||
          body.skill_ids.length > 30)
      )
        return send(
          res,
          422,
          problem(422, "BUSINESS_RULE_VIOLATION", "skill_ids"),
        )
      if (
        "preferred_role_id" in body &&
        body.preferred_role_id !== role.professional_role_id
      )
        return send(
          res,
          422,
          problem(422, "BUSINESS_RULE_VIOLATION", "preferred_role_id"),
        )
      for (const [key, value] of Object.entries(body)) {
        if (key === "skill_ids")
          state.profile.skills = skills.filter((skill) =>
            value.includes(skill.skill_id),
          )
        else if (key === "preferred_role_id")
          state.profile.preferred_role = role
        else
          state.profile[key] =
            typeof value === "string" ? value.trim() || null : value
      }
      // A server-normalized value makes the response-as-source-of-truth assertion meaningful.
      if (body.display_name)
        state.profile.display_name = body.display_name
          .trim()
          .replace(/\s+/g, " ")
      await save()
      return send(res, 200, envelope(state.profile))
    }
    const collection = suffix.match(
      /^\/(experiences|certificates)(?:\/([^/]+))?$/,
    )
    if (!collection)
      return send(res, 501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
    const [, kind, id] = collection
    const idKey = kind === "experiences" ? "experience_id" : "certificate_id"
    if (!id && req.method === "GET")
      return send(res, 200, envelope(state[kind]))
    const index = id ? state[kind].findIndex((item) => item[idKey] === id) : -1
    if (id && ["PUT", "DELETE"].includes(req.method) && index < 0)
      return send(res, 404, problem(404, "NOT_FOUND"))
    if (id && req.method === "DELETE") {
      state[kind].splice(index, 1)
      await save()
      return send(res, 204)
    }
    if ((req.method === "POST" && !id) || (req.method === "PUT" && id)) {
      const allowed =
        kind === "experiences"
          ? [
              "project_name",
              "role_title",
              "description",
              "repo_url",
              "start_date",
              "end_date",
              "is_ongoing",
              "skill_ids",
            ]
          : [
              "title",
              "issuer",
              "credential_id",
              "credential_url",
              "issued_at",
              "expires_at",
            ]
      if (
        Object.keys(body).some((key) => !allowed.includes(key)) ||
        allowed.some((key) => !(key in body))
      )
        return send(res, 400, problem(400, "VALIDATION_FAILED"))
      if (
        kind === "experiences" &&
        (typeof body.is_ongoing !== "boolean" ||
          !validIds(body.skill_ids) ||
          body.skill_ids.length > 20 ||
          (body.is_ongoing && body.end_date !== null))
      )
        return send(res, 400, problem(400, "VALIDATION_FAILED"))
      const item = {
        ...body,
        [idKey]: id || randomUUID(),
        created_at:
          index < 0 ? "2026-10-20T00:00:00Z" : state[kind][index].created_at,
        updated_at: index < 0 ? null : "2026-10-20T01:00:00Z",
      }
      if (kind === "experiences") {
        item.technologies = skills.filter((skill) =>
          body.skill_ids.includes(skill.skill_id),
        )
        delete item.skill_ids
      }
      if (index < 0) state[kind].unshift(item)
      else state[kind][index] = item
      await save()
      return send(res, index < 0 ? 201 : 200, envelope(item))
    }
    return send(res, 501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
  })
  .listen(process.env.PORT || 4951)
