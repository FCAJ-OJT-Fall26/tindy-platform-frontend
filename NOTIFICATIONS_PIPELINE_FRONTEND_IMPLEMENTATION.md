# Tindy V1 — Notifications and Candidate Pipeline frontend

Implemented on 2026-11-05 in the existing React/TypeScript application. No deployment,
authentication rewrite, new runtime dependency or backend change is part of this task.
Pre-existing working-tree changes were preserved.

## Completed functionality

- Notifications use the four actual authenticated backend routes through `apiRequest`.
  Snake_case notification DTOs are validated at runtime, including UUIDs, supported
  events, payload shape, read timestamps, counts and 20-item pagination metadata.
- One memory-only inbox in the existing Tindy store supplies Header, Sidebar and
  Notifications Page. Server `read_at` owns read state; old localStorage read arrays
  and demo notification data are no longer used.
- Header displays a numeric unread badge and latest eight notifications, with All /
  Unread tabs, View, individual read, Mark All and View All actions. Opening the bell
  refreshes data without marking anything read.
- Notifications Page has All Updates / Unread, 20-item pagination, formatted dates,
  loading, loaded-empty, error/retry and pending/disabled states. Payload strings are
  rendered as ordinary React text, never HTML.
- Read mutations are confirmed by backend responses, deduplicated across surfaces,
  and followed by fresh count/list reads. A failed or uncertain response retains a
  retry notice. Mark All re-reads backend state rather than forcing unread count to
  zero, preserving notifications arriving after the backend cutoff.
- One 60-second poller runs for an authenticated, onboarded session. It makes no
  polling requests while hidden, refreshes on tab return and confirmed Invitation
  events, coalesces concurrent reads, aborts obsolete requests and clears state on
  logout/account change. Only actively displayed list pages are polled.
- Notification navigation marks the row read and loads an existing destination.
  If marking read fails, navigation still works and a shared retry banner remains
  available on the destination page.
- Settings removes the four fake notification switches and fake Save Preferences.
  It explains in-app updates and links to the inbox. Privacy & Security adds
  **Manage Team Invitations**, opening `/profile?edit=team-invitations`, consuming
  the query, opening Edit Profile and focusing its existing opt-in checkbox.
  Consent has one field and one control; existing dirty-only PATCH, backend
  confirmation and uncertain-write reconciliation remain intact.
- Active candidates filter by nullable `team_members[].position_id`, preserve
  Role Title and Profile links, include an unassigned Leader in the project-wide
  view and show a precise empty state for an unoccupied selected Position.
- Candidate Archived is removed from live and obsolete demo tabs/state. Old
  `tab=Archived` URLs replace to Shortlisted while preserving Project/Position.
  Leader Dashboard Project Archive is unchanged.
- Candidate context distinguishes missing selection, invalid/inaccessible context,
  loading and recoverable error. Interested no longer shows a loaded-empty message
  while loading or after an API error. Existing interaction and Invitation actions
  retain their guards and pending behavior.

## API integration

All requests use the existing token/session, abort signal, 15-second request timeout,
snake_case envelope and ProblemDetails handling. No recipient ID is supplied by UI.

| Request | Response data |
| --- | --- |
| `GET /api/me/notifications?filter=all&page=1&page_size=20` | `{ items: NotificationDto[], pagination: PaginationMeta }` |
| `GET /api/me/notifications/unread-count` | `{ unread_count: number }` |
| `PATCH /api/me/notifications/{notification_id}/read` | Updated `NotificationDto`, with `is_read=true` and original/server-owned `read_at` |
| `POST /api/me/notifications/mark-all-read` | `{ updated_count: number }` |

Notification fields are `notification_id`, `type`, `invitation_id`, nullable
`actor_user_id`, `payload`, `is_read`, nullable `read_at`, `created_at`.
Supported types are `invitation_received`, `invitation_accepted`,
`invitation_declined`, `invitation_cancelled`. Payload display fields are
`project_name`, `position_title`, `actor_display_name`.

