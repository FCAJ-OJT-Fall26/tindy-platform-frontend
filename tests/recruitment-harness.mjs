import { createServer } from "vite"
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import openBrowser from "./profile-browser.mjs"

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
export default async function recruitmentHarness() {
  let simulation, server, browser, output = "", errors = ""
  const close = async () => {
    await browser?.close(); await server?.close()
    if (simulation) {
      if (process.platform === "win32") await new Promise(resolve => { const child = spawn("taskkill", ["/PID", String(simulation.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); child.once("exit", resolve) })
      else simulation.kill("SIGINT")
      await mkdir(".tmp-recruitment-results", { recursive: true }); await writeFile(".tmp-recruitment-results/simulation.ndjson", output)
    }
  }
  try {
    let backend = process.env.TINDY_PROJECT_SIM_URL
    if (!backend) {
      simulation = spawn("postman", ["simulation", "run", "postman/simulations/project-crud.sim.yaml", "--port", "auto", "--no-history", "--output", "ndjson"], { shell: process.platform === "win32", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })
      simulation.stdout.on("data", chunk => output += chunk); simulation.stderr.on("data", chunk => errors += chunk)
      for (let i = 0; i < 200 && !backend; i++) {
        for (const line of output.split("\n")) { try { const event = JSON.parse(line); if (event.event === "listening") backend = `${event.url}/tindy` } catch {} }
        if (simulation.exitCode !== null) throw Error((errors || output).slice(-2000))
        if (!backend) await pause(100)
      }
      if (!backend) throw Error("Postman simulation startup timed out")
    }
    const fixture = async (route, body) => {
      const res = await fetch(`${backend}/__test/${route}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {})
      if (!res.ok) throw Error(`Fixture ${route} failed: ${res.status}`)
      return (await res.json()).data
    }
    server = await createServer({ cacheDir: ".tmp-recruitment-vite-cache", define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("") }, server: {
      host: "127.0.0.1", port: 0, proxy: { "/api": { target: new URL(backend).origin, rewrite: value => "/tindy" + value } },
    } })
    await server.listen(); const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
    browser = await openBrowser(origin)
    await browser.go("/login"); await browser.evaluate("localStorage.setItem('tindy_access_token','fixture-token')")
    return { browser, fixture, close, origin }
  } catch (error) { await close(); throw error }
}
