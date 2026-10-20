# Profile V1 frontend integration

Implemented on 20 October 2026 using the supplied `CODEX_FE_PROFILE_PROMPT.md`,
`PROFILE_API.md`, and the accompanying `PROFILE_OPENAPI.yaml` in the backend repository.
Only frontend code and local verification assets were changed.

## Delivered behavior

- `/profile`: server-backed owner profile, partial editing, and independent
  Experiences / Certificates collections with create, edit, and confirmed delete.
- `/users/:userId`: authenticated, read-only member view using the three member
  GET endpoints. It excludes phone, resume, and Account login email, including
  when a user opens their own member URL.
- Each resource has its own loading, error, and retry state. Empty API lists stay
  empty. OAuth avatars use the response URL and fall back to initials on failure;
  the default cover is CSS.
- Profile state is held in memory and loaded from the API. Old localStorage demo
  profiles are ignored. Account identity cannot overwrite a saved Profile response.
- Settings shows the login email read-only and links to Profile for contact edits.
  AI Studio explains that generation/extraction is unavailable and links to Profile;
  it no longer writes demo text or free-text skills into the profile.
- Shared modals render through a portal so page animations cannot move them below
  mobile navigation. Their focus handler is stable, and pending mutations prevent
  accidental dismissal or duplicate submission.

## Contract mappings

- All 13 documented endpoints reuse `apiRequest`, existing Bearer JWT handling,
  success-envelope parsing, and session/onboarding error events.
- Profile uses **PATCH**, sending only changed whitelisted fields. Optional values
  cleared in the editor become `null`; untouched values are omitted. An unchanged
  form sends no request. `skill_ids` is sent only when the complete selection changes.
- `bio` is the profile introduction, `personal_website_url` is the portfolio link,
  and `previous_projects_and_contribution` is a summary, independent of CRUD items.
- Roles and skills come from Catalog UUIDs. Previously saved inactive entries can
  remain selected. Profile skills require 1–30 entries; Experience skills allow
  0–20 and are independent of Profile skills.
- Experience POST/PUT sends the full request, including `is_ongoing` and `skill_ids`.
  The response's `technologies` supplies display names and saved skill IDs, and is
  never sent in a request. Ongoing projects send `end_date: null`.
- Certificates use the full supported request with `YYYY-MM-DD` dates. Experiences
  use `YYYY-MM` dates. URLs, required fields, lengths, date order, and 1–40 weekly
  hours are validated before submission; server field errors retain the draft.
- POST/PUT/PATCH responses become the saved state; collection GETs restore server
  ordering. DELETE handles `204` without trying to parse JSON.
- No backend changes, onboarding protocol changes, upload/S3 integration,
  verification badges, auto-generated summaries, or Project Management CRUD.

## Main source changes

| Files | Responsibility |
| --- | --- |
| `src/types/profile.ts` | Separate owner/member DTOs and precise mutation types |
| `src/services/profile.service.ts` | All 13 Profile V1 endpoint calls |
| `src/services/profileValidation.ts` | Whitelist, dirty-field mapping, URL/error handling |
| `src/hooks/useRemoteResource.ts` | Abortable, session-scoped remote resources; stale-response protection |
| `src/components/profile/ProfileForms.tsx` | Profile editor, Catalog selection, Experience/Certificate forms |
| `src/pages/profile/ProfileScreen.tsx`, `profile.css` | Owner/member views, independent collections, responsive presentation |
| `src/store.tsx` | Server profile state and compatibility mapping for existing consumers |
| `src/App.tsx`, `src/components/layout/{Header,Layout}.tsx` | Member route, breadcrumbs, removal of demo profile title |
| `src/pages/settings/SettingsScreen.tsx`, `src/pages/studio/AiStudioScreen.tsx` | Remove local-only Profile mutations |
| `src/components/ui.tsx` | Modal portal, stable focus/close handling, pending-state dismissal guard |
| `postman/mocks/profile/`, `postman/simulations/profile.sim.yaml` | Local stateful contract double and simulation |
| `tests/profile*.mjs`, existing Save/Discovery tests, `package.json` | Browser integration coverage, updated fixtures and readiness waits |

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:profile` | 44 checks PASS; 130 real frontend HTTP requests through a local Postman simulation |
| `npm run test:auth` | 58 checks PASS against the existing HTTP test double |
| `npm run test:onboarding` | 41 checks PASS with the existing intercepted-response fixtures |
| `npm run test:save-button` | 7 checks PASS |
| `npm run test:discovery-actions` | 12 checks PASS |
| `git diff --check` | PASS |

Profile checks cover dirty/omitted/null fields, required whitespace, Catalog UUIDs,
empty collections, avatar fallback, full replacement payloads, date/URL validation,
success statuses 200/201/204, errors 400/401/403/404/422/500, an interrupted HTTP
connection, independent retries, member privacy/read-only controls, and mobile
viewport/modal layout. Desktop/mobile screenshots and simulation request logs are
saved under the ignored `.tmp-profile-verification/` directory.

The Postman CLI was signed out, so owner-workspace mock discovery was skipped.
The local mock was generated from the supplied OpenAPI and made stateful according
to the supplied Markdown contract. Its data, tokens, and failure controls are
synthetic; it is never used by the application in normal development/production.
No mock was published or deployed.

Run `npm run test:profile` with Node, Chrome (or `CHROME_PATH`), and Postman CLI
1.70+ (or `POSTMAN_PATH`). It starts and stops its local simulation, Vite, and
isolated Chrome session automatically. Postman needs access to its local state
directory. There is no lint script configured in this repository.

## Live environment still to verify

Neither documented local backend port (5217 / 7190) was listening during this
session. The real .NET backend, PostgreSQL migrations/data, real Catalog contents,
and authenticated Profile HTTP flows were therefore **not** verified end to end.
Run the backend with its database and sign in with a completed-onboarding account,
using the backend origin configured by `VITE_API_BASE_URL`, before release.

Production build still reports the existing Vite configuration compatibility and
bundle-size advisories. They do not block the build.
