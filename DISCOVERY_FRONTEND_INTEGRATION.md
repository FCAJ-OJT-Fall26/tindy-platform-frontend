# Tindy V1 frontend integration — 2026-10-30

Implemented sequentially: STEP 01 deadline → STEP 02 live discovery → STEP 03 saved/skipped/applications → STEP 04 Leader review → STEP 05 regression checks. TypeScript/build and the relevant integration checks were run at each checkpoint.

## Visibility follow-up requested by the user

The user asked to keep unfinished features visible to understand the product. This overrides the earlier V1 hiding decision: Candidates, Messages, Notifications (including the Header bell), Team Workspace, Invited, Find Teammates and the Leader sample shortlist/chat panels are now accessible through normal navigation, without manually adding `?demo=1`. Unconnected workflows have explicit Demo preview labels. Invited includes a sample review/accept/decline preview that never creates membership. Find Teammates opens the existing labelled demo with a direct link back to live projects. Dashboard New arrivals is restored using the backend `new_projects` feed bucket, preserving its order.

Live Project CRUD, Discovery scores, Save/Skip and Applications still use their Backend contracts. No APIs or backend schema changed in this follow-up. Recruitment browser checks were updated for visible, labelled previews instead of blocked routes.

## Runtime behavior

- **Find Projects visual refresh:** the live route has a balanced filter/card/Match Inspector layout, a wider Project card, accessible SVG score rings and progress bars using the exact Backend factors. It no longer nests a `main` element inside the application `main` (which previously added page padding/min-height to the card column). The layout uses three columns on wide screens, two on tablet and filter/insight controls on mobile. New styles are scoped to live Discovery; mock teammate cards retain their presentation. Apply/Save/Skip contracts and confirmation semantics are unchanged.

- **Data-source follow-up:** Find Projects always uses the Backend feed, including legacy `?demo=1` project links and switching back from Find Teammates. Only teammate modes (`mode=teammates`, `candidates`, `leader`) render the labelled mock-candidate view. A project API error never falls back to sample cards. Mock Projects are no longer imported by the discovery router.

- Create/Edit retains the existing wizard, drafts, dirty guards and duplicate-POST/unknown-outcome reconciliation. Deadlines use the current Vietnam calendar day, 7/14/30 presets and Custom Date (minimum tomorrow). Untouched expired edit deadlines are omitted rather than silently extended.
- Production Discovery uses `/api/discovery/projects`, page size 20 and opaque cursors, preserving backend ordering and deduplicating IDs. Filters use real catalog UUIDs. Refresh resets the snapshot. Requests are cancelled/scoped to account and filters.
- Scores, positional slots, rule factors, matched/missing skills and explanation come from Backend `rule-v1`. Null factors remain unknown. No LLM calls or frontend scoring are used for live matching. Dashboard recommendations use this same feed.
- Left persists Skip; Up persists Save; Undo persists the inverse before changing the stack. Saved state is caller-scoped API state. Old localStorage flags are not a production source.
- Right opens Apply Modal without a POST. Explicit confirmation chooses a real open Position UUID and creates an application. A ref lock prevents repeated confirmation; uncertain outcomes offer a GET reconciliation action, never an automatic second POST.
- Project Detail reuses Apply Modal and checks owner, active membership, pending history, deadline, capacity and open slots. Backend remains authoritative if eligibility changes during submission.
- My Applications preserves every historical application row. Withdraw and immediate Apply Again after rejected/withdrawn use Backend; the same Position is allowed. A pending row blocks all other Positions in that Project. Leading one's own Project does not block joining another.
- Leader Workspace shows real pending counts and per-project application links. `/project/:id/applications` provides Position/status filters, match/newest sorting, pagination, applied-position score, safe profile links and confirmed Accept/Reject. Conflicts refresh server data; team membership is never added optimistically.
- Candidate discovery, invitations, messages, notifications and Team Workspace remain visible as labelled demo previews at the user's request. Find Teammates uses sample candidates; Find Projects always uses Backend Rule-Based matching. Existing AI Profile tools remain.

## Backend contract checked

Compared with the sibling backend `docs/api/DISCOVERY_API.md`, `PROJECT_API.md`, DTOs, controllers and application services/repository. Existing Bearer session, onboarding redirect, ApiError and response-envelope handling are reused.

