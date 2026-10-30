import { useState, useEffect, useRef } from "react"
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

export function LeaderDashboard() {
  const [params] = useSearchParams()
  const demo = params.get("demo") === "1"
  const {
    setProjects,
    candidateInvites,
    candidateInterested,
    dismissed,
    notify,
  } = useTindy()

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
      {demo && <div className="info-banner">Demo mode — sample candidate profiles and messages below.</div>}
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
          value={
            managed.reduce(
              (total, project) => total + (project.openings ?? 0),
              0,
            ) || 2
          }
          subtitle="places for new teammates"
          visual={
            <CategoryBreakdown
              items={[
                {
                  label: "Backend",
                  count:
                    managed.reduce(
                      (total, project) => total + (project.openings ?? 0),
                      0,
                    ) || 2,
                  pct: 100,
                  color: "#2563eb",
                },
              ]}
            />
          }
          footerLeft={`${managed.filter(p => p.status === 'recruiting' || !p.status).length || 1} project recruiting`}
          actionLabel="Manage roles"
          actionTo="/my-projects"
        />

        <MetricCard
          index={1}
          label="Interested candidates"
          value={demo ? candidateInterested.length : (pendingCount > 0 ? pendingCount : 4)}
          subtitle="people to get to know"
          visual={
            <CategoryBreakdown
              items={[
                { label: "Backend", count: 2, pct: 100, color: "#0d9488" },
                { label: "AI", count: 1, pct: 50, color: "#0d9488" },
              ]}
            />
          }
          footerLeft="+1 more role"
          actionLabel="Review people"
          actionTo="/candidates"
        />

        <MetricCard
          index={2}
          label="Pending invitations"
          value={demo ? candidateInvites.length : 0}
          subtitle="no invitations sent yet"
          visual={<CapsuleSlots variant="faint" />}
          footerLeft="4 not yet invited"
          actionLabel="Invite candidates"
          actionTo="/candidates"
        />

        <MetricCard
          index={3}
          label="Team members"
          value={managed.reduce((total, project) => total + (project.team || 0), 0) || 3}
          subtitle="of 5 team seats filled"
          visual={<DonutProgressRing pct={60} strokeColor="#334155" />}
          footerLeft={`${managed.length || 1} workspace`}
          actionLabel="Open workspace"
          actionTo="/team"
        />
      </section>
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
            padding: "40px 20px",
          }}
        >
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            No projects currently managed.
          </p>
          <Link className="btn btn-primary" to="/create-project">
            <Plus size={16} />
            Create project
          </Link>
        </div>
      ) : (
        <>
          <div
            className={`leader-projects-grid grid-cols-${pageItemsCount}`}
            data-count={pageItemsCount}
          >
            {currentProjects.map((project) => (
              <section className="leader-project panel" key={project.id}>
                <div className="leader-project-top">
                  <span className={`project-mark ${project.color}`}>
                    {project.initials}
                  </span>
                  <div className="leader-project-info">
                    <div className="leader-project-badge-row">
                      <Badge tone="success">{(project.status ?? "recruiting").replace(/_/g, " ").toUpperCase()}</Badge>
                    </div>
                    <h2>{project.name}</h2>
                    <p title={project.description}>{project.description}</p>
                  </div>
                  <div className="leader-project-top-actions leader-project-menu-container">
                    <button
                      className="icon-button"
                      onClick={() =>
                        handleDeleteProject(project.id, project.name)
                      }
                      title="Archive Project"
                      aria-label="Archive Project"
                      disabled={archivingId !== null}
                      style={{ color: "#d9534f" }}
                    >
                      <Trash2 size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === project.id ? null : project.id)
                      }}
                      aria-label="Project settings"
                      title="Project settings"
                      style={{
                        background: openMenuId === project.id ? "#f1f5f9" : undefined,
                        color: openMenuId === project.id ? "#0f172a" : undefined,
                      }}
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {openMenuId === project.id && (
                      <div
                        className="project-actions-dropdown"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          width: "190px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                          padding: "6px",
                          zIndex: 50,
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <Link
                          to={`/project/${project.id}/edit`}
                          onClick={() => setOpenMenuId(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#1e293b",
                            textDecoration: "none",
                          }}
                          className="dropdown-item-hover"
                        >
                          <Settings size={14} style={{ color: "#64748b" }} />
                          <span>Manage project</span>
                        </Link>

                        <Link
                          to={`/project/${project.id}`}
                          onClick={() => setOpenMenuId(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#1e293b",
                            textDecoration: "none",
                          }}
                          className="dropdown-item-hover"
                        >
                          <ArrowUpRight size={14} style={{ color: "#64748b" }} />
                          <span>View public specs</span>
                        </Link>

                        <Link
                          to={`/project/${project.id}/applications`}
                          onClick={() => setOpenMenuId(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#1e293b",
                            textDecoration: "none",
                          }}
                          className="dropdown-item-hover"
                        >
                          <Users size={14} style={{ color: "#64748b" }} />
                          <span>Review applicants</span>
                        </Link>

                        <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0" }} />

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null)
                            handleDeleteProject(project.id, project.name)
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#e11d48",
                            background: "transparent",
                            border: "none",
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          className="dropdown-item-danger-hover"
                        >
                          <Trash2 size={14} />
                          <span>Archive project</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="leader-project-stats">
                  <span>
                    <Users size={16} />
                    <strong>
                      {project.team} / {project.capacity}
                    </strong>{" "}
                    members
                  </span>
                  <span>
                    <Code2 size={16} />
                    <strong>{project.openings ?? 0}</strong> open
                    positions
                  </span>
                  <Link
                    to={`/project/${project.id}/applications`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    <Clock size={16} />
                    <strong>{pendingFor(project.id)}</strong> pending applications
                  </Link>
                </div>
                <div className="leader-project-actions">
                  <Link to={`/project/${project.id}/applications`} className="btn btn-primary">
                    Applications <ArrowRight size={15} />
                  </Link>
                  <Link to={`/project/${project.id}`} className="btn btn-secondary">
                    View project
                  </Link>
                  <Link
                    to={`/team/${project.id}`}
                    className="text-link"
                  >
                    Open workspace <ArrowUpRight size={14} />
                  </Link>
                </div>
              </section>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="leader-pagination">
              <div className="leader-pagination-info">
                Showing{" "}
                <strong>
                  {startIndex + 1}–
                  {Math.min(startIndex + PROJECTS_PER_PAGE, managed.length)}
                </strong>{" "}
                of <strong>{managed.length}</strong> projects (Page{" "}
                {currentPage} of {totalPages})
              </div>
              <div className="leader-pagination-controls">
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        className={`pagination-page-number ${pageNum === currentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(pageNum)}
                        aria-label={`Go to page ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    ),
                  )}
                </div>
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
                <Link className="text-link" to="/candidates">
                  View pipeline <ArrowRight size={13} />
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
