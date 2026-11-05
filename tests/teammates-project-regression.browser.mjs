// Current Project UI regression, independent of the legacy full-page preview selector.
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import recruitmentHarness from "./recruitment-harness.mjs"

const app = await recruitmentHarness()
const { browser, fixture } = app
const { go, waitFor, evaluate, click } = browser
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let checks = 0
const pass = label => console.log(`PASS ${++checks}: ${label}`)
const press = async label => { await pause(300); await waitFor(`document.querySelector('[aria-label="${label}"]')?.disabled===false`); await evaluate(`document.querySelector('[aria-label="${label}"]').click()`) }
try {
  const initial = await fixture("reset", {})
  const project = initial.projects[1]
  const member = { user_id: initial.projects[0].leader.user_id, display_name: "Member", university: "FPT", email: "member@example.com", username: "member", status: "active", roles: ["Member"], is_onboarding_completed: true }
  const leader = { ...member, user_id: project.leader.user_id, display_name: "Leader", username: "leader", email: "leader@example.com" }
  const account = async (user, route) => { await fixture("control", { currentUser: user }); await go("/login"); await evaluate(`localStorage.setItem('tindy_access_token',${JSON.stringify(`fixture-${user.user_id}`)})`); await go(route) }
  await fixture("reset", { projects: [project], currentUser: member, matchScore: 73, teammatesEnabled: true })
  await go("/discover"); await waitFor("document.querySelector('[data-server-match-score]')?.textContent==='73%'")
  await press("Save for later"); await waitFor("document.body.innerText.includes('All Projects Reviewed')")
  assert.equal(Object.values((await fixture("state")).interactions).filter(i => i.is_saved).length, 1)
  await go("/projects?tab=Saved"); await waitFor("document.querySelector('.project-grid')?.textContent.includes('Persisted Project')")
  await go("/discover"); await waitFor("Boolean(document.querySelector('.cursor-grab'))")
  await press("Skip"); await waitFor("document.body.innerText.includes('All Projects Reviewed')")
  assert.equal(Object.values((await fixture("state")).interactions).filter(i => i.is_skipped).length, 1)
  await click("Undo Last Action"); await waitFor("Boolean(document.querySelector('.cursor-grab'))")
  assert.equal(Object.values((await fixture("state")).interactions).some(i => i.is_skipped), false)
  pass("Project server score, Save/Saved tab, Skip and Undo preserve their existing HTTP behavior")
  await press("Apply"); await waitFor("Boolean(document.querySelector('[role=dialog]'))")
  assert.equal(((await fixture("state")).applications ?? []).length, 0)
  await click("Cancel"); await waitFor("!document.querySelector('[role=dialog]')")
  await press("Apply"); await click("Confirm application"); await waitFor("!document.querySelector('[role=dialog]')")
  let state = await fixture("state")
  assert.equal(state.applications.length, 1); assert.equal(state.applications[0].status, "pending"); assert.equal(state.projects[0].team_members.length, 1)
  await go("/projects?tab=Interested"); await waitFor("document.querySelector('.project-grid')?.textContent.includes('Persisted Project')")
  pass("Project Apply remains confirmation-only and Interested reads the resulting server Application")
  await account(leader, `/project/${project.project_id}/applications`)
  await waitFor("document.querySelectorAll('[data-review-application]').length===1")
  assert.equal(await evaluate("document.querySelector('[data-applied-match-score]').textContent"), "41%")
  await click("Accept"); await waitFor("Boolean(document.querySelector('[role=dialog]'))"); await click("Cancel")
  assert.equal((await fixture("state")).requests.filter(r => r.method === "POST" && r.path.endsWith("/accept")).length, 0)
  await fixture("control", { failures: [{ method: "POST", path: "/accept$", status: 409, code: "PROJECT_CAPACITY_EXCEEDED" }] })
  await click("Accept"); await click("Confirm accept"); await waitFor("document.body.innerText.includes('team is full')")
  state = await fixture("state"); assert.equal(state.projects[0].team_members.length, 1); assert.equal(state.applications[0].status, "pending")
  await click("Refresh"); await waitFor("!document.querySelector('[role=alert]') && document.querySelectorAll('[data-review-application]').length===1")
  await click("Accept"); await click("Confirm accept"); await waitFor("document.querySelectorAll('[data-review-application]').length===0 && !document.querySelector('[role=dialog]')")
  state = await fixture("state"); assert.equal(state.applications[0].status, "accepted"); assert.equal(state.projects[0].positions[0].filled_count, 1); assert.equal(state.projects[0].current_team_size, 2)
  pass("Leader Approval retains real applied-position score, confirmation, capacity error handling and confirmed membership")
  const now = new Date().toISOString()
  const pendingInvitation = {
    invitation_id: randomUUID(), project_id: project.project_id, position_id: project.positions[0].position_id,
    invited_user_id: randomUUID(), inviting_leader_id: leader.user_id, status: "pending", message: null,
    created_at: now, updated_at: now, expires_at: new Date(Date.parse(now) + 168 * 3600000).toISOString(), responded_at: null,
  }
  await fixture("control", { invitations: [pendingInvitation] })
  await go("/leader?demo=1")
  const metric = label => `Array.from(document.querySelectorAll('.metric-card')).find(el=>el.querySelector('.metric-card-header')?.textContent===${JSON.stringify(label)})?.querySelector('.metric-card-value')?.textContent.trim()`
  await waitFor(`${metric("Pending invitations")}==='1' && ${metric("Filled team seats")}==='2'`)
  await waitFor(`${metric("Pending applications")}==='0'`)
  const expectedOpenings = state.projects[0].positions.filter(p => p.status === "open").reduce((sum, p) => sum + Math.max(0, p.required_count - p.filled_count), 0)
  await waitFor(`${metric("Open positions")}===${JSON.stringify(String(expectedOpenings))}`)
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label*=preview]'))"), false)
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).some(a=>a.textContent==='Find Teammates' && a.href.includes('project_id='))"), true)
  await fixture("control", { invitations: [] })
  await evaluate("window.dispatchEvent(new Event('focus'))")
  await waitFor(`${metric("Pending invitations")}==='0'`)
  pass("Leader dashboard reads actual counts, refreshes invitations, links to teammate APIs and has no sample candidate/chat panel")
  await account(member, "/projects?tab=Active")
  await waitFor("document.querySelector('.project-grid')?.textContent.includes('Persisted Project') && document.body.innerText.includes('Team member')")
  assert.ok((await fixture("state")).requests.some(r => r.path === "/api/me/projects" && r.user_id === member.user_id))
  pass("My Projects Active loads actual server membership after application approval")
  const before = await evaluate("localStorage.getItem('tindy-v3-active')")
  await go("/projects?tab=Invited&demo=1")
  await waitFor("document.body.innerText.includes('Project invitations') && document.body.innerText.includes('No invitations')")
  assert.equal(await evaluate("Array.from(document.querySelectorAll('[aria-label]')).some(el=>el.getAttribute('aria-label')==='Invitations demo preview')"), false)
  assert.equal(await evaluate("localStorage.getItem('tindy-v3-active')"), before)
  assert.equal((await fixture("state")).projects[0].team_members.length, 2)
  assert.ok((await fixture("state")).requests.some(r => r.path === "/api/me/project-invitations" && r.user_id === member.user_id))
  await go("/discover?mode=teammates&demo=1")
  await waitFor("Boolean(document.querySelector('[data-live-teammates]')) && !new URLSearchParams(location.search).has('demo')")
  await go("/candidates")
  await waitFor("document.body.innerText.includes('Candidate Pipeline')")
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('Demo')"), false)
  pass("Teammates, Candidates and Invitations use server routes without configuration or mock membership")
  assert.equal(browser.exceptions.length, 0)
  console.log(`All ${checks} current Project/Apply/Approval/cutover regression checks passed against HTTP simulation.`)
} catch (reason) { console.error(reason); console.error((await evaluate("document.body.innerText")).slice(-5500)); process.exitCode = 1 }
finally { await app.close() }
