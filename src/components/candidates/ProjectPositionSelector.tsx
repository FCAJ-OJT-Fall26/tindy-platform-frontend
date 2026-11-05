import { Link } from "react-router"
import type useTeammateProjectContext from "../../hooks/useTeammateProjectContext"
import { teammateErrorMessage } from "../../services/teammates.service"

export default function ProjectPositionSelector({
  context,
  projectId,
  positionId,
  onChange,
  disabled = false,
  management = false,
}: {
  context: ReturnType<typeof useTeammateProjectContext>
  projectId: string
  positionId: string
  onChange: (project: string, position: string) => void
  disabled?: boolean
  management?: boolean
}) {
  const leading = context.projects.data?.leading_projects ?? []
  const options = management
    ? leading
    : leading.filter((p) => p.status === "recruiting")
  const positions = context.project?.positions ?? []
  return (
    <section
      className="panel teammate-context"
      aria-label="Project and position selection"
    >
      <div className="form-grid">
        <label className="field">
          Project you lead
          <select
            aria-label="Teammate project"
            value={projectId}
            disabled={
              disabled || context.projects.loading || !!context.projects.error
            }
            onChange={(e) => onChange(e.target.value, "")}
          >
            <option value="">Choose your project</option>
            {projectId && !options.some((p) => p.project_id === projectId) && (
              <option value={projectId}>
                {context.project?.name ?? projectId} (selected context)
              </option>
            )}
            {options.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.name} · {p.current_team_size}/{p.max_team_capacity} members
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Position
          <select
            aria-label="Teammate position"
            value={positionId}
            disabled={
              disabled ||
              !context.project ||
              context.detail.loading ||
              !!context.detail.error
            }
            onChange={(e) => onChange(projectId, e.target.value)}
          >
            <option value="">Choose a position</option>
            {positions.map((p) => (
              <option
                key={p.position_id}
                value={p.position_id}
                disabled={
                  !management &&
                  (p.status !== "open" || p.filled_count >= p.required_count)
                }
              >
                {p.title} · {Math.max(0, p.required_count - p.filled_count)}{" "}
                slots · {p.status}
              </option>
            ))}
          </select>
        </label>
      </div>
      {context.projects.loading && (
        <p role="status">Loading projects you lead…</p>
      )}
      {Boolean(context.projects.error) && (
        <p role="alert">
          {teammateErrorMessage(context.projects.error)}{" "}
          <button className="text-link" onClick={context.projects.reload}>
            Retry projects
          </button>
        </p>
      )}
      {!context.projects.loading &&
        !context.projects.error &&
        options.length === 0 && (
          <p>
            No {management ? "led" : "recruiting"} projects available.{" "}
            <Link to="/create-project">Create a project</Link>
          </p>
        )}
      {context.detail.loading && <p role="status">Loading positions…</p>}
      {Boolean(context.detail.error) && (
        <p role="alert">
          {teammateErrorMessage(context.detail.error)}{" "}
          <button className="text-link" onClick={context.detail.reload}>
            Retry selected project
          </button>
        </p>
      )}
      {context.project && (
        <p className="helper-text">
          {context.project.name} ·{" "}
          {context.position?.title ?? "Select a position"} ·{" "}
          {context.project.current_team_size}/
          {context.project.max_team_capacity} members
        </p>
      )}
      {!management &&
        context.blocker &&
        !context.detail.loading &&
        !context.detail.error && <p role="status">{context.blocker}</p>}
      {!management &&
        context.project &&
        positions.every(
          (p) => p.status !== "open" || p.filled_count >= p.required_count,
        ) && (
          <p>
            No open positions with capacity.{" "}
            <Link to={`/project/${projectId}/edit`}>Manage positions</Link>
          </p>
        )}
    </section>
  )
}
