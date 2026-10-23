// Real React + fetch + multipart over HTTP through Postman simulation. No real scanning.
import assert from "node:assert/strict"
import startMediaHarness, { delay } from "./profile-media-harness.mjs"
import verifyPrivateMediaRetry from "./private-media-retry.browser.mjs"
import verifyCertificateFlow from "./certificate-flow.browser.mjs"
import verifyProfileImageEditor from "./profile-image-editor.browser.mjs"

const memberId = "44444444-4444-4444-8444-444444444444"
const base = "/api/me/profile"
const cert = "55555555-5555-4555-8555-555555555555"
const collection = `${base}/certificates/${cert}/attachments`
const includes = (value) =>
  `document.body.innerText.includes(${JSON.stringify(value)})`
let checks = 0
const pass = (label) => console.log(`PASS ${++checks}: ${label}`)
const h = await startMediaHarness()
const { evaluate, waitFor, go, click, control, calls, send } = h
const faults = async (method, path, value) =>
  control("control", { faults: value ? { [`${method} ${path}`]: value } : {} })
const state = () => control("state")
const mediaCalls = () =>
  calls.filter((call) => /^\/api\/media\//.test(call.path))
const count = (method, path) =>
  calls.filter((call) => call.method === method && call.path === path).length
const ready = () =>
  waitFor(
    `${includes("Your professional profile")} && !!document.querySelector('.profile-identity') && !${includes("Loading attachments")}`,
  )
const closeModal = async () => {
  await evaluate(
    "document.querySelector('[role=dialog] [aria-label=\"Close modal\"]')?.click() || document.querySelector('[role=dialog] [aria-label=\"Close dialog\"]')?.click()",
  )
  // Existing modal has an accessible close button; use Escape as a keyboard path.
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  })
  await waitFor("!document.querySelector('[role=dialog]')")
}
const choose = async (name, type = "image/png", size = 100) => {
  await evaluate(`(() => {
    const data = new DataTransfer(); data.items.add(new File([new Uint8Array(${size})], ${JSON.stringify(name)}, {type:${JSON.stringify(type)}}));
    const input = document.querySelector('[role=dialog] input[type=file]') || document.querySelector('.attachment-upload input');
    input.files = data.files; input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`)
}
const uploadImage = async (kind, file = `${kind}.png`) => {
  await click(`Edit ${kind}`)
  await choose(file)
  await waitFor("!!document.querySelector('.media-upload-preview img')")
  await click(`Upload ${kind}`)
  await waitFor("!document.querySelector('[role=dialog]')")
  await waitFor(
    kind === "avatar"
      ? "document.querySelector('.profile-avatar-wrap img')?.src.startsWith('blob:')"
      : "document.querySelector('.profile-cover-image')?.src.startsWith('blob:')",
  )
}
const attachmentSeed = async (items) =>
  control("control", { attachments: { ...(await state()).attachments, [cert]: items } })
const refreshAttachments = async () => {
  await click("Check attachments again", `[data-certificate-id="${cert}"] button`)
  await waitFor(`!${includes("Loading attachments")}`)
}

