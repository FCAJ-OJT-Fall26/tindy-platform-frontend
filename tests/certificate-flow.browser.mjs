import assert from "node:assert/strict"
import { delay } from "./profile-media-harness.mjs"
// Real frontend/fetch over the existing local Postman simulation. Synthetic files only.
export default async function verifyCertificateFlow(
  h,
  { pass, choose, closeModal },
) {
  const { evaluate, input, waitFor, click, control, calls, go } = h
  const base = "/api/me/profile/certificates"
  const original = await control("state")
  const state = () => control("state")
  const count = (method, path) =>
    calls.filter((c) => c.method === method && c.path === path).length
  const collection = (id) => `${base}/${id}/attachments`
  const selector = (id) => `[data-certificate-id="${id}"]`
  const hasText = (text) =>
    `document.body.innerText.includes(${JSON.stringify(text)})`
  const item = async (title) =>
    (await state()).certificates.find((c) => c.title === title)
  const open = async (title, description = "") => {
    await click("Add certificate")
    await input("title", title)
    await input("issuer", " Learning Institute ")
    if (description) await input("description", description)
  }
  const edit = async (title) => {
    await evaluate(
      `document.querySelector(${JSON.stringify(`[aria-label="Edit ${title}"]`)}).click()`,
    )
    await waitFor(
      "!!document.querySelector('[role=dialog] textarea[name=description]')",
    )
  }
  const saved = () => waitFor("!document.querySelector('[role=dialog]')")
  const readyFile = (id) =>
    waitFor(
      `!document.querySelector(${JSON.stringify(selector(id))}).innerText.includes('Loading attachments')`,
    )
  try {
    const certificateImage = await evaluate(`(() => {
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 640;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, 960, 640);
      ctx.strokeStyle = '#b9cbbc'; ctx.lineWidth = 12; ctx.strokeRect(24, 24, 912, 592);
      ctx.strokeStyle = '#dce5dc'; ctx.lineWidth = 2; ctx.strokeRect(42, 42, 876, 556);
      ctx.textAlign = 'center'; ctx.fillStyle = '#50645d'; ctx.font = '22px Georgia';
      ctx.fillText('LEARNING INSTITUTE', 480, 135); ctx.font = 'bold 50px Georgia';
      ctx.fillText('CERTIFICATE', 480, 245); ctx.font = 'italic 30px Georgia';
      ctx.fillText('Cloud Foundations', 480, 315); ctx.fillStyle = '#7b8b83'; ctx.font = '18px Arial';
      ctx.fillText('Foundational knowledge of cloud services', 480, 390);
      ctx.beginPath(); ctx.arc(480, 465, 27, 0, 2 * Math.PI); ctx.fillStyle = '#c5a970'; ctx.fill();
      ctx.fillStyle = '#718078'; ctx.font = '13px Arial'; ctx.fillText('SYNTHETIC TEST DOCUMENT', 480, 555);
      return canvas.toDataURL('image/png').split(',')[1];
    })()`)
    await control("control", { certificate_image_bytes: certificateImage })
    await open("Minimal certificate")
    assert.equal(
      await evaluate(
        "document.querySelectorAll('[role=dialog] input[name=credential_id], [role=dialog] input[name=issued_at], [role=dialog] input[name=expires_at]').length",
      ),
      0,
    )
    assert.equal(
      await evaluate(
        "document.querySelector('[role=dialog] textarea[name=description]').maxLength",
      ),
      2000,
    )
    await click("Save certificate")
    await saved()
    const minimal = await item("Minimal certificate")
    const minimalPost = calls.findLast(
      (c) => c.method === "POST" && c.path === base,
    )
    assert.deepEqual(minimalPost.body, {
      title: "Minimal certificate",
      issuer: "Learning Institute",
      description: null,
      credential_url: null,
    })
    await readyFile(minimal.certificate_id)
    assert.ok(
      await evaluate(
        `!!document.querySelector(${JSON.stringify(`${selector(minimal.certificate_id)} > .certificate-placeholder[aria-label="No certificate file"]`)})`,
      ),
    )
    assert.equal(count("POST", collection(minimal.certificate_id)), 0)
    pass(
      "Title/Issuer-only create sends four metadata fields, no file, and shows the card's Award placeholder",
    )
    await open("Input validation")
    const beforeInvalid = count("POST", base)
    for (const [field, value, message] of [
      ["title", "x".repeat(256), "Use at most 255 characters."],
      ["issuer", " ", "This field is required."],
      ["description", "x".repeat(2001), "Use at most 2000 characters."],
      [
        "credential_url",
        "ftp://example.com",
        "Enter a full http:// or https:// URL",
      ],
    ]) {
      await input(field, value)
      await click("Save certificate")
      await waitFor(hasText(message))
      assert.equal(count("POST", base), beforeInvalid)
      await input(
        field,
        field === "title"
          ? "Input validation"
          : field === "issuer"
            ? "Institute"
            : "",
      )
    }
    await choose("oversize.pdf", "application/pdf", 10_000_001)
    await waitFor(hasText("File must be 10 MB or smaller."))
    await choose("invalid.svg", "image/svg+xml")
    await waitFor(hasText("Choose a JPEG, PNG, WebP image or PDF."))
    await closeModal()
    pass(
      "Form validates required fields, lengths, HTTP/HTTPS URL and decimal 10 MB file/type limits",
    )
    const unsafeDescription =
      '<img src=x onerror="window.__certificateInjected=true">\nFoundational AWS knowledge.'
    await open("Image certificate", ` ${unsafeDescription} `)
    await input("credential_url", " https://example.com/credential ")
    await choose("new-certificate.png")
    const beforeImage = count("POST", base)
    await control("control", { faults: { [`POST ${base}`]: { delay: 250 } } })
    await click("Save certificate")
    await evaluate(
      "document.querySelector('form.certificate-editor').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}))",
    )
    await saved()
    await control("control", { faults: {} })
    const image = await item("Image certificate")
    assert.equal(count("POST", base), beforeImage + 1)
    const imageUpload = calls.find(
      (c) => c.method === "POST" && c.path === collection(image.certificate_id),
    )
    assert.ok(imageUpload.type.includes("multipart/form-data; boundary="))
    assert.ok(
      imageUpload.multipart.includes(
        'name="file"; filename="new-certificate.png"',
      ),
    )
    assert.ok(
      imageUpload.started >=
        calls.findLast((c) => c.method === "POST" && c.path === base).finished,
    )
    await waitFor(
      `document.querySelector(${JSON.stringify(`${selector(image.certificate_id)} > .attachment-thumbnail-wrap img`)})?.naturalWidth > 0`,
    )
    assert.equal(
      await evaluate(
        `document.querySelector(${JSON.stringify(`${selector(image.certificate_id)} .certificate-description`)}).innerText`,
      ),
      unsafeDescription,
    )
    assert.ok(await evaluate("!window.__certificateInjected"))
    assert.equal(
      await evaluate(
        `document.querySelectorAll(${JSON.stringify(`${selector(image.certificate_id)} .certificate-description img`)}).length`,
      ),
      0,
    )
    assert.equal(image.credential_url, "https://example.com/credential")
    pass(
      "Create→multipart image upload runs in order once; actual thumbnail sits on the card and description is safe text",
    )
    const attachment = (await state()).attachments[image.certificate_id][0]
    const mediaPath = `/api/media/${attachment.media_asset_id}/content`
    const binaryReads = count("GET", mediaPath)
    const deletes = count(
      "DELETE",
      `${collection(image.certificate_id)}/${attachment.attachment_id}`,
    )
    await edit("Image certificate")
    await waitFor(
      "!!document.querySelector('[role=dialog] .attachment-name') && !document.querySelector('[role=dialog]').innerText.includes('Loading attachments')",
    )
    assert.ok(
      await evaluate(
        "!document.querySelector('[role=dialog] input[type=file]')",
      ),
    )
    await click("Preview", "[role=dialog] .attachment-actions button")
    await waitFor(
      "document.querySelectorAll('[role=dialog]').length === 2 && !!document.querySelector('.attachment-preview')",
    )
    assert.equal(count("GET", mediaPath), binaryReads)
    await evaluate(
      'document.querySelector(\'[role=dialog][aria-label^="Preview:"] [aria-label="Close dialog"]\').click()',
    )
    await waitFor("document.querySelectorAll('[role=dialog]').length === 1")
    await input("description", "Updated certificate description")
    await click("Save certificate")
    await saved()
    assert.equal(
      (await state()).attachments[image.certificate_id][0].attachment_id,
      attachment.attachment_id,
    )
    assert.equal(
      count(
        "DELETE",
        `${collection(image.certificate_id)}/${attachment.attachment_id}`,
      ),
      deletes,
    )
    assert.equal(count("POST", collection(image.certificate_id)), 1)
    assert.equal(
      calls.findLast(
        (c) =>
          c.method === "PUT" && c.path === `${base}/${image.certificate_id}`,
      ).body.description,
      "Updated certificate description",
    )
    pass(
      "Edit shows the linked file, hides replacement, previews without duplicate binary fetch and preserves the file after metadata PUT",
    )
    await control("control", { attachment_upload_failure: { status: 503 } })
    await open("Retry certificate", "Saved before file")
    await choose("retry-certificate.png")
    const beforeRetryCreate = count("POST", base)
    await click("Save certificate")
    await waitFor(
      hasText("Certificate saved, but the file upload did not complete."),
    )
    await waitFor(hasText("Selected: retry-certificate.png"))
    const retry = await item("Retry certificate")
    assert.ok(retry)
    assert.equal(count("POST", base), beforeRetryCreate + 1)
    assert.ok(
      await evaluate(
        `!!document.querySelector(${JSON.stringify(selector(retry.certificate_id))})`,
      ),
    )
    await control("control", { attachment_upload_failure: null })
    await input("description", "Updated during retry")
    await click("Retry file upload")
    await saved()
    assert.equal(count("POST", base), beforeRetryCreate + 1)
    assert.equal(count("POST", collection(retry.certificate_id)), 2)
    assert.equal(count("PUT", `${base}/${retry.certificate_id}`), 1)
    assert.equal((await state()).attachments[retry.certificate_id].length, 1)
    assert.equal(
      (await state()).certificates.filter(
        (c) => c.title === "Retry certificate",
      ).length,
      1,
    )
    pass(
      "Partial upload failure keeps the saved ID/file/list; retry PUTs edits and uploads to the same ID without a second certificate POST",
    )
    await control("control", {
      attachment_upload_failure: { status: 503, after_commit: true },
    })
    await open("Committed file response lost")
    await choose("committed.png")
    await click("Save certificate")
    await waitFor(
      hasText("Certificate saved, but the file upload did not complete."),
    )
    const committed = await item("Committed file response lost")
    await waitFor(
      "!!document.querySelector('[role=dialog] .attachment-name') && !document.querySelector('[role=dialog] input[type=file]')",
    )
    await control("control", { attachment_upload_failure: null })
    await click("Save certificate")
    await saved()
    assert.equal(count("POST", collection(committed.certificate_id)), 1)
    assert.equal(
      (await state()).attachments[committed.certificate_id].length,
      1,
    )
    pass(
      "Lost upload response reconciles the existing slot and never silently replaces or uploads a second file",
    )
    await control("control", { attachment_upload_failure: { status: 500 } })
    await open("Cancelled file certificate")
    await choose("cancelled.png")
    await click("Save certificate")
    await waitFor(
      hasText("Certificate saved, but the file upload did not complete."),
    )
    const cancelled = await item("Cancelled file certificate")
    await control("control", {
      attachment_upload_failure: null,
      faults: {
        [`POST ${collection(cancelled.certificate_id)}`]: { delay: 1000 },
      },
    })
    await click("Retry file upload")
    await waitFor(
      `!![...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Cancel upload')`,
    )
    await click("Cancel upload", "[role=dialog] button")
    await waitFor(
      hasText("Certificate saved, but the file upload did not complete."),
    )
    await waitFor(hasText("Selected: cancelled.png"))
    await delay(1200)
    await control("control", { faults: {} })
    await click("Retry file upload")
    await waitFor(
      "!!document.querySelector('[role=dialog] .attachment-name') && !document.querySelector('[role=dialog] input[type=file]')",
    )
    await click("Save certificate")
    await saved()
    assert.equal(count("POST", collection(cancelled.certificate_id)), 2)
    assert.equal(
      (await state()).certificates.filter((c) => c.title === cancelled.title)
        .length,
      1,
    )
    pass(
      "Cancel upload preserves metadata/selection; retry checks a late server commit before attempting another multipart request",
    )
    await open("PDF certificate")
    await choose("new-certificate.pdf", "application/pdf")
    await click("Save certificate")
    await saved()
    const pdf = await item("PDF certificate")
    await readyFile(pdf.certificate_id)
    const pdfFile = (await state()).attachments[pdf.certificate_id][0]
    assert.equal(pdfFile.status, "processing")
    assert.ok(
      await evaluate(
        `document.querySelector(${JSON.stringify(`${selector(pdf.certificate_id)} > .attachment-thumbnail-wrap button`)}).disabled`,
      ),
    )
    assert.ok(
      await evaluate(
        `[...document.querySelectorAll(${JSON.stringify(`${selector(pdf.certificate_id)} .attachment-actions button`)} )].filter(b => /Preview|Download/.test(b.textContent)).every(b => b.disabled)`,
      ),
    )
    assert.equal(
      count("GET", `/api/media/${pdfFile.media_asset_id}/content`),
      0,
    )
    assert.ok(
      await evaluate(
        `!document.querySelector(${JSON.stringify(`${selector(pdf.certificate_id)} input[type=file]`)})`,
      ),
    )
    pass(
      "Create with PDF shows its card placeholder/Processing badge, disables Preview/Download and blocks a second file",
    )
    await edit("Minimal certificate")
    await waitFor(
      "!!document.querySelector('[role=dialog] input[type=file]:not(:disabled)')",
    )
    await choose("later.png")
    await click("Save certificate")
    await saved()
    assert.equal(count("POST", collection(minimal.certificate_id)), 1)
    assert.equal(
      (await state()).certificates.filter((c) => c.title === minimal.title)
        .length,
      1,
    )
    pass(
      "Editing a certificate without a file can attach its first file without creating another certificate",
    )
    await control("control", { attachment_upload_failure: { status: 503 } })
    await open("Session change certificate")
    await choose("session-change.png")
    await click("Save certificate")
    await waitFor(
      hasText("Certificate saved, but the file upload did not complete."),
    )
    const sessionItem = await item("Session change certificate")
    await control("control", {
      attachment_upload_failure: null,
      faults: {
        [`POST ${collection(sessionItem.certificate_id)}`]: { delay: 1000 },
      },
    })
    await click("Retry file upload")
    await waitFor(
      `!![...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Cancel upload')`,
    )
    await evaluate(
      "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-new-account-token') })()",
    )
    await waitFor(
      "!document.querySelector('[role=dialog]') && localStorage.getItem('tindy_access_token') === 'synthetic-new-account-token'",
    )
    await delay(1200)
    assert.ok(
      await evaluate(
        "!document.querySelector('.certificate-editor') && localStorage.getItem('tindy_access_token') === 'synthetic-new-account-token'",
      ),
    )
    await control("control", { faults: {} })
    await evaluate(
      "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-profile-token') })()",
    )
    await waitFor(
      "!!document.querySelector('.profile-identity') && !document.body.innerText.includes('Loading certificates')",
    )
    pass(
      "Session change closes the in-flight certificate editor and ignores the old upload response without clearing the new token",
    )
    await sendMobile(h, image.certificate_id)
    pass(
      "Integrated certificate thumbnail/form remain visible with no horizontal overflow on mobile",
    )
  } finally {
    await control("control", {
      certificates: original.certificates,
      attachments: original.attachments,
      media: original.media,
      faults: {},
      attachment_upload_failure: null,
      certificate_image_bytes: null,
    })
    await go("/profile")
    await waitFor(
      "!!document.querySelector('.profile-identity') && !document.body.innerText.includes('Loading certificates')",
    )
  }
}
async function sendMobile(h, id) {
  await h.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await h.evaluate(
    `document.querySelector('[data-certificate-id="${id}"]').scrollIntoView({block:'center'})`,
  )
  assert.ok(
    await h.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
  )
  await h.screenshot("certificate-card-mobile.png")
  await h.click("Add certificate")
  await h.input("title", "AWS Cloud Practitioner")
  await h.input("issuer", "Amazon Web Services")
  await h.input("description", "Foundational knowledge of AWS Cloud services.")
  assert.ok(
    await h.evaluate(
      "(() => { const box = document.querySelector('[role=dialog]').getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth + 1 })()",
    ),
  )
  await h.screenshot("certificate-editor-mobile.png")
  await h.click("Cancel", "[role=dialog] button")
  await h.waitFor("!document.querySelector('[role=dialog]')")
  await h.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await h.evaluate(
    `document.querySelector('[data-certificate-id="${id}"]').scrollIntoView({block:'center'})`,
  )
  await h.screenshot("certificate-card-desktop.png")
  await h.click("Add certificate")
  await h.input("title", "AWS Cloud Practitioner")
  await h.input("issuer", "Amazon Web Services")
  await h.input("description", "Foundational knowledge of AWS Cloud services.")
  await h.input("credential_url", "https://example.com/credential")
  await h.screenshot("certificate-editor-desktop.png")
  await h.click("Cancel", "[role=dialog] button")
  await h.waitFor("!document.querySelector('[role=dialog]')")
}
