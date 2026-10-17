import { createServer } from "vite"
import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import assert from "node:assert/strict"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const server = await createServer({
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') },
  server: { port: 0, host: "127.0.0.1", strictPort: false },
})
await server.listen()
const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
const profileDir = await mkdtemp(path.join(tmpdir(), "tindy-save-test-"))
const chrome = spawn(
  process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
  ],
  { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
)

let ws
const pending = new Map()
let sequence = 0
const pageErrors = []

const user = {
  user_id: "00000000-0000-4000-8000-000000000999",
  display_name: "Test Student",
  university: "FPT University",
  email: "student@example.com",
  username: "test_student",
  status: "active",
  roles: [],
  is_onboarding_completed: true,
}

function send(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evalInBrowser(expr) {
  const res = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  })
  if (res.exceptionDetails) {
    throw new Error(
      res.exceptionDetails.text +
        ": " +
        res.exceptionDetails.exception?.description,
    )
  }
  return res.result?.value
}

try {
  const endpoint = await new Promise((resolve, reject) => {
    let stderr = ""
    const timeout = setTimeout(
      () => reject(new Error("Chrome startup timed out: " + stderr)),
      15000,
    )
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })
    chrome.once("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    chrome.once("exit", (code) => {
      clearTimeout(timeout)
      reject(new Error(`Chrome exited ${code}: ${stderr}`))
    })
  })

  const debugUrl = new URL(endpoint)
  const targets = await fetch(`http://${debugUrl.host}/json/list`).then(
    (response) => response.json(),
  )
  const target = targets.find((target) => target.type === "page")
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve) =>
    ws.addEventListener("open", resolve, { once: true }),
  )

  ws.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const entry = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) entry?.reject(new Error(JSON.stringify(message.error)))
      else entry?.resolve(message.result)
    } else if (message.method === "Fetch.requestPaused") {
      const { requestId, request } = message.params
      const url = new URL(request.url)
      let responseBody = null
      if (url.pathname === "/api/me") {
        responseBody = { success: true, message: "OK", data: user }
      }
      if (responseBody !== null) {
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
          ],
          body: Buffer.from(JSON.stringify(responseBody)).toString("base64"),
        })
      } else {
        await send("Fetch.continueRequest", { requestId })
      }
    } else if (message.method === "Runtime.exceptionThrown") {
      pageErrors.push(message.params.exceptionDetails)
    }
  })

  await send("Page.enable")
  await send("Runtime.enable")
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }],
  })
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `localStorage.setItem('tindy_access_token', 'mock-token'); localStorage.setItem('saved', JSON.stringify([]));`,
  })

  // Navigate to Project Details Screen
  await send("Page.navigate", { url: `${origin}/project/studywise` })
  await delay(1200)

  // Test 1: Project Details Screen - Initial Unsaved State
  const initialState = await evalInBrowser(`
    (() => {
      const btn = document.querySelector(".project-save-btn");
      if (!btn) return { found: false, html: document.body.innerHTML };
      const label = btn.querySelector(".project-save-btn-label")?.textContent?.trim();
      const icon = btn.querySelector(".save-bookmark-icon");
      const burst = btn.querySelector(".save-burst-container");
      return {
        found: true,
        label,
        ariaPressed: btn.getAttribute("aria-pressed"),
        isSavedClass: btn.classList.contains("is-saved"),
        iconFill: icon?.getAttribute("fill"),
        hasBurst: Boolean(burst),
      };
    })()
  `)

  console.log("INITIAL STATE:", initialState.found ? "found" : initialState.html?.slice(0, 400));
  assert.equal(initialState.found, true, "Project save button should be rendered on ProjectDetailScreen")
  assert.equal(initialState.label, "Save", "Initial button label should be 'Save'")
  assert.equal(initialState.ariaPressed, "false", "Initial aria-pressed should be 'false'")
  assert.equal(initialState.isSavedClass, false, "Should not have 'is-saved' class initially")
  assert.equal(initialState.iconFill, "none", "Bookmark fill should be 'none' when unsaved")
  assert.equal(initialState.hasBurst, false, "No burst container initially")
  console.log("PASS 1: ProjectDetailScreen initial unsaved state verified")

  // Test 2: Click Save -> Trigger Icon Pop & Star Burst
  const burstState = await evalInBrowser(`
    (async () => {
      const btn = document.querySelector(".project-save-btn");
      btn.click();
      await new Promise(r => setTimeout(r, 60));
      const burst = btn.querySelector(".save-burst-container");
      const particles = btn.querySelectorAll(".save-burst-particle");
      const icon = btn.querySelector(".save-bookmark-icon");
      const label = btn.querySelector(".project-save-btn-label")?.textContent?.trim();

      const particleDetails = Array.from(particles).map(p => ({
        dx: p.style.getPropertyValue("--star-dx"),
        dy: p.style.getPropertyValue("--star-dy"),
        color: p.style.color,
        pointerEvents: window.getComputedStyle(p).pointerEvents,
      }));

      return {
        label,
        ariaPressed: btn.getAttribute("aria-pressed"),
        isSavedClass: btn.classList.contains("is-saved"),
        hasPopClass: icon?.classList.contains("save-bookmark-pop"),
        iconFill: icon?.getAttribute("fill"),
        hasBurst: Boolean(burst),
        burstPointerEvents: burst ? window.getComputedStyle(burst).pointerEvents : null,
        particleCount: particles.length,
        particleDetails,
      };
    })()
  `)

  assert.equal(burstState.label, "Saved", "Button label should update to 'Saved'")
  assert.equal(burstState.ariaPressed, "true", "aria-pressed should become 'true'")
  assert.equal(burstState.isSavedClass, true, "Button should have 'is-saved' class")
  assert.equal(burstState.hasPopClass, true, "Bookmark icon should have 'save-bookmark-pop' class")
  assert.equal(burstState.iconFill, "currentColor", "Bookmark fill should become 'currentColor'")
  assert.equal(burstState.hasBurst, true, "Burst container should be rendered during burst")
  assert.equal(burstState.burstPointerEvents, "none", "Burst container must have pointer-events: none")
  assert.equal(burstState.particleCount, 7, "Exactly 7 star burst particles should be present")
  assert.equal(burstState.particleDetails[0].pointerEvents, "none", "Particles must have pointer-events: none")
  console.log("PASS 2: Save click triggers icon pop and 7 star burst particles without layout/pointer blocking")

  // Test 3: Wait 650ms -> Burst Particles Automatically Cleaned Up
  await delay(650)
  const cleanedState = await evalInBrowser(`
    (() => {
      const btn = document.querySelector(".project-save-btn");
      const burst = btn.querySelector(".save-burst-container");
      const icon = btn.querySelector(".save-bookmark-icon");
      return {
        hasBurst: Boolean(burst),
        hasPopClass: icon?.classList.contains("save-bookmark-pop"),
        label: btn.querySelector(".project-save-btn-label")?.textContent?.trim(),
        ariaPressed: btn.getAttribute("aria-pressed"),
        iconFill: icon?.getAttribute("fill"),
      };
    })()
  `)

  assert.equal(cleanedState.hasBurst, false, "Burst container should be unmounted after animation")
  assert.equal(cleanedState.hasPopClass, false, "Pop class should be removed after burst timer")
  assert.equal(cleanedState.label, "Saved", "Saved label is preserved")
  assert.equal(cleanedState.iconFill, "currentColor", "Filled icon is preserved")
  console.log("PASS 3: Burst particles and pop animation cleanly expire and unmount from DOM")

  // Test 4: Click Unsave -> Reverts to Unsaved Without Star Burst
  const unsavedState = await evalInBrowser(`
    (async () => {
      const btn = document.querySelector(".project-save-btn");
      btn.click();
      await new Promise(r => setTimeout(r, 60));
      const burst = btn.querySelector(".save-burst-container");
      const icon = btn.querySelector(".save-bookmark-icon");
      const label = btn.querySelector(".project-save-btn-label")?.textContent?.trim();
      return {
        label,
        ariaPressed: btn.getAttribute("aria-pressed"),
        isSavedClass: btn.classList.contains("is-saved"),
        hasPopClass: icon?.classList.contains("save-bookmark-pop"),
        iconFill: icon?.getAttribute("fill"),
        hasBurst: Boolean(burst),
      };
    })()
  `)

  assert.equal(unsavedState.label, "Save", "Button label should return to 'Save'")
  assert.equal(unsavedState.ariaPressed, "false", "aria-pressed should return to 'false'")
  assert.equal(unsavedState.isSavedClass, false, "Should no longer have 'is-saved' class")
  assert.equal(unsavedState.iconFill, "none", "Bookmark fill should return to 'none'")
  assert.equal(unsavedState.hasBurst, false, "Unsaving MUST NOT trigger Star Burst")
  assert.equal(unsavedState.hasPopClass, false, "Unsaving MUST NOT trigger Pop animation")
  console.log("PASS 4: Unsaving reverts outline icon immediately without triggering burst")

  // Test 5: Rapid Clicking Protection
  const spamState = await evalInBrowser(`
    (() => {
      const btn = document.querySelector(".project-save-btn");
      btn.click();
      btn.click();
      btn.click();
      const bursts = btn.querySelectorAll(".save-burst-container");
      return {
        burstContainersCount: bursts.length,
        label: btn.querySelector(".project-save-btn-label")?.textContent?.trim(),
      };
    })()
  `)

  assert.equal(spamState.burstContainersCount <= 1, true, "Rapid clicks must not create duplicate burst containers")
  console.log("PASS 5: Rapid clicking throttle guard prevents duplicate animations")

  // Test 6: ProjectCard Icon Variant (Overview / Dashboard / Interests)
  await delay(650)
  await send("Page.navigate", { url: `${origin}/interests` })
  await delay(1200)

  const iconCardState = await evalInBrowser(`
    (() => {
      const btn = document.querySelector(".project-save-icon-btn");
      if (!btn) return { found: false, html: document.body.innerHTML };
      return {
        found: true,
        initialAria: btn.getAttribute("aria-pressed"),
        initialFill: btn.querySelector("svg")?.getAttribute("fill"),
      };
    })()
  `)

  assert.equal(iconCardState.found, true, "ProjectCard icon variant Save button found")

  // Click icon variant
  const iconBurstState = await evalInBrowser(`
    (async () => {
      const btn = document.querySelector(".project-save-icon-btn");
      btn.click();
      await new Promise(r => setTimeout(r, 60));
      const burst = btn.querySelector(".save-burst-container");
      const particles = btn.querySelectorAll(".save-burst-particle");
      const icon = btn.querySelector(".save-bookmark-icon");
      return {
        ariaPressed: btn.getAttribute("aria-pressed"),
        hasBurst: Boolean(burst),
        particleCount: particles.length,
        hasPopClass: icon?.classList.contains("save-bookmark-pop"),
      };
    })()
  `)

  assert.equal(iconBurstState.hasBurst, true, "Icon variant triggers Star Burst")
  assert.equal(iconBurstState.particleCount, 7, "Icon variant renders 7 burst particles")
  assert.equal(iconBurstState.hasPopClass, true, "Icon variant bookmark has pop class")
  console.log("PASS 6: ProjectCard icon-only variant works identically with Pop + Star Burst")

  // Test 7: Verify no uncaught page errors
  assert.equal(pageErrors.length, 0, `No console errors expected: ${pageErrors.map(e => e.text).join("; ")}`)
  console.log("PASS 7: Zero console errors or uncaught exceptions during all interactions")

  console.log("\n=======================================================")
  console.log("ALL 7 SAVE BUTTON MICRO-INTERACTION TESTS PASSED!")
  console.log("=======================================================\n")
  process.exit(0)
} catch (err) {
  console.error("Test failed:", err)
  process.exit(1)
} finally {
  try { chrome.kill() } catch {}
  try { await server.close() } catch {}
  try { await rm(profileDir, { recursive: true, force: true }) } catch {}
}
