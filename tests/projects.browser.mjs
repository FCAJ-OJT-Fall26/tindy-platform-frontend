import { createServer } from "vite"
import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import assert from "node:assert/strict"
import { waitForBrowser } from "./profile-fixture.mjs"

const ID = "22222222-2222-4222-8222-222222222222"
const POS = "33333333-3333-4333-8333-333333333333"
const ROLE = "44444444-4444-4444-8444-444444444444"
const SKILL = "55555555-5555-4555-8555-555555555555"
const EXTRA = "66666666-6666-4666-8666-666666666666"
const USER = "11111111-1111-4111-8111-111111111111"
const draftPosition = { id: "draft-one", roleId: ROLE, role: "Backend Developer", title: "Backend Developer", description: "  Develop REST APIs  ", count: 1, level: "intermediate", status: "open", requiredSkills: [{ skill_id: SKILL, name: ".NET" }], niceSkills: [] }
const draftFields = { name: "Created From Browser", tagline: "Build the real project API", jd: "Develop a collaborative project platform using real APIs.", goals: "Ship the API", type: "Web Application", hours: 10, durationMonths: 3, capacity: 5, difficulty: "intermediate", positionsList: [draftPosition] }
let simulation, server, chrome, ws, profileDir
let simulationOutput = "", simulationErrors = "", sequence = 0, checks = 0
const pending = new Map(), pageErrors = []
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const pass = message => { checks++; console.log(`PASS ${checks}: ${message}`) }
function send(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result?.value
}
const wait = predicate => waitForBrowser(evaluate, predicate)
const click = async selector => {
  await wait(`Boolean(document.querySelector(${JSON.stringify(selector)})) && !document.querySelector(${JSON.stringify(selector)}).disabled`)
  return evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
}
const setValue = (selector, value) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); const prototype=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true})); })()`)
async function startSimulation() {
  if (process.env.TINDY_PROJECT_SIM_URL) return process.env.TINDY_PROJECT_SIM_URL
  simulation = spawn("postman", ["simulation", "run", "postman/simulations/project-crud.sim.yaml", "--port", "auto", "--no-history", "--output", "ndjson"], { shell: process.platform === "win32", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })
  simulation.stdout.on("data", chunk => simulationOutput += chunk)
  simulation.stderr.on("data", chunk => simulationErrors += chunk)
  for (let n = 0; n < 200; n++) {
    for (const line of simulationOutput.split("\n")) {
      try { const event = JSON.parse(line); if (event.event === "listening") return `${event.url}/tindy` } catch {}
    }
    if (simulation.exitCode !== null) throw new Error(simulationErrors || simulationOutput)
    await delay(100)
  }
  throw new Error("Simulation startup timed out: " + simulationErrors)
}
try {
  const backend = await startSimulation()
  async function fixture(route, body) {
    const response = await fetch(`${backend}/__test/${route}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
    assert.equal(response.status, 200)
    return (await response.json()).data
  }
  const reset = body => fixture("reset", body || {})
  const state = () => fixture("state")
  const control = body => fixture("control", body)
  server = await createServer({
    cacheDir: ".tmp-project-vite-cache",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("") },
    server: { port: 0, host: "127.0.0.1", strictPort: false, proxy: { "/api": { target: new URL(backend).origin, rewrite: value => "/tindy" + value, secure: false } } },
    plugins: [{ name: "project-contract-test-page", configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith("/__project_workspace")) return next()
      res.setHeader("Content-Type", "text/html"); res.end(await vite.transformIndexHtml(req.url, '<html><body><div id="root"></div><script type="module" src="/tests/projects-workspace.tsx"></script></body></html>'))
    }) } }],
  })
  await server.listen()
  const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
  profileDir = await mkdtemp(path.join(tmpdir(), "tindy-project-test-"))
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "--no-first-run", "--no-default-browser-check", "--disable-background-networking"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] })
  const browserEndpoint = await new Promise((resolve, reject) => {
    let output = ""
    const timeout = setTimeout(() => reject(new Error("Chrome startup timed out: " + output)), 15_000)
    chrome.stderr.on("data", chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]) } })
    chrome.once("error", error => { clearTimeout(timeout); reject(error) })
    chrome.once("exit", code => { clearTimeout(timeout); reject(new Error("Chrome exited " + code + output)) })
  })
  const browserUrl = new URL(browserEndpoint)
  const targets = await fetch(`http://${browserUrl.host}/json/list`).then(res => res.json())
  ws = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl)
  await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }))
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data)
    if (message.id) { const entry = pending.get(message.id); pending.delete(message.id); message.error ? entry?.reject(new Error(JSON.stringify(message.error))) : entry?.resolve(message.result) }
    if (message.method === "Runtime.exceptionThrown") pageErrors.push(message.params.exceptionDetails)
    if (message.method === "Page.javascriptDialogOpening") void send("Page.handleJavaScriptDialog", { accept: true })
  })
  await send("Page.enable"); await send("Runtime.enable")
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "localStorage.setItem('tindy_access_token','synthetic-project-token');" })
  async function visit(route) { await send("Page.navigate", { url: origin + route }); await wait("Boolean(document.querySelector('#root')?.children.length)") }
  async function draft(fields = draftFields, progress = { positionIds: {} }) {
    await evaluate(`sessionStorage.setItem(${JSON.stringify("tindy-project-draft:" + USER + ":new")},${JSON.stringify(JSON.stringify({ fields, progress }))})`)
  }
  async function loadModules() {
    await evaluate("(async()=>{window.projectApi=await import('/src/services/projects.service.ts');window.projectEditor=await import('/src/services/projectEditor.service.ts');window.apiClient=await import('/src/services/apiClient.ts');})()")
  }
  async function advanceToReview() {
    await wait("Boolean(document.querySelector('.project-unified-form'))")
    for (let step = 0; step < 2; step++) {
      if (!await evaluate("Boolean(document.querySelector('.continue-btn'))")) break
      const previous = await evaluate("document.querySelector('[aria-current=step]').textContent")
      await click(".continue-btn")
      await wait(`document.querySelector('[aria-current=step]')?.textContent !== ${JSON.stringify(previous)}`)
    }
    await wait("document.querySelector('.submit-btn')?.disabled===false")
  }
  await reset()
  await visit("/leader")
  await wait("document.querySelectorAll('.leader-project').length===1")
  assert.equal(await evaluate("document.querySelectorAll('.leader-project h2').length"), 1)
  assert.equal(await evaluate("document.querySelector('.leader-project a[href$=\"/edit\"]').getAttribute('href')"), `/project/${ID}/edit`)
  pass("Leader Dashboard uses /me/projects, excludes a same-name leader with another UUID")

  await control({ failures: [{ method: "DELETE", path: "^/api/projects/" + ID + "$", status: 500 }] })
  await click('[aria-label="Archive Project"]')
  await wait("document.querySelector('[role=alert]')?.textContent.includes('server')")
  assert.equal(await evaluate("document.querySelectorAll('.leader-project').length"), 1)
  pass("Failed archive keeps the Project visible and exposes an error")
  await click('[aria-label="Archive Project"]')
  await wait("document.querySelectorAll('.leader-project').length===0")
  assert.equal((await state()).projects.find(p => p.project_id === ID).status, "archived")
  pass("Confirmed archive removes the active card and closes server Positions")

  await reset()
  await evaluate("sessionStorage.clear()")
  await visit("/create-project")
  await wait("Boolean(document.querySelector('.continue-btn'))")
  assert.equal(await evaluate("document.querySelectorAll('.project-step-panel').length"), 1)
  assert.equal(await evaluate("Boolean(document.querySelector('.submit-btn'))"), false)
  await click(".project-section-nav button:nth-of-type(3)")
  await wait("Boolean(document.querySelector('#project-error-name'))")
  assert.equal(await evaluate("Boolean(document.querySelector('#section-big-picture'))"), true)
  assert.equal(await evaluate("document.querySelector('#project-name-input').getAttribute('aria-invalid')"), "true")
  pass("Creation starts on one panel; jumping ahead validates the current details and never exposes Publish early")
  await setValue("#project-name-input", "Three Step Project")
  await setValue("#project-desc-input", "Create a collaborative project with three focused steps.")
  await setValue("#project-goals-input", "Deliver the first release")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#section-people-skills'))")
  assert.equal(await evaluate("Boolean(document.querySelector('#section-big-picture'))"), false)
  await wait("document.querySelector('.continue-btn')?.disabled===false")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#project-error-positions'))")
  await click(".empty-add-role-btn")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#project-error-role'))")
  await setValue("#position-role-input", ROLE)
  await setValue("#position-title-input", "Backend Developer")
  await setValue("#position-count-input", "2")
  await click(".required-skills-box .skill-add-trigger-btn")
  await click(`[data-skill-id="${SKILL}"]`)
  await click(".project-skill-selector-modal-footer .btn-primary")
  await wait("!document.querySelector('.project-skill-selector-modal-footer')")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('.project-review-summary'))")
  assert.equal(await evaluate("Boolean(document.querySelector('#section-people-skills'))"), false)
  assert.equal((await state()).requests.filter(request => request.method === "POST" && request.path === "/api/projects").length, 0)
  pass("People & skills validates positions, keeps catalog UUIDs and reaches review without creating a Project")
  await setValue("#hours-input", "0")
  await click(".submit-btn")
  await wait("Boolean(document.querySelector('#project-error-hours'))")
  assert.equal(await evaluate("Boolean(document.querySelector('#save-dialog-title'))"), false)
  await setValue("#hours-input", "12")
  await setValue("#duration-input", "4")
  await click(".wizard-back-btn")
  await wait("Boolean(document.querySelector('#position-count-input'))")
  assert.equal(await evaluate("document.querySelector('#position-count-input').value"), "2")
  assert.equal(await evaluate("document.querySelector('#position-role-input').value"), ROLE)
  assert.equal(await evaluate("document.querySelector('.required-skills-box').textContent.includes('.NET')"), true)
  await click(".wizard-back-btn")
  await wait("Boolean(document.querySelector('#project-name-input'))")
  assert.equal(await evaluate("document.querySelector('#project-name-input').value"), "Three Step Project")
  await click(".project-section-nav button:nth-of-type(3)")
  await wait("Boolean(document.querySelector('#hours-input'))")
  assert.equal(await evaluate("document.querySelector('#hours-input').value"), "12")
  assert.equal(await evaluate("document.querySelector('#duration-input').value"), "4")
  pass("Back and step navigation preserve all inputs; invalid commitment cannot open the publish confirmation")
  await click(".project-review-summary button")
  await wait("Boolean(document.querySelector('#light-preview-header-title'))")
  await click('[aria-label="Close preview"]')
  await visit("/create-project")
  await wait("Boolean(document.querySelector('.project-review-summary'))")
  assert.equal(await evaluate("document.querySelector('#hours-input').value"), "12")
  await mkdir('.tmp-project-results', { recursive: true })
  let wizardShot = await send('Page.captureScreenshot')
  await writeFile('.tmp-project-results/project-wizard-desktop.png', Buffer.from(wizardShot.data, 'base64'))
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(600)
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.project-form-sidebar-col')).display"), "none")
  assert.equal(await evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), true)
  wizardShot = await send('Page.captureScreenshot')
  await writeFile('.tmp-project-results/project-wizard-mobile.png', Buffer.from(wizardShot.data, 'base64'))
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  pass("Refresh restores the current creation step; preview remains available and the mobile wizard fits the viewport")
  const dateChecks = await evaluate(`(async () => { const dates = await import('/src/services/recruitmentDeadline.ts'); return { today: dates.vietnamDate(), tomorrow: dates.addCalendarDays(dates.vietnamDate(),1), before: dates.vietnamDate(new Date('2026-10-30T16:59:59Z')), after: dates.vietnamDate(new Date('2026-10-30T17:00:00Z')), invalid: dates.validFutureDate('2026-02-30','2026-01-01') }; })()`)
  assert.equal(dateChecks.before, "2026-10-30"); assert.equal(dateChecks.after, "2026-10-31"); assert.equal(dateChecks.invalid, false)
  for (const days of [7, 14, 30]) {
    await setValue('#recruitment-deadline-mode', String(days))
    assert.equal(await evaluate(`document.querySelector('.project-review-summary').textContent.includes(new Intl.DateTimeFormat('en',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(Date.parse(${JSON.stringify(dateChecks.today)}+'T00:00:00Z')+${days}*86400000)))`), true)
  }
  await setValue('#recruitment-deadline-mode', 'custom')
  await setValue('#recruitment-closing-date', dateChecks.today)
  await click('.submit-btn'); await wait("Boolean(document.querySelector('#project-error-deadline'))")
  assert.equal(await evaluate("Boolean(document.querySelector('#save-dialog-title'))"), false)
  await setValue('#recruitment-closing-date', dateChecks.tomorrow)
  await visit('/create-project'); await wait("Boolean(document.querySelector('#recruitment-closing-date'))")
  assert.equal(await evaluate("document.querySelector('#recruitment-closing-date').value"), dateChecks.tomorrow)
  assert.equal(await evaluate("document.querySelector('#recruitment-closing-date').min"), dateChecks.tomorrow)
  await setValue('#recruitment-deadline-mode', '14')
  pass("Vietnam midnight conversion, 7/14/30 presets, future-only custom validation and deadline draft restoration")
  await reset()
  await draft()
  await visit("/create-project")
  await advanceToReview()
  await control({ failures: [{ method: "POST", path: "^/api/projects$", status: 400 }] })
  await click(".submit-btn"); await wait("Boolean(document.querySelector('#save-dialog-title'))"); await evaluate("(() => { const button=document.querySelector('.save-confirm-modal-footer .primary');button.click();button.click(); })()")
  await wait("document.querySelector('[role=alert]')?.textContent.includes('Injected backend failure')")
  assert.equal(await evaluate("location.pathname"), "/create-project")
  await click(".project-section-nav button:nth-of-type(1)")
  await wait("Boolean(document.querySelector('#project-name-input'))")
  assert.equal(await evaluate("document.querySelector('#project-name-input').value"), draftFields.name)
  await advanceToReview()
  assert.equal((await state()).projects.length, 2)
  assert.equal((await state()).requests.filter(request => request.method === "POST" && request.path === "/api/projects").length, 1)
  assert.equal(await evaluate("localStorage.getItem('tindy-v2-projects')"), null)
  pass("Create 400 preserves input and produces no fake Project, local cache or success navigation")
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("location.pathname==='/leader'")
  await wait("document.querySelectorAll('.leader-project').length===2")
  let fixtureState = await state()
  let created = fixtureState.projects.find(p => p.name === draftFields.name)
  assert.ok(created && created.project_id.match(/^[a-f0-9-]{36}$/))
  assert.equal(created.initial_team_size, 1)
  assert.equal(created.current_team_size, 1)
  assert.equal(created.positions[0].description, "Develop REST APIs")
  assert.equal(created.positions[0].role_id, ROLE)
  assert.equal(created.positions[0].skills[0].skill_id, SKILL)
  const creationRequest = fixtureState.requests.filter(request => request.method === 'POST' && request.path === '/api/projects').at(-1).body
  assert.match(creationRequest.recruitment_closing_date, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal('recruitment_closing_days' in creationRequest, false)
  pass("Create retry after explicit rejection saves real UUID, catalog IDs, one Leader and Position description")

  await draft({ ...draftFields, positionsList: [{ ...draftPosition, roleId: "99999999-9999-4999-8999-999999999999" }] })
  await visit("/create-project")
  await wait("document.querySelector('[role=alert]')?.textContent.includes('unavailable')")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#section-people-skills'))")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#project-error-role'))")
  assert.equal(await evaluate("Boolean(document.querySelector('.submit-btn'))"), false)
  pass("Unavailable selected Role blocks saving without substituting another Role")
  await draft({ ...draftFields, positionsList: [{ ...draftPosition, requiredSkills: [{ skill_id: "99999999-9999-4999-8999-999999999999", name: ".NET" }] }] })
  await visit("/create-project")
  await wait("document.querySelector('[role=alert]')?.textContent.includes('skill')")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#section-people-skills'))")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#project-error-skills'))")
  assert.equal(await evaluate("Boolean(document.querySelector('.submit-btn'))"), false)
  pass("Unavailable selected Skill blocks saving even when its name matches an active Skill")
  await control({ catalogUnavailable: true })
  await draft(); await visit("/create-project")
  await wait("document.querySelector('[role=alert]')?.textContent.includes('Catalog unavailable')")
  await click(".continue-btn")
  await wait("Boolean(document.querySelector('#section-people-skills'))")
  assert.equal(await evaluate("document.querySelector('.continue-btn').disabled"), true)
  await control({ catalogUnavailable: false }); await click("[role=alert] button")
  await advanceToReview()
  pass("Catalog failure disables saving and catalog reload restores the form")

  await control({ failures: [{ method: "POST", path: "^/api/projects$", network: true }] })
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("Boolean(document.querySelector('[role=alert]')) && !document.querySelector('.submit-btn').disabled")
  assert.equal(await evaluate("location.pathname"), "/create-project")
  const postCount = (await state()).requests.filter(r => r.method === "POST" && r.path === "/api/projects").length
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("document.querySelector('[role=alert]')?.textContent.includes('unknown outcome')")
  assert.equal((await state()).requests.filter(r => r.method === "POST" && r.path === "/api/projects").length, postCount)
  pass("Network failure preserves draft; an uncertain create is checked before retry and never blindly reposted")

  await reset()
  await evaluate("sessionStorage.clear()")
  await visit(`/project/${ID}/edit`)
  await wait("Boolean(document.querySelector('.project-unified-form')) && !document.querySelector('.submit-btn').disabled===false")
  assert.equal(await evaluate("document.querySelector('#project-name-input').value"), "Persisted Project")
  assert.equal(await evaluate("document.querySelector('.field-select[disabled]').value"), ROLE)
  pass("Edit on refresh loads authoritative detail and locks the existing Position Role")
  await setValue("#project-name-input", "Updated Through UI")
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("location.pathname==='/leader'")
  assert.equal((await state()).projects.find(p => p.project_id === ID).name, "Updated Through UI")
  pass("Edit metadata persists using PUT and refetches before success navigation")

  await reset()
  await evaluate(`sessionStorage.setItem(${JSON.stringify("tindy-project-draft:" + USER + ":" + ID)},${JSON.stringify(JSON.stringify({ fields: { ...draftFields, name: "Partial Edit UI", positionsList: [{ ...draftPosition, id: POS, positionId: POS, description: "Develop REST APIs" }, { ...draftPosition, id: "new-ui-position", title: "New UI Position", requiredSkills: [{ skill_id: EXTRA, name: "PostgreSQL" }] }] }, progress: { projectId: ID, positionIds: {} } }))})`)
  await control({ failures: [{ method: "POST", path: "/positions/(?!" + POS + ")[^/]+/skills$", status: 500 }] })
  await visit(`/project/${ID}/edit`)
  await wait("document.querySelector('.submit-btn')?.disabled===false")
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("document.querySelector('[role=alert]')?.textContent.includes('Some changes may already be saved')")
  assert.equal(await evaluate("location.pathname"), `/project/${ID}/edit`)
  assert.equal(await evaluate("document.querySelector('#project-name-input').value"), "Partial Edit UI")
  assert.equal((await state()).projects.find(project => project.project_id === ID).positions.length, 2)
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("location.pathname==='/leader'")
  assert.equal((await state()).requests.filter(request => request.method === "POST" && request.path === `/api/projects/${ID}/positions`).length, 1)
  pass("Partial edit stays on the form with pending input and server context; retry creates no duplicate Position")

  await loadModules()
  const invalid = await evaluate(`(async()=>{const errors=[];for(const operation of [()=>projectApi.createProjectPositionApi('demo',{}),()=>projectApi.updateProjectPositionApi(${JSON.stringify(ID)},'bad',{}),()=>projectApi.deleteProjectPositionApi('bad','bad'),()=>projectApi.addPositionSkillApi(${JSON.stringify(ID)},${JSON.stringify(POS)},{skill_id:'bad'}),()=>projectApi.removePositionSkillApi(${JSON.stringify(ID)},${JSON.stringify(POS)},'bad')]){try{await operation();errors.push(false)}catch{errors.push(true)}}return errors})()`)
  assert.deepEqual(invalid, [true, true, true, true, true])
  pass("Every invalid Project/Position/Skill UUID raises an explicit error instead of synthetic success")

  await reset()
  await evaluate(`(async()=>{window.before=await projectApi.getProjectByIdApi(${JSON.stringify(ID)});window.meta={...before,tagline:before.tagline??'',color_theme:before.color_theme??'indigo'};window.positions=before.positions.map(p=>projectEditor.positionFromDto(p));window.positions[0].title='Updated Backend';window.positions[0].requiredSkills=[];window.positions[0].niceSkills=[{skill_id:${JSON.stringify(SKILL)},name:'.NET'}];window.positions.push({...window.positions[0],id:'draft-added',positionId:undefined,title:'New Developer',requiredSkills:[{skill_id:${JSON.stringify(EXTRA)},name:'PostgreSQL'}],niceSkills:[]});window.progress={positionIds:{}};})()`)
  await control({ failures: [{ method: "POST", path: "/positions/(?!" + POS + ")[^/]+/skills$", status: 500 }] })
  const partial = await evaluate(`(async()=>{try{await projectEditor.saveProjectEdits(${JSON.stringify(ID)},meta,positions,[${JSON.stringify(POS)}],progress,()=>{});return false}catch{return true}})()`)
  assert.equal(partial, true)
  await evaluate(`projectEditor.saveProjectEdits(${JSON.stringify(ID)},meta,positions,[${JSON.stringify(POS)}],progress,()=>{})`)
  let saved = (await state()).projects.find(p => p.project_id === ID)
  assert.equal(saved.positions.length, 2)
  assert.equal((await state()).requests.filter(request => request.method === "POST" && request.path === `/api/projects/${ID}/positions`).length, 1)
  assert.equal(saved.positions.find(p => p.position_id === POS).skills[0].is_required, false)
  assert.equal(saved.positions.find(p => p.position_id !== POS).skills[0].skill_id, EXTRA)
  pass("Partial edit can retry Position and skill changes without duplicating persisted Positions")
  await evaluate(`projectEditor.saveProjectEdits(${JSON.stringify(ID)},meta,[{...positions[1],requiredSkills:[]}],[${JSON.stringify(POS)}],progress,()=>{})`)
  saved = (await state()).projects.find(p => p.project_id === ID)
  assert.equal(saved.positions.length, 1)
  assert.equal(saved.positions[0].skills.length, 0)
  pass("Removed Positions and removed Skills use DELETE and survive authoritative refetch")
  const rejectedRole = await evaluate(`(async()=>{const p=await projectApi.getProjectByIdApi(${JSON.stringify(ID)});try{await projectEditor.saveProjectEdits(${JSON.stringify(ID)},meta,[{...projectEditor.positionFromDto(p.positions[0]),roleId:'99999999-9999-4999-8999-999999999999'}],[],{positionIds:{}},()=>{});return false}catch{return true}})()`)
  assert.equal(rejectedRole, true)
  pass("Existing Role mutation is rejected by synchronization as well as the read-only UI")
  await evaluate(`projectEditor.saveProjectEdits(${JSON.stringify(ID)},meta,[],[],progress,()=>{})`)
  assert.equal((await state()).projects.find(project => project.project_id === ID).positions.length, 0)
  pass("Removing a Position created earlier in the same edit also deletes its confirmed server UUID")

  await reset()
  await evaluate(`window.createPayload={...meta,name:'Recovered Create',initial_team_size:1,recruitment_closing_days:14,positions:[{role_id:${JSON.stringify(ROLE)},title:'Backend Developer',required_count:1,experience_level:'intermediate',skills:[{skill_id:${JSON.stringify(SKILL)},is_required:true}]}]};window.createProgress={positionIds:{}}`)
  await control({ failures: [{ method: "POST", path: "^/api/projects$", commit: true }] })
  const lost = await evaluate("(async()=>{try{await projectEditor.createProjectOnce(createPayload,createProgress,()=>{});return false}catch{return true}})()")
  assert.equal(lost, true)
  const recoveredId = await evaluate("projectEditor.createProjectOnce(createPayload,createProgress,()=>{})")
  const recovered = (await state()).projects.find(project => project.project_id === recoveredId)
  assert.equal(recovered.positions[0].description, null)
  assert.equal((await state()).requests.filter(request => request.method === "POST" && request.path === "/api/projects").length, 1)
  pass("A committed create with a lost response is recovered by its full contract; omitted description is valid and POST is not duplicated")

  await reset()
  await visit("/__project_workspace")
  await wait("document.querySelectorAll('.project-card').length===2")
  await click(".title-button")
  await wait(`location.pathname==='/project/${ID}'`)
  assert.equal(await evaluate("window.workspaceSelection.id"), ID)
  pass("Workspace includes API Projects with the same name and preserves UUID through selection/navigation")

  await visit(`/project/${ID}`)
  await wait("Boolean(document.querySelector('.project-detail-header'))")
  await click(".detail-header-actions a[href$='/edit']")
  await wait("Boolean(document.querySelector('.project-unified-form'))")
  await setValue("#project-name-input", "Unsaved name")
  await click(".project-form-actions-card .cancel-btn")
  await wait("Boolean(document.querySelector('#discard-dialog-title'))")
  assert.equal(await evaluate("location.pathname"), `/project/${ID}/edit`)
  await click(".discard-cancel-btn")
  await mkdir('.tmp-project-results', { recursive: true })
  const desktopShot = await send('Page.captureScreenshot')
  await writeFile('.tmp-project-results/project-form-desktop.png', Buffer.from(desktopShot.data, 'base64'))
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(600)
  assert.equal(await evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"), true)
  const mobileShot = await send('Page.captureScreenshot')
  await writeFile('.tmp-project-results/project-form-mobile.png', Buffer.from(mobileShot.data, 'base64'))
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
  pass("Unsaved changes confirmation keeps edits in place when leaving is cancelled")

  await evaluate("sessionStorage.clear()")
  await draft()
  await visit("/create-project")
  await advanceToReview()
  await control({ failures: [{ method: "POST", path: "^/api/projects$", status: 401, code: "AUTH_UNAUTHORIZED" }] })
  await click(".submit-btn"); await click(".save-confirm-modal-footer .primary")
  await wait("location.pathname==='/login'")
  const retainedDraft = await evaluate(`JSON.parse(sessionStorage.getItem(${JSON.stringify("tindy-project-draft:" + USER + ":new")}))`)
  assert.equal(retainedDraft.fields.name, draftFields.name)
  assert.equal(await evaluate("localStorage.getItem('tindy_access_token')"), null)
  pass("Expired JWT follows existing auth behavior and retains the account-scoped Project draft")

  assert.equal(pageErrors.length, 0, pageErrors.map(error => error.exception?.description || error.text).join("\n"))
  pass("No uncaught browser errors across the real React and HTTP flows")
  console.log(`All ${checks} Project integration checks passed against the local Postman simulation.`)
} catch (error) {
  console.error(error)
  if (ws) {
    try { console.error((await evaluate("document.body.innerText")).slice(0, 5000)) } catch {}
    try { await mkdir('.tmp-project-results', { recursive: true }); const shot = await send('Page.captureScreenshot'); await writeFile('.tmp-project-results/failure.png', Buffer.from(shot.data,'base64')) } catch {}
  }
  process.exitCode = 1
} finally {
  ws?.close()
  chrome?.kill()
  await server?.close()
  if (simulation) {
    if (process.platform === "win32") await new Promise(resolve => { const child = spawn("taskkill", ["/PID", String(simulation.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); child.once("exit", resolve) })
    else simulation.kill("SIGINT")
    await mkdir('.tmp-project-results', { recursive: true }); await writeFile('.tmp-project-results/simulation.ndjson', simulationOutput)
  }
  if (profileDir) {
    const resolved = path.resolve(profileDir)
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith("tindy-project-test-")) throw new Error("Unexpected browser cleanup path")
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {})
  }
}
