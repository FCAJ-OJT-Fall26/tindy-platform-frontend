import { useEffect } from "react"
import { useTindy } from "../store"
import { notificationPageKey } from "./useNotificationState"
import type { NotificationFilter } from "../types/notification"

export default function useNotifications(
  filter: NotificationFilter,
  page: number,
  active = true,
) {
  const { notifications } = useTindy()
  const load = notifications.page
  const watch = notifications.watchPage
  useEffect(() => {
    if (active && notifications.enabled) return watch(filter, page)
  }, [active, notifications.enabled, filter, page, watch])
  const resource = notifications.pages[notificationPageKey(filter, page)]
  return { ...notifications, resource, reload: () => load(filter, page) }
}
