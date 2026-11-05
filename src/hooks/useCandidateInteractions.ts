import { useCallback, useEffect } from "react"
import useRemoteResource from "./useRemoteResource"
import useTeammateSession from "./useTeammateSession"
import {
  CANDIDATE_INTERACTIONS_CHANGED_EVENT,
  getCandidateInteractions,
} from "../services/teammates.service"
import type { CandidateAction } from "../types/teammate"

export default function useCandidateInteractions(
  project: string,
  position: string,
  action: CandidateAction,
  page: number,
  enabled: boolean,
) {
  const session = useTeammateSession()
  const load = useCallback(
    (signal: AbortSignal) =>
      getCandidateInteractions(
        project,
        position,
        { action, page, page_size: 20 },
        signal,
      ),
    [project, position, action, page],
  )
  const key =
    enabled && session.key
      ? `${session.key}:${project}:${position}:${action}:${page}`
      : null
  const resource = useRemoteResource(key, load)
  useEffect(() => {
    window.addEventListener(
      CANDIDATE_INTERACTIONS_CHANGED_EVENT,
      resource.reload,
    )
    return () =>
      window.removeEventListener(
        CANDIDATE_INTERACTIONS_CHANGED_EVENT,
        resource.reload,
      )
  }, [resource.reload])
  return { ...resource, key }
}
