import { useState, useRef } from "react"
import { Link } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react"
import { useTindy } from "../../store"
import { Button, Modal, Chips } from "../../components/ui"
import SkillIcon from "../../components/onboarding/SkillIcon"

interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  tone: "amber" | "green" | "blue" | "rose"
  isYou?: boolean
}

interface WorkspaceComment {
  id: string
  author: string
  initials: string
  tone: "amber" | "green" | "blue" | "rose"
  role: string
  tag: string
  text: string
  helpfulCount: number
  isHelpful?: boolean
}

interface TeamGoal {
  id: string
  category: string
  tone: "indigo" | "emerald"
  title: string
  assignees: { initials: string; tone: "amber" | "green" | "blue" | "rose" }[]
  dueDate: string
  completed: boolean
}

export function TeamScreen() {
  const { profile, notify } = useTindy()
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const currentUserName = profile.name && profile.name !== "Tindy member" ? profile.name : "Alex Le"
  const currentUserInitials = currentUserName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "AL"

  const [isProjectComplete, setIsProjectComplete] = useState(false)
  const [activeTab, setActiveTab] = useState<"comments" | "details">("comments")
  const [announcement, setAnnouncement] = useState("")
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [showCompletedGoals, setShowCompletedGoals] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [addGoalModalOpen, setAddGoalModalOpen] = useState(false)

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: "m1",
      name: "Minh Nguyen",
      initials: "MN",
      role: "Project lead",
      tone: "amber",
    },
    {
      id: "m2",
      name: currentUserName,
      initials: currentUserInitials,
      role: profile.role || "Backend Developer",
      tone: "green",
      isYou: true,
    },
    {
      id: "m3",
      name: "An Hoang",
      initials: "AH",
      role: "AI Engineer",
      tone: "blue",
    },
    {
      id: "m4",
      name: "Linh Tran",
      initials: "LT",
      role: "Frontend Developer",
      tone: "rose",
    },
  ])

  const [comments, setComments] = useState<WorkspaceComment[]>([
    {
      id: "c1",
      author: "Minh Nguyen",
      initials: "MN",
      tone: "amber",
      role: "Project lead",
      tag: "Sample update",
      text: "Welcome to AI Customer Support System! Our kickoff is Friday at 5 PM. Bring your ideas — let's build something meaningful together.",
      helpfulCount: 0,
      isHelpful: false,
    },
  ])

  const [goals, setGoals] = useState<TeamGoal[]>([
    {
      id: "g1",
      category: "Engineering",
      tone: "indigo",
      title: "Deploy a secure, scalable API on AWS.",
      assignees: [
        { initials: currentUserInitials, tone: "green" },
        { initials: "MN", tone: "amber" },
      ],
      dueDate: "Nov 5",
      completed: false,
    },
    {
      id: "g2",
      category: "Community",
      tone: "emerald",
      title: "Reduce response time with contextual, source-cited AI answers.",
      assignees: [{ initials: "MN", tone: "amber" }],
      dueDate: "Nov 8",
      completed: false,
    },
    {
      id: "g3",
      category: "Engineering",
      tone: "indigo",
      title: "Finalize RAG vector database schema and embedding pipeline.",
      assignees: [
        { initials: "AH", tone: "blue" },
        { initials: currentUserInitials, tone: "green" },
      ],
      dueDate: "Oct 29",
      completed: true,
    },
  ])

  const completedGoalsCount = goals.filter((g) => g.completed).length
  const progressPercent = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0
  const displayedGoals = showCompletedGoals ? goals : goals.filter((g) => !g.completed)
  const displayedRoles = showAllMembers ? members : members.slice(0, 3)

  const handleCopyWorkspaceLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
    notify("Workspace link copied to clipboard")
  }

  const handlePostUpdate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!announcement.trim()) return

    const newComment: WorkspaceComment = {
      id: `c-${Date.now()}`,
      author: currentUserName,
      initials: currentUserInitials,
      tone: "green",
      role: profile.role || "Backend Developer",
      tag: "Just now",
      text: announcement.trim(),
      helpfulCount: 0,
      isHelpful: false,
    }
    setComments((prev) => [...prev, newComment])
    setAnnouncement("")
    notify("Update shared with your team")
  }

  const handleToggleHelpful = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              isHelpful: !c.isHelpful,
              helpfulCount: c.isHelpful ? c.helpfulCount - 1 : c.helpfulCount + 1,
            }
          : c
      )
    )
  }

  const handleReplyTo = (authorName: string) => {
    setAnnouncement((prev) => (prev ? `${prev} @${authorName} ` : `@${authorName} `))
    composerRef.current?.focus()
  }

  const handleToggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    )
  }

  return (
    <div className="team-ws-page">
      {/* Top Back Link */}
      <Link to="/projects" className="team-ws-back-link">
        <ArrowLeft size={14} />
        <span>My projects</span>
      </Link>

      {/* Page Header */}
      <div className="team-ws-page-header">
        <div className="team-ws-page-header-left">
          <div className="team-ws-eyebrow">BUILD SOMETHING TOGETHER</div>
          <h1 className="team-ws-title">Team workspace</h1>
          <p className="team-ws-subtitle">
            The people, plans, and conversations behind your next milestone.
          </p>
        </div>
        <Link
          className="btn btn-primary team-ws-chat-btn"
          to="/messages?conversation=AI%20Customer%20Support%20System"
        >
          <MessageSquare size={15} />
          <span>Open team chat</span>
        </Link>
      </div>

      {/* Main 2-Column Workspace Layout */}
      <div className="team-ws-layout">
        {/* LEFT COLUMN: Main Project Workspace Panel */}
        <section className="team-ws-main-card">
          {/* Card Header */}
          <div className="team-ws-card-topbar">
            <div className="team-ws-card-heading">
              <strong>AI Customer Support System</strong>
              <span> — Workspace</span>
            </div>
            <span className={`team-ws-status-badge ${isProjectComplete ? "done" : "active"}`}>
              {isProjectComplete ? "Completed" : "Active"}
            </span>
          </div>

          {/* Action Toolbar (No Attachment Icon) */}
          <div className="team-ws-toolbar">
            <button
              type="button"
              className={`team-ws-complete-btn ${isProjectComplete ? "is-complete" : ""}`}
              onClick={() => {
                setIsProjectComplete((prev) => !prev)
                notify(
                  isProjectComplete
                    ? "Project status set back to In progress"
                    : "Project milestone marked complete!"
                )
              }}
            >
              <Check size={14} />
              <span>{isProjectComplete ? "Completed" : "Mark complete"}</span>
            </button>

            <div className="team-ws-toolbar-actions">
              <button
                type="button"
                className="team-ws-icon-btn"
                onClick={handleCopyWorkspaceLink}
                title="Copy workspace link"
                aria-label="Copy workspace link"
              >
                <Copy size={15} />
              </button>
              <Link
                to="/projects"
                className="team-ws-icon-btn"
                title="View in My Projects"
                aria-label="View in My Projects"
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* Project Overview & Metadata */}
          <div className="team-ws-overview">
            <div className="team-ws-category">AI &amp; Machine Learning</div>
            <h2 className="team-ws-project-name">AI Customer Support System</h2>

            <div className="team-ws-meta-grid">
              <div className="team-ws-meta-row">
                <span className="team-ws-meta-label">Status</span>
                <div className="team-ws-meta-value">
                  <span className={`team-ws-progress-pill ${isProjectComplete ? "done" : ""}`}>
                    {isProjectComplete ? "Completed" : "In progress"}
                  </span>
                </div>
              </div>

              <div className="team-ws-meta-row">
                <span className="team-ws-meta-label">Commitment</span>
                <div className="team-ws-meta-value">
                  <span>10 hrs / week</span>
                  <span className="meta-dot">·</span>
                  <span>3 months</span>
                </div>
              </div>

              <div className="team-ws-meta-row">
                <span className="team-ws-meta-label">Assigned</span>
                <div className="team-ws-meta-value">
                  <div className="team-ws-avatar-stack">
                    {members.slice(0, 4).map((m) => (
                      <span key={m.id} className={`ws-mini-avatar ${m.tone}`} title={m.name}>
                        {m.initials}
                      </span>
                    ))}
                  </div>
                  <span className="team-ws-member-count">{members.length} members</span>
                </div>
              </div>

              <div className="team-ws-meta-row">
                <span className="team-ws-meta-label">Stack</span>
                <div className="team-ws-meta-value team-ws-stack-chips">
                  <Chips items={[".NET", "AWS", "PostgreSQL", "RAG", "LLM"]} />
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Tabs (Comments & Details ONLY - Attachment removed) */}
          <div className="team-ws-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "comments"}
              className={`team-ws-tab ${activeTab === "comments" ? "active" : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              <span>Comments</span>
              <span className="team-ws-tab-badge">{comments.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "details"}
              className={`team-ws-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              <span>Details</span>
            </button>
          </div>

          {/* Tab Panels */}
          {activeTab === "comments" ? (
            <div className="team-ws-comments-section">
              <div className="team-ws-comments-list">
                {comments.map((comment) => (
                  <article className="team-ws-comment" key={comment.id}>
                    <span className={`ws-avatar ${comment.tone}`}>{comment.initials}</span>
                    <div className="team-ws-comment-body">
                      <div className="team-ws-comment-header">
                        <strong>{comment.author}</strong>
                        <span>{comment.tag}</span>
                      </div>
                      <div className="team-ws-comment-role">{comment.role}</div>
                      <p className="team-ws-comment-text">{comment.text}</p>
                      <div className="team-ws-comment-actions">
                        <button
                          type="button"
                          className={comment.isHelpful ? "active" : ""}
                          onClick={() => handleToggleHelpful(comment.id)}
                        >
                          Helpful{comment.helpfulCount > 0 ? ` (${comment.helpfulCount})` : ""}
                        </button>
                        <button type="button" onClick={() => handleReplyTo(comment.author)}>
                          Reply
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <form className="team-ws-composer" onSubmit={handlePostUpdate}>
                <label className="team-ws-composer-label" htmlFor="ws-update-input">
                  Share an update
                </label>
                <div className="team-ws-composer-row">
                  <span className="ws-avatar green">{currentUserInitials}</span>
                  <textarea
                    id="ws-update-input"
                    ref={composerRef}
                    rows={3}
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="An idea, a question, a little progress..."
                  />
                </div>
                <div className="team-ws-composer-footer">
                  <span>Good work starts with a conversation.</span>
                  <button
                    type="submit"
                    className="team-ws-post-btn"
                    disabled={!announcement.trim()}
                  >
                    <Send size={13} />
                    <span>Post update</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="team-ws-details-section">
              <h3>About this workspace</h3>
              <p>
                We are building an AI-powered customer support assistant using Retrieval-Augmented
                Generation (RAG) on AWS and PostgreSQL pgvector to deliver instant, accurate, and
                source-cited answers for student and enterprise support teams.
              </p>
              <div className="team-ws-details-highlights">
                <div>
                  <strong>Weekly Sync</strong>
                  <span>Fridays at 5:00 PM ICT</span>
                </div>
                <div>
                  <strong>Repository</strong>
                  <span>github.com/fcaj-teams/ai-customer-support</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Roles & Team Goals */}
        <aside className="team-ws-sidebar">
          {/* Card 1: Project roles */}
          <section className="team-ws-side-card">
            <div className="team-ws-side-header">
              <h2>Project roles</h2>
              <span>{members.length} members</span>
            </div>

            <div className="team-ws-roles-grid">
              <button
                type="button"
                className="team-ws-invite-slot"
                onClick={() => setInviteModalOpen(true)}
              >
                <span className="team-ws-invite-circle">
                  <Plus size={15} />
                </span>
                <strong>Invite member</strong>
              </button>

              {displayedRoles.map((member) => (
                <div className="team-ws-role-slot" key={member.id}>
                  <span className={`ws-avatar ${member.tone}`}>{member.initials}</span>
                  <div className="team-ws-role-info">
                    <div className="team-ws-role-name">
                      <strong>{member.name}</strong>
                      {member.isYou && <span className="team-ws-you-pill">you</span>}
                    </div>
                    <small>{member.role}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="team-ws-side-footer">
              <button
                type="button"
                className="team-ws-link-btn"
                onClick={() => setShowAllMembers((prev) => !prev)}
              >
                {showAllMembers ? "Show fewer members" : "View all members"}
              </button>
              <span className="team-ws-muted-label">Demo roster</span>
            </div>
          </section>

          {/* Card 2: Team goals summary */}
          <section className="team-ws-side-card">
            <div className="team-ws-side-header">
              <h2>
                Team goals <span className="goals-total-count">({goals.length})</span>
              </h2>
              <div className="team-ws-avatar-stack">
                <span className="ws-mini-avatar amber">MN</span>
                <span className="ws-mini-avatar green">{currentUserInitials}</span>
                <span className="ws-mini-avatar blue">AH</span>
              </div>
            </div>

            <p className="team-ws-goals-sub">
              One shared direction. A little progress, every day.
            </p>

            <div className="team-ws-progress-track">
              <div
                className="team-ws-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="team-ws-progress-caption">
              {completedGoalsCount} of {goals.length} goals complete · {progressPercent}%
            </div>
          </section>

          {/* Card 3: Goals checklist */}
          <section className="team-ws-side-card team-ws-goals-list-card">
            <div className="team-ws-goals-items">
              {displayedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`team-ws-goal-item ${goal.completed ? "is-done" : ""}`}
                >
                  <span className={`ws-goal-category ${goal.tone}`}>{goal.category}</span>
                  <div className="team-ws-goal-main">
                    <button
                      type="button"
                      className={`ws-goal-check ${goal.completed ? "checked" : ""}`}
                      onClick={() => handleToggleGoal(goal.id)}
                      aria-label={`Mark "${goal.title}" as ${goal.completed ? "incomplete" : "complete"}`}
                    >
                      {goal.completed && <Check size={11} />}
                    </button>
                    <span className="team-ws-goal-title">{goal.title}</span>
                  </div>
                  <div className="team-ws-goal-meta">
                    <div className="team-ws-avatar-stack">
                      {goal.assignees.map((a, idx) => (
                        <span key={idx} className={`ws-mini-avatar ${a.tone}`}>
                          {a.initials}
                        </span>
                      ))}
                    </div>
                    <span className="team-ws-goal-date">{goal.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="team-ws-goals-footer">
              <button
                type="button"
                className="team-ws-show-completed-btn"
                onClick={() => setShowCompletedGoals((prev) => !prev)}
              >
                {showCompletedGoals
                  ? `Hide completed (${completedGoalsCount})`
                  : `Show completed (${completedGoalsCount})`}
              </button>
              <button
                type="button"
                className="team-ws-add-goal-btn"
                onClick={() => setAddGoalModalOpen(true)}
              >
                <Plus size={13} />
                <span>Add goal</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <Modal title="Invite teammate" onClose={() => setInviteModalOpen(false)}>
          <h2>Make room for one more.</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const name = String(data.get("name") || "").trim()
              const role = String(data.get("role") || "Contributor").trim()
              if (!name) return
              const initials = name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()
              setMembers((prev) => [
                ...prev,
                {
                  id: `m-${Date.now()}`,
                  name,
                  initials,
                  role,
                  tone: "blue",
                },
              ])
              setInviteModalOpen(false)
              notify(`${name} added to project roster`)
            }}
          >
            <label className="field">
              Full name
              <input required name="name" placeholder="e.g. Khoa Pham" />
            </label>
            <label className="field">
              Project role
              <input required name="role" placeholder="e.g. Cloud Architect" />
            </label>
            <label className="field">
              University email
              <input required type="email" name="email" placeholder="student@fpt.edu.vn" />
            </label>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Send invitation <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Goal Modal */}
      {addGoalModalOpen && (
        <Modal title="Add team goal" onClose={() => setAddGoalModalOpen(false)}>
          <h2>Set the next milestone.</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const title = String(data.get("title") || "").trim()
              const category = String(data.get("category") || "Engineering")
              const dueDate = String(data.get("dueDate") || "Nov 15").trim()
              if (!title) return
              setGoals((prev) => [
                ...prev,
                {
                  id: `g-${Date.now()}`,
                  category,
                  tone: category === "Community" ? "emerald" : "indigo",
                  title,
                  assignees: [{ initials: currentUserInitials, tone: "green" }],
                  dueDate,
                  completed: false,
                },
              ])
              setAddGoalModalOpen(false)
              notify("New team goal added")
            }}
          >
            <label className="field">
              Goal description
              <input
                required
                name="title"
                placeholder="e.g. Benchmark LLM latency under concurrent load"
              />
            </label>
            <label className="field">
              Category
              <select name="category" defaultValue="Engineering">
                <option value="Engineering">Engineering</option>
                <option value="Community">Community</option>
              </select>
            </label>
            <label className="field">
              Target date
              <input name="dueDate" defaultValue="Nov 15" placeholder="e.g. Nov 15" />
            </label>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setAddGoalModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add goal <Plus size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default TeamScreen
