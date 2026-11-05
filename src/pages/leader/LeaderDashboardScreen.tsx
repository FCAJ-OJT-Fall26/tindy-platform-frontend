import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import {
  Clock,
  Settings,
  Plus,
  Code2,
  Users,
  Mail,
  FolderKanban,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useTindy, Project, initialCandidates } from "../../store"
import { PageHeader, SectionHeading, Avatar, Badge } from "../../components/ui"
import { MetricCard, CategoryBreakdown, CapsuleSlots, DonutProgressRing } from "../../components/common/MetricsDashboardCards"
import { SaveSuccessModal } from "../../components/projects/SaveSuccessModal"
import useMyProjects from "../../hooks/useMyProjects"
import { projectErrorMessage } from "../../services/projectEditor.service"
import { deleteProjectApi } from "../../services/projects.service"
import useRemoteResource from "../../hooks/useRemoteResource"
import useTeammateSession from "../../hooks/useTeammateSession"
import { getProjectInvitations, INVITATIONS_CHANGED_EVENT } from "../../services/invitations.service"
import "./leader-dashboard.css"

export function LeaderDashboard() {
  const { setProjects, notify, candidateInterested, candidateInvites, dismissed } = useTindy()

  const location = useLocation()
  const resource = useMyProjects()
  const [archiveError, setArchiveError] = useState("")
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const archiveBusy = useRef(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.leader-project-menu-container')) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('click', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [openMenuId])
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false)
  const [savedSuccessProjectName, setSavedSuccessProjectName] = useState("")
  const [isSavedCreate, setIsSavedCreate] = useState(false)
  const PROJECTS_PER_PAGE = 4

  useEffect(() => {
    if (location.state?.savedSuccess) {
      setShowSaveSuccessModal(true)
      setSavedSuccessProjectName(location.state.projectName || "Project")
      setIsSavedCreate(Boolean(location.state.isCreate))
      // Clear location state so refresh or back doesn't re-trigger modal
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const leadingIds = new Set(resource.data?.leading_projects.filter(project => project.status !== "archived").map(project => project.project_id))
  const managed = resource.data?.projects.filter(project => leadingIds.has(project.id)) ?? []
  const pendingCount = resource.data?.leading_projects.reduce((sum, p) => sum + p.pending_applications_count, 0) ?? 0
  const pendingFor = (id: string) => resource.data?.leading_projects.find(p => p.project_id === id)?.pending_applications_count ?? 0

  const session = useTeammateSession()
  const projectIds = [...leadingIds].sort().join(",")
  const loadInvitationCount = useCallback(async (signal: AbortSignal) => {
    const ids = projectIds ? projectIds.split(",") : []
    let next = 0, total = 0
    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (next < ids.length) {
        const id = ids[next++]
        const result = await getProjectInvitations(id, { status: "pending", page_size: 1 }, signal)
        total += result.pagination.total_items
      }
    }))
    return total
  }, [projectIds])

  const invitations = useRemoteResource(
    session.key && resource.data ? `${session.key}:${projectIds}` : null,
    loadInvitationCount,
  )

  useEffect(() => {
    window.addEventListener(INVITATIONS_CHANGED_EVENT, invitations.reload)
    window.addEventListener("focus", invitations.reload)
    return () => {
      window.removeEventListener(INVITATIONS_CHANGED_EVENT, invitations.reload)
      window.removeEventListener("focus", invitations.reload)
    }
  }, [invitations.reload])

  const metricsReady = Boolean(resource.data) && !resource.error

  const totalOpenings = useMemo(
    () => managed.reduce((total, project) => total + (project.openings ?? 0), 0),
    [managed],
  )

  const openPositionsBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const project of managed) {
      if (project.openPositions && project.openPositions.length > 0) {
        for (const pos of project.openPositions) {
          if (pos.count > 0) {
            map.set(pos.title, (map.get(pos.title) || 0) + pos.count)
          }
        }
      } else if (project.openings && project.openings > 0) {
        const roleName = project.role || "Developer"
        map.set(roleName, (map.get(roleName) || 0) + project.openings)
      }
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0)
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([role, count], idx) => ({
        label: role.split(" ")[0],
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: idx === 0 ? "#2563eb" : "#0d9488",
      }))
  }, [managed])

  const totalTeamMembers = useMemo(
    () => managed.reduce((total, project) => total + (project.team || 0), 0),
    [managed],
  )

  const totalTeamCapacity = useMemo(
    () => managed.reduce((total, project) => total + (project.capacity || 0), 0),
    [managed],
  )

  const teamFillPct = useMemo(
    () =>
      totalTeamCapacity > 0
        ? Math.min(100, Math.round((totalTeamMembers / totalTeamCapacity) * 100))
        : 0,
    [totalTeamMembers, totalTeamCapacity],
  )

  const totalPages = Math.max(1, Math.ceil(managed.length / PROJECTS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE
  const currentProjects = managed.slice(
    startIndex,
    startIndex + PROJECTS_PER_PAGE,
  )
  const pageItemsCount = currentProjects.length

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (archiveBusy.current || !window.confirm('Archive project "' + projectName + '"? Its recruitment positions will close.')) return
    archiveBusy.current = true
    setArchivingId(projectId)
    setArchiveError("")
    try {
      await deleteProjectApi(projectId)
      setProjects(previous => previous.filter(project => project.id !== projectId))
      resource.replace(previous => ({
        ...previous!,
        leading_projects: previous!.leading_projects.filter(project => project.project_id !== projectId),
        projects: previous!.projects.filter(project => project.id !== projectId)
      }))
      notify('Project "' + projectName + '" archived.')
      resource.reload()
    } catch (error: unknown) {
      setArchiveError(projectErrorMessage(error))
    } finally {
      archiveBusy.current = false
      setArchivingId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PROJECT LEADER WORKSPACE"
        title="Great teams start here."
        description="Turn your next idea into a project. Find the people to bring it to life."
        action={
          <Link className="btn btn-primary" to="/create-project">
            <Plus size={16} />
            Create project
          </Link>
        }
      />
      <section className="metrics-grid">
        <MetricCard
          index={0}
          label="Open positions"
          tooltipTitle="Recruiting Roles Distribution"
          tooltipDesc="Breakdown of available vacancies across technical roles you are recruiting for."
          tooltipDetail={
            totalOpenings > 0
              ? openPositionsBreakdown.length > 0
                ? openPositionsBreakdown.map((b: { label: string; count: number }) => `${b.label}: ${b.count}`).join(" • ")
                : `${totalOpenings} open position${totalOpenings === 1 ? "" : "s"} actively recruiting`
              : "All positions currently filled across your projects"
          }
          value={totalOpenings}
          subtitle="places for new teammates"
          visual={
            openPositionsBreakdown.length > 0 ? (
              <CategoryBreakdown items={openPositionsBreakdown} />
            ) : (
              <CapsuleSlots variant="faint" />
            )
          }
          footerLeft={
            totalOpenings > 0
              ? `${managed.filter((p) => (p.openings ?? 0) > 0).length} project${
                  managed.filter((p) => (p.openings ?? 0) > 0).length === 1 ? "" : "s"
                } recruiting`
              : `${managed.length} workspace${managed.length === 1 ? "" : "s"}`
          }
          actionLabel="Manage roles"
          actionTo="/projects?tab=Leading"
        />

        <MetricCard
          index={1}
          label="Interested candidates"
          tooltipTitle="Review Queue Pipeline"
          tooltipDesc="Candidate applications waiting for leader evaluation across your managed projects."
          tooltipDetail={
            pendingCount > 0
              ? `${pendingCount} candidate application${pendingCount === 1 ? "" : "s"} awaiting your decision`
              : "Review queue is clear • 0 pending applications"
          }
          value={pendingCount}
          subtitle={
            pendingCount === 1
              ? "application awaiting review"
              : "applications awaiting review"
          }
          visual={<CapsuleSlots variant="faint" />}
          footerLeft={pendingCount > 0 ? "Requires action" : "All caught up"}
          actionLabel="Review applications"
          actionTo="/applications"
        />

        <MetricCard
          index={2}
          label="Pending invitations"
          tooltipTitle="Direct Invitation Pipeline"
          tooltipDesc="Track candidate invitations sent directly from your workspace."
          tooltipDetail={
            invitations.data && invitations.data > 0
              ? `${invitations.data} candidate invitation${
                  invitations.data === 1 ? "" : "s"
                } awaiting response`
              : "0 direct invitations active"
          }
          value={metricsReady && !invitations.loading && !invitations.error ? (invitations.data ?? 0) : 0}
          subtitle="invitations sent"
          visual={<CapsuleSlots variant="faint" />}
          footerLeft={
            invitations.data && invitations.data > 0
              ? `${invitations.data} awaiting response`
              : "Invite candidates"
          }
          actionLabel="Review invitations"
          actionTo="/candidates?tab=Invited"
        />

        <MetricCard
          index={3}
          label="Team members"
          tooltipTitle="Overall Team Capacity"
          tooltipDesc="Circular gauge showing filled vs maximum team seats across your managed projects."
          tooltipDetail={
            totalTeamCapacity > 0
              ? `${totalTeamMembers} of ${totalTeamCapacity} team seats filled (${teamFillPct}% capacity)`
              : `${totalTeamMembers} confirmed team member${totalTeamMembers === 1 ? "" : "s"}`
          }
          value={totalTeamMembers}
          subtitle={
            totalTeamCapacity > 0
              ? `of ${totalTeamCapacity} team seats filled`
              : "confirmed teammates"
          }
          visual={<DonutProgressRing pct={teamFillPct} strokeColor="#334155" />}
          footerLeft={`${managed.length} workspace${managed.length === 1 ? "" : "s"}`}
          actionLabel="Open workspace"
          actionTo="/team"
        />
      </section>

      {Boolean(invitations.error) && (
        <p role="alert">
          Could not load invitation totals.{" "}
          <button onClick={invitations.reload}>Retry invitations</button>
        </p>
      )}

      <SectionHeading
        title="Your projects"
        description="A clear picture of what’s moving forward."
        action={
          <span
            style={{
              fontSize: "12px",
              background: "#f0f4fa",
              color: "#3553b5",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid #dce6f6",
            }}
          >
            {managed.length} {managed.length === 1 ? "project" : "projects"}
          </span>
        }
      />
      {(resource.error || archiveError) && <div className="info-banner" role="alert">{archiveError || projectErrorMessage(resource.error)} <button onClick={resource.reload}>Refresh projects</button></div>}
      {resource.loading && !resource.data ? <div className="info-banner" role="status">Loading your projects…</div> : resource.error && !resource.data ? null : managed.length === 0 ? (
        <div
          className="panel empty-state"
          style={{
            margin: "22px 0",
            textAlign: "center",
            padding: "48px 24px",
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#64748b",
            }}
          >
            <FolderKanban size={24} />
          </div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            No projects yet
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "#64748b",
              maxWidth: "400px",
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            Start your first project to organize your team and find collaborators.
          </p>
          <Link to="/create-project" className="btn btn-primary">
            <Plus size={16} />
            Create your first project
          </Link>
        </div>
      ) : (
        <>
          <div className={`leader-project-grid grid-cols-${Math.min(3, Math.max(1, pageItemsCount))}`}>
            {currentProjects.map((project: Project) => {
              const pending = pendingFor(project.id)
              return (
                <article
                  key={project.id}
                  className="leader-project-card panel"
                >
                  <div className="card-top">
                    <span
                      className="project-badge"
                      style={{
                        background:
                          project.status === "archived"
                            ? "#fee2e2"
                            : project.status === "in_progress"
                              ? "#e0e7ff"
                              : "#e0f2fe",
                        color:
                          project.status === "archived"
                            ? "#dc2626"
                            : project.status === "in_progress"
                              ? "#4338ca"
                              : "#0369a1",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "12px",
                        textTransform: "capitalize",
                      }}
                    >
                      {project.status?.replace("_", " ") || "Recruiting"}
                    </span>
                    <div className="leader-project-menu-container">
                      <button type="button" className="btn-icon"
                        aria-label="Project actions"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === project.id ? null : project.id)
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuId === project.id && (
                        <div className="leader-project-dropdown-menu">
                          <Link
                            to={`/project/${project.id}/edit`}
                            className="leader-dropdown-item"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Settings size={14} />
                            <span>Edit project</span>
                          </Link>
                          <Link
                            to={`/project/${project.id}`}
                            className="leader-dropdown-item"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <ArrowUpRight size={14} />
                            <span>View public specs</span>
                          </Link>
                          <button
                            className="leader-dropdown-item text-danger"
                            onClick={() => {
                              setOpenMenuId(null)
                              handleDeleteProject(project.id, project.name)
                            }}
                            disabled={archivingId === project.id}
                          >
                            <Trash2 size={14} />
                            <span>{archivingId === project.id ? "Archiving…" : "Archive project"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="leader-project-stats">
                    <div>
                      <Clock size={14} />
                      <span>{project.hours ?? 10} hrs/week</span>
                    </div>
                    <div>
                      <Users size={14} />
                      <span>
                        {project.team || 0} / {project.capacity || 5} members
                      </span>
                    </div>
                    <div>
                      <Code2 size={14} />
                      <span>{project.openings || 0} openings</span>
                    </div>
                  </div>
                  {project.skills && project.skills.length > 0 && (
                    <div className="leader-project-skills">
                      {project.skills.slice(0, 3).map((s: string) => (
                        <span key={s} className="skill-chip">
                          {s}
                        </span>
                      ))}
                      {project.skills.length > 3 && (
                        <span className="skill-chip more">
                          +{project.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="card-actions">
                    <Link
                      className="btn btn-primary"
                      to={`/projects/${project.id}/applications`}
                    >
                      Applications
                      {pending > 0 && (
                        <span className="counter-badge">{pending}</span>
                      )}
                    </Link>
                    <Link
                      className="btn btn-secondary"
                      to={`/team/${project.id}`}
                    >
                      Team workspace
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          {totalPages > 1 && (
            <div className="pagination-container">
              <span className="pagination-text">
                Showing {startIndex + 1}–{startIndex + pageItemsCount} of{" "}
                {managed.length} projects
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <section aria-label="Candidate and messaging demo preview">
        <div className="info-banner" role="note">Demo preview — candidate shortlist, invitations and chat below use sample data. {candidateInvites.length} sample invitations · {candidateInterested.length} sample interested candidates.</div>
        <div className="two-column">
          <section className="panel">
            <SectionHeading
              title="Candidate shortlist"
              action={
                <Link className="text-link" to="/applications">
                  View all applications <ArrowRight size={13} />
                </Link>
              }
            />
            {initialCandidates
              .filter((candidate) => !dismissed.includes(candidate.name))
              .slice(0, 3)
              .map((candidate) => (
                <Link
                  className="recent-candidate"
                  key={candidate.name}
                  to={`/candidate/${encodeURIComponent(candidate.name)}`}
                >
                  <Avatar name={candidate.name} color={candidate.color} />
                  <div>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.role}</small>
                  </div>
                  <Badge tone="success">{candidate.match}% match</Badge>
                </Link>
              ))}
          </section>
          <section className="panel">
            <SectionHeading title="Keep the conversation going" />
            <div className="leader-message">
              <Avatar name="Cao Thanh Nhan" color="teal" />
              <div>
                <h3>Cao Thanh Nhan</h3>
                <p>“I’d love to learn more about the backend architecture.”</p>
                <Link
                  className="text-link"
                  to="/messages?conversation=Cao%20Thanh%20Nhan"
                >
                  Reply in chat <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="trust-note">
              <Users size={18} />
              <span>
                The best team fit goes beyond a score. Start a conversation about
                goals, availability, and how you like to work.
              </span>
            </div>
          </section>
        </div>
      </section>
      <SaveSuccessModal
        open={showSaveSuccessModal}
        projectName={savedSuccessProjectName}
        isCreate={isSavedCreate}
        onClose={() => setShowSaveSuccessModal(false)}
      />
    </>
  )
}

export default LeaderDashboard
