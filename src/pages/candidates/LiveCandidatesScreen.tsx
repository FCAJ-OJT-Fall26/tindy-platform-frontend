import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ArrowUpRight, BriefcaseBusiness, ChevronLeft, ChevronRight, FolderOpen, Inbox, LoaderCircle, RefreshCw, Users } from "lucide-react"
import useTeammateProjectContext from "../../hooks/useTeammateProjectContext"
import useRemoteResource from "../../hooks/useRemoteResource"
import { getProjectApplications } from "../../services/applications.service"
import { teammateErrorMessage } from "../../services/teammates.service"
import { isGuid } from "../../services/projects.service"
import { sameId } from "../../services/teammates.service"
import { useTindy } from "../../store"
import ProjectPositionSelector from "../../components/candidates/ProjectPositionSelector"
import CandidateInteractionsView from "../../components/candidates/CandidateInteractionsView"
import InvitationHistory from "../../components/candidates/InvitationHistory"
import SendInvitationModal from "../../components/candidates/SendInvitationModal"
import PipelineState from "../../components/candidates/PipelineState"
import type { CandidateAction } from "../../types/teammate"
import "../discovery/live-teammates.css"

const tabs = [
  "Interested",
  "Shortlisted",
  "Saved",
  "Invited",
  "Active",
  "Skipped",
]
function Interested({
  project,
  position,
  sessionKey,
}: {
  project: string
  position: string
  sessionKey: string
}) {
  const [page, setPage] = useState(1)
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data = await getProjectApplications(
        project,
        {
          position_id: position || undefined,
          status: "pending",
          sort_by: "newest",
          page,
          page_size: 20,
        },
        signal,
      )
      if (
        data.items.some(
          (r) =>
            r.application.project_id !== project ||
            (position && r.application.position_id !== position) ||
            r.application.status !== "pending",
        )
      )
        throw Error("Application context could not be confirmed.")
      return data
    },
    [project, position, page],
  )
  const resource = useRemoteResource(
    `${sessionKey}:${project}:${position}:${page}`,
    load,
  )
  const loaded = !resource.loading && !resource.error ? resource.data : null
  useEffect(() => {
    if (loaded && page > Math.max(1, loaded.pagination.total_pages))
      setPage(Math.max(1, loaded.pagination.total_pages))
  }, [loaded, page])
  return (
    <section className="pipeline-applications" aria-label="Interested applicants">
      <div className="pipeline-applications-heading">
        <div>
          <h2>Interested applicants</h2>
          <p>Review people who have applied to join your project.</p>
        </div>
        {loaded && loaded.pagination.total_items > 0 && (
          <span className="pipeline-applications-count">{loaded.pagination.total_items} pending</span>
        )}
      </div>
      {resource.loading && (
        <div className="panel pipeline-applications-state" role="status">
          <LoaderCircle size={22} className="pipeline-applications-spinner" aria-hidden="true" />
          <p>Loading interested applicants…</p>
        </div>
      )}
      {Boolean(resource.error) && (
        <div className="panel pipeline-applications-state pipeline-applications-error" role="alert">
          <h3>Applications couldn't be loaded</h3>
          <p>{teammateErrorMessage(resource.error)}</p>
          <button type="button" className="btn-secondary" onClick={resource.reload}>Retry applications</button>
        </div>
      )}
      {loaded && loaded.items.length > 0 && <div className="teammate-records">
        {loaded.items.map((row) => (
          <article
            className="panel teammate-record"
            key={row.application.application_id}
          >
            <h3>{row.applicant.display_name}</h3>
            <p>{row.applied_position.title} · pending Application</p>
            <p>{row.matching.match_score}% Position Match · rule-v1</p>
            <Link className="text-link" to={`/project/${project}/applications`}>
              Review application
            </Link>
          </article>
        ))}
      </div>}
      {loaded && loaded.items.length === 0 && (
        <div className="panel pipeline-applications-state pipeline-applications-empty">
          <span className="pipeline-applications-icon"><Inbox size={24} aria-hidden="true" /></span>
          <h3>No pending applications yet</h3>
          <p>{position ? "New applications for this position will appear here for you to review." : "New applications to your project will appear here for you to review."}</p>
          <Link className="btn-secondary" to={`/discover?mode=teammates&project_id=${project}${position ? `&position_id=${position}` : ""}`}>
            Find teammates <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
      {loaded && loaded.pagination.total_pages > 1 && (
        <nav className="teammate-pages pipeline-applications-pages" aria-label="Application pages">
          <button
            type="button"
            className="btn-secondary"
            disabled={
              resource.loading || !loaded.pagination.has_previous
            }
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Previous applications
          </button>
          <span>Page {page} of {loaded.pagination.total_pages}</span>
          <button
            type="button"
            className="btn-secondary"
            disabled={resource.loading || !loaded.pagination.has_next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next applications
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  )
}
export default function LiveCandidatesScreen() {
  const screenRef = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const project = params.get("project_id") ?? "",
    position = params.get("position_id") ?? ""
  const tab = tabs.includes(params.get("tab") ?? "")
    ? params.get("tab")!
    : "Shortlisted"
  useEffect(() => {
    if (params.get("tab") === "Archived") {
      const next = new URLSearchParams(params)
      next.set("tab", "Shortlisted")
      setParams(next, { replace: true })
    }
  }, [params, setParams])
  const context = useTeammateProjectContext(project, position)
  const { notify } = useTindy()
  const [invite, setInvite] = useState<{ user: string; name: string } | null>(
    null,
  )
  const selected =
    !!context.project && !context.detail.error && !context.detail.loading
  const historyContext = tab === "Invited" && isGuid(project) && (!position || isGuid(position))
  const needsPosition = ["Shortlisted", "Saved", "Skipped"].includes(tab)
  const invalidPosition = Boolean(position) && (!isGuid(position) || (selected && !context.position))
  const members = context.project?.team_members.filter(m => !position || sameId(m.position_id ?? "", position)) ?? []
  const focusSelection = (field: "project" | "position") => {
    screenRef.current?.querySelector<HTMLSelectElement>(`select[aria-label="Teammate ${field}"]`)?.focus()
  }
  const update = (p: string, s: string) => {
    const next = new URLSearchParams(params)
    if (p) next.set("project_id", p)
    else next.delete("project_id")
    if (s) next.set("position_id", s)
    else next.delete("position_id")
    setInvite(null)
    setParams(next)
  }
  return (
    <div className="live-teammates candidate-pipeline" ref={screenRef}>
      <header className="teammate-heading">
        <div>
          <h1>Candidate Pipeline</h1>
          <p>Track interested applicants, invitations and active teammates for each project.</p>
        </div>
        <Link
          className="btn btn-primary"
          to={`/discover?mode=teammates&project_id=${project}&position_id=${position}`}
        >
          Find Teammates
        </Link>
      </header>
      <ProjectPositionSelector
        management
        context={context}
        projectId={project}
        positionId={position}
        disabled={!!invite}
        onChange={update}
      />
      <nav
        className="teammate-tabs"
        role="tablist"
        aria-label="Candidate pipeline"
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set("tab", t)
              setParams(next)
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      {!project ? (
        <PipelineState kind="prompt" icon={FolderOpen} title="Select a project to get started" description="Choose a project you lead above to view applicants, invitations and team members.">
          <button type="button" className="btn-secondary" disabled={context.projects.loading || Boolean(context.projects.error)} onClick={() => focusSelection("project")}>
            Choose project
          </button>
        </PipelineState>
      ) : !isGuid(project) ? (
        <PipelineState kind="error" icon={FolderOpen} title="Project couldn't be selected" description="Choose a valid project you lead from the selector above.">
          <button type="button" className="btn-secondary" disabled={context.projects.loading || Boolean(context.projects.error)} onClick={() => focusSelection("project")}>Choose project</button>
        </PipelineState>
      ) : invalidPosition ? (
        <PipelineState kind="error" icon={BriefcaseBusiness} title="Position isn't available" description="Choose a position from the selected project to continue.">
          <button type="button" className="btn-secondary" disabled={!selected} onClick={() => focusSelection("position")}>Choose position</button>
        </PipelineState>
      ) : !selected && !historyContext ? (
        context.detail.loading ? <PipelineState kind="loading" description="Loading your project…" /> :
        context.detail.error ? (
          <PipelineState kind="error" icon={FolderOpen} title="Project couldn't be loaded" description="This project may be unavailable or you may no longer have access. Try again or choose another project.">
            <div className="pipeline-prompt-actions">
              <button type="button" className="btn-secondary" onClick={context.detail.reload}><RefreshCw size={14} aria-hidden="true" /> Try again</button>
              <button type="button" className="btn-secondary" disabled={context.projects.loading || Boolean(context.projects.error)} onClick={() => focusSelection("project")}>Choose project</button>
            </div>
          </PipelineState>
        ) : (
          <PipelineState kind="prompt" icon={FolderOpen} title="Select a project to get started" description="Choose a project you lead above to open its candidate pipeline.">
            <button type="button" className="btn-secondary" disabled={context.projects.loading || Boolean(context.projects.error)} onClick={() => focusSelection("project")}>Choose project</button>
          </PipelineState>
        )
      ) : needsPosition && !context.position ? (
        <PipelineState kind="prompt" icon={BriefcaseBusiness} title="Choose a position to view candidates" description="Select a position above to see the people you've shortlisted, saved or skipped for that role.">
          <button type="button" className="btn-secondary" onClick={() => focusSelection("position")}>Choose position</button>
        </PipelineState>
      ) : (
        <div key={`${context.key}:${project}:${position}:${tab}`}>
          {needsPosition && (
            <CandidateInteractionsView
              projectId={project}
              positionId={position}
              action={tab.toLowerCase() as CandidateAction}
              disabled={!!context.blocker}
              onInvite={(user, name) => setInvite({ user, name })}
            />
          )}
          {tab === "Invited" && (
            <>
              {!selected && <p className="helper-text">Project details are unavailable. Recorded invitations remain below.</p>}
              <InvitationHistory
                mode="leader"
                projectId={project}
                positionId={position}
              />
            </>
          )}
          {tab === "Interested" && (
            <Interested
              project={project}
              position={position}
              sessionKey={context.key!}
            />
          )}
          {tab === "Active" && (
            <section className="pipeline-section">
              <div className="pipeline-section-heading">
                <div>
                  <h2>Active members {members.length > 0 && <span className="pipeline-count">{members.length}</span>}</h2>
                  <p>{position ? `Members assigned to ${context.position?.title}.` : "All active project members, including the Project Leader."}</p>
                </div>
                <button className="btn-secondary" onClick={context.detail.reload}>
                  <RefreshCw size={14} aria-hidden="true" /> Refresh membership
                </button>
              </div>
              <div className="teammate-records pipeline-member-grid">
                {members.map((m) => (
                  <article className="panel teammate-record pipeline-person-card" key={m.user_id}>
                    <div className="pipeline-person-heading">
                      <span className="pipeline-avatar" aria-hidden="true">{m.initials || m.display_name.slice(0, 1)}</span>
                      <div className="pipeline-person-info">
                        <h3>{m.display_name}</h3>
                        <p>{m.role_title}{m.is_leader ? " · Project Leader" : ""}</p>
                      </div>
                    </div>
                    <p className="helper-text">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                    <div className="pipeline-card-actions">
                      <Link className="text-link" to={`/users/${m.user_id}`}>
                        View member profile <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              {members.length === 0 && (
                <PipelineState icon={Users} title={position ? "No active members assigned to this position." : "No active members in this Project."} description="Members appear here once an application is approved or a team invitation is accepted.">
                  <Link className="btn-secondary" to={`/discover?mode=teammates&project_id=${project}${position ? `&position_id=${position}` : ""}`}>
                    Find teammates <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </PipelineState>
              )}
            </section>
          )}
        </div>
      )}
      {invite && context.project && context.position && (
        <SendInvitationModal
          key={`${context.key}:${project}:${position}:${invite.user}`}
          projectId={project}
          positionId={position}
          userId={invite.user}
          candidateName={invite.name}
          projectName={context.project.name}
          positionName={context.position.title}
          blocker={context.blocker}
          onClose={() => setInvite(null)}
          onConfirmed={(row) => {
            setInvite(null)
            notify(
              `Invitation confirmed: ${row.status}. Position: ${context.project?.positions.find((p) => p.position_id === row.position_id)?.title ?? row.position_id}.`,
            )
            const next = new URLSearchParams(params)
            next.set("tab", "Invited")
            next.set("position_id", row.position_id)
            setParams(next)
          }}
        />
      )}
    </div>
  )
}
