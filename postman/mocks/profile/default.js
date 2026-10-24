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
  attachments: {},
  media: {},
  providers: [{ provider: "Google", provider_username: "synthetic-google", linked_at: "2026-10-20T00:00:00Z" }],
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

// One-pixel image, synthetic only. Processing/scanning below are contract doubles.
const imageBytes = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="
async function multipart(req) {
  let raw = req.body
  if (raw == null) { const chunks = []; for await (const chunk of req) chunks.push(chunk); raw = Buffer.concat(chunks) }
  if (raw?.type === "Buffer") raw = Buffer.from(raw.data)
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) raw = JSON.stringify(raw)
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "utf8")
  const text = bytes.toString("latin1")
  const match = text.match(/name="file"; filename="([^"]*)"\r\nContent-Type: ([^\r]+)\r\n\r\n/)
  if (!match) return null
  const boundary = req.headers["content-type"].match(/boundary=(?:"([^"]+)"|([^;]+))/)
  const start = match.index + match[0].length
  const end = text.indexOf(`\r\n--${boundary?.[1] || boundary?.[2]}`, start)
  return { name: match[1], type: match[2], size: end - start }
}
function quota(state) {
  const files = Object.values(state.attachments).flat()
  const used = files.filter(x => x.status === "active").reduce((sum, x) => sum + x.file_size_bytes, 0)
  const reserved = files.filter(x => ["pending_upload", "processing"].includes(x.status)).reduce((sum, x) => sum + x.file_size_bytes, 0)
  return state.quota || { quota_bytes: 200_000_000, used_bytes: used, reserved_bytes: reserved, available_bytes: 200_000_000 - used - reserved }
}

