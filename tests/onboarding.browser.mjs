// Mocked browser regression checks; no requests reach the real backend.
// Uses installed Chrome (or CHROME_PATH) and Node's built-in CDP/WebSocket APIs.
import { createServer } from "vite"
import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import assert from "node:assert/strict"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const server = await createServer({
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') },
  server: { port: 0, host: "127.0.0.1", strictPort: false },
})
await server.listen()
const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
const profileDir = await mkdtemp(path.join(tmpdir(), "tindy-browser-"))
const chrome = spawn(
  process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
  ],
  { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
)

let count = 0
let ws
const pending = new Map()
let sequence = 0
const requests = []
const pageErrors = []
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const skills = Array.from({ length: 32 }, (_, i) => ({
  skill_id: uuid(i + 1),
  name: i === 0 ? "PostgreSQL" : i === 1 ? "React" : `Catalog skill ${i + 1}`,
}))
const categories = [
  {
    category_id: uuid(100),
    name: "Backend Development",
    description: null,
    display_order: 1,
  },
  {
    category_id: uuid(101),
    name: "Frontend Development",
    description: "Browser technologies",
    display_order: 2,
  },
]
const roles = [
  {
    professional_role_id: uuid(200),
    name: "Security Researcher",
    description: "Investigate application security",
    display_order: 1,
  },
  {
    professional_role_id: uuid(201),
    name: "Data Engineer",
    description: null,
    display_order: 2,
  },
]
const user = {
  user_id: uuid(900),
  display_name: "Actual Student",
  university: "Entered University",
  email: "actual@example.com",
  username: "actual_student",
  status: "active",
  roles: [],
  is_onboarding_completed: false,
}
const initialDraft = () => ({
  total_steps: 8,
  completed_steps: [1],
  current_step: 2,
  is_onboarding_completed: false,
  step_data: {
    1: {
      username: "actual_student",
      display_name: "Actual Student",
      university: "Entered University",
    },
    2: { skill_ids: [skills[0].skill_id], skills: [skills[0]] },
    3: {
      preferred_role_id: roles[0].professional_role_id,
      preferred_role: roles[0].name,
    },
    4: {
      professional_interests: "Security and data",
      learning_goals: "Build reliable software",
    },
    5: { available_hours_per_week: 12 },
    6: {
      previous_projects_and_contribution: "Built a course project",
      technologies_to_learn: "Distributed systems",
    },
    7: { github_url: "https://github.com/student", personal_website_url: null },
    8: { bio: null },
  },
})
let draft = initialDraft()
let saveFailure = null
let draftFailure = null
let skillsFailure = null
let rolesFailure = null
let categoriesFailure = null
let completionFailure = null
let loginCompleted = false
let slowSearch = false
let saveEnvelopeFailure = null
let networkFailure = false

function send(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.text +
        ": " +
        result.exceptionDetails.exception?.description,
    )
  return result.result.value
}
async function waitFor(expression, message) {
  for (let i = 0; i < 80; i++) {
    if (await evaluate(expression)) return
    await delay(75)
  }
  throw new Error(
    `Timed out: ${message}\n${await evaluate("document.body.innerText")}`,
  )
}
async function check(expression, message) {
  assert.ok(await evaluate(expression), message)
  console.log(`PASS ${++count}: ${message}`)
}
const hasText = (text) =>
  `document.body.innerText.includes(${JSON.stringify(text)})`
