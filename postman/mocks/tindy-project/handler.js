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
const seedProject = (id = projectId, owner = leader) => ({ ...base, project_id: id, status: "recruiting", current_team_size: 1, leader: owner, created_at: "2026-10-29T00:00:00Z", closing_days_left: 14, team_members: [{ user_id: owner.user_id, display_name: owner.display_name, role_title: "Project Lead", position_id: null, is_leader: true, initials: "PL", joined_at: "2026-10-29T00:00:00Z" }], positions: [makePosition({ role_id: roleId, title: "Backend Developer", required_count: 1, experience_level: "intermediate", description: "Develop REST APIs", skills: [{ skill_id: skillId, is_required: true }] }, positionId, id)] });
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
  let responseDelay = 0;
  const send = (status, data, problem = false) => {
    const json = JSON.stringify(problem ? data : { success: true, message: "OK", data });
    const reply = () => { if (!res.destroyed) { res.writeHead(status, { "Content-Type": problem ? "application/problem+json" : "application/json" }); res.end(json); } };
    if (responseDelay) setTimeout(reply, responseDelay); else reply();
  };
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
    const failure = state.failures[failureIndex];
    if (!failure.repeat) state.failures.splice(failureIndex, 1);
    await save();
    responseDelay = failure.delayMs || 0;
    if (failure.commit) loseCreateResponse = true;
    else if (failure.status || failure.network || failure.response) {
      if (failure.response) return send(200, failure.response);
      if (failure.network) return req.socket.destroy();
      return fail(failure.status, "Injected backend failure", failure.code || "VALIDATION_FAILED");
    }
  }
  if (path.startsWith("/api/me/notifications")) {
    const handled = await notificationRoutes(req, url, state, send, fail, save, caller, loseCreateResponse);
    if (handled !== false) return;
  }
  if (path === "/api/me") return send(200, caller);
  if (state.teammatesEnabled) {
    const handled = await teammatesRoutes(req, url, state, body, send, fail, save, caller, loseCreateResponse);
    if (handled !== false) return;
  }
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
        project.team_members.push({ user_id: application.applicant_id, display_name: "Browser Applicant", role_title: position.title, position_id: position.position_id, is_leader: false, initials: "BA", joined_at: new Date().toISOString() });
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

