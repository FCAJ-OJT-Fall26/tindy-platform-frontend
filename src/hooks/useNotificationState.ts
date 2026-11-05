import { useEffect, useMemo, useRef, useState } from "react"
import type { AuthUser } from "../types/auth"
import type {
  NotificationFilter,
  NotificationsPageDto,
} from "../types/notification"
import { getStoredToken, SESSION_CHANGED_EVENT } from "../services/apiClient"
import { INVITATIONS_CHANGED_EVENT } from "../services/invitations.service"
import {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications.service"

interface PageState {
  data: NotificationsPageDto | null
  loading: boolean
  error: string | null
}
interface State {
  owner: string | null
  count: number | null
  countLoading: boolean
  countError: string | null
  pages: Record<string, PageState>
  pending: string | null
  mutationError: {
    id: string
    message: string
  } | null
}
const empty = (owner: string | null): State => ({
  owner,
  count: null,
  countLoading: false,
  countError: null,
  pages: {},
  pending: null,
  mutationError: null,
})
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Notifications are unavailable. Please retry."
export const notificationPageKey = (filter: NotificationFilter, page: number) =>
  `${filter}:${page}`

/** One memory-only inbox per authenticated session, shared through the existing Tindy store. */
export default function useNotificationState(
  user: AuthUser | null,
  enabled: boolean,
) {
  const [revision, setRevision] = useState(0)
  const token = getStoredToken()
  const owner =
    enabled && user?.is_onboarding_completed && token
      ? `${user.user_id}:${token}:${revision}`
      : null
  const [state, setState] = useState<State>(() => empty(null))
  const live = useRef<object | null>(null)
  const runtime = useMemo(() => {
    let root = new AbortController()
    const reads = new Map<string, {
      controller: AbortController
      promise: Promise<void>
    }>()
    const queries = new Map<string, {
      filter: NotificationFilter
      page: number
    }>()
    const watchers = new Map<string, number>()
    let mutation: {
      id: string
      promise: Promise<void>
    } | null = null
    const current = () =>
      Boolean(owner) &&
      live.current === api &&
      !root.signal.aborted &&
      getStoredToken() === token
    const update = (fn: (previous: State) => State) => {
      if (current())
        setState((previous) =>
          current()
            ? fn(previous.owner === owner ? previous : empty(owner))
            : previous,
        )
    }
    const read = (
      key: string,
      work: (signal: AbortSignal) => Promise<void>,
    ) => {
      if (!current()) return Promise.resolve()
      const pending = reads.get(key)
      if (pending) return pending.promise
      const controller = new AbortController()
      const request = { controller, promise: Promise.resolve() }
      request.promise = work(
        AbortSignal.any([root.signal, controller.signal]),
      ).finally(() => {
        if (reads.get(key) === request) reads.delete(key)
      })
      reads.set(key, request)
      return request.promise
    }
    const count = () =>
      read("count", async (signal) => {
        update((s) => ({ ...s, countLoading: true }))
        try {
          const value = await getNotificationUnreadCount(signal)
          if (!signal.aborted)
            update((s) => ({
              ...s,
              count: value,
              countError: null,
              countLoading: false,
            }))
        } catch (error) {
          if (!signal.aborted)
            update((s) => ({
              ...s,
              countError: message(error),
              countLoading: false,
            }))
        }
      })
    const page = (filter: NotificationFilter, number: number) => {
      const key = notificationPageKey(filter, number)
      return read(key, async (signal) => {
        update((s) => ({
          ...s,
          pages: {
            ...s.pages,
            [key]: {
              data: s.pages[key]?.data ?? null,
              loading: true,
              error: null,
            },
          },
        }))
        try {
          const data = await getNotifications(filter, number, signal)
          if (!signal.aborted)
            update((s) => ({
              ...s,
              pages: {
                ...s.pages,
                [key]: { data, loading: false, error: null },
              },
            }))
        } catch (error) {
          if (!signal.aborted)
            update((s) => ({
              ...s,
              pages: {
                ...s.pages,
                [key]: {
                  data: s.pages[key]?.data ?? null,
                  loading: false,
                  error: message(error),
                },
              },
            }))
        }
      })
    }
    const refresh = () =>
      Promise.all([
        count(),
        ...[...queries.values()].map((q) => page(q.filter, q.page)),
      ]).then(() => {})
    const abortReads = () => {
      reads.forEach((r) => r.controller.abort())
      reads.clear()
    }
    const mutate = (id: string): Promise<void> => {
      if (!current())
        return Promise.reject(Error("Your session changed. Sign in again."))
      if (mutation)
        return mutation.id === id
          ? mutation.promise
          : Promise.reject(
              Error("A notification update is already in progress."),
            )
      update((s) => ({ ...s, pending: id, mutationError: null }))
      const pending = { id, promise: Promise.resolve() }
      pending.promise = (async () => {
        try {
          if (id === "all") await markAllNotificationsRead(root.signal)
          else await markNotificationRead(id, root.signal)
          if (!current()) return
          abortReads()
          // Re-read server-owned status: mark-all has a cutoff, so it must never
          // blindly mark every cached item read or force the badge to zero.
          update((s) => ({
            ...s,
            pages: Object.fromEntries(
              Object.keys(s.pages).map((k) => [
                k,
                { data: null, loading: true, error: null },
              ]),
            ),
          }))
          await refresh()
        } catch (error) {
          if (current()) {
            update((s) => ({
              ...s,
              mutationError: {
                id,
                message: `Read status could not be confirmed. ${message(error)}`,
              },
            }))
            // A lost response may hide a committed idempotent write. Reconcile,
            // retaining an explicit error and retry instead of inventing success.
            abortReads()
            await refresh()
          }
          throw error
        } finally {
          if (mutation === pending) mutation = null
          update((s) => ({ ...s, pending: null }))
        }
      })()
      mutation = pending
      return pending.promise
    }
    const api = {
      refreshCount: count,
      page,
      refresh,
      markRead: (id: string) => mutate(id),
      markAllRead: () => mutate("all"),
      watchPage: (filter: NotificationFilter, number: number) => {
        const key = notificationPageKey(filter, number)
        watchers.set(key, (watchers.get(key) ?? 0) + 1)
        queries.set(key, { filter, page: number })
        void count()
        void page(filter, number)
        return () => {
          const remaining = (watchers.get(key) ?? 1) - 1
          if (remaining > 0) watchers.set(key, remaining)
          else {
            watchers.delete(key)
            queries.delete(key)
            reads.get(key)?.controller.abort()
            reads.delete(key)
          }
        }
      },
      activate: () => {
        if (root.signal.aborted) root = new AbortController()
      },
      abort: () => {
        root.abort()
        abortReads()
      },
      get signal() {
        return root.signal
      },
    }
    return api
  }, [owner, token])
  live.current = runtime

  useEffect(() => {
    const changed = () => {
      runtime.abort()
      setState(empty(null))
      setRevision((v) => v + 1)
    }
    window.addEventListener(SESSION_CHANGED_EVENT, changed)
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, changed)
  }, [runtime])
  useEffect(() => {
    if (!owner) return () => runtime.abort()
    runtime.activate()
    void runtime.refresh()
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void runtime.refresh()
    }, 60_000)
    const visible = () => {
      if (document.visibilityState === "visible") void runtime.refresh()
    }
    const invitations = () => void runtime.refresh()
    document.addEventListener("visibilitychange", visible)
    window.addEventListener(INVITATIONS_CHANGED_EVENT, invitations)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", visible)
      window.removeEventListener(INVITATIONS_CHANGED_EVENT, invitations)
      runtime.abort()
    }
  }, [owner, runtime])
  return {
    ...(owner && state.owner === owner ? state : empty(owner)),
    ...runtime,
    enabled: Boolean(owner),
  }
}
