// Real React, HTTP, SignalR and PostgreSQL via ChatBrowserTests. No fetch interception.
import assert from "node:assert/strict"
import { createServer } from "vite"
import openBrowser from "./profile-browser.mjs"

const api = process.env.TINDY_CHAT_API
if (!api) throw Error("Run via ChatBrowserTests with TINDY_CHAT_BROWSER=1")
let server, leader, member
process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-chat-live/screenshots"
try {
  server = await createServer({
    cacheDir: ".tmp-chat-live/vite",
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("") },
    server: {
      host: "127.0.0.1",
      port: 0,
      proxy: { "/api": { target: api }, "/hubs": { target: api, ws: true } },
    },
  })
  await server.listen()
  const origin = server.resolvedUrls.local[0].replace(/\/$/, "")
  leader = await openBrowser(origin)
  member = await openBrowser(origin)
  const login = async (browser, token, route) => {
    await browser.go("/login")
    await browser.evaluate(
      `localStorage.setItem("tindy_access_token", ${JSON.stringify(token)})`,
    )
    await browser.go(route)
    await browser.waitFor(
      '!document.body.innerText.includes("Restoring your Tindy session")',
    )
  }
  const fill = (browser, label, value) =>
    browser.evaluate(
      `(() => { const el = document.querySelector('[aria-label=${JSON.stringify(label)}]'); const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,"value").set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event("input",{bubbles:true})); })()`,
    )
  await login(
    member,
    process.env.TINDY_CHAT_MEMBER_TOKEN,
    "/messages?tab=requests",
  )
  await login(
    leader,
    process.env.TINDY_CHAT_LEADER_TOKEN,
    "/users/" + process.env.TINDY_CHAT_MEMBER,
  )
  await member.waitFor('Boolean(document.querySelector(".request-empty"))')
  await member.screenshot("requests-empty.png")
  await leader.waitFor('Boolean(document.querySelector(".profile-identity-actions .chat-contact-actions"))')
  await leader.screenshot("member-profile-actions-desktop.png")
  await leader.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await leader.screenshot("member-profile-actions-mobile.png")
  assert.equal(await leader.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true)
  await leader.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  const detail = await leader.evaluate('fetch("/api/projects/" + ' + JSON.stringify(process.env.TINDY_CHAT_PROJECT) + ', {headers:{Authorization:"Bearer " + localStorage.getItem("tindy_access_token")}}).then(r=>r.json()).then(r=>r.data)')
  await leader.go("/discover?mode=teammates&project_id=" + process.env.TINDY_CHAT_PROJECT + "&position_id=" + detail.positions[0].position_id)
  await leader.waitFor('document.querySelectorAll(".teammate-filters select").length === 3 && !document.querySelectorAll(".teammate-filters select")[2].disabled')
  await leader.evaluate('(() => { const el=document.querySelectorAll(".teammate-filters select")[2]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(el,"1"); el.dispatchEvent(new Event("change",{bubbles:true})); })()')
  await leader.waitFor('new URLSearchParams(location.search).get("hours") === "1"')
  await leader.click("Reset filters")
  await leader.waitFor('!new URLSearchParams(location.search).has("hours") && Boolean(document.querySelector(".teammate-card"))')
  assert.equal(await leader.evaluate('new URLSearchParams(location.search).get("project_id")'), process.env.TINDY_CHAT_PROJECT)
  assert.equal(await leader.evaluate('new URLSearchParams(location.search).get("position_id")'), detail.positions[0].position_id)
  await leader.screenshot("teammate-discovery-desktop.png")
  await leader.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await leader.click("Filters")
  await leader.screenshot("teammate-discovery-mobile-filters.png")
  assert.equal(await leader.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true)
  await leader.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await leader.waitFor('Boolean(document.querySelector(".teammate-invite")) && !document.querySelector(".teammate-invite").disabled')
  await leader.evaluate('document.querySelector(".teammate-invite").click()')
  await leader.waitFor('Boolean(document.querySelector(".project-invitation-modal"))')
  await fill(leader, "Invitation message", "Hi! Your experience looks like a great fit for our team. I’d love to build this project together.")
  await leader.screenshot("project-invitation-desktop.png")
  await leader.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await leader.screenshot("project-invitation-mobile.png")
  assert.equal(await leader.evaluate('document.querySelector(".project-invitation-modal").scrollWidth <= document.querySelector(".project-invitation-modal").clientWidth + 1'), true)
  await leader.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await leader.click("Send invitation")
  await leader.waitFor('!document.querySelector(".project-invitation-modal")')
  await leader.click("View Candidate Profile")
  await leader.waitFor('document.querySelectorAll(".candidate-experience").length > 0 && document.querySelectorAll(".candidate-certificate").length > 0')
  await leader.screenshot("candidate-profile-desktop.png")
  await leader.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await leader.screenshot("candidate-profile-mobile.png")
  assert.equal(await leader.evaluate('document.querySelector(".candidate-profile-modal").scrollWidth <= document.querySelector(".candidate-profile-modal").clientWidth + 1'), true)
  await leader.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await leader.go("/users/" + process.env.TINDY_CHAT_MEMBER)
  await leader.click("Request a conversation")
  await leader.waitFor(
    "document.querySelector(" +
      JSON.stringify('select[aria-label="Project"]') +
      ")?.options.length > 1",
  )
  const selectedContext = await leader.evaluate('({project:document.querySelector(\'select[aria-label="Project"]\').value, topic:document.querySelector(\'select[aria-label="Position / topic"]\').value})')
  assert.ok(selectedContext.project && selectedContext.topic)
  assert.equal(await leader.evaluate('(() => { const options=[...document.querySelector(\'select[aria-label="Project"]\').options].slice(1).map(o=>o.value); return new Set(options).size === options.length; })()'), true)
  const selectContext = async (label, value) => leader.evaluate(`(() => { const el=document.querySelector('select[aria-label="${label}"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event("change",{bubbles:true})); })()`)
  await selectContext("Project", "")
  await leader.waitFor('document.querySelector(\'select[aria-label="Position / topic"]\').disabled')
  await selectContext("Project", selectedContext.project)
  await leader.waitFor('!document.querySelector(\'select[aria-label="Position / topic"]\').disabled')
  assert.equal(await leader.evaluate('document.querySelector(\'select[aria-label="Position / topic"]\').value'), "")
  await selectContext("Position / topic", selectedContext.topic)
  await leader.screenshot("chat-request-project-topic-desktop.png")
  await leader.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await leader.screenshot("chat-request-project-topic-mobile.png")
  assert.equal(await leader.evaluate('document.querySelector(".chat-request-dialog").scrollWidth <= document.querySelector(".chat-request-dialog").clientWidth + 1'), true)
  await leader.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await fill(
    leader,
    "Opening message",
    "Let's discuss the project <script>window.bad=true</script>",
  )
  await leader.click("Send request")
  await leader.waitFor('Boolean(document.querySelector("[data-request-id]"))')
  await member.waitFor('Boolean(document.querySelector("[data-request-id]"))')
  assert.equal(await member.evaluate("Boolean(window.bad)"), false)
  assert.equal(
    await member.evaluate(
      'Boolean(document.querySelector("input[aria-label=Message]"))',
    ),
    false,
  )
  await member.screenshot("received.png")
  await member.click("Accept request")
  await member.waitFor(
    'Boolean(document.querySelector("input[aria-label=Message]"))',
  )
  // Accepted request appears in the sender's history without reloading the page.
  await leader.evaluate(
    '(() => { const el=document.querySelector(".request-filter"); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(el,"all"); el.dispatchEvent(new Event("change",{bubbles:true})); })()',
  )
  await leader.click("Open conversation", "a")
  await leader.waitFor(
    'Boolean(document.querySelector("input[aria-label=Message]"))',
  )
  await leader.waitFor('document.body.innerText.includes("Connected")')
  await member.waitFor('document.body.innerText.includes("Connected")')
  await fill(leader, "Message", "Realtime after consent")
  await leader.waitFor(
    'document.querySelector("button[aria-label=Send]")?.disabled === false',
  )
  await leader.evaluate(
    'document.querySelector(".chat-composer").requestSubmit()',
  )
  await member.waitFor(
    'document.body.innerText.includes("Realtime after consent")',
  )
  await member.screenshot("accepted-chat.png")
  await member.click("Block")
  await leader.waitFor(
    'document.querySelector("input[aria-label=Message]")?.disabled === true',
  )
  await member.go("/messages?tab=requests")
  await member.waitFor(
    'Boolean(document.querySelector(".request-empty")) && document.querySelectorAll(".request-blocked-person").length === 1',
  )
  await member.screenshot("requests-empty-blocked.png")
  await member.click("Unblock")
  await leader.waitFor(
    'document.querySelector("input[aria-label=Message]")?.disabled === false',
  )
  await leader.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await leader.screenshot("mobile-chat.png")
  await member.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await member.screenshot("mobile-requests.png")
  await member.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await member.go("/project/" + process.env.TINDY_CHAT_PROJECT)
  await member.waitFor('document.querySelectorAll(".detail-header-actions .chat-contact-actions--project > button").length === 2')
  await member.screenshot("project-contact-actions-desktop.png")
  await member.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})
  await member.evaluate('document.querySelector(".project-contact-row").scrollIntoView({block:"center"})')
  await member.screenshot("project-contact-actions-mobile.png")
  assert.equal(await member.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true)
  await member.click("Share project")
  await member.waitFor('Boolean(document.querySelector(".chat-request-dialog"))')
  await member.click("Close")
  await member.waitFor('!document.querySelector(".chat-request-dialog")')
  await member.click("Message leader")
  await member.waitFor('location.pathname === "/messages" && Boolean(document.querySelector("input[aria-label=Message]"))')
  await leader.send("Emulation.setDeviceMetricsOverride", {width:1440,height:1080,deviceScaleFactor:1,mobile:false})
  await leader.go("/projects?tab=Invited")
  await leader.waitFor('Boolean(document.querySelector(".member-invitation-heading")) && document.body.innerText.includes("No invitations")')
  await leader.screenshot("project-invitations-heading.png")
  assert.deepEqual(leader.exceptions, [])
  assert.deepEqual(member.exceptions, [])
  console.log(
    "PASS live browsers: request, safe opening, consent, realtime, block/unblock and mobile render",
  )
} finally {
  await leader?.close()
  await member?.close()
  await server?.close()
}
