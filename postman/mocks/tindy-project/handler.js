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
const vietnamToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const defaultClosingDate = () => { const date = new Date(vietnamToday() + "T00:00:00Z"); date.setUTCDate(date.getUTCDate() + 14); return date.toISOString().slice(0, 10); };
const deadline = (date = defaultClosingDate()) => ({ recruitment_closing_date: date, recruitment_closes_at: date + "T17:00:00Z", is_recruitment_open: Date.now() < Date.parse(date + "T17:00:00Z") });
const user = { user_id: userId, display_name: "Project Leader", university: "FPT", email: "fixture@example.com", username: "fixture", status: "active", roles: ["Member"], is_onboarding_completed: true };
const roles = [{ professional_role_id: roleId, name: "Backend Developer", description: null, display_order: 1 }];
const skills = [{ skill_id: skillId, name: ".NET" }, { skill_id: extraSkillId, name: "PostgreSQL" }];
const base = { ...deadline(), name: "Persisted Project", tagline: "Build the real project API", description: "Develop a collaborative project platform using real APIs.", category: "Web Application", difficulty_level: "intermediate", expected_commitment_hours: 10, duration: "3 months", max_team_capacity: 5, color_theme: "indigo", goals: ["Ship the API"] };
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
  const caller = state.currentUser || user;
  const send = (status, data, problem = false) => { res.writeHead(status, { "Content-Type": problem ? "application/problem+json" : "application/json" }); res.end(JSON.stringify(problem ? data : { success: true, message: "OK", data })); };
  const fail = (status, detail, code = "VALIDATION_FAILED") => send(status, { status, title: "Request failed", detail, error_code: code }, true);
  const save = () => pm.state.set("tindy-project-contract", state);
  if (path === "/__test/reset") { state = { ...initial(), ...body }; await save(); return send(200, state); }
  if (path === "/__test/state") return send(200, state);
  if (path === "/__test/control") { Object.assign(state, body); await save(); return send(200, state); }
  state.requests.push({ method: req.method, path, body, query: Object.fromEntries(url.searchParams), user_id: caller.user_id });
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
  if (path === "/api/me") return send(200, caller);
  if (path === "/api/me/profile") return send(200, { ...caller, bio: null, headline: null, current_role: null, location: null, preferred_role: roles[0], available_hours_per_week: 10, skills, github_url: null, personal_website_url: null, avatar_url: null, cover_image_url: null });
  if (path.startsWith("/api/catalog/")) {
    if (state.catalogUnavailable) return fail(500, "Catalog unavailable");
    if (path === "/api/catalog/professional-roles") return send(200, roles);
    if (path === "/api/catalog/skills") return send(200, skills);
    if (path === "/api/catalog/skill-categories") return send(200, [{ category_id: roleId, name: "Backend", description: null, display_order: 1 }]);
  }
  if (path === "/api/me/projects") return send(200, {
    leading_projects: state.projects.filter(p => p.leader.user_id === caller.user_id && p.status !== "archived").map(p => ({ ...p, pending_applications_count: (state.applications || []).filter(a => a.project_id === p.project_id && a.status === "pending").length })),
    joined_projects: state.projects.filter(p => p.status !== "archived" && p.leader.user_id !== caller.user_id && p.team_members.some(m => m.user_id === caller.user_id)).map(p => ({ project_id: p.project_id, name: p.name, status: p.status, my_role: p.team_members.find(m => m.user_id === caller.user_id).role_title, leader_name: p.leader.display_name, joined_at: new Date().toISOString() })),
  });
  if (req.method !== "GET" && !req.headers.authorization) return fail(401, "Sign in required", "AUTH_UNAUTHORIZED");
  const handled = await recruitmentRoutes(req, url, state, body, send, fail, save, caller, loseCreateResponse);
  if (handled !== false) return;
  if (path === "/api/discovery/projects" && req.method === "GET") {
    const caller = state.currentUser || user;
    const eligible = state.projects.filter(p => p.status === "recruiting" && p.leader.user_id !== caller.user_id &&
      p.current_team_size < p.max_team_capacity && Date.now() < Date.parse(p.recruitment_closes_at) &&
      p.positions.some(pos => pos.status === "open" && pos.filled_count < pos.required_count) &&
      !p.team_members.some(m => m.user_id === caller.user_id) &&
      !(state.interactions || {})[caller.user_id + "/" + p.project_id]?.is_skipped &&
      !(state.applications || []).some(a => a.applicant_id === caller.user_id && a.project_id === p.project_id && a.status === "pending") &&
      (!url.searchParams.get("category") || p.category === url.searchParams.get("category")) &&
      (!url.searchParams.get("role_id") || p.positions.some(pos => pos.role_id === url.searchParams.get("role_id"))) &&
      (!url.searchParams.get("skill_id") || p.positions.some(pos => pos.skills.some(s => s.skill_id === url.searchParams.get("skill_id")))));
    const offset = Number((url.searchParams.get("cursor") || "fixture:0").split(":")[1]);
    if (!Number.isInteger(offset) || offset < 0) return fail(400, "Malformed cursor", "INVALID_DISCOVERY_CURSOR");
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));
    const items = eligible.slice(offset, offset + limit).map((p, index) => {
      const pos = p.positions.find(pos => pos.status === "open" && pos.filled_count < pos.required_count);
      return { project_id: p.project_id, name: p.name, tagline: p.tagline, description: p.description,
        category: p.category, difficulty_level: p.difficulty_level, expected_commitment_hours: p.expected_commitment_hours,
        duration: p.duration, color_theme: p.color_theme, current_team_size: p.current_team_size, max_team_capacity: p.max_team_capacity,
        leader: p.leader, created_at: p.created_at, recruitment_closing_date: p.recruitment_closing_date,
        recruitment_closes_at: p.recruitment_closes_at, is_recruitment_open: true, closing_days_left: p.closing_days_left,
        ...fixtureMatch(pos, state.matchScore ?? 73), feed_bucket: index < 12 ? "best_match" : index < 17 ? "new_projects" : "explore", is_saved: !!(state.interactions || {})[caller.user_id + "/" + p.project_id]?.is_saved };
    });
    return send(200, { items, next_cursor: offset + limit < eligible.length ? `fixture:${offset + limit}` : null, has_more: offset + limit < eligible.length, feed_version: "feed-v1" });
  }
  if (path === "/api/projects" && req.method === "GET") {
    const items = state.projects.filter(p => p.status !== "archived" && (!url.searchParams.get("q") || p.name.toLowerCase().includes(url.searchParams.get("q").toLowerCase())));
    const page = Number(url.searchParams.get("page") || 1), size = Number(url.searchParams.get("page_size") || 10);
    return send(200, { items: items.slice((page - 1) * size, page * size).map(p => ({ ...p, open_positions: p.positions.filter(pos => pos.status === "open").map(pos => ({ position_id: pos.position_id, title: pos.title, role_name: roles[0].name, required_count: pos.required_count, required_skills: pos.skills.filter(s => s.is_required).map(s => s.name), nice_to_have_skills: pos.skills.filter(s => !s.is_required).map(s => s.name) })) })), pagination: { current_page: page, page_size: size, total_items: items.length, total_pages: Math.ceil(items.length / size), has_next: page * size < items.length, has_previous: page > 1 } });
  }
  if (path === "/api/projects" && req.method === "POST") {
    if (body.initial_team_size !== 1 || body.max_team_capacity < 1 || !body.positions?.length || body.positions.some(p => p.role_id !== roleId || p.skills.some(s => !skills.some(k => k.skill_id === s.skill_id)))) return fail(400, "Invalid project request");
    if (body.recruitment_closing_date && body.recruitment_closing_date <= vietnamToday()) return fail(400, "Closing date must be in the future");
    const project = { ...seedProject(), ...body, ...deadline(body.recruitment_closing_date), project_id: randomUUID(), initial_team_size: 1 };
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
      if (req.method === "PUT") { if (body.recruitment_closing_date && body.recruitment_closing_date <= vietnamToday()) return fail(400, "Closing date must be in the future"); Object.assign(project, body, body.recruitment_closing_date ? deadline(body.recruitment_closing_date) : {}); await save(); return send(200, project); }
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

function fixtureMatch(pos, value) {
  return { match_score: value, algorithm_version: "rule-v1", best_position: { position_id: pos.position_id, title: pos.title,
    role_id: pos.role_id, role_name: roles.find(r => r.professional_role_id === pos.role_id)?.name || pos.title,
    experience_level: pos.experience_level, required_count: pos.required_count, filled_count: pos.filled_count,
    remaining_slots: Math.max(0, pos.required_count - pos.filled_count) },
    match_factors: [{ name: "required_skills", factor: .5, normalized_weight: 40, contribution: 20 },
      { name: "preferred_role", factor: 1, normalized_weight: 30, contribution: 30 },
      { name: "availability", factor: null, normalized_weight: 0, contribution: 0 },
      { name: "optional_skills", factor: .5, normalized_weight: 30, contribution: 15 }],
    matched_skills: pos.skills.filter(s => s.is_required), missing_skills: [], data_incomplete: true,
    explanation: "Synthetic contract fixture: score supplied by the server; availability is unknown and excluded." };
}

// Stateful synthetic HTTP contract fixture. This is never imported by src/.
async function recruitmentRoutes(req, url, state, body, send, fail, save, caller, loseResponse) {
  const path = url.pathname, id = caller.user_id;
  const interactions = state.interactions ||= {}, applications = state.applications ||= [];
  const paginate = items => {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1)); const size = Math.min(50, Math.max(1, Number(url.searchParams.get("page_size") || 20)));
    return { items: items.slice((page - 1) * size, page * size), pagination: { current_page: page, page_size: size, total_items: items.length, total_pages: Math.ceil(items.length / size), has_next: page * size < items.length, has_previous: page > 1 } };
  };
  if (path === "/api/me/discovery/saved") {
    const rows = state.projects.filter(p => interactions[id + "/" + p.project_id]?.is_saved).map(p => ({ project_id: p.project_id, name: p.name, tagline: p.tagline, category: p.category, status: p.status, recruitment_closes_at: p.recruitment_closes_at,
      is_recruitment_open: p.status === "recruiting" && Date.now() < Date.parse(p.recruitment_closes_at), is_skipped: !!interactions[id + "/" + p.project_id].is_skipped, updated_at: interactions[id + "/" + p.project_id].updated_at }));
    return send(200, paginate(rows));
  }
  const flag = path.match(/^\/api\/me\/discovery\/(saved|skipped)\/([^/]+)$/);
  if (flag) {
    if (req.method === "PUT" && !state.projects.some(p => p.project_id === flag[2])) return fail(404, "Project not found", "PROJECT_NOT_FOUND");
    const record = interactions[id + "/" + flag[2]] ||= { is_saved: false, is_skipped: false, updated_at: new Date().toISOString() };
    record[flag[1] === "saved" ? "is_saved" : "is_skipped"] = req.method === "PUT"; record.updated_at = new Date().toISOString();
    await save(); return send(200, { project_id: flag[2] });
  }
  if (path === "/api/me/project-applications") return send(200, paginate(applications.filter(a => a.applicant_id === id).slice().reverse()));
  const withdraw = path.match(/^\/api\/me\/project-applications\/([^/]+)\/withdraw$/);
  if (withdraw) {
    const application = applications.find(a => a.application_id === withdraw[1] && a.applicant_id === id);
    if (!application) return fail(404, "Application not found", "APPLICATION_NOT_FOUND");
    if (application.status !== "pending") return fail(409, "Only pending applications can be withdrawn", "APPLICATION_NOT_PENDING");
    application.status = "withdrawn"; application.updated_at = new Date().toISOString(); await save(); return send(200, application);
  }
  const route = path.match(/^\/api\/projects\/([^/]+)\/applications(?:\/([^/]+)\/(accept|reject))?$/);
  if (route) {
    const project = state.projects.find(p => p.project_id === route[1]);
    if (!project) return fail(404, "Project not found", "PROJECT_NOT_FOUND");
    if (route[3]) {
      if (project.leader.user_id !== id) return fail(403, "Only the project leader can review", "PROJECT_ACCESS_DENIED");
      const application = applications.find(a => a.project_id === project.project_id && a.application_id === route[2]);
      if (!application) return fail(404, "Application not found", "APPLICATION_NOT_FOUND");
      if (application.status !== "pending") return fail(409, "Application is not pending", "APPLICATION_NOT_PENDING");
      const position = project.positions.find(p => p.position_id === application.position_id);
      if (route[3] === "accept") {
        if (project.status !== "recruiting") return fail(409, "Project is not recruiting", "PROJECT_NOT_RECRUITING");
        if (project.current_team_size >= project.max_team_capacity) return fail(409, "Project is full", "PROJECT_CAPACITY_EXCEEDED");
        if (position.status !== "open" || position.filled_count >= position.required_count) return fail(409, "Position filled", "POSITION_UNAVAILABLE");
        project.team_members.push({ user_id: application.applicant_id, display_name: "Browser Applicant", role_title: position.title, is_leader: false, initials: "BA", joined_at: new Date().toISOString() });
        project.current_team_size++; position.filled_count++; if (position.filled_count === position.required_count) position.status = "filled";
      }
      application.status = route[3] === "accept" ? "accepted" : "rejected";
      application.updated_at = application.reviewed_at = new Date().toISOString(); application.reviewed_by = id; await save(); return send(200, application);
    }
    if (req.method === "POST") {
      if (applications.some(a => a.applicant_id === id && a.project_id === project.project_id && a.status === "pending")) return fail(409, "Already pending", "APPLICATION_ALREADY_PENDING");
      const position = project.positions.find(p => p.position_id === body.position_id);
      if (project.status !== "recruiting" || Date.now() >= Date.parse(project.recruitment_closes_at) || project.current_team_size >= project.max_team_capacity || project.leader.user_id === id || project.team_members.some(m => m.user_id === id)) return fail(409, "Project is not eligible", "PROJECT_NOT_ELIGIBLE");
      if (!position || position.status !== "open" || position.filled_count >= position.required_count) return fail(409, "Position unavailable", "POSITION_UNAVAILABLE");
      const now = new Date().toISOString(); const application = { application_id: randomUUID(), project_id: project.project_id, position_id: position.position_id, applicant_id: id, status: "pending", message: body.message || null, created_at: now, updated_at: now, reviewed_at: null, reviewed_by: null };
      applications.push(application); await save(); if (loseResponse) return req.socket.destroy(); return send(201, application);
    }
    if (project.leader.user_id !== id) return fail(403, "Only the project leader can review", "PROJECT_ACCESS_DENIED");
    let rows = applications.filter(a => a.project_id === project.project_id);
    const status = url.searchParams.get("status") || "pending", positionId = url.searchParams.get("position_id");
    if (status !== "all") rows = rows.filter(a => a.status === status);
    if (positionId) rows = rows.filter(a => a.position_id === positionId);
    return send(200, paginate(rows.slice().reverse().map(a => {
      const pos = project.positions.find(p => p.position_id === a.position_id);
      return { application: a, applicant: { user_id: a.applicant_id, display_name: "Browser Applicant", preferred_role_id: roleId, preferred_role_name: roles[0].name, available_hours_per_week: 10, skills, experiences_count: 0, certificates_count: 0,
        profile_url: `/api/users/${a.applicant_id}/profile`, experiences_url: `/api/users/${a.applicant_id}/profile/experiences`, certificates_url: `/api/users/${a.applicant_id}/profile/certificates` },
        applied_position: { ...pos, role_name: roles[0].name }, matching: fixtureMatch(pos, state.reviewMatchScore ?? 41) };
    })));
  }
  const profile = path.match(/^\/api\/users\/([^/]+)\/profile(?:\/(experiences|certificates))?$/);
  if (profile) return send(200, profile[2] ? [] : { user_id: profile[1], username: "browser-applicant", display_name: "Browser Applicant", university: "FPT", headline: null, bio: null, location: null, current_role: null, preferred_role: roles[0], available_hours_per_week: 10, skills,
    experiences_count: 0, certificates_count: 0, avatar_url: null, cover_image_url: null, public_email: null, github_url: null, linkedin_url: null, personal_website_url: null });
  return false;
}
