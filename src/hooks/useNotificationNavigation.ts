import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useTindy } from "../store"
import type { NotificationDto } from "../types/notification"
import {
  notificationDestination,
  notificationFallback,
} from "../services/notifications.service"

export default function useNotificationNavigation() {
  const { notifications, notify } = useTindy()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<string | null>(null)
  const pending = useRef(false)
  const lifecycle = useRef(new AbortController())
  useEffect(() => {
    lifecycle.current = new AbortController()
    pending.current = false
    setOpening(null)
    return () => lifecycle.current.abort()
  }, [notifications.owner])
  const open = async (row: NotificationDto) => {
    if (pending.current || notifications.pending) return
    pending.current = true
    setOpening(row.notification_id)
    const signal = AbortSignal.any([
      notifications.signal,
      lifecycle.current.signal,
    ])
    try {
      const [read, destination] = await Promise.allSettled([
        row.is_read
          ? Promise.resolve()
          : notifications.markRead(row.notification_id),
        notificationDestination(row, signal),
      ])
      if (signal.aborted) return
      if (read.status === "rejected")
        notify(
          "Content is available. Notification read status is unconfirmed; retry from the notification status banner.",
        )
      if (destination.status === "rejected")
        notify(
          "Project context is unavailable. Choose the project from the destination page.",
        )
      navigate(
        destination.status === "fulfilled"
          ? destination.value
          : notificationFallback(row),
      )
    } finally {
      if (!signal.aborted) {
        pending.current = false
        setOpening(null)
      }
    }
  }
  return { open, opening }
}
