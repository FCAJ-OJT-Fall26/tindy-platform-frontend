import { useEffect, useState } from "react"
import { CheckCheck } from "lucide-react"
import { PageHeader, EmptyState, Button } from "../../components/ui"
import useNotifications from "../../hooks/useNotifications"
import useNotificationNavigation from "../../hooks/useNotificationNavigation"
import NotificationRow from "../../components/notifications/NotificationRow"
import type { NotificationFilter } from "../../types/notification"
import "./notifications.css"

export function Notifications() {
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [page, setPage] = useState(1)
  const inbox = useNotifications(filter, page)
  const { open, opening } = useNotificationNavigation()
  const resource = inbox.resource
  const loaded = resource && !resource.loading && !resource.error
  useEffect(() => {
    if (
      loaded &&
      resource.data &&
      page > Math.max(1, resource.data.pagination.total_pages)
    )
      setPage(Math.max(1, resource.data.pagination.total_pages))
  }, [loaded, resource?.data, page])
  return (
    <>
      <PageHeader
        title="Stay in the loop."
        description="Your project invitation updates, delivered inside Tindy."
        action={
          <Button
            variant="secondary"
            disabled={!!inbox.pending || inbox.count === 0 || !inbox.enabled}
            onClick={() => void inbox.markAllRead().catch(() => {})}
          >
            <CheckCheck size={15} />
            {inbox.pending === "all" ? "Marking all…" : "Mark all as read"}
          </Button>
        }
      />
      <div
        className="status-tabs"
        role="tablist"
        aria-label="Notification filters"
      >
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => {
              setFilter(value)
              setPage(1)
            }}
          >
            {value === "all" ? "All Updates" : "Unread"}
            {value === "unread" && (
              <span>{inbox.count === null ? "—" : inbox.count}</span>
            )}
          </button>
        ))}
      </div>
      <section
        className="panel notifications-panel"
        aria-label="Notification list"
        aria-busy={!resource || resource.loading}
      >
        {(!resource || resource.loading) && (
          <p role="status" className="notification-status">
            Loading notifications…
          </p>
        )}
        {resource?.error && (
          <p role="alert" className="notification-status">
            {resource.error}{" "}
            <button className="text-link" onClick={() => void inbox.reload()}>
              Retry notifications
            </button>
          </p>
        )}
        {loaded && resource.data?.items.length === 0 && (
          <EmptyState
            title={
              filter === "unread"
                ? "You're all caught up."
                : "No notifications yet"
            }
            description="Project invitation updates will appear here."
          />
        )}
        {loaded &&
          resource.data?.items.map((row) => (
            <NotificationRow
              key={row.notification_id}
              row={row}
              disabled={!!inbox.pending || !!opening}
              pending={inbox.pending === row.notification_id}
              opening={opening === row.notification_id}
              onRead={() =>
                void inbox.markRead(row.notification_id).catch(() => {})
              }
              onView={() => void open(row)}
            />
          ))}
      </section>
      {resource?.data && (
        <nav
          className="notification-pagination"
          aria-label="Notification pages"
        >
          <Button
            variant="secondary"
            disabled={
              !!inbox.pending ||
              resource.loading ||
              !resource.data.pagination.has_previous
            }
            onClick={() => setPage((p) => p - 1)}
          >
            Previous notifications
          </Button>
          <span>
            Page {page} of {Math.max(1, resource.data.pagination.total_pages)} ·{" "}
            {resource.data.pagination.total_items} updates
          </span>
          <Button
            variant="secondary"
            disabled={
              !!inbox.pending ||
              resource.loading ||
              !resource.data.pagination.has_next
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Next notifications
          </Button>
        </nav>
      )}
    </>
  )
}
export default Notifications
