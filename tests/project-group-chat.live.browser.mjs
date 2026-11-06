// Real React + HTTP + SignalR + disposable PostgreSQL, run via ProjectGroupChatBrowserTests.
import assert from "node:assert/strict"
import { createServer } from "vite"
import openBrowser from "./profile-browser.mjs"
const project = process.env.TINDY_CHAT_PROJECT
const memberId = process.env.TINDY_CHAT_MEMBER
const position = process.env.TINDY_CHAT_POSITION
if (!process.env.TINDY_CHAT_API) throw Error("Run via ProjectGroupChatBrowserTests")
process.env.VERIFY_SCREENSHOTS_DIR = ".tmp-chat-live/screenshots"
let server, leader, member
const text = value => "document.body.innerText.includes(" + JSON.stringify(value) + ")"
const api = (browser, path, method = "GET", body) => browser.evaluate(
  "fetch(" + JSON.stringify(path) + ", {method:" + JSON.stringify(method) + ",headers:{Authorization:'Bearer '+localStorage.getItem('tindy_access_token'),'Content-Type':'application/json'},body:" + (body ? JSON.stringify(JSON.stringify(body)) : "undefined") + "}).then(async r=>{const json=await r.json();if(!r.ok)throw Error(JSON.stringify(json));return json.data})"
)
const login = async (browser, token, route) => {
  await browser.go("/login")
  await browser.evaluate("localStorage.setItem('tindy_access_token'," + JSON.stringify(token) + ")")
  await browser.go(route)
  await browser.waitFor("!document.body.innerText.includes('Restoring your Tindy session')")
}
const send = async (browser, body) => {
  await browser.waitFor("Boolean(document.querySelector('[aria-label=Message]')) && !document.querySelector('[aria-label=Message]').disabled")
  await browser.evaluate("(()=>{const el=document.querySelector('[aria-label=Message]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el," + JSON.stringify(body) + ");el.dispatchEvent(new Event('input',{bubbles:true}));})()")
  await browser.waitFor("!document.querySelector('[aria-label=Send]').disabled")
  await browser.evaluate("document.querySelector('.chat-composer').requestSubmit()")
  await browser.waitFor(text(body))
}
try {
  server = await createServer({cacheDir:'.tmp-chat-live/vite',define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('')},server:{host:'127.0.0.1',port:0,proxy:{'/api':{target:process.env.TINDY_CHAT_API},'/hubs':{target:process.env.TINDY_CHAT_API,ws:true}}}})
  await server.listen()
  const origin = server.resolvedUrls.local[0].replace(/\/$/,'')
  leader = await openBrowser(origin); member = await openBrowser(origin)
  await login(leader, process.env.TINDY_CHAT_LEADER_TOKEN, '/team/' + project)
  await leader.waitFor("Boolean(document.querySelector('a[href=\"/messages?project=" + project + "\"]'))")
  await leader.click('Open team chat', 'a')
  await leader.waitFor(text('Project group'))
  await send(leader, 'History before Jordan joined')
  await login(member, process.env.TINDY_CHAT_MEMBER_TOKEN, '/messages')
  const invite = await api(leader, '/api/projects/' + project + '/invitations', 'POST', {position_id:position,invited_user_id:memberId,message:'Join our project'})
  await api(member, '/api/me/project-invitations/' + invite.invitation_id + '/accept', 'POST')
  await member.waitFor("Boolean([...document.querySelectorAll('.chat-contact-copy small')].find(el=>el.textContent==='Project group'))")
  await member.go('/messages?project=' + project)
  await member.waitFor(text('History before Jordan joined'))
  await send(member, 'Hello project team')
  await leader.waitFor(text('Hello project team'))
  assert.equal(await leader.evaluate("[...document.querySelectorAll('.incoming')].some(el=>el.innerText.includes('Hello project team')&&el.innerText.includes('Jordan Nguyen'))"),true)
  assert.equal(await member.evaluate("[...document.querySelectorAll('.outgoing')].some(el=>el.innerText.includes('Hello project team'))"),true)
  await leader.evaluate("document.querySelector('.project-chat-members').open=true;window.confirm=()=>true")
  await leader.screenshot('project-group-desktop.png')
  await leader.click('Remove', '.project-chat-remove')
  await member.waitFor("document.querySelector('[aria-label=Message]').disabled")
  await send(leader, 'Private after departure')
  await member.go('/messages?project=' + project)
  await member.waitFor(text('Sending is disabled.'))
  assert.equal(await member.evaluate(text('Private after departure')),false)
  await member.screenshot('project-group-former-member.png')
  const application = await api(member,'/api/projects/' + project + '/applications','POST',{position_id:position})
  await api(leader,'/api/projects/' + project + '/applications/' + application.application_id + '/accept','POST')
  await member.waitFor("!document.querySelector('[aria-label=Message]').disabled")
  await member.waitFor(text('Private after departure'))
  await member.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await member.screenshot('project-group-mobile.png')
  assert.equal(await member.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),true)
  assert.deepEqual(leader.exceptions,[]); assert.deepEqual(member.exceptions,[])
  console.log('PASS: project workspace link, new-member history, own/sender labels, realtime delivery, removal cutoff, rejoin and mobile layout')
} finally {
  await member?.close(); await leader?.close(); await server?.close()
}