async function clickText(text, selector = "button") {
  await evaluate(
    `(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!el) throw Error('Missing button: ' + ${JSON.stringify(text)}); el.click() })()`,
  )
  await delay(30)
}
async function input(selector, value) {
  await evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw Error('Missing input ' + ${JSON.stringify(selector)}); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); })()`,
  )
  await delay(25)
}
async function go(url = "/onboarding") {
  await send("Page.navigate", { url: `${origin}${url}` })
  await waitFor(
    'document.readyState === "complete" && Boolean(document.querySelector("#root")?.children.length)',
    "page loaded",
  )
}
async function readySkills() {
  await waitFor(
    'document.querySelectorAll(".catalog-skill-option").length > 0',
    "skills loaded",
  )
}
async function intercept(event) {
  const { request, requestId } = event
  const url = new URL(request.url)
  const body = request.postData ? JSON.parse(request.postData) : null
  requests.push({
    path: url.pathname,
    query: url.searchParams,
    method: request.method,
    body,
    headers: request.headers,
  })
  if (networkFailure && url.pathname === "/api/catalog/skills") {
    try {
      await send("Fetch.failRequest", {
        requestId,
        errorReason: "ConnectionFailed",
      })
    } catch {
      /* A request may have been aborted by navigation or a newer fetch */
    }
    return
  }
  let data = null
  let failure = null
  if (url.pathname === "/api/me") data = user
  else if (url.pathname === "/api/me/onboarding" && request.method === "GET") {
    data = draft
    failure = draftFailure
  } else if (url.pathname === "/api/catalog/skill-categories") {
    data = categories
    failure = categoriesFailure
  } else if (url.pathname === "/api/catalog/skills") {
    failure = skillsFailure
    const search = url.searchParams.get("search") || ""
    if (search === "slow" && slowSearch) await delay(1000)
    data = skills.filter(
      (skill) =>
        (!url.searchParams.get("category_id") ||
          url.searchParams.get("category_id") !== uuid(101) ||
          skill.name === "React") &&
        skill.name.toLowerCase().includes(search.toLowerCase()),
    )
  } else if (url.pathname === "/api/catalog/professional-roles") {
    data = roles
    failure = rolesFailure
  } else if (/\/api\/me\/onboarding\/[1-7]$/.test(url.pathname)) {
    failure = saveFailure
    const step = Number(url.pathname.at(-1))
    if (!failure) {
      draft.completed_steps = [...new Set([...draft.completed_steps, step])]
      draft.current_step = Math.min(8, step + 1)
      draft.step_data[String(step)] =
        step === 2
          ? {
              ...body,
              skills: skills.filter((skill) =>
                body.skill_ids.includes(skill.skill_id),
              ),
            }
          : step === 3
            ? {
                ...body,
                preferred_role: roles.find(
                  (role) =>
                    role.professional_role_id === body.preferred_role_id,
                )?.name,
              }
            : body
    }
    data = {
      saved_step: step,
      completed_steps: draft.completed_steps,
      next_step: step + 1,
      is_onboarding_completed: false,
    }
  } else if (url.pathname === "/api/me/onboarding/complete") {
    failure = completionFailure
    data = {
      is_onboarding_completed: true,
      completed_steps: [1, 2, 3, 4, 5, 6, 7, 8],
      redirect_to: "/discover",
    }
  } else if (
    url.pathname === "/api/auth/register" ||
    url.pathname === "/api/auth/login"
  ) {
    data = {
      access_token: "mock-token",
      token_type: "Bearer",
      expires_in: 3600,
      user: { ...user, is_onboarding_completed: loginCompleted },
      redirect_to: loginCompleted ? "/discover" : "/onboarding",
    }
  } else {
    failure = { status: 404, detail: "Unexpected test API call" }
  }
  const response = failure ||
    (/\/api\/me\/onboarding\/[1-7]$/.test(url.pathname) &&
      saveEnvelopeFailure) || {
      success: true,
      message: "Mocked contract response",
      data,
    }
  try {
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: failure?.status || 200,
      responseHeaders: [
        {
          name: "Content-Type",
          value: failure ? "application/problem+json" : "application/json",
        },
      ],
      body: Buffer.from(JSON.stringify(response)).toString("base64"),
    })
  } catch {
    /* A request may have been aborted by a newer search. */
  }
}

try {
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = ""
    const timeout = setTimeout(
      () => reject(new Error("Chrome startup timed out: " + stderr)),
      15000,
    )
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })
    chrome.once("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    chrome.once("exit", (code) => {
      clearTimeout(timeout)
      reject(new Error(`Chrome exited ${code}: ${stderr}`))
    })
  })
  const debugUrl = new URL(endpoint)
  const targets = await fetch(`http://${debugUrl.host}/json/list`).then(
    (response) => response.json(),
  )
  const target = targets.find((target) => target.type === "page")
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve) =>
    ws.addEventListener("open", resolve, { once: true }),
  )
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const entry = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) entry?.reject(new Error(JSON.stringify(message.error)))
      else entry?.resolve(message.result)
    } else if (message.method === "Fetch.requestPaused")
      void intercept(message.params)
    else if (message.method === "Runtime.exceptionThrown")
      pageErrors.push(message.params.exceptionDetails)
  })
  await send("Page.enable")
  await send("Runtime.enable")
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }],
  })
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `if (['/login', '/register'].includes(location.pathname)) localStorage.removeItem('tindy_access_token'); else localStorage.setItem('tindy_access_token', 'mock-token')`,
  })
  await go()
  await readySkills()
  await check(
    hasText("1 / 30") + " && " + hasText("PostgreSQL"),
    "Restores saved UUID and skill name without demo selections",
  )
  await check(
    `document.querySelector('.skill-category-filter').getBoundingClientRect().x > document.querySelector('.skill-selector-main').getBoundingClientRect().x`,
    "Desktop category filters appear on the right",
  )
  await clickText("Frontend Development")
  await waitFor(
    'document.querySelectorAll(".catalog-skill-option").length === 1',
    "category filter results",
  )
  await check(
    hasText("1 / 30") +
      ` && Boolean(document.querySelector('[aria-label="Remove PostgreSQL"]'))`,
    "Category filtering preserves selection",
  )
  await clickText("React", ".catalog-skill-option")
  await check(hasText("2 / 30"), "Selects multiple unique skills")
  await input('[aria-label="Search skills"]', "no matches")
  await waitFor(hasText("No skills match these filters."), "empty search")
  await check(hasText("2 / 30"), "Empty search retains selected chips")
  await clickText("Clear filters")
  await readySkills()
  await evaluate(
    `document.querySelector('[aria-label="Remove React"]').click()`,
  )
  await waitFor(hasText("1 / 30"), "chip removal")
  await check(
    `!document.querySelector('[aria-label="Remove React"]')`,
    "Removing a chip deselects its skill",
  )
  slowSearch = true
  await input('[aria-label="Search skills"]', "slow")
  await delay(380)
  await input('[aria-label="Search skills"]', "React")
  await waitFor(
    'document.querySelectorAll(".catalog-skill-option").length === 1 && document.querySelector(".catalog-skill-option").textContent.includes("React")',
    "newer search",
  )
  await delay(1050)
  await check(
    'document.querySelectorAll(".catalog-skill-option").length === 1 && document.querySelector(".catalog-skill-option").textContent.includes("React")',
    "A slow stale response cannot overwrite a newer search",
  )
  await clickText("React", ".catalog-skill-option")
  await clickText("Continue")
  await waitFor(hasText("Security Researcher"), "role catalog")
  const save2 = requests.findLast(
    (request) => request.path === "/api/me/onboarding/2",
  )
  assert.deepEqual(save2.body, {
    skill_ids: [skills[0].skill_id, skills[1].skill_id],
  })
  assert.equal(
    Object.entries(save2.headers).find(
      ([name]) => name.toLowerCase() === "authorization",
    )?.[1],
    "Bearer mock-token",
  )
  console.log(
    `PASS ${++count}: Step 2 sends unique UUIDs with JWT authorization`,
  )
  await check(
    'document.querySelector(".catalog-role-options button.selected").textContent.includes("Security Researcher")',
    "Restores role UUID and loads API-provided role description",
  )
  await clickText("Back")
  await readySkills()
  await check(hasText("2 / 30"), "Back navigation preserves skill selections")
  await clickText("Continue")
  await waitFor(hasText("Security Researcher"), "roles reloaded")
  await clickText("Continue")
  await waitFor(
    'document.querySelector("h1")?.textContent === "Availability"',
    "step 4",
  )
  assert.deepEqual(
    requests.findLast((request) => request.path === "/api/me/onboarding/3")
      .body,
    { preferred_role_id: roles[0].professional_role_id },
  )
  console.log(`PASS ${++count}: Step 3 sends the actual professional role UUID`)
  await waitFor(
    'document.querySelector("input[type=number]")?.value === "12"',
    "availability",
  )
  await clickText("Continue")
  await waitFor(
    'document.querySelector("h1")?.textContent === "Interests & Goals"',
    "step 5",
  )
  await check(
    'document.querySelector("textarea").value === "Security and data"',
    "Restores saved interests and learning goals",
  )
  await clickText("Continue")
  await waitFor(
    'document.querySelector("textarea")?.value === "Built a course project"',
    "experience",
  )
  await clickText("Continue")
  await waitFor(
    'document.querySelector("input[type=url]")?.value === "https://github.com/student"',
    "links",
  )
  await clickText("Continue")
  await waitFor(hasText("YOUR PROFILE BIO"), "bio")
  await check(
    'document.querySelector("textarea").value === ""',
    "Step 7 does not fabricate a Bio; empty Bio is allowed",
  )
  await evaluate('document.querySelector("input[type=checkbox]").click()')
  await clickText("Confirm & finish")
  await waitFor('location.pathname === "/discover"', "completion redirect")
  assert.deepEqual(
    requests.findLast(
      (request) => request.path === "/api/me/onboarding/complete",
    ).body,
    { confirmed: true, bio: null },
  )
  console.log(
    `PASS ${++count}: Completion sends bio:null and redirects to /discover`,
  )

  draft.current_step = 3
  await go()
  await waitFor(
    'Boolean(document.querySelector(".catalog-role-options button.selected"))',
    "refreshed role",
  )
  await check(
    'document.querySelector(".catalog-role-options button.selected").textContent.includes("Security Researcher")',
    "Page reload restores backend current step and selected role",
  )
  await clickText("Back")
  await readySkills()
  await check(
    hasText("2 / 30") +
      ' && document.querySelectorAll("li.complete").length >= 2',
    "Refresh restores saved skills and completed-step markers",
  )

  saveFailure = { status: 422, detail: "A selected skill is inactive." }
  await clickText("Continue")
  await waitFor(hasText("A selected skill is inactive."), "422 error")
  await check(
    'document.querySelector("h1").textContent === "Technical skills" && document.querySelectorAll(".selected-skill-chips button").length === 2',
    "HTTP 422 remains on the form and preserves selections",
  )
  saveFailure = {
    status: 400,
    errors: {
      skill_ids: ["Select an active skill.", "Do not submit duplicate IDs."],
    },
  }
  await clickText("Continue")
  await waitFor(
    hasText("Select an active skill. Do not submit duplicate IDs."),
    "400 validation",
  )
  console.log(
    `PASS ${++count}: HTTP 400 field validation messages are displayed`,
  )
  saveFailure = {
    status: 409,
    detail: "Your profile has a conflicting update.",
  }
  await clickText("Continue")
  await waitFor(
    hasText("Your profile has a conflicting update."),
    "409 conflict",
  )
  console.log(
    `PASS ${++count}: HTTP 409 conflicts are displayed without advancing`,
  )
  saveFailure = null
  saveEnvelopeFailure = {
    success: false,
    message: "The operation could not be saved.",
    data: null,
  }
  await clickText("Continue")
  await waitFor(hasText("The operation could not be saved."), "failed envelope")
  console.log(
    `PASS ${++count}: A failed HTTP 200 envelope cannot advance the form`,
  )
  saveEnvelopeFailure = { message: "Malformed envelope" }
  await clickText("Continue")
  await waitFor(hasText("Invalid server response."), "malformed envelope")
  console.log(
    `PASS ${++count}: Malformed HTTP 200 responses cannot advance the form`,
  )
  saveEnvelopeFailure = null
  saveFailure = {
    status: 403,
    error_code: "ONBOARDING_REQUIRED",
    detail: "Complete onboarding",
  }
  await clickText("Continue")
  await waitFor(hasText("Your session is still active."), "onboarding-required")
  await check(
    'localStorage.getItem("tindy_access_token") === "mock-token"',
    "ONBOARDING_REQUIRED 403 does not expire the JWT",
  )
  saveFailure = { status: 401, detail: "Expired" }
  await clickText("Continue")
  await waitFor('location.pathname === "/login"', "expired token redirects to login")
  await waitFor('Boolean(document.querySelector("input[name=identifier]"))', "sign-in form mounts after redirect")
  await check(
    'localStorage.getItem("tindy_access_token") === null && Boolean(document.querySelector("input[name=identifier]"))',
    "HTTP 401 clears the token/auth state and redirects to sign-in",
  )
  saveFailure = null

  draft = initialDraft()
  draft.step_data["2"] = { skill_ids: [], skills: [] }
  await go()
  await readySkills()
  await check(
    '[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Continue").disabled',
    "Empty skill selection cannot continue",
  )
  draft.step_data["2"] = {
    skill_ids: [skills[0].skill_id, skills[0].skill_id],
    skills: [skills[0]],
  }
  await go()
  await readySkills()
  await check(
    hasText("1 / 30"),
    "Duplicate saved skill IDs are restored only once",
  )
  draft.step_data["2"] = {
    skill_ids: skills.slice(0, 30).map((skill) => skill.skill_id),
    skills: skills.slice(0, 30),
  }
  await go()
  await readySkills()
  await check(
    'document.querySelectorAll(".selected-skill-chips button").length === 30 && [...document.querySelectorAll(".catalog-skill-option")].filter(button => button.disabled).length === 2',
    "Selection limit disables additional skills at 30",
  )
  await evaluate(
    'document.querySelector(".selected-skill-chips button").click()',
  )
  await waitFor(hasText("29 / 30"), "remove at limit")
  await check(
    '[...document.querySelectorAll(".catalog-skill-option")].every(button => !button.disabled)',
    "Removing at the limit allows another skill",
  )
  draft.step_data["2"] = {
    skill_ids: [uuid(999)],
    skills: [{ skill_id: uuid(999), name: "Retired skill" }],
  }
  await go()
  await readySkills()
  await check(
    hasText("Retired skill (unavailable)") +
      ' && [...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Continue").disabled',
    "Inactive saved skills are labeled and blocked without replacement IDs",
  )
  draft.current_step = 3
  draft.step_data["3"] = {
    preferred_role_id: uuid(999),
    preferred_role: "Retired role",
  }
  await go()
  await waitFor(hasText("Your saved role, Retired role,"), "inactive role")
  await check(
    '[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Continue").disabled',
    "Inactive saved roles require an active replacement",
  )

  draft = initialDraft()
  draftFailure = { status: 500, detail: "Draft unavailable" }
  await go()
  await waitFor(hasText("Unable to load your progress"), "draft failure")
  await check(
    '!document.querySelector("form")',
    "Draft failure blocks editing rather than loading demo data",
  )
  draftFailure = null
  await clickText("Retry")
  await readySkills()
  console.log(`PASS ${++count}: Draft retry loads saved progress`)
  skillsFailure = { status: 503, detail: "Skills unavailable" }
  categoriesFailure = { status: 503, detail: "Categories unavailable" }
  await go()
  await waitFor(
    hasText("Skills unavailable") + " && " + hasText("Categories unavailable"),
    "catalog errors",
  )
  skillsFailure = null
  categoriesFailure = null
  await clickText("Retry skills")
  await clickText("Retry categories")
  await readySkills()
  await waitFor(hasText("Frontend Development"), "category retry completes independently")
  await check(
    hasText("Frontend Development"),
    "Skill and category failures support independent retry",
  )
  networkFailure = true
  await go()
  await waitFor(hasText("Unable to connect to the server."), "network failure")
  await check(
    '[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Continue").disabled',
    "Network failure is visible and blocks skill submission",
  )
  networkFailure = false
  await clickText("Retry skills")
  await readySkills()
  rolesFailure = { status: 503, detail: "Roles unavailable" }
  draft.current_step = 3
  await go()
  await waitFor(hasText("Roles unavailable"), "roles failure")
  rolesFailure = null
  await clickText("Retry roles")
  await waitFor(hasText("Security Researcher"), "roles retry")
  console.log(`PASS ${++count}: Role loading failures can be retried`)

  draft.current_step = 8
  draft.completed_steps = [1, 2, 3, 4, 5, 6, 7]
  draft.step_data["8"] = { bio: "Saved personal bio" }
  await go()
  await waitFor(
    'document.querySelector("textarea")?.value === "Saved personal bio"',
    "saved bio",
  )
  await input("textarea", "Edited personal bio")
  await evaluate('document.querySelector("input[type=checkbox]").click()')
  completionFailure = {
    status: 422,
    error_code: "ONBOARDING_INCOMPLETE",
    missing_steps: [4, 6],
    detail: "Missing steps",
  }
  await clickText("Confirm & finish")
  await waitFor(hasText("Missing steps: 4, 6"), "missing steps")
  await check(
    'document.querySelector("textarea").value === "Edited personal bio" && location.pathname === "/onboarding"',
    "Completion validation displays missing steps and retains an edited Bio",
  )
  completionFailure = null

  draft = initialDraft()
  await go("/register")
  await waitFor(
    'Boolean(document.querySelector("input[name=university]"))',
    "register",
  )
  await input("input[name=name]", "Student Name")
  await input("input[name=university]", "Custom Technical University")
  await input("input[name=email]", "student@example.com")
  await input("input[name=password]", "ValidPassword123!")
  await input("input[name=confirmPassword]", "DifferentPassword123!")
  await evaluate('document.querySelector("input[name=accept_terms]").click()')
  const previousRegisters = requests.filter(
    (request) => request.path === "/api/auth/register",
  ).length
  await clickText("Create account")
  await waitFor(hasText("Passwords do not match."), "password confirmation")
  assert.equal(
    requests.filter((request) => request.path === "/api/auth/register").length,
    previousRegisters,
  )
  console.log(
    `PASS ${++count}: Registration password confirmation blocks mismatched passwords`,
  )
  await input("input[name=confirmPassword]", "ValidPassword123!")
  await clickText("Create account")
  await waitFor('location.pathname === "/onboarding"', "register redirect")
  assert.equal(
    requests.findLast((request) => request.path === "/api/auth/register").body
      .university,
    "Custom Technical University",
  )
  console.log(
    `PASS ${++count}: Registration submits the entered University and navigates to onboarding`,
  )
  for (const identifier of ["actual_student", "actual@example.com"]) {
    await go("/login")
    await waitFor(
      'Boolean(document.querySelector("input[name=identifier]"))',
      "login",
    )
    await input("input[name=identifier]", identifier)
    await input("input[name=password]", "ValidPassword123!")
    await clickText("Sign in")
    await waitFor('location.pathname === "/onboarding"', "login redirect")
    assert.equal(
      requests.findLast((request) => request.path === "/api/auth/login").body
        .identifier,
      identifier,
    )
  }
  console.log(
    `PASS ${++count}: Login submits email or username and resumes incomplete onboarding`,
  )
  loginCompleted = true
  await go("/login")
  await waitFor(
    'Boolean(document.querySelector("input[name=identifier]"))',
    "completed login",
  )
  await input("input[name=identifier]", "actual_student")
  await input("input[name=password]", "ValidPassword123!")
  await clickText("Sign in")
  await waitFor('location.pathname === "/discover"', "completed login redirect")
  console.log(`PASS ${++count}: Completed login respects backend redirect_to`)

  draft = initialDraft()
  await go()
  await readySkills()
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await delay(100)
  await check(
    'document.documentElement.scrollWidth <= innerWidth && getComputedStyle(document.querySelector(".skill-category-options")).overflowX === "auto"',
    "Mobile uses horizontally scrollable categories without page overflow",
  )
  if (process.env.VERIFY_SCREENSHOTS_DIR) {
    const mobileShot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await writeFile(
      path.join(process.env.VERIFY_SCREENSHOTS_DIR, "mobile.png"),
      Buffer.from(mobileShot.data, "base64"),
    )
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  if (process.env.VERIFY_SCREENSHOTS_DIR) {
    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    })
    await writeFile(
      path.join(process.env.VERIFY_SCREENSHOTS_DIR, "desktop.png"),
      Buffer.from(desktopShot.data, "base64"),
    )
  }
  assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors))
  console.log(`PASS ${++count}: No uncaught browser exceptions`)
  console.log(
    `Mocked browser verification: ${count} checks passed; ${requests.length} intercepted API calls. No live backend was exercised.`,
  )
} finally {
  ws?.close()
  chrome.kill()
  await server.close()
  await delay(500)
  const cleanupProfile = path.resolve(profileDir)
  if (path.dirname(cleanupProfile) !== path.resolve(tmpdir()) || !path.basename(cleanupProfile).startsWith('tindy-browser-')) {
    throw new Error('Refusing to remove an unexpected browser profile path')
  }
  await rm(cleanupProfile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  })
}
