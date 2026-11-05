import { useCallback, useEffect } from "react"
import useRemoteResource from "./useRemoteResource"
import useTeammateSession from "./useTeammateSession"
import {
  getMyProjectInvitations,
  getProjectInvitations,
  INVITATIONS_CHANGED_EVENT,
} from "../services/invitations.service"
import { sameId } from "../services/teammates.service"
import type { InvitationStatus } from "../types/invitation"

export default function useInvitationHistory(
  mode: "leader" | "member",
  project: string,
  position: string,
  status: InvitationStatus | "all",
  page: number,
  enabled = true,
) {
  const session = useTeammateSession()
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data =
        mode === "leader"
          ? await getProjectInvitations(
              project,
              {
                position_id: position || undefined,
                status,
                page,
                page_size: 20,
              },
              signal,
            )
          : await getMyProjectInvitations(
              { project_id: project || undefined, status, page, page_size: 20 },
              signal,
            )
      if (
        !session.userId ||
        (mode === "member" && data.items.some(row => !sameId(row.invited_user_id, session.userId!)))
      )
        throw Error("Invitation history returned a different account.")
      // The leader endpoint authorizes the CURRENT project leader. Historical
      // inviting_leader_id records the original sender and may be different.
      return data
    },
    [mode, project, position, status, page, session.userId],
  )
  const resource = useRemoteResource(
    enabled && session.key
      ? `${session.key}:${mode}:${project}:${position}:${status}:${page}`
      : null,
    load,
  )
  useEffect(() => {
    const refresh = () => resource.reload()
    window.addEventListener(INVITATIONS_CHANGED_EVENT, refresh)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener(INVITATIONS_CHANGED_EVENT, refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [resource.reload])
  return resource
}
