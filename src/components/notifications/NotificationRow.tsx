import { Bell, ArrowRight, Check } from "lucide-react"
import {
  notificationDate,
  notificationText,
} from "../../services/notifications.service"
import type { NotificationDto } from "../../types/notification"

export default function NotificationRow({
  row,
  compact = false,
  disabled,
  pending,
  opening,
  onRead,
  onView,
}: {
  row: NotificationDto
  compact?: boolean
  disabled: boolean
  pending: boolean
  opening: boolean
  onRead: () => void
  onView: () => void
}) {
  const text = notificationText(row)
  return (
    <article
      data-notification-id={row.notification_id}
      className={`${compact ? "notif-popover-item" : "notification-row"} ${
        !row.is_read ? "unread" : ""
      }`}
      aria-busy={pending || opening}
    >
      <span className={compact ? "notif-icon-tile teal" : "icon-tile teal"}>
        <Bell size={compact ? 16 : 19} />
      </span>
      <div className={compact ? "notif-item-body" : "notification-body"}>
        <h3 className={compact ? "notif-item-title" : undefined}>
          {text.title}
          {!row.is_read && <i className="unread-dot" aria-label="Unread" />}
        </h3>
        <p className={compact ? "notif-item-desc" : undefined}>
          {text.description}
        </p>
        <time
          dateTime={row.created_at}
          title={notificationDate(row.created_at)}
        >
          {notificationDate(row.created_at)}
        </time>
        <div className="notification-actions">
          <button
            type="button"
            className="notification-view-button"
            disabled={disabled}
            onClick={onView}
            aria-label={`View notification: ${text.title}`}
          >
            {opening ? "Opening…" : "View notification"}
            <ArrowRight size={13} aria-hidden="true" />
          </button>
          {!row.is_read && (
            <button
              type="button"
              className="text-link"
              disabled={disabled}
              onClick={onRead}
              aria-label={`Mark notification as read: ${text.title}`}
            >
              <Check size={13} />
              {pending ? "Marking…" : "Mark as read"}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
