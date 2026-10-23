// Profile V1 contract-driven browser tests through a local Postman simulation.
// These checks do not prove backend/PostgreSQL or real OAuth behavior.
import assert from "node:assert/strict"
import { createServer } from "node:net"
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { createServer as createViteServer } from "vite"
import openBrowser from "./profile-browser.mjs"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const ownerId = "11111111-1111-4111-8111-111111111111"
const memberId = "44444444-4444-4444-8444-444444444444"
const ownerPath = "/api/me/profile"
let simulation,
  vite,
  browser,
  simLog = "",
  simErrors = "",
  checks = 0
const calls = []
const pass = (message) => console.log(`PASS ${++checks}: ${message}`)
const text = (value) =>
  `document.body.innerText.includes(${JSON.stringify(value)})`
const freePort = async () => {
  const socket = createServer()
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve))
  const port = socket.address().port
  await new Promise((resolve) => socket.close(resolve))
  return port
}

try {
  const port = await freePort()
  simulation = spawn(
    process.env.POSTMAN_PATH || "postman.exe",
    [
      "simulation",
      "run",
      "postman/simulations/profile.sim.yaml",
      "--port",
      String(port),
      "--output",
      "ndjson",
      "--no-history",
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  )
  simulation.stdout.on("data", (chunk) => {
    simLog += chunk
  })
  simulation.stderr.on("data", (chunk) => {
    simErrors += chunk
  })
  let launchError
  simulation.on("error", (error) => {
    launchError = error
  })
  for (let attempt = 0; !simLog.includes('"listening"'); attempt++) {
    if (launchError) throw launchError
    if (attempt > 300 || simulation.exitCode != null)
      throw Error(`Simulation did not start: ${simErrors} ${simLog}`)
    await delay(100)
  }
  console.log(
    "Local Postman simulation listening; starting real frontend and Chrome.",
  )
  const simOrigin = `http://127.0.0.1:${port}`
  const control = async (path, body) => {
    const response = await fetch(`${simOrigin}/__test/${path}`, {
      method: body ? "POST" : "GET",
      headers: { "x-mock-slug": "tindy", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    assert.equal(response.status, 200, `Fixture control ${path}`)
    return (await response.json()).data
  }
  vite = await createViteServer({
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("") },
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      proxy: {
        "/api": {
          target: simOrigin,
          changeOrigin: true,
          headers: { "x-mock-slug": "tindy" },
          configure(proxy) {
            proxy.on("proxyReq", (outgoing, incoming) => {
              const chunks = []
              incoming.on("data", (chunk) => {
                chunks.push(chunk)
              })
              incoming.on("end", () =>
                calls.push({
                  path: incoming.url,
                  method: incoming.method,
                  authorization: incoming.headers.authorization,
                  body: chunks.length && incoming.headers["content-type"]?.includes("application/json") ? JSON.parse(Buffer.concat(chunks).toString()) : null,
                }),
              )
            })
          },
        },
      },
    },
  })
  await vite.listen()
  const origin = vite.resolvedUrls.local[0].replace(/\/$/, "")
  browser = await openBrowser(origin)
  const { evaluate, waitFor, go, click, input, send, screenshot } = browser
  const check = async (expression, description) => {
    assert.ok(await evaluate(expression), description)
    pass(description)
  }
  const token = async () =>
    evaluate(
      'localStorage.setItem("tindy_access_token", "synthetic-profile-token")',
    )
  const ready = () =>
    waitFor(
      `${text("Your professional profile")} && Boolean(document.querySelector('.profile-identity')) && !document.querySelector('main').innerText.includes('Loading experiences') && !document.querySelector('main').innerText.includes('Loading certificates')`,
      "owner profile ready",
    )
  const fault = async (method, path, value) =>
    control("control", {
      faults: value ? { [`${method} ${path}`]: value } : {},
    })
  const mutations = () =>
    calls.filter((call) =>
      ["PATCH", "POST", "PUT", "DELETE"].includes(call.method),
    )
  const last = (method) =>
    [...calls].reverse().find((call) => call.method === method)
  const clickLabel = async (label) => {
    await evaluate(
      `document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)}).click()`,
    )
    await delay(40)
  }

  await control("reset", {})
  await go(`/users/${memberId}`)
  await waitFor('location.pathname === "/login"', "member login guard")
  pass("Member route requires authentication")
  await token()
  await evaluate(
    'localStorage.setItem("tindy-v2-profile", JSON.stringify({name:"Leaked local mock",skills:["fake"]}))',
  )
  await go("/profile")
  await ready()
  await check(
    `${text("No experiences yet")} && ${text("No certificates yet")} && !${text("RAG Knowledge Chatbot")} && !${text("Leaked local mock")}`,
    "Empty collections use API state; legacy localStorage and demo cards are ignored",
  )
  await check(
    `${text("Profile Student")} && !${text("Old Account Name")} && !${text("private-login@example.test")}`,
    "Profile identity and contact details stay separate from Account DTO",
  )
  await waitFor(
    "!document.querySelector('.profile-identity img')",
    "broken avatar fallback",
  )
  await check(
    "document.querySelector('.profile-avatar-wrap .avatar')?.textContent === 'PS'",
    "Broken OAuth avatar falls back to initials",
  )
  assert.ok(
    [ownerPath, `${ownerPath}/experiences`, `${ownerPath}/certificates`].every(
      (path) =>
        calls.some((call) => call.path === path && call.method === "GET"),
    ),
  )
  pass(
    "Owner profile and both collections load through independent GET requests",
  )

  await click("Edit profile")
  await input("display_name", "  Updated   Student  ")
  await input("learning_goals", "")
  await click("Save profile")
  await waitFor(text("Updated Student"), "normalized PATCH response")
  assert.deepEqual(last("PATCH").body, {
    display_name: "Updated   Student",
    learning_goals: null,
  })
  pass(
    "PATCH sends only dirty fields, clears optional values with null, omits unchanged skills",
  )
  await check(
    `${text("Updated Student")} && !${text("Old Account Name")}`,
    "Server-normalized PATCH response wins over stale Account data",
  )
  let state = await control("state")
  assert.equal(state.profile.bio, "Server profile introduction")
  assert.equal(state.profile.learning_goals, null)
  pass(
    "Omitted fields are retained and null clearing persists on the server double",
  )
  await go("/profile")
  await ready()
  await check(
    text("Updated Student"),
    "Reload fetches the saved profile from the API",
  )
  await click("Edit profile")
  const beforeNoChange = mutations().length
  await click("Save profile")
  await waitFor(text("No changes to save."))
  assert.equal(mutations().length, beforeNoChange)
  pass("An unchanged profile never submits an empty PATCH")
  await input("available_hours_per_week", "41")
  await input("github_url", "javascript:alert(1)")
  await click("Save profile")
  await waitFor(text("Choose a whole number from 1 to 40."))
  assert.equal(mutations().length, beforeNoChange)
  pass("Invalid availability and non-HTTP URLs are rejected before sending")
  await input("available_hours_per_week", "12")
  await input("github_url", "https://github.com/example")
  await click("React", ".profile-skill-options button")
  await click("Save profile")
  await waitFor("!document.querySelector('.profile-edit')")
  assert.equal(last("PATCH").body.skill_ids.length, 2)
  assert.ok(
    last("PATCH").body.skill_ids.every((id) => /^[0-9a-f-]{36}$/.test(id)),
  )
  pass(
    "Changed profile skills replace the complete selection with Catalog UUIDs",
  )

  await click("Edit profile")
  const beforeRequired = mutations().length
  await input("display_name", "   ")
  await click("Save profile")
  await waitFor(text("This field is required."))
  assert.equal(mutations().length, beforeRequired)
  pass("Required profile fields reject whitespace instead of sending null")
  await input("display_name", "Updated Student")
  await input("headline", "Updated profile headline")
  await fault("PATCH", ownerPath, { status: 400, field: "headline" })
  await click("Save profile")
  await waitFor(text("Check the highlighted fields."))
  await check('document.querySelector("input[name=headline]").getAttribute("aria-invalid") === "true"', "400 ProblemDetails maps field errors while keeping the edit form")
  await screenshot("profile-editor-desktop.png")
  await fault("PATCH", ownerPath, null)
  await click("Save profile")
  await waitFor("!document.querySelector('.profile-edit')")

  await click("Add experience")
  await input("project_name", "Profile API integration")
  await input("role_title", "Frontend Developer")
  await input(
    "description",
    "Integrated the Profile module with its HTTP contract.",
  )
  await input("start_date", "2026-09")
  await input("end_date", "2026-08")
  const beforeInvalidDate = mutations().length
  await click("Save experience")
  await waitFor(text("End date must be on or after the start date."))
  assert.equal(mutations().length, beforeInvalidDate)
  pass("Experience date order is validated")
  await evaluate('document.querySelector("[name=is_ongoing]").click()')
  await click("Save experience")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.deepEqual(last("POST").body, {
    project_name: "Profile API integration",
    role_title: "Frontend Developer",
    description: "Integrated the Profile module with its HTTP contract.",
    repo_url: null,
    start_date: "2026-09",
    end_date: null,
    is_ongoing: true,
    skill_ids: [],
  })
  pass(
    "Experience POST includes mandatory boolean and empty skill_ids; ongoing clears end_date (201)",
  )
  await clickLabel("Edit Profile API integration")
  await click(".NET", ".profile-skill-options button")
  await input("role_title", "Lead Frontend Developer")
  await click("Save experience")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal(last("PUT").body.skill_ids.length, 1)
  assert.equal(Object.keys(last("PUT").body).length, 8)
  assert.ok(!("technologies" in last("PUT").body))
  pass(
    "Experience PUT is full replacement and maps response technologies to request skill_ids (200)",
  )

  await click("Add certificate")
  await input("title", "Cloud Foundations")
  await input("issuer", "Learning Institute")
  await input("description", "x".repeat(2001))
  const beforeCertificateDate = mutations().length
  await click("Save certificate")
  await waitFor(text("Use at most 2000 characters."))
  assert.equal(mutations().length, beforeCertificateDate)
  pass("Certificate description longer than 2000 characters is rejected before HTTP")
  await input("description", "Foundational cloud knowledge.")
  await input("credential_url", "https://example.test/credential")
  await click("Save certificate")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.deepEqual(last("POST").body, {
    title: "Cloud Foundations",
    issuer: "Learning Institute",
    description: "Foundational cloud knowledge.",
    credential_url: "https://example.test/credential",
  })
  pass("Certificate POST sends only title, issuer, description and credential URL (201)")
  await clickLabel("Edit Cloud Foundations")
  await input("description", "Updated cloud knowledge.")
  await click("Save certificate")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal(last("PUT").body.description, "Updated cloud knowledge.")
  assert.equal(Object.keys(last("PUT").body).length, 4)
  pass("Certificate PUT sends the full supported schema (200)")
  await screenshot("owner-desktop.png")

  await go(`/users/${memberId}`)
  await waitFor(text("Another Member"))
  await waitFor(text("Cloud Foundations"))
  await check(
    `!${text("private-phone-123")} && !${text("private-resume")} && !${text("private-login@example.test")} && ${text("public-contact@example.test")}`,
    "Member view exposes only public contact data",
  )
  await check(
    "![...document.querySelectorAll('main button')].some(button => /Edit|Delete|Add experience|Add certificate/.test(button.textContent + button.getAttribute('aria-label')))",
    "Member profile is read-only",
  )
  assert.ok(
    ["", "/experiences", "/certificates"].every((suffix) =>
      calls.some(
        (call) => call.path === `/api/users/${memberId}/profile${suffix}`,
      ),
    ),
  )
  pass("Member view calls its three dedicated endpoints")
  await screenshot("member-desktop.png")
  await go(`/users/${ownerId}`)
  await waitFor(text("Updated Student"))
  await check(
    `!${text("Phone number")} && !${text("Resume (only you)")}`,
    "Viewing one's own member route still uses the filtered DTO",
  )
  await go("/users/invalid")
  await waitFor(text("Profile unavailable"))
  pass("Malformed member UUID gets an unavailable state")
  await go("/users/99999999-9999-4999-8999-999999999999")
  await waitFor(text("Retry profile"))
  await check(`!${text("Another Member")} && !${text("private-phone-123")}`, "An unavailable member returns 404 without retaining the previous profile")

  await go("/profile")
  await ready()
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await check(
    "document.documentElement.scrollWidth <= innerWidth + 1",
    "Owner profile fits a mobile viewport",
  )
  await click("Add experience")
  await screenshot("experience-mobile.png")
  await check(
    "document.querySelector('[role=dialog]').getBoundingClientRect().width <= innerWidth",
    "Experience editor fits a mobile viewport",
  )
  await check(
    "(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && document.querySelector('.overlay').parentElement === document.body })()",
    "Modal is positioned in the viewport above the animated layout",
  )
  await click("Cancel")
  await waitFor("!document.querySelector('[role=dialog]')")
  await screenshot("owner-mobile.png")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await fault(
    "PUT",
    `${ownerPath}/experiences/${(await control("state")).experiences[0].experience_id}`,
    { status: 422, field: "skill_ids", code: "BUSINESS_RULE_VIOLATION" },
  )
  await clickLabel("Edit Profile API integration")
  await input("description", "Unsaved after 422")
  await click("Save experience")
  await waitFor(text("Check the highlighted fields."))
  await check(
    'document.querySelector("textarea[name=description]").value === "Unsaved after 422"',
    "422 keeps the form draft for correction",
  )
  await check(
    `!${text("private-stack-trace-canary")}`,
    "API exceptions are not exposed as raw stack traces",
  )
  await click("Cancel")
  await waitFor("!document.querySelector('[role=dialog]')")
  await fault("GET", `${ownerPath}/certificates`, { status: 500 })
  await go("/profile")
  await waitFor(text("Retry certificates"))
  await check(
    `${text("Profile API integration")} && ${text("Updated Student")}`,
    "A failed certificate GET does not hide the profile or experiences",
  )
  await fault("GET", `${ownerPath}/certificates`, null)
  await click("Retry certificates")
  await waitFor(text("Cloud Foundations"))
  pass("A failed collection recovers through its own retry action")

  state = await control("state")
  const expPath = `${ownerPath}/experiences/${state.experiences[0].experience_id}`
  await fault("DELETE", expPath, { status: 404, code: "NOT_FOUND" })
  await clickLabel("Delete Profile API integration")
  await click("Confirm delete")
  await waitFor(text("This profile or item is unavailable"))
  assert.equal((await control("state")).experiences.length, 1)
  pass("404 owner violation preserves the visible item and reports the failure")
  await fault("DELETE", expPath, null)
  await click("Confirm delete")
  await waitFor("!document.querySelector('[role=dialog]')")
  await waitFor(text("No experiences yet"))
  await clickLabel("Delete Cloud Foundations")
  await click("Confirm delete")
  await waitFor(text("No certificates yet"))
  assert.equal((await control("state")).certificates.length, 0)
  pass(
    "Both DELETE paths accept bodyless 204 responses and return to empty states",
  )

  await go("/settings")
  await waitFor(text("Email address"))
  await check(
    'document.querySelector("input[type=email]").readOnly',
    "Settings cannot write a local-only login email",
  )
  await go("/ai")
  await waitFor(text("Build your profile with AI"))
  const beforeAiDraft = mutations().length
  await evaluate(`(() => {
    const fields = document.querySelectorAll('main textarea');
    for (const [index, value] of [[0, 'React'], [1, 'Synthetic AI draft project']]) {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(fields[index], value);
      fields[index].dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`)
  await click("Generate profile")
  await waitFor(text("Demo summary generated"))
  assert.equal(mutations().length, beforeAiDraft)
  await check(
    text("Updated Student"),
    "AI Studio demo generation does not mutate the server-backed profile",
  )
  await fault("GET", `${ownerPath}/experiences`, { disconnect: true })
  await go("/profile")
  await waitFor(text("Retry experiences"))
  pass("A disconnected HTTP dependency produces a recoverable resource error")
  await fault("GET", `${ownerPath}/experiences`, {
    status: 403,
    code: "ONBOARDING_REQUIRED",
  })
  await click("Retry experiences")
  await waitFor('location.pathname === "/onboarding"')
  pass("403 ONBOARDING_REQUIRED uses the existing onboarding redirect")
  await fault("GET", `${ownerPath}/experiences`, {
    status: 401,
    code: "AUTH_UNAUTHORIZED",
  })
  await go("/profile")
  await waitFor('location.pathname === "/login"')
  await check(
    'localStorage.getItem("tindy_access_token") === null',
    "Expired JWT clears the session and returns to sign-in",
  )
  await token()
  await fault("GET", `${ownerPath}/experiences`, {
    status: 403,
    code: "AUTH_FORBIDDEN",
  })
  await go("/profile")
  await waitFor('location.pathname === "/login"')
  pass("403 AUTH_FORBIDDEN uses the existing unavailable-session handling")
  assert.ok(
    calls
      .filter((call) => call.path.startsWith("/api/"))
      .every((call) => call.authorization === "Bearer synthetic-profile-token"),
  )
  pass("All profile and catalog requests carry the existing Bearer token")
  assert.equal(browser.exceptions.length, 0, JSON.stringify(browser.exceptions))
  assert.equal(
    browser.consoleErrors.filter((message) =>
      /Warning:|Each child|React does not recognize|Encountered two children/.test(
        message,
      ),
    ).length,
    0,
  )
  pass("No uncaught browser exceptions or React key/prop warnings")
  assert.ok(
    simLog.includes('"request"'),
    "Simulation logs show the dependency was reached",
  )
  const events = simLog.split(/\r?\n/).filter(line => line.startsWith("{")).map(line => JSON.parse(line)).filter(event => event.event === "request" && event.path.startsWith("/api/"))
  assert.ok([200, 201, 204, 400, 401, 403, 404, 422, 500].every(status => events.some(event => event.statusCode === status)))
  assert.ok(!events.some(event => event.statusCode === 501 && event.path.includes("/profile")))
  pass("Simulation evidence confirms the expected success/error statuses and no unsupported Profile routes")
  console.log(
    `Profile browser verification: ${checks} checks passed; ${calls.length} real HTTP frontend requests through Postman simulation. No live backend/PostgreSQL exercised.`,
  )
} finally {
  await mkdir(".tmp-profile-verification", { recursive: true })
  await writeFile(".tmp-profile-verification/simulation.ndjson", simLog)
  if (simErrors)
    await writeFile(".tmp-profile-verification/simulation.err", simErrors)
  await browser?.close()
  if (vite) await vite.close()
  if (simulation?.pid && simulation.exitCode == null) {
    if (process.platform === "win32")
      await new Promise((resolve) => {
        const stop = spawn(
          "taskkill",
          ["/PID", String(simulation.pid), "/T", "/F"],
          { windowsHide: true, stdio: "ignore" },
        )
        stop.on("exit", resolve)
        stop.on("error", resolve)
      })
    else simulation.kill("SIGINT")
  }
}
