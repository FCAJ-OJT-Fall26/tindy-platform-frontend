import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import recruitmentHarness from "./recruitment-harness.mjs"

process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-teammates-errors/screenshots"
const app = await recruitmentHarness()
const { browser, fixture } = app
const { evaluate, go, waitFor, click } = browser
let checks = 0
const pass = (message) => console.log(`PASS ${++checks}: ${message}`)
let project, people, leader, member, invitation
const account = async (user, route) => {
  await fixture("control", { currentUser: user })
  await go("/login")
  await evaluate(
    `localStorage.setItem('tindy_access_token',${JSON.stringify(`fixture-${user.user_id}`)})`,
  )
  await go(route)
}
const closeDialog = async () => {
  await waitFor("document.querySelector('[role=dialog] [aria-label=\"Close dialog\"]')?.disabled===false")
  await evaluate(
    "document.querySelector('[role=dialog] [aria-label=\"Close dialog\"]').click()",
  )
  await waitFor("!document.querySelector('[role=dialog]')")
}
try {
  const initial = await fixture("reset", {})
  project = initial.projects[0]
  project.positions.push({
    ...project.positions[0],
    position_id: randomUUID(),
    title: "Other Position",
  })
  leader = {
    user_id: project.leader.user_id,
    display_name: "Leader",
    university: "FPT",
    email: "leader@example.com",
    username: "leader",
    status: "active",
    roles: ["Member"],
    is_onboarding_completed: true,
  }
  people = Array.from({ length: 25 }, () => ({
    user_id: randomUUID(),
    display_name: "Same Name",
    open_to_team_invitations: true,
  }))
  member = {
    ...leader,
    user_id: people[0].user_id,
    display_name: "Same Name",
    email: "member@example.com",
    username: "member",
  }
  const makeInvitation = (status = "pending", created = new Date()) => ({
    invitation_id: randomUUID(),
    project_id: project.project_id,
    position_id: project.positions[0].position_id,
    invited_user_id: member.user_id,
    inviting_leader_id: leader.user_id,
    message: "Real HTTP fixture invitation",
    status,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
    expires_at: new Date(+created + 168 * 3600000).toISOString(),
    responded_at:
      status === "declined" || status === "accepted"
        ? new Date().toISOString()
        : null,
  })
  invitation = makeInvitation()
  const reset = async (extra) => {
    await fixture("reset", {
      projects: [structuredClone(project)],
      teammateProfiles: structuredClone(people),
      teammatesEnabled: true,
      currentUser: leader,
      ...extra,
    })
    await evaluate("sessionStorage.clear()")
  }
  const openSend = async (pos = project.positions[0].position_id) => {
    await go(
      `/candidate/${member.user_id}?project_id=${project.project_id}&position_id=${pos}`,
    )
    await click("Send Invitation")
    await waitFor("Boolean(document.querySelector('[role=dialog]'))")
  }
  const openReview = async () => {
    await account(member, "/projects?tab=Invited")
    await waitFor("Boolean(document.querySelector('[data-invitation-id]'))")
    await click("Review invitation")
  }
  await reset({})
  await go(
    `/discover?mode=teammates&project_id=${project.project_id}&position_id=${project.positions[0].position_id}`,
  )
  await waitFor(
    "document.querySelector('[data-live-teammates]')?.dataset.loadedCount==='20'",
  )
  await fixture("control", { expireTeammateCursor: true })
  await click("Load more candidates")
  await waitFor("document.body.innerText.includes('candidate session expired')")
  assert.equal(
    await evaluate(
      "document.querySelector('[aria-label=\"Shortlist\"]').disabled",
    ),
    true,
  )
  await click("Refresh feed")
  await waitFor(
    "document.querySelector('[data-live-teammates]')?.dataset.loadedCount==='20' && !document.body.innerText.includes('candidate session expired')",
  )
  pass(
    "Expired cursor blocks stale card actions and requires a new Backend snapshot",
  )
  await fixture("control", { expireTeammateCursor: false, teammateFeedOverrides: { scored_at: new Date(Date.now() + 60000).toISOString() } })
  await click("Load more candidates")
  await waitFor("document.body.innerText.includes('snapshot changed during pagination')")
  assert.equal(await evaluate("document.querySelector('[data-live-teammates]').dataset.loadedCount"), "20")
  await fixture("control", { teammateFeedOverrides: {} })
  await click("Refresh feed")
  await waitFor("Boolean(document.querySelector('.cursor-grab')) && !document.body.innerText.includes('snapshot changed during pagination')")
  pass("Pagination cannot mix candidates from different scoring snapshots")
  const firstCandidate = await evaluate("document.querySelector('.cursor-grab [data-candidate-id]').dataset.candidateId")
  await fixture("control", { failures: [{ method: "PUT", path: "candidate-interactions", network: true }, { method: "GET", path: "candidate-interactions", status: 503 }] })
  await evaluate("document.querySelector('[aria-label=Skip]').click()")
  await waitFor("Boolean([...document.querySelectorAll('button')].find(b=>b.textContent==='Check stored action'))")
  assert.equal(await evaluate("document.querySelector('.cursor-grab [data-candidate-id]').dataset.candidateId"), firstCandidate)
  await click("Check stored action")
  await waitFor("document.querySelector('[aria-label=Skip]')?.disabled===false && ![...document.querySelectorAll('button')].some(b=>b.textContent==='Check stored action')")
  assert.equal((await fixture("state")).candidateInteractions.length, 0)
  await fixture("control", { failures: [{ method: "PUT", path: "candidate-interactions", commit: true }] })
  await evaluate("document.querySelector('[aria-label=\"Save for later\"]').click()")
  await waitFor(`document.querySelector('.cursor-grab [data-candidate-id]')?.dataset.candidateId!=='${firstCandidate}'`)
  assert.equal((await fixture("state")).candidateInteractions[0].action, "saved")
  pass("Uncertain interactions require a status read and refresh; committed lost-response Save is confirmed without reposting")
  await reset({
    applications: [
      {
        application_id: randomUUID(),
        project_id: project.project_id,
        position_id: project.positions[1].position_id,
        applicant_id: member.user_id,
        status: "pending",
      },
    ],
  })
  await openSend()
  await click("Confirm Send Invitation")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('pending application')",
  )
  assert.equal((await fixture("state")).invitations.length, 0)
  await closeDialog()
  await reset({
    invitations: [
      makeInvitation("declined", new Date(Date.now() - 24 * 3600000)),
    ],
  })
  await openSend(project.positions[1].position_id)
  await click("Confirm Send Invitation")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('7 days after')",
  )
  assert.equal((await fixture("state")).invitations.length, 1)
  await closeDialog()
  pass(
    "Pending Application and cross-Position decline cooldown return explicit business errors without fake sends",
  )
  await reset({
    teammateProfiles: people.map((p) => ({
      ...p,
      open_to_team_invitations: false,
    })),
  })
  await openSend()
  await click("Confirm Send Invitation")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('consent is unavailable')",
  )
  assert.equal((await fixture("state")).invitations.length, 0)
  await closeDialog()
  await reset({
    failures: [
      {
        method: "POST",
        path: "/invitations$",
        status: 429,
        code: "INVITATION_RATE_LIMITED",
      },
    ],
  })
  await openSend()
  await click("Confirm Send Invitation")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('Too many attempts')",
  )
  assert.equal((await fixture("state")).invitations.length, 0)
  await closeDialog()
  pass(
    "Candidate unavailability and rate limiting preserve confirmation state and report no success",
  )
  await reset({ invitations: [structuredClone(invitation)] })
  await openReview()
  await fixture("control", {
    projects: [
      {
        ...project,
        positions: project.positions.map((p) => ({
          ...p,
          status: "filled",
          filled_count: p.required_count,
        })),
      },
    ],
  })
  await click("Confirm Accept")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('position is closed or full')",
  )
  let state = await fixture("state")
  assert.equal(state.invitations[0].status, "pending")
  assert.equal(state.projects[0].team_members.length, 1)
  await closeDialog()
  pass(
    "Last-slot conflict preserves pending Invitation and does not grant membership",
  )
  await reset({
    invitations: [structuredClone(invitation)],
    failures: [{ method: "POST", path: "/accept$", network: true }],
  })
  await openReview()
  await click("Confirm Accept")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('unknown result')",
  )
  await closeDialog()
  await go("/projects?tab=Invited")
  await waitFor("Boolean(document.querySelector('[data-invitation-id]'))")
  await click("Review invitation")
  assert.equal(
    await evaluate(
      "Boolean([...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Accept'))",
    ),
    false,
  )
  await click("Check invitation status")
  await waitFor(
    "document.querySelector('[role=dialog]')?.textContent.includes('still unconfirmed')",
  )
  state = await fixture("state")
  assert.equal(
    state.requests.filter(
      (r) => r.path.endsWith("/accept") && r.method === "POST",
    ).length,
    1,
  )
  assert.equal(state.projects[0].team_members.length, 1)
  await closeDialog()
  pass(
    "Unknown uncommitted Accept stays blocked after reload; status checks never resubmit the mutation",
  )
  await reset({
    invitations: [structuredClone(invitation)],
    failures: [{ method: "POST", path: "/decline$", commit: true }],
  })
  await openReview()
  await click("Confirm Decline")
  await waitFor("!document.querySelector('[role=dialog]')")
  state = await fixture("state")
  assert.equal(state.invitations[0].status, "declined")
  assert.equal(
    state.requests.filter(
      (r) => r.path.endsWith("/decline") && r.method === "POST",
    ).length,
    1,
  )
  pass(
    "Committed Decline with lost response is confirmed by GET history with one POST",
  )
  const expired = makeInvitation(
    "pending",
    new Date(Date.now() - 169 * 3600000),
  )
  await reset({ invitations: [expired] })
  await openReview()
  assert.equal(
    await evaluate(
      "document.querySelector('[role=dialog]').textContent.includes('expired')",
    ),
    true,
  )
  assert.equal(
    await evaluate(
      "Boolean([...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm Accept'))",
    ),
    false,
  )
  await closeDialog()
  pass(
    "Expired Invitation displays Backend terminal state and offers no Accept action",
  )
  const history = Array.from({ length: 25 }, (_, i) => ({
    ...makeInvitation(
      "cancelled",
      new Date(Date.now() - (30 - i) * 24 * 3600000),
    ),
    message: `History record ${i}`,
  }))
  await reset({ invitations: history })
  await account(member, "/projects?tab=Invited")
  await waitFor("document.querySelectorAll('[data-invitation-id]').length===20")
  await click("Next invitations")
  await waitFor("document.querySelectorAll('[data-invitation-id]').length===5")
  await browser.screenshot("invitation-history-mobile-ready.png")
  await fixture("control", { projects: [] })
  await go("/projects?tab=Invited")
  await waitFor(
    "document.querySelectorAll('[data-invitation-id]').length===20 && document.body.innerText.includes('historical invitation is preserved')",
  )
  assert.equal(
    await evaluate(`document.body.innerText.includes('${project.project_id}')`),
    true,
  )
  pass(
    "Invitation history paginates and retains UUID/status/message when Project details cannot be hydrated",
  )
  await fixture("control", {
    projects: [project],
    invitations: [structuredClone(invitation)],
  })
  await account(
    { ...member, user_id: people[1].user_id },
    "/projects?tab=Invited",
  )
  await waitFor(
    "document.body.innerText.includes('No invitations in this view')",
  )
  const rejected = await evaluate(
    `(async()=>{const svc=await import('/src/services/invitations.service.ts');try{await svc.respondToProjectInvitation('${invitation.invitation_id}','accept');return false}catch(e){return e.status===404}})()`,
  )
  assert.equal(rejected, true)
  assert.equal((await fixture("state")).invitations[0].status, "pending")
  pass(
    "Another Member sees no foreign Invitations and cannot act on a guessed Invitation UUID",
  )
  await account(member, "/profile")
  await click("Edit profile")
  const semantics = await evaluate(
    "(async()=>{const p=await import('/src/services/profile.service.ts');const v=await import('/src/services/profileValidation.ts');const original=await p.getMyProfile();const draft=v.profileDraft(original);draft.headline='Explicit headline';const patch=v.buildProfilePatch(original,draft);const unsupported={...original};delete unsupported.open_to_team_invitations;const missing=v.profileDraft(unsupported);return {omitted:!('open_to_team_invitations' in patch),missing:missing.open_to_team_invitations===undefined,unsupportedOmitted:!('open_to_team_invitations' in v.buildProfilePatch(unsupported,missing))}})()",
  )
  assert.deepEqual(semantics, {
    omitted: true,
    missing: true,
    unsupportedOmitted: true,
  })
  await fixture("control", {
    failures: [{ method: "PATCH", path: "/api/me/profile$", commit: true }],
  })
  await evaluate(
    "document.querySelector('input[name=open_to_team_invitations]').click()",
  )
  await click("Save profile")
  await waitFor(
    "!document.querySelector('input[name=open_to_team_invitations]')",
  )
  state = await fixture("state")
  assert.equal(
    state.teammateProfiles.find((p) => p.user_id === member.user_id)
      .open_to_team_invitations,
    false,
  )
  assert.equal(
    state.requests.filter(
      (r) => r.path === "/api/me/profile" && r.method === "PATCH",
    ).length,
    1,
  )
  pass(
    "Unchanged/unsupported consent is omitted, and a lost Profile PATCH response is confirmed by GET without a duplicate PATCH",
  )
  const successor = { ...leader, user_id: people[2].user_id, display_name: "Current Project Leader" }
  await reset({ projects: [{ ...project, leader: { ...project.leader, user_id: successor.user_id, display_name: successor.display_name } }], invitations: [structuredClone(invitation)], currentUser: successor })
  await account(successor, `/candidates?project_id=${project.project_id}&tab=Invited`)
  await waitFor("Boolean(document.querySelector('[data-invitation-id]'))")
  await click("Review invitation")
  await click("Confirm Cancel Invitation")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await fixture("state")).invitations[0].status, "cancelled")
  pass("Current Project Leader can read/cancel a historical Invitation from a different original sender")
  await reset({ projects: [{ ...project, status: "archived" }], invitations: [structuredClone(invitation)] })
  await account(leader, `/candidates?project_id=${project.project_id}&tab=Invited`)
  await waitFor("Boolean(document.querySelector('[data-invitation-id]')) && document.body.innerText.includes('historical invitation is preserved')")
  assert.equal(await evaluate(`document.body.innerText.includes('${project.project_id}')`), true)
  pass("Leader history remains readable through its protected API when archived Project detail returns 404")
  await reset({
    teammateProfiles: people.map((p) => ({
      ...p,
      open_to_team_invitations: false,
    })),
  })
  await account(
    leader,
    `/discover?mode=teammates&project_id=${project.project_id}&position_id=${project.positions[0].position_id}`,
  )
  await waitFor("document.body.innerText.includes('No eligible candidates')")
  assert.equal(
    await evaluate("Boolean(document.querySelector('.cursor-grab'))"),
    false,
  )
  pass(
    "Empty eligibility is displayed honestly without sample candidates or automatic opt-in",
  )
  assert.equal(browser.exceptions.length, 0)
  console.log(
    `All ${checks} Teammates failure/privacy/history checks passed against Postman HTTP simulation.`,
  )
} catch (reason) {
  console.error(reason)
  console.error((await evaluate("document.body.innerText")).slice(-5000))
  await browser.screenshot("failure.png")
  process.exitCode = 1
} finally {
  await app.close()
}
