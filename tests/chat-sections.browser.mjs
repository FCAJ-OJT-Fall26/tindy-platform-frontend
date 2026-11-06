import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import recruitmentHarness from './recruitment-harness.mjs'
process.env.VERIFY_SCREENSHOTS_DIR='.tmp-chat-sections/screenshots'
const app=await recruitmentHarness()
const {browser:b,fixture}=app
const includes=t=>'document.body.innerText.includes('+JSON.stringify(t)+')'
const tab=t=>'[...document.querySelectorAll(".messages-navigation button")].find(b=>b.textContent.includes('+JSON.stringify(t)+'))'
const input=async(label,value)=>b.evaluate('(()=>{const el=document.querySelector('+JSON.stringify('[aria-label="'+label+'"]')+');Object.getOwnPropertyDescriptor(el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,"value").set.call(el,'+JSON.stringify(value)+');el.dispatchEvent(new Event("input",{bubbles:true}));})()')
try {
 const seed=await fixture('reset',{})
 const owner={user_id:seed.projects[0].leader.user_id,display_name:'Project Leader',email:null,username:null,university:'FPT',status:'active',roles:['Member'],is_onboarding_completed:true}
 const partner={user_id:randomUUID(),display_name:'Alex Nguyen',username:'alex',avatar_url:null}
 const group={conversation_id:randomUUID(),type:'project',project_id:seed.projects[0].project_id,name:'Container Deployment Lab',other_participant:null,unread_count:2,can_send:true,participants:[{user_id:owner.user_id,display_name:owner.display_name,is_leader:true,is_active:true}],last_message_at:null}
 group.participants.push(...['Trần Thu Hà (Demo)','Lê Hoàng Nam (Demo)','Hồ Phương Nhi (Demo)'].map(display_name=>({user_id:randomUUID(),display_name,is_leader:false,is_active:true})))
 const otherGroup={...group,conversation_id:randomUUID(),project_id:randomUUID(),name:'Campus Planner',unread_count:0}
 const direct={conversation_id:randomUUID(),type:'direct',other_participant:partner,unread_count:1,can_send:true,last_message_at:null}
 const multiline='Dòng đầu\nDòng tiếp'
 const sentCount=async()=> (await fixture('state')).requests.filter(r=>r.method==='POST'&&r.path.endsWith('/messages')).length
 const enter=async(shift=false)=>{
   await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,modifiers:shift?8:0,text:'\r'})
   await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,modifiers:shift?8:0})
 }
 const checkComposer=async()=>{
   await b.waitFor('Boolean(document.querySelector("textarea[aria-label=Message]")) && !document.querySelector("textarea[aria-label=Message]").disabled')
   const before=await sentCount()
   await input('Message','Dòng đầu')
   await b.waitFor('!document.querySelector("[aria-label=Send]").disabled')
   await b.evaluate('document.querySelector("textarea[aria-label=Message]").focus()')
   await enter(true)
   assert.equal(await b.evaluate('document.querySelector("textarea[aria-label=Message]").value'),'Dòng đầu\n')
   assert.equal(await sentCount(),before)
   await b.send('Input.insertText',{text:'Dòng tiếp'})
   await b.evaluate('document.querySelector("textarea[aria-label=Message]").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",isComposing:true,bubbles:true,cancelable:true}))')
   assert.equal(await sentCount(),before)
   await enter()
   await b.waitFor('document.querySelector("textarea[aria-label=Message]").value===""')
   const sent=(await fixture('state')).requests.filter(r=>r.method==='POST'&&r.path.endsWith('/messages'))
   assert.equal(sent.length,before+1)
   assert.equal(sent.at(-1).body.body,multiline)
   await b.waitFor('Boolean(document.querySelector(".outgoing .chat-message-text"))')
   assert.equal(await b.evaluate('getComputedStyle(document.querySelector(".outgoing .chat-message-text")).whiteSpace'),'pre-wrap')
   assert.equal(await b.evaluate('document.querySelector(".outgoing .chat-message-text").textContent'),multiline)
   await input('Message',Array(18).fill('A longer line').join('\n'))
   await b.waitFor('document.querySelector("textarea[aria-label=Message]").style.height==="144px"')
   assert.equal(await b.evaluate('document.querySelector("textarea[aria-label=Message]").offsetHeight<=144'),true)
   await input('Message','')
   await enter()
   assert.equal(await sentCount(),before+1)
 }
 const groupHistory=Array.from({length:4},(_,i)=>({message_id:randomUUID(),conversation_id:group.conversation_id,sender_id:owner.user_id,body:'Member '+i+' joined the project.',created_at:new Date(Date.now()-60000+i).toISOString(),message_type:'system'}))
 const responses=rows=>[
  {method:'GET',path:'/chat/conversations/'+group.conversation_id+'/messages$',response:{items:groupHistory,has_more:false,next_before:null,next_before_message_id:null},repeat:true},
  ...rows.map(row=>({method:'POST',path:'/chat/conversations/'+row.conversation_id+'/messages$',response:{message_id:randomUUID(),conversation_id:row.conversation_id,sender_id:owner.user_id,body:multiline,created_at:new Date().toISOString(),client_message_id:null},repeat:true})),
  {method:'GET',path:'/chat/conversations$',response:rows,repeat:true},
  {method:'GET',path:'/chat/requests$',response:{items:[],pending_received:0,has_more:false},repeat:true},
  {method:'GET',path:'/chat/blocks$',response:[],repeat:true},
  {method:'GET',path:'/chat/conversations/.+/messages$',response:{items:[],has_more:false,next_before:null,next_before_message_id:null},repeat:true},
  {method:'GET',path:'/chat/projects/.+$',response:group,repeat:true},
  {method:'GET',path:'/chat/users$',response:[partner],repeat:true},
 ]
 await fixture('control',{currentUser:owner,failures:responses([group,otherGroup,direct])})
 await b.go('/messages')
 await b.waitFor('document.querySelectorAll(".chat-conversation-list .chat-contact").length===2')
 assert.equal(await b.evaluate(tab('Project chats')+'?.getAttribute("aria-pressed")'),'true')
 assert.equal(await b.evaluate('Boolean([...document.querySelectorAll(".chat-contact-copy strong")].find(el=>el.textContent==="Alex Nguyen"))'),false)
 await b.waitFor('Boolean(document.querySelector(".chat-composer")) && !document.querySelector(".chat-message-stream").innerText.includes("Loading messages")')
 await checkComposer()
 await b.screenshot('projects-desktop.png')
 await input('Search project chats','Campus')
 await b.waitFor('document.querySelectorAll(".chat-conversation-list .chat-contact").length===1')
 assert.equal(await b.evaluate('document.querySelector(".chat-contact-copy strong").textContent'),'Campus Planner')
 await b.evaluate(tab('Direct messages')+'.click()')
 await b.waitFor(`document.querySelectorAll(".chat-conversation-list .chat-contact").length===1 && Boolean(document.querySelector('[aria-label="Search users"]'))`)
 assert.equal(await b.evaluate('document.querySelector(".chat-contact-copy strong").textContent'),'Alex Nguyen')
 await b.waitFor(includes('Private conversation'))
 await checkComposer()
 await b.screenshot('direct-desktop.png')
 await b.evaluate(tab('Requests')+'.click()')
 await b.waitFor('Boolean(document.querySelector(".request-empty"))')
 await b.go('/messages?conversation='+group.conversation_id)
 await b.waitFor(tab('Project chats')+'?.getAttribute("aria-pressed")==="true" && document.querySelectorAll(".chat-conversation-list .chat-contact").length===2')
 await b.go('/messages?conversation='+direct.conversation_id)
 await b.waitFor(tab('Direct messages')+'?.getAttribute("aria-pressed")==="true" && document.querySelectorAll(".chat-conversation-list .chat-contact").length===1')
 await b.go('/messages?project='+group.project_id)
 await b.waitFor('new URLSearchParams(location.search).get("conversation")==='+JSON.stringify(group.conversation_id))
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await b.screenshot('projects-mobile.png')
 assert.equal(await b.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),true)
 const crowded=[group,otherGroup,...Array.from({length:7},(_,i)=>({...group,conversation_id:randomUUID(),project_id:randomUUID(),name:'Team project '+i}))]
 await fixture('control',{failures:responses(crowded)})
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false})
 await b.go('/messages?project='+group.project_id)
 await b.waitFor('document.querySelectorAll(".chat-conversation-list .chat-contact").length===9 && Boolean(document.querySelector(".chat-composer"))')
 const composerVisible=async()=>{
   await b.waitFor('Boolean(document.querySelector("textarea[aria-label=Message]"))')
   const bounds=await b.evaluate('(()=>{const room=document.querySelector(".chat-room").getBoundingClientRect(),workspace=document.querySelector(".chat-workspace").getBoundingClientRect(),composer=document.querySelector(".chat-composer").getBoundingClientRect(),input=document.querySelector("textarea[aria-label=Message]"),r=input.getBoundingClientRect();return {roomBottom:room.bottom,workspaceBottom:workspace.bottom,composerBottom:composer.bottom,composerTop:composer.top,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===input};})()')
   assert.ok(bounds.roomBottom<=bounds.workspaceBottom+1,JSON.stringify(bounds))
   assert.ok(bounds.composerBottom<=bounds.roomBottom,JSON.stringify(bounds))
   assert.equal(bounds.hit,true,JSON.stringify(bounds))
 }
 await composerVisible()
 await b.evaluate('document.querySelector(".project-chat-members").open=true')
 await composerVisible()
 await b.screenshot('members-desktop.png')
 assert.equal(await b.evaluate('document.querySelectorAll(".project-chat-remove").length'),3)
 await b.evaluate('window.confirm=()=>false;document.querySelector(".project-chat-remove").click()')
 assert.equal((await fixture('state')).requests.filter(r=>r.method==='DELETE').length,0)
 await b.evaluate('document.querySelector(".project-chat-members").open=false')
 await input('Message','Bản nháp nhiều dòng\nViết tiếp')
 await composerVisible()
 await b.evaluate('document.querySelector("textarea[aria-label=Message]").focus()')
 await input('Message','Dòng đầu')
 await enter(true)
 await b.send('Input.insertText',{text:'Dòng tiếp'})
 const sentBefore=await sentCount()
 await enter()
 await b.waitFor('document.querySelector("textarea[aria-label=Message]").value===""')
 assert.equal(await sentCount(),sentBefore+1)
 assert.equal((await fixture('state')).requests.filter(r=>r.method==='POST'&&r.path.endsWith('/messages')).at(-1).body.body,multiline)
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await b.go('/messages?project='+group.project_id)
 await b.waitFor('document.querySelectorAll(".chat-conversation-list .chat-contact").length===9 && Boolean(document.querySelector(".chat-composer"))')
 await b.evaluate('document.querySelector(".chat-composer").scrollIntoView({block:"center"})')
 await composerVisible()
 await b.evaluate('document.querySelector(".project-chat-members").open=true')
 await composerVisible()
 await b.screenshot('members-mobile.png')
 await fixture('control',{failures:responses([group,otherGroup])})
 await b.go('/messages?tab=direct')
 await b.waitFor(includes('No direct messages yet'))
 assert.equal(await b.evaluate('document.querySelectorAll(".chat-conversation-list .chat-contact").length'),0)
 assert.deepEqual(b.exceptions,[])
 console.log('PASS: separate lists, counts, project search, tab switching, requests, direct/project deep links, empty state, mobile layout, Shift+Enter newline, Enter send, IME guard, multiline rendering and bounded auto-grow in both chat types')
} finally { await app.close() }
