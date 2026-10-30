import { useCallback, useState, useMemo } from "react"
import { Link, useSearchParams } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  FolderKanban,
  Mail,
  Users,
  Send,
  Bookmark,
  Crown,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { Badge, Button, EmptyState, Modal, PageHeader, ProjectCard } from "../../components/ui"
import { initialProjects, type Project } from "../../data"
import { ApiError } from "../../services/apiClient"
import useMyProjects from "../../hooks/useMyProjects"
import useRemoteResource from "../../hooks/useRemoteResource"
import { projectErrorMessage } from "../../services/projectEditor.service"
import { getProjectByIdApi, isGuid, mapProjectDetailToUiProject } from "../../services/projects.service"
import { useTindy } from "../../store"
import { useExplanation } from "../../utils/useExplanation"
import MyApplicationsView from "./MyApplicationsView"
import SavedProjectsView from "./SavedProjectsView"
import useMyApplications from "../../hooks/useMyApplications"

export type TabKey = "Interested" | "Saved" | "Invited" | "Active" | "Leading" | "Completed"
export type StageId = "all" | "pipeline" | "teams" | "completed"

interface StageGroup {
  id: StageId
  stageNumber: string
  label: string
  tabs: TabKey[]
}

const STAGE_GROUPS: StageGroup[] = [
  {
    id: "pipeline",
    stageNumber: "Stage 1",
    label: "Opportunity Pipeline",
    tabs: ["Interested", "Saved", "Invited"],
  },
  {
    id: "teams",
    stageNumber: "Stage 2",
    label: "Active Collaboration",
    tabs: ["Active", "Leading"],
  },
  {
    id: "completed",
    stageNumber: "Stage 3",
    label: "Portfolio & Shipped",
    tabs: ["Completed"],
  },
]

interface TabConfig {
  key: TabKey
  label: string
  stageId: StageId
  stageLabel: string
  icon: typeof Send
  description: string
  emptyTitle: string
  emptyDescription: string
  emptyActionText: string
  emptyActionTo: string
}

const TAB_CONFIGS: Record<TabKey, TabConfig> = {
  Interested: {
    key: "Interested",
    label: "Applications",
    stageId: "pipeline",
    stageLabel: "Opportunity Pipeline",
    icon: Send,
    description: "Your confirmed applications and review history.",
    emptyTitle: "No applications sent yet.",
    emptyDescription: "Explore projects and confirm a position application when ready.",
    emptyActionText: "Discover projects",
    emptyActionTo: "/discover",
  },
  Saved: {
    key: "Saved",
    label: "Saved",
    stageId: "pipeline",
    stageLabel: "Opportunity Pipeline",
    icon: Bookmark,
    description: "Bookmarked opportunities · Saved to evaluate requirements or apply when you are ready.",
    emptyTitle: "You haven't saved any projects yet.",
    emptyDescription: "Save projects that catch your eye during discovery. You can always come back to review them.",
    emptyActionText: "Discover projects",
    emptyActionTo: "/discover",
  },
  Invited: {
    key: "Invited",
    label: "Invited",
    stageId: "pipeline",
    stageLabel: "Opportunity Pipeline",
    icon: Mail,
    description: "Demo preview · Invitations are not connected to the backend yet.",
    emptyTitle: "No pending invitations.",
    emptyDescription: "When a project leader invites you to their team, the invitation and role commitment will appear here.",
    emptyActionText: "Discover projects",
    emptyActionTo: "/discover",
  },
  Active: {
    key: "Active",
    label: "Active",
    stageId: "teams",
    stageLabel: "Active Collaboration",
    icon: Users,
    description: "In-flight team projects · Active sprints and workspace collaboration where you are a confirmed member.",
    emptyTitle: "No active projects yet.",
    emptyDescription: "Once your application is approved or you accept an invitation, your active team projects will show here.",
    emptyActionText: "Find teams to join",
    emptyActionTo: "/discover",
  },
  Leading: {
    key: "Leading",
    label: "Leading",
    stageId: "teams",
    stageLabel: "Active Collaboration",
    icon: Crown,
    description: "Projects led by you · Manage candidate applications and team progress in Leader Workspace.",
    emptyTitle: "No projects led by you yet.",
    emptyDescription: "Ready to launch your own venture? Create a project in Leader Workspace to assemble teammates.",
    emptyActionText: "Go to Leader Workspace",
    emptyActionTo: "/leader",
  },
  Completed: {
    key: "Completed",
    label: "Completed",
    stageId: "completed",
    stageLabel: "Portfolio & Shipped",
    icon: CheckCircle2,
    description: "Delivered & shipped projects · Preserved in your portfolio to showcase demonstrated capabilities.",
    emptyTitle: "No completed projects yet.",
    emptyDescription: "Finished projects will be preserved here as part of your team track record and verifiable experience.",
    emptyActionText: "Discover new projects",
    emptyActionTo: "/discover",
  },
}

