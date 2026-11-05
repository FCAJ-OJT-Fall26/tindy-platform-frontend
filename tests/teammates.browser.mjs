import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import recruitmentHarness from "./recruitment-harness.mjs"

process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-teammates-results/screenshots"
const app = await recruitmentHarness()
const { browser, fixture } = app
const { go, evaluate, waitFor, click, send } = browser
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let checks = 0
const pass = (message) => console.log(`PASS ${++checks}: ${message}`)
const choose = async (label, value) => {
  await waitFor(
    `Boolean(document.querySelector('[aria-label="${label}"] option[value="${value}"]')) && !document.querySelector('[aria-label="${label}"]').disabled`,
  )
  await evaluate(
    `(() => { const el = document.querySelector('[aria-label="${label}"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('change',{bubbles:true})); })()`,
  )
  await pause(180) // allow React Router's transition to commit before checking the next scope
}
const closeDialog = async () => {
  await waitFor("document.querySelector('[role=dialog] [aria-label=\"Close dialog\"]')?.disabled===false")
  await evaluate(
    "document.querySelector('[role=dialog] [aria-label=\"Close dialog\"]').click()",
  )
  await waitFor("!document.querySelector('[role=dialog]')")
}
const press = async (label) => {
  await pause(270)
  await waitFor(
    `document.querySelector('[aria-label="${label}"]')?.disabled===false`,
  )
  await evaluate(`document.querySelector('[aria-label="${label}"]').click()`)
}
const api = async (expression) =>
  evaluate(
    `(async () => { const tm=await import('/src/services/teammates.service.ts');const inv=await import('/src/services/invitations.service.ts');const attempts=await import('/src/services/invitationAttempts.ts');return ${expression}; })()`,
  )
