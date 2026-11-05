// Real React + apiRequest + HTTP through the existing local Postman simulation.
// Only the browser's polling timer/visibility are controlled; fetch is not replaced.
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import recruitmentHarness from "./recruitment-harness.mjs"

process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-notifications-results/screenshots"
const app = await recruitmentHarness()
const { browser, fixture } = app
const { evaluate, go, waitFor, click, send } = browser
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let checks = 0
const pass = (description) => console.log(`PASS ${++checks}: ${description}`)
const hasText = (text) =>
  `document.body.innerText.includes(${JSON.stringify(text)})`
const ready = () =>
  waitFor(
    "Boolean(document.querySelector('[data-notification-id]')) && !document.body.innerText.includes('Loading notifications…')",
  )
const id = (row) => `[data-notification-id="${row.notification_id}"]`
const clickRow = async (row, label) => {
  const selector = `${id(row)} button`
  await waitFor(
    `Boolean([...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.includes(${JSON.stringify(label)})&&!el.disabled))`,
  )
  await evaluate(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].find(el=>el.textContent.includes(${JSON.stringify(label)})).click()`,
  )
}
let initial, owner, other, project, rows
const row = (
  recipient,
  type = "invitation_received",
  invitation = randomUUID(),
  i = 0,
) => ({
  notification_id: randomUUID(),
  recipient_user_id: recipient,
  actor_user_id: owner.user_id,
  invitation_id: invitation,
  type,
  payload: {
    project_name: `Notification Project ${i}`,
    position_title: "Backend Developer",
    actor_display_name: "<img src=x onerror=alert(1)>",
  },
  is_read: false,
  read_at: null,
  created_at: new Date(Date.now() - (i + 1) * 1000).toISOString(),
})
const account = async (person, route = "/notifications") => {
  await fixture("control", { currentUser: person })
  await go("/login")
  await evaluate(
    `localStorage.setItem('tindy_access_token',${JSON.stringify(`fixture-${person.user_id}`)})`,
  )
  await go(route)
}
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
  window.__notificationTimers = new Map();
  const originalSet = window.setInterval, originalClear = window.clearInterval;
  window.setInterval = function(fn, ms, ...args) {
    if(ms !== 60000) return originalSet(fn, ms, ...args);
    const id = originalSet(()=>{}, 86400000);
    window.__notificationTimers.set(id,{fn,ms});return id;
  };
  window.clearInterval = function(id) { window.__notificationTimers.delete(id); return originalClear(id); };
  window.__tickNotifications = () => window.__notificationTimers.forEach(t=>t.fn());
  window.__notificationVisibility = 'visible';
  Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__notificationVisibility});
`,
})
try {
  initial = await fixture("reset", {})
  project = initial.projects[0]
  owner = {
    user_id: project.leader.user_id,
    display_name: "Notification Owner",
    university: "FPT",
    email: null,
    username: null,
    status: "active",
    roles: ["Member"],
    is_onboarding_completed: true,
  }
  other = { ...owner, user_id: randomUUID(), display_name: "Other Account" }
  rows = Array.from({ length: 25 }, (_, i) =>
    row(owner.user_id, "invitation_received", randomUUID(), i),
  )
  const foreign = row(other.user_id, "invitation_received", randomUUID(), 100)
  await fixture("control", {
    currentUser: owner,
    notifications: [...rows, foreign],
    teammatesEnabled: true,
  })
  await account(owner)
  await ready()
  assert.equal(
    await evaluate(
      "document.querySelectorAll('main [data-notification-id]').length",
    ),
    20,
  )
  await waitFor("document.querySelector('.notif-number')?.textContent==='25'")
  assert.match(
    await evaluate(
      "document.querySelector('.sidebar .nav-dot')?.getAttribute('aria-label')",
    ),
    /25 unread/,
  )
  assert.equal(
    await evaluate("document.body.innerText.includes('Demo preview')"),
    false,
  )
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.notifications-panel img').length",
    ),
    0,
  )
  await click("Next notifications")
  await waitFor(
    "document.querySelectorAll('main [data-notification-id]').length===5 && !document.body.innerText.includes('Loading notifications…')",
  )
  await click("Previous notifications")
  await ready()
  pass(
    "API-backed page uses 20-item pagination, real count, recipient isolation and safe text rendering without DemoPreview",
  )

  await evaluate("document.querySelector('[aria-label=Notifications]').click()")
  await waitFor(
    "document.querySelectorAll('.topbar-notification-popover [data-notification-id]').length===8",
  )
  assert.equal(
    (await fixture("state")).notifications.filter(
      (n) => n.recipient_user_id === owner.user_id && n.read_at !== null,
    ).length,
    0,
  )
  await evaluate("document.querySelector('[aria-label=Notifications]').click()")
  await clickRow(rows[0], "Mark as read")
  await waitFor("document.querySelector('.notif-number')?.textContent==='24'")
  assert.match(
    await evaluate(
      "document.querySelector('.sidebar .nav-dot').getAttribute('aria-label')",
    ),
    /24 unread/,
  )
  await waitFor(
    `document.querySelector(${JSON.stringify(id(rows[0]))})?.classList.contains('unread')===false`,
  )
  await click("Unread24", "[role=tab]")
  await waitFor(
    `!document.querySelector(${JSON.stringify(id(rows[0]))}) && !document.body.innerText.includes('Loading notifications…')`,
  )
  await evaluate(
    "[...document.querySelectorAll('.sidebar a')].find(a=>a.getAttribute('href')==='/settings').click()",
  )
  await waitFor("location.pathname==='/settings'")
  await evaluate(
    "[...document.querySelectorAll('.sidebar a')].find(a=>a.getAttribute('href')==='/notifications').click()",
  )
  await ready()
  assert.equal(
    await evaluate("document.querySelector('.notif-number').textContent"),
    "24",
  )
  pass(
    "Opening bell never reads items; read success synchronizes Header, Sidebar, unread filter and SPA navigation",
  )

  await fixture("control", {
    failures: [
      {
        method: "PATCH",
        path: `/notifications/${rows[1].notification_id}/read$`,
        delayMs: 650,
      },
    ],
  })
  const duplicate = await evaluate(
    `(()=>{const inbox=globalThis.__TINDY_LAST_STATE__.notifications;const a=inbox.markRead('${rows[1].notification_id}');const b=inbox.markRead('${rows[1].notification_id}');window.__readDone=Promise.all([a,b]);return a===b;})()`,
  )
  assert.equal(duplicate, true)
  await waitFor(
    "[...document.querySelectorAll('main [data-notification-id] button')].every(b=>b.disabled)",
  )
  await evaluate("window.__readDone")
  assert.equal(
    (await fixture("state")).requests.filter(
      (r) =>
        r.method === "PATCH" &&
        r.path.endsWith(`${rows[1].notification_id}/read`),
    ).length,
    1,
  )
  pass(
    "Duplicate read calls share one HTTP request and all mutation controls disable while pending",
  )

  await fixture("control", {
    failures: [
      { method: "POST", path: "/notifications/mark-all-read$", delayMs: 450 },
    ],
  })
  const allDuplicate = await evaluate(
    "(()=>{const n=globalThis.__TINDY_LAST_STATE__.notifications;const a=n.markAllRead(),b=n.markAllRead();window.__allDone=Promise.all([a,b]);return a===b})()",
  )
  assert.equal(allDuplicate, true)
  await waitFor(hasText("Marking all…"))
  await evaluate("window.__allDone")
  await waitFor(
    "!document.querySelector('.notif-number')&&!document.querySelector('.sidebar .nav-dot')",
  )
  const afterAll = await fixture("state")
  assert.equal(
    afterAll.notifications.find(
      (n) => n.notification_id === foreign.notification_id,
    ).read_at,
    null,
  )
  assert.equal(
    afterAll.notifications.filter(
      (n) => n.recipient_user_id === owner.user_id && n.read_at !== null,
    ).length,
    25,
  )
  assert.equal(
    afterAll.requests.filter(
      (r) =>
        r.method === "POST" && r.path.endsWith("/notifications/mark-all-read"),
    ).length,
    1,
  )
  pass(
    "Mark All reads existing recipient rows, retains history and foreign unread items, and deduplicates concurrent requests",
  )

  const beforeCutoff = row(owner.user_id)
  await fixture("control", { notifications: [beforeCutoff] })
  await go("/notifications")
  await ready()
  await fixture("control", {
    failures: [
      { method: "POST", path: "/notifications/mark-all-read$", delayMs: 650 },
    ],
  })
  await evaluate(
    "window.__cutoffDone=globalThis.__TINDY_LAST_STATE__.notifications.markAllRead();void 0",
  )
  await waitFor("globalThis.__TINDY_LAST_STATE__.notifications.pending==='all'")
  const committed = (await fixture("state")).notifications
  assert.notEqual(committed[0].read_at, null)
  const afterCutoff = row(owner.user_id)
  await fixture("control", { notifications: [...committed, afterCutoff] })
  await evaluate("window.__cutoffDone")
  await waitFor("document.querySelector('.notif-number')?.textContent==='1'")
  assert.equal(
    (await fixture("state")).notifications.find(
      (n) => n.notification_id === afterCutoff.notification_id,
    ).read_at,
    null,
  )
  pass(
    "Mark All refreshes backend truth and leaves notifications arriving after its cutoff unread",
  )

  await fixture("control", { notifications: [row(owner.user_id)], failures: [] })
  await go("/notifications")
  await ready()
  await fixture("control", {
    failures: [
      {
        method: "GET",
        path: "/notifications$",
        response: {
          items: [{ notification_id: "bad" }],
          pagination: {
            current_page: 1,
            page_size: 20,
            total_items: 1,
            total_pages: 1,
            has_next: false,
            has_previous: false,
          },
        },
      },
    ],
  })
  // Inject after mount: StrictMode may abort its first mount request. An explicit
  // refresh proves malformed-response handling without consuming a one-shot fault
  // on a request whose result is deliberately discarded.
  await evaluate("globalThis.__TINDY_LAST_STATE__.notifications.page('all',1)")
  await waitFor(hasText("Retry notifications"))
  assert.equal(await evaluate(hasText("No notifications yet")), false)
  await click("Retry notifications")
  await ready()
  await fixture("control", {
    failures: [
      { method: "GET", path: "/notifications/unread-count$", status: 503 },
    ],
  })
  await evaluate("globalThis.__TINDY_LAST_STATE__.notifications.refreshCount()")
  await waitFor(hasText("last confirmed count: 1"))
  assert.equal(
    await evaluate("document.querySelector('.notif-number').textContent"),
    "1",
  )
  await click("Retry unread count")
  await waitFor(`!${hasText("Unread count could not be refreshed")}`)
  await fixture("control", {
    failures: [
      { method: "GET", path: "/notifications/unread-count$", status: 500 },
    ],
  })
  await go("/notifications")
  await waitFor(hasText("Count is unknown"))
  assert.equal(
    await evaluate("document.querySelector('.notif-number')!==null"),
    false,
  )
  await click("Retry unread count")
  await waitFor("document.querySelector('.notif-number')?.textContent==='1'")
  pass(
    "Malformed list and count outages show Retry, retain confirmed counts or explicit unknown, and never invent an empty inbox",
  )

  const countCalls = async () =>
    (await fixture("state")).requests.filter((r) =>
      r.path.endsWith("/notifications/unread-count"),
    ).length
  assert.equal(
    await evaluate(
      "[...window.__notificationTimers.values()].filter(t=>t.ms===60000).length",
    ),
    1,
  )
  let previous = await countCalls()
  await evaluate("window.__tickNotifications()")
  await waitFor("!globalThis.__TINDY_LAST_STATE__.notifications.countLoading")
  assert.equal(await countCalls(), previous + 1)
  await evaluate(
    "window.__notificationVisibility='hidden';document.dispatchEvent(new Event('visibilitychange'));window.__tickNotifications()",
  )
  await pause(200)
  assert.equal(await countCalls(), previous + 1)
  await evaluate(
    "window.__notificationVisibility='visible';document.dispatchEvent(new Event('visibilitychange'))",
  )
  await waitFor("!globalThis.__TINDY_LAST_STATE__.notifications.countLoading")
  assert.equal(await countCalls(), previous + 2)
  await fixture("control", {
    failures: [
      { method: "GET", path: "/notifications/unread-count$", delayMs: 550 },
    ],
  })
  previous = await countCalls()
  await evaluate(
    "window.__tickNotifications();window.__tickNotifications();window.__tickNotifications()",
  )
  await pause(100)
  assert.equal(await countCalls(), previous + 1)
  await waitFor("!globalThis.__TINDY_LAST_STATE__.notifications.countLoading")
  previous = await countCalls()
  await evaluate("window.dispatchEvent(new Event('tindy:invitations-changed'))")
  await waitFor("!globalThis.__TINDY_LAST_STATE__.notifications.countLoading")
  assert.equal(await countCalls(), previous + 1)
  pass(
    "One 60-second poller pauses while hidden, refreshes on return and invitation confirmation, and coalesces overlapping reads",
  )

  await fixture("control", {
    failures: [
      {
        method: "GET",
        path: "/notifications/unread-count$",
        delayMs: 650,
        response: { unread_count: 999 },
      },
    ],
  })
  await evaluate(
    "void globalThis.__TINDY_LAST_STATE__.notifications.refreshCount()",
  )
  await pause(100)
  await fixture("control", { currentUser: other })
  await evaluate(
    `(async()=>{const a=await import('/src/services/apiClient.ts');a.setStoredToken('fixture-other');globalThis.__TINDY_LAST_STATE__.setAuthUser(${JSON.stringify(other)});})()`,
  )
  await waitFor("globalThis.__TINDY_LAST_STATE__.notifications.count===0")
  await pause(850)
  assert.equal(
    await evaluate("globalThis.__TINDY_LAST_STATE__.notifications.count"),
    0,
  )
  assert.equal(
    await evaluate("document.querySelector('.notif-number')!==null"),
    false,
  )
  await evaluate("globalThis.__TINDY_LAST_STATE__.logout()")
  await waitFor("globalThis.__TINDY_LAST_STATE__.authUser===null")
  assert.equal(await evaluate("window.__notificationTimers.size"), 0)
  previous = await countCalls()
  await evaluate("window.__tickNotifications()")
  await pause(150)
  assert.equal(await countCalls(), previous)
  pass(
    "Account switch clears inbox/count, discards delayed previous-session responses, and logout stops polling",
  )

  // Verify all destinations against invitation history, not a fake payload project ID.
  const member = { ...other, display_name: "Invited Member" }
  const now = Date.now(),
    created = new Date(now - 169 * 3600000).toISOString()
  const expired = {
    invitation_id: randomUUID(),
    project_id: project.project_id,
    position_id: project.positions[0].position_id,
    invited_user_id: member.user_id,
    inviting_leader_id: owner.user_id,
    message: null,
    status: "pending",
    created_at: created,
    updated_at: created,
    expires_at: new Date(Date.parse(created) + 168 * 3600000).toISOString(),
    responded_at: null,
  }
  const cancelled = {
    ...expired,
    invitation_id: randomUUID(),
    created_at: new Date(now - 10000).toISOString(),
    expires_at: new Date(now + 168 * 3600000 - 10000).toISOString(),
    status: "cancelled",
    updated_at: new Date(now - 5000).toISOString(),
  }
  const received = row(
    member.user_id,
    "invitation_received",
    expired.invitation_id,
  )
  const cancelledNotice = row(
    member.user_id,
    "invitation_cancelled",
    cancelled.invitation_id,
  )
  await fixture("control", {
    notifications: [received, cancelledNotice],
    invitations: [expired, cancelled],
    currentUser: member,
  })
  await account(member)
  await ready()
  await clickRow(received, "View notification")
  await waitFor(
    "location.pathname==='/projects'&&new URLSearchParams(location.search).get('tab')==='Invited'",
  )
  await waitFor(
    `Boolean(document.querySelector('[data-invitation-id="${expired.invitation_id}"]'))`,
  )
  await waitFor(
    `document.querySelector('[data-invitation-id="${expired.invitation_id}"] .teammate-status')?.textContent.trim()==='expired'`,
  )
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Accept Invitation'&&!b.disabled)",
    ),
    false,
  )
  await go("/notifications")
  await ready()
  await clickRow(cancelledNotice, "View notification")
  await waitFor("location.pathname==='/projects'")
  await waitFor(
    `document.querySelector('[data-invitation-id="${cancelled.invitation_id}"] .teammate-status')?.textContent.trim()==='cancelled'`,
  )
  pass(
    "Received/cancelled notifications open Invited; expired/cancelled invitations reload actual terminal status without an active Accept action",
  )

  const responseCreated = new Date(now - 10000).toISOString(),
    responded = new Date(now - 5000).toISOString()
  const accepted = {
    ...cancelled,
    invitation_id: randomUUID(),
    status: "accepted",
    created_at: responseCreated,
    updated_at: responded,
    responded_at: responded,
  }
  const declined = {
    ...accepted,
    invitation_id: randomUUID(),
    status: "declined",
  }
  const acceptedNotice = row(
    owner.user_id,
    "invitation_accepted",
    accepted.invitation_id,
  )
  const declinedNotice = row(
    owner.user_id,
    "invitation_declined",
    declined.invitation_id,
  )
  await fixture("control", {
    notifications: [acceptedNotice, declinedNotice],
    invitations: [accepted, declined],
    currentUser: owner,
  })
  await account(owner)
  await ready()
  await clickRow(acceptedNotice, "View notification")
  await waitFor(`location.pathname==='/project/${project.project_id}'`)
  await go("/notifications")
  await ready()
  await clickRow(declinedNotice, "View notification")
  await waitFor(
    `location.pathname==='/candidates'&&new URLSearchParams(location.search).get('project_id')==='${project.project_id}'&&new URLSearchParams(location.search).get('tab')==='Invited'`,
  )
  pass(
    "Leader response notifications resolve invitation_id through authorized backend history to existing Project Detail and Candidate Invitation History routes",
  )

  const failedRead = row(
    owner.user_id,
    "invitation_received",
    expired.invitation_id,
  )
  await fixture("control", {
    notifications: [failedRead],
    failures: [
      { method: "PATCH", path: "/notifications/.*/read$", status: 500 },
    ],
  })
  await go("/notifications")
  await ready()
  await clickRow(failedRead, "View notification")
  await waitFor("location.pathname==='/projects'")
  await waitFor(hasText("Retry read update"))
  assert.equal((await fixture("state")).notifications[0].read_at, null)
  await click("Retry read update")
  await waitFor(`!${hasText("Retry read update")}`)
  assert.notEqual((await fixture("state")).notifications[0].read_at, null)
  pass(
    "Failed mark-read still navigates, retains unread truth and exposes a working retry after navigation",
  )
  const presentationRows = [
    row(owner.user_id, "invitation_received"),
    row(owner.user_id, "invitation_accepted", accepted.invitation_id),
  ]
  presentationRows.forEach((n) => {
    n.payload = {
      project_name: "Tindy Platform",
      position_title: "Backend Developer",
      actor_display_name: "Project Leader",
    }
  })
  await fixture("control", { notifications: presentationRows })
  await go("/notifications")
  await ready()
  await browser.screenshot("notifications-desktop.png")
  await evaluate("document.querySelector('[aria-label=Notifications]').click()")
  await waitFor(
    "document.querySelectorAll('.topbar-notification-popover [data-notification-id]').length===2",
  )
  await browser.screenshot("notifications-dropdown.png")
  await evaluate("document.querySelector('[aria-label=Notifications]').click()")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  assert.equal(
    await evaluate("document.documentElement.scrollWidth<=innerWidth"),
    true,
  )
  await browser.screenshot("notifications-mobile.png")
  assert.equal(browser.exceptions.length, 0)
  await mkdir(".tmp-notifications-results", { recursive: true })
  await writeFile(
    ".tmp-notifications-results/requests.json",
    JSON.stringify((await fixture("state")).requests, null, 2),
  )
  console.log(
    `All ${checks} notification browser checks passed against Postman HTTP simulation; live deployment is not claimed.`,
  )
} catch (error) {
  console.error(error)
  console.error((await evaluate("document.body.innerText")).slice(-7000))
  await browser.screenshot("failure.png")
  process.exitCode = 1
} finally {
  await app.close()
}
