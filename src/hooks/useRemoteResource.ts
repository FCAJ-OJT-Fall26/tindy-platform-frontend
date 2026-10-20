import { useCallback, useEffect, useRef, useState } from "react"

/** Session/route-scoped, memory-only data. Old requests cannot replace a newer scope. */
export default function useRemoteResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<{
    key: string | null
    data: T | null
    error: unknown
    loading: boolean
  }>({ key: null, data: null, error: null, loading: false })
  const [version, setVersion] = useState(0)
  const scope = useRef(key)
  scope.current = key
  const request = useRef(0)

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const current = ++request.current
    setState((previous) => ({
      key,
      data: previous.key === key ? previous.data : null,
      error: null,
      loading: true,
    }))
    load(controller.signal)
      .then((data) => {
        if (
          !controller.signal.aborted &&
          scope.current === key &&
          current === request.current
        )
          setState({ key, data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          scope.current === key &&
          current === request.current
        )
          setState((previous) => ({ ...previous, key, error, loading: false }))
      })
    return () => {
      controller.abort()
      request.current++
    }
  }, [key, load, version])

  const replace = useCallback(
    (next: T | ((previous: T | null) => T)) => {
      if (!key || scope.current !== key) return
      // A mutation response is newer than an in-flight list/GET response.
      request.current++
      setState((previous) => {
        const update = next as (value: T | null) => T
        const data = typeof next === "function"
          ? update(previous.key === key ? previous.data : null)
          : next
        return { key, data, error: null, loading: false }
      })
    },
    [key],
  )
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  const matches = Boolean(key) && state.key === key
  return {
    data: matches ? state.data : null,
    error: matches ? state.error : null,
    loading: Boolean(key) && (!matches || state.loading),
    replace,
    reload,
  }
}