let leader, member, project, first, second, people, initial, requestCount
const changeUser = async (person, route) => {
  await fixture("control", { currentUser: person })
  await go("/login")
  await evaluate(
    `localStorage.setItem('tindy_access_token',${JSON.stringify(`fixture-${person.user_id}`)})`,
  )
  await go(route)
}
const discovery = async (pos = first.position_id) => {
  await go(
    `/discover?mode=teammates&project_id=${project.project_id}&position_id=${pos}`,
  )
  await waitFor(
    "Boolean(document.querySelector('.cursor-grab [data-candidate-id]'))",
  )
}
const inviteModal = async (
  user = people[0].user_id,
  pos = first.position_id,
) => {
  await go(
    `/candidate/${user}?project_id=${project.project_id}&position_id=${pos}`,
  )
  await click("Send Invitation")
  await waitFor(
    "Boolean(document.querySelector('[aria-label=\"Invitation message\"]'))",
  )
}
const setMessage = async (message) =>
  evaluate(
    `(() => { const el=document.querySelector('[aria-label="Invitation message"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(message)});el.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  )
const invitePosts = (state) =>
  state.requests.filter(
    (r) =>
      r.method === "POST" && /\/projects\/[^/]+\/invitations$/.test(r.path),
  )
const readyHistory = () =>
  waitFor(
    "Boolean(document.querySelector('[data-invitation-id]')) && !document.body.innerText.includes('Loading invitation history…')",
  )
try {
  initial = await fixture("reset", {})
  leader = {
    user_id: initial.projects[0].leader.user_id,
    display_name: "Project Leader",
    university: "FPT",
    email: "leader@example.com",
    username: "leader",
    status: "active",
    roles: ["Member"],
    is_onboarding_completed: true,
  }
  project = {
    ...initial.projects[0],
    max_team_capacity: 20,
    positions: [
      { ...initial.projects[0].positions[0], required_count: 8 },
      {
        ...initial.projects[0].positions[0],
        position_id: randomUUID(),
        title: "Second API Position",
        required_count: 8,
      },
    ],
  }
  ;[first, second] = project.positions
  people = Array.from({ length: 70 }, (_, index) => ({
    user_id: randomUUID(),
    display_name: index < 2 ? "Same Display Name" : `Candidate ${index}`,
    open_to_team_invitations: true,
    position_scores: { [first.position_id]: 64, [second.position_id]: 29 },
  }))
  member = {
    ...leader,
    user_id: people[0].user_id,
    display_name: people[0].display_name,
    email: "member@example.com",
  }
  const reset = async (extra) => {
    await fixture("reset", {
      projects: [structuredClone(project)],
      teammatesEnabled: true,
      teammateProfiles: structuredClone(people),
      currentUser: leader,
      ...extra,
    })
    await evaluate("sessionStorage.clear()")
  }
  await reset({})
  await go("/discover?mode=teammates")
  await waitFor(
    "Boolean(document.querySelector('[aria-label=\"Teammate project\"] option[value]'))",
  )
  assert.equal(
    (await fixture("state")).requests.some((r) =>
      r.path.endsWith("/candidates"),
    ),
    false,
  )
  await choose("Teammate project", project.project_id)
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Teammate position"] option[value="${first.position_id}"]'))`,
  )
  assert.equal(
    (await fixture("state")).requests.some((r) =>
      r.path.endsWith("/candidates"),
    ),
    false,
  )
  await choose("Teammate position", first.position_id)
  await waitFor(
    "document.querySelector('[data-teammate-score]')?.textContent==='64% Position Match'",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('.cursor-grab [data-candidate-id]').dataset.candidateId",
    ),
    people[0].user_id,
  )
  assert.equal(
    await evaluate(
      "/AI Match|Verified Academic|Verified Candidate/.test(document.body.innerText)",
    ),
    false,
  )
  pass(
    "Explicit Project/Position selection gates discovery; Backend score and UUID are displayed without fabricated privacy/evidence fields",
  )
  await browser.screenshot("teammates-desktop.png")
  await click("Why this match?")
  await waitFor("Boolean(document.querySelector('[data-match-details-score]'))")
  assert.equal(
    await evaluate(
      "document.querySelector('[data-match-details-score]').dataset.matchDetailsScore",
    ),
    "64",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('[role=dialog]').textContent.includes('20 points')",
    ),
    true,
  )
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  })
  await waitFor("!document.querySelector('[role=dialog]')")
  pass(
    "Match dialog uses server contribution/factors and shared accessible Escape handling",
  )
  for (const total of [40, 60, 70]) {
    await click("Load more candidates")
    await waitFor(
      `document.querySelector('[data-live-teammates]').dataset.loadedCount==='${total}'`,
    )
  }
  assert.equal(
    (await fixture("state")).requests.filter(
      (r) => r.path.endsWith("/candidates") && r.query.cursor,
    ).length,
    3,
  )
  const profileReads = (await fixture("state")).requests.filter((r) =>
    /\/users\/.*\/profile$/.test(r.path),
  )
  assert.ok(
    profileReads.length <= 2,
    "Only active candidate profile is hydrated, not every card",
  )
  pass(
    "Cursor pagination loads 70 ranked UUIDs in server order; list enrichment avoids per-candidate N+1 reads",
  )
  await choose("Teammate position", second.position_id)
  await waitFor(
    "document.querySelector('[data-teammate-score]')?.textContent==='29% Position Match'",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('[data-live-teammates]').dataset.loadedCount",
    ),
    "20",
  )
  const lastFeed = (await fixture("state")).requests
    .filter((r) => r.path.endsWith("/candidates"))
    .at(-1)
  assert.equal(lastFeed.query.cursor, undefined)
  await choose("Candidate skill", first.skills[0].skill_id)
  await waitFor(
    `location.search.includes('skill_id=${first.skills[0].skill_id}') && document.querySelector('[data-teammate-score]')?.textContent==='29% Position Match'`,
  )
  // The URL can change before React Router commits the filter render. Observe
  // the actual HTTP request before asserting its query, rather than racing it.
  let filteredState
  for (let attempt = 0; attempt < 140; attempt++) {
    filteredState = await fixture("state")
    if (filteredState.requests.filter(r => r.path.endsWith("/candidates")).at(-1)?.query.skill_id === first.skills[0].skill_id) break
    await pause(75)
  }
  assert.equal(
    filteredState.requests
      .filter((r) => r.path.endsWith("/candidates"))
      .at(-1).query.skill_id,
    first.skills[0].skill_id,
  )
  pass(
    "Changing Position clears score/cursor/selection; filters send actual catalog UUIDs",
  )
  await discovery()
  await evaluate(
    "document.querySelector('[aria-label=\"Save for later\"]').click();document.querySelector('[aria-label=\"Save for later\"]').click()",
  )
  await waitFor(
    `document.querySelector('.cursor-grab [data-candidate-id]')?.dataset.candidateId==='${people[1].user_id}'`,
  )
  let state = await fixture("state")
  assert.equal(state.candidateInteractions.length, 1)
  assert.equal(
    state.candidateInteractions[0].candidate_user_id,
    people[0].user_id,
  )
  assert.equal(
    state.requests.filter(
      (r) => r.method === "PUT" && r.path.includes("candidate-interactions"),
    ).length,
    1,
  )
  await press("Undo")
  await waitFor(
    `document.querySelector('.cursor-grab [data-candidate-id]')?.dataset.candidateId==='${people[0].user_id}'`,
  )
  assert.equal((await fixture("state")).candidateInteractions.length, 0)
  pass(
    "Double Save submits once; same display names remain separate UUIDs; Undo resets Backend state",
  )
  await press("Shortlist")
  await waitFor("Boolean(document.querySelector('[role=dialog]'))")
  assert.equal((await fixture("state")).candidateInteractions.length, 0)
  await click("Cancel")
  await waitFor("!document.querySelector('[role=dialog]')")
  await press("Shortlist")
  await click("Confirm Shortlist")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(state.candidateInteractions[0].action, "shortlisted")
  assert.equal(state.invitations.length, 0)
  await go(
    `/candidates?project_id=${project.project_id}&position_id=${first.position_id}&tab=Shortlisted`,
  )
  await waitFor(
    `Boolean(document.querySelector('[data-candidate-id="${people[0].user_id}"]'))`,
  )
  assert.equal(
    await evaluate(
      "document.querySelector('[aria-label=\"Stored candidate interactions\"]').textContent.includes('64%')",
    ),
    false,
  )
  await choose("Teammate position", second.position_id)
  await waitFor("document.body.innerText.includes('No shortlisted candidates')")
  await choose("Teammate position", first.position_id)
  await click("Reset interaction")
  await waitFor("document.body.innerText.includes('No shortlisted candidates')")
  pass(
    "Shortlist open/cancel never writes; confirmed shortlist persists across reload, isolates Position and resets without fabricated scores",
  )
  await discovery()
  await fixture("control", {
    failures: [
      {
        method: "PUT",
        path: "candidate-interactions",
        status: 403,
        code: "PROJECT_ACCESS_DENIED",
      },
    ],
  })
  await press("Skip")
  await waitFor(
    "document.body.innerText.includes('Only the actual project leader')",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('.cursor-grab [data-candidate-id]').dataset.candidateId",
    ),
    people[0].user_id,
  )
  await press("Skip")
  await waitFor(
    `document.querySelector('.cursor-grab [data-candidate-id]')?.dataset.candidateId==='${people[1].user_id}'`,
  )
  await discovery()
  assert.equal(
    await evaluate(
      "document.querySelector('.cursor-grab [data-candidate-id]').dataset.candidateId",
    ),
    people[1].user_id,
  )
  await go(
    `/candidates?project_id=${project.project_id}&position_id=${first.position_id}&tab=Skipped`,
  )
  await click("Reset interaction")
  pass(
    "Failed mutation keeps current card; confirmed Skip survives reload and can be reset from management",
  )
  await inviteModal()
  requestCount = invitePosts(await fixture("state")).length
  await closeDialog()
  assert.equal(invitePosts(await fixture("state")).length, requestCount)
  await inviteModal()
  await setMessage("  Let's build together.  ")
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Send Invitation').click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Send Invitation')?.click()",
  )
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(invitePosts(state).length, requestCount + 1)
  assert.equal(state.invitations.length, 1)
  assert.equal(state.invitations[0].message, "Let's build together.")
  assert.equal(state.projects[0].team_members.length, 1)
  pass(
    "Opening Send modal has no POST; double confirm creates one validated Invitation and no local membership",
  )
  await inviteModal(people[0].user_id, second.position_id)
  await click("Confirm Send Invitation")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(state.invitations.length, 1)
  assert.equal(invitePosts(state).length, requestCount + 1)
  await go(`/candidates?project_id=${project.project_id}&tab=Invited`)
  await readyHistory()
  await click("Review invitation")
  await click("Confirm Cancel Invitation")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await fixture("state")).invitations[0].status, "cancelled")
  pass(
    "Pending invitation is detected across Positions using history; leader cancellation uses recorded Invitation UUID",
  )
  await fixture("control", {
    failures: [{ method: "POST", path: "/invitations$", commit: true }],
  })
  await inviteModal()
  await setMessage("Recover a committed request")
  await click("Confirm Send Invitation")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(state.invitations.length, 2)
  assert.equal(state.invitations.at(-1).status, "pending")
  const pending = state.invitations.at(-1)
  pass(
    "Lost response after Send commit is reconciled from paginated UUID history without reposting",
  )
  await fixture("control", {
    failures: [{ method: "POST", path: "/invitations$", network: true }],
  })
  await inviteModal(people[1].user_id)
  await setMessage("Keep this uncertain draft")
  await click("Confirm Send Invitation")
  await waitFor(
    "Boolean([...document.querySelectorAll('button')].find(b=>b.textContent==='Check invitation status'))",
  )
  requestCount = invitePosts(await fixture("state")).length
  await go(
    `/candidate/${people[1].user_id}?project_id=${project.project_id}&position_id=${second.position_id}`,
  )
  await click("Send Invitation")
  assert.equal(
    await evaluate(
      "document.querySelector('[aria-label=\"Invitation message\"]').value",
    ),
    "Keep this uncertain draft",
  )
  assert.equal(
    await evaluate(
      "Boolean([...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Send Invitation'))",
    ),
    false,
  )
  await click("Check invitation status")
  await pause(100)
  assert.equal(invitePosts(await fixture("state")).length, requestCount)
  assert.equal(
    await evaluate(
      "sessionStorage.getItem([...Object.keys(sessionStorage)].find(k=>k.startsWith('tindy:invitation-attempt:'))).includes('fixture-token')",
    ),
    false,
  )
  await closeDialog()
  pass(
    "Uncommitted uncertain Send remains blocked after reload/Position switch, retains draft and never stores Bearer tokens",
  )
  await changeUser(member, "/projects?tab=Invited")
  await readyHistory()
  await click("Review invitation")
  await fixture("control", {
    projects: [
      {
        ...structuredClone(project),
        recruitment_closes_at: "2020-01-01T17:00:00Z",
        recruitment_closing_date: "2020-01-01",
        is_recruitment_open: false,
      },
    ],
    failures: [{ method: "POST", path: "/accept$", commit: true }],
  })
  await click("Confirm Accept")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(
    state.invitations.find((i) => i.invitation_id === pending.invitation_id)
      .status,
    "accepted",
  )
  assert.ok(
    state.projects[0].team_members.some((m) => m.user_id === member.user_id),
  )
  assert.equal(
    state.requests.filter(
      (r) => r.method === "POST" && r.path.endsWith("/accept"),
    ).length,
    1,
  )
  await evaluate(
    "[...document.querySelectorAll('.status-tabs button')].find(b=>b.textContent.trim().startsWith('Active')).click()",
  )
  await waitFor(
    "document.body.innerText.includes('Team member') && document.body.innerText.includes('Persisted Project')",
  )
  pass(
    "Member accepts a valid Invitation after recruitment cutoff; lost Accept response reconciles once and My Projects refreshes actual membership",
  )
  // Fresh history for opt-out/decline/full/expiry tests.
  await fixture("reset", {
    projects: [structuredClone(project)],
    teammatesEnabled: true,
    teammateProfiles: structuredClone(people),
    currentUser: leader,
  })
  await changeUser(leader, "/candidates")
  await evaluate("sessionStorage.clear()")
  await inviteModal()
  await click("Confirm Send Invitation")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  const consentOff = state.teammateProfiles.map((p) =>
    p.user_id === member.user_id
      ? { ...p, open_to_team_invitations: false }
      : p,
  )
  await fixture("control", { teammateProfiles: consentOff })
  await changeUser(member, "/projects?tab=Invited")
  await readyHistory()
  await click("Review invitation")
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Accept').disabled",
    ),
    true,
  )
  assert.equal(
    await evaluate(
      "document.querySelector('[role=dialog]').textContent.includes('Open Profile Settings')",
    ),
    true,
  )
  await click("Confirm Decline")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(state.invitations[0].status, "declined")
  assert.equal(state.projects[0].team_members.length, 1)
  pass(
    "Opt-out disables Accept with a Profile path, still permits Decline and creates no membership",
  )
  await go("/profile")
  await click("Edit profile")
  await waitFor(
    "Boolean(document.querySelector('input[name=open_to_team_invitations]'))",
  )
  assert.equal(
    await evaluate(
      "document.querySelector('input[name=open_to_team_invitations]').checked",
    ),
    false,
  )
  await evaluate(
    "document.querySelector('input[name=open_to_team_invitations]').click()",
  )
  await click("Save profile")
  await waitFor(
    "!document.querySelector('input[name=open_to_team_invitations]')",
  )
  assert.equal(
    (await fixture("state")).teammateProfiles.find(
      (p) => p.user_id === member.user_id,
    ).open_to_team_invitations,
    true,
  )
  await click("Edit profile")
  await evaluate(
    "document.querySelector('input[name=open_to_team_invitations]').click()",
  )
  await click("Save profile")
  await waitFor(
    "!document.querySelector('input[name=open_to_team_invitations]')",
  )
  state = await fixture("state")
  assert.equal(
    state.requests
      .filter((r) => r.method === "PATCH" && r.path === "/api/me/profile")
      .at(-1).body.open_to_team_invitations,
    false,
  )
  await fixture("control", { unsupportedConsent: true })
  await go("/profile")
  await click("Edit profile")
  await waitFor(
    "document.querySelector('input[name=open_to_team_invitations]')?.disabled===true",
  )
  await click("Cancel")
  pass(
    "Owner Profile toggles false→true→false with explicit boolean PATCH; missing capability stays disabled without invented default",
  )
  // Service-level assertions run through the same client and real HTTP, never fetch interception.
  await changeUser(leader, "/candidates")
  await evaluate("sessionStorage.clear()")
  await fixture("control", {
    unsupportedConsent: false,
    teammateFeedOverrides: { position_id: second.position_id },
  })
  assert.equal(
    await api(
      `tm.getTeammateCandidates('${project.project_id}','${first.position_id}').then(()=>false,()=>true)`,
    ),
    true,
  )
  await fixture("control", {
    teammateFeedOverrides: { feed_version: "unknown" },
  })
  assert.equal(
    await api(
      `tm.getTeammateCandidates('${project.project_id}','${first.position_id}').then(()=>false,()=>true)`,
    ),
    true,
  )
  await fixture("control", {
    teammateFeedOverrides: {},
    interactionResponseOverrides: { position_id: second.position_id },
  })
  assert.equal(
    await api(
      `tm.setCandidateInteraction('${project.project_id}','${first.position_id}','${people[1].user_id}','saved').then(()=>false,()=>true)`,
    ),
    true,
  )
  assert.equal(
    await api(
      `tm.getTeammateCandidates('invalid','${first.position_id}').then(()=>false,()=>true)`,
    ),
    true,
  )
  await fixture("control", { interactionResponseOverrides: {} })
  pass(
    "API services reject invalid UUID, cross-Position feed/mutation responses and unsupported feed version",
  )
  await fixture("control", {
    failures: [
      {
        method: "GET",
        path: "/candidates$",
        status: 503,
        code: "TEAMMATE_DISCOVERY_SNAPSHOT_TOO_LARGE",
      },
    ],
  })
  await go(
    `/discover?mode=teammates&project_id=${project.project_id}&position_id=${first.position_id}`,
  )
  await waitFor(
    "document.body.innerText.includes('Narrow the backend filters')",
  )
  assert.equal(
    await evaluate("Boolean(document.querySelector('.cursor-grab'))"),
    false,
  )
  await click("Refresh feed")
  await waitFor("Boolean(document.querySelector('.cursor-grab'))")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  assert.equal(
    await evaluate("document.documentElement.scrollWidth<=innerWidth+1"),
    true,
  )
  await browser.screenshot("teammates-mobile.png")
  await click("Filters")
  await waitFor("document.querySelector('#teammate-filters').classList.contains('is-open')")
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"), true)
  await browser.screenshot("teammates-mobile-filters.png")
  await click("Filters")
  await evaluate("scrollTo({top:scrollY+document.querySelector('.cursor-grab').getBoundingClientRect().top-80})")
  assert.equal(await evaluate("(() => {const frame=document.querySelector('.cursor-grab').getBoundingClientRect();const footer=document.querySelector('.cursor-grab .teammate-card__footer').getBoundingClientRect();return footer.top>=frame.top && footer.bottom<=frame.bottom+1})()"), true)
  await browser.screenshot("teammates-mobile-card.png")
  await click("View Candidate Profile")
  await waitFor("Boolean(document.querySelector('[role=dialog] .teammate-detail'))")
  assert.equal(await evaluate("document.querySelector('[role=dialog]').scrollWidth<=document.querySelector('[role=dialog]').clientWidth+1"), true)
  await browser.screenshot("teammates-mobile-profile.png")
  await closeDialog()
  await evaluate("scrollTo(0,0)")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await go(`/candidates?project_id=${project.project_id}&tab=Archived`)
  await waitFor(
    "new URLSearchParams(location.search).get('tab') === 'Shortlisted'",
  )
  assert.equal(await evaluate("Boolean([...document.querySelectorAll('[role=tab]')].find(el => el.textContent.trim()==='Archived'))"), false)
  await go("/discover?mode=teammates&demo=1")
  await waitFor("Boolean(document.querySelector('[data-live-teammates]'))")
  await waitFor("!new URLSearchParams(location.search).has('demo')")
  assert.equal(await evaluate("document.querySelector('[data-live-teammates]').textContent.includes('Demo')"), false)
  await go("/discover")
  await waitFor("Boolean(document.querySelector('[data-live-discovery]'))")
  pass(
    "Backend error has explicit retry and no demo fallback; mobile avoids overflow; unsupported archive and legacy demo URLs use the normal live routes",
  )
  assert.equal(browser.exceptions.length, 0)
  await mkdir(".tmp-teammates-results", { recursive: true })
  await writeFile(
    ".tmp-teammates-results/requests.json",
    JSON.stringify((await fixture("state")).requests, null, 2),
  )
  console.log(
    `All ${checks} teammate browser/service checks passed against Postman HTTP simulation. No database transaction guarantees claimed.`,
  )
} catch (reason) {
  console.error(reason)
  console.error((await evaluate("document.body.innerText")).slice(-6500))
  await browser.screenshot("failure.png")
  process.exitCode = 1
} finally {
  await app.close()
}
