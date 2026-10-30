import { useCallback, useEffect, useRef, useState } from "react"
import { useTindy } from "../store"
import { getDiscoveryProjects } from "../services/discovery.service"
import type { DiscoveryCardDto, DiscoveryQuery } from "../types/discovery"

export default function useDiscoveryFeed(query: DiscoveryQuery = {}) {
  const { authUser } = useTindy()
  const queryKey = JSON.stringify(query)
  const key = authUser?.is_onboarding_completed ? `${authUser.user_id}:${queryKey}` : null
  const scope = useRef(key); scope.current = key
  const request = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const [state, setState] = useState<{ key: string | null; items: DiscoveryCardDto[]; cursor: string | null; hasMore: boolean; loading: boolean; error: unknown }>(
    { key: null, items: [], cursor: null, hasMore: false, loading: false, error: null })
  const stateRef = useRef(state); stateRef.current = state
  const fetchPage = useCallback(async (cursor: string | null, append: boolean) => {
    if (!key) return
    controller.current?.abort()
    const active = new AbortController(); controller.current = active
    const generation = ++request.current; busy.current = true
    setState(old => ({ key, items: append && old.key === key ? old.items : [], cursor, hasMore: append && old.key === key ? old.hasMore : false, loading: true, error: null }))
    try {
      const page = await getDiscoveryProjects(JSON.parse(queryKey) as DiscoveryQuery, cursor, active.signal)
      if (active.signal.aborted || scope.current !== key || request.current !== generation) return
      setState(old => ({ key, items: [...new Map([...(append && old.key === key ? old.items : []), ...page.items].map(card => [card.project_id, card])).values()],
        cursor: page.next_cursor, hasMore: page.has_more, loading: false, error: null }))
    } catch (error) {
      if (!active.signal.aborted && scope.current === key && request.current === generation) setState(old => ({ ...old, loading: false, error }))
    } finally { if (request.current === generation) busy.current = false }
  }, [key, queryKey])
  useEffect(() => {
    void fetchPage(null, false)
    return () => { controller.current?.abort(); request.current++; busy.current = false }
  }, [fetchPage])
  const loadMore = useCallback(() => {
    const current = stateRef.current
    if (!busy.current && current.key === key && current.hasMore) void fetchPage(current.cursor, true)
  }, [key, fetchPage])
  const refresh = useCallback(() => { void fetchPage(null, false) }, [fetchPage])
  const remove = useCallback((id: string) => setState(old => old.key === key ? { ...old, items: old.items.filter(card => card.project_id !== id) } : old), [key])
  const matches = key !== null && state.key === key
  return { key, items: matches ? state.items : [], loading: !!key && (!matches || state.loading), error: matches ? state.error : null,
    hasMore: matches && state.hasMore, loadMore, refresh, remove }
}
