import { useEffect, useRef, useState } from "react"
import { useTindy } from "../store"
import { getStoredToken, SESSION_CHANGED_EVENT } from "../services/apiClient"
import { getMediaContent } from "../services/profileMedia.service"

type Entry = {
  refs: number
  controller: AbortController
  url: string | null
  promise: Promise<string>
}
type Retained = {
  scope: string
  entry: Entry
}
const entries = new Map<string, Entry>()
// A refreshed entry can replace the cache lookup while an existing image still
// owns the previous URL. Track both generations until their last refs release.
const liveEntries = new Set<Entry>()
let cacheToken: string | null = null
function dispose(entry: Entry) {
  entry.controller.abort()
  if (entry.url) URL.revokeObjectURL(entry.url)
  entry.url = null
  liveEntries.delete(entry)
}
function clear() {
  for (const entry of liveEntries) dispose(entry)
  entries.clear()
  cacheToken = null
}
window.addEventListener(SESSION_CHANGED_EVENT, clear)
window.addEventListener("storage", (event) => {
  if (event.key === "tindy_access_token" || event.key === null) clear()
})

function acquire(id: string, token: string, refresh?: Entry) {
  if (cacheToken !== token) {
    clear()
    cacheToken = token
  }
  let entry = entries.get(id)
  // Only replace the generation the caller actually used. Concurrent retries
  // from consumers of that generation join the same replacement request.
  if (entry && entry === refresh) entry = undefined
  if (!entry) {
    const controller = new AbortController()
    const next: Entry = {
      refs: 0,
      controller,
      url: null,
      promise: Promise.resolve(""),
    }
    next.promise = getMediaContent(id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted || getStoredToken() !== token)
          throw new DOMException("Session changed", "AbortError")
        if (!["image/webp", "image/png", "image/jpeg"].includes(blob.type))
          throw new Error("Unsupported image response")
        next.url = URL.createObjectURL(blob)
        return next.url
      })
      .catch((error) => {
        if (entries.get(id) === next) entries.delete(id)
        throw error
      })
    entries.set(id, next)
    liveEntries.add(next)
    entry = next
  }
  entry.refs++
  const retained = entry
  return {
    entry: retained,
    promise: retained.promise,
    release: () => {
      retained.refs--
      // React StrictMode immediately re-acquires mounted effects. Let those
      // consumers keep the in-flight resource; a real unmount still releases
      // it in this turn, without retaining a persistent binary cache.
      queueMicrotask(() => {
        if (retained.refs !== 0) return
        dispose(retained)
        if (entries.get(id) === retained) entries.delete(id)
      })
    },
  }
}

/** Ref-counted only while mounted: shared Header/Profile reads, no persistent binary cache. */
export default function usePrivateMedia(id: string | null | undefined) {
  const { authUser, loggingOut } = useTindy()
  const token = getStoredToken()
  const scope =
    !loggingOut && authUser && token && id
      ? `${authUser.user_id}:${token}:${id}`
      : null
  const [version, setVersion] = useState(0)
  const current = useRef<Retained | null>(null)
  const refresh = useRef<Retained | null>(null)
  const pending = useRef(false)
  const [state, setState] = useState<{
    scope: string | null
    url: string | null
    error: unknown
  }>({ scope: null, url: null, error: null })
  useEffect(() => {
    if (!scope || !id || !token) return
    let active = true
    pending.current = true
    setState({ scope, url: null, error: null })
    const handle = acquire(
      id,
      token,
      refresh.current?.scope === scope ? refresh.current.entry : undefined,
    )
    const retained = { scope, entry: handle.entry }
    current.current = retained
    handle.promise
      .then((url) => {
        if (
          active &&
          !handle.entry.controller.signal.aborted &&
          getStoredToken() === token
        ) {
          pending.current = false
          setState({ scope, url, error: null })
        }
      })
      .catch((error) => {
        if (
          active &&
          !handle.entry.controller.signal.aborted &&
          getStoredToken() === token
        ) {
          pending.current = false
          setState({ scope, url: null, error })
        }
      })
    return () => {
      active = false
      if (current.current === retained) current.current = null
      handle.release()
    }
  }, [scope, id, token, version])
  return {
    url: scope && state.scope === scope ? state.url : null,
    error: scope && state.scope === scope ? state.error : null,
    loading: Boolean(
      scope && (state.scope !== scope || (!state.url && !state.error)),
    ),
    retry: () => {
      const retained = current.current
      if (
        !scope ||
        !retained ||
        retained.scope !== scope ||
        pending.current ||
        token !== getStoredToken()
      )
        return
      pending.current = true
      refresh.current = retained
      // Clear the old URL/error immediately and guard even clicks in the same
      // event turn, before React commits the retry's loading state.
      setState({ scope, url: null, error: null })
      setVersion((value) => value + 1)
    },
  }
}
