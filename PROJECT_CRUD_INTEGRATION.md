# Project CRUD frontend integration

Implemented against the existing Tindy Project/Position endpoints. Backend source,
database schema, migrations, authentication client and OAuth flows are unchanged.
No runtime dependency or state management library was added.

## Resolved issues

1. **Create/edit failures:** removed local-save fallback and fabricated success.
   Mutations use the shared authenticated API client. Inputs remain on failure,
   errors include ProblemDetails/field validation, controls disable during saving,
   and a synchronous guard prevents double submission. Account-scoped drafts and
   confirmed IDs survive session expiry in this tab's sessionStorage. Drafts never
   enter the real Project collection. Navigation occurs only after the saved
   state is fetched and checked.
2. **Catalog identity:** Role/Skill options retain their actual catalog UUIDs.
   Removed name reconstruction, first-item substitution and hardcoded GUIDs.
   Unavailable selections are shown and block saving; catalog failures support
   explicit reload. Existing Position Roles are read-only.
3. **Team accuracy:** creation sends `initial_team_size: 1`; current members are
   read-only and come from the server on edit/detail. Maximum capacity has its own
   input, and preview uses that capacity rather than inventing members.
   Dashboard/detail openings count actual open Position vacancies independently
   of maximum team capacity.
4. **Position/Skill editing:** the form and standalone Position manager share
   synchronization helpers. Changed metadata uses PUT Project; additions, changes,
   removals and skill requirement changes use the appropriate Position/Skill APIs.
   Unchanged entities do not issue mutations. Confirmed newly created IDs remain
   attached to the draft for retry, including deletion of a Position created
   earlier in the same edit.
5. **Service results:** invalid Project/Position/Skill IDs throw explicit errors.
   Removed synthetic DTOs, timestamp-based server IDs and skipped deletes.
6. **Ownership:** Leader Dashboard and My Projects use `/api/me/projects` and
   `leading_projects`; Project Detail checks `leader.user_id`. Display names and
   mock IDs grant no management permissions. Loading, retry and genuine empty
   collections are distinct.
7. **UUID identity:** Workspace cards, saved IDs and related callbacks use strings.
   API lists replace server snapshots and retain `project_id`; matching names do
   not collapse different Projects. Selecting a real card opens its UUID detail.
   Saved Projects remain local bookmarks; their current details are fetched by ID.
8. **Archive:** confirmation says Archive Project, duplicate requests are blocked,
   and active lists change only after successful DELETE confirmation. A failed
   archive keeps the card. Successful archive refetches the membership list.
9. **Types/source of truth:** removed public Leader email. Creation Position
   description remains optional. Real Projects are memory-only API data, fetched
   when Project screens need them; legacy local Project JSON is never loaded as a
   fallback. Discovery samples require explicit `/discover?demo=1`; real discovery
   loads API Projects and navigates by UUID. Matching scores are shown as
   unavailable for API Projects rather than fabricating a result.

## Final flows

**Three-step creation:** only one creation panel is shown at a time: The big
picture → People & skills → Commitment & review. Continue validates the current
step with errors beside its fields. Forward step navigation validates earlier
steps; Back preserves inputs. The active step and draft survive refresh. Publish
appears only in the last step, alongside a summary and the existing full preview.
Moving between steps makes no Project mutations. Mobile keeps the action bar
above bottom navigation and uses the preview button instead of the sidebar.
The existing edit screen retains direct access to its sections.

**Create:** validate loaded active catalogs and form fields → confirmation → save
the pre-create membership snapshot → authenticated POST with one initial member
and nested Positions/Skills → retain returned UUID → fetch detail and map nested
Position UUIDs → verify saved fields → update in-memory display and navigate to
Leader Workspace with the existing success modal.

**Edit:** fetch detail and check ownership before mounting the form → retain
Project/Position/Role/Skill IDs → confirm → fetch current state → PUT changed
Project information → sequentially create/update Positions, upsert added/changed
Skills and delete removed Skills → delete removed Positions → fetch detail and
verify the requested result → success navigation. Position Role is never silently
changed or implemented with automatic delete/recreate.

**Partial failure/retry:** keep pending form input, show that some changes may be
saved, refresh server context, and retry by comparing the pending draft against a
fresh server snapshot. Confirmed Position IDs prevent duplicate POSTs. No rollback
or transaction across independent HTTP requests is claimed.

**Unknown POST outcome:** a lost response may follow a committed write. Create
retry checks new owned Projects against the complete attempted request; Position
retry checks the saved Position snapshot. A unique matching result is reused.
If there is no unique confirmed result, automatic POST is blocked and the form
offers checking the saved state. The API has no idempotency-key contract, so an
unresolved/ambiguous outcome requires reviewing My Projects/saved Positions before
starting a fresh creation. This also bounds recovery for concurrent identical
creates; the frontend cannot provide a distributed exactly-once guarantee.