http
  .createServer(async (req, res) => {
    const path = new URL(req.url, "http://fixture.invalid").pathname
    let state = (await pm.state.get(stateKey)) || seed()
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
    if (!["Bearer synthetic-profile-token", "Bearer synthetic-new-account-token"].includes(req.headers.authorization))
      return send(res, 401, problem(401, "AUTH_UNAUTHORIZED"))
    if (path === "/api/me") return send(res, 200, envelope(state.me))
    const fault = state.faults[`${req.method} ${path}`]
    if (fault?.delay) {
      await new Promise((resolve) => setTimeout(resolve, fault.delay))
      state = (await pm.state.get(stateKey)) || seed()
    }
    if (fault?.disconnect) return req.socket.destroy()
    if (fault?.status)
      return send(
        res,
        fault.status,
        problem(fault.status, fault.code || "VALIDATION_FAILED", fault.field),
      )
    if (path === "/api/me/connections" || path === "/api/auth/connections")
      return send(
        res,
        200,
        envelope({ has_local_password: true, providers: state.providers }),
      )
    if (path === "/api/auth/logout") return send(res, 204)
    if (path === "/api/me/profile/media/quota") return send(res, 200, envelope(quota(state)))
    const privateMedia = path.match(/^\/api\/media\/([^/]+)\/content$/)
    if (privateMedia) {
      const id = privateMedia[1]
      const attachment = Object.values(state.attachments).flat().find(x => x.media_asset_id === id)
      if (!state.media[id] || (attachment && attachment.status !== "active")) return send(res, 404, problem(404, "MEDIA_NOT_FOUND"))
      res.writeHead(200, { "Content-Type": state.media[id].type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" })
      return res.end(Buffer.from(state.media[id].bytes, "base64"))
    }
    const profileImage = path.match(/^\/api\/me\/profile\/(avatar|cover-image)(\/source)?$/)
    if (profileImage) {
      const avatar = profileImage[1] === "avatar"
      const key = avatar ? "avatar_media_asset_id" : "cover_media_asset_id"
      const old = state.profile[key]
      if (req.method === "DELETE" || (req.method === "PUT" && body.source === "default")) {
        delete state.media[old]; state.profile[key] = null
        if (avatar) { state.profile.avatar_source = "default"; state.profile.avatar_url = null }
        else state.profile.cover_image_url = null
      } else if (req.method === "POST" || req.method === "PUT") {
        if (req.method === "POST") {
          const file = await multipart(req)
          if (!file) return send(res, 400, problem(400, "MEDIA_FILE_REQUIRED"))
          if (file.size > (avatar ? 5_000_000 : 10_000_000)) return send(res, 413, problem(413, "MEDIA_FILE_TOO_LARGE"))
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return send(res, 415, problem(415, "MEDIA_UNSUPPORTED"))
        } else if (body.source !== "oauth" || !state.providers.some(x => x.provider.toLowerCase() === body.provider)) return send(res, 409, problem(409, "MEDIA_OAUTH_UNLINKED"))
        const id = randomUUID()
        delete state.media[old]; state.media[id] = { type: "image/png", bytes: imageBytes }
        state.profile[key] = id
        if (avatar) state.profile.avatar_source = req.method === "PUT" ? "oauth" : "uploaded"
      } else return send(res, 501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
      await save()
      const mediaState = { avatar_source: state.profile.avatar_source, avatar_media_asset_id: state.profile.avatar_media_asset_id ?? null, cover_media_asset_id: state.profile.cover_media_asset_id ?? null }
      return req.method === "DELETE" ? send(res, 204) : send(res, 200, envelope(mediaState))
    }
    const attachmentRoute = path.match(/^\/api\/(me|users\/[^/]+)\/profile\/certificates\/([^/]+)\/attachments(?:\/([^/]+)(\/visibility)?)?$/)
    if (attachmentRoute) {
      const [, who, cert, attachmentId, visibility] = attachmentRoute
      if (!state.certificates.some(x => x.certificate_id === cert)) return send(res, 404, problem(404, "NOT_FOUND"))
      const files = state.attachments[cert] ||= []
      const item = files.find(x => x.attachment_id === attachmentId)
      if (req.method === "GET") {
        let changed = false
        for (const file of files) if (file.status === "processing" && file.scan_after_reads != null) {
          changed = true
          if (--file.scan_after_reads <= 0) file.status = file.scan_result || "active"
        }
        if (changed) await save()
        return send(res, 200, envelope(who === "me" ? files : files.filter(x => x.status === "active" && x.visibility === "members")))
      }
      if (who !== "me") return send(res, 404, problem(404, "NOT_FOUND"))
      if (req.method === "POST" && !attachmentId) {
        const file = await multipart(req)
        if (!file) return send(res, 400, problem(400, "MEDIA_FILE_REQUIRED"))
        if (file.size > 10_000_000) return send(res, 413, problem(413, "MEDIA_FILE_TOO_LARGE"))
        if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) return send(res, 415, problem(415, "MEDIA_UNSUPPORTED"))
        if (files.length) return send(res, 409, problem(409, "MEDIA_ATTACHMENT_LIMIT"))
        if (quota(state).available_bytes < file.size) return send(res, 409, problem(409, "MEDIA_QUOTA_EXCEEDED"))
        const uploadFailure = state.attachment_upload_failure
        if (uploadFailure && !uploadFailure.after_commit) return send(res, uploadFailure.status || 500, problem(uploadFailure.status || 500, uploadFailure.code || "INTERNAL_SERVER_ERROR"))
        const pdf = file.type === "application/pdf"
        const result = { attachment_id: randomUUID(), media_asset_id: randomUUID(), file_name: file.name, content_type: pdf ? file.type : "image/webp", file_size_bytes: file.size, status: pdf ? "processing" : "active", visibility: "owner_only", created_at: "2026-10-23T01:00:00Z" }
        files.push(result)
        state.media[result.media_asset_id] = { type: pdf ? "application/pdf" : "image/png", bytes: pdf ? Buffer.from("%PDF-1.4\n%%EOF").toString("base64") : state.certificate_image_bytes || imageBytes }
        await save()
        if (uploadFailure?.after_commit) return send(res, uploadFailure.status || 500, problem(uploadFailure.status || 500, "INTERNAL_SERVER_ERROR"))
        return send(res, pdf ? 202 : 201, envelope(result))
      }
      if (!item) return send(res, 404, problem(404, "NOT_FOUND"))
      if (req.method === "PATCH" && visibility) {
        if (item.status !== "active" && body.visibility === "members") return send(res, 409, problem(409, "MEDIA_NOT_ACTIVE"))
        if (!["owner_only", "members"].includes(body.visibility)) return send(res, 400, problem(400, "MEDIA_INVALID_VISIBILITY"))
        item.visibility = body.visibility; await save(); return send(res, 200, envelope(item))
      }
      if (req.method === "DELETE" && !visibility) {
        files.splice(files.indexOf(item), 1); delete state.media[item.media_asset_id]; await save(); return send(res, 204)
      }
      return send(res, 501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
    }
    if (path === "/api/catalog/skills") return send(res, 200, envelope(skills))
    if (path === "/api/catalog/skill-categories") return send(res, 200, envelope([]))
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
      if (kind === "certificates") {
        for (const item of state.attachments[id] || []) delete state.media[item.media_asset_id]
        delete state.attachments[id]
      }
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
              "description",
              "credential_url",
            ]
      if (
        Object.keys(body).some((key) => !allowed.includes(key)) ||
        (kind === "certificates" ? ["title", "issuer"] : allowed).some((key) => !(key in body))
      )
        return send(res, 400, problem(400, "VALIDATION_FAILED"))
      if (kind === "certificates") {
        for (const [field, limit, required] of [["title", 255, true], ["issuer", 255, true], ["description", 2000, false], ["credential_url", 1000, false]]) {
          const value = body[field]
          if ((required && (typeof value !== "string" || !value.trim())) ||
              (value != null && (typeof value !== "string" || value.trim().length > limit)))
            return send(res, 400, problem(400, "VALIDATION_FAILED", field))
        }
        if (body.credential_url && !/^https?:\/\//i.test(body.credential_url.trim()))
          return send(res, 400, problem(400, "VALIDATION_FAILED", "credential_url"))
        for (const field of allowed) body[field] = typeof body[field] === "string" ? body[field].trim() || null : body[field] ?? null
      }
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
