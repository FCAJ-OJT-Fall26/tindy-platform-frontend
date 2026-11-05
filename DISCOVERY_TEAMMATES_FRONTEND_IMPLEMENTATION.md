# Discovery Teammates V1 — Frontend implementation

Date: 2026-11-03. Scope: FE 01–06 in the existing React application. No deployment, commit, push, or application-database migration was performed.

## Activation and entry points

Teammates uses the Backend directly by default. No feature flag or additional `.env.local` switch is required. The old `VITE_TEAMMATES_LIVE_ENABLED` flag and mock route branches were removed. Legacy `demo=1` URLs cannot select mock teammate data.

| Route | Source |
| --- | --- |
| `/discover` | Existing Project Discovery API |
| `/discover?mode=teammates` | Candidate Discovery API |
| `/candidates` | Actual Candidate Pipeline |
| `/candidate/{user_uuid}` | Member Profile with optional Project/Position context |
| `/projects?tab=Invited` | Recipient Invitation history |

Pass `project_id` and `position_id` in the query string to retain context. The selector never chooses an arbitrary Position. Leader Workspace links supply the Project and let the Leader choose a Position. API failures display an error/retry state.

New accounts created by the Backend Development seed have `open_to_team_invitations=true`, so a fresh drop/update/seed supplies candidates through the normal API. Existing accounts are preserved on reseed, including their invitation preference. Ordinary user profiles retain their default opt-out. Seed usernames/password setup and commands remain in the Backend seed quickstart.

Leader Workspace shows actual Project, team-seat, pending Application and pending Invitation counts. It no longer renders sample candidate cards, hardcoded chat, category counts, or nonzero fallback metrics. Invitation totals come from protected paginated API metadata with at most four concurrent reads; loading/errors are not presented as zero.

## Completed phases

| Phase | Implementation |
| --- | --- |
| FE 01 | Dedicated teammate/Invitation DTOs and services using the existing `apiRequest`, AbortSignal, UUID guards, pagination, version/factor/status/identity validation and ProblemDetails mapping. Owner-only consent added to Profile response/PATCH. |
| FE 02 | Verified actual Leader Project/Position context, server-ranked feed, real catalogs, cursor paging, frozen `scored_at`, refresh/error/empty states, active-card Profile enrichment, real detail/evidence, teammate Match Inspector, responsive filters. |
| FE 03 | Confirmed saved/shortlisted/skipped/reset mutations, duplicate guards, previous-action Undo, uncertainty reconciliation, paginated stored-interaction management and unavailable-preview handling. |
| FE 04 | Send modal with a 2,000-character optional message, seven-day policy, history preflight, sender/context/status verification, cancel/history/status/Position filters and separate Pipeline sources. |
| FE 05 | Recipient history, bounded name hydration with UUID fallback, explicit Accept/Decline, membership refetch, opt-out guidance and owner consent editing with confirmed-response/GET reconciliation. |
| FE 06 | Direct Backend routing without runtime mocks, stateful Postman contract simulation, new service/browser/error/regression suites, real Backend/PostgreSQL browser smoke and desktop/mobile visual checks. |

## State and matching behavior

Live data uses UUID identity and account/Project/Position keys. It does not read the demo candidate arrays or name-based localStorage records as persisted truth. In-flight resources use cancellation/generation guards; mutation callbacks check their current scope, including unmount/session changes.

The feed keeps Backend order and de-duplicates UUIDs without a client ranking pass. Cursor pages cannot merge different scoring timestamps. Changing Project, Position or filters clears the previous feed/cursor/selection. Expired snapshots require refresh. Filters send only the actual supported Backend query fields and catalog UUIDs.

`RuleMatchPanel` accepts an additive teammate perspective. It renders the returned score, factors, normalized weights, contributions and explanation. The teammate score label displays the exact server value while the ring animates. `rule-v1` and `teammates-v1` are checked. Required/preferred/availability/optional factors must be present once each. There is no teammate scorer, AI explanation, fabricated academic verification or invented certificate evidence.

Only the active card enriches university/avatar from the existing Member Profile endpoint; the detail view loads Profile/Experiences/Certificates on demand. Identity is checked on Profile enrichment. Historical interaction rows have no matching DTO, so their UI explicitly says Position Match is unavailable.

