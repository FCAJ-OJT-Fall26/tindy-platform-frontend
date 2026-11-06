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
const draftFields = { githubUrl: "https://github.com/FCAJ-OJT-Fall26", name: "Created From Browser", tagline: "Build the real project API", jd: "Develop a collaborative project platform using real APIs.", goals: "Ship the API", type: "Web Application", hours: 10, durationMonths: 3, capacity: 5, difficulty: "intermediate", positionsList: [draftPosition] }
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
  await visit('/leader')
  await evaluate('sessionStorage.clear()')
  await draft()
  await visit('/create-project')
  await wait("document.querySelector('#project-github-input')?.value === 'https://github.com/FCAJ-OJT-Fall26'")
  await wait("Boolean(document.querySelector('.project-github-link'))")
  assert.equal(await evaluate("document.querySelector('.project-github-link').getAttribute('href')"), draftFields.githubUrl)
  await setValue('#project-github-input', 'https://github.com.evil.test/team/repo')
  await click('.continue-btn')
  await wait("Boolean(document.querySelector('#project-error-githubUrl'))")
  assert.equal(await evaluate("document.querySelectorAll('.project-github-link').length"), 0)
  assert.equal((await state()).requests.filter(r => r.method === 'POST' && r.path === '/api/projects').length, 0)
  pass('Invalid GitHub host is blocked before continuing and before any project write')
  await setValue('#project-github-input', draftFields.githubUrl)
  await wait("Boolean(document.querySelector('.project-github-link'))")
  await mkdir('.tmp-project-results', { recursive: true })
  await evaluate("document.querySelector('#project-github-input').scrollIntoView({block:'center'})")
  await delay(400)
  let shot = await send('Page.captureScreenshot')
  await writeFile('.tmp-project-results/project-github-desktop.png', Buffer.from(shot.data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await delay(400)
  await evaluate("document.querySelector('#project-github-input').scrollIntoView({block:'center'})")
  await delay(300)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), true)
  shot = await send('Page.captureScreenshot')
  await writeFile('.tmp-project-results/project-github-mobile.png', Buffer.from(shot.data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await visit('/create-project')
  await wait("document.querySelector('#project-github-input')?.value === 'https://github.com/FCAJ-OJT-Fall26'")
  pass('GitHub link previews, survives draft refresh and fits desktop/mobile')
  await advanceToReview()
  await click('.project-review-summary button')
  await wait("Boolean(document.querySelector('.light-preview-modal .project-github-link, [role=dialog] .project-github-link'))")
  await click('[aria-label="Close preview"]')
  await click('.submit-btn'); await click('.save-confirm-modal-footer .primary')
  await wait("location.pathname==='/leader'")
  let project=(await state()).projects.find(p => p.name === draftFields.name)
  assert.equal(project.github_url,draftFields.githubUrl)
  const id=project.project_id
  await visit('/project/'+id)
  await wait("Boolean(document.querySelector('.project-github-link'))")
  assert.equal(await evaluate("document.querySelector('.project-github-link').getAttribute('href')"),draftFields.githubUrl)
  pass('Publish persists the supplied link and project details display it')
  await visit('/project/'+id+'/edit')
  await wait("document.querySelector('#project-github-input')?.value === 'https://github.com/FCAJ-OJT-Fall26'")
  await setValue('#project-github-input','https://github.com/FCAJ-OJT-Fall26/updated-repo')
  await visit('/project/'+id+'/edit')
  await wait("document.querySelector('#project-github-input')?.value === 'https://github.com/FCAJ-OJT-Fall26/updated-repo'")
  await click('.submit-btn'); await click('.save-confirm-modal-footer .primary')
  await wait("location.pathname==='/leader'")
  assert.equal((await state()).projects.find(p=>p.project_id===id).github_url,'https://github.com/FCAJ-OJT-Fall26/updated-repo')
  pass('Edit restores the GitHub draft and persists the changed repository')
  await visit('/project/'+id+'/edit')
  await wait("Boolean(document.querySelector('#project-github-input'))")
  await setValue('#project-github-input','')
  await click('.submit-btn'); await click('.save-confirm-modal-footer .primary')
  await wait("location.pathname==='/leader'")
  assert.equal((await state()).projects.find(p=>p.project_id===id).github_url,null)
  await visit('/project/'+id)
  await wait("Boolean(document.querySelector('.detail-main'))")
  assert.equal(await evaluate("document.querySelectorAll('.project-github-link').length"),0)
  pass('Clearing the optional link removes it from storage and the detail view')
  assert.equal(pageErrors.length,0)
  const evidence=JSON.parse(simulationOutput.split('\n').find(line=>{try{return JSON.parse(line).event==='request'}catch{return false}})||'null')
  assert.ok(evidence, 'Postman simulation must record the real HTTP path')
  console.log('PASS '+checks+' GitHub project browser groups')
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
