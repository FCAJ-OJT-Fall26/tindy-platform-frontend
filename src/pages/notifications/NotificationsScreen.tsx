import { useState } from "react"
import { useTindy } from "../../store"
import { PageHeader, EmptyState } from "../../components/ui"

// Notifications are server-owned. Do not add local/demo notifications here.
export function Notifications() {
  const { read } = useTindy()
  const [tab, setTab] = useState("All updates")

  return (
    <>
      <PageHeader
        title="Stay in the loop."
        description="Your invitations, opportunities, and community updates."
      />
      <div className="status-tabs">
        {["All updates", "Unread"].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={tab === item ? "active" : ""}
          >
            {item}
            {item === "Unread" && <span>{read.length}</span>}
          </button>
        ))}
      </div>
      <section className="panel notifications-panel">
        <EmptyState
          title="No notifications yet"
          description="Real invitations, project activity, and team updates will appear here."
        />
      </section>
    </>
  )
}

export default Notifications
