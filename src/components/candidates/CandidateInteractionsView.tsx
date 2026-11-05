import { useEffect, useState } from "react"
import { Link } from "react-router"
import { ArrowUpRight, Bookmark, ChevronLeft, ChevronRight, ListChecks, SkipForward } from "lucide-react"
import useCandidateInteractions from "../../hooks/useCandidateInteractions"
import useCandidateAction from "../../hooks/useCandidateAction"
import { teammateErrorMessage } from "../../services/teammates.service"
import type { CandidateAction } from "../../types/teammate"
import PipelineState from "./PipelineState"

const presentation = {
  shortlisted: {
    title: "Shortlisted candidates",
    description: "Your top picks for this position, ready for the next step.",
    empty: "Shortlist people from Find Teammates to keep your top picks together.",
    icon: ListChecks,
  },
  saved: {
    title: "Saved candidates",
    description: "People you'd like to come back to when building your team.",
    empty: "Save people from Find Teammates to review their profiles later.",
    icon: Bookmark,
  },
  skipped: {
    title: "Skipped candidates",
    description: "Revisit people you've passed on for this position.",
    empty: "People you skip in Find Teammates will appear here. You can reset your decision anytime.",
    icon: SkipForward,
  },
}

export default function CandidateInteractionsView({
  projectId,
  positionId,
  action,
  onInvite,
  disabled,
}: {
  projectId: string
  positionId: string
  action: CandidateAction
  disabled: boolean
  onInvite: (user: string, name: string) => void
}) {
  const [page, setPage] = useState(1)
  const interactions = useCandidateInteractions(
    projectId,
    positionId,
    action,
    page,
    true,
  )
  const mutation = useCandidateAction(interactions.key, projectId, positionId)
  const view = presentation[action]
  const loaded = !interactions.loading && !interactions.error ? interactions.data : null
  useEffect(() => setPage(1), [projectId, positionId, action])
  return (
    <section className="pipeline-section" aria-label="Stored candidate interactions">
      <div className="pipeline-section-heading">
        <div><h2>{view.title}</h2><p>{view.description}</p></div>
        {loaded && loaded.pagination.total_items > 0 && <span className="pipeline-count">{loaded.pagination.total_items} candidates</span>}
      </div>
      {interactions.loading && <PipelineState kind="loading" description="Loading stored candidates…" />}
      {Boolean(interactions.error) && (
        <PipelineState kind="error" title="Candidates couldn't be loaded" description={teammateErrorMessage(interactions.error)}>
          <button className="btn-secondary" onClick={interactions.reload}>Retry candidates</button>
        </PipelineState>
      )}
      {mutation.error && (
        <p role="alert">
          {mutation.error}
          {mutation.uncertain && (
            <button
              disabled={mutation.busy}
              onClick={async () => { if (await mutation.check()) interactions.reload() }}
            >
              Check stored action
            </button>
          )}
        </p>
      )}
      <div className="teammate-records">
        {loaded?.items.map((row) => (
          <article
            className="panel teammate-record pipeline-person-card"
            key={row.candidate_user_id}
            data-candidate-id={row.candidate_user_id}
          >
            <div className="pipeline-person-heading">
              <span className="pipeline-avatar" aria-hidden="true">{row.candidate?.display_name?.slice(0, 1) ?? "?"}</span>
              <div className="pipeline-person-info">
                <h3>{row.candidate?.display_name ?? "Candidate preview unavailable"}</h3>
                <p>{row.candidate?.headline ?? "No headline available."}</p>
              </div>
              <span className="teammate-status">{row.action}</span>
            </div>
            {!row.is_discoverable && (
              <p className="helper-text">
                This candidate is currently unavailable for discovery.
                You can still review their profile or reset your decision.
              </p>
            )}
            <div className="teammate-actions pipeline-card-actions">
              <Link
                className="text-link"
                to={`/candidate/${row.candidate_user_id}?project_id=${projectId}&position_id=${positionId}`}
              >
                View candidate profile <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <button
                className="btn-secondary"
                disabled={mutation.busy || mutation.uncertain}
                onClick={async () => {
                  if (await mutation.mutate(row.candidate_user_id, null))
                    interactions.reload()
                }}
              >
                Reset interaction
              </button>
              {row.is_discoverable && (
                <button
                  className="btn-primary"
                  disabled={disabled || mutation.busy || mutation.uncertain}
                  onClick={() =>
                    onInvite(
                      row.candidate_user_id,
                      row.candidate?.display_name ?? row.candidate_user_id,
                    )
                  }
                >
                  Send Invitation
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {loaded?.items.length === 0 && (
          <PipelineState icon={view.icon} title={`No ${action} candidates for this position.`} description={view.empty}>
            <Link className="btn-secondary" to={`/discover?mode=teammates&project_id=${projectId}&position_id=${positionId}`}>
              Find teammates <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </PipelineState>
        )}
      {loaded && loaded.pagination.total_pages > 1 && (
        <nav
          className="teammate-pages pipeline-pages"
          aria-label="Candidate interaction pages"
        >
          <button
            className="btn-secondary"
            disabled={
              mutation.busy ||
              interactions.loading ||
              !loaded.pagination.has_previous
            }
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={14} aria-hidden="true" /> Previous candidates
          </button>
          <span>
            Page {loaded.pagination.current_page} of {loaded.pagination.total_pages}
          </span>
          <button
            className="btn-secondary"
            disabled={
              mutation.busy ||
              interactions.loading ||
              !loaded.pagination.has_next
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Next candidates <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  )
}
