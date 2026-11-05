import { useCallback, useEffect } from "react"
import useRemoteResource from "./useRemoteResource"
import useTeammateSession from "./useTeammateSession"
import {
  getMyProjectsApi,
  getProjectByIdApi,
  isGuid,
} from "../services/projects.service"
import { sameId } from "../services/teammates.service"
import { APPLICATIONS_CHANGED_EVENT } from "../services/applications.service"

export default function useTeammateProjectContext(
  projectId: string,
  positionId: string,
) {
  const session = useTeammateSession()
  const projects = useRemoteResource(session.key, getMyProjectsApi)
  const loadProject = useCallback(
    async (signal: AbortSignal) => {
      const project = await getProjectByIdApi(projectId, signal)
      if (
        !sameId(project.project_id, projectId) ||
        !session.userId ||
        !sameId(project.leader.user_id, session.userId)
      )
        throw Error("Only the actual project leader can manage candidates.")
      if (
        !Array.isArray(project.positions) ||
        !Array.isArray(project.team_members)
      )
        throw Error("Project context is incomplete.")
      if (
        typeof project.is_recruitment_open !== "boolean" ||
        !Number.isFinite(Date.parse(project.recruitment_closes_at)) ||
        !Number.isInteger(project.current_team_size) ||
        !Number.isInteger(project.max_team_capacity) ||
        project.positions.some(
          (p) =>
            !isGuid(p.position_id) ||
            (p.project_id && !sameId(p.project_id, projectId)),
        )
      )
        throw Error("Project recruitment context could not be verified.")
      return project
    },
    [projectId, session.userId],
  )
  const detail = useRemoteResource(
    session.key && isGuid(projectId) ? `${session.key}:${projectId}` : null,
    loadProject,
  )
  const project = detail.data
  useEffect(() => {
    const changed = () => {
      detail.reload()
      projects.reload()
    }
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, changed)
    return () => {
      window.removeEventListener(APPLICATIONS_CHANGED_EVENT, changed)
    }
  }, [detail.reload, projects.reload])
  const position =
    project?.positions.find((p) => sameId(p.position_id, positionId)) ?? null
  const blocker = !projectId
    ? "Choose a project you lead."
    : detail.loading
      ? "Loading selected project…"
      : detail.error
        ? "Project context could not be verified."
        : !project
          ? "Project unavailable."
          : project.status !== "recruiting" ||
              !project.is_recruitment_open ||
              Date.now() >= Date.parse(project.recruitment_closes_at)
            ? "This project is not open for new invitations."
            : project.current_team_size >= project.max_team_capacity
              ? "The project team is full."
              : !positionId
                ? "Choose an open position."
                : !position
                  ? "This position does not belong to the selected project."
                  : position.status !== "open" ||
                      position.filled_count >= position.required_count
                    ? "This position is closed or full."
                    : null
  return { ...session, projects, detail, project, position, blocker }
}
