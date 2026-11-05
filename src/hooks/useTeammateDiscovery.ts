import { useCallback, useEffect, useRef, useState } from "react"
import useTeammateSession from "./useTeammateSession"
import { getTeammateCandidates } from "../services/teammates.service"
import type {
  CandidateAction,
  TeammateCandidateCardDto,
  TeammateCandidateQuery,
} from "../types/teammate"

type FeedState = {
  key: string | null
  items: TeammateCandidateCardDto[]
  cursor: string | null
  scoredAt: string | null
  hasMore: boolean
  loading: boolean
  error: unknown
}
export default function useTeammateDiscovery(
  projectId: string,
  positionId: string,
  query: TeammateCandidateQuery,
  enabled: boolean,
) {
  const session = useTeammateSession()
  const serialized = JSON.stringify(query)
  const key =
    enabled && session.key
      ? `${session.key}:${projectId}:${positionId}:${serialized}`
      : null
  const scope = useRef(key)
  scope.current = key
  const request = useRef(0)
  const busy = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const [state, setState] = useState<FeedState>({
    key: null,
    items: [],
    cursor: null,
    scoredAt: null,
    hasMore: false,
    loading: false,
    error: null,
  })
  const latest = useRef(state)
  latest.current = state
  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!key) return
      controller.current?.abort()
      const active = new AbortController()
      controller.current = active
      const generation = ++request.current
      busy.current = true
      setState((old) => ({
        key,
        items: append && old.key === key ? old.items : [],
        cursor,
        scoredAt: append && old.key === key ? old.scoredAt : null,
        hasMore: append && old.key === key ? old.hasMore : false,
        loading: true,
        error: null,
      }))
      try {
        const page = await getTeammateCandidates(
          projectId,
          positionId,
          JSON.parse(serialized),
          cursor,
          active.signal,
        )
        if (
          active.signal.aborted ||
          scope.current !== key ||
          generation !== request.current
        )
          return
        const previous = latest.current
        if (append && previous.key === key && previous.scoredAt && Date.parse(previous.scoredAt) !== Date.parse(page.scored_at)) throw Error("The candidate snapshot changed during pagination. Refresh the feed.")
        setState((old) => ({
          key,
          items: [
            ...new Map(
              [
                ...(append && old.key === key ? old.items : []),
                ...page.items,
              ].map((card) => [card.candidate.user_id.toLowerCase(), card]),
            ).values(),
          ],
          cursor: page.next_cursor,
          scoredAt: page.scored_at,
          hasMore: page.has_more,
          loading: false,
          error: null,
        }))
      } catch (error) {
        if (
          !active.signal.aborted &&
          scope.current === key &&
          generation === request.current
        )
          setState((old) => ({ ...old, loading: false, error }))
      } finally {
        if (generation === request.current) busy.current = false
      }
    },
    [key, projectId, positionId, serialized],
  )
  useEffect(() => {
    void fetchPage(null, false)
    return () => {
      controller.current?.abort()
      request.current++
      busy.current = false
    }
  }, [fetchPage])
  const loadMore = useCallback(() => {
    const s = latest.current
    if (!busy.current && s.key === key && s.hasMore)
      void fetchPage(s.cursor, true)
  }, [key, fetchPage])
  const refresh = useCallback(() => {
    void fetchPage(null, false)
  }, [fetchPage])
  const remove = useCallback(
    (id: string) =>
      setState((old) =>
        old.key === key
          ? {
              ...old,
              items: old.items.filter((c) => c.candidate.user_id !== id),
            }
          : old,
      ),
    [key],
  )
  const setAction = useCallback(
    (id: string, action: CandidateAction | null) => {
      request.current++
      controller.current?.abort()
      busy.current = false
      setState((old) =>
        old.key === key
          ? {
              ...old,
              loading: false,
              items: old.items.map((c) =>
                c.candidate.user_id === id
                  ? { ...c, interaction_action: action }
                  : c,
              ),
            }
          : old,
      )
    },
    [key],
  )
  const matches = key !== null && state.key === key
  return {
    key,
    items: matches ? state.items : [],
    scoredAt: matches ? state.scoredAt : null,
    loading: !!key && (!matches || state.loading),
    error: matches ? state.error : null,
    hasMore: matches && state.hasMore,
    loadMore,
    refresh,
    remove,
    setAction,
  }
}
