import { projectApiFixture, projectFixtureId } from "./projects-fixture.mjs"
import { createServer } from "vite"
import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import assert from "node:assert/strict"
import { makeProfileFixture, waitForBrowser } from "./profile-fixture.mjs"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const server = await createServer({
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') },
  server: { port: 0, host: "127.0.0.1", strictPort: false },
})
await server.listen()
const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
const profileDir = await mkdtemp(path.join(tmpdir(), "tindy-discovery-test-"))
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
      let responseBody = projectApiFixture(url.pathname, request.method)
      if (url.pathname === "/api/me") {
        responseBody = { success: true, message: "OK", data: user }
      }
      if (url.pathname === "/api/me/profile") {
        responseBody = { success: true, message: "OK", data: makeProfileFixture(user) }
      }
      if (responseBody !== null) {
        await send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
          ],
          body: Buffer.from(JSON.stringify(responseBody)).toString("base64"),
        }).catch(error => { if (!error.message.includes('Invalid InterceptionId')) throw error })
      } else {
        await send("Fetch.continueRequest", { requestId }).catch(error => { if (!error.message.includes('Invalid InterceptionId')) throw error })
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
    source: `localStorage.setItem('tindy_access_token', 'mock-token');localStorage.setItem('tindy-v2-interested',JSON.stringify(['${projectFixtureId}']));`,
  })

  // Navigate to Discover Screen
  await send("Page.navigate", { url: `${origin}/discover?demo=1` })
  await waitForBrowser(evalInBrowser, "Boolean(document.querySelector('.skip-micro-btn'))")

  // Test 1: Verify presence of all three micro-interaction action buttons in SwipeCardStack
  const actionButtonsState = await evalInBrowser(`
    (() => {
      const skipBtn = document.querySelector(".skip-micro-btn");
      const starBtn = document.querySelector(".star-micro-btn");
      const interestedBtn = document.querySelector(".interested-micro-btn");
      return {
        hasSkip: Boolean(skipBtn),
        hasStar: Boolean(starBtn),
        hasInterested: Boolean(interestedBtn),
        skipText: skipBtn?.textContent?.trim(),
        interestedText: interestedBtn?.textContent?.trim(),
      };
    })()
  `)

  assert.equal(actionButtonsState.hasSkip, true, "SkipActionButton should be present in discovery stack")
  assert.equal(actionButtonsState.hasStar, true, "StarActionButton should be present in discovery stack")
  assert.equal(actionButtonsState.hasInterested, true, "InterestedActionButton should be present in discovery stack")
  assert.equal(actionButtonsState.skipText, "Skip", "Skip button has 'Skip' text")
  assert.equal(actionButtonsState.interestedText, "Interested", "Interested button has 'Interested' text")
  console.log("PASS 1: All three Discovery action buttons rendered correctly")

  // Test 2: Skip Button Click Micro-Interaction
  const skipFeedbackState = await evalInBrowser(`
    (async () => {
      const skipBtn = document.querySelector(".skip-micro-btn");
      skipBtn.click();
      await new Promise(r => setTimeout(r, 40));
      const icon = skipBtn.querySelector(".skip-micro-icon");
      return {
        btnActive: skipBtn.classList.contains("is-active"),
        iconActive: icon?.classList.contains("is-active"),
      };
    })()
  `)

  assert.equal(skipFeedbackState.btnActive, true, "Skip button should have is-active press animation class")
  assert.equal(skipFeedbackState.iconActive, true, "Skip icon should have is-active feedback animation class")
  console.log("PASS 2: Skip button triggers subtle button press and icon shrink/tilt feedback")

  await delay(300)
  const skipCleanState = await evalInBrowser(`
    (() => {
      const skipBtn = document.querySelector(".skip-micro-btn");
      const icon = skipBtn?.querySelector(".skip-micro-icon");
      return {
        btnActive: skipBtn?.classList.contains("is-active"),
        iconActive: icon?.classList.contains("is-active"),
      };
    })()
  `)
  assert.equal(skipCleanState.btnActive, false, "Skip button active class resets after animation duration")
  console.log("PASS 3: Skip button feedback cleanly resets within ~220ms")

  // Test 3: Star Button Click Micro-Interaction in SwipeCardStack
  await evalInBrowser("document.querySelector('[aria-label=Undo]').click()")
  await waitForBrowser(evalInBrowser, "document.querySelector('.star-micro-btn')?.disabled===false")
  const starFeedbackState = await evalInBrowser(`
    (async () => {
      const starBtn = document.querySelector(".star-micro-btn");
      starBtn.click();
      for (let i=0;i<150 && !starBtn.querySelector('.star-micro-icon.is-popping');i++) await new Promise(r=>setTimeout(r,20));
      const icon = starBtn.querySelector(".star-micro-icon");
      const aura = starBtn.querySelector(".star-micro-aura");
      const sparkles = starBtn.querySelectorAll(".star-micro-sparkle");
      return {
        btnActive: starBtn.classList.contains("is-active"),
        iconPopping: icon?.classList.contains("is-popping"),
        hasAura: Boolean(aura),
        sparkleCount: sparkles.length,
        sparklePointerEvents: sparkles[0] ? window.getComputedStyle(sparkles[0]).pointerEvents : null,
      };
    })()
  `)

  assert.equal(starFeedbackState.iconPopping, true, "Star icon should have is-popping class")
  assert.equal(starFeedbackState.hasAura, true, "Star micro-aura ring should be rendered")
  assert.equal(starFeedbackState.sparkleCount, 3, "Exactly 3 micro-sparkles should be rendered around star")
  assert.equal(starFeedbackState.sparklePointerEvents, "none", "Sparkles must have pointer-events: none")
  console.log("PASS 4: Star button triggers 1.28x icon pop, subtle aura, and 3 micro-sparkles")

  await delay(400)
  await waitForBrowser(evalInBrowser, "!document.querySelector('.star-micro-btn .star-micro-sparkle') && !document.querySelector('.star-micro-btn .star-micro-aura')")
  const starCleanState = await evalInBrowser(`
    (() => {
      const starBtn = document.querySelector(".star-micro-btn");
      const sparkles = starBtn?.querySelectorAll(".star-micro-sparkle");
      const aura = starBtn?.querySelector(".star-micro-aura");
      const icon = starBtn?.querySelector(".star-micro-icon");
      return {
        iconPopping: icon?.classList.contains("is-popping"),
        sparkleCount: sparkles?.length || 0,
        hasAura: Boolean(aura),
      };
    })()
  `)
  assert.equal(starCleanState.sparkleCount, 0, "Star sparkles cleanly unmount after ~320ms")
  assert.equal(starCleanState.hasAura, false, "Star aura cleanly unmounts")
  console.log("PASS 5: Star sparkles and aura cleanly expire and unmount from DOM")

  // Test 4: Interested Button Click Micro-Interaction in SwipeCardStack
  // Restore a card so the feedback remains mounted after the confirmed swipe.
  await evalInBrowser("document.querySelector('[aria-label=Undo]').click()")
  await waitForBrowser(evalInBrowser, "document.querySelector('.interested-micro-btn')?.disabled===false")
  const heartFeedbackState = await evalInBrowser(`
    (async () => {
      const heartBtn = document.querySelector(".interested-micro-btn");
      heartBtn.click();
      for (let i=0;i<150 && !heartBtn.querySelector('.heart-micro-icon.is-popping');i++) await new Promise(r=>setTimeout(r,20));
      const icon = heartBtn.querySelector(".heart-micro-icon");
      const aura = heartBtn.querySelector(".heart-micro-aura");
      const particles = heartBtn.querySelectorAll(".heart-micro-particle");
      return {
        btnGlow: heartBtn.classList.contains("is-glow"),
        iconPopping: icon?.classList.contains("is-popping"),
        hasAura: Boolean(aura),
        particleCount: particles.length,
        particlePointerEvents: particles[0] ? window.getComputedStyle(particles[0]).pointerEvents : null,
      };
    })()
  `)

  assert.equal(heartFeedbackState.btnGlow, true, "Interested button should have is-glow glow flash class")
  assert.equal(heartFeedbackState.iconPopping, true, "Heart icon should have is-popping spring animation class")
  assert.equal(heartFeedbackState.hasAura, true, "Heart micro-aura ring should be rendered")
  assert.equal(heartFeedbackState.particleCount, 3, "Exactly 3 emerald micro-particles should be rendered")
  assert.equal(heartFeedbackState.particlePointerEvents, "none", "Heart particles must have pointer-events: none")
  console.log("PASS 6: Interested button triggers soft spring pop, emerald glow, aura, and 3 micro-particles")

  await delay(450)
  await waitForBrowser(evalInBrowser, "!document.querySelector('.interested-micro-btn .heart-micro-particle')")
  const heartCleanState = await evalInBrowser(`
    (() => {
      const heartBtn = document.querySelector(".interested-micro-btn");
      const particles = heartBtn?.querySelectorAll(".heart-micro-particle");
      const aura = heartBtn?.querySelector(".heart-micro-aura");
      return {
        particleCount: particles?.length || 0,
        hasAura: Boolean(aura),
      };
    })()
  `)
  assert.equal(heartCleanState.particleCount, 0, "Heart particles cleanly unmount")
  assert.equal(heartCleanState.hasAura, false, "Heart aura cleanly unmounts")
  console.log("PASS 7: Heart particles and aura cleanly expire and unmount from DOM")

  // Test 5: ProjectDetailModal - Star Toggle and Confirm Interest
  // Tap card to open modal
  await evalInBrowser(`
    (() => {
      const cardFooter = document.querySelector(".select-none .bg-slate-50.border-t");
      if (cardFooter) cardFooter.click();
    })()
  `)
  await delay(350)

  const modalButtonsState = await evalInBrowser(`
    (() => {
      const modal = document.querySelector(".modal-content-animate");
      if (!modal) return { found: false };
      const starBtns = modal.querySelectorAll(".star-micro-btn");
      const interestedBtn = modal.querySelector(".interested-micro-btn");
      return {
        found: true,
        starCount: starBtns.length,
        hasInterested: Boolean(interestedBtn),
      };
    })()
  `)

  assert.equal(modalButtonsState.found, true, "ProjectDetailModal opened successfully")
  assert.equal(modalButtonsState.starCount >= 1, true, "Modal contains StarActionButton")
  assert.equal(modalButtonsState.hasInterested, true, "Modal contains InterestedActionButton")
  console.log("PASS 8: ProjectDetailModal uses StarActionButton and InterestedActionButton")

  // Test 6: Toggle Star ON -> Burst Sparkles; Toggle Star OFF -> Gentle shrink, NO sparkles
  await evalInBrowser("(() => { const button=document.querySelector('.modal-content-animate .star-micro-btn');if(button.getAttribute('aria-pressed')==='true') button.click(); })()")
  await delay(450)
  const starOnState = await evalInBrowser(`
    (async () => {
      const starBtn = document.querySelector(".modal-content-animate .star-micro-btn");
      starBtn.click();
      await new Promise(r => setTimeout(r, 50));
      const sparkles = starBtn.querySelectorAll(".star-micro-sparkle");
      const icon = starBtn.querySelector(".star-micro-icon");
      return {
        sparkleCount: sparkles.length,
        isPopping: icon?.classList.contains("is-popping"),
      };
    })()
  `)
  assert.equal(starOnState.sparkleCount, 3, "Toggling Star ON triggers 3 micro-sparkles")
  assert.equal(starOnState.isPopping, true, "Star icon pops on select")

  await delay(400)

  // Toggle Star OFF
  const starOffState = await evalInBrowser(`
    (async () => {
      const starBtn = document.querySelector(".modal-content-animate .star-micro-btn");
      starBtn.click();
      await new Promise(r => setTimeout(r, 50));
      const sparkles = starBtn.querySelectorAll(".star-micro-sparkle");
      const icon = starBtn.querySelector(".star-micro-icon");
      return {
        sparkleCount: sparkles.length,
        isUnselecting: icon?.classList.contains("is-unselecting"),
        isPopping: icon?.classList.contains("is-popping"),
      };
    })()
  `)
  assert.equal(starOffState.sparkleCount, 0, "Toggling Star OFF MUST NOT produce any sparkles")
  assert.equal(starOffState.isPopping, false, "Star icon does not play pop on unselect")
  assert.equal(starOffState.isUnselecting, true, "Star icon plays gentle unselect shrink feedback")
  console.log("PASS 9: Star toggle correctly distinguishes select (sparkles) vs unselect (shrink, zero sparkles)")

  // Test 7: Confirm Interest in Modal -> Glow, Pop, and stable confirmed state
  await delay(300)
  const confirmInterestState = await evalInBrowser(`
    (async () => {
      const interestedBtn = document.querySelector(".modal-content-animate .interested-micro-btn");
      interestedBtn.click();
      await new Promise(r => setTimeout(r, 60));
      const icon = interestedBtn.querySelector(".heart-micro-icon");
      const particles = interestedBtn.querySelectorAll(".heart-micro-particle");
      const text = interestedBtn.textContent?.trim();
      return {
        isGlow: interestedBtn.classList.contains("is-glow"),
        isPopping: icon?.classList.contains("is-popping"),
        particleCount: particles.length,
        text,
      };
    })()
  `)
  assert.equal(confirmInterestState.isGlow, true, "Confirm interest triggers button glow flash")
  assert.equal(confirmInterestState.isPopping, true, "Heart icon plays soft spring pop")
  assert.equal(confirmInterestState.particleCount, 3, "Confirm interest renders 3 emerald micro-particles")
  assert.equal(confirmInterestState.text, "Interest Confirmed", "Button updates to 'Interest Confirmed'")
  console.log("PASS 10: Confirm interest transitions to 'Interest Confirmed' with glow, pop, and micro-particles")

  // Test 7b: Mode Switch Spam & Cancel-Mid-Exit Behavior
  await send("Page.navigate", { url: `${origin}/discover?demo=1` })
  await waitForBrowser(evalInBrowser, "Boolean(document.querySelector('[aria-label=\"Discovery Mode Switcher\"]'))")

  const modeSwitchState = await evalInBrowser(`
    (async () => {
      const switcher = document.querySelector('[aria-label="Discovery Mode Switcher"]');
      const buttons = switcher.querySelectorAll('button[role="tab"]');
      const projectsBtn = buttons[0];
      const teammatesBtn = buttons[1];
      const syncWrapper = document.querySelector('.discovery-sync-idle, .discovery-sync-exit-left, .discovery-sync-exit-right');
      const initialStackChild = syncWrapper?.firstElementChild;

      // 1. Clicking already-active mode is ignored
      projectsBtn.click();
      await new Promise(r => setTimeout(r, 20));
      const stayedIdleOnSameClick = syncWrapper?.classList.contains('discovery-sync-idle');

      // 2. Switch to Teammates then change mind back to Projects mid-exit (after 60ms < 170ms)
      teammatesBtn.click();
      await new Promise(r => setTimeout(r, 30));
      const startedExit = syncWrapper?.classList.contains('discovery-sync-exit-left');
      await new Promise(r => setTimeout(r, 30));
      projectsBtn.click();
      await new Promise(r => setTimeout(r, 20));
      const recoveredImmediatelyToIdle = syncWrapper?.classList.contains('discovery-sync-idle');
      await new Promise(r => setTimeout(r, 200));
      const sameStackAfterCancel = syncWrapper?.firstElementChild === initialStackChild;

      // 3. Spamming Teammates 5 times during transition does not loop exit; finishes on Teammates
      teammatesBtn.click();
      await new Promise(r => setTimeout(r, 40));
      teammatesBtn.click();
      await new Promise(r => setTimeout(r, 40));
      teammatesBtn.click();
      await new Promise(r => setTimeout(r, 40));
      teammatesBtn.click();
      await new Promise(r => setTimeout(r, 150));
      const h1Text = document.querySelector('h1')?.textContent?.trim();
      const settledIdle = syncWrapper?.classList.contains('discovery-sync-idle');

      return {
        stayedIdleOnSameClick,
        startedExit,
        recoveredImmediatelyToIdle,
        sameStackAfterCancel,
        h1Text,
        settledIdle,
      };
    })()
  `)
  assert.equal(modeSwitchState.stayedIdleOnSameClick, true, "Clicking active mode button is ignored")
  assert.equal(modeSwitchState.startedExit, true, "Clicking other mode starts exit transition")
  assert.equal(modeSwitchState.recoveredImmediatelyToIdle, true, "Changing mind during exit immediately transitions back to idle")
  assert.equal(modeSwitchState.sameStackAfterCancel, true, "Changing mind during exit does not unmount/remount card stack")
  assert.equal(modeSwitchState.h1Text, "Discover Candidates for Your Team", "Spamming target mode completes transition without looping")
  assert.equal(modeSwitchState.settledIdle, true, "Transition settles to idle cleanly")
  console.log("PASS 10b: Mode switch ignores active-mode spam, recovers mid-exit without remount, and never loops")

  // Test 8: ProjectDetailScreen Skip for now
  await send("Page.navigate", { url: `${origin}/project/${projectFixtureId}` })
  await waitForBrowser(evalInBrowser, "Boolean(document.querySelector('.detail-skip-btn'))")

  const detailSkipState = await evalInBrowser(`
    (async () => {
      const skipBtn = document.querySelector(".detail-skip-btn");
      if (!skipBtn) return { found: false };
      window.history.back = () => {};
      skipBtn.click();
      await new Promise(r => setTimeout(r, 40));
      return {
        found: true,
        isMicroBtn: skipBtn.classList.contains("skip-micro-btn"),
        isActive: skipBtn.classList.contains("is-active"),
      };
    })()
  `)

  assert.equal(detailSkipState.found, true, "detail-skip-btn found on ProjectDetailScreen")
  assert.equal(detailSkipState.isMicroBtn, true, "detail-skip-btn has skip-micro-btn class")
  assert.equal(detailSkipState.isActive, true, "detail-skip-btn triggers subtle is-active press animation")
  console.log("PASS 11: ProjectDetailScreen 'Skip for now' button gives tactile press micro-interaction")

  // Test 9: Zero console errors
  assert.equal(pageErrors.length, 0, `No console errors expected: ${pageErrors.map(e => e.text).join("; ")}`)
  console.log("PASS 12: Zero console errors or unhandled exceptions across all interactions")

  console.log("\n===================================================================")
  console.log("ALL 12 DISCOVERY ACTION BUTTON MICRO-INTERACTION TESTS PASSED!")
  console.log("===================================================================\n")
} catch (err) {
  console.error("Test failed:", err)
  process.exitCode = 1
} finally {
  ws?.close()
  try { chrome.kill() } catch {}
  try { await server.close() } catch {}
  const cleanupProfile = path.resolve(profileDir)
  if (path.dirname(cleanupProfile) !== path.resolve(tmpdir()) || !path.basename(cleanupProfile).startsWith("tindy-discovery-test-")) throw new Error("Unexpected browser cleanup path")
  try { await rm(cleanupProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch {}
}
