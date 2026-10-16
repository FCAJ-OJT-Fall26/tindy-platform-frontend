// Real React/StrictMode + fetch/CORS against an HTTP stand-in derived from the
// backend STEP07/08 contract. No Google/GitHub or live Tindy requests are made.
import { createServer as createViteServer } from "vite"
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import assert from "node:assert/strict"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const tokenA = "synthetic-tindy-session-a"
const tokenB = "synthetic-tindy-session-b"
const oauthToken = "synthetic-oauth-session"
const ticket = (n) => Buffer.alloc(32, n).toString("base64url")
const userA = {
  user_id: "00000000-0000-4000-8000-000000000001",
  display_name: "Auth Student",
  university: "FPT University",
  email: "auth@example.com",
  username: "auth_student",
  status: "active",
  roles: ["member"],
  is_onboarding_completed: true,
}
let me = { ...userA }
let oauthUser = { ...userA, email: null, university: null, username: null }
let connections = {
  has_local_password: true,
  providers: [
    {
      provider: "Google",
      provider_username: null,
      linked_at: "2026-10-16T00:00:00Z",
    },
  ],
}
let origin = ""
let exchangeFailure = null
let startFailure = null
let malformed = false
let networkFailure = false
let denyCors = false
let exchangeDelay = 0
let meDelay = 0
let logoutFailure = false
let invalidMe = false
let suspendedMe = false
let invalidConnectionsJwt = false
let maliciousAuthorization = false
let localCompleted = true
let nextLoginTicket = ticket(1)
let nextLinkTicket = ticket(2)
let linkOwner = null
const consumed = new Set()
const calls = []
const logs = []
const pageErrors = []
let checks = 0
let ws
let chrome
let vite
let profileDir
const pending = new Map()
let sequence = 0

function userFor(request) {
  const authorization = request.headers.authorization
  if (authorization === `Bearer ${tokenB}`)
    return { ...userA, user_id: "00000000-0000-4000-8000-000000000002" }
  if (authorization === `Bearer ${oauthToken}`) return oauthUser
  if (authorization === `Bearer ${tokenA}`) return me
  return null
}
const problem = (status, error_code, detail = "private-upstream-canary") => ({
  status,
  title: "Request failed",
  detail,
  error_code,
})
const envelope = (data) => ({
  success: true,
  message: "Contract fixture response",
  data,
})
const session = (user, access_token = tokenA) => ({
  access_token,
  token_type: "Bearer",
  expires_in: 3600,
  user,
  redirect_to: user.is_onboarding_completed ? "/discover" : "/onboarding",
})

