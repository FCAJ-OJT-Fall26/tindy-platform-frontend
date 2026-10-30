import { useCallback } from "react"
import { useTindy } from "../store"
import { getMyProjectsApi, getProjectByIdApi, mapProjectDetailToUiProject } from "../services/projects.service"
import useRemoteResource from "./useRemoteResource"

export default function useMyProjects() {
  const { authUser } = useTindy()
  const load = useCallback(async (signal: AbortSignal) => {
    const membership = await getMyProjectsApi(signal)
    const ids = [...new Set([...membership.leading_projects, ...membership.joined_projects].map(project => project.project_id))]
    const details = await Promise.all(ids.map(id => getProjectByIdApi(id, signal)))
    return { ...membership, projects: details.map(detail => mapProjectDetailToUiProject(detail)) }
  }, [])
  return useRemoteResource(authUser?.is_onboarding_completed ? authUser.user_id : null, load)
}
