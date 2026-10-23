import assert from "node:assert/strict"
import { createServer } from "node:net"
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { createServer as createViteServer } from "vite"
import openBrowser from "./profile-browser.mjs"

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export default async function startMediaHarness() {
  const calls = []
  let simulation,
    vite,
    browser,
    log = "",
    errors = "",
    launchError
  const close = async () => {
    await mkdir(".tmp-profile-verification", { recursive: true })
    await writeFile(".tmp-profile-verification/media-simulation.ndjson", log)
    if (errors)
      await writeFile(".tmp-profile-verification/media-simulation.err", errors)
    await browser?.close()
    await vite?.close()
    if (simulation?.pid && simulation.exitCode == null) {
      if (process.platform === "win32")
        await new Promise((resolve) => {
          const stop = spawn(
            "taskkill",
            ["/PID", String(simulation.pid), "/T", "/F"],
            { windowsHide: true, stdio: "ignore" },
          )
          stop.on("exit", resolve)
          stop.on("error", resolve)
        })
      else simulation.kill("SIGINT")
    }
  }
  try {
    const socket = createServer()
    await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve))
    const port = socket.address().port
    await new Promise((resolve) => socket.close(resolve))
    simulation = spawn(
      process.env.POSTMAN_PATH || "postman.exe",
      [
        "simulation",
        "run",
        "postman/simulations/profile.sim.yaml",
        "--port",
        String(port),
        "--output",
        "ndjson",
        "--no-history",
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    )
    simulation.stdout.on("data", (chunk) => {
      log += chunk
    })
    simulation.stderr.on("data", (chunk) => {
      errors += chunk
    })
    simulation.on("error", (error) => {
      launchError = error
    })
    for (let i = 0; !log.includes('"listening"'); i++) {
      if (launchError) throw launchError
      if (i > 400 || simulation.exitCode != null)
        throw Error(`Simulation startup: ${errors} ${log}`)
      await delay(100)
    }
    const simOrigin = `http://127.0.0.1:${port}`
    const control = async (path, body) => {
      const response = await fetch(`${simOrigin}/__test/${path}`, {
        method: body ? "POST" : "GET",
        headers: { "x-mock-slug": "tindy", "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      assert.equal(response.status, 200)
      return (await response.json()).data
    }
    vite = await createViteServer({
      define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("") },
      server: {
        host: "127.0.0.1",
        port: 0,
        proxy: {
          "/api": {
            target: simOrigin,
            changeOrigin: true,
            headers: { "x-mock-slug": "tindy" },
            configure(proxy) {
            const requestCalls = new WeakMap()
              proxy.on("proxyReq", (_outgoing, incoming) => {
                const call = {
                  path: incoming.url,
                  method: incoming.method,
                  authorization: incoming.headers.authorization,
                  type: incoming.headers["content-type"],
                  started: Date.now(),
                  body: null,
                }
                calls.push(call)
              requestCalls.set(incoming, call)
              incoming.on("aborted", () => { call.aborted = true })
                const chunks = []
                incoming.on("data", (chunk) => chunks.push(chunk))
                incoming.on("end", () => {
                  const bytes = Buffer.concat(chunks)
                  call.bytes = bytes.length
                  if (call.type?.includes("application/json") && bytes.length)
                    call.body = JSON.parse(bytes.toString())
                  else if (call.type?.includes("multipart/form-data"))
                    call.multipart = bytes.toString("latin1")
                })
              })
              proxy.on("proxyRes", (_response, incoming) => {
              const call = requestCalls.get(incoming)
                if (call) call.finished = Date.now()
              })
            },
          },
        },
      },
    })
    await vite.listen()
    const origin = vite.resolvedUrls.local[0].replace(/\/$/, "")
    browser = await openBrowser(origin)
    await browser.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
      window.__mediaUrls = new Set(); window.__created = 0; window.__revoked = 0;
      const make = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = blob => { const url = make(blob); window.__mediaUrls.add(url); window.__created++; return url; };
      URL.revokeObjectURL = url => { window.__mediaUrls.delete(url); window.__revoked++; revoke(url); };
    `,
    })
    return { ...browser, calls, control, close, log: () => log }
  } catch (error) {
    await close()
    throw error
  }
}
