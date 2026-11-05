// Optional live smoke: real ASP.NET Core TestServer + disposable PostgreSQL.
// Requires the sibling Backend checkout, .NET 10 SDK and Docker. No production DB.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { createServer } from "vite"
import openBrowser from "./profile-browser.mjs"

process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-teammates-live-results/screenshots"
let host,
  server,
  browser,
  hostOutput = "",
  hostError = "",
  backend
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let checks = 0
const pass = (label) => console.log(`LIVE PASS ${++checks}: ${label}`)
try {
  host = spawn(
    "dotnet",
    [
      "run",
      "--project",
      "tests/live-teammates-host/LiveHost.csproj",
      "--",
      path.resolve("../tindy-backend-platform"),
    ],
    { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
  )
  host.stdout.on("data", (chunk) => {
    hostOutput += chunk
    const match = hostOutput.match(/TINDY_LIVE_READY (http:\/\/[^\s]+)/)
    if (match) backend = match[1]
  })
  host.stderr.on("data", (chunk) => {
    hostError += chunk
  })
  for (let i = 0; i < 1200 && !backend; i++) {
    if (host.exitCode !== null)
      throw Error(
        `Backend host exited ${host.exitCode}: ${hostError.slice(-3000)} ${hostOutput.slice(-1500)}`,
      )
    await delay(100)
  }
  if (!backend) throw Error("Live Backend startup timeout")
  const seed = await fetch(`${backend}/__test/bootstrap`).then((r) => r.json())
  server = await createServer({
    cacheDir: ".tmp-teammates-live-vite-cache",
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(""),
    },
    server: {
      host: "127.0.0.1",
      port: 0,
      proxy: { "/api": { target: backend } },
    },
  })
  await server.listen()
  browser = await openBrowser(server.resolvedUrls.local[0].replace(/\/$/, ""))
  const { go, evaluate, click, waitFor } = browser
  const login = async (token, route) => {
    await go("/login")
    await evaluate(
      `localStorage.setItem('tindy_access_token',${JSON.stringify(token)})`,
    )
    await go(route)
  }
  const data = async (token, route, init) => {
    const res = await fetch(`${backend}${route}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    })
    assert.ok(res.ok, `Live API ${route}: ${res.status}`)
    return (await res.json()).data
  }
  await login(
    seed.leaderToken,
    `/discover?mode=teammates&project_id=${seed.project}&position_id=${seed.position}`,
  )
  await waitFor(
    "Boolean(document.querySelector('.cursor-grab [data-candidate-id]'))",
  )
  const target = await evaluate(
    "document.querySelector('.cursor-grab [data-candidate-id]').dataset.candidateId",
  )
  assert.ok([seed.member, seed.outsider].includes(target))
  const targetToken =
    target === seed.member ? seed.memberToken : seed.outsiderToken
  const other = target === seed.member ? seed.outsider : seed.member
  const otherToken =
    other === seed.member ? seed.memberToken : seed.outsiderToken
  const page = await data(
    seed.leaderToken,
    `/api/projects/${seed.project}/positions/${seed.position}/candidates`,
  )
  const score = page.items.find((i) => i.candidate.user_id === target).matching
    .match_score
  assert.equal(
    await evaluate(
      "document.querySelector('.cursor-grab [data-teammate-score]').textContent",
    ),
    `${score}% Position Match`,
  )
  assert.equal(
    page.items.some(
      (i) =>
        "phone_number" in i.candidate ||
        "bio" in i.candidate ||
        "open_to_team_invitations" in i.candidate,
    ),
    false,
  )
  await browser.screenshot("live-discovery.png")
  pass(
    "Real authenticated candidate feed displays the exact Backend score and protects private preview fields",
  )
  await evaluate("document.querySelector('[aria-label=\"Shortlist\"]').click()")
  await click("Confirm Shortlist")
  await waitFor("!document.querySelector('[role=dialog]')")
  let rows = await data(
    seed.leaderToken,
    `/api/projects/${seed.project}/candidate-interactions?position_id=${seed.position}&action=shortlisted`,
  )
  assert.ok(
    rows.items.some(
      (i) => i.candidate_user_id === target && i.action === "shortlisted",
    ),
  )
  pass("Shortlist persists through the real interaction API in PostgreSQL")
  const invite = async (user) => {
    await go(
      `/candidate/${user}?project_id=${seed.project}&position_id=${seed.position}`,
    )
    await click("Send Invitation")
    await waitFor("Boolean(document.querySelector('[role=dialog]'))")
    await click("Confirm Send Invitation")
    await waitFor("!document.querySelector('[role=dialog]')")
  }
  await invite(target)
  await invite(other)
  rows = await data(
    seed.leaderToken,
    `/api/projects/${seed.project}/invitations?status=all`,
  )
  assert.equal(rows.items.filter((i) => i.status === "pending").length, 2)
  let db = await fetch(`${backend}/__test/db-state`).then((r) => r.json())
  assert.equal(db.memberActive, false)
  assert.equal(db.outsiderActive, false)
  assert.equal(db.filled, 0)
  pass(
    "Confirmed sends create real Invitations without reserving slots or creating membership",
  )
  await login(otherToken, "/projects?tab=Invited")
  await waitFor("Boolean(document.querySelector('[data-invitation-id]'))")
  await click("Review invitation")
  await click("Confirm Decline")
  await waitFor("!document.querySelector('[role=dialog]')")
  const ownHistory = await data(
    otherToken,
    "/api/me/project-invitations?status=all",
  )
  assert.equal(ownHistory.items[0].status, "declined")
  db = await fetch(`${backend}/__test/db-state`).then((r) => r.json())
  assert.equal(
    other === seed.member ? db.memberActive : db.outsiderActive,
    false,
  )
  pass(
    "Real Member decline persists its terminal status and does not join the Project",
  )
  // Delivered invitations intentionally remain valid beyond new recruitment cutoff.
  await fetch(`${backend}/__test/deadline-past`, { method: "POST" })
  await login(targetToken, "/projects?tab=Invited")
  await waitFor("Boolean(document.querySelector('[data-invitation-id]'))")
  await click("Review invitation")
  await click("Confirm Accept")
  await waitFor("!document.querySelector('[role=dialog]')")
  await evaluate(
    "[...document.querySelectorAll('.status-tabs button')].find(b=>b.textContent.trim().startsWith('Active')).click()",
  )
  await waitFor(
    "document.body.innerText.includes('Team member') && document.body.innerText.includes('Recruitment Project')",
  )
  const memberships = await data(targetToken, "/api/me/projects")
  assert.ok(
    memberships.joined_projects.some((p) => p.project_id === seed.project),
  )
  db = await fetch(`${backend}/__test/db-state`).then((r) => r.json())
  assert.equal(
    target === seed.member ? db.memberActive : db.outsiderActive,
    true,
  )
  assert.equal(db.filled, 1)
  await browser.screenshot("live-membership.png")
  pass(
    "Accept after cutoff commits actual membership and filled count; Frontend My Projects refreshes from Backend",
  )
  // Owner-only response field and mutation, verified against the real API/client.
  await go("/profile")
  await click("Edit profile")
  await waitFor(
    "document.querySelector('input[name=open_to_team_invitations]')?.checked===true",
  )
  await evaluate(
    "document.querySelector('input[name=open_to_team_invitations]').click()",
  )
  await click("Save profile")
  await waitFor(
    "!document.querySelector('input[name=open_to_team_invitations]')",
  )
  assert.equal(
    (await data(targetToken, "/api/me/profile")).open_to_team_invitations,
    false,
  )
  assert.equal(
    "open_to_team_invitations" in
      (await data(seed.leaderToken, `/api/users/${target}/profile`)),
    false,
  )
  pass(
    "Real owner consent PATCH transmits false; member-visible Profile omits the consent field",
  )
  assert.equal(browser.exceptions.length, 0)
  await mkdir(".tmp-teammates-live-results", { recursive: true })
  await writeFile(
    ".tmp-teammates-live-results/evidence.json",
    JSON.stringify(
      {
        checks,
        database: "disposable PostgreSQL/Testcontainers",
        project: seed.project,
        score,
        final: db,
        checksPassed: true,
      },
      null,
      2,
    ),
  )
  console.log(
    `All ${checks} live browser smoke checks passed against real Backend/PostgreSQL; application DB untouched.`,
  )
} catch (reason) {
  console.error(reason)
  if (browser) {
    console.error(
      (await browser.evaluate("document.body.innerText")).slice(-5000),
    )
    await browser.screenshot("live-failure.png")
  }
  process.exitCode = 1
} finally {
  await browser?.close()
  await server?.close()
  if (host && host.exitCode === null) {
    host.stdin.end("\n")
    await Promise.race([
      new Promise((resolve) => host.once("exit", resolve)),
      delay(20000),
    ])
    if (host.exitCode === null) host.kill()
  }
  await mkdir(".tmp-teammates-live-results", { recursive: true })
  await writeFile(
    ".tmp-teammates-live-results/host.log",
    hostOutput + hostError,
  )
}