try {
  await control("reset", {})
  await go("/login")
  await evaluate(
    'localStorage.setItem("tindy_access_token", "synthetic-profile-token")',
  )
  await go("/profile")
  await ready()
  await uploadImage("avatar")
  const first = (await state()).profile.avatar_media_asset_id
  await waitFor(
    "document.querySelector('.topbar-user img')?.src === document.querySelector('.profile-avatar-wrap img')?.src",
  )
  assert.equal(
    mediaCalls().filter((call) => call.path.includes(first)).length,
    1,
  )
  assert.ok(
    calls
      .find((call) => call.method === "POST" && call.path === `${base}/avatar`)
      .type.match(/multipart\/form-data; boundary=/),
  )
  assert.ok(
    calls
      .find((call) => call.method === "POST" && call.path === `${base}/avatar`)
      .multipart.includes('name="file"; filename="avatar.png"'),
  )
  pass(
    "Avatar multipart upload, preview and private Blob shared between Profile/Header without duplicate fetch",
  )
  await uploadImage("avatar", "replacement.png")
  assert.notEqual((await state()).profile.avatar_media_asset_id, first)
  assert.ok(await evaluate("window.__revoked > 0"))
  pass("Replacing avatar releases the previous Object URL")
  await go("/profile")
  await ready()
  await waitFor(
    "document.querySelector('.profile-avatar-wrap img')?.src.startsWith('blob:')",
  )
  pass("Reload reads persisted private media with JWT")
  await click("Edit avatar")
  await waitFor(includes("Use Google avatar"))
  assert.ok(!(await evaluate(includes("Use GitHub avatar"))))
  const beforeSource = count("PUT", `${base}/avatar/source`)
  assert.equal(beforeSource, 0)
  await click("Use Google avatar")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await state()).profile.avatar_source, "oauth")
  assert.deepEqual(
    calls.find((call) => call.method === "PUT" && call.path.endsWith("/source"))
      .body,
    { source: "oauth", provider: "google" },
  )
  await control("control", {
    providers: [
      ...(await state()).providers,
      {
        provider: "GitHub",
        provider_username: "synthetic-github",
        linked_at: "2026-10-23T00:00:00Z",
      },
    ],
  })
  await click("Edit avatar")
  await waitFor(includes("Use GitHub avatar"))
  await click("Use GitHub avatar")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.deepEqual(
    [...calls].reverse().find((call) => call.path.endsWith("/source")).body,
    { source: "oauth", provider: "github" },
  )
  pass(
    "Linked GitHub avatar is selected explicitly through the existing source API",
  )
  await click("Edit avatar")
  await click("Remove avatar")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await state()).profile.avatar_source, "default")
  await waitFor(
    "!document.querySelector('.profile-avatar-wrap img') && !document.querySelector('.topbar-user img')",
  )
  await click("Edit avatar")
  await click("Use default avatar")
  await waitFor("!document.querySelector('[role=dialog]')")
  pass(
    "Only linked OAuth sources appear; explicit Google/default selection and DELETE return default",
  )
  await uploadImage("cover")
  const cover = (await state()).profile.cover_media_asset_id
  await uploadImage("cover", "new-cover.png")
  assert.notEqual((await state()).profile.cover_media_asset_id, cover)
  await click("Edit cover")
  await click("Remove cover")
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await state()).profile.cover_media_asset_id, null)
  pass("Cover upload, replacement and bodyless DELETE 204")

  await click("Edit avatar")
  const beforeInvalid = count("POST", `${base}/avatar`)
  await choose("large.png", "image/png", 5_000_001)
  await waitFor(includes("File must be 5 MB or smaller."))
  await choose("bad.svg", "image/svg+xml")
  await waitFor(includes("Choose a JPEG, PNG or WebP image."))
  assert.equal(count("POST", `${base}/avatar`), beforeInvalid)
  await choose("retry.png")
  assert.equal(
    await evaluate("document.querySelector('input[type=file]').value"),
    "",
  )
  await faults("POST", `${base}/avatar`, { status: 429 })
  await click("Upload avatar")
  await waitFor(includes("Too many requests"))
  assert.ok(
    await evaluate("!!document.querySelector('.media-upload-preview img')"),
  )
  await faults("POST", `${base}/avatar`, null)
  await faults("POST", `${base}/avatar`, { delay: 17_000 })
  await click("Upload avatar")
  await delay(6_000)
  await waitFor(includes("Could not reach the media service"))
  assert.ok(
    await evaluate("!!document.querySelector('.media-upload-preview img')"),
  )
  await faults("POST", `${base}/avatar`, null)
  await delay(2_200)
  pass(
    "Real transport timeout preserves the selected image for retry and reconciles server state",
  )
  await click("Upload avatar")
  await waitFor("!document.querySelector('[role=dialog]')")
  pass(
    "Size/type validation, reset file input and preserved preview after 429 allow explicit retry",
  )
  const activeAvatar = (await state()).profile.avatar_media_asset_id
  await faults("GET", `/api/media/${activeAvatar}/content`, { status: 404 })
  await go("/profile")
  await ready()
  await waitFor(includes("This media is unavailable"))
  assert.ok(
    !(await evaluate("!!document.querySelector('.profile-avatar-wrap img')")),
  )
  assert.ok(
    await evaluate("localStorage.getItem('tindy_access_token') !== null"),
  )
  await faults("GET", `/api/media/${activeAvatar}/content`, null)
  await click("Retry avatar")
  await waitFor("!!document.querySelector('.profile-avatar-wrap img')")
  pass(
    "Private 404 has generic feedback, no legacy fallback/logout, and retry recovers",
  )

  await verifyProfileImageEditor(h, { pass, closeModal })
  await verifyCertificateFlow(h, { pass, choose, closeModal })
  await control("control", {
    certificates: [
      {
        certificate_id: cert,
        title: "Media Certificate",
        issuer: "Synthetic Institute",
        description: "Cloud knowledge and private certificate file.",
        credential_url: null,
        created_at: "2026-10-23T00:00:00Z",
        updated_at: null,
      },
    ],
  })
  await go("/profile")
  await ready()
  await waitFor(includes("No file attached."))
  // A new invalid selection must never leave an older valid file uploadable.
  await choose("stale.png")
  await waitFor(includes("Selected: stale.png"))
  await choose("invalid.txt", "text/plain")
  await waitFor(includes("Choose a JPEG, PNG, WebP image or PDF."))
  assert.ok(
    await evaluate(
      "!document.querySelector('.attachment-selection') && [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Upload attachment').disabled",
    ),
  )
  await choose("clear.png")
  await waitFor(`!${includes("Choose a JPEG, PNG, WebP image or PDF.")}`)
  await evaluate(
    "document.querySelector('[aria-label=\"Clear selected attachment\"]').click()",
  )
  assert.ok(await evaluate("!document.querySelector('.attachment-selection')"))
  pass(
    "Invalid replacement clears the previous file; valid selection clears errors and can be removed",
  )
  await choose("certificate.png")
  const beforeAttachmentUpload = count("POST", collection)
  await faults("POST", collection, { delay: 500 })
  await click("Upload attachment")
  await waitFor(includes("Uploading attachment…"))
  await evaluate(
    "document.querySelector('.attachment-upload > button').click()",
  )
  await waitFor(
    "document.querySelector('.attachment-name')?.textContent === 'certificate.png'",
  )
  await waitFor(`!${includes("Loading attachments")}`)
  await faults("POST", collection, null)
  assert.equal(count("POST", collection), beforeAttachmentUpload + 1)
  let image = (await state()).attachments[cert][0]
  assert.equal(image.status, "active")
  assert.equal(image.visibility, "owner_only")
  await waitFor(
    "document.querySelector('.attachment-thumbnail img')?.naturalWidth > 0",
  )
  const imageReads = count("GET", `/api/media/${image.media_asset_id}/content`)
  assert.equal(imageReads, 1)
  await click("Preview", ".attachment-actions button")
  await waitFor("!!document.querySelector('.attachment-preview')")
  assert.ok(
    await evaluate(
      "document.querySelector('.attachment-preview').src.startsWith('blob:')",
    ),
  )
  const urlsBefore = await evaluate("window.__mediaUrls.size")
  await closeModal()
  assert.equal(await evaluate("window.__mediaUrls.size"), urlsBefore)
  assert.equal(
    count("GET", `/api/media/${image.media_asset_id}/content`),
    imageReads,
  )
  await evaluate("document.querySelector('.attachment-thumbnail').click()")
  await waitFor("!!document.querySelector('.attachment-preview')")
  await closeModal()
  await evaluate("document.querySelector('.attachment-name').click()")
  await waitFor("!!document.querySelector('.attachment-preview')")
  await closeModal()
  assert.equal(
    count("GET", `/api/media/${image.media_asset_id}/content`),
    imageReads,
  )
  pass(
    "Image upload prevents duplicates; real thumbnail/name/Preview share one authenticated Blob URL",
  )
  await verifyPrivateMediaRetry(h, {
    attachment: image,
    certificateId: cert,
    closeModal,
    pass,
  })
  const quotaBeforeVisibility = count("GET", `${base}/media/quota`)
  await evaluate(
    "(() => { const el = document.querySelector('.attachment-actions select'); el.value = 'members'; el.dispatchEvent(new Event('change', {bubbles:true})); })()",
  )
  await waitFor(includes("Shared with members"))
  assert.equal((await state()).attachments[cert][0].visibility, "members")
  image = (await state()).attachments[cert][0]
  assert.ok(count("GET", `${base}/media/quota`) > quotaBeforeVisibility)
  pass("Visibility PATCH and mutation refresh list/quota")
  // Keep the shared image on a different certificate: each certificate has one slot.
  const imageCert = "55555555-5555-4555-8555-555555555556"
  const certificateState = await state()
  await control("control", {
    certificates: [{ ...certificateState.certificates[0], certificate_id: imageCert, title: "Shared Image Certificate" }, ...certificateState.certificates],
    attachments: { [imageCert]: [image], [cert]: [] },
  })
  await go("/profile")
  await ready()
  await waitFor(includes("No file attached."))
  await choose("document.pdf", "application/pdf")
  await click("Upload attachment")
  await waitFor(includes("Processing PDF"))
  await waitFor(`!${includes("Loading attachments")}`)
  let pdf = (await state()).attachments[cert][0]
  const row =
    "[...document.querySelectorAll('.attachment-list li')].find(el => el.textContent.includes('document.pdf'))"
  assert.ok(
    await evaluate(
      `${row}.querySelector('select').disabled && ${row}.querySelector('button').disabled`,
    ),
  )
  assert.ok(
    !mediaCalls().some((call) => call.path.includes(pdf.media_asset_id)),
  )
  pass(
    "PDF upload 202 processing cannot download/share and does not fetch binary",
  )
  await h.screenshot("profile-media-attachments-desktop.png")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await evaluate(
    "document.querySelector('.certificate-attachments').scrollIntoView({block:'center'})",
  )
  assert.ok(
    await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
  )
  await h.screenshot("profile-media-attachments-mobile.png")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const binariesBeforePoll = mediaCalls().length
  await attachmentSeed([{ ...pdf, scan_after_reads: 1 }])
  await waitFor(`!${includes("Processing PDF")}`)
  assert.equal(mediaCalls().length, binariesBeforePoll)
  assert.equal((await state()).attachments[cert][0].status, "active")
  // Native viewer receives a valid synthetic PDF; this does not exercise real scanning.
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
  ]
  let pdfText = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdfText))
    pdfText += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdfText)
  pdfText += `xref\n0 4\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  const pdfMedia = {
    type: "application/pdf",
    bytes: Buffer.from(pdfText).toString("base64"),
  }
  await control("control", {
    media: { ...(await state()).media, [pdf.media_asset_id]: pdfMedia },
  })
  const pdfPath = `/api/media/${pdf.media_asset_id}/content`
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor(
    "document.querySelector('.attachment-pdf-frame')?.src.startsWith('blob:')",
  )
  const pdfUrl = await evaluate(
    "document.querySelector('.attachment-pdf-frame').src",
  )
  assert.ok(
    await evaluate(
      "document.querySelector('.attachment-pdf-frame').title.includes('document.pdf')",
    ),
  )
  await h.screenshot("profile-media-pdf-preview.png")
  await closeModal()
  assert.ok(
    await evaluate(`!window.__mediaUrls.has(${JSON.stringify(pdfUrl)})`),
  )
  pass(
    "Active PDF preview uses authenticated content in native iframe and revokes its URL on close",
  )

  // Unsupported browsers keep Download available and do not request a preview binary.
  await evaluate(
    "Object.defineProperty(navigator, 'pdfViewerEnabled', {configurable:true, value:false})",
  )
  const beforeUnsupported = count("GET", pdfPath)
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor(includes("PDF preview is unavailable in this browser."))
  assert.ok(
    await evaluate(
      "!![...document.querySelectorAll('[role=dialog] button')].find(el => el.textContent.trim() === 'Download' && !el.disabled)",
    ),
  )
  assert.equal(count("GET", pdfPath), beforeUnsupported)
  await closeModal()
  await evaluate("delete navigator.pdfViewerEnabled")

  // Reject unexpected content types before they can enter an iframe.
  await control("control", {
    media: {
      ...(await state()).media,
      [pdf.media_asset_id]: { ...pdfMedia, type: "text/html" },
    },
  })
  const beforeInvalidPdf = await evaluate("window.__created")
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor(includes("PDF preview received an unsupported file format"))
  assert.equal(await evaluate("window.__created"), beforeInvalidPdf)
  assert.ok(await evaluate("!document.querySelector('.attachment-pdf-frame')"))
  await control("control", {
    media: { ...(await state()).media, [pdf.media_asset_id]: pdfMedia },
  })
  await click("Retry preview")
  await waitFor("!!document.querySelector('.attachment-pdf-frame')")
  await closeModal()
  pass(
    "PDF unsupported-browser and invalid-MIME fallbacks preserve Download and retry",
  )

  await faults("GET", pdfPath, { status: 403 })
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor(includes("This action is unavailable"))
  assert.ok(await evaluate("!document.querySelector('.attachment-pdf-frame')"))
  await faults("GET", pdfPath, null)
  await click("Retry preview")
  await waitFor("!!document.querySelector('.attachment-pdf-frame')")
  await closeModal()
  await faults("GET", pdfPath, { delay: 900 })
  const beforeCancelled = await evaluate("window.__created")
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor(includes("Loading PDF preview…"))
  await closeModal()
  await delay(1000)
  assert.equal(await evaluate("window.__created"), beforeCancelled)
  await faults("GET", pdfPath, null)
  pass(
    "PDF authorization failures recover via retry; closing an in-flight preview prevents stale Blob URLs",
  )
  const createdBeforeDownload = await evaluate("window.__created")
  await click("Download", "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li button")
  await waitFor(`window.__created > ${createdBeforeDownload}`)
  await delay(1200)
  assert.ok(mediaCalls().some((call) => call.path.includes(pdf.media_asset_id)))
  pass(
    "Polling processing → active enables explicit PDF preview/download without preloading binary",
  )
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor("!!document.querySelector('.attachment-pdf-frame')")
  const oldSessionPdfUrl = await evaluate(
    "document.querySelector('.attachment-pdf-frame').src",
  )
  await evaluate(
    "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-new-account-token'); })()",
  )
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.ok(
    await evaluate(
      `!window.__mediaUrls.has(${JSON.stringify(oldSessionPdfUrl)})`,
    ),
  )
  await evaluate(
    "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-profile-token'); })()",
  )
  await ready()
  pass(
    "Changing sessions closes the active PDF preview and revokes the previous session's PDF URL",
  )
  await waitFor(
    "!!document.querySelector('[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li select')",
  )

  await evaluate(
    "(() => { const el = document.querySelector('[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li select'); el.value = 'members'; el.dispatchEvent(new Event('change', {bubbles:true})); })()",
  )
  await waitFor(
    "document.querySelector('[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-visibility')?.textContent.includes('Shared with members')",
  )
  await go(`/users/${memberId}`)
  await waitFor(includes("document.pdf"))
  assert.ok(
    await evaluate(
      "!document.querySelector('.attachment-actions select, .attachment-delete, .attachment-upload')",
    ),
  )
  await click(
    "Preview",
    "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-actions button",
  )
  await waitFor("!!document.querySelector('.attachment-pdf-frame')")
  await closeModal()
  await go("/profile")
  await ready()
  await waitFor(
    "!!document.querySelector('[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li select:not(:disabled)')",
  )
  await evaluate(
    "(() => { const el = document.querySelector('[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li select'); el.value = 'owner_only'; el.dispatchEvent(new Event('change', {bubbles:true})); })()",
  )
  await waitFor(
    "document.querySelector('[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li .attachment-visibility')?.textContent.includes('Only you')",
  )
  pass(
    "Members can preview shared active PDFs without owner controls; the owner can restore private visibility",
  )

  // Failed thumbnails stay private and expose a recoverable placeholder.
  const imagePath = `/api/media/${image.media_asset_id}/content`
  await faults("GET", imagePath, { status: 404 })
  await go("/profile")
  await ready()
  await waitFor(includes("Retry thumbnail"))
  assert.ok(
    await evaluate("!document.querySelector('.attachment-thumbnail img')"),
  )
  await faults("GET", imagePath, null)
  await click("Retry thumbnail")
  await waitFor(
    "document.querySelector('.attachment-thumbnail img')?.naturalWidth > 0",
  )
  pass(
    "Unavailable private image thumbnails fall back to an icon and recover through explicit retry",
  )

  await attachmentSeed([
    {
      ...pdf,
      status: "processing",
      scan_result: "rejected",
      scan_after_reads: 2,
    },
  ])
  await refreshAttachments()
  await waitFor(includes("Processing PDF"))
  await waitFor(includes("This file was rejected."))
  assert.equal((await state()).attachments[cert][0].status, "rejected")
  pass("Polling processing → rejected keeps file unavailable")

  await attachmentSeed([{ ...pdf, status: "processing" }])
  await refreshAttachments()
  await faults("GET", collection, { delay: 700 })
  await delay(11_600)
  const polls = calls.filter(
    (call) =>
      call.method === "GET" &&
      call.path === collection &&
      call.finished &&
      !call.aborted &&
      call.started > Date.now() - 11_600,
  )
  assert.ok(polls.length >= 2)
  assert.ok(
    polls.every(
      (call, index) => !index || call.started >= polls[index - 1].finished,
    ),
    JSON.stringify(
      polls.map(({ started, finished }) => ({ started, finished })),
    ),
  )
  pass("Five-second metadata polling never overlaps delayed requests")
  await faults("GET", collection, null)
  await evaluate(
    "Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))",
  )
  const pausedCount = count("GET", collection)
  await delay(5400)
  assert.equal(count("GET", collection), pausedCount)
  await evaluate(
    "window.__realNow = Date.now; Date.now = () => window.__realNow() + 121000; Object.defineProperty(document, 'hidden', {configurable:true, value:false}); document.dispatchEvent(new Event('visibilitychange'))",
  )
  await waitFor(includes("Automatic checking paused after two minutes"))
  assert.equal((await state()).attachments[cert][0].status, "processing")
  await evaluate("Date.now = window.__realNow")
  pass(
    "Hidden tab pauses polling; two-minute deadline preserves server processing status",
  )
  await faults("GET", collection, { status: 429 })
  await refreshAttachments()
  await waitFor(includes("Too many requests"))
  const stopped = count("GET", collection)
  await delay(5400)
  assert.equal(count("GET", collection), stopped)
  await faults("GET", collection, null)
  await refreshAttachments()
  pass("429 stops automatic polling until manual check")

  await go(`/users/${memberId}`)
  await waitFor(includes("certificate.png"))
  assert.ok(!(await evaluate(includes("document.pdf"))))
  assert.ok(
    !(await evaluate(
      "!!document.querySelector('main input[type=file], main .attachment-actions select')",
    )),
  )
  assert.ok(!(await evaluate(includes("Edit avatar"))))
  assert.ok(
    calls.some(
      (call) =>
        call.path ===
        `/api/users/${memberId}/profile/certificates/${cert}/attachments`,
    ),
  )
  pass(
    "Member endpoint returns shared active files and member view has no write controls",
  )
  await waitFor(
    "document.querySelector('.attachment-thumbnail img')?.naturalWidth > 0",
  )
  await click("Preview", ".attachment-actions button")
  await waitFor("!!document.querySelector('.attachment-preview')")
  await closeModal()
  assert.ok(
    !mediaCalls().some(
      (call) =>
        call.path === pdfPath &&
        call.started >
          calls.findLast(
            (call) =>
              call.path ===
              `/api/users/${memberId}/profile/certificates/${cert}/attachments`,
          ).started,
    ),
  )
  pass(
    "Members can preview shared images; private PDFs are absent and never fetched in the member view",
  )

  await go("/profile")
  await ready()
  for (const status of ["active", "pending_upload", "processing", "rejected"]) {
    await attachmentSeed([{ ...pdf, status }])
    await refreshAttachments()
    assert.ok(await evaluate(`!document.querySelector('[data-certificate-id="${cert}"] .attachment-upload input')`))
  }
  pass("One linked active/pending_upload/processing/rejected file hides second-file selection")
  await click("Delete file", `[data-certificate-id="${cert}"] button`)
  await click("Confirm delete attachment")
  await waitFor("!document.querySelector('[role=dialog]')")
  await waitFor(`!!document.querySelector('[data-certificate-id="${cert}"] .attachment-upload input:not(:disabled)')`)
  // PNG/JPEG/WebP retain the same upload semantics and produce real thumbnails.
  for (const [name, type] of [
    ["certificate.jpg", "image/jpeg"],
    ["certificate.webp", "image/webp"],
  ]) {
    await choose(name, type)
    await click("Upload attachment")
    await waitFor(
      `[...document.querySelectorAll('.attachment-name')].some(el => el.textContent === ${JSON.stringify(name)})`,
    )
    await waitFor(`!${includes("Loading attachments")}`)
    await waitFor(
      "[...document.querySelectorAll('.attachment-thumbnail img')].every(img => img.naturalWidth > 0)",
    )
    await click("Delete file", "[data-certificate-id=\"55555555-5555-4555-8555-555555555555\"] .attachment-list li button")
    await click("Confirm delete attachment")
    await waitFor("!document.querySelector('[role=dialog]')")
    await waitFor(`!${includes(name)}`)
  }
  pass(
    "JPEG and WebP upload and thumbnail paths preserve explicit upload and confirmation deletion",
  )
  await choose("too-big.pdf", "application/pdf", 10_000_001)
  await waitFor(includes("File must be 10 MB or smaller."))
  await choose("bad.txt", "text/plain")
  await waitFor(includes("Choose a JPEG, PNG, WebP image or PDF."))
  await control("control", {
    quota: {
      quota_bytes: 200_000_000,
      used_bytes: 199_999_999,
      reserved_bytes: 0,
      available_bytes: 1,
    },
  })
  await click("Refresh quota")
  await waitFor(includes("200 MB"))
  await choose("quota.pdf", "application/pdf")
  await waitFor(includes("Not enough available storage"))
  assert.ok(
    await evaluate(
      "[...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Upload attachment').disabled",
    ),
  )
  await control("control", { quota: null })
  await click("Refresh quota")
  pass("Attachment size/type/count/quota UX limits use decimal MB")
  for (const [status, message] of [
    [400, "Check the file"],
    [403, "This action is unavailable"],
    [404, "This media is unavailable"],
    [409, "The media changed"],
    [413, "The file is too large"],
    [415, "This file format is unsupported"],
    [429, "Too many requests"],
    [500, "Media could not be updated"],
  ]) {
    await faults("POST", collection, { status })
    await click("Upload attachment")
    await waitFor(includes(message))
    await waitFor(`!${includes("Loading attachments")}`)
    assert.ok(await evaluate(includes("Selected: quota.pdf")))
    assert.ok(
      await evaluate("localStorage.getItem('tindy_access_token') !== null"),
    )
  }
  await faults("POST", collection, null)
  await send("Network.enable")
  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await click("Upload attachment")
  await waitFor(includes("Could not reach the media service"))
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await refreshAttachments()
  pass(
    "400/403/404/409/413/415/429/5xx/network preserve file and session for retry",
  )
  await click("Upload attachment")
  await waitFor(includes("Processing PDF"))
  await waitFor(`!${includes("Loading attachments")}`)
  await click("Delete file", `[data-certificate-id="${cert}"] button`)
  await click("Confirm delete attachment")
  await waitFor(includes("No file attached."))
  assert.equal((await state()).attachments[cert].length, 0)
  pass("Attachment confirmation DELETE 204 refreshes quota and list")
  await choose("processing.pdf", "application/pdf")
  await click("Upload attachment")
  await waitFor(includes("Processing PDF"))
  await evaluate(
    "document.querySelector('[aria-label=\"Delete Media Certificate\"]').click()",
  )
  await click("Confirm delete")
  await waitFor(`!document.querySelector('[data-certificate-id="${cert}"]')`)
  const deletedCount = count("GET", collection)
  await delay(5400)
  assert.equal(count("GET", collection), deletedCount)
  assert.equal((await state()).attachments[cert], undefined)
  await evaluate("document.querySelector('[aria-label=\"Delete Shared Image Certificate\"]').click()")
  await click("Confirm delete")
  await waitFor(includes("No certificates yet"))
  pass("Certificate DELETE with attachments removes state and stops polling")

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  assert.ok(
    await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
  )
  await h.screenshot("profile-media-mobile.png")
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await h.screenshot("profile-media-desktop.png")
  pass("Media controls fit mobile viewport")

  // Real client stale-session path, using a delayed HTTP 401 and the app's token setter.
  await faults("GET", `/api/media/${activeAvatar}/content`, {
    delay: 800,
    status: 401,
  })
  await go("/profile")
  await ready()
  await evaluate(
    "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-new-account-token'); window.__mediaNewSession = true; })()",
  )
  await waitFor("window.__mediaNewSession === true")
  await delay(1000)
  assert.equal(
    await evaluate("localStorage.getItem('tindy_access_token')"),
    "synthetic-new-account-token",
  )
  assert.equal(await evaluate("window.__mediaUrls.size"), 0)
  pass(
    "Session switch aborts old binary read/401 and clears all Object URLs without clearing the new token",
  )
  await faults("GET", `/api/media/${activeAvatar}/content`, null)
  await go("/profile")
  await ready()
  await waitFor("window.__mediaUrls.size > 0")
  await faults("POST", `${base}/avatar`, { delay: 1000 })
  await click("Edit avatar")
  await choose("unmount.png")
  await click("Upload avatar")
  await evaluate("document.querySelector('a[href=\"/settings\"]').click()")
  await waitFor("location.pathname === '/settings'")
  await delay(1200)
  assert.ok(!(await evaluate(includes("Profile media updated"))))
  await faults("POST", `${base}/avatar`, null)
  const committedAvatar = (await state()).profile.avatar_media_asset_id
  await evaluate("document.querySelector('.topbar-user').click()")
  await ready()
  for (
    let attempt = 0;
    attempt < 100 &&
    !mediaCalls().some((call) => call.path.includes(committedAvatar));
    attempt++
  )
    await delay(50)
  assert.ok(mediaCalls().some((call) => call.path.includes(committedAvatar)))
  pass(
    "Returning to Profile refetches media after an upload was aborted during navigation",
  )
  await faults("GET", `/api/media/${committedAvatar}/content`, { delay: 1_000 })
  const beforeLogoutRead = count("GET", `/api/media/${committedAvatar}/content`)
  await go("/settings")
  for (
    let attempt = 0;
    attempt < 100 &&
    count("GET", `/api/media/${committedAvatar}/content`) === beforeLogoutRead;
    attempt++
  )
    await delay(25)
  assert.ok(
    count("GET", `/api/media/${committedAvatar}/content`) > beforeLogoutRead,
  )
  await click("Sign out")
  await waitFor("location.pathname === '/login'")
  await delay(1_100)
  assert.equal(await evaluate("window.__mediaUrls.size"), 0)
  await faults("GET", `/api/media/${committedAvatar}/content`, null)
  pass(
    "Unmount cancels mutation UI updates; logout releases mounted Header media URLs",
  )
  await evaluate(
    "localStorage.setItem('tindy_access_token', 'synthetic-profile-token')",
  )
  await go("/profile")
  await ready()
  const finalAvatar = (await state()).profile.avatar_media_asset_id
  await faults("GET", `/api/media/${finalAvatar}/content`, { status: 401 })
  await go("/profile")
  await waitFor("location.pathname === '/login'")
  assert.equal(
    await evaluate("localStorage.getItem('tindy_access_token')"),
    null,
  )
  pass("Current-session binary 401 follows the shared session-expired flow")
  assert.ok(
    mediaCalls().every((call) =>
      [
        "Bearer synthetic-profile-token",
        "Bearer synthetic-new-account-token",
      ].includes(call.authorization),
    ),
  )
  assert.equal(h.exceptions.length, 0, JSON.stringify(h.exceptions))
  assert.ok(h.log().includes('"request"'))
  const events = h
    .log()
    .split(/\r?\n/)
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line))
    .filter((event) => event.event === "request")
  assert.ok(
    [200, 201, 202, 204, 400, 401, 403, 404, 409, 413, 415, 429, 500].every(
      (code) => events.some((event) => event.statusCode === code),
    ),
  )
  assert.ok(
    !events.some(
      (event) => event.statusCode === 501 && event.path.startsWith("/api/"),
    ),
  )
  pass(
    "Simulation logs prove multipart/binary/status paths and Bearer use without unsupported APIs or browser exceptions",
  )
  console.log(
    `Profile Media: ${checks} checks passed; ${calls.length} HTTP calls. Mock/simulation only; no live backend or antivirus.`,
  )
} finally {
  await h.close()
}
