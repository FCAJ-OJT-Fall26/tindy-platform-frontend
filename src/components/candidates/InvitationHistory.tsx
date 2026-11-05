import { useEffect, useState } from "react"
import { Link } from "react-router"
import { ArrowUpRight, ChevronLeft, ChevronRight, Mail, RefreshCw } from "lucide-react"
import useInvitationHistory from "../../hooks/useInvitationHistory"
import useInvitationLabels from "../../hooks/useInvitationLabels"
import useTeammateSession from "../../hooks/useTeammateSession"
import { invitationStatuses } from "../../services/invitations.service"
import { teammateErrorMessage } from "../../services/teammates.service"
import { useTindy } from "../../store"
import ProjectInvitationReviewModal from "../projects/ProjectInvitationReviewModal"
import PipelineState from "./PipelineState"
import type {
  InvitationStatus,
  ProjectInvitationDto,
} from "../../types/invitation"

export default function InvitationHistory({
  mode,
  projectId = "",
  positionId = "",
}: {
  mode: "member" | "leader"
  projectId?: string
  positionId?: string
}) {
  const session = useTeammateSession()
  const [status, setStatus] = useState<InvitationStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ProjectInvitationDto | null>(null)
  const history = useInvitationHistory(
    mode,
    projectId,
    positionId,
    status,
    page,
  )
  const labels = useInvitationLabels(history.data?.items ?? [])
  const { notify } = useTindy()
  const loaded = !history.loading && !history.error ? history.data : null
  useEffect(() => {
    setPage(1)
    setSelected(null)
  }, [session.key, projectId, positionId])
  const names = (row: ProjectInvitationDto) => {
    const project = labels.data?.projects[row.project_id]
    const personId =
      mode === "member" ? row.inviting_leader_id : row.invited_user_id
    return {
      projectName: project?.name ?? row.project_id,
      positionName:
        project?.positions.find((p) => p.position_id === row.position_id)
          ?.title ?? row.position_id,
      personName: labels.data?.people[personId] ?? personId,
    }
  }
  return (
    <section
      className="pipeline-section pipeline-invitations"
      aria-label={
        mode === "member"
          ? "My Project Invitations"
          : "Leader Invitation History"
      }
    >
      <div className="pipeline-section-heading">
        <div className={mode === "member" ? "member-invitation-heading" : undefined}>
          {mode === "member" && <span className="member-invitation-heading-icon" aria-hidden="true"><Mail size={19} strokeWidth={1.7} /></span>}
          <div>
            <h2>Project invitations</h2>
            <p>{mode === "leader" ? "Follow your invitations and responses. Pending invitations don't reserve a place." : "Review invitations and choose your next team."}</p>
          </div>
        </div>
        {loaded && loaded.pagination.total_items > 0 && <span className="pipeline-count">{loaded.pagination.total_items} invitations</span>}
      </div>
      <div className="teammate-toolbar pipeline-invitation-toolbar">
        <label className="field">
          Invitation status
          <select
            aria-label="Invitation status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as InvitationStatus | "all")
              setPage(1)
            }}
          >
            <option value="all">All statuses</option>
            {invitationStatuses.map((s) => (
              <option value={s} key={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary"
          disabled={history.loading}
          onClick={history.reload}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Refresh invitations
        </button>
      </div>
      {history.loading && <PipelineState kind="loading" description="Loading invitation history…" />}
      {Boolean(history.error) && (
        <PipelineState kind="error" title="Invitations couldn't be loaded" description={teammateErrorMessage(history.error)}>
          <button className="btn-secondary" onClick={history.reload}>Retry invitations</button>
        </PipelineState>
      )}
      {loaded?.items.length === 0 && (
          <PipelineState
            icon={Mail}
            title="No invitations in this view"
            description={status !== "all" ? "There are no invitations with this status. Try another filter to see more." : mode === "leader" ? "Invite someone from Find Teammates to start building your team. Their response will appear here." : "When a project leader invites you to their team, you can review and respond here."}
          >
            {status !== "all" ? (
              <button className="btn-secondary" onClick={() => { setStatus("all"); setPage(1) }}>Show all invitations</button>
            ) : mode === "leader" ? (
              <Link className="btn-secondary" to={`/discover?mode=teammates&project_id=${projectId}${positionId ? `&position_id=${positionId}` : ""}`}>
                Find teammates <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </PipelineState>
        )}
      {labels.loading && (
        <p className="helper-text" role="status">
          Loading names. Invitation records remain available below.
        </p>
      )}
      <div className="teammate-records">
        {loaded?.items.map((row) => {
          const n = names(row)
          return (
            <article
              className="panel teammate-record pipeline-invitation-card"
              key={row.invitation_id}
              data-invitation-id={row.invitation_id}
            >
              <div className="teammate-heading">
                <h3>{n.projectName}</h3>
                <span className={`teammate-status pipeline-status--${row.status}`}>{row.status}</span>
              </div>
              <p>Position: {n.positionName}</p>
              {mode === "leader" && <p className="helper-text">Original sender: {labels.data?.people[row.inviting_leader_id] ?? row.inviting_leader_id}</p>}
              <p>
                {mode === "member" ? "Leader" : "Member"}: {n.personName}
              </p>
              <p className="pipeline-invitation-message">
                {row.message ?? "No message included."}
              </p>
              <p className="helper-text">
                Created {new Date(row.created_at).toLocaleString()} · Expires{" "}
                {new Date(row.expires_at).toLocaleString()}
              </p>
              <p className="helper-text">
                Updated {new Date(row.updated_at).toLocaleString()}
                {row.responded_at
                  ? ` · Responded ${new Date(row.responded_at).toLocaleString()}`
                  : ""}
              </p>
              {!labels.loading && !labels.data?.projects[row.project_id] && (
                <p className="helper-text">
                  Project details are unavailable. This historical invitation is preserved
                  for your review.
                </p>
              )}
              <div className="teammate-actions pipeline-card-actions">
                <button
                  className="btn-primary"
                  onClick={() => setSelected(row)}
                >
                  Review invitation
                </button>
                {mode === "leader" && (
                  <Link
                    className="text-link"
                    to={`/candidate/${row.invited_user_id}?project_id=${row.project_id}&position_id=${row.position_id}`}
                  >
                    View member
                  </Link>
                )}
                {row.status === "accepted" && mode === "member" && (
                  <Link className="text-link" to="/projects?tab=Active">
                    View actual My Projects membership
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {loaded && loaded.pagination.total_pages > 1 && (
        <nav className="teammate-pages pipeline-pages" aria-label="Invitation pages">
          <button
            className="btn-secondary"
            disabled={history.loading || !loaded.pagination.has_previous}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} aria-hidden="true" /> Previous invitations
          </button>
          <span>
            Page {loaded.pagination.current_page} of {loaded.pagination.total_pages}
          </span>
          <button
            className="btn-secondary"
            disabled={history.loading || !loaded.pagination.has_next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next invitations <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
      {selected && (
        <ProjectInvitationReviewModal
          key={`${session.key}:${selected.invitation_id}`}
          mode={mode}
          invitation={selected}
          {...names(selected)}
          onClose={() => setSelected(null)}
          onRefresh={history.reload}
          onConfirmed={(row) => {
            setSelected(null)
            history.reload()
            notify(`Invitation status confirmed: ${row.status}.`)
          }}
        />
      )}
    </section>
  )
}
