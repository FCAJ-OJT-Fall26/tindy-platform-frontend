// Local contract stand-in based on the adjacent .NET controllers/DTOs, not a
// claim about production. Controls use synthetic data and are test-only routes.
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const positionId = "33333333-3333-4333-8333-333333333333";
const roleId = "44444444-4444-4444-8444-444444444444";
const skillId = "55555555-5555-4555-8555-555555555555";
const extraSkillId = "66666666-6666-4666-8666-666666666666";
const otherProjectId = "77777777-7777-4777-8777-777777777777";
const user = { user_id: userId, display_name: "Project Leader", university: "FPT", email: "fixture@example.com", username: "fixture", status: "active", roles: ["Member"], is_onboarding_completed: true };
const roles = [{ professional_role_id: roleId, name: "Backend Developer", description: null, display_order: 1 }];
const skills = [{ skill_id: skillId, name: ".NET" }, { skill_id: extraSkillId, name: "PostgreSQL" }];
const base = { name: "Persisted Project", tagline: "Build the real project API", description: "Develop a collaborative project platform using real APIs.", category: "Web Application", difficulty_level: "intermediate", expected_commitment_hours: 10, duration: "3 months", max_team_capacity: 5, color_theme: "indigo", goals: ["Ship the API"] };
const leader = { user_id: userId, display_name: user.display_name, avatar_url: null, initials: "PL" };
const makePosition = (body, id = randomUUID(), parent = projectId) => ({ position_id: id, project_id: parent, role_id: body.role_id, title: body.title.trim(), description: body.description?.trim() ?? null, required_count: body.required_count, filled_count: 0, experience_level: body.experience_level, status: "open", skills: (body.skills || []).map(s => ({ ...s, name: skills.find(k => k.skill_id === s.skill_id)?.name })) });
const seedProject = (id = projectId, owner = leader) => ({ ...base, project_id: id, status: "recruiting", current_team_size: 1, leader: owner, created_at: "2026-10-29T00:00:00Z", closing_days_left: 14, team_members: [{ user_id: owner.user_id, display_name: owner.display_name, role_title: "Project Lead", is_leader: true, initials: "PL", joined_at: "2026-10-29T00:00:00Z" }], positions: [makePosition({ role_id: roleId, title: "Backend Developer", required_count: 1, experience_level: "intermediate", description: "Develop REST APIs", skills: [{ skill_id: skillId, is_required: true }] }, positionId, id)] });
const initial = () => ({ projects: [seedProject(), seedProject(otherProjectId, { ...leader, user_id: "88888888-8888-4888-8888-888888888888" })], requests: [], failures: [], catalogUnavailable: false });
async function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  return new Promise(resolve => { let text = ""; req.on("data", chunk => text += chunk); req.on("end", () => { try { resolve(JSON.parse(text || "{}")); } catch { resolve({}); } }); });
}
async function handle(req, res, bodyPromise) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  let state = await pm.state.get("tindy-project-contract") || initial();
  const body = await bodyPromise;
  const send = (status, data, problem = false) => { res.writeHead(status, { "Content-Type": problem ? "application/problem+json" : "application/json" }); res.end(JSON.stringify(problem ? data : { success: true, message: "OK", data })); };
  const fail = (status, detail, code = "VALIDATION_FAILED") => send(status, { status, title: "Request failed", detail, error_code: code }, true);
  const save = () => pm.state.set("tindy-project-contract", state);
  if (path === "/__test/reset") { state = { ...initial(), ...body }; await save(); return send(200, state); }
  if (path === "/__test/state") return send(200, state);
  if (path === "/__test/control") { Object.assign(state, body); await save(); return send(200, state); }
  state.requests.push({ method: req.method, path, body });
  await save();
  const failureIndex = state.failures.findIndex(failure => failure.method === req.method && new RegExp(failure.path).test(path));
  let loseCreateResponse = false;
  if (failureIndex >= 0) {
    const failure = state.failures.splice(failureIndex, 1)[0]; await save();
    if (failure.commit) loseCreateResponse = true;
    else {
      if (failure.network) return req.socket.destroy();
      return fail(failure.status, "Injected backend failure", failure.code || "VALIDATION_FAILED");
    }
  }
  if (path === "/api/me") return send(200, user);
  if (path === "/api/me/profile") return send(200, { ...user, bio: null, headline: null, current_role: null, location: null, preferred_role: roles[0], available_hours_per_week: 10, skills, github_url: null, personal_website_url: null, avatar_url: null, cover_image_url: null });
  if (path.startsWith("/api/catalog/")) {
    if (state.catalogUnavailable) return fail(500, "Catalog unavailable");
    if (path === "/api/catalog/professional-roles") return send(200, roles);
    if (path === "/api/catalog/skills") return send(200, skills);
    if (path === "/api/catalog/skill-categories") return send(200, [{ category_id: roleId, name: "Backend", description: null, display_order: 1 }]);
  }
  if (path === "/api/me/projects") return send(200, {
    leading_projects: state.projects.filter(p => p.leader.user_id === userId && p.status !== "archived").map(p => ({ ...p, pending_applications_count: 0 })), joined_projects: [],
  });
  if (req.method !== "GET" && !req.headers.authorization) return fail(401, "Sign in required", "AUTH_UNAUTHORIZED");
  if (path === "/api/projects" && req.method === "GET") {
    const items = state.projects.filter(p => p.status !== "archived" && (!url.searchParams.get("q") || p.name.toLowerCase().includes(url.searchParams.get("q").toLowerCase())));
    const page = Number(url.searchParams.get("page") || 1), size = Number(url.searchParams.get("page_size") || 10);
    return send(200, { items: items.slice((page - 1) * size, page * size).map(p => ({ ...p, open_positions: p.positions.filter(pos => pos.status === "open").map(pos => ({ position_id: pos.position_id, title: pos.title, role_name: roles[0].name, required_count: pos.required_count, required_skills: pos.skills.filter(s => s.is_required).map(s => s.name), nice_to_have_skills: pos.skills.filter(s => !s.is_required).map(s => s.name) })) })), pagination: { current_page: page, page_size: size, total_items: items.length, total_pages: Math.ceil(items.length / size), has_next: page * size < items.length, has_previous: page > 1 } });
  }
  if (path === "/api/projects" && req.method === "POST") {
    if (body.initial_team_size !== 1 || body.max_team_capacity < 1 || !body.positions?.length || body.positions.some(p => p.role_id !== roleId || p.skills.some(s => !skills.some(k => k.skill_id === s.skill_id)))) return fail(400, "Invalid project request");
    const project = { ...seedProject(), ...body, project_id: randomUUID(), initial_team_size: 1 };
    project.positions = body.positions.map(pos => makePosition(pos, randomUUID(), project.project_id));
    state.projects.push(project); await save();
    if (loseCreateResponse) return req.socket.destroy();
    return send(201, { ...project, positions_count: project.positions.length });
  }
  const match = path.match(/^\/api\/projects\/([^/]+)(?:\/positions(?:\/([^/]+)(?:\/skills(?:\/([^/]+))?)?)?)?$/);
  if (match) {
    const project = state.projects.find(p => p.project_id === match[1]);
    if (!project || project.status === "archived") return fail(404, "Project not found", "PROJECT_NOT_FOUND");
    if (req.method !== "GET" && project.leader.user_id !== userId) return fail(403, "Only the project leader can modify this project", "PROJECT_ACCESS_DENIED");
    if (!path.includes("/positions")) {
      if (req.method === "GET") return send(200, project);
      if (req.method === "PUT") { Object.assign(project, body); await save(); return send(200, project); }
      if (req.method === "DELETE") { project.status = "archived"; project.positions.forEach(p => p.status = "closed"); await save(); return send(200, { project_id: project.project_id, status: "archived" }); }
    }
    if (!match[2]) {
      if (req.method === "GET") return send(200, project.positions);
      if (req.method === "POST") { if (body.role_id !== roleId) return fail(400, "Role not found", "ROLE_NOT_FOUND"); const position = makePosition(body, randomUUID(), project.project_id); project.positions.push(position); await save(); return send(201, position); }
    }
    const position = project.positions.find(p => p.position_id === match[2]);
    if (!position) return fail(404, "Position not found", "POSITION_NOT_FOUND");
    if (path.includes("/skills")) {
      if (req.method === "POST") {
        const skill = skills.find(s => s.skill_id === body.skill_id); if (!skill) return fail(404, "Skill not found", "SKILL_NOT_FOUND");
        const link = position.skills.find(s => s.skill_id === body.skill_id);
        if (link) link.is_required = body.is_required; else position.skills.push({ ...body, name: skill.name });
        await save(); return send(201, { position_id: position.position_id, skill_id: skill.skill_id, skill_name: skill.name, is_required: body.is_required });
      }
      if (req.method === "DELETE") { position.skills = position.skills.filter(s => s.skill_id !== match[3]); await save(); return send(200, null); }
    }
    if (req.method === "PUT") { const { role_id: ignored, ...editable } = body; Object.assign(position, editable); position.description = body.description?.trim() || null; await save(); return send(200, position); }
    if (req.method === "DELETE") { project.positions = project.positions.filter(p => p.position_id !== position.position_id); await save(); return send(200, null); }
  }
  return fail(501, "This path is not modeled by the Project contract fixture", "NOT_MODELED");
}
// Serialize fixture snapshots so a late GET log cannot restore pre-reset data.
// This is only the stand-in's state store, not an application transaction.
let queue = Promise.resolve();
http.createServer((req, res) => {
  const bodyPromise = bodyOf(req);
  queue = queue.then(() => handle(req, res, bodyPromise)).catch(() => {
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/problem+json" });
    res.end(JSON.stringify({ status: 500, title: "Fixture failure", error_code: "FIXTURE_ERROR" }));
  });
}).listen(process.env.PORT || 4500);