// Discovery Teammates wire contract stand-in. Synthetic scores are fixture inputs,
// never a production scorer or evidence of PostgreSQL locking/eligibility behavior.
async function teammatesRoutes(req, url, state, body, send, fail, save, caller, loseResponse) {
  const path = url.pathname, id = caller.user_id;
  const people = state.teammateProfiles ||= [];
  const invitations = state.invitations ||= [];
  const interactions = state.candidateInteractions ||= [];
  const paginate = items => {
    const page = Number(url.searchParams.get("page") || 1), size = Number(url.searchParams.get("page_size") || 20);
    return { items: items.slice((page - 1) * size, page * size), pagination: { current_page: page, page_size: size, total_items: items.length, total_pages: Math.ceil(items.length / size), has_next: page * size < items.length, has_previous: page > 1 } };
  };
  const profile = person => ({ user_id: person.user_id, username: "fixture-member", display_name: person.display_name, university: "FPT University", headline: "Build useful software", bio: null, location: null, current_role: null, preferred_role: roles[0], available_hours_per_week: 10, professional_interests: null, learning_goals: null, previous_projects_and_contribution: null, technologies_to_learn: null, public_email: null, github_url: null, linkedin_url: null, personal_website_url: null, avatar_url: null, cover_image_url: null, avatar_source: "default", avatar_media_asset_id: null, cover_media_asset_id: null, skills, experiences_count: 0, certificates_count: 0, ...(person.profile || {}) });
  const preview = person => {
    const p = profile(person);
    return { user_id: person.user_id, display_name: p.display_name, headline: p.headline, avatar_url: p.avatar_url, preferred_role_id: p.preferred_role?.professional_role_id ?? null, preferred_role_name: p.preferred_role?.name ?? null, available_hours_per_week: p.available_hours_per_week, skills: p.skills, experiences_count: p.experiences_count, certificates_count: p.certificates_count, profile_url: `/api/users/${person.user_id}/profile`, experiences_url: `/api/users/${person.user_id}/profile/experiences`, certificates_url: `/api/users/${person.user_id}/profile/certificates` };
  };
  const isNewAdmission = p => p.status === "recruiting" && Date.now() < Date.parse(p.recruitment_closes_at) && p.current_team_size < p.max_team_capacity;
  const availablePosition = p => p && p.status === "open" && p.filled_count < p.required_count;
  if (path === "/api/me/profile") {
    let person = people.find(p => p.user_id === id);
    if (!person) { person = { user_id: id, display_name: caller.display_name, open_to_team_invitations: false }; people.push(person); }
    if (req.method === "PATCH") {
      if (Object.hasOwn(body, "open_to_team_invitations") && typeof body.open_to_team_invitations !== "boolean") return fail(400, "Consent must be boolean");
      if (Object.hasOwn(body, "open_to_team_invitations")) person.open_to_team_invitations = body.open_to_team_invitations;
      const { open_to_team_invitations, ...fields } = body;
      person.profile = { ...person.profile, ...fields };
      if (body.preferred_role_id) person.profile.preferred_role = roles.find(r => r.professional_role_id === body.preferred_role_id);
      if (body.skill_ids) person.profile.skills = skills.filter(s => body.skill_ids.includes(s.skill_id));
      await save(); if (loseResponse) return req.socket.destroy();
    }
    const result = { ...profile(person), phone_number: null, resume_url: null, open_to_team_invitations: person.open_to_team_invitations === true };
    if (state.unsupportedConsent) delete result.open_to_team_invitations;
    return send(200, result);
  }
  const memberProfile = path.match(/^\/api\/users\/([^/]+)\/profile(?:\/(experiences|certificates))?$/);
  if (memberProfile) {
    const person = people.find(p => p.user_id === memberProfile[1]) || (memberProfile[1] === user.user_id ? user : null);
    if (!person) return fail(404, "Profile unavailable", "PROFILE_NOT_FOUND");
    return send(200, memberProfile[2] ? [] : profile(person));
  }
  const feed = path.match(/^\/api\/projects\/([^/]+)\/positions\/([^/]+)\/candidates$/);
  const interaction = path.match(/^\/api\/projects\/([^/]+)\/candidate-interactions(?:\/([^/]+))?$/);
  const leaderInvites = path.match(/^\/api\/projects\/([^/]+)\/invitations(?:\/([^/]+)\/cancel)?$/);
  const memberInvites = path.match(/^\/api\/me\/project-invitations(?:\/([^/]+)\/(accept|decline))?$/);
  if (!feed && !interaction && !leaderInvites && !memberInvites) return false;
  if (!req.headers.authorization) return fail(401, "Sign in required", "AUTH_UNAUTHORIZED");
  if (!caller.is_onboarding_completed) return fail(403, "Complete onboarding", "ONBOARDING_REQUIRED");
  for (const row of invitations) if (row.status === "pending" && Date.parse(row.expires_at) <= Date.now()) { row.status = "expired"; row.updated_at = new Date().toISOString(); }
  await save();
  const project = !memberInvites ? state.projects.find(p => p.project_id === (feed || interaction || leaderInvites)[1]) : null;
  if (!memberInvites && !project) return fail(404, "Project unavailable", "PROJECT_NOT_FOUND");
  if (project && project.leader.user_id !== id) return fail(403, "Actual leader required", "PROJECT_ACCESS_DENIED");
  if (feed) {
    const pos = project.positions.find(p => p.position_id === feed[2]);
    if (!pos) return fail(404, "Position unavailable", "POSITION_NOT_FOUND");
    if (!isNewAdmission(project)) return fail(409, "Project unavailable", "PROJECT_NOT_ELIGIBLE");
    if (!availablePosition(pos)) return fail(409, "Position unavailable", "POSITION_UNAVAILABLE");
    const cursor = url.searchParams.get("cursor"), limit = Number(url.searchParams.get("limit") || 20);
    if (cursor && state.expireTeammateCursor) return fail(409, "Snapshot expired", "TEAMMATE_DISCOVERY_CURSOR_EXPIRED");
    const expectedPrefix = `tm:${project.project_id}:${pos.position_id}:`;
    if (cursor && !cursor.startsWith(expectedPrefix)) return fail(400, "Invalid cursor", "INVALID_TEAMMATE_DISCOVERY_CURSOR");
    const offset = cursor ? Number(cursor.slice(expectedPrefix.length)) : 0;
    const eligible = people.filter(p => p.user_id !== id && p.open_to_team_invitations && !project.team_members.some(m => m.user_id === p.user_id) &&
      !invitations.some(i => i.project_id === project.project_id && i.invited_user_id === p.user_id && (i.status === "pending" || i.status === "declined" && Date.now() - Date.parse(i.responded_at) < 168 * 3600000)) &&
      !(state.applications || []).some(a => a.project_id === project.project_id && a.applicant_id === p.user_id && a.status === "pending") &&
      !interactions.some(i => i.project_id === project.project_id && i.position_id === pos.position_id && i.candidate_user_id === p.user_id && i.action === "skipped") &&
      (!url.searchParams.get("role_id") || preview(p).preferred_role_id === url.searchParams.get("role_id")) &&
      (!url.searchParams.get("skill_id") || preview(p).skills.some(s => s.skill_id === url.searchParams.get("skill_id"))) &&
      (!url.searchParams.get("min_available_hours_per_week") || preview(p).available_hours_per_week >= Number(url.searchParams.get("min_available_hours_per_week"))));
    state.teammateScoredAt ||= new Date().toISOString(); await save();
    const result = { project_id: project.project_id, position_id: pos.position_id, scored_at: state.teammateScoredAt, items: eligible.slice(offset, offset + limit).map(p => ({ candidate: preview(p), interaction_action: interactions.find(i => i.project_id === project.project_id && i.position_id === pos.position_id && i.candidate_user_id === p.user_id)?.action ?? null, matching: fixtureMatch(pos, p.position_scores?.[pos.position_id] ?? 64) })), next_cursor: offset + limit < eligible.length ? expectedPrefix + (offset + limit) : null, has_more: offset + limit < eligible.length, feed_version: "teammates-v1", ...state.teammateFeedOverrides };
    return send(200, result);
  }
  if (interaction) {
    const pos = project.positions.find(p => p.position_id === url.searchParams.get("position_id"));
    if (!pos) return fail(404, "Position unavailable", "POSITION_NOT_FOUND");
    let row = interactions.find(i => i.project_id === project.project_id && i.position_id === pos.position_id && i.candidate_user_id === interaction[2]);
    if (req.method === "GET") {
      const action = url.searchParams.get("action");
      return send(200, paginate(interactions.filter(i => i.project_id === project.project_id && i.position_id === pos.position_id && (!action || action === i.action)).map(i => { const p = people.find(p => p.user_id === i.candidate_user_id); return { ...i, candidate: p?.open_to_team_invitations ? preview(p) : null, is_discoverable: !!p?.open_to_team_invitations }; })));
    }
    if (req.method === "DELETE") {
      if (row) interactions.splice(interactions.indexOf(row), 1);
      await save(); if (loseResponse) return req.socket.destroy();
      return send(200, { project_id: project.project_id, position_id: pos.position_id, candidate_user_id: interaction[2], action: null });
    }
    if (!["saved", "shortlisted", "skipped"].includes(body.action)) return fail(400, "Invalid action");
    if (!people.some(p => p.user_id === interaction[2] && p.open_to_team_invitations)) return fail(404, "Candidate unavailable", "CANDIDATE_NOT_FOUND");
    const now = new Date().toISOString();
    if (!row) { row = { project_id: project.project_id, position_id: pos.position_id, candidate_user_id: interaction[2], created_at: now }; interactions.push(row); }
    row.action = body.action; row.updated_at = now; await save(); if (loseResponse) return req.socket.destroy();
    return send(200, { ...row, ...state.interactionResponseOverrides });
  }
  if (leaderInvites && req.method === "POST" && !leaderInvites[2]) {
    const pos = project.positions.find(p => p.position_id === body.position_id), person = people.find(p => p.user_id === body.invited_user_id);
    if (id === body.invited_user_id) return fail(400, "Cannot invite self", "CANNOT_INVITE_SELF");
    if (project.team_members.some(m => m.user_id === body.invited_user_id)) return fail(409, "Already member", "ALREADY_PROJECT_MEMBER");
    if (invitations.some(i => i.project_id === project.project_id && i.invited_user_id === body.invited_user_id && i.status === "pending")) return fail(409, "Already pending", "INVITATION_ALREADY_PENDING");
    if ((state.applications || []).some(a => a.project_id === project.project_id && a.applicant_id === body.invited_user_id && a.status === "pending")) return fail(409, "Application pending", "APPLICATION_ALREADY_PENDING");
    if (invitations.some(i => i.project_id === project.project_id && i.invited_user_id === body.invited_user_id && i.status === "declined" && Date.now() - Date.parse(i.responded_at) < 168 * 3600000)) return fail(409, "Cooldown", "INVITATION_COOLDOWN_ACTIVE");
    if (!isNewAdmission(project)) return fail(409, "Project unavailable", "PROJECT_NOT_ELIGIBLE");
    if (!availablePosition(pos)) return fail(409, "Position unavailable", "POSITION_UNAVAILABLE");
    if (!person?.open_to_team_invitations) return fail(409, "Candidate unavailable", "CANDIDATE_UNAVAILABLE");
    if (typeof body.message === "string" && body.message.length > 2000) return fail(400, "Message too long");
    const now = new Date().toISOString();
    const row = { invitation_id: randomUUID(), project_id: project.project_id, position_id: pos.position_id, invited_user_id: person.user_id, inviting_leader_id: id, message: body.message?.trim() || null, status: "pending", created_at: now, updated_at: now, expires_at: new Date(Date.parse(now) + 168 * 3600000).toISOString(), responded_at: null };
    invitations.push(row); addFixtureNotification(state, row, "invitation_received", person.user_id, caller); await save(); if (loseResponse) return req.socket.destroy(); return send(201, { ...row, ...state.invitationResponseOverrides });
  }
  if (leaderInvites && req.method === "GET" || memberInvites && req.method === "GET") {
    let rows = invitations.filter(i => leaderInvites ? i.project_id === project.project_id : i.invited_user_id === id);
    for (const field of ["status", "project_id", "position_id", "invited_user_id"]) { const v = url.searchParams.get(field); if (v && v !== "all") rows = rows.filter(i => i[field] === v); }
    return send(200, paginate(rows.slice().reverse()));
  }
  const invitationId = leaderInvites?.[2] || memberInvites?.[1];
  const row = invitations.find(i => i.invitation_id === invitationId && (leaderInvites ? i.project_id === project.project_id : i.invited_user_id === id));
  if (!row) return fail(404, "Invitation unavailable", "INVITATION_NOT_FOUND");
  if (row.status !== "pending") return fail(409, "Invitation is not pending", row.status === "expired" ? "INVITATION_EXPIRED" : "INVITATION_NOT_PENDING");
  const action = leaderInvites ? "cancel" : memberInvites[2];
  if (action === "accept") {
    const p = state.projects.find(p => p.project_id === row.project_id), pos = p?.positions.find(p => p.position_id === row.position_id);
    if (!people.find(p => p.user_id === id)?.open_to_team_invitations) return fail(409, "Enable consent", "CANDIDATE_UNAVAILABLE");
    if (!p || p.status !== "recruiting") return fail(409, "Project not recruiting", "PROJECT_NOT_RECRUITING");
    if (p.current_team_size >= p.max_team_capacity) return fail(409, "Full project", "PROJECT_CAPACITY_EXCEEDED");
    if (!availablePosition(pos)) return fail(409, "Full position", "POSITION_UNAVAILABLE");
    p.team_members.push({ user_id: id, display_name: caller.display_name, role_title: pos.title, position_id: pos.position_id, is_leader: false, initials: "TM", joined_at: new Date().toISOString() });
    p.current_team_size++; pos.filled_count++; if (pos.required_count === pos.filled_count) pos.status = "filled";
  }
  row.status = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
  row.updated_at = new Date().toISOString(); if (action !== "cancel") row.responded_at = row.updated_at;
  const recipient = action === "cancel" ? row.invited_user_id : state.projects.find(p => p.project_id === row.project_id).leader.user_id;
  addFixtureNotification(state, row, "invitation_" + row.status, recipient, caller);
  await save(); if (loseResponse) return req.socket.destroy(); return send(200, { ...row, ...state.invitationResponseOverrides });
}