Actions are mutually exclusive Backend interactions. Right swipe opens Shortlist confirmation; opening/canceling performs no mutation. Shortlisting never sends an Invitation or chat. Undo restores the previous action with PUT or resets it with DELETE. Unknown interaction outcomes are read from the paginated interaction history; a later status check refreshes the displayed resource before continuing.

## Invitation write safety

`invitationAttempts.ts` holds synchronous locks and a **sessionStorage intent journal**, scoped by account + Project + recipient across Positions. The journal contains request identifiers/message/baseline history IDs, never a Bearer token, confirmed status cache, or membership list.

Before Send, the client reads all recipient history pages and records the known Invitation IDs. A known pending Invitation is displayed using its actual Position. A potentially committed Send is reconciled only against a unique new history row with the expected Project, Position, recipient, sender and normalized message. Ambiguous or absent results stay blocked with the draft retained and a Check Status action. A network failure, timeout/408, 5xx or invalid success response never causes a blind POST retry.

Cancel/Accept/Decline use the known Invitation UUID. Unknown results are reconciled from authorized history. A terminal Backend status resolves the attempt and is displayed as returned, including a terminal status different from the requested action. A pending/absent record does not authorize another uncertain POST. Definitive business errors preserve the draft and explain pending Application, pending Invitation, cooldown, unavailable candidate, capacity, Project and rate-limit conflicts.

This provides safe browser-level reconciliation, not an exactly-once guarantee across devices, tabs, concurrent identical writes, or arbitrarily late commits. The Backend does not expose an idempotency-key contract. Unresolved journal entries deliberately remain blocked in that browser session.

Acceptance never writes local membership. `INVITATIONS_CHANGED_EVENT` refreshes the real My Projects resource. The valid Invitation path does not reuse the new-Application recruitment-deadline blocker: the real browser smoke accepted after recruitment cutoff. Ordinary users can explicitly enable or disable invitations in Profile; the frontend never changes their consent automatically. An opted-out recipient can still decline.

## Pipeline sources and contract limits

| Tab | Backend source / behavior |
| --- | --- |
| Interested | Existing pending Project Applications, with their applied-position matching |
| Shortlisted / Saved / Skipped | Candidate interactions scoped by `(project_id, position_id, candidate_user_id)` |
| Invited | Actual Project Invitations, all statuses by default, optional Position filter, paginated history and pending cancellation |
| Active | Actual `ProjectDetailDto.team_members`; explicitly Project-wide because the DTO does not expose Position IDs |
| Archived | Explicitly unavailable; no archive API or mock substitute |

A Member may appear in independent datasets. Rows are never merged by display name or forced into a fabricated linear state machine.

The candidate preview has no university, bio, `can_invite`, verification state or cooldown timestamp. No such wire fields were added. Names for Invitation history are hydrated for the current page with at most four concurrent detail reads. Failed/archived Project hydration preserves UUIDs, status, message and timestamps for both Member and Leader history. Leader history/cancellation is authorized by the protected current-Project-Leader endpoint; the historical `inviting_leader_id` is preserved and is not mistaken for current ownership. Pending invitations do not reserve slots. No email delivery, notification or chat success is claimed.

Consent is owner-only. A missing unsupported response field remains `undefined` in the draft and disables the control; it is not interpreted as Backend `false`. An unchanged field is omitted from PATCH. Explicit `false` is transmitted. A lost consent PATCH response triggers GET verification of the requested fields before success. Onboarding and member-visible Profile DTOs do not acquire this field.

## Verification

The following commands were run in this implementation session. Counts refer to the groups printed by each browser script, not database concurrency proofs.

The always-Backend adjustment reran typecheck/build, the Teammates browser/error/regression/live suites and Discovery action routing. The sibling Backend DevelopmentSeed filter passed 8 tests, including actual seeded users in the candidate API and preservation of edited opt-out preferences. Auth/onboarding/profile/save-button results below are from the earlier integration run.

