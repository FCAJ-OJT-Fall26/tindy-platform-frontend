import { useState, useEffect, useMemo, useCallback } from "react"
import { Link, useNavigate, useParams } from "react-router"
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
  ExternalLink,
  X,
  Layers,
  Heart,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  UserCheck,
  UserX,
  Sparkles,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import { Chips, PageHeader, Avatar, Badge, Button } from "../../components/ui"
import { getProjectByIdApi, mapProjectDetailToUiProject } from "../../services/projects.service"
import {
  getProjectApplications,
  decideApplication,
  applicationErrorMessage,
} from "../../services/applications.service"
import type { ProjectDetailDto } from "../../types/project"
import type { ApplicationReviewDto } from "../../types/application"

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

export function ProjectWorkspaceView({ projectId: propProjectId }: ProjectWorkspaceViewProps) {
  const navigate = useNavigate()
  const { projectId: routeProjectId, id: routeId } = useParams<{ projectId?: string; id?: string }>()
  const projectId = propProjectId || routeProjectId || routeId

  const { authUser, profile, projects, notify } = useTindy()

  // Project data loading from API
  const [projectDetail, setProjectDetail] = useState<ProjectDetailDto | null>(null)
  const [project, setProject] = useState<Project | null>(() => {
    return projects.find((p) => p.id === projectId) ?? null
  })
  const [loading, setLoading] = useState(!project && Boolean(projectId))

  // Real candidates & applications for this project
  const [applications, setApplications] = useState<ApplicationReviewDto[]>([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [decidingId, setDecidingId] = useState<string | null>(null)

  // Status & Actions
  const [isCompleted, setIsCompleted] = useState(false)
  const [activeTab, setActiveTab] = useState<"comments" | "candidates" | "details" | "attachments">("comments")

  // Goals
  const [goals, setGoals] = useState<WorkspaceGoal[]>([])
  const [showCompletedGoals, setShowCompletedGoals] = useState(true)
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [newGoalTag, setNewGoalTag] = useState("Milestone")
  const [newGoalDueDate, setNewGoalDueDate] = useState("Sprint 1")

  // Feed / Comments
  const [newUpdate, setNewUpdate] = useState("")
  const [updates, setUpdates] = useState<WorkspaceUpdate[]>([])

  // Attachments
  const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([
    {
      id: "att-1",
      name: "GitHub Repository (main)",
      type: "repo",
      url: "https://github.com",
      size: "Active branch",
    },
    {
      id: "att-2",
      name: "Architecture & API Contract",
      type: "doc",
      url: "#",
      size: "PDF document",
    },
  ])

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")

  const loadApplications = useCallback((projId: string) => {
    setLoadingApplications(true)
    getProjectApplications(projId, { status: "all", page: 1, page_size: 50 })
      .then((res) => {
        setApplications(res.items || [])
      })
      .catch((err) => {
        console.warn("Could not load project applications", err)
        setApplications([])
      })
      .finally(() => {
        setLoadingApplications(false)
      })
  }, [])

  const reloadProjectData = useCallback((projId: string) => {
    getProjectByIdApi(projId)
      .then((detail) => {
        setProjectDetail(detail)
        setProject(mapProjectDetailToUiProject(detail))
        if (detail.goals && detail.goals.length > 0) {
          setGoals((prev) => {
            if (prev.length > 0) return prev
            return detail.goals.map((g, idx) => ({
              id: `g-${idx + 1}`,
              tag: "Milestone",
              title: g,
              assignees: [detail.leader.initials || "PL"],
              dueDate: "Sprint 1",
              completed: false,
            }))
          })
        }
      })
      .catch((err) => {
        console.warn("Could not reload project detail", err)
      })
  }, [])

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoading(true)

    getProjectByIdApi(projectId)
      .then((detail) => {
        if (!active) return
        setProjectDetail(detail)
        setProject(mapProjectDetailToUiProject(detail))

        if (detail.goals && detail.goals.length > 0) {
          setGoals(
            detail.goals.map((g, idx) => ({
              id: `g-${idx + 1}`,
              tag: "Milestone",
              title: g,
              assignees: [detail.leader.initials || "PL"],
              dueDate: "Sprint 1",
              completed: false,
            }))
          )
        }

        // Set initial welcome update based on real leader
        setUpdates([
          {
            id: "u-1",
            authorName: detail.leader.display_name,
            authorRole: "Project lead",
            initials: detail.leader.initials || detail.leader.display_name.slice(0, 2).toUpperCase(),
            avatarColor: "bg-blue-50 text-blue-700 border border-blue-200",
            content: `Welcome to ${detail.name}! Team workspace is ready for collaboration.`,
            timestamp: "Today",
            likes: 0,
          },
        ])
      })
      .catch(() => {
        const found = projects.find((p) => p.id === projectId)
        if (found && active) setProject(found)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    loadApplications(projectId)

    return () => {
      active = false
    }
  }, [projectId, projects, loadApplications])

  // Fallback project if loading
  const activeProject = useMemo<Project>(() => {
    if (project) return project
    return {
      id: projectId || "workspace",
      name: "Project Workspace",
      tagline: "Collaborative team workspace",
      description: "Manage milestones, team members, and open recruitment roles.",
      type: "Web Application",
      skills: ["React", "TypeScript", ".NET"],
      role: "Lead",
      hours: 10,
      duration: "3 months",
      difficulty: "intermediate",
      team: 1,
      capacity: 5,
      openings: 0,
      leader: profile.name || "Leader",
      leaderId: authUser?.user_id,
      initials: "PW",
      color: "indigo",
      created: Date.now(),
      closing: 14,
      factors: [90, 85, 95, 80, 88],
      goals: [],
      gap: [],
      matchAvailable: false,
    }
  }, [project, projectId, profile.name, authUser])

  const isLeader = Boolean(
    authUser &&
      (activeProject.leaderId === authUser.user_id ||
        projectDetail?.leader.user_id === authUser.user_id ||
        activeProject.leader?.toLowerCase() === profile.name?.toLowerCase()),
  )

  // Real roster members from Backend API (NO mock An Hoang or Linh Tran)
  const rosterMembers = useMemo(() => {
    if (projectDetail?.team_members && projectDetail.team_members.length > 0) {
      return projectDetail.team_members.map((m) => {
        const isYou = authUser ? m.user_id === authUser.user_id : false
        const initials =
          m.initials ||
          m.display_name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() ||
          "U"
        return {
          id: m.user_id,
          name: m.display_name,
          role: m.is_leader ? `Project lead · ${m.role_title}` : m.role_title,
          initials,
          isYou,
          color: m.is_leader ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700 border border-slate-200",
          isLeader: m.is_leader,
        }
      })
    }

    // Default to the real leader from API or profile
    const leaderName = projectDetail?.leader?.display_name || activeProject.leader || profile.name || "Alex Le"
    const isCurrentLeader =
      Boolean(authUser && (activeProject.leaderId === authUser.user_id || projectDetail?.leader.user_id === authUser.user_id)) ||
      Boolean(profile.name && leaderName.toLowerCase() === profile.name.toLowerCase())
    const myRole = profile.role || "Project Lead"
    const leaderInitials =
      projectDetail?.leader?.initials ||
      leaderName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() ||
      "PL"

    return [
      {
        id: projectDetail?.leader?.user_id || authUser?.user_id || "m-leader",
        name: leaderName,
        role: isCurrentLeader ? `Project lead · ${myRole}` : "Project lead",
        initials: leaderInitials,
        isYou: isCurrentLeader,
        color: "bg-blue-50 text-blue-700 border border-blue-200",
        isLeader: true,
      },
    ]
  }, [projectDetail, activeProject, profile.name, profile.role, authUser])

  // Candidates stats
  const pendingApplications = useMemo(
    () => applications.filter((a) => a.application.status === "pending"),
    [applications],
  )
  const acceptedApplications = useMemo(
    () => applications.filter((a) => a.application.status === "accepted"),
    [applications],
  )

  // Decide candidate application (Accept / Reject)
  const handleDecideApplication = async (
    applicationId: string,
    action: "accept" | "reject",
    applicantName: string,
  ) => {
    if (!projectId || decidingId) return
    setDecidingId(applicationId)
    try {
      await decideApplication(projectId, applicationId, action)
      notify(
        action === "accept"
          ? `${applicantName} has been accepted into the project team!`
          : `Application from ${applicantName} was rejected.`,
      )
      loadApplications(projectId)
      reloadProjectData(projectId)
    } catch (err) {
      notify(applicationErrorMessage(err))
    } finally {
      setDecidingId(null)
    }
  }

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
        .toUpperCase() || "ME"

    const created: WorkspaceUpdate = {
      id: `u-${Date.now()}`,
      authorName: profile.name || "Team Member",
      authorRole: isLeader ? "Project lead" : profile.role || "Contributor",
      initials: myInitials,
      avatarColor: "bg-blue-50 text-blue-700 border border-blue-200",
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
      assignees: [rosterMembers[0]?.initials || "ME"],
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

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading workspace for {activeProject.name}...
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <Link
          to="/team"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Team workspace</span>
        </Link>
      </div>

      <PageHeader
        title={activeProject.name}
        description="The people, plans, and conversations behind your next milestone."
        action={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isLeader && (
              <>
                <Link
                  to={`/projects/${activeProject.id}/applications`}
                  className="btn btn-secondary"
                  style={{ gap: "6px" }}
                >
                  <Users size={14} />
                  <span>
                    Candidates {applications.length > 0 ? `(${applications.length})` : ""}
                  </span>
                  {pendingApplications.length > 0 && (
                    <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {pendingApplications.length}
                    </span>
                  )}
                </Link>

                <Link
                  to={`/project/${activeProject.id}/edit`}
                  className="btn btn-secondary"
                  style={{ gap: "6px" }}
                >
                  <Settings size={14} />
                  <span>Manage project</span>
                  <ArrowUpRight size={13} />
                </Link>
              </>
            )}

            <Link
              to="/messages"
              className="btn btn-secondary"
              style={{ gap: "6px" }}
            >
              <MessageSquare size={14} />
              <span>Open team chat</span>
            </Link>
          </div>
        }
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Main Card & Updates) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Project Header Bar */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-700">
                {activeProject.name} — Workspace
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
                  {activeProject.type || "Web Application"}
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
                      {projectDetail?.status === "recruiting"
                        ? "Recruiting"
                        : projectDetail?.status === "completed"
                        ? "Completed"
                        : "In progress"}
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
                      {rosterMembers.length} {rosterMembers.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <span className="text-slate-500 font-medium">Stack</span>
                  <div className="sm:col-span-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(activeProject.skills || []).map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontSize: "11px",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                            fontWeight: 500,
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-100 -mx-5 sm:-mx-6 px-5 sm:px-6 bg-slate-50/30 gap-6 text-xs font-semibold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === "comments"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Comments</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
                    {updates.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("candidates")}
                  className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activeTab === "candidates"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Candidates</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      pendingApplications.length > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {applications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`py-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeTab === "details"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Details
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("attachments")}
                  className={`py-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeTab === "attachments"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Attachments ({attachments.length})
                </button>
              </div>

              {/* Tab 1: Comments */}
              {activeTab === "comments" && (
                <div className="pt-4 space-y-4">
                  {/* Feed stream */}
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
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-bold shrink-0">
                        {profile.name
                          ?.split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "ME"}
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
                            className="btn btn-primary"
                            style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}
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

              {/* Tab 2: Candidates / Applicants (Real API Data) */}
              {activeTab === "candidates" && (
                <div className="pt-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Interested Candidates & Applicants ({applications.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Candidates who expressed interest and applied to roles in {activeProject.name}.
                      </p>
                    </div>
                    {isLeader && (
                      <Link
                        to={`/projects/${activeProject.id}/applications`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                      >
                        <span>Leader review panel</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>

                  {loadingApplications && (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Loading candidate applications...
                    </div>
                  )}

                  {!loadingApplications && applications.length === 0 && (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                      <Users size={28} className="mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-800">No candidates have applied yet.</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        When students discover this project and submit applications for open positions, they will appear here with rule match scores.
                      </p>
                      <div className="pt-2">
                        <Link
                          to={`/project/${activeProject.id}`}
                          className="btn btn-secondary"
                          style={{ padding: "6px 14px", fontSize: "11.5px" }}
                        >
                          View recruitment positions
                        </Link>
                      </div>
                    </div>
                  )}

                  {!loadingApplications && applications.length > 0 && (
                    <div className="space-y-3">
                      {applications.map((app) => {
                        const status = app.application.status
                        const initials =
                          app.applicant.display_name
                            ?.split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "CD"

                        return (
                          <div
                            key={app.application.application_id}
                            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-xs font-bold text-slate-900">
                                      {app.applicant.display_name}
                                    </strong>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        status === "accepted"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : status === "rejected"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                    >
                                      {status === "pending"
                                        ? "Pending review"
                                        : status === "accepted"
                                        ? "Accepted"
                                        : "Rejected"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    Applied for:{" "}
                                    <strong className="text-slate-700">
                                      {app.applied_position.title}
                                    </strong>
                                    {app.applicant.preferred_role_name && (
                                      <span> • Preferred: {app.applicant.preferred_role_name}</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                                  <Sparkles size={11} />
                                  <span>{app.matching.match_score}% match</span>
                                </span>
                              </div>
                            </div>

                            {app.application.message && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                &ldquo;{app.application.message}&rdquo;
                              </p>
                            )}

                            {app.applicant.skills && app.applicant.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {app.applicant.skills.map((s) => (
                                  <span
                                    key={s.skill_id}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                  >
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                              <Link
                                to={`/users/${app.applicant.user_id}`}
                                className="text-slate-500 hover:text-blue-600 transition-colors text-[11px] font-medium"
                              >
                                View student profile →
                              </Link>

                              {isLeader && status === "pending" && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={Boolean(decidingId)}
                                    onClick={() =>
                                      handleDecideApplication(
                                        app.application.application_id,
                                        "reject",
                                        app.applicant.display_name,
                                      )
                                    }
                                    className="px-2.5 py-1 rounded text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(decidingId)}
                                    onClick={() =>
                                      handleDecideApplication(
                                        app.application.application_id,
                                        "accept",
                                        app.applicant.display_name,
                                      )
                                    }
                                    className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <UserCheck size={12} />
                                    <span>Accept to team</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Details */}
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

              {/* Tab 4: Attachments */}
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
                    onClick={() => notify("Resource links can be saved locally in this session.")}
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

        {/* Right Column (Roles, Candidates & Goals) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Project roles & Members (Real API Data) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Project roles</h3>
              <span className="text-xs text-slate-500 font-medium">
                {rosterMembers.length} {rosterMembers.length === 1 ? "member" : "members"}
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

            {/* Invite member button */}
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

          {/* Card 2: Candidates Summary Card (Real API Data) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Applicants & Candidates
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  pendingApplications.length > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {applications.length}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {pendingApplications.length > 0
                ? `${pendingApplications.length} candidates pending your review.`
                : applications.length > 0
                ? `${applications.length} total applications received.`
                : "No applications yet for open positions."}
            </p>

            {applications.slice(0, 3).map((app) => (
              <div
                key={app.application.application_id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-800 truncate">{app.applicant.display_name}</p>
                  <span className="text-[10px] text-slate-500">{app.applied_position.title}</span>
                </div>
                <span className="text-[11px] font-bold text-blue-600 shrink-0">
                  {app.matching.match_score}%
                </span>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("candidates")}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                View candidates tab →
              </button>
              {isLeader && (
                <Link
                  to={`/projects/${activeProject.id}/applications`}
                  className="text-slate-500 hover:text-slate-800 font-medium"
                >
                  Full review
                </Link>
              )}
            </div>
          </div>

          {/* Card 3: Team goals */}
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
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: "3px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        display: "inline-block",
                      }}
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
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGoalTag}
                    onChange={(e) => setNewGoalTag(e.target.value)}
                    placeholder="Tag"
                    className="w-1/2 p-2 border border-slate-200 rounded bg-white text-xs"
                  />
                  <input
                    type="text"
                    value={newGoalDueDate}
                    onChange={(e) => setNewGoalDueDate(e.target.value)}
                    placeholder="Due date"
                    className="w-1/2 p-2 border border-slate-200 rounded bg-white text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingGoal(false)}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white rounded font-medium"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  {showCompletedGoals ? "Hide completed" : "Show all"}
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
        </div>
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
    </>
  )
}
