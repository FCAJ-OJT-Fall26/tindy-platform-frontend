import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router"
import {
  ArrowLeft,
  ArrowUpRight,
  MessageSquare,
  Plus,
  Check,
  Copy,
  Paperclip,
  Users,
  Send,
  Settings,
  Clock,
  Sparkles,
  ExternalLink,
  X,
  Layers,
  Heart,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import { Chips } from "../../components/ui"
import { getProjectByIdApi, mapProjectDetailToUiProject } from "../../services/projects.service"
import type { ProjectDetailDto } from "../../types/project"

interface WorkspaceGoal {
  id: string
  tag: string
  title: string
  assignees: string[]
  dueDate: string
  completed: boolean
}

interface WorkspaceUpdate {
  id: string
  authorName: string
  authorRole: string
  initials: string
  avatarColor: string
  badgeText?: string
  content: string
  timestamp: string
  likes: number
  isLiked?: boolean
}

interface WorkspaceAttachment {
  id: string
  name: string
  type: string
  url: string
  size?: string
}

interface ProjectWorkspaceViewProps {
  projectId?: string
}

export function ProjectWorkspaceView({ projectId }: ProjectWorkspaceViewProps) {
  const navigate = useNavigate()
  const { authUser, profile, projects, notify } = useTindy()

  // Project data loading
  const [project, setProject] = useState<Project | null>(() => {
    return projects.find((p) => p.id === projectId) ?? null
  })
  const [loading, setLoading] = useState(!project && Boolean(projectId))

  useEffect(() => {
    if (!projectId) return
    let active = true
    getProjectByIdApi(projectId)
      .then((detail) => {
        if (!active) return
        setProject(mapProjectDetailToUiProject(detail))
      })
      .catch(() => {
        // Fallback to local store or demo project
        const found = projects.find((p) => p.id === projectId)
        if (found && active) setProject(found)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId, projects])

  // Fallback demo project if no project found
  const activeProject = useMemo<Project>(() => {
    if (project) return project
    return {
      id: projectId || "demo-workspace",
      name: "AI Customer Support System",
      tagline: "Intelligent customer ticket routing and auto-response agent",
      description:
        "Building a production-ready AI customer support copilot that triages incoming tickets, summarizes customer issues, and drafts accurate, source-cited resolutions with RAG.",
      type: "AI & Machine Learning",
      skills: [".NET", "AWS", "PostgreSQL", "RAG", "LLM"],
      role: "Backend Developer",
      hours: 10,
      duration: "3 months",
      difficulty: "intermediate",
      team: 4,
      capacity: 5,
      openings: 1,
      leader: "Minh Nguyen",
      leaderId: "demo-leader-id",
      initials: "AC",
      color: "emerald",
      created: Date.now() - 86400000 * 14,
      closing: 14,
      factors: [90, 85, 95, 80, 88],
      goals: [
        "Deploy a secure, scalable API on AWS.",
        "Reduce response time with contextual, source-cited AI answers.",
        "Integrate OAuth2 and PostgreSQL telemetry.",
      ],
      gap: [],
      matchAvailable: false,
    }
  }, [project, projectId])

  const isLeader = Boolean(
    authUser &&
      (activeProject.leaderId === authUser.user_id ||
        activeProject.leader?.toLowerCase() === profile.name?.toLowerCase()),
  )

  // Status & Actions
  const [isCompleted, setIsCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState<"comments" | "details" | "attachments">("comments")

  // Feed / Comments
  const [newUpdate, setNewUpdate] = useState("")
  const [updates, setUpdates] = useState<WorkspaceUpdate[]>([
    {
      id: "u-1",
      authorName: activeProject.leader || "Minh Nguyen",
      authorRole: "Project lead",
      initials:
        activeProject.leader
          ?.split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "MN",
      avatarColor: "bg-amber-100 text-amber-800",
      badgeText: "Sample update",
      content: `Welcome to ${activeProject.name}! Our kickoff is Friday at 5 PM. Bring your ideas — let's build something meaningful together.`,
      timestamp: "Today at 5:00 PM",
      likes: 2,
    },
  ])

  // Goals
  const [goals, setGoals] = useState<WorkspaceGoal[]>([
    {
      id: "g-1",
      tag: "Engineering",
      title: "Deploy a secure, scalable API on AWS.",
      assignees: ["AL", "MN"],
      dueDate: "Nov 5",
      completed: true,
    },
    {
      id: "g-2",
      tag: "Community",
      title: "Reduce response time with contextual, source-cited AI answers.",
      assignees: ["MN"],
      dueDate: "Nov 8",
      completed: false,
    },
    {
      id: "g-3",
      tag: "Engineering",
      title: "Integrate PostgreSQL telemetry and rate-limiting.",
      assignees: ["AL"],
      dueDate: "Nov 15",
      completed: false,
    },
  ])
  const [showCompletedGoals, setShowCompletedGoals] = useState(true)
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [newGoalTag, setNewGoalTag] = useState("Engineering")
  const [newGoalDueDate, setNewGoalDueDate] = useState("Nov 20")

  // Attachments
  const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([
    {
      id: "att-1",
      name: "GitHub Repository (main)",
      type: "repo",
      url: "https://github.com/tindy-project",
      size: "Active branch",
    },
    {
      id: "att-2",
      name: "Figma UI/UX Design System",
      type: "design",
      url: "https://figma.com",
      size: "v2.4 specs",
    },
    {
      id: "att-3",
      name: "Architecture & API Contract",
      type: "doc",
      url: "#",
      size: "PDF document",
    },
  ])

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")

  // Calculate goal completion
  const completedGoalsCount = goals.filter((g) => g.completed).length
  const goalCompletionPercentage =
    goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0

  // Post update handler
  const handlePostUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUpdate.trim()) return

    const myInitials =
      profile.name
        ?.split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AL"

    const created: WorkspaceUpdate = {
      id: `u-${Date.now()}`,
      authorName: profile.name || "Alex Le",
      authorRole: isLeader ? "Project lead" : "Backend Developer",
      initials: myInitials,
      avatarColor: "bg-blue-100 text-blue-800",
      content: newUpdate.trim(),
      timestamp: "Just now",
      likes: 0,
    }

    setUpdates([created, ...updates])
    setNewUpdate("")
    notify("Update shared with team.")
  }

  // Toggle goal handler
  const toggleGoal = (goalId: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const next = !g.completed
          notify(next ? "Goal marked complete!" : "Goal marked incomplete.")
          return { ...g, completed: next }
        }
        return g
      }),
    )
  }

  // Add goal handler
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalTitle.trim()) return

    const newGoal: WorkspaceGoal = {
      id: `g-${Date.now()}`,
      tag: newGoalTag,
      title: newGoalTitle.trim(),
      assignees: ["AL"],
      dueDate: newGoalDueDate.trim() || "TBD",
      completed: false,
    }

    setGoals([...goals, newGoal])
    setNewGoalTitle("")
    setIsAddingGoal(false)
    notify("New goal added to workspace.")
  }

  // Copy link
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      notify("Workspace link copied to clipboard!")
    } catch {
      notify("Copied workspace link.")
    }
  }

  // Roster of members - deduplicate & merge roles for leader with preferred role
  const rosterMembers = useMemo(() => {
    const isCurrentLeader =
      (activeProject.leader &&
        profile.name &&
        activeProject.leader.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (authUser && activeProject.leaderId === authUser.user_id)

    const myRole = profile.role || "Backend Developer"
    const myName = profile.name || "Alex Le"
    const myInitials =
      myName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AL"

    if (isCurrentLeader) {
      // Current user is leader: merge leader title and preferred role into ONE entry
      return [
        {
          id: "m-leader-you",
          name: myName,
          role: `Project lead · ${myRole}`,
          initials: myInitials,
          isYou: true,
          color: "bg-amber-100 text-amber-800",
        },
        {
          id: "m-2",
          name: "An Hoang",
          role: "AI Engineer",
          initials: "AH",
          isYou: false,
          color: "bg-blue-100 text-blue-800",
        },
        {
          id: "m-3",
          name: "Linh Tran",
          role: "UI/UX Designer",
          initials: "LT",
          isYou: false,
          color: "bg-purple-100 text-purple-800",
        },
      ]
    }

    const leaderName = activeProject.leader || "Minh Nguyen"
    const leaderInitials =
      leaderName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "MN"

    return [
      {
        id: "m-leader",
        name: leaderName,
        role: "Project lead",
        initials: leaderInitials,
        isYou: false,
        color: "bg-amber-100 text-amber-800",
      },
      {
        id: "m-you",
        name: myName,
        role: myRole,
        initials: myInitials,
        isYou: true,
        color: "bg-emerald-100 text-emerald-800",
      },
      {
        id: "m-3",
        name: "An Hoang",
        role: "AI Engineer",
        initials: "AH",
        isYou: false,
        color: "bg-blue-100 text-blue-800",
      },
      {
        id: "m-4",
        name: "Linh Tran",
        role: "UI/UX Designer",
        initials: "LT",
        isYou: false,
        color: "bg-purple-100 text-purple-800",
      },
    ]
  }, [activeProject, profile.name, profile.role, authUser])

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading workspace for {activeProject.name}...
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Top Breadcrumb */}
      <div className="mb-3">
        <Link
          to="/team"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>My projects</span>
        </Link>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-1">
            BUILD SOMETHING TOGETHER
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Team workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            The people, plans, and conversations behind your next milestone.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLeader && (
            <Link
              to={`/project/${activeProject.id}/edit`}
              className="btn btn-secondary"
            >
              <Settings size={14} />
              <span>Manage project</span>
              <ArrowUpRight size={13} />
            </Link>
          )}

          <Link
            to="/messages"
            className="btn btn-secondary"
          >
            <MessageSquare size={14} />
            <span>Open team chat</span>
          </Link>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Main Card & Updates) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Project Header Bar */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-700">
                {activeProject.name} — Workspace
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {isCompleted ? "Completed" : "Active"}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsCompleted(!isCompleted)
                    notify(!isCompleted ? "Project marked complete!" : "Project marked active.")
                  }}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Check size={13} className={isCompleted ? "text-emerald-600" : "text-slate-400"} />
                  <span>{isCompleted ? "Completed" : "Mark complete"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy workspace link"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Copy size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("attachments")}
                  title="Attachments"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Paperclip size={14} />
                </button>

                <Link
                  to={`/project/${activeProject.id}`}
                  title="Open full project brief"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            {/* Card Content & Details */}
            <div className="p-5 sm:p-6">
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  {activeProject.type || "AI & Machine Learning"}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {activeProject.name}
                </h2>
              </div>

              {/* Meta Grid */}
              <div className="space-y-2.5 text-xs border-y border-slate-100 py-4 mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <span className="text-slate-500 font-medium">Status</span>
                  <div className="sm:col-span-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      In progress
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <span className="text-slate-500 font-medium">Commitment</span>
                  <div className="sm:col-span-3 text-slate-800 font-medium">
                    {activeProject.hours || 10} hrs / week &nbsp;•&nbsp; {activeProject.duration || "3 months"}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <span className="text-slate-500 font-medium">Assigned</span>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {rosterMembers.map((m) => (
                        <div
                          key={m.id}
                          className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold ${m.color}`}
                          title={`${m.name} (${m.role})`}
                        >
                          {m.initials}
                        </div>
                      ))}
                    </div>
                    <span className="text-slate-600 font-medium text-[11px]">
                      {rosterMembers.length} members
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <span className="text-slate-500 font-medium">Stack</span>
                  <div className="sm:col-span-3">
                    <Chips items={activeProject.skills || [".NET", "AWS", "PostgreSQL", "RAG", "LLM"]} />
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    activeTab === "comments"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Comments <span className="ml-1 text-[11px] text-slate-400 font-normal">{updates.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    activeTab === "details"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attachments")}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    activeTab === "attachments"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Attachments
                </button>
              </div>

              {/* Tab 1: Comments */}
              {activeTab === "comments" && (
                <div className="pt-4 space-y-5">
                  {/* Updates list */}
                  <div className="space-y-4">
                    {updates.map((u) => (
                      <div key={u.id} className="flex items-start gap-3 text-xs">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${u.avatarColor}`}
                        >
                          {u.initials}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-900 font-bold">{u.authorName}</strong>
                            {u.badgeText && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                {u.badgeText}
                              </span>
                            )}
                            <span className="text-slate-400 text-[11px]">{u.authorRole}</span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">{u.content}</p>
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                            <button
                              type="button"
                              onClick={() => {
                                setUpdates((prev) =>
                                  prev.map((item) =>
                                    item.id === u.id
                                      ? {
                                          ...item,
                                          likes: item.isLiked ? item.likes - 1 : item.likes + 1,
                                          isLiked: !item.isLiked,
                                        }
                                      : item,
                                  ),
                                )
                              }}
                              className={`hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 ${
                                u.isLiked ? "text-blue-600 font-semibold" : ""
                              }`}
                            >
                              <Heart size={11} className={u.isLiked ? "fill-blue-600" : ""} />
                              <span>Helpful ({u.likes})</span>
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setNewUpdate(`@${u.authorName} `)}
                              className="hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Composer */}
                  <form onSubmit={handlePostUpdate} className="pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 block mb-2">Share an update</span>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {profile.name
                          ?.split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "AL"}
                      </div>
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={3}
                          value={newUpdate}
                          onChange={(e) => setNewUpdate(e.target.value)}
                          placeholder="An idea, a question, a little progress..."
                          className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Good work starts with a conversation.
                          </span>
                          <button
                            type="submit"
                            disabled={!newUpdate.trim()}
                            className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}
                          >
                            <Send size={12} />
                            <span>Post update</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 2: Details */}
              {activeTab === "details" && (
                <div className="pt-4 space-y-4 text-xs text-slate-700">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">About the Project</h3>
                    <p className="leading-relaxed text-slate-600">
                      {activeProject.description || "No description provided yet."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">Project Goals</h3>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {(activeProject.goals || []).map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 3: Attachments */}
              {activeTab === "attachments" && (
                <div className="pt-4 space-y-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{att.name}</p>
                          <span className="text-[10px] text-slate-400">{att.size}</span>
                        </div>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors shrink-0"
                      >
                        Open
                      </a>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => notify("Upload feature available in full release.")}
                    className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add resource or attachment link</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Roles & Goals) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Project roles */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Project roles</h3>
              <span className="text-xs text-slate-500 font-medium">
                {rosterMembers.length} members
              </span>
            </div>

            {/* Roster list */}
            <div className="space-y-3 pt-1">
              {rosterMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.color}`}
                  >
                    {m.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                      <span>{m.name}</span>
                      {m.isYou && (
                        <span className="text-[10px] text-blue-600 font-normal">you</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite member button moved to the BOTTOM of member list */}
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="w-full py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus size={14} />
              <span>Invite member</span>
            </button>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <Link
                to={`/project/${activeProject.id}`}
                className="hover:text-blue-600 transition-colors font-medium text-slate-600"
              >
                View all members
              </Link>
              <span className="text-[11px]">Active roster</span>
            </div>
          </div>

          {/* Card 2: Team goals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Team goals ({goals.length})
                </h3>
                <div className="flex -space-x-1.5">
                  {rosterMembers.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold ${m.color}`}
                    >
                      {m.initials}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                One shared direction. A little progress, every day.
              </p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${goalCompletionPercentage}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-600 font-medium">
                {completedGoalsCount} of {goals.length} goals complete • {goalCompletionPercentage}%
              </span>
            </div>

            {/* Goals list */}
            <div className="space-y-3 pt-1">
              {goals
                .filter((g) => showCompletedGoals || !g.completed)
                .map((g) => (
                  <div key={g.id} className="space-y-1.5 text-xs">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                        g.tag === "Engineering"
                          ? "bg-blue-50 text-blue-700"
                          : g.tag === "Community"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {g.tag}
                    </span>
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleGoal(g.id)}
                        className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                        title={g.completed ? "Mark incomplete" : "Mark complete"}
                      >
                        {g.completed ? (
                          <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium transition-all ${
                            g.completed ? "line-through text-slate-400" : "text-slate-800"
                          }`}
                        >
                          {g.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-600">{g.assignees.join(" ")}</span>
                          <span>{g.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Add Goal Form */}
            {isAddingGoal ? (
              <form onSubmit={handleAddGoal} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Goal description..."
                  className="w-full p-2 border border-slate-200 rounded bg-white text-xs"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newGoalTag}
                    onChange={(e) => setNewGoalTag(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded bg-white text-xs"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Community">Community</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                  </select>
                  <input
                    type="text"
                    value={newGoalDueDate}
                    onChange={(e) => setNewGoalDueDate(e.target.value)}
                    placeholder="Due date (e.g. Nov 20)"
                    className="p-1.5 border border-slate-200 rounded bg-white text-xs flex-1"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingGoal(false)}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-xs"
                  >
                    Save goal
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                  className="text-slate-500 hover:text-slate-800 transition-colors font-medium cursor-pointer"
                >
                  {showCompletedGoals ? `Hide completed (${completedGoalsCount})` : `Show completed (${completedGoalsCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(true)}
                  className="text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add goal</span>
                </button>
              </div>
            )}
          </div>

          {/* Tip Banner */}
          <div className="border-l-2 border-emerald-500 pl-3 py-1 text-xs space-y-0.5">
            <p className="text-slate-700 font-bold">Small steps count.</p>
            <p className="text-slate-500">Keep your team in the loop.</p>
          </div>
        </div>
      </div>

      {/* Bottom Demo Note */}
      <div className="mt-12 text-center text-[11px] text-slate-400">
        Interactive demo • The roster, milestone plan, updates, and files are local to this preview and reset when you leave or refresh.
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Invite team member</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Invite a collaborator or student to join the <strong>{activeProject.name}</strong> team workspace.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Email address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@university.edu"
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inviteEmail.trim()) {
                    notify(`Invitation sent to ${inviteEmail}!`)
                    setInviteEmail("")
                    setShowInviteModal(false)
                  }
                }}
                disabled={!inviteEmail.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