function Cards({ projects, status, pendingCounts }: { projects: Project[]; status?: string; pendingCounts?: Record<string, number> }) {
  const { saved, toggleSave } = useTindy()
  const explanation = useExplanation()
  return (
    <>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            saved={saved.includes(project.id)}
            onSave={() => toggleSave(project.id)}
            onExplain={() => explanation.open(project)}
            status={pendingCounts ? `${pendingCounts[project.id] ?? 0} pending applications` : status}
          />
        ))}
      </div>
      {explanation.element}
    </>
  )
}

export function MyProjectsScreen() {
  const {
    authUser,
    interested,
    saved,
    invited,
    setInvited,
    setActive,
    notify,
  } = useTindy()

  const [params, setParams] = useSearchParams()
  const rawTab = params.get("tab")
  const validTabs: TabKey[] = ["Interested", "Saved", "Invited", "Active", "Leading", "Completed"]
  const tab: TabKey = validTabs.includes(rawTab as TabKey)
    ? (rawTab as TabKey)
    : "Active"

  const [invitation, setInvitation] = useState<Project | null>(null)
  const resource = useMyProjects()
  const applications = useMyApplications()
  const currentTabConfig = TAB_CONFIGS[tab] || TAB_CONFIGS.Active
  const activeStageId: StageId = currentTabConfig.stageId
  const localIds = ""
  const loadBookmarks = useCallback(async (signal: AbortSignal) => {
    const details = await Promise.all(localIds.split(",").filter(Boolean).map(async id => {
      try { return await getProjectByIdApi(id, signal) }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error }
    }))
    return details.filter(detail => detail !== null).map(detail => mapProjectDetailToUiProject(detail))
  }, [localIds])
  const bookmarks = useRemoteResource(authUser ? authUser.user_id + ":" + localIds : null, loadBookmarks)
  const projects = [...new Map([...(resource.data?.projects ?? []), ...(bookmarks.data ?? [])].map(project => [project.id, project])).values()]
  const completed = resource.data?.projects.filter(project => project.status === "completed").map(project => project.id) ?? []
  const leadingIds = resource.data?.leading_projects.filter(project => project.status !== "archived" && project.status !== "completed").map(project => project.project_id) ?? []
  const active = resource.data?.joined_projects.filter(project => project.status !== "archived" && project.status !== "completed").map(project => project.project_id) ?? []
  const statuses: Record<TabKey, string[]> = {
    Interested: applications.data?.map(a => a.application_id) ?? [], Saved: saved.filter(isGuid), Invited: [],
    Active: active, Leading: leadingIds, Completed: completed,
  }
  const selected = projects.filter(project => statuses[tab].includes(project.id))
  const stageCounts = {
    pipeline: statuses.Interested.length + statuses.Saved.length + statuses.Invited.length,
    teams: active.length + leadingIds.length, completed: completed.length,
  }
  const totalPendingApplicants = resource.data?.leading_projects.reduce((sum, project) => sum + project.pending_applications_count, 0) ?? 0
  const showingBookmarks = ["Saved", "Interested", "Invited"].includes(tab)
  const loading = showingBookmarks ? bookmarks.loading : resource.loading
  const error = showingBookmarks ? bookmarks.error : resource.error
  const retry = showingBookmarks ? bookmarks.reload : resource.reload

  return (
    <>
      <PageHeader
        title="My projects"
        description="Track your complete matching journey — from expressing interest to active team collaboration and shipped deliverables."
        action={
          <Link to="/discover" className="btn btn-secondary">
            Discover projects <ArrowUpRight size={15} />
          </Link>
        }
      />

      <div className="matching-journey-wrapper">
        {/* Stage Overview Chips */}
        <div className="matching-journey-stages" role="navigation" aria-label="Journey stages">
          {STAGE_GROUPS.map((group) => {
            const isCurrentStage = activeStageId === group.id
            const count = stageCounts[group.id as keyof typeof stageCounts]
            return (
              <button
                key={group.id}
                type="button"
                className={`matching-stage-pill ${isCurrentStage ? "active" : ""}`}
                onClick={() => setParams({ tab: group.tabs[0] })}
                title={`Jump to ${group.label}`}
              >
                <span className="stage-num">{group.stageNumber}</span>
                <span>{group.label}</span>
                <span className="stage-count">({count})</span>
              </button>
            )
          })}
        </div>

        {/* 6 Tabs Grouped in Matching Journey Sequence */}
        <div className="journey-tabs-bar" role="tablist" aria-label="Project tabs">
          {STAGE_GROUPS.map((group, groupIdx) => (
            <div key={group.id} style={{ display: "contents" }}>
              {groupIdx > 0 && <span className="journey-tab-sep" aria-hidden="true" />}
              {group.tabs.map((tabKey) => {
                const config = TAB_CONFIGS[tabKey]
                const Icon = config.icon
                const count = statuses[tabKey]?.length || 0
                const isActive = tab === tabKey
                const hasPendingApplicants = tabKey === "Leading" && totalPendingApplicants > 0

                return (
                  <button
                    key={tabKey}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setParams({ tab: tabKey })}
                    className={`journey-tab-item ${isActive ? "active" : ""}`}
                  >
                    <Icon className="tab-icon" />
                    <span>{config.label}</span>
                    {tabKey === "Invited" && <span className="beta">DEMO</span>}
                    <span className="tab-count-badge">{count}</span>
                    {hasPendingApplicants && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          background: "#fee2e2",
                          color: "#dc2626",
                          padding: "1px 5px",
                          borderRadius: "9999px",
                          marginLeft: "2px",
                        }}
                        title={`${totalPendingApplicants} applicants waiting`}
                      >
                        +{totalPendingApplicants}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Contextual Description Banner */}
        <div className="journey-tab-context-bar">
          <div className="journey-tab-context-left">
            <span
              className={`journey-tab-context-badge ${
                currentTabConfig.stageId === "pipeline"
                  ? "pipeline"
                  : currentTabConfig.stageId === "teams"
                  ? "active-team"
                  : "shipped"
              }`}
            >
              {currentTabConfig.stageLabel}
            </span>
            <span>{currentTabConfig.description}</span>
          </div>

          <div className="journey-tab-context-right">
            {tab === "Leading" && (
              <Link
                to="/leader"
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}
              >
                Leader Workspace <ArrowUpRight size={13} />
              </Link>
            )}
            {tab === "Interested" && (
              <Link
                to="/discover"
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}
              >
                Swipe more projects <Sparkles size={13} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div key={tab} className="tab-pane-transition">
        {tab === "Interested" ? <MyApplicationsView /> : tab === "Saved" ? <SavedProjectsView /> : tab === "Invited" ? <section className="panel" aria-label="Invitations demo preview"><Badge tone="blue">DEMO PREVIEW</Badge><h2>Invited</h2><p>Leaders can invite you to a specific project position. This preview lets you explore the review, accept and decline flow; it does not create a real invitation or team membership.</p><Button variant="secondary" onClick={() => setInvitation(initialProjects[0])}>Preview invitation</Button></section> : loading ? <div className="info-banner" role="status">Loading projects…</div> : error ? <div className="info-banner" role="alert">{projectErrorMessage(error)} <button onClick={retry}>Retry</button></div> : selected.length ? (
          <>
            <Cards
              projects={selected}
              pendingCounts={tab === "Leading" ? Object.fromEntries((resource.data?.leading_projects ?? []).map(project => [project.project_id, project.pending_applications_count])) : undefined}
              status={
                tab === "Active"
                  ? "You’re on the team"
                  : tab === "Leading"
                  ? totalPendingApplicants > 0
                    ? `Project leader · ${totalPendingApplicants} pending applicants`
                    : "You’re leading this project"
                  : tab === "Completed"
                  ? "Project completed"
                  : undefined
              }
            />
          </>
        ) : (
          <EmptyState
            title={currentTabConfig.emptyTitle}
            description={currentTabConfig.emptyDescription}
            action={
              <Link to={currentTabConfig.emptyActionTo} className="btn btn-primary">
                {currentTabConfig.emptyActionText} <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </div>

      {invitation && (
        <Modal title="Team invitation" onClose={() => setInvitation(null)}>
          <Badge tone="blue">DEMO INVITATION</Badge>
          <p>Sample invitation — these actions only close the preview and do not change your team membership.</p>
          <h2>Build with {invitation.name}</h2>
          <p>
            {invitation.leader} invited you to join as a {invitation.role}.
          </p>
          <div className="invitation-terms">
            <span>
              <Clock size={16} />
              {invitation.hours} hours/week
            </span>
            <span>
              <FolderKanban size={16} />
              {invitation.duration}
            </span>
            <span>
              <Users size={16} />
              {invitation.team} current teammates
            </span>
          </div>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setInvitation(null)
                notify("Demo: invitation declined in this preview.")
              }}
            >
              Decline
            </Button>
            <Button
              onClick={() => {
                setInvitation(null)
                notify("Demo: invitation accepted in this preview. No team membership was created.")
              }}
            >
              Accept & join team <Check size={15} />
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export { MyProjectsScreen as MyProjects }
export default MyProjectsScreen
