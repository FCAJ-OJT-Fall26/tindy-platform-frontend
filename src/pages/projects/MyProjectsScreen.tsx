import { useCallback, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock,
  Crown,
  FolderKanban,
  Mail,
  Sparkles,
  Users,
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
import useMyApplications from "../../hooks/useMyApplications"
import useDiscoveryFeed from "../../hooks/useDiscoveryFeed"
import { buildProjectRuleMatch } from "../../services/discovery.service"
import { useMemo } from "react"

function Cards({
  projects,
  status,
  pendingCounts,
}: {
  projects: Project[]
  status?: string
  pendingCounts?: Record<string, number>
}) {
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
    profile,
    interested,
    saved,
    savedProjects,
    invited,
    setInvited,
    setActive,
    notify,
  } = useTindy()

  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get("tab")
  const defaultTab =
    location.pathname === "/saved"
      ? "Saved"
      : location.pathname === "/interests"
      ? "Interested"
      : "Interested"
  const tab = rawTab || defaultTab

  const [invitation, setInvitation] = useState<Project | null>(null)
  const resource = useMyProjects()
  const applications = useMyApplications()

  const localIds = [
    ...new Set([
      ...saved,
      ...interested,
      ...invited,
      ...(applications.data?.map((a) => a.project_id) ?? []),
      ...(savedProjects.data?.map((p) => p.project_id) ?? []),
    ].filter(isGuid)),
  ]
    .sort()
    .join(",")

  const loadBookmarks = useCallback(async (signal: AbortSignal) => {
    const details = await Promise.all(
      localIds.split(",").filter(Boolean).map(async (id) => {
        try {
          return await getProjectByIdApi(id, signal)
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return null
          throw error
        }
      })
    )
    return details.filter((detail) => detail !== null).map((detail) => mapProjectDetailToUiProject(detail))
  }, [localIds])

  const feed = useDiscoveryFeed()
  const bookmarks = useRemoteResource(authUser ? authUser.user_id + ":" + localIds : null, loadBookmarks)
  const projects = [...new Map([...(resource.data?.projects ?? []), ...(bookmarks.data ?? [])].map((project) => [project.id, project])).values()]
  const completed = resource.data?.projects.filter((project) => project.status === "completed").map((project) => project.id) ?? []
  const leadingIds = resource.data?.leading_projects.filter((project) => project.status !== "archived" && project.status !== "completed").map((project) => project.project_id) ?? []
  const active = resource.data?.joined_projects.filter((project) => project.status !== "archived" && project.status !== "completed").map((project) => project.project_id) ?? []

  const feedCardMap = useMemo(() => {
    return new Map((feed.items || []).map((card) => [card.project_id, card]))
  }, [feed.items])

  const enrichedProjects = useMemo(() => {
    return projects.map((project) => {
      const feedCard = feedCardMap.get(project.id)
      if (feedCard) {
        return {
          ...project,
          matchAvailable: true,
          serverMatch: feedCard,
        }
      }
      if (!project.serverMatch) {
        const computedMatch = buildProjectRuleMatch(project, profile)
        return {
          ...project,
          matchAvailable: true,
          serverMatch: computedMatch,
        }
      }
      return {
        ...project,
        matchAvailable: true,
      }
    })
  }, [projects, feedCardMap, profile])

  const statuses: Record<string, string[]> = {
    Interested: [
      ...new Set([
        ...(applications.data?.map((a) => a.project_id) ?? []),
        ...interested.filter(isGuid),
      ]),
    ],
    Saved: [
      ...new Set([
        ...(savedProjects.data?.map((p) => p.project_id) ?? []),
        ...saved.filter(isGuid),
      ]),
    ],
    Invited: invited.filter(isGuid),
    Active: active,
    Leading: leadingIds,
    Completed: completed,
  }

  const selected = enrichedProjects.filter((project) => (statuses[tab] || []).includes(project.id))
  const totalPendingApplicants = resource.data?.leading_projects.reduce((sum, project) => sum + project.pending_applications_count, 0) ?? 0
  const showingBookmarks = ["Saved", "Interested", "Invited"].includes(tab)
  const loading = showingBookmarks ? bookmarks.loading : resource.loading
  const error = showingBookmarks ? bookmarks.error : resource.error
  const retry = showingBookmarks ? bookmarks.reload : resource.reload

  const cardStatus =
    tab === "Interested"
      ? "Application sent · Waiting for leader"
      : tab === "Saved"
      ? "Bookmarked project"
      : tab === "Invited"
      ? "Invitation pending"
      : tab === "Active"
      ? "Team member · Active"
      : tab === "Leading"
      ? totalPendingApplicants > 0
        ? `Project leader · ${totalPendingApplicants} pending applicants`
        : "Project leader"
      : tab === "Completed"
      ? "Project completed"
      : undefined

  return (
    <>
      <PageHeader
        title={location.pathname === "/interests" ? "My interests" : "My projects"}
        description="From interested applicants to the projects you ship with your team."
        action={
          <Link to="/discover" className="btn btn-secondary">
            Discover projects <ArrowUpRight size={15} />
          </Link>
        }
      />

      <div className="status-tabs">
        {Object.entries(statuses).map(([status, items]) => (
          <button
            key={status}
            onClick={() => setParams({ tab: status })}
            className={tab === status ? "active" : ""}
          >
            {status}
            <span>{items.length}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="tab-pane-transition">
        {loading ? (
          <div className="info-banner" role="status">
            Loading projects…
          </div>
        ) : error ? (
          <div className="info-banner" role="alert">
            {projectErrorMessage(error)} <button onClick={retry}>Retry</button>
          </div>
        ) : selected.length > 0 ? (
          <>
            {tab === "Interested" && (
              <div className="info-banner">
                <Sparkles size={18} />
                <span>
                  Applications and interest sent. Awaiting project leaders to review your profile.
                </span>
              </div>
            )}

            {tab === "Saved" && (
              <div className="info-banner">
                <Bookmark size={18} />
                <span>
                  Bookmarked opportunities. Saved to evaluate requirements or apply when you are ready.
                </span>
              </div>
            )}

            {tab === "Invited" && (
              <div className="info-banner">
                <Mail size={18} />
                <span>
                  Team invitations sent to you. Review the invitation to see the role and commitment.
                </span>
              </div>
            )}

            {tab === "Active" && (
              <div className="info-banner">
                <Check size={18} />
                <span>
                  Active team projects collaborating in FCAJ where you are a confirmed member.
                </span>
              </div>
            )}

            {tab === "Leading" && (
              <div className="info-banner">
                <Crown size={18} />
                <span>
                  Projects led by you. Manage candidate applications and team progress in Leader Workspace.
                </span>
              </div>
            )}

            {tab === "Completed" && (
              <div className="info-banner">
                <FolderKanban size={18} />
                <span>
                  Delivered & shipped projects preserved in your verifiable portfolio.
                </span>
              </div>
            )}

            <Cards
              projects={selected}
              status={cardStatus}
              pendingCounts={
                tab === "Leading"
                  ? Object.fromEntries(
                      (resource.data?.leading_projects ?? []).map((project) => [
                        project.project_id,
                        project.pending_applications_count,
                      ])
                    )
                  : undefined
              }
            />

            {tab === "Invited" &&
              selected.map((project) => (
                <div className="invitation-bar" key={project.id} style={{ marginTop: "16px" }}>
                  <span>
                    <strong>{project.leader}</strong> invited you to join <strong>{project.name}</strong>
                  </span>
                  <Button onClick={() => setInvitation(project)}>Review invitation</Button>
                </div>
              ))}
          </>
        ) : (
          <EmptyState
            title={
              tab === "Saved"
                ? "You haven't saved any projects yet."
                : tab === "Interested"
                ? "No applications or interest sent yet."
                : tab === "Invited"
                ? "No pending team invitations."
                : tab === "Active"
                ? "No active projects yet."
                : tab === "Leading"
                ? "No projects led by you yet."
                : "No completed projects yet."
            }
            description={
              tab === "Saved"
                ? "Save standout projects that catch your eye during discovery. You can always come back to review them."
                : tab === "Interested"
                ? "Explore projects matching your skills on the Discovery feed and swipe right to submit interest."
                : tab === "Invited"
                ? "When a project leader invites you to their team, the invitation and role commitment will appear here."
                : tab === "Active"
                ? "Once your application is approved or you accept an invitation, your active team projects will show here."
                : tab === "Leading"
                ? "Ready to launch your own venture? Create a project in Leader Workspace to assemble teammates."
                : "Finished projects will be preserved here as part of your team track record."
            }
            action={
              tab === "Leading" ? (
                <Link to="/leader" className="btn btn-primary">
                  Leader workspace <ArrowRight size={15} />
                </Link>
              ) : tab === "Active" ? (
                <Link to="/discover" className="btn btn-primary">
                  Find teams to join <ArrowRight size={15} />
                </Link>
              ) : (
                <Link to="/discover" className="btn btn-primary">
                  Discover projects <ArrowRight size={15} />
                </Link>
              )
            }
          />
        )}
      </div>

      {invitation && (
        <Modal title="Team invitation" onClose={() => setInvitation(null)}>
          <Badge tone="success">YOU’RE INVITED</Badge>
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
                setInvited((old) => old.filter((item) => item !== invitation.id))
                setInvitation(null)
                notify("Invitation declined")
              }}
            >
              Decline
            </Button>
            <Button
              onClick={() => {
                setActive((old) => [...new Set([...old, invitation.id])])
                setInvited((old) => old.filter((item) => item !== invitation.id))
                setInvitation(null)
                notify("Welcome to the team!")
                setParams({ tab: "Active" })
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
