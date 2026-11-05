import { useState } from "react"
import { useTindy } from "../../store"
import { X } from "lucide-react"
import "../../pages/notifications/notifications.css"

export default function NotificationFeedback() {
  const { notifications: n } = useTindy()
  const [dismissed, setDismissed] = useState(false)
  if (!n.enabled || (!n.countError && !n.mutationError) || dismissed) return null
  return (
    <div className="notification-feedback" role="alert">
      {n.countError && (
        <p>
          Unread count could not be refreshed
          {n.count !== null
            ? `; last confirmed count: ${n.count}`
            : ". Count is unknown"}
          .{" "}
          <button
            className="text-link"
            onClick={() => void n.refreshCount()}
            disabled={n.countLoading}
          >
            Retry unread count
          </button>
        </p>
      )}
      {n.mutationError && (
        <p>
          {n.mutationError.message}{" "}
          <button
            className="text-link"
            disabled={!!n.pending}
            onClick={() =>
              void (
                n.mutationError!.id === "all"
                  ? n.markAllRead()
                  : n.markRead(n.mutationError!.id)
              ).catch(() => {})
            }
          >
            Retry read update
          </button>
        </p>
      )}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss notification alert"
        style={{
          background: "none",
          border: 0,
          color: "#94a3b8",
          cursor: "pointer",
          padding: 4,
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