| Notification | Existing destination |
| --- | --- |
| Received / cancelled | `/projects?tab=Invited&invitation_id=...` |
| Accepted | `/project/{project_id}` after authorized history lookup; otherwise `/team` |
| Declined | `/candidates?tab=Invited&project_id=...&position_id=...` after lookup; otherwise `/candidates?tab=Invited` |

The destination Invitation History loads current backend state. Reading a
notification does not accept/decline/cancel an invitation. Terminal or expired
invitations do not gain Accept actions from a notification payload.

## Contract compatibility and limits

- The sibling backend contract inspected here matches the four endpoints, envelope,
  pagination, supported types and nullable active-member position field. No new
  backend endpoint is assumed.
- V1 notifications do **not** contain `project_id`. For accepted/declined events the
  client resolves `invitation_id` through existing current-leader Projects and
  authorized paginated Invitation History. Large histories can require multiple
  reads. If history is inaccessible or resolution fails, a supported existing
  destination remains available and asks the user to choose Project context.
  Payload fields never authorize an action.
- Project Detail needs the backend change that returns
  `team_members[].position_id`. Leaders may return null.
- Notifications and counts are polling-based, with up to a 60-second background
  delay while visible; opening the inbox/bell and returning to a tab refresh them.
  Offset pagination can shift when the backend receives new rows.
- A count failure preserves its last confirmed value with an explicit stale/error
  notice, or leaves the initial count unknown. Zero is never fabricated as success.
- Browser verification used local HTTP simulations. This task did not run a live
  Frontend-to-production/backend deployment, real OAuth or database transaction
  checks. Backend transaction verification is documented separately in the sibling
  backend's Notifications implementation report.
- Existing Vite warnings remain: future native-config compatibility (`__dirname`
  and JSON import attributes) and the existing large bundle warning.

## Exact source files in this task

Paths are relative to `tindy-platform-frontend`. Other pre-existing modified or
untracked files belong to prior work and are not included below.

Created:

1. `src/types/notification.ts`
2. `src/services/notifications.service.ts`
3. `src/hooks/useNotificationState.ts`
4. `src/hooks/useNotifications.ts`
5. `src/hooks/useNotificationNavigation.ts`
6. `src/components/notifications/NotificationRow.tsx`
7. `src/components/notifications/NotificationFeedback.tsx`
8. `src/pages/notifications/notifications.css`
9. `tests/notifications.browser.mjs`
10. `tests/candidates-polish.browser.mjs`
11. `NOTIFICATIONS_PIPELINE_FRONTEND_IMPLEMENTATION.md`

Modified:

1. `package.json` — two new test scripts; existing scripts/dependencies preserved.
2. `src/App.tsx` — removes DemoPreview only from Notifications.
3. `src/store.tsx` — shared notification hook; removes obsolete read/archive state.
4. `src/components/layout/Header.tsx` — API bell/dropdown and shared retry feedback.
5. `src/components/layout/Sidebar.tsx` — real unread indicator; no Notifications demo label.
6. `src/pages/notifications/NotificationsScreen.tsx` — full API inbox.
7. `src/pages/settings/SettingsScreen.tsx` — real navigation and preference cleanup.
8. `src/pages/profile/ProfileScreen.tsx` — own-profile query-driven editor opening.
9. `src/components/profile/ProfileForms.tsx` — optional opt-in focus and accessible label.
10. `src/pages/candidates/LiveCandidatesScreen.tsx` — Active filtering, tabs/context/states.
11. `src/pages/candidates/CandidatesScreen.tsx` — obsolete demo Archive removal only.
12. `src/types/project.ts` — nullable `ProjectTeamMemberDto.position_id`.
13. `tests/teammates.browser.mjs` — Archived URL expectation now checks supported fallback.
14. `postman/mocks/tindy-project/handler.js` — test-only notification API/event state,
    position assignments and delayed/malformed response controls.
15. `postman/simulations/project-crud.context.yaml` — appends new evidence while preserving prior claims.

Removed:

1. `src/data/notifications.ts` — obsolete demo notification types/data, with no remaining imports.

