import { useCallback } from "react"
import useRemoteResource from "./useRemoteResource"
import useTeammateSession from "./useTeammateSession"
import { getProjectByIdApi } from "../services/projects.service"
import { getMemberProfile } from "../services/profile.service"
import type { ProjectInvitationDto } from "../types/invitation"
import type { ProjectDetailDto } from "../types/project"

export default function useInvitationLabels(rows: ProjectInvitationDto[]) {
  const session = useTeammateSession()
  const projects = [...new Set(rows.map((r) => r.project_id))].sort().join(",")
  const users = [
    ...new Set(rows.flatMap((r) => [r.inviting_leader_id, r.invited_user_id])),
  ]
    .sort()
    .join(",")
  const load = useCallback(
    async (signal: AbortSignal) => {
      const result: {
        projects: Record<string, ProjectDetailDto>
        people: Record<string, string>
      } = { projects: {}, people: {} }
      // Only this page is hydrated; four concurrent reads at most. Failed details never erase history.
      const jobs = [
        ...projects
          .split(",")
          .filter(Boolean)
          .map((id) => async () => {
            try {
              const p = await getProjectByIdApi(id, signal)
              if (p.project_id === id) result.projects[id] = p
            } catch {
              /* use stable UUID fallback */
            }
          }),
        ...users
          .split(",")
          .filter(Boolean)
          .map((id) => async () => {
            try {
              const p = await getMemberProfile(id, signal)
              if (p.user_id === id) result.people[id] = p.display_name
            } catch {
              /* use stable UUID fallback */
            }
          }),
      ]
      let next = 0
      await Promise.all(
        Array.from({ length: Math.min(4, jobs.length) }, async () => {
          while (next < jobs.length && !signal.aborted) await jobs[next++]()
        }),
      )
      return result
    },
    [projects, users],
  )
  return useRemoteResource(
    session.key && rows.length ? `${session.key}:${projects}:${users}` : null,
    load,
  )
}
