import { useCallback, useEffect } from "react"
import { useTindy } from "../store"
import { getMyProjectsApi, getProjectByIdApi, mapProjectDetailToUiProject } from "../services/projects.service"
import useRemoteResource from "./useRemoteResource"
import { APPLICATIONS_CHANGED_EVENT } from "../services/applications.service"

export default function useMyProjects() {
  const { authUser } = useTindy()
  const load = useCallback(async (signal: AbortSignal) => {
    const membership = await getMyProjectsApi(signal)
    const ids = [...new Set([...membership.leading_projects, ...membership.joined_projects].map(project => project.project_id))]
    const details = await Promise.all(ids.map(id => getProjectByIdApi(id, signal)))
    return { ...membership, projects: details.map(detail => mapProjectDetailToUiProject(detail)) }
  }, [])
  const resource = useRemoteResource(authUser?.is_onboarding_completed ? authUser.user_id : null, load)
  useEffect(() => {
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, resource.reload)
    return () => window.removeEventListener(APPLICATIONS_CHANGED_EVENT, resource.reload)
  }, [resource.reload])
  return resource
}