const backend = createServer(async (request, response) => {
  const url = new URL(request.url, "http://fixture.invalid")
  if (!denyCors && request.headers.origin === origin) {
    response.setHeader("Access-Control-Allow-Origin", origin)
    response.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,content-type",
    )
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,DELETE,OPTIONS",
    )
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204).end()
    return
  }
  let raw = ""
  for await (const chunk of request) raw += chunk
  const body = raw ? JSON.parse(raw) : null
  calls.push({
    path: url.pathname,
    method: request.method,
    body,
    authorization: request.headers.authorization,
  })
  const reply = (status, value) => {
    response.writeHead(status, {
      "Content-Type":
        status >= 400 ? "application/problem+json" : "application/json",
      "Cache-Control": "no-store",
    })
    response.end(JSON.stringify(value))
  }
  const redirect = (value) => {
    response
      .writeHead(302, { Location: value, "Cache-Control": "no-store" })
      .end()
  }
  const user = userFor(request)
  if (url.pathname === "/api/me") {
    if (meDelay) await delay(meDelay)
    if (invalidMe || !user) return reply(401, problem(401, "AUTH_UNAUTHORIZED"))
    if (suspendedMe) return reply(403, problem(403, "AUTH_FORBIDDEN"))
    return reply(200, envelope(user))
  }
  if (
    url.pathname === "/api/auth/login" ||
    url.pathname === "/api/auth/register"
  ) {
    if (body.password !== "Password123!")
      return reply(401, problem(401, "AUTH_INVALID_CREDENTIALS"))
    const local = { ...userA, is_onboarding_completed: localCompleted }
    me = local
    return reply(
      url.pathname.endsWith("register") ? 201 : 200,
      envelope(session(local)),
    )
  }
  if (url.pathname === "/api/auth/logout") {
    if (logoutFailure) return reply(503, problem(503, "INTERNAL_SERVER_ERROR"))
    return reply(200, envelope(null))
  }
  if (
    url.pathname === "/api/auth/google" ||
    url.pathname === "/api/auth/github"
  ) {
    return redirect(`${origin}/auth/oauth/callback#ticket=${nextLoginTicket}`)
  }
  if (url.pathname === "/api/auth/oauth/exchange") {
    if (exchangeDelay) await delay(exchangeDelay)
    if (networkFailure) {
      request.socket.destroy()
      return
    }
    if (exchangeFailure) return reply(exchangeFailure.status, exchangeFailure)
    if (consumed.has(body.ticket))
      return reply(401, problem(401, "AUTH_INVALID_CREDENTIALS"))
    consumed.add(body.ticket)
    if (malformed)
      return reply(
        200,
        envelope({ user: oauthUser, redirect_to: "https://untrusted.example" }),
      )
    return reply(200, envelope(session(oauthUser, oauthToken)))
  }
  if (url.pathname === "/api/auth/connections") {
    if (invalidConnectionsJwt || !user)
      return reply(401, problem(401, "AUTH_UNAUTHORIZED"))
    return reply(200, envelope(connections))
  }
  if (/^\/api\/auth\/connections\/(google|github)\/start$/.test(url.pathname)) {
    if (!user) return reply(401, problem(401, "AUTH_UNAUTHORIZED"))
    if (startFailure) return reply(startFailure.status, startFailure)
    linkOwner = user.user_id
    return reply(
      200,
      envelope({
        authorization_url: maliciousAuthorization
          ? "https://untrusted.example/steal"
          : `http://127.0.0.1:${backend.address().port}${url.pathname.replace("/start", "/challenge")}?request=${ticket(70)}`,
      }),
    )
  }
  if (
    /^\/api\/auth\/connections\/(google|github)\/challenge$/.test(url.pathname)
  ) {
    return redirect(
      `${origin}/auth/oauth/callback#link_ticket=${nextLinkTicket}`,
    )
  }
  if (url.pathname === "/api/auth/connections/confirm") {
    if (!user || user.user_id !== linkOwner || consumed.has(body.link_ticket))
      return reply(401, problem(401, "AUTH_INVALID_CREDENTIALS"))
    consumed.add(body.link_ticket)
    connections.providers.push({
      provider: "GitHub",
      provider_username: "student-github",
      linked_at: "2026-10-16T00:00:00Z",
    })
    return reply(200, envelope({ linked: true, created: true }))
  }
  if (
    request.method === "DELETE" &&
    /^\/api\/auth\/connections\/(google|github)$/.test(url.pathname)
  ) {
    if (!user) return reply(401, problem(401, "AUTH_UNAUTHORIZED"))
    if (!connections.has_local_password && connections.providers.length <= 1)
      return reply(409, problem(409, "CONFLICT"))
    await delay(150)
    const name = url.pathname.endsWith("google") ? "Google" : "GitHub"
    connections.providers = connections.providers.filter(
      (provider) => provider.provider !== name,
    )
    return reply(200, envelope(null))
  }
  if (url.pathname === "/api/me/onboarding")
    return reply(
      200,
      envelope({
        total_steps: 8,
        completed_steps: [],
        current_step: 1,
        is_onboarding_completed: false,
        step_data: {},
      }),
    )
  if (url.pathname.startsWith("/api/catalog/")) return reply(200, envelope([]))
  return reply(501, problem(501, "FIXTURE_ENDPOINT_NOT_DEFINED"))
})

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Browser command timed out: ${method}`))
    }, 15_000)
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })
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
    throw new Error("Browser evaluation failed (details withheld)")
  return result.result.value
}
async function waitFor(expression, description) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await evaluate(expression)) return
    await delay(75)
  }
  throw new Error(`Timed out: ${description}`)
}
async function check(expression, description) {
  assert.ok(await evaluate(expression), description)
  console.log(`PASS ${++checks}: ${description}`)
}
function pass(description) {
  console.log(`PASS ${++checks}: ${description}`)
}
const hasText = (value) =>
  `document.body.innerText.includes(${JSON.stringify(value)})`
const countCalls = (pathname) =>
  calls.filter((call) => call.path === pathname).length
async function click(text, selector = "button") {
  await waitFor(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].some(el => el.textContent.trim() === ${JSON.stringify(text)} && !el.disabled)`,
    "button is ready",
  )
  await evaluate(
    `(() => { const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button'); button.click() })()`,
  )
  await delay(40)
}
async function clickLabel(label) {
  await waitFor(
    `Boolean(document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)}))`,
    "account action is ready",
  )
  await evaluate(
    `document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)}).click()`,
  )
  await delay(40)
}
async function input(selector, value) {
  await evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  )
}
async function go(route) {
  await send("Page.navigate", { url: `${origin}${route}` })
  await waitFor(
    'document.readyState === "complete" && Boolean(document.querySelector("#root")?.children.length)',
    "React mounted",
  )
}
async function setToken(token) {
  await evaluate(
    token === null
      ? 'localStorage.removeItem("tindy_access_token")'
      : `localStorage.setItem('tindy_access_token', ${JSON.stringify(token)})`,
  )
}
async function clean(route = "/login") {
  await evaluate("localStorage.clear(); sessionStorage.clear()")
  me = { ...userA }
  oauthUser = { ...userA, email: null, university: null, username: null }
  exchangeFailure = null
  startFailure = null
  malformed = false
  networkFailure = false
  denyCors = false
  exchangeDelay = 0
  meDelay = 0
  invalidMe = false
  suspendedMe = false
  logoutFailure = false
  invalidConnectionsJwt = false
  maliciousAuthorization = false
  await go(route)
}
async function noLeaks(secret) {
  await check(
    `!location.href.includes(${JSON.stringify(secret)}) && !document.body.innerText.includes(${JSON.stringify(secret)}) && !JSON.stringify(history.state).includes(${JSON.stringify(secret)})`,
    "Sensitive callback values stay out of URL, history state and UI",
  )
  assert.ok(
    !logs.some((log) => log.includes(secret)),
    "No sensitive callback console output",
  )
}
async function screenshot(name) {
  if (!process.env.VERIFY_SCREENSHOTS_DIR) return
  await mkdir(process.env.VERIFY_SCREENSHOTS_DIR, { recursive: true })
  const capture = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  })
  await writeFile(
    path.join(process.env.VERIFY_SCREENSHOTS_DIR, name),
    Buffer.from(capture.data, "base64"),
  )
}

