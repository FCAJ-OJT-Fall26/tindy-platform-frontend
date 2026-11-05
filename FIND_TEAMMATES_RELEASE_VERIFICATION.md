# Tindy Find Teammates V1 — integration and release verification

Audit date: 2026-11-05, Asia/Bangkok. Both working checkouts were inspected and
tested again during this audit. Results below come from these executions, source
inspection and the new real-backend browser run, rather than earlier reports.

**Overall recommendation: Needs Fixes.** The integrated V1 flows pass, but the
full backend suite has one unresolved CORS policy/test contract failure. Do not
declare the release gate green until that disagreement is resolved and rerun.
No deployment or application/production migration was performed.

## Verification areas

| Area | Result | Evidence from this audit |
| --- | --- | --- |
| Backend restore/build | PASS | Dependencies restored; build has 0 warnings/errors. |
| Backend full suite | FAIL | 1006 passed, 1 failed, 2 skipped; 1009 total. CORS failure detailed below. |
| PostgreSQL migrations/model | PASS | Fresh disposable databases migrated; real migration Up/Down/Up tests pass; EF reports no pending model changes. Real browser database applied all 21 migrations. |
| FK/index/lifecycle constraints | PASS | Actual PostgreSQL insert/delete/duplicate/check violations exercised; 9 schema tests pass across Notification/Teammate/Recruitment schema classes. |
| JWT/active-account/onboarding authorization | PASS | Anonymous, suspended/inactive and incomplete accounts rejected by actual API tests; notification/Invitation gate theories all pass. |
| CORS contract | FAIL | Allowed-origin preflight emits credentials header, contradicting existing test expectation. Untrusted-origin case passes. |
| Frontend typecheck/build | PASS | `tsc --noEmit` and production Vite build pass; existing warnings remain. |
| Frontend named suites | PASS | 99 distinct browser groups across six suites; 0 failed/skipped on corrected named runs. |
| Frontend aggregate `npm run test` | PASS | Final aggregate exited 0; all six suites passed, 99 groups, 0 failed/skipped. |
| Real Leader–Member integration | PASS | 19 groups passed, 0 failed/skipped with real ASP.NET Core, EF, PostgreSQL and separate Chrome sessions. |
| API request/response compatibility | PASS | Actual responses consumed by production frontend validators/UI for discovery, profiles, Invitations, Notifications and Project Detail. No mismatches found in exercised V1 paths. |
| Notification isolation/idempotency/rollback | PASS | 32 backend Notification tests pass; real browser run checks recipient isolation, read persistence, repeated reads, two sessions and mark-all history retention. |
| Candidate Pipeline | PASS | Actual position UUID filtering, null-position Leader, member links, reload and Archived fallback pass; mock suite covers selection/loading/empty/error states. |
| Matching V1 regression | PASS | 11 scorer tests pass; scorer file is byte-identical to HEAD; 40/30/20/10 factors and original normalization/eligibility remain. |
| Production deployment/origins | NOT RUN | Explicitly outside authorization. Local browser uses a loopback proxy to the real TestServer. |

## Commands and actual results

Backend commands ran in `tindy-backend-platform`:

```powershell
dotnet restore
dotnet build --no-restore
$env:TINDY_TEST_POSTGRES = 'Host=127.0.0.1;Port=55440;Database=postgres;Username=tindy_test_admin'
dotnet test Tindy.slnx --no-build --logger 'trx;LogFileName=release-verification.trx' --verbosity minimal
dotnet ef migrations has-pending-model-changes --project src/Tindy.Infrastructure --startup-project src/Tindy.Api --no-build -- --environment Development
git hash-object src/Tindy.Application/Services/PositionMatchScorer.cs
git rev-parse HEAD:src/Tindy.Application/Services/PositionMatchScorer.cs
```

| Backend check/subset | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Entire test assembly | 1006 | 1 | 2 |
| Notification classes | 32 | 0 | 0 |
| Project Invitation HTTP/concurrency classes | 35 | 0 | 0 |
| Teammate-prefixed classes | 22 | 0 | 0 |
| Notification/Teammate/Recruitment schema classes | 9 | 0 | 0 |
| PositionMatchScorerTests | 11 | 0 | 0 |
| Security + Authentication/OAuth integration classes | 131 | 1 | 0 |

Subsets overlap and are not additive. Full-suite duration was 3 minutes 20 seconds;
exit code 1. Restore, build and EF validation exited 0.

Frontend commands ran in `tindy-platform-frontend`:

| Command | Actual final named-run result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0. |
| `npm run build` | PASS, exit 0. |
| `npm run test` before fix | FAIL, missing script; 0 tests executed. |
| `npm run test` final aggregate | PASS, exit 0; 99 groups passed across six suites, 0 failed/skipped. |
| `npm run test:teammates` | 16 groups passed, 0 failed/skipped. |
| `npm run test:teammates:errors` | 15 groups passed, 0 failed/skipped. |
| `npm run test:teammates:regression` | 6 groups passed, 0 failed/skipped. |
| `npm run test:notifications` | 11 groups passed, 0 failed/skipped after deterministic fault-injection fix. |
| `npm run test:candidates:polish` | 7 groups passed, 0 failed/skipped. |
| `npm run test:profile` | 44 groups passed, 0 failed/skipped; 189 HTTP requests through local simulation. |
| `npm run test:release:integration` with the same `TINDY_TEST_POSTGRES` | 19 groups passed, 0 failed/skipped against real Backend/PostgreSQL. |

The requested repeated `test:teammates` is also run within the new aggregate.
Repeated runs are not counted as additional distinct coverage.
The six simulation suites have 99 distinct groups. The real-backend suite adds
19 groups: 118 distinct browser verification groups across both modes.

## Real Leader–Member end-to-end flow

The release host uses the existing `TindyApiFactory` and production controllers,
repositories, JWT service, EF mappings and exception handlers. Authentication
policies and repositories are not replaced. Synthetic onboarded accounts receive
real signed test JWTs. Login/registration/OAuth UI are not substituted for or
claimed by this account-seeded integration run.

Leader A and Member B have separate browser profiles and token stores. Decline,
Cancel, Expiry, terminal race, Position capacity, Project capacity and pagination
use independent fresh test cases/accounts/invitation IDs. The two-session read
case opens a third isolated browser session for the same Member.

| Requested primary step | Result |
| --- | --- |
| B initially has Opt-in OFF | PASS — actual owner Profile returns false. |
| A cannot invite opted-out B | PASS — feed excludes B; Send returns 404 `CANDIDATE_NOT_FOUND`; no notification created. |
| B enables Opt-in in Edit Profile | PASS — Settings link focuses existing checkbox; UI save is confirmed by backend Profile GET. |
| A discovers B | PASS — actual Find Teammates UI renders B's UUID and backend matching data. |
| A sends Invitation | PASS — UI confirmation creates a real pending Invitation. |
| B receives exactly one Notification | PASS — one `invitation_received` record; duplicate Send returns conflict without another event. |
| Bell shows unread count | PASS — Header/dropdown show 1 from backend; opening dropdown leaves `read_at` null. |
| B opens Notifications Page | PASS — View All navigation loads the actual inbox. |
| B clicks Notification | PASS — production View handler runs. |
| Notification is read | PASS — backend `read_at` becomes non-null and unread count becomes 0. |
| B sees actual Invitation | PASS — destination reloads Invitation History and Review shows the real Invitation UUID. |
| B accepts Invitation | PASS — Confirm Accept UI executes real API transition. |
| A receives Accepted Notification | PASS — one `invitation_accepted`; View resolves to actual Project Detail. |
| Membership updates | PASS — database has one active B membership assigned to the invited Position. |
| filled_count updates | PASS — exactly one counter increment. |
| Active shows B under correct Position | PASS — selected-position view contains B only; project-wide view contains A + B. |
| Notification state survives reload | PASS — row remains read, unread count stays 0, original `read_at` is preserved. |

Separate Decline is performed through Member UI and produces one Leader declined
notification with no membership. Separate Cancel is performed on another fresh
invitation. Opening its original received notification reloads `cancelled`; Review
offers no Accept action. Completed invitations are not reused for another terminal
business flow. Race tests start from a fresh pending invitation and assert the
losing request conflicts.

## Negative and edge cases

