import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import recruitmentHarness from "./recruitment-harness.mjs"

process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-candidates-polish/screenshots"
const app = await recruitmentHarness()
const { browser, fixture } = app
const { go, evaluate, waitFor, click } = browser
const text = (value) =>
  `document.body.innerText.includes(${JSON.stringify(value)})`
let checks = 0
const pass = (description) => console.log(`PASS ${++checks}: ${description}`)
let project, first, second, owner, memberA, memberB
const route = (tab, position = "") =>
  `/candidates?project_id=${project.project_id}&tab=${tab}${
    position ? `&position_id=${position}` : ""
  }`
const activeReady = () =>
  waitFor(
    "document.body.innerText.includes('Active members')&&!document.body.innerText.includes('Loading positions…')",
  )
try {
  const initial = await fixture("reset", {})
  project = initial.projects[0]
  first = project.positions[0]
  second = { ...first, position_id: randomUUID(), title: "Another Position" }
  owner = {
    user_id: project.leader.user_id,
    display_name: "Pipeline Leader",
    university: "FPT",
    email: null,
    username: null,
    status: "active",
    roles: ["Member"],
    is_onboarding_completed: true,
  }
  memberA = {
    user_id: randomUUID(),
    display_name: "Member Position A",
    role_title: "Shared Role Title",
    position_id: first.position_id,
    initials: "MA",
    is_leader: false,
    joined_at: new Date().toISOString(),
  }
  memberB = {
    ...memberA,
    user_id: randomUUID(),
    display_name: "Member Position B",
    position_id: second.position_id,
  }
  project = {
    ...project,
    positions: [first, second],
    team_members: [
      { ...project.team_members[0], position_id: null },
      memberA,
      memberB,
    ],
    current_team_size: 3,
    max_team_capacity: 6,
  }
  await fixture("control", {
    projects: [project],
    teammatesEnabled: true,
    currentUser: owner,
    teammateProfiles: [
      {
        user_id: owner.user_id,
        display_name: owner.display_name,
        open_to_team_invitations: true,
      },
    ],
  })
  await go("/login")
  await evaluate(
    `localStorage.setItem('tindy_access_token','fixture-pipeline')`,
  )
  await go(route("Active"))
  await activeReady()
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.teammate-records article').length",
    ),
    3,
  )
  assert.equal(await evaluate(text("Project Lead · Project Leader")), true)
  assert.equal(
    await evaluate(
      `document.querySelector('a[href="/users/${memberA.user_id}"]')!==null`,
    ),
    true,
  )
  pass(
    "Active without a Position shows every active member, including a nullable-position Leader, with role titles and profile links",
  )

  await go(route("Active", first.position_id))
  await activeReady()
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.teammate-records article').length",
    ),
    1,
  )
  assert.equal(await evaluate(text(memberA.display_name)), true)
  assert.equal(await evaluate(text(memberB.display_name)), false)
  await go(route("Active", second.position_id))
  await activeReady()
  assert.equal(await evaluate(text(memberB.display_name)), true)
  assert.equal(await evaluate(text(memberA.display_name)), false)
  pass(
    "Specific Position filtering uses position_id even when both members have the same role_title; unassigned Leader stays out",
  )

  await fixture("control", {
    projects: [
      {
        ...project,
        team_members: [project.team_members[0], memberA],
        current_team_size: 2,
      },
    ],
  })
  await go(route("Active", second.position_id))
  await activeReady()
  await waitFor(text("No active members assigned to this position."))
  await browser.screenshot("candidate-active-empty.png")
  await go(route("Archived", first.position_id))
  await waitFor(
    "new URLSearchParams(location.search).get('tab')==='Shortlisted'",
  )
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('[role=tab]')].some(t=>t.textContent.trim()==='Archived')",
    ),
    false,
  )
  assert.equal(
    await evaluate(text("Archive is unavailable in live mode")),
    false,
  )
  pass(
    "Empty Position has a precise Active empty state; old Archived URLs replace to Shortlisted and no archive tab/placeholder remains",
  )

  await go("/candidates?tab=Active")
  await waitFor(text("Select a project to get started"))
  assert.equal(await evaluate(text("No active members")), false)
  await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Choose project'&&!b.disabled)")
  await click("Choose project")
  assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "Teammate project")
  assert.equal(await evaluate("document.querySelector('.pipeline-state--prompt')?.getAttribute('role')"), "status")
  await browser.screenshot("candidate-choose-project.png")
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true)
  await evaluate("document.querySelector('.pipeline-state--prompt').scrollIntoView({block:'center'})")
  await browser.screenshot("candidate-choose-project-mobile.png")
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  await go(route("Saved"))
  await waitFor(text("Choose a position to view candidates"))
  await click("Choose position")
  assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "Teammate position")
  assert.equal(await evaluate("new URLSearchParams(location.search).has('position_id')"), false)
  await browser.screenshot("candidate-choose-position.png")
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true)
  await evaluate("document.querySelector('.pipeline-state--prompt').scrollIntoView({block:'center'})")
  await browser.screenshot("candidate-choose-position-mobile.png")
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  await go("/candidates?project_id=bad&tab=Active")
  await waitFor(text("Project couldn't be selected"))
  assert.equal(await evaluate("document.querySelector('.pipeline-state--error')?.getAttribute('role')"), "alert")
  await go(route("Active", randomUUID()))
  await waitFor(text("Position isn't available"))
  await go(`/candidates?project_id=${randomUUID()}&tab=Active`)
  await waitFor(text("Project couldn't be loaded"))
  assert.equal(await evaluate(text("Try again")), true)
  pass(
    "Missing Project/Position uses responsive guidance cards with working focus actions; invalid/inaccessible context remains an alert rather than loaded-empty results",
  )

  await fixture("control", {
    failures: [
      {
        method: "GET",
        path: `/api/projects/${project.project_id}$`,
        delayMs: 650,
      },
    ],
  })
  await go(route("Active"))
  await waitFor(text("Loading your project…"))
  assert.equal(await evaluate(text("No active members")), false)
  await activeReady()
  await fixture("control", {
    failures: [
      {
        method: "GET",
        path: `/api/projects/${project.project_id}/applications$`,
        delayMs: 650,
        repeat: true,
      },
    ],
  })
  await go(route("Interested"))
  await waitFor(text("Loading interested applicants…"))
  assert.equal(
    await evaluate(text("No pending applications yet")),
    false,
  )
  await waitFor(text("No pending applications yet"))
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Application pages\"]'))"),false)
  assert.equal(await evaluate(text('Source: pending Project Applications.')),false)
  assert.equal(await evaluate("document.querySelector('.pipeline-applications-empty a')?.getAttribute('href')"),'/discover?mode=teammates&project_id='+project.project_id)
  await browser.screenshot('candidate-interested-empty.png')
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
  await browser.screenshot('candidate-interested-mobile.png')
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false})

  await fixture("control", {
    failures: [
      {
        method: "GET",
        path: `/api/projects/${project.project_id}/applications$`,
        status: 503,
        repeat: true,
      },
    ],
  })
  await go(route("Interested"))
  await waitFor(text("Retry applications"))
  assert.equal(
    await evaluate(text("No pending applications yet")),
    false,
  )
  await fixture("control", { failures: [] })
  await click("Retry applications")
  await waitFor(text("No pending applications yet"))
  pass(
    "Active context and Interested distinguish loading, loaded empty, API error and recoverable retry",
  )

  for (const tab of ["Shortlisted", "Saved", "Skipped"]) {
    await fixture("control", {
      failures: [
        { method: "GET", path: "/candidate-interactions$", delayMs: 1200, repeat: true },
      ],
    })
    await go(route(tab, first.position_id))
    await waitFor(text("Loading stored candidates…"))
    assert.equal(
      await evaluate(
        text(`No ${tab.toLowerCase()} candidates for this position.`),
      ),
      false,
    )
    await waitFor(text(`No ${tab.toLowerCase()} candidates for this position.`))
    await fixture("control", {
      failures: [
        { method: "GET", path: "/candidate-interactions$", status: 500, repeat: true },
      ],
    })
    await go(route(tab, first.position_id))
    await waitFor(text("Retry candidates"))
    await fixture("control", { failures: [] })
    await click("Retry candidates")
    await waitFor(text(`No ${tab.toLowerCase()} candidates for this position.`))
    assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Candidate interaction pages\"]'))"), false)
    assert.equal(await evaluate("document.querySelector('.pipeline-state--empty a')?.getAttribute('href')"), `/discover?mode=teammates&project_id=${project.project_id}&position_id=${first.position_id}`)
    await browser.screenshot(`candidate-${tab.toLowerCase()}-empty.png`)
    await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true)
    await browser.screenshot(`candidate-${tab.toLowerCase()}-mobile.png`)
    await evaluate("document.querySelector('.pipeline-state--empty').scrollIntoView({block:'center'})")
    await browser.screenshot(`candidate-${tab.toLowerCase()}-mobile-state.png`)
    await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  }
  await fixture("control", {
    failures: [{ method: "GET", path: "/invitations$", delayMs: 1200, repeat: true }],
  })
  await go(route("Invited"))
  await waitFor(text("Loading invitation history…"))
  await waitFor(text("No invitations in this view"))
  await fixture("control", {
    failures: [{ method: "GET", path: "/invitations$", status: 500, repeat: true }],
  })
  await click("Refresh invitations")
  await waitFor(text("Retry invitations"))
  await fixture("control", { failures: [] })
  await click("Retry invitations")
  await waitFor(text("No invitations in this view"))
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Invitation pages\"]'))"), false)
  assert.equal(await evaluate(text("Invitation records from the Backend will appear here.")), false)
  await browser.screenshot("candidate-invited-empty.png")
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true)
  await browser.screenshot("candidate-invited-mobile.png")
  await evaluate("document.querySelector('.pipeline-state--empty').scrollIntoView({block:'center'})")
  await browser.screenshot("candidate-invited-mobile-state.png")
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  await evaluate("const filter=document.querySelector('select[aria-label=\"Invitation status\"]');filter.value='accepted';filter.dispatchEvent(new Event('change',{bubbles:true}))")
  await waitFor(text("Show all invitations"))
  assert.equal(await evaluate("document.querySelector('.pipeline-state--empty a')===null"), true)
  await click("Show all invitations")
  await waitFor("document.querySelector('select[aria-label=\"Invitation status\"]')?.value==='all'&&!!document.querySelector('.pipeline-state--empty a')")
  pass(
    "Shortlisted, Saved, Skipped and Invited distinguish loading/empty/errors, hide empty pagination, preserve contextual discovery links, reset status filters and fit mobile",
  )

  await go("/settings")
  await waitFor(text("Manage Team Invitations"))
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Save preferences')",
    ),
    false,
  )
  for (const label of [
    "Email notifications",
    "Project invitations",
    "New recommendations",
    "Team announcements",
  ])
    assert.equal(
      await evaluate(
        `document.querySelector('#preferences')?.textContent.includes(${JSON.stringify(label)})`,
      ),
      false,
    )
  assert.equal(
    await evaluate(
      text("Important project invitation updates are delivered inside Tindy."),
    ),
    true,
  )
  await click("Manage Team Invitations", "a")
  await waitFor(
    "Boolean(document.querySelector('input[name=open_to_team_invitations]'))",
  )
  await waitFor(
    "document.activeElement?.getAttribute('name')==='open_to_team_invitations'",
  )
  assert.equal(
    await evaluate(
      "document.querySelectorAll('input[name=open_to_team_invitations]').length",
    ),
    1,
  )
  assert.equal(
    await evaluate(
      "document.querySelector('input[name=open_to_team_invitations]').checked",
    ),
    true,
  )
  await evaluate(
    "document.querySelector('input[name=open_to_team_invitations]').click()",
  )
  await click("Save profile")
  await waitFor(
    "!document.querySelector('input[name=open_to_team_invitations]')",
  )
  const patch = (await fixture("state")).requests
    .filter((r) => r.method === "PATCH" && r.path === "/api/me/profile")
    .at(-1)
  assert.deepEqual(patch.body, { open_to_team_invitations: false })
  pass(
    "Settings removes fake preferences; Manage Team Invitations opens/focuses the single real opt-in and sends only its changed field",
  )
  await go(route("Active"))
  await activeReady()
  await browser.screenshot("candidate-active.png")
  assert.equal(browser.exceptions.length, 0)
  await mkdir(".tmp-candidates-polish", { recursive: true })
  await writeFile(
    ".tmp-candidates-polish/requests.json",
    JSON.stringify((await fixture("state")).requests, null, 2),
  )
  console.log(
    `All ${checks} candidate/settings browser checks passed against the local Postman simulation.`,
  )
} catch (error) {
  console.error(error)
  console.error((await evaluate("document.body.innerText")).slice(-6000))
  await browser.screenshot("failure.png")
  process.exitCode = 1
} finally {
  await app.close()
}
