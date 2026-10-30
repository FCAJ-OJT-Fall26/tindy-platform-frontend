import { useCallback } from "react"
import { Link, useParams } from "react-router"
import { useTindy } from "../../store"
import { ProjectForm } from "../../components/projects/ProjectForm"
import useRemoteResource from "../../hooks/useRemoteResource"
import { getProjectByIdApi, mapProjectDetailToUiProject } from "../../services/projects.service"
import { projectErrorMessage } from "../../services/projectEditor.service"

export function CreateProject() {
  const { id } = useParams()
  const { authUser } = useTindy()
  const load = useCallback((signal: AbortSignal) => getProjectByIdApi(id!, signal), [id])
  const detail = useRemoteResource(id ? `${authUser?.user_id}:${id}` : null, load)
  if (!id) return <ProjectForm key={authUser?.user_id} mode="create" />
  if (detail.loading) return <div className="info-banner" role="status">Loading project for editing…</div>
  if (detail.error) return <div className="info-banner" role="alert">{projectErrorMessage(detail.error)} <button onClick={detail.reload}>Retry</button> <Link to="/leader">Back to projects</Link></div>
  if (!detail.data) return null
  if (detail.data.leader.user_id !== authUser?.user_id || detail.data.status === "archived")
    return <div className="info-banner" role="alert">Only the leader can edit an active project. <Link to="/leader">Back to projects</Link></div>
  return <ProjectForm key={`${authUser?.user_id}:${id}`} mode="edit" initialProject={mapProjectDetailToUiProject(detail.data)} initialDetail={detail.data} />
}

export default CreateProject