try {
  await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve))
  const backendOrigin = `http://127.0.0.1:${backend.address().port}`
  vite = await createViteServer({
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(backendOrigin),
    },
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  })
  await vite.listen()
  origin = vite.resolvedUrls.local[0].replace(/\/$/, "")
  profileDir = await mkdtemp(path.join(tmpdir(), "tindy-auth-browser-"))
  console.log("Auth fixture listening; starting isolated headless Chrome.")
  chrome = spawn(
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
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = ""
    const timeout = setTimeout(
      () => reject(new Error("Chrome startup timed out")),
      15_000,
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
      reject(new Error(`Chrome exited ${code}`))
    })
  })
  const targets = await fetch(
    `http://${new URL(endpoint).host}/json/list`,
  ).then((response) => response.json())
  ws = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl,
  )
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Chrome debugging connection timed out")),
      15_000,
    )
    ws.addEventListener(
      "open",
      () => {
        clearTimeout(timeout)
        resolve()
      },
      { once: true },
    )
    ws.addEventListener(
      "error",
      () => {
        clearTimeout(timeout)
        reject(new Error("Chrome debugging connection failed"))
      },
      { once: true },
    )
  })
  console.log("Chrome debugging connected; running auth scenarios.")
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const entry = pending.get(message.id)
      pending.delete(message.id)
      if (message.error)
        entry?.reject(new Error("Browser protocol request failed"))
      else entry?.resolve(message.result)
    } else if (message.method === "Runtime.exceptionThrown")
      pageErrors.push(message.params.exceptionDetails.text)
    else if (message.method === "Runtime.consoleAPICalled")
      logs.push(message.params.args.map((arg) => arg.value ?? "").join(" "))
  })
  await send("Page.enable")
  await send("Runtime.enable")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await go("/login")

  for (const route of ["/discover", "/settings", "/onboarding"]) {
    await clean(route)
    await waitFor(
      'location.pathname === "/login"',
      "anonymous protected-route redirect",
    )
    pass(`Anonymous ${route} is protected`)
  }
  for (const route of ["/privacypolicy", "/termsofservice", "/register"]) {
    await go(route)
    await check(
      `location.pathname === ${JSON.stringify(route)}`,
      `Public ${route} stays accessible`,
    )
  }

  await clean("/register")
  localCompleted = false
  await input("input[name=name]", "New Student")
  await input("input[name=email]", "new@example.com")
  await input("input[name=password]", "Password123!")
  await input("input[name=confirmPassword]", "Password123!")
  await evaluate('document.querySelector("input[name=accept_terms]").click()')
  await click("Create account")
  await waitFor('location.pathname === "/onboarding"', "local registration")
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)}`,
    "Local registration stores validated session and enters onboarding",
  )
  assert.equal(
    calls.findLast((call) => call.path === "/api/auth/register").body
      .accept_terms,
    true,
  )
  for (const identifier of ["auth@example.com", "auth_student"]) {
    await clean()
    localCompleted = true
    await input("input[name=identifier]", identifier)
    await input("input[name=password]", "Password123!")
    await click("Sign in")
    await waitFor('location.pathname === "/discover"', "local login")
    assert.equal(
      calls.findLast((call) => call.path === "/api/auth/login").body.identifier,
      identifier,
    )
    pass(
      `Local login submits ${
        identifier.includes("@") ? "email" : "username"
      } and respects onboarding state`,
    )
  }

  for (const [provider, number] of [
    ["Google", 10],
    ["GitHub", 11],
  ]) {
    await clean()
    nextLoginTicket = ticket(number)
    oauthUser = { ...oauthUser, is_onboarding_completed: number === 10 }
    const before = countCalls("/api/auth/oauth/exchange")
    await click(provider)
    await waitFor(
      `location.pathname === ${JSON.stringify(number === 10 ? "/discover" : "/onboarding")}`,
      "OAuth button and callback",
    )
    assert.equal(countCalls("/api/auth/oauth/exchange") - before, 1)
    assert.ok(
      calls.some(
        (call) =>
          call.path === `/api/auth/${provider.toLowerCase()}` &&
          call.method === "GET",
      ),
    )
    await check(
      `localStorage.getItem('tindy_access_token') === ${JSON.stringify(oauthToken)}`,
      `${provider} navigation exchanges exactly once under StrictMode`,
    )
    await noLeaks(nextLoginTicket)
    await noLeaks(oauthToken)
  }

  await clean()
  exchangeDelay = 350
  const cleanTicket = ticket(12)
  const beforeClean = countCalls("/api/auth/oauth/exchange")
  await go(`/auth/oauth/callback#ticket=${cleanTicket}`)
  await waitFor(
    `location.pathname === '/auth/oauth/callback' && location.hash === '' && ${hasText("Completing your sign-in")}`,
    "early URL cleanup",
  )
  await noLeaks(cleanTicket)
  await waitFor(
    'location.pathname === "/discover"',
    "delayed exchange completes",
  )
  assert.equal(countCalls("/api/auth/oauth/exchange") - beforeClean, 1)
  pass(
    "URL is cleaned before exchange completes and StrictMode does not replay it",
  )
  await go(`/auth/oauth/callback#ticket=${cleanTicket}`)
  await waitFor(
    hasText("Sign-in expired or could not be verified."),
    "replayed ticket rejected",
  )
  pass("A replay is rejected without navigating to an authenticated screen")

  for (const failure of [
    problem(401, "AUTH_INVALID_CREDENTIALS"),
    problem(429, "AUTH_TOO_MANY_ATTEMPTS"),
    problem(503, "OAUTH_UNAVAILABLE"),
  ]) {
    await clean()
    exchangeFailure = failure
    await go(
      `/auth/oauth/callback#ticket=${ticket(20 + (failure.status % 20))}`,
    )
    await waitFor(
      'Boolean(document.querySelector("[role=alert]"))',
      "safe exchange error",
    )
    await check(
      'localStorage.getItem("tindy_access_token") === null',
      `HTTP ${failure.status} callback error never creates a session`,
    )
    await noLeaks("private-upstream-canary")
  }
  // A fresh ticket after failure must work in the same mounted React router.
  exchangeFailure = null
  await evaluate(`location.hash = 'ticket=${ticket(42)}'`)
  await waitFor(
    'location.pathname === "/discover"',
    "new ticket after failed attempt",
  )
  pass("A new ticket after failure can sign in without reloading the app")

  await clean()
  malformed = true
  await go(`/auth/oauth/callback#ticket=${ticket(43)}`)
  await waitFor(hasText("unexpected response"), "malformed session")
  await check(
    'localStorage.getItem("tindy_access_token") === null',
    "Malformed success cannot authenticate or open an arbitrary redirect",
  )
  await clean()
  await setToken(tokenA)
  const expiredLinkBefore = countCalls("/api/auth/connections/confirm")
  await go("/auth/oauth/callback?flow=link&error=oauth_link_expired")
  await waitFor(
    hasText("The connection request expired."),
    "expired link redirect",
  )
  assert.equal(countCalls("/api/auth/connections/confirm"), expiredLinkBefore)
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)} && location.search === ''`,
    "Expired link redirect is cleaned without confirming or replacing the session",
  )
  for (const code of [
    "account_link_required",
    "account_unavailable",
    "access_denied",
    "provider-private-error-canary",
  ]) {
    await clean()
    const before = countCalls("/api/auth/oauth/exchange")
    await go(`/auth/oauth/callback?error=${code}`)
    await waitFor(
      'Boolean(document.querySelector("[role=alert]"))',
      "provider redirect error",
    )
    assert.equal(countCalls("/api/auth/oauth/exchange"), before)
    await check(
      'location.search === "" && location.hash === ""',
      `Provider error ${
        code === "provider-private-error-canary" ? "(unknown)" : code
      } is cleaned and never exchanged`,
    )
    if (code === "account_link_required")
      await check(
        hasText("then connect Google or GitHub in Settings"),
        "Email collision guides explicit linking without merging",
      )
    if (code.includes("canary")) {
      await noLeaks(code)
      await screenshot("oauth-callback-error.png")
    }
  }
  for (const scenario of ["network", "cors"]) {
    await clean()
    networkFailure = scenario === "network"
    denyCors = scenario === "cors"
    await go(
      `/auth/oauth/callback#ticket=${ticket(scenario === "network" ? 50 : 51)}`,
    )
    await waitFor(hasText("Unable to reach Tindy"), `${scenario} error notice`)
    await check(
      'localStorage.getItem("tindy_access_token") === null',
      `${scenario} failure stays unauthenticated and offers a safe retry`,
    )
  }

  await clean()
  await setToken(tokenA)
  meDelay = 350
  await go("/discover")
  await waitFor(hasText("Restoring your Tindy session"), "authLoading gate")
  await check(
    'location.pathname === "/discover"',
    "authLoading does not cause a login redirect loop",
  )
  await waitFor(hasText("Auth Student"), "session restored from me")
  pass("Refresh restores current identity using /api/me and Bearer token")
  meDelay = 0
  me = { ...userA, is_onboarding_completed: false }
  await go("/discover")
  await waitFor('location.pathname === "/onboarding"', "incomplete user gate")
  pass("Incomplete users cannot bypass the business onboarding gate")
  await go("/settings")
  await waitFor(hasText("Connected accounts"), "incomplete user settings")
  pass("An incomplete user can manage connected accounts in Settings")
  me = { ...userA }
  await go("/onboarding")
  await waitFor(
    'location.pathname === "/discover"',
    "completed user bypasses setup",
  )
  pass("Completed users are not forced back through onboarding")

  await clean()
  await setToken(tokenA)
  connections = {
    has_local_password: true,
    providers: [
      {
        provider: "Google",
        provider_username: "google-student",
        linked_at: "2026-10-16T00:00:00Z",
      },
    ],
  }
  await go("/settings")
  await waitFor(hasText("google-student"), "connections loaded")
  await check(
    hasText("Local Password") +
      " && " +
      hasText("Connected") +
      " && " +
      hasText("GitHub"),
    "Connected Accounts renders backend local-password/provider state",
  )
  const beforeLinkExchange = countCalls("/api/auth/oauth/exchange")
  const beforeConfirm = countCalls("/api/auth/connections/confirm")
  nextLinkTicket = ticket(60)
  await clickLabel("Connect GitHub")
  await waitFor(hasText("Account connected successfully."), "full link flow")
  await waitFor(hasText("student-github"), "linked provider refresh")
  assert.equal(countCalls("/api/auth/connections/confirm") - beforeConfirm, 1)
  assert.equal(countCalls("/api/auth/oauth/exchange"), beforeLinkExchange)
  assert.equal(
    calls.findLast((call) => call.path === "/api/auth/connections/confirm")
      .authorization,
    `Bearer ${tokenA}`,
  )
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)} && document.body.innerText.includes('Auth Student')`,
    "Linking preserves the original JWT and user identity",
  )
  await noLeaks(nextLinkTicket)
  await screenshot("settings-desktop.png")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await delay(500)
  await check(
    "document.documentElement.scrollWidth <= innerWidth",
    "Connected Accounts fits a mobile viewport",
  )
  await screenshot("settings-mobile.png")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })

  const deleteBefore = countCalls("/api/auth/connections/github")
  await clickLabel("Disconnect GitHub")
  await waitFor(
    'Boolean(document.querySelector("[role=alertdialog]"))',
    "unlink confirmation",
  )
  assert.equal(countCalls("/api/auth/connections/github"), deleteBefore)
  await click("Cancel")
  assert.equal(countCalls("/api/auth/connections/github"), deleteBefore)
  pass("Disconnect requires confirmation and Cancel does not call the API")
  await clickLabel("Disconnect GitHub")
  await evaluate(
    `(() => { const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Confirm disconnect'); button.click(); button.click(); })()`,
  )
  await waitFor(hasText("Account disconnected."), "unlink response")
  assert.equal(countCalls("/api/auth/connections/github") - deleteBefore, 1)
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)}`,
    "Disconnect is single-submit and does not log the user out",
  )
  connections.has_local_password = false
  await click("Reload connections")
  await waitFor(hasText("Not configured"), "OAuth-only snapshot")
  await clickLabel("Disconnect Google")
  await click("Confirm disconnect")
  await waitFor(hasText("Keep at least one sign-in method."), "last method 409")
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)}`,
    "Final-method 409 is clear and keeps the valid session",
  )
  await screenshot("disconnect-conflict.png")

  await clean()
  await setToken(tokenA)
  await evaluate(
    `sessionStorage.setItem('tindy_oauth_link_context', JSON.stringify({ userId: ${JSON.stringify(userA.user_id)}, startedAt: Date.now() }))`,
  )
  await setToken(tokenB)
  const confirmBeforeWrong = countCalls("/api/auth/connections/confirm")
  await go(`/auth/oauth/callback#link_ticket=${ticket(61)}`)
  await waitFor(
    hasText("Sign in to the original Tindy account"),
    "wrong account link protection",
  )
  assert.equal(countCalls("/api/auth/connections/confirm"), confirmBeforeWrong)
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenB)}`,
    "Changed-account link callback is rejected without changing its session",
  )

  await clean()
  await setToken(tokenA)
  await evaluate(
    `sessionStorage.setItem('tindy_oauth_link_context', JSON.stringify({ userId: ${JSON.stringify(userA.user_id)}, startedAt: Date.now() }))`,
  )
  linkOwner = "different-initiating-user"
  await go(`/auth/oauth/callback#link_ticket=${ticket(62)}`)
  await waitFor(hasText("connection request expired"), "invalid link ticket")
  await check(
    `localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)}`,
    "A link-ticket 401 never clears a valid Bearer session",
  )
  await clean()
  await setToken(tokenA)
  await go("/settings")
  await waitFor(hasText("Connected accounts"), "settings before malicious URL")
  maliciousAuthorization = true
  await clickLabel("Connect GitHub")
  await waitFor(
    hasText("unexpected response"),
    "unsafe authorization URL rejected",
  )
  await check(
    'location.pathname === "/settings"',
    "Untrusted linking authorization_url cannot navigate the browser",
  )
  maliciousAuthorization = false
  startFailure = problem(429, "AUTH_TOO_MANY_ATTEMPTS")
  await clickLabel("Connect GitHub")
  await waitFor(hasText("Too many attempts."), "link start rate limit")
  await check(
    `location.pathname === '/settings' && localStorage.getItem('tindy_access_token') === ${JSON.stringify(tokenA)}`,
    "Rate-limited link start preserves the current session",
  )

  for (const where of ["settings", "sidebar"]) {
    await clean()
    await setToken(tokenA)
    await evaluate(
      `localStorage.setItem('tindy-v2-preferences', JSON.stringify({ 'Email notifications': false })); localStorage.setItem('unrelated-draft', 'keep-me')`,
    )
    await go("/settings")
    await waitFor(hasText("Connected accounts"), "settings logout")
    logoutFailure = true
    const logoutBefore = countCalls("/api/auth/logout")
    await click(where === "settings" ? "Sign out" : "Sign Out")
    await waitFor('location.pathname === "/login"', "logout navigates to login")
    assert.equal(countCalls("/api/auth/logout") - logoutBefore, 1)
    await check(
      `localStorage.getItem('tindy_access_token') === null && !document.body.innerText.includes('Auth Student') && localStorage.getItem('unrelated-draft') === 'keep-me' && JSON.parse(localStorage.getItem('tindy-v2-preferences'))['Email notifications'] === false`,
      `${where} logout clears auth despite server failure and keeps unrelated preferences/drafts`,
    )
    await go("/discover")
    await waitFor(
      'location.pathname === "/login"',
      "post-logout route protection",
    )
  }
  await clean()
  await setToken(tokenA)
  invalidMe = true
  await go("/discover")
  await waitFor('location.pathname === "/login"', "invalid restored JWT")
  await check(
    'localStorage.getItem("tindy_access_token") === null',
    "Expired /me clears the token and auth state",
  )
  await clean()
  await setToken(tokenA)
  await go("/settings")
  await waitFor(hasText("Connected accounts"), "active session before 401")
  await waitFor(
    `[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Reload connections')`,
    'initial connection snapshot before injecting JWT failure',
  )
  invalidConnectionsJwt = true
  await click("Reload connections")
  await waitFor(
    'location.pathname === "/login"',
    "protected request 401 resets auth",
  )
  await check(
    'localStorage.getItem("tindy_access_token") === null',
    "A protected API 401 invalidates in-memory auth as well as storage",
  )
  await clean()
  await setToken(tokenA)
  suspendedMe = true
  await go("/settings")
  await waitFor('location.pathname === "/login"', "inactive account rejected")
  await check(
    'localStorage.getItem("tindy_access_token") === null',
    "Inactive-account 403 clears the unusable session",
  )
  await clean()
  await setToken(tokenA)
  meDelay = 500
  await go("/discover")
  await waitFor(
    hasText("Restoring your Tindy session"),
    "pending restoration before logout",
  )
  await click("Sign Out")
  await delay(650)
  await check(
    'location.pathname === "/login" && localStorage.getItem("tindy_access_token") === null',
    "A delayed /me response cannot resurrect a logged-out session",
  )
  assert.equal(pageErrors.length, 0, "No uncaught browser exceptions")
  pass("No uncaught browser exceptions")
  console.log(
    `Auth browser verification: ${checks} checks passed; ${calls.length} real HTTP fixture calls. No live backend/provider was exercised.`,
  )
} finally {
  ws?.close()
  chrome?.kill()
  if (vite) await vite.close()
  backend.closeAllConnections()
  await new Promise((resolve) => backend.close(resolve))
  if (profileDir) {
    await delay(500)
    const cleanupProfile = path.resolve(profileDir)
    if (
      path.dirname(cleanupProfile) !== path.resolve(tmpdir()) ||
      !path.basename(cleanupProfile).startsWith("tindy-auth-browser-")
    )
      throw new Error("Unexpected browser profile cleanup path")
    await rm(cleanupProfile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    })
  }
}