| Command | Result | Dependency |
| --- | --- | --- |
| `npm run typecheck` | Passed | TypeScript |
| `npm run build` | Passed | Vite production build; existing config/chunk-size warnings remain |
| `npm run test:teammates` | 16 groups passed | Real React/HTTP through Postman simulation |
| `npm run test:teammates:errors` | 15 groups passed | Postman simulation, including snapshot consistency, uncertain interaction refresh, historical sender/current Leader and archived history |
| `npm run test:teammates:regression` | 6 groups passed | Current Project Save/Skip/Undo/Apply/Approval, real dashboard counts, My Projects and always-Backend teammate/Invitation routing through HTTP simulation |
| `npm run test:teammates:live` | 6 groups passed | Real ASP.NET Core Backend + disposable PostgreSQL |
| `npm run test:auth` | 58 checks passed | Existing HTTP fixture |
| `npm run test:onboarding` | 41 checks passed | Existing intercepted HTTP fixtures |
| `npm run test:profile` | 44 checks passed | Existing Postman simulation |
| `npm run test:save-button` | 7 checks passed | Existing browser fixture |
| `npm run test:discovery-actions` | 9 groups passed | Existing Postman simulation, always-Backend teammate routing |

The Profile suite's old `Demo summary generated` assertion was updated to the toast already emitted in HEAD: `Summary generated · Review and edit before accepting`. Its no-Profile-write assertions remain intact. AI Studio production code was not changed.

### Real Backend smoke

Run `npm run test:teammates:live` with .NET 10, Docker, and the sibling `tindy-backend-platform` checkout available. `tests/live-teammates-host` reuses the Backend's `TindyApiFactory` and synthetic test-data helper. It migrates/seeds an isolated Testcontainers database and issues test-account JWTs through the actual JWT service. Requests pass through the actual Backend authentication, services and persistence. No production authentication stub or application-database connection is used.

The browser verified exact server scoring/privacy, persistent shortlist, two Invitations without slot reservation, explicit Decline with no membership, Accept after recruitment cutoff, actual membership/filled-count change, My Projects refresh, explicit consent `false`, and the absence of consent in member-visible Profile. The host is stopped and the disposable database is removed after the test.

Verification evidence was written to `.tmp-teammates-live-results/evidence.json`, host log and screenshots; `.tmp-teammates-results/requests.json` and screenshots; `.tmp-teammates-errors/screenshots`. These temporary artifacts were removed at the user's request during cleanup on 2026-11-03. Rerunning the test commands regenerates their outputs. Simulation results establish caller/contract behavior only. The live smoke establishes the exercised database writes, not exhaustive transaction/concurrency correctness or production deployment readiness.

### Existing regression-suite limitations

Three older suites were run and compared against an isolated archive of **HEAD** under `.tmp-recruitment-baseline`:

- `test:recruitment`: the unchanged baseline first exposes an animation-timing assertion (`8` vs `50` progress). Adding only an animation wait in the temporary baseline test reaches the same later failure as the working tree: it expects `.project-detail-sidebar .rule-match-sidebar` after Inspect Project, while current HEAD opens `ProjectDetailModal`. The Project matching/navigation production flow was preserved. The current-UI Project/Apply/Leader Approval regression suite and Discovery action suite pass separately.
- `test:projects`: both HEAD and working tree fail at `tests/projects.browser.mjs:115`, which queries a Project edit link before opening its current menu. No edit link is present in the queried DOM at that point.
- `test:profile-media`: both runs pass 22 groups, then stop in the existing certificate cancel/retry-upload case before group 23. The working-tree run times out finding Retry File Upload; the baseline run times out waiting for the retried attachment to become ready. The full Media suite is therefore not claimed green. The certificate/attachment implementation was left unchanged; the Profile form edit is confined to the owner consent control.

The temporary baseline archive, test output and screenshots were removed at the user's request during cleanup on 2026-11-03. The recorded results above describe the completed verification runs. No original suite assertions were removed to hide these failures.

## Files and handoff

The main additions are `types/teammate.ts`, `types/invitation.ts`, teammate/Invitation services, `invitationAttempts.ts`, scoped hooks, `LiveTeammatesDiscoveryView`, live candidate detail/Pipeline components, shared Invitation history/review/send components, `MyProjectInvitationsView`, and the four Teammates test commands. Existing shared components gained additive live props; Project matching logic was not changed.

The contract stand-in was extended in `postman/mocks/tindy-project/handler.js`; it is test-only and is never imported from `src`. Existing user modifications to `package.json`/`package-lock.json` were preserved; this task adds test scripts and no npm dependency.

Teammates routes use the Backend by default without a feature flag. There is no automatic commit, push, deployment, application-database migration, or production opt-in change in this handoff.