| Method | Endpoint | Consumer |
| --- | --- | --- |
| POST / PUT | `/api/projects`, `/api/projects/{project_id}` | Existing editor plus `recruitment_closing_date` |
| GET | `/api/discovery/projects?limit=20&cursor=...&category=...&role_id=...&skill_id=...` | Discovery and Dashboard |
| GET | `/api/me/discovery/saved?page=...&page_size=50` | Saved projects / shared bookmarks |
| PUT / DELETE | `/api/me/discovery/saved/{project_id}` | Save / Unsave / Undo |
| PUT / DELETE | `/api/me/discovery/skipped/{project_id}` | Skip / Undo |
| POST | `/api/projects/{project_id}/applications` | Confirm Apply, body `{ position_id, message }` |
| GET | `/api/me/project-applications?page=...&page_size=50` | History / eligibility / reconciliation |
| POST | `/api/me/project-applications/{application_id}/withdraw` | Withdraw pending |
| GET | `/api/projects/{project_id}/applications?position_id=...&status=...&sort_by=...&page=...&page_size=20` | Leader review |
| POST | `/api/projects/{project_id}/applications/{application_id}/accept` | Confirm Accept |
| POST | `/api/projects/{project_id}/applications/{application_id}/reject` | Confirm Reject |
| GET | `/api/projects/{project_id}`, `/api/me/projects` | Project details / confirmed membership / pending counts |
| GET | `/api/catalog/professional-roles`, `/api/catalog/skills` | Actual filter/Position UUIDs |
| GET | `/api/users/{user_id}/profile`, `/profile/experiences`, `/profile/certificates` | Existing authorized member Profile screen |

There is no GET skipped-list endpoint in the implemented Backend contract, so none was invented. Standalone match is also absent: cards and application reviews already include the rule breakdown. Direct Project Detail links offer Discovery when there is no account-scoped feed breakdown.

## Changed files

New services/types/hooks:

- `src/services/recruitmentDeadline.ts`
- `src/services/discovery.service.ts`
- `src/services/applications.service.ts`
- `src/types/application.ts`
- `src/hooks/useDiscoveryFeed.ts`
- `src/hooks/useMyApplications.ts`

New screens/components:

- `src/components/discovery/RuleMatchPanel.tsx`
- `src/components/discovery/MatchScoreRing.tsx`
- `src/components/projects/ApplyModal.tsx`
- `src/pages/discovery/LiveDiscoveryView.tsx`
- `src/pages/discovery/live-discovery.css`
- `src/pages/projects/MyApplicationsView.tsx`
- `src/pages/projects/SavedProjectsView.tsx`
- `src/pages/leader/ProjectApplicationsScreen.tsx`

Updated existing implementation:

- `src/types/project.ts`, `src/types/discovery.ts`, `src/data.ts`
- `src/services/projects.service.ts`, `src/services/projectEditor.service.ts`
- `src/hooks/useMyProjects.ts`, `src/store.tsx`
- `src/components/projects/ProjectForm.tsx`, `SaveConfirmDialog.tsx`, `ProjectCardContent.tsx`
- `src/components/discovery/SwipeCardStack.tsx`
- `src/pages/discovery/SwipeDiscoveryView.tsx`
- `src/pages/projects/ProjectDetailScreen.tsx`, `MyProjectsScreen.tsx`
- `src/pages/leader/LeaderDashboardScreen.tsx`
- `src/pages/overview/DashboardScreen.tsx`
- `src/components/ui.tsx`, `src/utils/useExplanation.tsx`
- `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `Header.tsx`

Tests / local stand-ins:

- `package.json` adds `test:recruitment`.
- New `tests/recruitment-harness.mjs`, `tests/recruitment.browser.mjs`.
- Updated `tests/projects.browser.mjs`, `projects-fixture.mjs`, `discovery-actions.browser.mjs`, `save-button.browser.mjs`.
- Updated `postman/mocks/tindy-project/handler.js`, `postman/mocks/profile/default.js`, `postman/simulations/project-crud.context.yaml`.
- The pre-existing untracked `CODEX_FRONTEND_PROMPT.md` was left untouched.

## Verification

Executed results:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; existing config/chunk warnings remain |
| `npm run test:projects` | 27 passed, HTTP Postman simulation |
| `npm run test:recruitment` | 19 passed, HTTP Postman simulation |
| `npm run test:auth` | 58 passed, HTTP fixtures |
| `npm run test:onboarding` | 41 passed, intercepted fixtures |
| `npm run test:profile` | 44 passed, HTTP Postman simulation |
| `npm run test:profile-media` | 64 passed, 651 HTTP calls, Postman simulation |
| `npm run test:save-button` | 7 passed, intercepted fixtures |
| `npm run test:discovery-actions` | 9 current HTTP browser checks passed: live actions/feedback, mock teammate mode, switching/Back/Forward, legacy demo URLs and error-without-mock-fallback |
| `git diff --check` | Passed; line-ending notices only |

Logs are in `.tmp-project-results/final-*.log` and `step05-recruitment.log`. The latest live/mock separation checks are in `live-projects-discovery-actions.log` (9 passed) and `live-projects-recruitment.log` (19 passed), using the local HTTP Postman simulation. The old mock-Project interest/modal and in-place mode animation cases were replaced with the real confirmation flow and cross-mode data-source checks. Early animation-test failures were corrected by awaiting confirmed card transitions. The media stand-in was extended for the shared GET Saved read; no production fallback was added.

Recruitment covers server-only scores and unknown factors, 70-item cursor feed, real filter UUIDs/cursor reset, mobile overflow, no fallback on errors, button and physical swipe gestures, confirmation/cancel, single POST on double click, Skip/Save inverse APIs, immediate same-Position reapply after both terminal states with distinct IDs/history, applied-position review score, profile/experience/certificate routes, Reject confirmation, Accept capacity conflict, confirmed team/slot changes, active-member block, review pagination/sort, committed POST with lost response, account isolation and explicit demo gating.

Project checks cover deadline presets/custom validation/draft retention, existing create/edit/Position workflows, partial-write retry, committed create with lost response (one POST), archive failure/success and auth/draft preservation.

Screenshots taken and visually inspected: `.tmp-project-results/screenshots/discovery-desktop.png`, `discovery-mobile.png`, `leader-applications.png`. Screenshots use synthetic test accounts/projects and are not evidence of live database execution.

Visual refresh verification also covers a long Project title, a desktop card at least 460px wide, actual factor percentages in accessible progress bars, no nested application `main`, mobile filter/insight controls, and no horizontal overflow at 390px and 1024px. Additional inspected screenshots: `discovery-mobile-card.png`, `discovery-mobile-filters.png`, `discovery-tablet.png`. Regression evidence is in `.tmp-project-results/discovery-redesign-recruitment.log` (19 checks) and `discovery-redesign-discovery-actions.log` (9 checks), through local HTTP Postman simulation. The refresh changes presentation only; there is no new endpoint, matching calculation or migration.

## Match explanation and Project Detail refresh

- `RuleMatchPanel.tsx` now shares the graphical Match Inspector between Discovery and the Project Detail sidebar. The full explanation groups the server score, Position, factor percentages/weights/points and matched/missing skill chips. Unknown factors remain excluded rather than becoming synthetic zero percentages.
- New shared `src/components/discovery/rule-match.css` owns the score ring, inspector and explanation dialog styles. `MatchScoreRing.tsx` imports these styles directly, so opening Project Detail without first visiting Discovery still loads its presentation.
- New scoped `src/pages/projects/project-detail.css` improves headings, readable body text, Position cards, sidebar spacing and responsive stacking. Project Detail has a Details action for its account-scoped Discovery match; a direct URL without match data retains the existing honest Discovery link.
- `Modal` accepts an optional scoped class and includes native disclosure summaries in its keyboard focus trap. Explanation dialogs in Discovery, Project Detail, applied-Position review and the existing server-match drawer use the same styling. Other dialogs retain their existing appearance.
- Verified desktop/mobile overflow, actual server factor values, keyboard Tab/Space disclosure use, opening full Match details from Project Detail and returning to the feed. Visually inspected `match-details-desktop.png`, `match-details-mobile.png`, `project-detail-match-desktop.png` and `project-detail-match-mobile.png` under `.tmp-project-results/screenshots/` (synthetic test data).
- Current regression results: Recruitment **19 passed**, Discovery actions **9 passed**, Project CRUD **27 passed**, through the local HTTP Postman simulation. Logs: `.tmp-project-results/match-detail-recruitment.log`, `match-detail-discovery-actions.log`, `match-detail-projects.log`. TypeScript and production build logs: `match-detail-typecheck.log`, `match-detail-build.log`.
- This refresh introduces no endpoint, API contract, score calculation or database migration change.

## Practical limits / deployment

- No Backend source or database schema changed in this frontend task. No new EF migration was created or applied here. The Backend's V1 deadline/interaction/application migrations must already be applied to the target environment.
- HTTP browser tests use a local Postman stand-in, not a live .NET/PostgreSQL deployment. Onboarding and animation tests use intercepted test fixtures. They establish frontend request/UI behavior, not the actual Backend matching algorithm or PostgreSQL overbooking guarantees.
- No API mock fallback is included in production. Unreachable/unsupported Backend responses remain explicit errors/disabled controls.
- Backend has no application idempotency-key contract. A lost response is reconciled using caller history and known IDs; ambiguous/no result remains blocked from blind reposting in that browser session. This is not a universal guarantee across reloads, devices or concurrent identical attempts.
- Member history contains IDs only; the UI hydrates unique Projects through the existing detail endpoint and displays honest unavailable/ID states on missing Projects.
- Vite still reports the pre-existing native-config compatibility warnings and the bundle-size warning. Deployment/code splitting was outside this change.