// Test-only stand-in for the adjacent backend's Notifications V1 contract.
function addFixtureNotification(state, invitation, type, recipient, actor) {
  const rows = state.notifications ||= [];
  if (rows.some(n => n.invitation_id === invitation.invitation_id && n.type === type && n.recipient_user_id === recipient)) return;
  const project = state.projects.find(p => p.project_id === invitation.project_id);
  rows.push({ notification_id: randomUUID(), recipient_user_id: recipient, actor_user_id: actor.user_id,
    invitation_id: invitation.invitation_id, type, payload: { project_name: project.name,
      position_title: project.positions.find(p => p.position_id === invitation.position_id).title, actor_display_name: actor.display_name },
    read_at: null, is_read: false, created_at: new Date().toISOString() });
}
async function notificationRoutes(req, url, state, send, fail, save, caller, loseResponse) {
  const path = url.pathname, base = "/api/me/notifications";
  if (!req.headers.authorization) return fail(401, "Sign in required", "AUTH_UNAUTHORIZED");
  if (caller.status !== "active") return fail(403, "Account unavailable", "AUTH_FORBIDDEN");
  if (!caller.is_onboarding_completed) return fail(403, "Complete onboarding", "ONBOARDING_REQUIRED");
  const all = state.notifications ||= [], rows = all.filter(n => n.recipient_user_id === caller.user_id);
  const dto = n => { const { recipient_user_id, ...data } = n; return { ...data, is_read: data.read_at !== null }; };
  if (path === base + "/unread-count" && req.method === "GET") return send(200, { unread_count: rows.filter(n => n.read_at === null).length });
  if (path === base && req.method === "GET") {
    const filter = url.searchParams.get("filter") || "all", page = Number(url.searchParams.get("page") || 1), size = Number(url.searchParams.get("page_size") || 20);
    if (!["all", "unread"].includes(filter) || !Number.isInteger(page) || page < 1 || size !== 20) return fail(400, "Invalid notification query");
    const filtered = rows.filter(n => filter === "all" || n.read_at === null).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.notification_id.localeCompare(a.notification_id));
    return send(200, { items: filtered.slice((page - 1) * size, page * size).map(dto), pagination: { current_page: page, page_size: size, total_items: filtered.length, total_pages: Math.ceil(filtered.length / size), has_next: page * size < filtered.length, has_previous: page > 1 } });
  }
  const one = path.match(/^\/api\/me\/notifications\/([^/]+)\/read$/);
  if (one && req.method === "PATCH") {
    const row = rows.find(n => n.notification_id === one[1]);
    if (!row) return fail(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
    row.read_at ||= new Date().toISOString(); row.is_read = true; await save();
    if (loseResponse) return req.socket.destroy();
    return send(200, dto(row));
  }
  if (path === base + "/mark-all-read" && req.method === "POST") {
    const cutoff = new Date().toISOString(); let updated_count = 0;
    for (const row of rows) if (row.read_at === null && row.created_at <= cutoff) { row.read_at = cutoff; row.is_read = true; updated_count++; }
    await save(); if (loseResponse) return req.socket.destroy(); return send(200, { updated_count });
  }
  return false;
}
