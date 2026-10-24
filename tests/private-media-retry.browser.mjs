import assert from "node:assert/strict"
import { delay } from "./profile-media-harness.mjs"

export default async function verifyPrivateMediaRetry(
  h,
  { attachment, certificateId, closeModal, pass },
) {
  const { evaluate, waitFor, click, control, calls, go } = h
  const path = `/api/media/${attachment.media_asset_id}/content`
  const count = () =>
    calls.filter((call) => call.method === "GET" && call.path === path).length
  const thumbnailUrl = await evaluate(
    "document.querySelector('.attachment-thumbnail img').src",
  )
  const unrelatedUrl = await evaluate(
    "document.querySelector('.profile-avatar-wrap img').src",
  )
  const originalUrls = await evaluate("window.__mediaUrls.size")
  const unrelatedReads = () =>
    calls.filter(
      (call) =>
        call.method === "GET" &&
        call.path.startsWith("/api/media/") &&
        call.path !== path,
    ).length
  const unrelatedBefore = unrelatedReads()
  const originalMedia = (await control("state")).media
  const fault = (value) =>
    control("control", { faults: value ? { [`GET ${path}`]: value } : {} })
  const previewUrl = () =>
    evaluate("document.querySelector('.attachment-preview').src")
  const retained = (url) =>
    evaluate(`window.__mediaUrls.has(${JSON.stringify(url)})`)
  const loading = () =>
    waitFor(
      "document.querySelector('.attachment-preview-body')?.getAttribute('aria-busy') === 'true' && !document.querySelector('.attachment-preview') && !document.querySelector('.attachment-preview-body [role=alert]')",
    )
  const ready = () =>
    waitFor(
      "document.querySelector('.attachment-thumbnail img')?.naturalWidth > 0 && !document.body.innerText.includes('Loading attachments')",
    )
  const failPreview = async () => {
    // A real browser decoding failure reaches the img's onError handler, while
    // the thumbnail continues to retain and render the shared Blob URL.
    await evaluate(
      "document.querySelector('.attachment-preview').src = 'data:image/png;base64,AA=='",
    )
    await waitFor(
      "!![...document.querySelectorAll('[role=dialog] button')].find(el => el.textContent.trim() === 'Retry image')",
    )
  }
  const imageReady = () =>
    waitFor("document.querySelector('.attachment-preview')?.naturalWidth > 0")
  await click("Preview", ".attachment-actions button")
  await imageReady()
  assert.equal(
    await evaluate("document.querySelector('.attachment-preview').src"),
    thumbnailUrl,
  )
  const before = count()
  await failPreview()
  await click("Retry image")
  await imageReady()
  assert.equal(
    count(),
    before + 1,
    "M-01: Retry must fetch fresh private content while the thumbnail retains the old cache entry",
  )
  assert.notEqual(
    await evaluate("document.querySelector('.attachment-preview').src"),
    thumbnailUrl,
  )
  assert.ok(
    await evaluate(
      `window.__mediaUrls.has(${JSON.stringify(thumbnailUrl)}) && document.querySelector('.attachment-thumbnail img').naturalWidth > 0`,
    ),
  )
  assert.equal(
    await evaluate("document.querySelector('.profile-avatar-wrap img').src"),
    unrelatedUrl,
  )
  assert.ok(await retained(unrelatedUrl))
  assert.equal(unrelatedReads(), unrelatedBefore)
  const refreshed = await previewUrl()
  await closeModal()
  assert.ok(!(await retained(refreshed)))
  assert.equal(await evaluate("window.__mediaUrls.size"), originalUrls)
  pass(
    "M-01: a real preview decoding error retries over authenticated HTTP without revoking the mounted thumbnail or unrelated avatar",
  )

  await click("Preview", ".attachment-actions button")
  await imageReady()
  for (let attempt = 0; attempt < 3; attempt++) {
    const oldUrl = await previewUrl()
    await failPreview()
    await fault({ delay: 400 })
    const reads = count()
    await evaluate(
      "(() => { const button = [...document.querySelectorAll('[role=dialog] button')].find(el => el.textContent.trim() === 'Retry image'); button.click(); button.click(); })()",
    )
    await loading()
    assert.ok(
      await evaluate(
        "![...document.querySelectorAll('[role=dialog] button')].some(el => el.textContent.trim() === 'Retry image' && !el.disabled)",
      ),
    )
    await imageReady()
    assert.equal(count(), reads + 1)
    assert.ok(!(await retained(oldUrl)))
    assert.ok(await retained(thumbnailUrl))
    assert.equal(await evaluate("window.__mediaUrls.size"), originalUrls + 1)
    await fault(null)
  }
  pass(
    "M-01: repeated/double-click Retry makes one request per attempt, clears the error while loading and releases superseded preview URLs",
  )

  for (const [status, message] of [
    [403, "This action is unavailable"],
    [404, "This media is unavailable"],
  ]) {
    await failPreview()
    await fault({ status })
    const reads = count()
    await click("Retry image")
    await waitFor(
      `document.querySelector('.attachment-preview-body [role=alert]')?.textContent.includes(${JSON.stringify(message)})`,
    )
    await delay(350)
    assert.equal(count(), reads + 1)
    assert.ok(await retained(thumbnailUrl))
    assert.equal(await evaluate("window.__mediaUrls.size"), originalUrls)
    await fault(null)
    await click("Retry image")
    await imageReady()
  }
  // Also return genuinely undecodable image bytes through the authenticated API.
  await failPreview()
  await control("control", {
    media: {
      ...originalMedia,
      [attachment.media_asset_id]: { type: "image/png", bytes: "AA==" },
    },
  })
  const beforeBadImage = count()
  await click("Retry image")
  await waitFor(
    "document.querySelector('.attachment-preview-body [role=alert]')?.textContent.includes('This image could not be displayed')",
  )
  await delay(350)
  assert.equal(count(), beforeBadImage + 1)
  await control("control", { media: originalMedia })
  await click("Retry image")
  await imageReady()
  pass(
    "M-01: HTTP 403/404 and real corrupt image responses remain visible without automatic retry loops; explicit retry recovers",
  )

  await failPreview()
  await fault({ delay: 800 })
  await click("Retry image")
  await loading()
  await closeModal()
  const createdAtClose = await evaluate("window.__created")
  await delay(1000)
  assert.equal(await evaluate("window.__created"), createdAtClose)
  assert.equal(await evaluate("window.__mediaUrls.size"), originalUrls)
  assert.ok(await retained(thumbnailUrl))
  assert.ok(await retained(unrelatedUrl))
  assert.equal(unrelatedReads(), unrelatedBefore)
  await fault(null)
  pass(
    "M-01: closing Preview during Retry aborts its unowned request and prevents a late response from creating a Blob URL",
  )

  // A metadata refresh can change the media ID without removing the attachment.
  await click("Preview", ".attachment-actions button")
  await imageReady()
  await failPreview()
  await fault({ delay: 800 })
  await click("Retry image")
  await loading()
  const replacementId = "88888888-8888-4888-8888-888888888888"
  const snapshot = await control("state")
  const replaceMediaId = async (id) => {
    const beforeUrl = await evaluate(
      "document.querySelector('.attachment-preview')?.src ?? null",
    )
    await control("control", {
      attachments: {
        ...snapshot.attachments,
        [certificateId]: snapshot.attachments[certificateId].map((item) =>
          item.attachment_id === attachment.attachment_id
            ? { ...item, media_asset_id: id }
            : item,
        ),
      },
      media: {
        ...originalMedia,
        [replacementId]: originalMedia[attachment.media_asset_id],
      },
    })
    await evaluate(
      "[...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Check attachments again').click()",
    )
    await waitFor(
      `document.querySelector('.attachment-preview')?.src && document.querySelector('.attachment-preview').src !== ${JSON.stringify(beforeUrl)}`,
    )
    await imageReady()
    await ready()
  }
  await replaceMediaId(replacementId)
  const replacementUrl = await previewUrl()
  assert.equal(
    await evaluate("document.querySelector('.attachment-thumbnail img').src"),
    replacementUrl,
  )
  await delay(1000)
  assert.equal(await previewUrl(), replacementUrl)
  assert.ok(!(await retained(thumbnailUrl)))
  assert.equal(
    calls.filter(
      (call) =>
        call.method === "GET" &&
        call.path === `/api/media/${replacementId}/content`,
    ).length,
    1,
  )
  await fault(null)
  await replaceMediaId(attachment.media_asset_id)
  await closeModal()
  await control("control", { media: originalMedia })
  pass(
    "M-01: changing media ID during Retry releases the old generations, shares the new request and ignores the late old response",
  )

  // Both card/file thumbnails and Preview share the restored media ID and URL.
  await click("Preview", ".attachment-actions button")
  await imageReady()
  const shared = await previewUrl()
  assert.equal(
    await evaluate("document.querySelector('.attachment-thumbnail img').src"),
    shared,
  )
  await failPreview()
  await evaluate(
    "document.querySelectorAll('.attachment-thumbnail img').forEach(img => { img.src = 'data:image/png;base64,AA==' })",
  )
  await waitFor("document.querySelectorAll('.attachment-thumbnail-retry').length === document.querySelectorAll('.attachment-thumbnail').length")
  await fault({ delay: 400 })
  const beforeBoth = count()
  await evaluate(
    "document.querySelectorAll('.attachment-thumbnail-retry').forEach(button => button.click()); [...document.querySelectorAll('[role=dialog] button')].find(el => el.textContent.trim() === 'Retry image').click()",
  )
  await imageReady()
  await ready()
  await waitFor("[...document.querySelectorAll('.attachment-thumbnail img')].every(img => img.naturalWidth > 0 && img.src === document.querySelector('.attachment-preview').src)")
  assert.equal(count(), beforeBoth + 1)
  assert.equal(
    await evaluate("document.querySelector('.attachment-thumbnail img').src"),
    await previewUrl(),
  )
  assert.ok(!(await retained(shared)))
  await fault(null)
  await closeModal()
  pass(
    "M-01: simultaneous Thumbnail/Preview retries of one generation join one fresh authenticated request",
  )

  await click("Preview", ".attachment-actions button")
  await imageReady()
  await failPreview()
  await click("Retry image")
  await imageReady()
  // Retired thumbnail and refreshed preview generations must both be cleared,
  // including when an old in-flight HTTP 401 arrives after the session changes.
  const previousUrls = await evaluate("[...window.__mediaUrls]")
  await failPreview()
  await fault({ delay: 800, status: 401 })
  await click("Retry image")
  await loading()
  // The mock captures this fault when the old request starts. Remove it before
  // switching so new-session requests do not also receive a deliberate 401.
  await delay(100)
  await fault(null)
  await evaluate(
    "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-new-account-token'); })()",
  )
  await waitFor("!document.querySelector('[role=dialog]')")
  await delay(1000)
  for (const url of previousUrls) assert.ok(!(await retained(url)))
  assert.equal(
    await evaluate("localStorage.getItem('tindy_access_token')"),
    "synthetic-new-account-token",
  )
  await fault(null)
  await evaluate(
    "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-profile-token'); })()",
  )
  await go("/profile")
  await ready()
  pass(
    "M-01: session changes clear current and retired URLs and abort an old Retry/401 without expiring the new session",
  )

  await click("Preview", ".attachment-actions button")
  await imageReady()
  await failPreview()
  await fault({ status: 401 })
  await click("Retry image")
  await waitFor("location.pathname === '/login'")
  assert.equal(await evaluate("window.__mediaUrls.size"), 0)
  await fault(null)
  await evaluate(
    "localStorage.setItem('tindy_access_token', 'synthetic-profile-token')",
  )
  await go("/profile")
  await ready()
  assert.ok(
    calls
      .filter((call) => call.method === "GET" && call.path === path)
      .every((call) =>
        [
          "Bearer synthetic-profile-token",
          "Bearer synthetic-new-account-token",
        ].includes(call.authorization),
      ),
  )
  pass(
    "M-01: a current-session Retry/401 follows the existing sign-in flow and releases every private URL",
  )
}
