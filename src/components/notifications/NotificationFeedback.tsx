import { useTindy } from "../../store"

export default function NotificationFeedback() {
  const { notifications: n } = useTindy()
  if (!n.enabled || (!n.countError && !n.mutationError)) return null
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
    </div>
  )
}
