import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import recruitmentHarness from "./recruitment-harness.mjs"

const app = await recruitmentHarness()
const { browser, fixture } = app
const { evaluate, waitFor, go, click } = browser
let checks = 0
const pass = message => console.log(`PASS ${++checks}: ${message}`)
const switchMode = async index => {
  await evaluate(`document.querySelectorAll('[aria-label="Discovery Mode Switcher"] button')[${index}].click()`)
}
const press = async label => {
  const selector = `[aria-label="${label}"]`
  await waitFor(`document.querySelector(${JSON.stringify(selector)})?.disabled===false`)
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
}
const live = () => waitFor("Boolean(document.querySelector('[data-live-discovery]')) && document.querySelector('[data-server-match-score]')?.textContent==='73%'")
const teammates = () => waitFor("document.body.innerText.includes('Discover Candidates for Your Team') && !document.querySelector('[data-live-discovery]')")
try {
  const original = await fixture("reset", {})
  const template = original.projects[1]
  const projects = Array.from({ length: 3 }, (_, index) => {
    const id = randomUUID()
    return { ...template, project_id: id, name: `Server Project ${index}`, positions: template.positions.map(position => ({ ...position, project_id: id, position_id: randomUUID() })) }
  })
  await fixture("reset", { projects, matchScore: 73 })
  await go("/discover"); await live()
  assert.equal(await evaluate("document.querySelector('.cursor-grab h3').textContent"), "Server Project 0")
  assert.equal(await evaluate("document.querySelector('[aria-label=Apply]').textContent.trim()"), "Apply")
  pass("Find Projects uses the server feed, score and Apply action")

  const skipFeedback = await evaluate(`(async () => {
    const button=document.querySelector('.skip-micro-btn');button.click();await new Promise(resolve=>setTimeout(resolve,40));
    return { button:button.classList.contains('is-active'),icon:button.querySelector('.skip-micro-icon').classList.contains('is-active') };
  })()`)
  assert.deepEqual(skipFeedback, { button: true, icon: true })
  await waitFor("document.querySelector('.cursor-grab h3')?.textContent==='Server Project 1'")
  assert.equal(Object.values((await fixture("state")).interactions).filter(row => row.is_skipped).length, 1)
  await waitFor("!document.querySelector('.skip-micro-btn').classList.contains('is-active')")
  pass("Skip preserves press feedback and removes the card only after its HTTP mutation")

  await press("Undo"); await waitFor("document.querySelector('.cursor-grab h3')?.textContent==='Server Project 0'")
  const starFeedback = await evaluate(`(async () => {
    const button=document.querySelector('.star-micro-btn');button.click();
    for(let index=0;index<250 && !button.querySelector('.star-micro-icon.is-popping');index++)await new Promise(resolve=>setTimeout(resolve,20));
    return { pop:!!button.querySelector('.star-micro-icon.is-popping'),aura:!!button.querySelector('.star-micro-aura'),particles:button.querySelectorAll('.star-micro-sparkle').length };
  })()`)
  assert.deepEqual(starFeedback, { pop: true, aura: true, particles: 3 })
  assert.equal(Object.values((await fixture("state")).interactions).filter(row => row.is_saved).length, 1)
  await waitFor("!document.querySelector('.star-micro-sparkle') && !document.querySelector('.star-micro-aura')")
  pass("Save retains confirmed icon pop/aura/three sparkles and cleans up the animation")

  await press("Undo"); await waitFor("document.querySelector('.cursor-grab h3')?.textContent==='Server Project 0'")
  await press("Apply"); await waitFor("Boolean(document.querySelector('[role=dialog]'))")
  assert.equal(((await fixture("state")).applications ?? []).length, 0)
  await click("Cancel"); await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal(await evaluate("document.querySelector('.cursor-grab h3').textContent"), "Server Project 0")
  pass("Apply opens the real confirmation modal; cancelling never creates an application")

  const feedCallsBefore = (await fixture("state")).requests.filter(request => request.path === "/api/discovery/projects").length
  await switchMode(1); await teammates()
  assert.equal(await evaluate("document.querySelector('[role=note]').textContent.includes('Find Teammates uses sample candidates')"), true)
  assert.equal((await fixture("state")).requests.filter(request => request.path === "/api/discovery/projects").length, feedCallsBefore)
  await evaluate("history.back()"); await live()
  await evaluate("history.forward()"); await teammates()
  pass("Find Teammates stays mock-only; browser Back/Forward selects the correct data source")

  await switchMode(0); await live()
  assert.equal(await evaluate("new URLSearchParams(location.search).has('demo')"), false)
  assert.equal(await evaluate("document.body.innerText.includes('AI Customer Support Platform')"), false)
  pass("Find Projects inside the teammates screen returns to the backend feed")

  for (const route of ["/discover?demo=1", "/discover?demo=1&mode=projects", "/discover?demo=1&mode=student"]) {
    await go(route); await live()
    await waitFor("!new URLSearchParams(location.search).has('demo')")
    assert.equal(await evaluate("document.querySelector('.cursor-grab h3').textContent"), "Server Project 0")
  }
  for (const mode of ["teammates", "candidates", "leader"]) {
    await go(`/discover?mode=${mode}`); await teammates()
  }
  pass("Legacy project-demo URLs always use live data; teammate URL aliases retain mock candidates")

  await go("/discover?demo=1&mode=projects")
  await live()
  await fixture("control", { failures: [{ method: "GET", path: "^/api/discovery/projects$", status: 500 }] })
  await click("Refresh")
  await waitFor("!!document.querySelector('[data-live-discovery] [role=alert]')")
  assert.equal(await evaluate("!!document.querySelector('[data-server-match-score]')"), false)
  assert.equal(await evaluate("document.body.innerText.includes('AI Customer Support Platform')"), false)
  await click("Retry"); await live()
  pass("A project-feed API error shows Retry without falling back to sample Projects")

  await go(`/project/${projects[0].project_id}`)
  await waitFor("!!document.querySelector('.detail-skip-btn')")
  const detailFeedback = await evaluate(`(async () => {
    const button=document.querySelector('.detail-skip-btn');button.click();await new Promise(resolve=>setTimeout(resolve,40));
    return button.classList.contains('skip-micro-btn') && button.classList.contains('is-active');
  })()`)
  assert.equal(detailFeedback, true)
  assert.equal(browser.exceptions.length, 0)
  pass("Project Detail keeps Skip feedback; no uncaught browser exceptions")
  console.log(`All ${checks} Discovery action/routing checks passed against the local Postman simulation.`)
} catch (error) {
  console.error(error)
  console.error((await evaluate("document.body.innerText")).slice(0, 3500))
  process.exitCode = 1
} finally { await app.close() }
