import { useState } from "react"
import { Link } from "react-router"
import {
  Mail,
  Users,
  Sparkles,
  Code2,
  CheckCheck,
  ArrowRight,
} from "lucide-react"
import { useTindy } from "../../store"
import { PageHeader, Button, EmptyState } from "../../components/ui"

export function Notifications() {
  const { read, setRead, notify } = useTindy()
  const [tab, setTab] = useState("All updates")
  const updates = [
    {
      title: "You received a team invitation.",
      description:
        "Minh Nguyen invited you to join AI Customer Support System.",
      icon: Mail,
      tone: "teal",
      path: "/projects?tab=Invited",
      label: "Review invitation",
      time: "12 minutes ago",
    },
    {
      title: "Your profile was viewed by a project team.",
      description:
        "The AI Customer Support System team is getting to know your experience.",
      icon: Users,
      tone: "indigo",
      path: "/profile",
      label: "View profile",
      time: "1 hour ago",
    },
    {
      title: "A new project recommendation is ready.",
      description:
        "Campus Cloud aligns with your React skills and community interests.",
      icon: Sparkles,
      tone: "sky",
      path: "/project/campus-cloud",
      label: "View project",
      time: "2 hours ago",
    },
    {
      title: "Your project has a new interested candidate.",
      description:
        "Cao Thanh Nhan is interested in contributing to your backend.",
      icon: Code2,
      tone: "amber",
      path: "/candidate/Cao%20Thanh%20Nhan",
      label: "Review candidate",
      time: "Yesterday",
    },
  ]

  return (
    <>
      <PageHeader
        title="Stay in the loop."
        description="Your invitations, opportunities, and community updates."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setRead([0, 1, 2, 3])
              notify("All notifications marked as read")
            }}
          >
            <CheckCheck size={15} />
            Mark all as read
          </Button>
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
            {item === "Unread" && <span>{4 - read.length}</span>}
          </button>
        ))}
      </div>
      <section className="panel notifications-panel">
        {updates.map((update, index) =>
          tab === "Unread" && read.includes(index) ? null : (
            <div
              className={`notification-row ${
                read.includes(index) ? "" : "unread"
              }`}
              key={update.title}
            >
              <span className={`icon-tile ${update.tone}`}>
                <update.icon size={19} />
              </span>
              <div>
                <h3>
                  {update.title}
                  {!read.includes(index) && <i className="unread-dot" />}
                </h3>
                <p>{update.description}</p>
                <small>{update.time}</small>
              </div>
              <Link
                to={update.path}
                className="btn btn-secondary"
                onClick={() => setRead((old) => [...new Set([...old, index])])}
              >
                {update.label}
                <ArrowRight size={13} />
              </Link>
            </div>
          ),
        )}
        {tab === "Unread" && read.length === 4 && (
          <EmptyState
            title="You’re all caught up."
            description="New opportunities and updates will appear here."
          />
        )}
      </section>
    </>
  )
}

export default Notifications
