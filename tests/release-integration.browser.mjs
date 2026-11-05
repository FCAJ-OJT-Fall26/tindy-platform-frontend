// Release audit: real React, ASP.NET Core/JWT/EF and disposable PostgreSQL.
// No Postman mocks or fetch replacement. Faults are injected at the local HTTP proxy.
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { createServer } from "vite"
import openBrowser from "./profile-browser.mjs"

const output = ".tmp-release-verification"
process.env.VERIFY_SCREENSHOTS_DIR = `${output}/screenshots`
let host, server, backend, hostLog = "", hostErrors = ""
const browsers = [], checks = [], traffic = [], apiChecks = [], faults = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const pass = label => { checks.push(label); console.log(`RELEASE PASS ${checks.length}: ${label}`) }
const text = value => `document.body.innerText.includes(${JSON.stringify(value)})`
const notificationPath = "/api/me/notifications"
let seed, finalState, failure = null
async function request(token, route, method = "GET", body) {
  const result = await fetch(`${backend}${route}`, {
    method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const raw = await result.text()
  const json = raw ? JSON.parse(raw) : null
  apiChecks.push({ method, route, status: result.status })
  return { status: result.status, data: json?.data, problem: json, headers: Object.fromEntries(result.headers) }
}
async function data(token, route, method = "GET", body) {
  const response = await request(token, route, method, body)
  assert.ok(response.status >= 200 && response.status < 300, `${method} ${route}: ${response.status} ${JSON.stringify(response.problem)}`)
  assert.equal(response.problem.success, true)
  return response.data
}
async function problem(token, route, method, body, expectedStatus, code) {
  const response = await request(token, route, method, body)
  assert.equal(response.status, expectedStatus, JSON.stringify(response.problem))
  if (code) assert.equal(response.problem.error_code, code)
  return response
}
const leaderPath = c => `/api/projects/${c.project}/invitations`
const memberPath = (id, action) => `/api/me/project-invitations/${id}/${action}`
const notice = (token, filter = "all", page = 1) => data(token, `${notificationPath}?filter=${filter}&page=${page}&page_size=20`)
const unread = async token => (await data(token, `${notificationPath}/unread-count`)).unread_count
const state = () => fetch(`${backend}/__test/release-state`).then(r => r.json())
const enable = c => data(c.memberToken, "/api/me/profile", "PATCH", { open_to_team_invitations: true })
const invite = c => data(c.leaderToken, leaderPath(c), "POST", { position_id: c.position, invited_user_id: c.member })
async function login(browser, token, route) {
  await browser.go("/login")
  await browser.evaluate(`localStorage.setItem('tindy_access_token',${JSON.stringify(token)})`)
  await browser.go(route)
}
async function viewNotification(browser, row) {
  const selector = `[data-notification-id="${row.notification_id}"]`
  await browser.waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))&&!document.body.innerText.includes('Loading notifications…')`)
  await browser.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector + " button")})].find(b=>b.textContent.includes('View notification')&&!b.disabled).click()`)
}
try {
  await mkdir(output, { recursive: true })
  host = spawn("dotnet", ["run", "--project", "tests/live-teammates-host/LiveHost.csproj", "--", path.resolve("../tindy-backend-platform")], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] })
  host.stdout.on("data", chunk => { hostLog += chunk; const match = hostLog.match(/TINDY_LIVE_READY (http:\/\/[^\s]+)/); if (match) backend = match[1] })
  host.stderr.on("data", chunk => { hostErrors += chunk })
  for (let i = 0; i < 1200 && !backend; i++) {
    if (host.exitCode !== null) throw Error(`Test host exited: ${hostErrors.slice(-2500)} ${hostLog.slice(-1000)}`)
    await pause(100)
  }
  if (!backend) throw Error("Disposable test host startup timed out")
  seed = await fetch(`${backend}/__test/release-bootstrap`).then(r => r.json())
  assert.ok(seed.primary?.memberToken, "Release bootstrap is incomplete")
  const identities = new Map(Object.values(seed).flatMap(c => [[`Bearer ${c.leaderToken}`, c.leader], [`Bearer ${c.memberToken}`, c.member], [`Bearer ${c.outsiderToken}`, c.outsider]]))
  server = await createServer({ cacheDir: `${output}/vite-cache`, define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("") },
    plugins: [{ name: "release-http-observer", configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next()
        const account = identities.get(req.headers.authorization)
        traffic.push({ method: req.method, route: req.url, account })
        const index = faults.findIndex(f => req.method === f.method && req.url.startsWith(f.path) && (!f.account || f.account === account))
        if (index < 0) return next()
        const fault = faults.splice(index, 1)[0]
        if (fault.network) { req.socket.destroy(); return }
        if (fault.delay) { setTimeout(next, fault.delay); return }
        res.writeHead(fault.status || 503, { "Content-Type": "application/problem+json" })
        res.end(JSON.stringify({ status: fault.status || 503, title: "Release test network failure", error_code: "TEST_FAILURE" }))
      })
    } }],
    server: { host: "127.0.0.1", port: 0, proxy: { "/api": { target: backend } } },
  })
  await server.listen()
  const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
  const leader = await openBrowser(origin), member = await openBrowser(origin)
  browsers.push(leader, member)
  await member.send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__releaseTimers=new Map(); const set=window.setInterval, clear=window.clearInterval;
    window.setInterval=(fn,ms,...args)=>{if(ms!==60000)return set(fn,ms,...args);const id=set(()=>{},86400000);window.__releaseTimers.set(id,{fn,ms});return id};
    window.clearInterval=id=>{window.__releaseTimers.delete(id);return clear(id)};
    window.__releaseTick=()=>window.__releaseTimers.forEach(t=>t.fn());
  ` })
  const c = seed.primary
  finalState = await state()
  assert.equal(finalState.pendingModelChanges, false)
  assert.ok(finalState.migrations.some(m => m.endsWith("_Notification_CreateNotifications")))
  pass("Fresh test database applies actual migrations and ModelSnapshot has no pending changes")

  assert.equal((await data(c.memberToken, "/api/me/profile")).open_to_team_invitations, false)
  const feedRoute = `/api/projects/${c.project}/positions/${c.position}/candidates`
  assert.equal((await data(c.leaderToken, feedRoute)).items.some(i => i.candidate.user_id === c.member), false)
  await problem(c.leaderToken, leaderPath(c), "POST", { position_id: c.position, invited_user_id: c.member }, 404, "CANDIDATE_NOT_FOUND")
  assert.equal((await notice(c.memberToken)).items.length, 0)
  pass("Member B starts opted out; Leader A cannot discover/invite B and failed Send creates no notification")

  await login(member, c.memberToken, "/settings")
  await member.click("Manage Team Invitations", "a")
  await member.waitFor("document.activeElement?.name==='open_to_team_invitations'")
  assert.equal(await member.evaluate("document.querySelector('input[name=open_to_team_invitations]').checked"), false)
  await member.evaluate("document.querySelector('input[name=open_to_team_invitations]').click()")
  await member.click("Save profile")
  await member.waitFor("!document.querySelector('input[name=open_to_team_invitations]')")
  assert.equal((await data(c.memberToken, "/api/me/profile")).open_to_team_invitations, true)
  pass("Member B enables the real opt-in through Settings → Edit Profile and PostgreSQL confirms it")

  await login(leader, c.leaderToken, `/discover?mode=teammates&project_id=${c.project}&position_id=${c.position}`)
  await leader.waitFor(`Boolean(document.querySelector('[data-candidate-id="${c.member}"]'))`)
  const feed = await data(c.leaderToken, feedRoute)
  const candidate = feed.items.find(i => i.candidate.user_id === c.member)
  assert.ok(candidate)
  assert.equal(candidate.matching.algorithm_version, "rule-v1")
  const factors = candidate.matching.match_factors
  assert.deepEqual(factors.map(f => f.name).sort(), ["availability", "optional_skills", "preferred_role", "required_skills"])
  assert.equal("phone_number" in candidate.candidate, false)
  assert.equal("open_to_team_invitations" in candidate.candidate, false)
  await leader.go(`/candidate/${c.member}?project_id=${c.project}&position_id=${c.position}`)
  await leader.click("Send Invitation"); await leader.click("Send invitation")
  await leader.waitFor("!document.querySelector('[role=dialog]')")
  const sent = (await data(c.leaderToken, leaderPath(c))).items[0]
  assert.equal(sent.status, "pending")
  assert.equal(sent.invited_user_id, c.member)
  await problem(c.leaderToken, leaderPath(c), "POST", { position_id: c.otherPosition, invited_user_id: c.member }, 409, "INVITATION_ALREADY_PENDING")
  const received = (await notice(c.memberToken)).items
  assert.equal(received.length, 1); assert.equal(received[0].type, "invitation_received")
  assert.equal(received[0].is_read, false); assert.equal(await unread(c.memberToken), 1)
  pass("Leader discovers B and UI Send creates exactly one real Invitation/received Notification; duplicate attempt is rejected")

  await member.evaluate("document.querySelector('[aria-label=Notifications]').click()")
  await member.waitFor("document.querySelector('.notif-number')?.textContent==='1'")
  await member.waitFor("document.querySelectorAll('.topbar-notification-popover [data-notification-id]').length===1")
  assert.equal((await notice(c.memberToken)).items[0].read_at, null)
  await member.click("View all in Notifications", "a")
  await member.waitFor("location.pathname==='/notifications'")
  await viewNotification(member, received[0])
  await member.waitFor("location.pathname==='/projects'&&new URLSearchParams(location.search).get('tab')==='Invited'")
  await member.waitFor(`Boolean(document.querySelector('[data-invitation-id="${sent.invitation_id}"]'))`)
  const readAt = (await notice(c.memberToken)).items[0].read_at
  assert.ok(readAt); assert.equal(await unread(c.memberToken), 0)
  await member.click("Review invitation")
  await member.waitFor(text(sent.invitation_id))
  await member.click("Confirm Accept")
  await member.waitFor("!document.querySelector('[role=dialog]')")
  pass("Bell and inbox show backend unread count; View marks read then displays actual Invitation and Member accepts through UI")

  finalState = await state()
  const joined = finalState.members.find(m => m.projectId === c.project && m.userId === c.member)
  assert.equal(joined.status, "active"); assert.equal(joined.positionId, c.position)
  assert.equal(finalState.positions.find(p => p.positionId === c.position).filledCount, 1)
  const acceptedNotices = (await notice(c.leaderToken)).items
  assert.equal(acceptedNotices.length, 1); assert.equal(acceptedNotices[0].type, "invitation_accepted")
  await leader.go("/notifications"); await viewNotification(leader, acceptedNotices[0])
  await leader.waitFor(`location.pathname==='/project/${c.project}'`)
  await leader.go(`/candidates?project_id=${c.project}&position_id=${c.position}&tab=Active`)
  await leader.waitFor("document.body.innerText.includes('Active members')&&!document.body.innerText.includes('Loading positions…')")
  assert.equal(await leader.evaluate("document.querySelectorAll('.teammate-records article').length"), 1)
  assert.equal(await leader.evaluate(`document.querySelector('a[href="/users/${c.member}"]')!==null`), true)
  await leader.go(`/candidates?project_id=${c.project}&tab=Active`)
  await leader.waitFor("document.querySelectorAll('.teammate-records article').length===2")
  const detail = await data(c.leaderToken, `/api/projects/${c.project}`)
  assert.equal(detail.team_members.find(m => m.is_leader).position_id, null)
  assert.equal(detail.team_members.find(m => m.user_id === c.member).position_id, c.position)
  pass("Leader receives accepted Notification; real membership, position counter, nullable Leader and Active position filter agree")

  await member.go("/notifications")
  await member.waitFor("Boolean(document.querySelector('[data-notification-id]'))&&!document.body.innerText.includes('Loading notifications…')")
  assert.equal((await notice(c.memberToken)).items[0].read_at, readAt)
  assert.equal(await member.evaluate("document.querySelector('[data-notification-id]').classList.contains('unread')"), false)
  await data(c.memberToken, `${notificationPath}/${received[0].notification_id}/read`, "PATCH")
  await data(c.memberToken, `${notificationPath}/${received[0].notification_id}/read`, "PATCH")
  assert.equal((await notice(c.memberToken)).items[0].read_at, readAt)
  pass("Reload preserves notification read state and repeated Mark as Read preserves the original read_at")

  const decline = seed.decline; await enable(decline)
  const declinedInvite = await invite(decline)
  await login(member, decline.memberToken, "/projects?tab=Invited")
  await member.waitFor("Boolean(document.querySelector('[data-invitation-id]'))")
  await member.click("Review invitation"); await member.click("Confirm Decline")
  await member.waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await data(decline.memberToken, "/api/me/project-invitations")).items[0].status, "declined")
  assert.equal((await notice(decline.leaderToken)).items[0].type, "invitation_declined")
  await login(leader, decline.leaderToken, "/notifications")
  await viewNotification(leader, (await notice(decline.leaderToken)).items[0])
  await leader.waitFor(`location.pathname==='/candidates'&&new URLSearchParams(location.search).get('project_id')==='${decline.project}'`)
  assert.equal((await state()).members.some(m => m.projectId === decline.project && m.userId === decline.member), false)
  pass("Independent fresh accounts decline through UI; Leader notification resolves to actual Candidate Invitation History without membership")

  const cancel = seed.cancel; await enable(cancel)
  const cancelledInvite = await invite(cancel)
  const originalNotice = (await notice(cancel.memberToken)).items[0]
  await data(cancel.leaderToken, `${leaderPath(cancel)}/${cancelledInvite.invitation_id}/cancel`, "POST")
  assert.deepEqual((await notice(cancel.memberToken)).items.map(n => n.type).sort(), ["invitation_cancelled", "invitation_received"])
  await login(member, cancel.memberToken, "/notifications")
  await viewNotification(member, originalNotice)
  await member.waitFor("location.pathname==='/projects'")
  await member.waitFor(text("cancelled"))
  await member.click("Review invitation")
  await member.waitFor("Boolean(document.querySelector('[role=dialog]'))")
  assert.equal(await member.evaluate("[...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent.includes('Confirm Accept'))"), false)
  await member.click("Close", "[role=dialog] button")
  pass("Fresh Cancel event reaches Member; clicking the original received notification reloads cancelled status and exposes no Accept action")

  const second = await openBrowser(origin); browsers.push(second)
  await login(second, cancel.memberToken, "/notifications")
  await second.waitFor("document.querySelector('.notif-number')?.textContent==='1'")
  const remaining = (await notice(cancel.memberToken, "unread")).items[0]
  await member.go("/notifications")
  await member.waitFor("Boolean(document.querySelector('[data-notification-id]'))")
  await member.evaluate(`globalThis.__TINDY_LAST_STATE__.notifications.markRead('${remaining.notification_id}')`)
  await second.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
  await second.waitFor("globalThis.__TINDY_LAST_STATE__.notifications.count===0")
  assert.equal(await second.evaluate("document.querySelector('.notif-number')!==null"), false)
  pass("Two independent browser sessions for one Member converge on shared backend read/unread state")

  const expiry = seed.expiry; await enable(expiry)
  const expiring = await invite(expiry)
  const expiredControl = await fetch(`${backend}/__test/expire-invitation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitation_id: expiring.invitation_id }) }).then(r => r.json())
  assert.equal(expiredControl.changed, 1)
  await problem(expiry.memberToken, memberPath(expiring.invitation_id, "accept"), "POST", undefined, 409, "INVITATION_EXPIRED")
  assert.equal((await notice(expiry.memberToken)).items.length, 1)
  assert.equal((await notice(expiry.leaderToken)).items.length, 0)
  assert.equal((await data(expiry.memberToken, "/api/me/project-invitations")).items[0].status, "expired")
  pass("Expired Invitation becomes expired, changes no membership and creates no expiry/response notification")

  const race = seed.race; await enable(race)
  const racing = await invite(race)
  const terminal = await Promise.all([
    request(race.memberToken, memberPath(racing.invitation_id, "accept"), "POST"),
    request(race.leaderToken, `${leaderPath(race)}/${racing.invitation_id}/cancel`, "POST"),
  ])
  assert.deepEqual(terminal.map(r => r.status).sort(), [200, 409])
  const raceState = await state()
  assert.equal(raceState.notifications.filter(n => n.invitationId === racing.invitation_id).length, 2)
  pass("Concurrent Accept versus Cancel has one winner, one conflict and exactly one terminal notification")

  for (const [name, capacityCase] of [["Position", seed.positionCapacity], ["Project", seed.projectCapacity]]) {
    await enable(capacityCase)
    await data(capacityCase.outsiderToken, "/api/me/profile", "PATCH", { open_to_team_invitations: true })
    const first = await invite(capacityCase)
    const next = await data(capacityCase.leaderToken, leaderPath(capacityCase), "POST", {
      position_id: name === "Position" ? capacityCase.position : capacityCase.otherPosition, invited_user_id: capacityCase.outsider,
    })
    const accepted = await Promise.all([request(capacityCase.memberToken, memberPath(first.invitation_id, "accept"), "POST"), request(capacityCase.outsiderToken, memberPath(next.invitation_id, "accept"), "POST")])
    assert.deepEqual(accepted.map(r => r.status).sort(), [200, 409])
    const refused = accepted.find(r => r.status === 409)
    assert.equal(refused.problem.error_code, name === "Position" ? "POSITION_UNAVAILABLE" : "PROJECT_CAPACITY_EXCEEDED")
    const snapshot = await state()
    assert.equal(snapshot.members.filter(m => m.projectId === capacityCase.project && m.status === "active").length, 2)
    assert.equal(snapshot.positions.filter(p => p.projectId === capacityCase.project).reduce((n, p) => n + p.filledCount, 0), 1)
    assert.equal((await notice(capacityCase.leaderToken)).items.filter(n => n.type === "invitation_accepted").length, 1)
    pass(`${name} last-slot race preserves capacity, one membership/counter increment and only the winning notification`)
  }

  const pages = seed.pagination; await enable(pages)
  for (let i = 0; i < 12; i++) { const row = await invite(pages); await data(pages.leaderToken, `${leaderPath(pages)}/${row.invitation_id}/cancel`, "POST") }
  const firstPage = await notice(pages.memberToken), secondPage = await notice(pages.memberToken, "all", 2)
  assert.equal(firstPage.items.length, 20); assert.equal(secondPage.items.length, 4)
  assert.equal(firstPage.pagination.total_items, 24)
  assert.equal(new Set([...firstPage.items, ...secondPage.items].map(n => n.notification_id)).size, 24)
  await login(member, pages.memberToken, "/notifications")
  await member.waitFor("document.querySelectorAll('main [data-notification-id]').length===20&&!document.body.innerText.includes('Loading notifications…')")
  await member.click("Next notifications")
  await member.waitFor("document.querySelectorAll('main [data-notification-id]').length===4&&!document.body.innerText.includes('Loading notifications…')")
  await member.click("Mark all as read")
  await member.waitFor("globalThis.__TINDY_LAST_STATE__.notifications.count===0")
  assert.equal(await unread(pages.memberToken), 0)
  assert.equal((await notice(pages.memberToken)).pagination.total_items, 24)
  assert.equal((await data(pages.memberToken, `${notificationPath}/mark-all-read`, "POST")).updated_count, 0)
  pass("24 genuine Send/Cancel notifications paginate 20+4; UI Mark All persists while retaining history and is idempotent")

  await problem(null, notificationPath, "GET", undefined, 401, "AUTH_UNAUTHORIZED")
  await problem(c.leaderToken, `${notificationPath}/${received[0].notification_id}/read`, "PATCH", undefined, 404, "NOTIFICATION_NOT_FOUND")
  await problem(c.memberToken, `${notificationPath}/${randomUUID()}/read`, "PATCH", undefined, 404, "NOTIFICATION_NOT_FOUND")
  await problem(c.memberToken, `${notificationPath}/not-a-guid/read`, "PATCH", undefined, 404)
  await problem(c.memberToken, `${notificationPath}?recipient_user_id=${c.leader}`, "GET", undefined, 400, "VALIDATION_FAILED")
  await data(expiry.memberToken, "/api/me/profile", "PATCH", { open_to_team_invitations: false })
  await problem(expiry.leaderToken, leaderPath(expiry), "POST", { position_id: expiry.position, invited_user_id: expiry.member }, 404, "CANDIDATE_NOT_FOUND")
  pass("Real JWT boundary, cross-user/unknown/malformed notification IDs, recipient injection and opt-out reject unauthorized operations")

  // Browser controls for network/visibility are at the transport/document boundary;
  // all non-injected requests still run against real ASP.NET Core/PostgreSQL.
  await login(member, c.memberToken, "/notifications")
  await member.waitFor("globalThis.__TINDY_LAST_STATE__.notifications.count===0")
  faults.push({ method: "GET", path: `${notificationPath}/unread-count`, network: true, account: c.member })
  await member.evaluate("globalThis.__TINDY_LAST_STATE__.notifications.refreshCount()")
  await member.waitFor(text("Retry unread count"))
  await member.click("Retry unread count")
  await member.waitFor(`!${text("Retry unread count")}`)
  await member.evaluate("window.__releaseVisibility='hidden';Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__releaseVisibility});document.dispatchEvent(new Event('visibilitychange'))")
  const callsBeforeHidden = traffic.filter(r => r.account === c.member && r.route.startsWith(`${notificationPath}/unread-count`)).length
  assert.equal(await member.evaluate("[...window.__releaseTimers.values()].filter(t=>t.ms===60000).length"),1)
  // Advance only the captured 60-second interval callback; fetch remains real.
  await member.evaluate("window.__releaseTick()")
  await pause(300)
  assert.equal(traffic.filter(r => r.account === c.member && r.route.startsWith(`${notificationPath}/unread-count`)).length, callsBeforeHidden)
  await member.evaluate("window.__releaseVisibility='visible';document.dispatchEvent(new Event('visibilitychange'))")
  await member.waitFor("!globalThis.__TINDY_LAST_STATE__.notifications.countLoading")
  assert.ok(traffic.filter(r => r.account === c.member && r.route.startsWith(`${notificationPath}/unread-count`)).length > callsBeforeHidden)
  pass("A real failed HTTP request exposes Retry; hidden tab makes no 60-second polls and returning refreshes backend count")

  faults.push({ method: "GET", path: `${notificationPath}/unread-count`, delay: 900, account: c.member })
  await member.evaluate("void globalThis.__TINDY_LAST_STATE__.notifications.refreshCount()")
  await pause(100)
  const accountData = await data(pages.memberToken, "/api/me")
  await member.evaluate(`(async()=>{const api=await import('/src/services/apiClient.ts');api.setStoredToken(${JSON.stringify(pages.memberToken)});globalThis.__TINDY_LAST_STATE__.setAuthUser(${JSON.stringify(accountData)});})()`)
  await member.waitFor(`globalThis.__TINDY_LAST_STATE__.authUser.user_id==='${pages.member}'&&globalThis.__TINDY_LAST_STATE__.notifications.count===0`)
  await pause(1100)
  assert.equal(await member.evaluate("document.querySelectorAll('main [data-notification-id]').length"), 20)
  faults.push({ method: "GET", path: `${notificationPath}/unread-count`, delay: 900, account: pages.member })
  await member.evaluate("void globalThis.__TINDY_LAST_STATE__.notifications.refreshCount()")
  await member.evaluate("globalThis.__TINDY_LAST_STATE__.logout()")
  await member.waitFor("globalThis.__TINDY_LAST_STATE__.authUser===null")
  await pause(1100)
  assert.equal(await member.evaluate("globalThis.__TINDY_LAST_STATE__.notifications.enabled"), false)
  pass("Account switching discards the old in-flight response/cache; logout during polling aborts requests and disables the inbox")

  await login(leader, c.leaderToken, `/candidates?project_id=${c.project}&tab=Archived`)
  await leader.waitFor("new URLSearchParams(location.search).get('tab')==='Shortlisted'")
  assert.equal(await leader.evaluate("[...document.querySelectorAll('[role=tab]')].some(b=>b.textContent.trim()==='Archived')"), false)
  pass("Live Candidate Pipeline exposes no Archived tab and normalizes old URLs")

  finalState = await state()
  assert.ok(browsers.every(b => b.exceptions.length === 0), "Uncaught browser exception")
  await leader.screenshot("release-candidate-pipeline.png")
  console.log(`All ${checks.length} release integration groups passed against real ASP.NET Core/PostgreSQL with separate test accounts.`)
} catch (error) {
  failure = error.stack || String(error)
  console.error(error)
  for (let i = 0; i < browsers.length; i++) {
    console.error(`Browser ${i}:`, (await browsers[i].evaluate("document.body.innerText")).slice(-4500))
    await browsers[i].screenshot(`release-failure-${i}.png`)
  }
  process.exitCode = 1
} finally {
  if (backend) { try { finalState = await state() } catch {} }
  await mkdir(output, { recursive: true })
  await writeFile(`${output}/evidence.json`, JSON.stringify({ checks, passed: checks.length, failed: failure ? 1 : 0, skipped: 0, failure, apiChecks, browserTraffic: traffic, database: finalState }, null, 2))
  await Promise.allSettled(browsers.map(b => b.close()))
  await server?.close()
  if (host && host.exitCode === null) {
    host.stdin.end("\n")
    await Promise.race([new Promise(resolve => host.once("exit", resolve)), pause(20_000)])
    if (host.exitCode === null) host.kill()
  }
  await writeFile(`${output}/host.log`, hostLog + hostErrors)
}
