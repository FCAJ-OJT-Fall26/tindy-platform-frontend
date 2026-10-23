import assert from "node:assert/strict"
import { delay } from "./profile-media-harness.mjs"

// Real editor and HTTP client, with the existing local API contract double.
export default async function verifyProfileImageEditor(
  h,
  { pass, closeModal },
) {
  const { evaluate, waitFor, click, control, send, go, calls, screenshot } = h
  const original = await control("state")
  const base = "/api/me/profile/"
  const q = JSON.stringify
  const count = (method, suffix) =>
    calls.filter((c) => c.method === method && c.path === base + suffix).length
  const ready = () =>
    waitFor(
      "!!document.querySelector('.profile-identity') && !document.body.innerText.includes('Loading profile')",
    )
  const includes = (text) => "document.body.innerText.includes(" + q(text) + ")"
  const fault = (method, suffix, value) =>
    control("control", {
      faults: value ? { [method + " " + base + suffix]: value } : {},
    })
  const choose = async (name, type = "image/png", size = null) => {
    await evaluate(
      "(async () => { const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#dce8ff'; ctx.fillRect(0,0,600,600); ctx.fillStyle = '#4168b0'; ctx.fillRect(0,200,600,200); ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TINDY',300,315); const blob = await new Promise(resolve => canvas.toBlob(resolve," +
        q(type) +
        ")); const data = new DataTransfer(); data.items.add(new File([" +
        (size == null ? "blob" : "new Uint8Array(" + size + ")") +
        "]," +
        q(name) +
        ",{type:" +
        q(type) +
        "})); const input = document.querySelector('[role=dialog] input[type=file]'); input.files = data.files; input.dispatchEvent(new Event('change',{bubbles:true})); })()",
    )
  }
  const selected = () =>
    waitFor(
      "document.querySelector('.media-upload-preview > img')?.naturalWidth > 0",
    )
  const url = () =>
    evaluate("document.querySelector('.media-upload-preview > img').src")
  const released = (value) =>
    evaluate("!window.__mediaUrls.has(" + q(value) + ")")
  const uploadButton = (label) =>
    "[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === " +
    q("Upload " + label) +
    ")"
  const uploadDisabled = (label) =>
    evaluate("(" + uploadButton(label) + ").disabled")
  const viewport = (width) =>
    send("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 600 ? 844 : 1080,
      deviceScaleFactor: 1,
      mobile: false,
    })
  try {
    assert.ok(
      await evaluate(
        "!!document.querySelector('.profile-avatar-wrap > button[aria-label=\"Edit avatar\"]') && !!document.querySelector('.profile-cover > button[aria-label=\"Edit cover\"]') && !document.querySelector('.profile-media-controls')",
      ),
    )
    await evaluate(
      "document.querySelector('[aria-label=\"Edit avatar\"]').focus()",
    )
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
      text: "\r",
      unmodifiedText: "\r",
    })
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    })
    await waitFor("!!document.querySelector('.media-editor-avatar')")
    assert.ok(
      await evaluate(
        "!!document.querySelector('.media-current-avatar img') && !!document.querySelector('input[name=profile_media]').getAttribute('aria-describedby')",
      ),
    )
    pass(
      "Contextual owner controls open the avatar editor by keyboard and show the current photo",
    )
    await closeModal()
    for (const label of ["avatar", "cover"]) {
      const suffix = label === "avatar" ? "avatar" : "cover-image"
      await click("Edit " + label)
      assert.ok(await uploadDisabled(label))
      await choose(label + "-first.png")
      await selected()
      const first = await url()
      await choose(label + "-second.webp", "image/webp")
      await waitFor(
        "document.querySelector('.media-selected-file').textContent.includes('second.webp')",
      )
      await selected()
      assert.ok(await released(first))
      const second = await url()
      const before = count("POST", suffix)
      await choose("invalid.svg", "image/svg+xml", 100)
      await waitFor(includes("Choose a JPEG, PNG or WebP image."))
      assert.ok(
        await evaluate(
          "!document.querySelector('.media-upload-preview, .media-selected-file')",
        ),
      )
      assert.ok(await released(second))
      assert.ok(await uploadDisabled(label))
      await choose("valid.png")
      await selected()
      assert.ok(
        await evaluate(
          "!document.querySelector('.profile-media-editor [role=alert]')",
        ),
      )
      await choose(
        "oversized.png",
        "image/png",
        label === "avatar" ? 5_000_001 : 10_000_001,
      )
      await waitFor(
        includes(
          "File must be " + (label === "avatar" ? 5 : 10) + " MB or smaller.",
        ),
      )
      assert.ok(await uploadDisabled(label))
      assert.ok(
        await evaluate("!document.querySelector('.media-upload-preview')"),
      )
      assert.equal(count("POST", suffix), before)
      await choose("clear.png")
      await selected()
      const clear = await url()
      await evaluate(
        "document.querySelector(" +
          q('[aria-label="Clear selected ' + label + ' image"]') +
          ").click()",
      )
      await waitFor("!document.querySelector('.media-upload-preview')")
      assert.ok(await uploadDisabled(label))
      assert.ok(await released(clear))
      await choose(label + "-ready.png")
      await selected()
      if (label === "avatar") {
        assert.equal(
          await evaluate(
            "getComputedStyle(document.querySelector('.media-upload-preview > img')).borderRadius",
          ),
          "50%",
        )
      } else {
        assert.ok(
          await evaluate(
            "(() => { const r = document.querySelector('.profile-cover').getBoundingClientRect(); const p = document.querySelector('.media-cover-display-crop').getBoundingClientRect(); const i = document.querySelector('.media-upload-preview > img').getBoundingClientRect(); return Math.abs(p.width/p.height-r.width/r.height)<.03 && Math.abs(i.width/i.height-3)<.03; })()",
          ),
        )
      }
      await screenshot("profile-" + label + "-editor-desktop.png")
      await viewport(390)
      await delay(400)
      assert.ok(
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth && (() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })()",
        ),
      )
      if (label === "cover")
        assert.ok(
          await evaluate(
            "(() => { const r = document.querySelector('.profile-cover').getBoundingClientRect(); const p = document.querySelector('.media-cover-display-crop').getBoundingClientRect(); return Math.abs(p.width/p.height-r.width/r.height)<.03; })()",
          ),
        )
      await screenshot("profile-" + label + "-editor-mobile.png")
      await viewport(1440)
      await fault("POST", suffix, { status: 500 })
      await click("Upload " + label)
      await waitFor(includes("Media could not be updated"))
      assert.ok(
        await evaluate(
          "document.querySelector('.media-upload-preview > img')?.naturalWidth > 0",
        ),
      )
      await fault("POST", suffix, { delay: 400 })
      const uploadCount = count("POST", suffix)
      await evaluate(
        "(() => { const b = " +
          uploadButton(label) +
          "; b.click(); b.click(); })()",
      )
      await waitFor(
        "document.querySelector('.profile-media-editor')?.getAttribute('aria-busy') === 'true'",
      )
      assert.ok(
        await evaluate(
          "document.querySelector('[aria-label=\"Close dialog\"]').disabled && document.querySelector('input[name=profile_media]').disabled",
        ),
      )
      await waitFor("!document.querySelector('[role=dialog]')")
      assert.equal(count("POST", suffix), uploadCount + 1)
      await fault("POST", suffix, null)
      assert.equal((await control("state")).profile.bio, original.profile.bio)
      await waitFor(
        label === "avatar"
          ? "document.querySelector('.profile-avatar-wrap img')?.src === document.querySelector('.topbar-user img')?.src"
          : "!!document.querySelector('.profile-cover.has-cover-image img')",
      )
      if (label === "cover") {
        await click("Edit cover")
        await waitFor("document.querySelector('.media-current-cover img')?.naturalWidth > 0")
        assert.ok(await evaluate("!![...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Remove cover' && !b.disabled)"))
        await closeModal()
      }
      pass(
        label +
          ": invalid/oversized selections clear stale file/URL; clear, retry, duplicate guard and desktop/mobile previews",
      )
    }
    await click("Edit avatar")
    await waitFor(includes("Use Google avatar"))
    const beforeProvider = (await control("state")).profile
      .avatar_media_asset_id
    await fault("PUT", "avatar/source", {
      status: 409,
      code: "MEDIA_OAUTH_AVATAR_UNAVAILABLE",
    })
    const sources = count("PUT", "avatar/source")
    await click("Use Google avatar")
    await waitFor(includes("Could not retrieve that account’s avatar"))
    assert.equal(count("PUT", "avatar/source"), sources + 1)
    assert.equal(
      (await control("state")).profile.avatar_media_asset_id,
      beforeProvider,
    )
    assert.ok(
      await evaluate(
        "document.querySelector('.media-current').textContent.includes('Uploaded photo')",
      ),
    )
    await fault("PUT", "avatar/source", null)
    await click("Use Google avatar")
    await waitFor("!document.querySelector('[role=dialog]')")
    await click("Edit avatar")
    await waitFor("document.querySelector('.media-current').textContent.includes('Connected account')")
    await click("Use default avatar")
    await waitFor("!document.querySelector('[role=dialog]')")
    await click("Edit avatar")
    assert.ok(await evaluate("document.querySelector('.media-current').textContent.includes('Default avatar') && !!document.querySelector('.media-avatar-sources [aria-pressed=true]') && !document.querySelector('.media-remove')"))
    await closeModal()
    pass("Current OAuth/default sources are explicit, with remove hidden when there is no current photo")
    await control("control", {
      faults: { "GET /api/auth/connections": { status: 500 } },
    })
    await click("Edit avatar")
    await waitFor(includes("Could not load connected accounts."))
    assert.ok(!(await evaluate(includes("Use Google avatar"))))
    await control("control", { faults: {} })
    await click("Retry connections")
    await waitFor(includes("Use Google avatar"))
    await closeModal()
    pass(
      "Failed OAuth retrieval preserves the source; failed connections offer retry without fallback to another provider",
    )
    await click("Edit avatar")
    await choose("cancel.png")
    await selected()
    const cancel = await url()
    await closeModal()
    assert.ok(await released(cancel))
    await go("/users/44444444-4444-4444-8444-444444444444")
    await ready()
    assert.ok(
      await evaluate(
        "!document.querySelector('.profile-avatar-edit, .profile-cover-edit, .profile-media-editor')",
      ),
    )
    pass(
      "Closing releases selected previews; a member profile has no media edit controls",
    )
    await go("/profile")
    await ready()
    await click("Edit cover")
    await choose("session.png")
    await selected()
    const session = await url()
    await fault("POST", "cover-image", { delay: 600 })
    const sessionUploads = count("POST", "cover-image")
    await click("Upload cover")
    await waitFor("document.querySelector('.profile-media-editor')?.getAttribute('aria-busy') === 'true'")
    for (let attempt = 0; attempt < 50 && count("POST", "cover-image") === sessionUploads; attempt++) await delay(10)
    assert.equal(count("POST", "cover-image"), sessionUploads + 1)
    await evaluate(
      "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-new-account-token') })()",
    )
    await waitFor("!document.querySelector('[role=dialog]')")
    assert.ok(await released(session))
    assert.equal(
      await evaluate("localStorage.getItem('tindy_access_token')"),
      "synthetic-new-account-token",
    )
    await delay(800)
    await fault("POST", "cover-image", null)
    await evaluate(
      "(async () => { const api = await import('/src/services/apiClient.ts'); api.setStoredToken('synthetic-profile-token') })()",
    )
    pass(
      "Session changes dismiss the editor and release selection URLs without changing the new token",
    )
  } finally {
    await control("control", {
      profile: original.profile,
      media: original.media,
      providers: original.providers,
      faults: {},
    })
    await viewport(1440)
    await go("/profile")
    await ready()
  }
}