**Archive:** confirm → authenticated DELETE → remove confirmed archived UUID from
active memory/display → refetch `/api/me/projects`. Failure keeps the visible row
and offers refresh/retry.

## Contract assumptions

- Existing routes, snake_case JSON and `{ success, message, data }` envelopes are
  preserved. ProblemDetails may include `error_code` and field `errors`.
- Public Leader fields are `user_id`, `display_name`, `avatar_url`, `initials`.
- Catalog endpoints return active Professional Roles/Skills with persistent UUIDs.
- New Projects contain exactly their Leader initially; `current_team_size` is the
  actual active membership count. Maximum capacity is separate.
- PUT Project does not update Positions. PUT Position does not accept `role_id`.
- Adding an existing Position Skill updates its `is_required` value.
- Project DELETE archives it and closes its Positions. It does not physically
  delete the Project.
- No Saved Projects, Applications, invitations or matching API was invented.
  Existing interest/bookmark interactions remain local and do not claim delivery
  of a real application/notification.

## Verification

The Project browser suite runs the real React app, routing, shared API client and
HTTP requests through a local stateful Postman simulation. Its stand-in is derived
from the sibling backend DTOs/controllers/services inspected for this task. No
owner workspace lookup or publication was needed for this local contract fixture.

| Command | Executed result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; Vite configuration compatibility and >500 kB chunk warnings remain |
| `npm run test:projects` | 26 checks passed, including the three-step creation follow-up |
| `npm run test:auth` | 58 checks passed |
| `npm run test:onboarding` | 41 checks passed |
| `npm run test:profile` | 44 checks passed |
| `npm run test:profile-media` | 64 checks passed |
| `npm run test:save-button` | 7 checks passed |
| `npm run test:discovery-actions` | Suite passed |

Project checks include 400/network failures without fake saves, missing catalog
IDs, double submit, preserved drafts on 401, immutable Roles, partial edit retry,
Position/Skill CRUD, a committed create with a lost response, archive failure,
same-name/different-UUID Projects, ownership and refresh/navigation behavior.
Desktop/mobile form screenshots are generated under `.tmp-project-results/`.
The three-step follow-up reran typecheck, build and the Project browser suite;
the other regression results above were executed during the CRUD integration.

Existing UI-only fixtures now provide Project UUID responses or explicitly enter
demo discovery. Their checks await asynchronous state rather than relying on a
fixed animation delay or completion order between independent Profile GETs.

These results establish frontend behavior against the local stand-ins. A live
backend/PostgreSQL end-to-end run, production configuration and real concurrent
edits remain unverified. The full modified-file list follows.

## Modified files

- `PROJECT_CRUD_INTEGRATION.md`
- `package.json`
- `postman/mocks/tindy-project/config.yaml`
- `postman/mocks/tindy-project/handler.js`
- `postman/simulations/project-crud.context.yaml`
- `postman/simulations/project-crud.sim.yaml`
- `src/components/discovery/LiveAiInspector.tsx`
- `src/components/projects/FullPreviewDialog.tsx`
- `src/components/projects/LeaderPositionManagerModal.tsx`
- `src/components/projects/ProjectCardContent.tsx`
- `src/components/projects/ProjectForm.tsx`
- `src/components/projects/SkillPickerDialog.tsx`
- `src/components/projects/WorkspaceProjectDetailModal.tsx`
- `src/components/ui.tsx`
- `src/data.ts`
- `src/data/projectsData.ts`
- `src/hooks/useMyProjects.ts`
- `src/index.css`
- `src/pages/discovery/SwipeDiscoveryView.tsx`
- `src/pages/index.ts`
- `src/pages/leader/LeaderDashboardScreen.tsx`
- `src/pages/overview/DashboardScreen.tsx`
- `src/pages/overview/OverviewScreen.tsx`
- `src/pages/projects/CreateProjectScreen.tsx`
- `src/pages/projects/MyProjectsScreen.tsx`
- `src/pages/projects/ProjectDetailScreen.tsx`
- `src/pages/projects/WorkspaceProjectsScreen.tsx`
- `src/services/projectEditor.service.ts`
- `src/services/projects.service.ts`
- `src/store.tsx`
- `src/types/discovery.ts`
- `src/types/project.ts`
- `tests/discovery-actions.browser.mjs`
- `tests/profile.browser.mjs`
- `tests/projects-fixture.mjs`
- `tests/projects-workspace.tsx`
- `tests/projects.browser.mjs`
- `tests/save-button.browser.mjs`