| Case | Result and evidence |
| --- | --- |
| Duplicate Invitation | PASS — real API rejects pending duplicate; one received event persists. |
| Concurrent Invitation actions | PASS — real Accept/Cancel race yields one 200 and one 409; exactly one terminal notification. |
| Expiry without Notification | PASS — isolated test control ages a pending Invitation consistently; real API returns `INVITATION_EXPIRED`; only original received event remains. |
| Position capacity | PASS — two fresh invitees race for last slot; one acceptance/counter/member and one `POSITION_UNAVAILABLE`. |
| Project capacity | PASS — different Positions race for last team slot; one acceptance and one `PROJECT_CAPACITY_EXCEEDED`. |
| Cancel before original notice click | PASS — actual cancelled status loads, no Accept control. |
| Two sessions read/unread | PASS — one session reads; the other refreshes from the real backend and clears its badge. |
| Repeated Mark as Read | PASS — original `read_at` remains identical; backend concurrency tests also pass. |
| Mark All | PASS — 24 genuine received/cancelled events paginate 20+4, become read and remain stored; repeat returns updated_count=0. |
| Request cutoff | PASS — backend PostgreSQL late/backdated-commit cutoff test and frontend late-arrival test ran successfully. Real browser Mark All retention also passes. |
| Unauthenticated requests | PASS — actual JWT API returns 401. |
| Inactive/incomplete accounts | PASS — current full backend gate theories return 403 on all four Notification endpoints and Invitation routes. |
| Cross-user notification access | PASS — guessed foreign UUID returns recipient-scoped 404. |
| Invalid Notification ID | PASS — unknown UUID and malformed route ID return 404. |
| Recipient query injection | PASS — unsupported recipient parameter returns 400; recipient always comes from claims. |
| Network failure | PASS — local proxy destroys one real browser HTTP request; UI shows retry and recovers against backend. |
| Hidden tab polling | PASS — registered interval is 60 seconds; controlled interval callback makes no request while hidden; return triggers a real request. |
| Logout during polling | PASS — delayed request is aborted; state is cleared and inbox disabled. |
| Account/cache switching | PASS — delayed old-account response cannot replace new account's 20 inbox rows. |
| Pagination | PASS — actual backend-generated notification history returns 20+4 unique rows; UI Next shows 4. |
| Opt-in OFF blocks new invites | PASS — both initial OFF and subsequent disable reject Send. |
| Candidate Archived | PASS — absent in actual UI; legacy URL is replaced with Shortlisted. |

Visibility and timer callbacks are controlled for deterministic verification; the
test does not sleep a full minute. Fetch is never replaced. Network faults and
latency are injected only at the test's local proxy, while normal requests use
real ASP.NET Core and PostgreSQL. The real run recorded **92 direct API checks**
and **245 browser HTTP requests**. No JWTs are written into its evidence file.

## Database and contract audit

Inspected source directly:

- `20261103042450_Profile_AddTeamInvitationOptIn`
- `20261103042556_Discovery_CreateTeammateRecruitmentTables`
- `20261105022808_Notification_CreateNotifications`
- `TindyDbContextModelSnapshot`, entity configurations, DTOs, transaction
  repositories, authorization handlers and frontend request/validation functions.

The database tests execute real PostgreSQL violations, rather than only checking
EF metadata. Verified restrictions include:

- Required notification recipient/invitation, nullable actor, JSONB payload,
  varchar(60) supported-type check, nullable TIMESTAMPTZ `read_at`.
- Unique `(invitation_id, type, recipient_user_id)`, recipient newest-first
  `(created_at DESC, notification_id DESC)`, unread partial index.
- Restrictive notification recipient/invitation deletion and nullable actor SetNull.
- Invitation pending uniqueness across Positions in a Project, composite Position /
  Project FK, distinct sender/recipient, elapsed 168-hour expiry and terminal
  timestamp/state constraints.
- Nullable member Position / Project composite FK; real acceptance maps PositionId
  into membership and existing Project Detail `position_id` without a new column.
- Invitation/Notification/membership transaction rollback tests pass. No expiry
  notification type, old-row backfill or notification retention worker exists.

Actual production frontend functions consumed the snake_case envelopes and
validated these responses in the real run:

| Contract | Compatibility |
| --- | --- |
| Find Teammates feed/cursor/scoring preview | PASS — `teammates-v1`, UUIDs, `rule-v1`, factors and safe preview. |
| Owner Profile PATCH/read | PASS — real boolean consent, dirty-only UI write and public/private boundary. |
| Send / accept / decline / cancel / Invitation History | PASS — actual UUID/status/timestamp fields and guarded actions. |
| Four Notification endpoints | PASS — item fields, `is_read`, `read_at`, count, updated_count, pagination. |
| Project Detail members | PASS — assigned Position UUID and nullable Leader Position. |

No V1 Backend/Frontend wire mismatch was found in exercised requests. Notification
payload has no `project_id`; the frontend correctly resolves accepted/declined
context through current-leader Projects and authorized Invitation History. This
is a lookup cost/fallback limitation, not an invented backend endpoint.

## Matching regression

The current and HEAD Git blob hashes for `PositionMatchScorer.cs` are identical:

```text
6a1735ba0533177c93da792f5fcec9a135033b6f
```

Source and 11 executed scorer cases confirm Required Skills 40%, Preferred Role
30%, Availability 20%, Optional Skills 10%; absent factors retain the original
weight redistribution, catalog-ID comparisons, one-time rounding and eligibility
rules. No AI, Experience or Difficulty factor was added. The actual browser feed
returned only the original four named factors.

## Issues, security assessment and release blockers

### Unresolved release blocker: CORS policy/test disagreement

`OAuthHttpContractTests.CorsPreflight_OnlyAllowsConfiguredOrigins_WithAuthorizationHeader`
fails at line 111 for allowed origin `http://localhost:8443`. The test expects no
`Access-Control-Allow-Credentials`; the existing `TindyFrontend` policy calls
`AllowCredentials()`. The allow-origin/header assertions before that failure
pass. The untrusted-origin theory passes.

