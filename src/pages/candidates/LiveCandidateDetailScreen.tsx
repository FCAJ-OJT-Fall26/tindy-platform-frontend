import { useCallback, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import LiveCandidateDetail from "../../components/candidates/LiveCandidateDetail"
import SendInvitationModal from "../../components/candidates/SendInvitationModal"
import ProjectPositionSelector from "../../components/candidates/ProjectPositionSelector"
import useTeammateProjectContext from "../../hooks/useTeammateProjectContext"
import { isGuid } from "../../services/projects.service"
import { useTindy } from "../../store"
import type { MemberProfileResponse } from "../../types/profile"
import "../discovery/live-teammates.css"

export default function LiveCandidateDetailScreen() {
  const { id = "" } = useParams()
  const [params, setParams] = useSearchParams()
  const project = params.get("project_id") ?? "",
    position = params.get("position_id") ?? ""
  const context = useTeammateProjectContext(project, position)
  const [invite, setInvite] = useState(false)
  const [identity, setIdentity] = useState<{ key: string; name: string } | null>(null)
  const identityKey = `${context.key}:${id}`
  const loaded = useCallback((profile: MemberProfileResponse) => setIdentity({ key: identityKey, name: profile.display_name }), [identityKey])
  const { notify } = useTindy()
  if (!isGuid(id))
    return (
      <div className="panel" role="alert">
        Invalid candidate UUID.{" "}
        <Link to="/candidates">Back to Candidate Pipeline</Link>
      </div>
    )
  return (
    <div className="live-teammates">
      <header className="teammate-heading">
        <h1>Candidate Profile</h1>
        <Link
          className="text-link"
          to={`/candidates?project_id=${project}&position_id=${position}`}
        >
          Back to Candidate Pipeline
        </Link>
      </header>
      <LiveCandidateDetail key={identityKey} userId={id} onLoaded={loaded} />
      <p className="helper-text">
        Position Match is available in the ranked discovery feed for a selected
        Project and Position. A profile has no permanent Match Score.
      </p>
      <ProjectPositionSelector
        context={context}
        projectId={project}
        positionId={position}
        disabled={invite}
        onChange={(p, s) => {
          const next = new URLSearchParams()
          if (p) next.set("project_id", p)
          if (s) next.set("position_id", s)
          setParams(next)
          setInvite(false)
        }}
      />
      <button
        className="btn-primary"
        disabled={!!context.blocker || id === context.userId}
        onClick={() => setInvite(true)}
      >
        Send Invitation
      </button>
      {invite && context.project && context.position && (
        <SendInvitationModal
          key={`${context.key}:${project}:${position}:${id}`}
          projectId={project}
          positionId={position}
          userId={id}
          candidateName={identity?.key === identityKey ? identity.name : id}
          projectName={context.project.name}
          positionName={context.position.title}
          blocker={context.blocker}
          onClose={() => setInvite(false)}
          onConfirmed={(row) => {
            setInvite(false)
            notify(`Invitation confirmed: ${row.status}.`)
          }}
        />
      )}
    </div>
  )
}
