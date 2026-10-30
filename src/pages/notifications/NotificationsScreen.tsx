import { useState } from "react"
import { Link } from "react-router"
import { CheckCheck, ArrowRight } from "lucide-react"
import { useTindy } from "../../store"
import { PageHeader, EmptyState, Button } from "../../components/ui"
import { INITIAL_NOTIFICATIONS } from "../../data/notifications"

export function Notifications() {
  const { read, setRead, notify } = useTindy()
  const [tab, setTab] = useState("All updates")

  const unreadCount = INITIAL_NOTIFICATIONS.filter((n) => !read.includes(n.id)).length
  const displayed =
    tab === "Unread"
      ? INITIAL_NOTIFICATIONS.filter((n) => !read.includes(n.id))
      : INITIAL_NOTIFICATIONS

  const handleMarkAllRead = () => {
    setRead(INITIAL_NOTIFICATIONS.map((n) => n.id))
    notify("All notifications marked as read")
  }

  return (
    <>
      <PageHeader
        title="Stay in the loop."
        description="Your invitations, opportunities, and community updates."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={handleMarkAllRead}>
              <CheckCheck size={15} />
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      <div className="status-tabs">
        {["All updates", "Unread"].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={tab === item ? "active" : ""}
          >
            {item}
            {item === "Unread" && <span>{unreadCount}</span>}
          </button>
        ))}
      </div>
      <section className="panel notifications-panel">
        {displayed.length === 0 ? (
          <EmptyState
            title="You're all caught up."
            description="Real invitations, project activity, and team updates will appear here."
          />
        ) : (
          displayed.map((update) => {
            const isUnread = !read.includes(update.id)
            return (
              <div
                className={`notification-row ${isUnread ? "unread" : ""}`}
                key={update.id}
              >
                <span className={`icon-tile ${update.tone}`}>
                  <update.icon size={19} />
                </span>
                <div>
                  <h3>
                    {update.title}
                    {isUnread && <i className="unread-dot" />}
                  </h3>
                  <p>{update.description}</p>
                  <small>{update.time}</small>
                </div>
                <Link
                  to={update.path}
                  className="btn btn-secondary"
                  onClick={() =>
                    setRead((old) => Array.from(new Set([...old, update.id])))
                  }
                >
                  View
                  <ArrowRight size={13} />
                </Link>
              </div>
            )
          })
        )}
      </section>
    </>
  )
}

export default Notifications