This is not evidence that arbitrary origins can read private data. Recipient
isolation, JWT validation, active-account/onboarding gates and private preview
checks pass. It is an unresolved policy/test contract that keeps the full release
gate red. The existing chat HubConnection also uses default SignalR credential
behavior, so removing global CORS credentials blindly could alter another module.
Neither production CORS nor the failing assertion was silently changed.

Before release, choose/document the intended credentialed-origin behavior, align
the policy and regression test with that decision, validate affected cross-origin
clients, and rerun the backend suite. Until then the recommendation remains
**Needs Fixes**, even though the V1 integration flows are working and suitable for QA.

### Fixed audit/test infrastructure issues

- Initially `npm run test` did not exist. Added a default aggregate of the six V1
  browser suites and a separate opt-in real integration command.
- The first Notification suite attempt passed five groups, then a one-shot
  malformed-response fault was consumed by a StrictMode-aborted initial request;
  the UI's second request succeeded, so the test's expected Retry never remained
  visible. Injection now happens after a successful mount via an explicit inbox
  refresh. All 11 groups then passed without changing production UI behavior or
  weakening the malformed-response assertion.
- The first aggregate attempt also exposed the same cancellation race in the
  Candidate error-state test after its first five groups. The local mock now
  supports an explicit repeated outage, and Candidate loading/error cases retain
  that condition until the test deliberately restores the dependency before
  clicking Retry. No error/empty/loading assertion was removed or relaxed.
  The complete aggregate then passed all six suites and exited 0.
- Added a reproducible loopback-only release host scenario and real browser test.
  Test setup/control routes are confined to `tests/live-teammates-host`; they are
  not registered by the production API and do not target application databases.

## Changes made during this audit

Only frontend test infrastructure/package scripts and this report were changed:

1. `package.json` — adds `test` aggregate and `test:release:integration`.
2. `tests/notifications.browser.mjs` — deterministic post-mount malformed response injection.
3. `tests/live-teammates-host/Program.cs` — isolated release cases, read-only DB
   evidence and constrained pending-invitation expiry control.
4. `tests/release-integration.browser.mjs` — new real Backend/PostgreSQL browser suite.
5. `tests/candidates-polish.browser.mjs` — deterministic persistent-outage/retry checks.
6. `postman/mocks/tindy-project/handler.js` — optional repeat flag for test-only failures; default one-shot behavior preserved.
7. `postman/simulations/project-crud.context.yaml` — appends fresh audit evidence and preserves prior assumptions.
8. `FIND_TEAMMATES_RELEASE_VERIFICATION.md` — this report.

No production application code, matching weights, business guards, migration,
CORS policy or existing backend test was changed by this audit. Both repositories
already had uncommitted work when inspection started; that work was preserved.

## Unexecuted checks and environmental limits

- The two existing opt-in ClamAV live tests were skipped by their test attributes;
  no scanner service was enabled for this task. No scanner pass is claimed.
- PostgreSQL 17 was used on an isolated loopback cluster with randomly named
  disposable databases; Docker/PostgreSQL 16 and production database compatibility
  were not newly exercised here.
- The legacy six-group `test:teammates:live` command was not run separately; the
  new nineteen-group real integration suite uses the same actual host/factory and
  covers the broader requested release flow.
- No production HTTPS ingress, public hosting, real OAuth provider, real email /
  push / websocket transport or load/performance test was executed. These are not
  claimed by the local tests.
- Existing Vite future-native-config and large-bundle warnings remain non-fatal.

## Evidence locations

- Backend current-run TRX:
  `../tindy-backend-platform/tests/Tindy.Tests/TestResults/release-verification.trx`
- Actual frontend/backend/DB browser evidence:
  `.tmp-release-verification/evidence.json`
- Real host log and screenshot:
  `.tmp-release-verification/host.log`,
  `.tmp-release-verification/screenshots/release-candidate-pipeline.png`
- Aggregate frontend run:
  `.tmp-release-verification/frontend-tests.log`
- First aggregate attempt, retained for the test-harness investigation:
  `.tmp-release-verification/frontend-tests-first-aggregate.log`
- Individual simulation artifacts:
  `.tmp-notifications-results`, `.tmp-candidates-polish`, existing Teammates and
  `.tmp-profile-verification` result directories.

Generated evidence is local and ignored. Source test scripts/report remain
reviewable. Evidence JSON and host logs were scanned for JWT-shaped values and
none were found. The temporary PostgreSQL cluster was stopped and removed after
the database/live runs; disposable fixture databases were cleaned up by the host.
No production state was modified.
