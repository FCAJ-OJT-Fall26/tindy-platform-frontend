import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mergeChatMessages,
  firstUnreadMessageId,
} from "../src/services/chat-state.ts"
const message = (id, createdAt, senderId = "other") => ({
  messageId: id,
  conversationId: "room",
  senderId,
  body: id,
  createdAt,
})
test("merges reply and event once, retaining history during resync", () => {
  const old = message("a", "2026-11-04T10:00:00Z"),
    recent = message("b", "2026-11-05T10:00:00Z")
  const rows = mergeChatMessages([old, recent], [recent])
  assert.deepEqual(rows, [old, recent])
  assert.equal(mergeChatMessages(rows, [recent]), rows)
})
test("orders variable subsecond precision and breaks equal-time ties by UUID", () => {
  const rows = [
    message("b", "2026-11-05T10:00:00.11Z"),
    message("c", "2026-11-05T10:00:00.1Z"),
    message("a", "2026-11-05T10:00:00.1000000Z"),
  ]
  assert.deepEqual(
    mergeChatMessages([], rows).map((m) => m.messageId),
    ["a", "c", "b"],
  )
})
test("chooses exactly one incoming unread boundary at database precision", () => {
  const rows = [
    message("a", "2026-11-05T10:00:00.0000001Z"),
    message("b", "2026-11-05T10:00:00.0000002Z", "self"),
    message("c", "2026-11-05T10:00:00.0000003Z"),
    message("d", "2026-11-05T10:00:00.0000003Z"),
  ]
  assert.equal(
    firstUnreadMessageId(rows, "other", "2026-11-05T10:00:00.0000002Z"),
    "c",
  )
  assert.equal(firstUnreadMessageId(rows, "other", null), null)
})

test("group unread boundary includes every other sender and preserves timestamp precision", () => {
  const rows = [
    message("a", "2026-11-05T10:00:00.1000000Z", "self"),
    message("b", "2026-11-05T10:00:00.1Z", "member-two"),
    message("c", "2026-11-05T10:00:00.1000001Z", "member-three"),
  ]
  assert.equal(firstUnreadMessageId(rows, undefined, "2026-11-05T10:00:00.1000000Z", "self"), "b")
  assert.equal(firstUnreadMessageId(rows, undefined, "2026-11-05T10:00:00.1000001Z", "self"), "c")
})
