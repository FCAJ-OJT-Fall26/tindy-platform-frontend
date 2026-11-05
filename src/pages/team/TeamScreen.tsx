import { useState, useMemo, useEffect, useRef } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  Users,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import useMyProjects from "../../hooks/useMyProjects"
import { EmptyState, Badge } from "../../components/ui"
import { ProjectWorkspaceView } from "./ProjectWorkspaceView"
import { deleteProjectApi } from "../../services/projects.service"
import { projectErrorMessage } from "../../services/projectEditor.service"
import "./team-screen.css"

export function TeamScreen() {
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>()
  const effectiveProjectId = projectId || id
  const { authUser, setProjects, notify } = useTindy()
  const resource = useMyProjects()

  // Tab filter: all | leading | member
  const [filterTab, setFilterTab] = useState<"all" | "leading" | "member">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState("")
  const archiveBusy = useRef(false)
  const PROJECTS_PER_PAGE = 6

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".leader-project-menu-container")) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener("click", handleOutsideClick)
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick)
    }
  }, [openMenuId])

  // If a specific projectId is requested in route, render the Project Workspace directly
  if (effectiveProjectId) {
    return <ProjectWorkspaceView projectId={effectiveProjectId} />
  }

  // Derive leading and joined projects using exact same logic as Leader Workspace
  const leadingIds = new Set(
    resource.data?.leading_projects
      .filter((p) => p.status !== "archived")
      .map((p) => p.project_id) ?? [],
  )
  const joinedIds = new Set(
    resource.data?.joined_projects?.map((p) => p.project_id) ?? [],
  )

  const managedProjects =
    resource.data?.projects.filter((p) => leadingIds.has(p.id)) ?? []
  const joinedProjects =
    resource.data?.projects.filter((p) => joinedIds.has(p.id)) ?? []
  const allProjects =
    resource.data?.projects.filter(
      (p) => leadingIds.has(p.id) || joinedIds.has(p.id),
    ) ?? []

  const pendingFor = (projId: string) =>
    resource.data?.leading_projects.find((p) => p.project_id === projId)
      ?.pending_applications_count ?? 0

  const filteredProjects = useMemo(() => {
    if (filterTab === "leading") return managedProjects
    if (filterTab === "member") return joinedProjects
    return allProjects
  }, [filterTab, managedProjects, joinedProjects, allProjects])

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Sliced projects for current page
  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE
  const currentProjects = filteredProjects.slice(
    startIndex,
    startIndex + PROJECTS_PER_PAGE,
  )
  const pageItemsCount = currentProjects.length

  const handleDeleteProject = async (projId: string, projectName: string) => {
    if (
      archiveBusy.current ||
      !window.confirm(
        'Archive project "' + projectName + '"? Its recruitment positions will close.',
      )
    )
      return
    archiveBusy.current = true
    setArchivingId(projId)
    setArchiveError("")
    try {
      await deleteProjectApi(projId)
      setProjects((previous) => previous.filter((p) => p.id !== projId))
      resource.replace((previous) => ({
        ...previous!,
        leading_projects: previous!.leading_projects.filter(
          (p) => p.project_id !== projId,
        ),
        projects: previous!.projects.filter((p) => p.id !== projId),
      }))
      notify('Project "' + projectName + '" archived.')
      resource.reload()
    } catch (err: unknown) {
      setArchiveError(projectErrorMessage(err))
    } finally {
      archiveBusy.current = false
      setArchivingId(null)
    }
  }

  return (
    <div className="team-workspace-page">
      {/* Page Header */}
      <div className="team-workspace-header">
        <div className="team-workspace-header-text">
          <h1>Team workspace</h1>
          <p>All active project teams you are collaborating with and leading.</p>
        </div>
        <Link to="/create-project" className="btn btn-primary team-workspace-create-btn">
          <Plus size={15} /> <span>Create project</span>
        </Link>
      </div>

      {archiveError && (
        <div className="info-banner" role="alert">
          {archiveError}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="status-tabs" role="tablist" aria-label="Team workspace filters">
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === "all"}
          onClick={() => {
            setFilterTab("all")
            setCurrentPage(1)
          }}
          className={filterTab === "all" ? "active" : ""}
        >
          <span>All teams</span> <span className="tab-count">{allProjects.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === "leading"}
          onClick={() => {
            setFilterTab("leading")
            setCurrentPage(1)
          }}
          className={filterTab === "leading" ? "active" : ""}
        >
          <span>Teams you lead</span> <span className="tab-count">{managedProjects.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === "member"}
          onClick={() => {
            setFilterTab("member")
            setCurrentPage(1)
          }}
          className={filterTab === "member" ? "active" : ""}
        >
          <span>Teams you joined</span> <span className="tab-count">{joinedProjects.length}</span>
        </button>
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No active team projects yet."
          description="Explore projects matching your skills on the Discovery feed or create your own project to start collaborating."
          action={
            <Link to="/discover" className="btn btn-primary team-workspace-btn">
              <span>Discover projects</span> <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <>
          {/* Projects Grid: Exactly reusing Leader Workspace's Auto-Grid Architecture */}
          <div
            className={`leader-projects-grid grid-cols-${pageItemsCount}`}
            data-count={pageItemsCount}
          >
            {currentProjects.map((project) => {
              const isLeader = leadingIds.has(project.id)
              return (
                <section className="leader-project panel" key={project.id}>
                  {/* Card Top: Mark + Title + Badge + Actions Menu */}
                  <div className="leader-project-top">
                    <span
                      className={`project-mark ${project.color || (isLeader ? "indigo" : "teal")}`}
                    >
                      {project.initials}
                    </span>
                    <div className="leader-project-info">
                      <div className="leader-project-badge-row">
                        <Badge tone="success">
                          {(project.status ?? "recruiting").replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </div>
                      <h2>{project.name}</h2>
                      <p title={project.description}>{project.description}</p>
                    </div>

                    <div className="leader-project-top-actions leader-project-menu-container">
                      {isLeader && (
                        <button
                          className="icon-button"
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          title="Archive Project"
                          aria-label="Archive Project"
                          disabled={archivingId !== null}
                          style={{ color: "#d9534f" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

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
                            boxShadow:
                              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                            padding: "6px",
                            zIndex: 50,
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          {isLeader && (
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
                          )}

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

                          {isLeader && (
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
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Stats: Exact Leader Workspace layout with auto-margin-top */}
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
                      <strong>{project.openings ?? 0}</strong> open positions
                    </span>
                    {isLeader ? (
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
                    ) : (
                      <span>
                        <Code2 size={16} />
                        <strong>Team Member</strong>
                      </span>
                    )}
                  </div>

                  {/* Card Actions: Clean Leader Workspace Button Hierarchy */}
                  <div className="leader-project-actions">
                    <Link to={`/team/${project.id}`} className="btn btn-primary">
                      Open workspace <ArrowRight size={15} />
                    </Link>
                    {isLeader ? (
                      <Link to={`/project/${project.id}/applications`} className="btn btn-secondary">
                        Applications
                      </Link>
                    ) : (
                      <Link to={`/project/${project.id}`} className="btn btn-secondary">
                        View project
                      </Link>
                    )}
                    <Link to={`/project/${project.id}`} className="text-link">
                      View specs <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </section>
              )
            })}
          </div>

          {/* Pagination: Exact Leader Workspace Pagination Component */}
          {totalPages > 1 && (
            <div className="leader-pagination">
              <div className="leader-pagination-info">
                Showing{" "}
                <strong>
                  {startIndex + 1}–
                  {Math.min(startIndex + PROJECTS_PER_PAGE, filteredProjects.length)}
                </strong>{" "}
                of <strong>{filteredProjects.length}</strong> projects (Page{" "}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`pagination-page-number ${
                        pageNum === currentPage ? "active" : ""
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`Go to page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  )
}

export default TeamScreen
