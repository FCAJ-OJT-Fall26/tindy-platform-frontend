import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Users,
  UserCheck,
  XCircle,
} from "lucide-react"
import { Button, Modal, SectionHeading } from "../../components/ui"
import {
  MetricCard,
  CategoryBreakdown,
  CapsuleSlots,
  DonutProgressRing,
  SparklineBars,
} from "../../components/common/MetricsDashboardCards"
import RuleMatchPanel from "../../components/discovery/RuleMatchPanel"
import MatchScoreRing from "../../components/discovery/MatchScoreRing"
import { useTindy } from "../../store"
import { getMyProjectsApi, getProjectByIdApi } from "../../services/projects.service"
import {
  applicationErrorMessage,
  decideApplication,
  getProjectApplications,
} from "../../services/applications.service"
import type { ApplicationReviewDto, ApplicationStatus } from "../../types/application"
import type { MyLeadingProjectDto, ProjectDetailDto } from "../../types/project"
import "./project-applications.css"

export default function ProjectApplicationsScreen() {
  const { id: routeId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { notify } = useTindy()

  // Leading projects for project switcher
  const [leadingProjects, setLeadingProjects] = useState<MyLeadingProjectDto[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [activeProjectId, setActiveProjectId] = useState<string>(routeId || "")

  // Project details & applications
  const [projectDetail, setProjectDetail] = useState<ProjectDetailDto | null>(null)
  const [applications, setApplications] = useState<ApplicationReviewDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [selectedPosition, setSelectedPosition] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "all">("pending")
  const [selectedSort, setSelectedSort] = useState<"match" | "newest">("match")
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<{
    page: number
    pageSize: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }>({ page: 1, pageSize: 20, total: 0, hasNext: false, hasPrev: false })

  // Dialogs
  const [decision, setDecision] = useState<{
    row: ApplicationReviewDto
    action: "accept" | "reject"
  } | null>(null)
  const [matchModalData, setMatchModalData] = useState<ApplicationReviewDto | null>(null)
  const [busy, setBusy] = useState(false)

  // 1. Fetch user's leading projects to allow switcher & default project selection
  useEffect(() => {
    let active = true
    setLoadingProjects(true)
    getMyProjectsApi()
      .then((res) => {
        if (!active) return
        const leading = res.leading_projects || []
        setLeadingProjects(leading)
        if (!routeId && leading.length > 0) {
          setActiveProjectId(leading[0].project_id)
        }
      })
      .catch((err) => {
        console.warn("Could not load leading projects", err)
      })
      .finally(() => {
        if (active) setLoadingProjects(false)
      })
    return () => {
      active = false
    }
  }, [routeId])

  // Sync if routeId changes
  useEffect(() => {
    if (routeId) {
      setActiveProjectId(routeId)
    }
  }, [routeId])

  // 2. Fetch project detail and applications whenever activeProjectId or filters change
  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    try {
      const [detail, appRes] = await Promise.all([
        getProjectByIdApi(activeProjectId),
        getProjectApplications(activeProjectId, {
          position_id: selectedPosition || undefined,
          status: selectedStatus,
          sort_by: selectedSort,
          page: currentPage,
          page_size: 20,
        }),
      ])
      setProjectDetail(detail)
      setApplications(appRes.items || [])
      setPaginationMeta({
        page: appRes.pagination.current_page,
        pageSize: appRes.pagination.page_size,
        total: appRes.pagination.total_items,
        hasNext: appRes.pagination.has_next,
        hasPrev: appRes.pagination.has_previous,
      })
    } catch (err) {
      setError(applicationErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [activeProjectId, selectedPosition, selectedStatus, selectedSort, currentPage])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Stats calculation
  const pendingCount = useMemo(() => {
    return applications.filter((a) => a.application.status === "pending").length
  }, [applications])

  const acceptedCount = useMemo(() => {
    return applications.filter((a) => a.application.status === "accepted").length
  }, [applications])

  const rejectedCount = useMemo(() => {
    return applications.filter((a) => a.application.status === "rejected").length
  }, [applications])

  // Confirm decision
  const confirmDecision = async () => {
    if (!decision || !activeProjectId || busy) return
    setBusy(true)
    try {
      await decideApplication(
        activeProjectId,
        decision.row.application.application_id,
        decision.action,
      )
      notify(
        decision.action === "accept"
          ? `Application from ${decision.row.applicant.display_name} accepted. They have joined the project team!`
          : `Application from ${decision.row.applicant.display_name} rejected.`,
      )
      setDecision(null)
      void loadData()
    } catch (err) {
      notify(applicationErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // Switch active project
  const handleProjectSwitch = (newProjectId: string) => {
    setActiveProjectId(newProjectId)
    setSelectedPosition("")
    setCurrentPage(1)
    navigate(`/projects/${newProjectId}/applications`)
  }

  if (loadingProjects && !activeProjectId) {
    return (
      <div className="applications-page-container">
        <div className="py-16 text-center text-slate-500 font-medium text-sm">
          Loading applications center...
        </div>
      </div>
    )
  }

  if (!loadingProjects && leadingProjects.length === 0 && !activeProjectId) {
    return (
      <div className="applications-page-container">
        <div className="space-y-6 max-w-xl mx-auto py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Briefcase size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">No recruitment projects found</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              You are not leading any active projects currently. Create a project and publish open
              positions to start receiving candidate applications.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link to="/leader" className="btn btn-secondary">
              Leader workspace
            </Link>
            <Link to="/create-project" className="btn btn-primary">
              Create new project
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const openPositionsCount =
    projectDetail?.positions?.filter((p) => p.status === "open").length ?? 0

  return (
    <div className="applications-page-container" data-leader-applications>
      {/* 1. Top Navigation Links */}
      <nav className="applications-top-nav" aria-label="Page navigation">
        <Link to="/leader" className="applications-back-link">
          <ChevronLeft size={16} />
          <span>Back to Leader Workspace</span>
        </Link>

        {activeProjectId && (
          <div className="applications-nav-actions">
            <Link
              to={`/team/${activeProjectId}`}
              className="applications-nav-action-link"
            >
              <span>Project workspace</span>
              <ArrowUpRight size={13} />
            </Link>
            <span className="applications-nav-separator">•</span>
            <Link
              to={`/project/${activeProjectId}`}
              className="applications-nav-action-link"
            >
              <span>Public brief</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
      </nav>

      {/* 2. Project Header Panel */}
      <header className="applications-header-panel">
        <div className="applications-header-top">
          <div className="applications-header-titles">
            <div className="applications-eyebrow-row">
              <span className="applications-eyebrow">
                LEADER WORKSPACE • APPLICATIONS
              </span>
              {projectDetail && (
                <span className="applications-team-capacity">
                  {projectDetail.current_team_size}/{projectDetail.max_team_capacity} seats filled
                </span>
              )}
            </div>
            <h1 className="applications-title">
              {projectDetail ? `${projectDetail.name} — Applications` : "Candidate Applications"}
            </h1>
            <p className="applications-description">
              Review and decide candidate applications for your open roles. Match scores summarize rule compatibility; the final team decision is yours.
            </p>
          </div>

          {/* Project Switcher Dropdown */}
          {leadingProjects.length > 0 && (
            <div className="applications-project-switcher">
              <label htmlFor="project-select" className="applications-project-switcher-label">
                Switch project:
              </label>
              <select
                id="project-select"
                value={activeProjectId}
                onChange={(e) => handleProjectSwitch(e.target.value)}
                className="applications-project-select"
              >
                {leadingProjects.map((proj) => (
                  <option key={proj.project_id} value={proj.project_id}>
                    {proj.name} ({proj.current_team_size}/{proj.max_team_capacity} members)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* 3. Metrics Grid (4 Summary Cards matching Leader Workspace) */}
      <section className="metrics-grid">
        <MetricCard
          index={0}
          label="Total applications"
          value={paginationMeta.total}
          subtitle="submitted by candidates"
          visual={
            <SparklineBars
              bars={[
                { height: 18, color: "#3b82f6" },
                { height: 26, color: "#2563eb" },
                { height: 32, color: "#1d4ed8" },
                { height: 22, color: "#60a5fa" },
                { height: 28, color: "#2563eb" },
              ]}
            />
          }
          footerLeft="Across open positions"
          actionLabel="View all"
          actionOnClick={() => {
            setSelectedStatus("all")
            setSelectedPosition("")
            setCurrentPage(1)
          }}
        />

        <MetricCard
          index={1}
          label="Pending review"
          value={pendingCount}
          subtitle="awaiting your decision"
          visual={<CapsuleSlots variant="faint" />}
          footerLeft={pendingCount > 0 ? "Requires action" : "All caught up"}
          actionLabel="Review pending"
          actionOnClick={() => {
            setSelectedStatus("pending")
            setCurrentPage(1)
          }}
        />

        <MetricCard
          index={2}
          label="Accepted"
          value={acceptedCount}
          subtitle="confirmed teammates"
          visual={
            <DonutProgressRing
              pct={
                projectDetail
                  ? Math.min(
                      100,
                      Math.round(
                        ((projectDetail.current_team_size || 0) /
                          (projectDetail.max_team_capacity || 5)) *
                          100,
                      ),
                    )
                  : 40
              }
              strokeColor="#0d9488"
            />
          }
          footerLeft={`${projectDetail?.current_team_size || 0}/${projectDetail?.max_team_capacity || 5} seats filled`}
          actionLabel="Open workspace"
          actionTo={activeProjectId ? `/team/${activeProjectId}` : "/team"}
        />

        <MetricCard
          index={3}
          label="Open positions"
          value={openPositionsCount}
          subtitle="places for new teammates"
          visual={
            <CategoryBreakdown
              items={(projectDetail?.positions || [])
                .slice(0, 2)
                .map((p, idx) => ({
                  label: p.title.split(" ")[0],
                  count: Math.max(0, p.required_count - p.filled_count),
                  pct: 100,
                  color: idx === 0 ? "#2563eb" : "#0d9488",
                }))}
            />
          }
          footerLeft={`${projectDetail?.positions?.length || 0} active roles`}
          actionLabel="Manage roles"
          actionTo={activeProjectId ? `/project/${activeProjectId}` : "/my-projects"}
        />
      </section>

      {/* 4. Section Heading */}
      <SectionHeading
        title="Candidate applications"
        description="Filter by application status and position to review credentials."
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
            {paginationMeta.total} {paginationMeta.total === 1 ? "applicant" : "applicants"}
          </span>
        }
      />

      {/* 5. Filter Toolbar (Status Tabs + Position + Sort) */}
      <section className="applications-toolbar" aria-label="Application filters">
        {/* Status Tabs Segmented Control */}
        <div className="applications-status-tabs" role="tablist">
          {(
            [
              { id: "pending", label: "Pending review", count: pendingCount },
              { id: "accepted", label: "Accepted", count: acceptedCount },
              { id: "rejected", label: "Rejected", count: rejectedCount },
              { id: "all", label: "All applications", count: paginationMeta.total },
            ] as const
          ).map((tab) => {
            const isActive = selectedStatus === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setSelectedStatus(tab.id)
                  setCurrentPage(1)
                }}
                className={`applications-status-tab ${isActive ? "active" : ""}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`applications-tab-count ${
                    tab.id === "pending" && pendingCount > 0 ? "pending-alert" : ""
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right side: Position & Sort Filters */}
        <div className="applications-toolbar-right">
          <select
            aria-label="Filter applications by position"
            value={selectedPosition}
            disabled={busy}
            onChange={(e) => {
              setSelectedPosition(e.target.value)
              setCurrentPage(1)
            }}
            className="applications-select"
          >
            <option value="">All positions</option>
            {projectDetail?.positions?.map((p) => (
              <option key={p.position_id} value={p.position_id}>
                {p.title}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort applications"
            value={selectedSort}
            disabled={busy}
            onChange={(e) => {
              setSelectedSort(e.target.value as "match" | "newest")
              setCurrentPage(1)
            }}
            className="applications-select"
          >
            <option value="match">Highest match %</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-xs text-slate-500 font-medium">
          Loading candidate applications...
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && applications.length === 0 && (
        <div className="applications-empty-card">
          <div className="applications-empty-icon-wrap">
            <Users size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="applications-empty-title">No applications to review</h3>
            <p className="applications-empty-text">
              {selectedStatus !== "all"
                ? `There are currently no applications with status "${
                    selectedStatus === "pending"
                      ? "Pending review"
                      : selectedStatus === "accepted"
                      ? "Accepted"
                      : "Rejected"
                  }".`
                : "No candidates have applied to this project yet. Share your project link or review open positions."}
            </p>
          </div>
          <div className="applications-empty-actions">
            {selectedStatus !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("all")
                  setSelectedPosition("")
                }}
                className="btn btn-secondary text-xs"
              >
                Clear filters
              </button>
            )}
            <Link
              to={`/project/${activeProjectId}`}
              className="btn btn-primary text-xs"
            >
              View open positions
            </Link>
          </div>
        </div>
      )}

      {/* 7. Application List / Candidate Cards */}
      {!loading && applications.length > 0 && (
        <div className="applications-list">
          {applications.map((row) => {
            const status = row.application.status
            const initials =
              row.applicant.display_name
                ?.split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "CD"

            const openSlots = Math.max(
              0,
              row.applied_position.required_count - row.applied_position.filled_count,
            )

            return (
              <article
                key={row.application.application_id}
                data-review-application={row.application.application_id}
                className="application-candidate-card"
              >
                {/* Header: Candidate Profile Info & Match Ring */}
                <div className="candidate-card-header">
                  <div className="candidate-profile-summary">
                    <div className="candidate-avatar">
                      {initials}
                    </div>

                    <div className="candidate-info-block">
                      <div className="candidate-name-row">
                        <span className="candidate-name">
                          {row.applicant.display_name}
                        </span>

                        <span
                          className={`candidate-status-badge ${
                            status === "accepted"
                              ? "accepted"
                              : status === "rejected"
                              ? "rejected"
                              : "pending"
                          }`}
                        >
                          {status === "pending"
                            ? "Pending review"
                            : status === "accepted"
                            ? "Accepted"
                            : status === "rejected"
                            ? "Rejected"
                            : status}
                        </span>
                      </div>

                      <div className="candidate-meta-line">
                        <span>{row.applicant.preferred_role_name || "Role unspecified"}</span>
                        <span>•</span>
                        <span>
                          {row.applicant.available_hours_per_week !== null
                            ? `${row.applicant.available_hours_per_week} hrs/week committed`
                            : "Availability flexible"}
                        </span>
                      </div>

                      <div className="candidate-applied-position">
                        <span className="text-slate-500 font-normal">Applied for:</span>
                        <span className="candidate-position-pill">
                          {row.applied_position.title}
                        </span>
                        <span className="candidate-slots-remaining">
                          ({openSlots} {openSlots === 1 ? "slot" : "slots"} left)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Ring & Why this match trigger */}
                  <div className="candidate-match-score-card">
                    <MatchScoreRing score={row.matching.match_score} compact />
                    <div className="candidate-match-score-text">
                      <span className="candidate-match-pct">
                        {row.matching.match_score}% Rule Match
                      </span>
                      <button
                        type="button"
                        onClick={() => setMatchModalData(row)}
                        className="candidate-why-match-btn"
                      >
                        <span>Why this match</span>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Candidate Cover Note */}
                {row.application.message ? (
                  <div className="candidate-cover-message">
                    &ldquo;{row.application.message}&rdquo;
                  </div>
                ) : (
                  <p className="candidate-no-message">
                    Candidate expressed interest without an additional note.
                  </p>
                )}

                {/* Candidate Skills & Experience Badges */}
                <div className="candidate-skills-section">
                  <div className="candidate-skills-header">
                    <span className="candidate-skills-title">Technical Skills</span>
                    <span>
                      {row.applicant.experiences_count} experiences &nbsp;•&nbsp;{" "}
                      {row.applicant.certificates_count} verified certificates
                    </span>
                  </div>

                  <div className="candidate-skills-list">
                    {row.applicant.skills?.length > 0 ? (
                      row.applicant.skills.map((s) => (
                        <span key={s.skill_id} className="candidate-skill-tag">
                          {s.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No skills listed on profile</span>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="candidate-card-footer">
                  <Link
                    to={`/users/${row.applicant.user_id}`}
                    className="candidate-profile-link"
                  >
                    <span>View full student profile & experiences</span>
                    <ArrowUpRight size={13} />
                  </Link>

                  {status === "pending" && (
                    <div className="candidate-action-buttons">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDecision({ row, action: "reject" })}
                        className="candidate-btn-reject"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDecision({ row, action: "accept" })}
                        className="candidate-btn-accept"
                      >
                        <UserCheck size={14} />
                        <span>Accept to team</span>
                      </button>
                    </div>
                  )}

                  {status === "accepted" && (
                    <span className="candidate-status-resolved accepted">
                      <CheckCircle2 size={14} />
                      <span>Joined active team</span>
                    </span>
                  )}

                  {status === "rejected" && (
                    <span className="candidate-status-resolved rejected">
                      <XCircle size={14} />
                      <span>Application closed</span>
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {paginationMeta.total > paginationMeta.pageSize && (
        <nav
          className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs"
          aria-label="Applicant list pages"
        >
          <Button
            variant="secondary"
            disabled={!paginationMeta.hasPrev || loading || busy}
            onClick={() => setCurrentPage((v) => v - 1)}
          >
            Previous
          </Button>
          <span className="text-slate-500 font-medium">
            Page {paginationMeta.page} of {Math.ceil(paginationMeta.total / paginationMeta.pageSize)}{" "}
            • {paginationMeta.total} total applications
          </span>
          <Button
            variant="secondary"
            disabled={!paginationMeta.hasNext || loading || busy}
            onClick={() => setCurrentPage((v) => v + 1)}
          >
            Next
          </Button>
        </nav>
      )}

      {/* Modal: Why this matches breakdown */}
      {matchModalData && (
        <Modal
          title="Applied Position Match Breakdown"
          className="rule-match-dialog"
          onClose={() => setMatchModalData(null)}
        >
          <RuleMatchPanel
            match={matchModalData.matching}
            projectName={projectDetail?.name || "Project"}
          />
        </Modal>
      )}

      {/* Modal: Confirm Accept / Reject */}
      {decision && (
        <Modal
          title={
            decision.action === "accept"
              ? "Accept Candidate to Team?"
              : "Reject Candidate Application?"
          }
          onClose={() => {
            if (!busy) setDecision(null)
          }}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <strong className="text-sm font-bold text-slate-900 block">
                {decision.row.applicant.display_name}
              </strong>
              <p className="text-slate-600">
                Applying for: <strong>{decision.row.applied_position.title}</strong> in{" "}
                <strong>{projectDetail?.name}</strong>
              </p>
              <p className="text-blue-600 font-semibold">
                {decision.row.matching.match_score}% rule compatibility
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {decision.action === "accept"
                ? "Accepting this candidate will officially add them to your active project roster and occupy 1 open position slot. They will be notified and given collaborator access to your workspace."
                : "Rejecting leaves your team and remaining slot count unchanged. The applicant will be informed that the team has moved forward with other candidates."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" disabled={busy} onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  void confirmDecision()
                }}
              >
                {busy
                  ? "Saving…"
                  : decision.action === "accept"
                  ? "Confirm Accept"
                  : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
