// Chrome DevTools harness: runs real React and HTTP, without replacing fetch.
import { spawn } from "node:child_process"
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default async function openBrowser(origin) {
  const profileDir = await mkdtemp(
    path.join(tmpdir(), "tindy-profile-browser-"),
  )
  let chrome, ws
  let sequence = 0
  const pending = new Map(),
    exceptions = [],
    consoleErrors = []
  const close = async () => {
    ws?.close()
    chrome?.kill()
    await delay(500)
    const target = path.resolve(profileDir)
    if (
      path.dirname(target) !== path.resolve(tmpdir()) ||
      !path.basename(target).startsWith("tindy-profile-browser-")
    )
      throw Error("Unexpected browser cleanup path")
    await rm(target, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    })
  }
  try {
    chrome = spawn(
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
    const endpoint = await new Promise((resolve, reject) => {
      let stderr = ""
      const timeout = setTimeout(
        () => reject(Error("Chrome startup timed out")),
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
        reject(Error(`Chrome exited ${code}`))
      })
    })
    const targets = await fetch(
      `http://${new URL(endpoint).host}/json/list`,
    ).then((res) => res.json())
    ws = new WebSocket(
      targets.find((target) => target.type === "page").webSocketDebuggerUrl,
    )
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true })
      ws.addEventListener("error", reject, { once: true })
    })
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const entry = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) entry?.reject(Error(JSON.stringify(message.error)))
        else entry?.resolve(message.result)
      } else if (message.method === "Runtime.exceptionThrown")
        exceptions.push(message.params.exceptionDetails.text)
      else if (
        message.method === "Runtime.consoleAPICalled" &&
        message.params.type === "error"
      )
        consoleErrors.push(
          message.params.args.map((arg) => arg.value ?? "").join(" "),
        )
    })
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence
        const timeout = setTimeout(() => {
          pending.delete(id)
          reject(Error(`Browser timeout: ${method}`))
        }, 15000)
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timeout)
            resolve(value)
          },
          reject: (error) => {
            clearTimeout(timeout)
            reject(error)
          },
        })
        ws.send(JSON.stringify({ id, method, params }))
      })
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails)
        throw Error(
          `Browser evaluation failed: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`,
        )
      return result.result.value
    }
    const waitFor = async (expression, description = expression) => {
      for (let attempt = 0; attempt < 140; attempt++) {
        if (await evaluate(expression)) return
        await delay(75)
      }
      throw Error(`Timed out: ${description}`)
    }
    const go = async (route) => {
      await send("Page.navigate", { url: `${origin}${route}` })
      await waitFor(
        'document.readyState === "complete" && Boolean(document.querySelector("#root")?.children.length)',
        "React mount",
      )
    }
    const click = async (text, selector = "button") => {
      const find = `[...document.querySelectorAll(${JSON.stringify(selector)})].find(el => el.textContent.trim() === ${JSON.stringify(text)} && !el.disabled)`
      await waitFor(`Boolean(${find})`, `button ${text}`)
      await evaluate(`(${find}).click()`)
      await delay(40)
    }
    const input = async (name, value) => {
      await evaluate(
        `(() => { const el = document.querySelector('input[name="${name}"], textarea[name="${name}"], select[name="${name}"]'); if (!el) throw Error('Missing input: ${name}'); const prototype = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); })()`,
      )
    }
    const screenshot = async (name) => {
      await delay(350)
      const directory =
        process.env.VERIFY_SCREENSHOTS_DIR ||
        ".tmp-profile-verification/screenshots"
      await mkdir(directory, { recursive: true })
      const capture = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: !(await evaluate("innerWidth < 600")),
      })
      await writeFile(
        path.join(directory, name),
        Buffer.from(capture.data, "base64"),
      )
    }
    await send("Page.enable")
    await send("Runtime.enable")
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    })
    return {
      send,
      evaluate,
      waitFor,
      go,
      click,
      input,
      screenshot,
      close,
      exceptions,
      consoleErrors,
    }
  } catch (error) {
    await close()
    throw error
  }
}