## Validation

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed; exit code 0. |
| `npm run build` | Passed; existing Vite warnings described above. |
| `npm run test:notifications` | 11 groups passed, 0 failed/skipped. |
| `npm run test:candidates:polish` | 7 groups passed, 0 failed/skipped. |
| `npm run test:teammates` | 16 groups passed, 0 failed/skipped. |
| `npm run test:teammates:errors` | 15 groups passed, 0 failed/skipped. |
| `npm run test:teammates:regression` | 6 groups passed, 0 failed/skipped. |
| `npm run test:profile` | 44 groups passed, 0 failed/skipped; 189 actual frontend HTTP requests through the local simulation. |

Browser tests run real React and `apiRequest` over HTTP without replacing fetch.
All six browser suites passed: 99 groups total, 0 failed and 0 skipped.
The notification test controls only 60-second timer callbacks and document
visibility to test lifecycle without long waits. Synthetic fixture rows stay
inside test code and local Postman mocks; production UI has no fixture fallback.

The existing Archived regression expectation was intentionally updated to the
agreed new behavior, rather than retaining the old unavailable-archive placeholder.
No test was disabled. Initial test-fixture issues were corrected to use complete
AuthUser fields, actual existing empty/retry labels and an explicit refresh when
injecting an Invitation History error after initial mount.

Local generated evidence (ignored outputs):

- `.tmp-notifications-results/requests.json`
- `.tmp-notifications-results/screenshots/notifications-desktop.png`
- `.tmp-notifications-results/screenshots/notifications-dropdown.png`
- `.tmp-notifications-results/screenshots/notifications-mobile.png`
- `.tmp-candidates-polish/requests.json`
- `.tmp-candidates-polish/screenshots/candidate-active.png`
- `.tmp-profile-verification/` and existing Teammates result directories.

Desktop inbox, bell dropdown, mobile inbox and Active membership screenshots were
visually inspected. Layout and branding remain consistent; the mobile inbox does
not overflow its viewport. `git diff --check` passed.

The Postman CLI v1.73.0 lacks the skills' `postman status` command. The existing
local simulation was reused directly; no remote workspace search, publication or
deployment was needed. In this environment Postman dataset support and headless
Chrome required the normal tool sandbox escalation; the authorized local tests
then ran successfully.

## Manual integration checklist

1. Apply the backend Notifications migration in the intended test environment,
   start frontend/backend with normal configuration and sign in to an onboarded account.
2. Send an Invitation as Leader; sign in as recipient and verify its badge,
   Sidebar indicator, dropdown and inbox row. Opening the bell alone must not read it.
3. Open the received notification; verify My Projects → Invited loads backend
   history and shows actions only for a genuinely pending, eligible Invitation.
4. Accept, decline and cancel separate invitations; confirm the appropriate
   recipient, display snapshot, navigation context and fresh destination status.
5. Open notifications for an expired/cancelled Invitation and verify no active
   Accept action is exposed. Reading a notification must not change its Invitation.
6. With more than 20 rows, exercise All/Unread and both pagination directions;
   verify row keys, dates and exact page/filter requests.
7. Read one row from each surface. Revisit pages without reloading and verify
   counts remain synchronized. Repeat read and verify `read_at` does not change.
8. Mark All while a new notification arrives. The backend cutoff must leave
   the new row unread; a prior `read_at` must remain unchanged.
9. Disconnect/reconnect backend or inject 5xx/malformed JSON. Verify explicit
   Retry, unknown/stale count notices, retained invitation data and no fake success.
   A View action must still reach content after a mark-read failure.
10. Wait one visible minute, hide the tab, then return. Verify one poller,
    no hidden polling, immediate return refresh and no overlapping resource reads.
11. Log out or switch accounts while requests are delayed. Verify no previous
    account's rows/count/errors leak and polling stops when signed out.
12. In Settings, verify fake preference controls are gone. Follow Manage Team
    Invitations, confirm focus, toggle once and verify only
    `open_to_team_invitations` is PATCHed with backend-confirmed success.
13. In Active, test no Position, each Position and an empty Position; include a
    null-position Leader and members sharing the same Role Title. Verify Profile links.
14. Visit an old `tab=Archived` Candidate URL, invalid/inaccessible selections,
    loading/empty/error states, and action-pending states. Confirm Project Archive
    in Leader Dashboard retains its existing behavior.
