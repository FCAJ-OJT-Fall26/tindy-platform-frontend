import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  MessageSquareQuote,
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
import SkillIcon from "../../components/onboarding/SkillIcon"
import RuleMatchPanel from "../../components/discovery/RuleMatchPanel"
import MatchScoreRing from "../../components/discovery/MatchScoreRing"
import { useTindy } from "../../store"
import { getMyProjectsApi, getProjectByIdApi } from "../../services/projects.service"
import {
  applicationErrorMessage,
  decideApplication,
  getProjectApplications,
} from "../../services/applications.service"
import type { ApplicationReviewDto, ApplicationReviewPage, ApplicationStatus } from "../../types/application"
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
  const [allApplications, setAllApplications] = useState<ApplicationReviewDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Global counts across all statuses (independent of current tab filter)
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  })

  // Filters - default to "all" so applicants are immediately visible on page load
  const [selectedPosition, setSelectedPosition] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "all">("all")
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
      let allRes: ApplicationReviewPage
      let currentRes: ApplicationReviewPage

      // If viewing "all", optimize by fetching once; otherwise fetch overall breakdown in parallel
      if (selectedStatus === "all") {
        const [detail, res] = await Promise.all([
          getProjectByIdApi(activeProjectId),
          getProjectApplications(activeProjectId, {
            position_id: selectedPosition || undefined,
            status: "all",
            sort_by: selectedSort,
            page: currentPage,
            page_size: 20,
          }),
        ])
        setProjectDetail(detail)
        allRes = res
        currentRes = res
      } else {
        const [detail, all, curr] = await Promise.all([
          getProjectByIdApi(activeProjectId),
          getProjectApplications(activeProjectId, {
            position_id: selectedPosition || undefined,
            status: "all",
            page: 1,
            page_size: 100,
          }),
          getProjectApplications(activeProjectId, {
            position_id: selectedPosition || undefined,
            status: selectedStatus,
            sort_by: selectedSort,
            page: currentPage,
            page_size: 20,
          }),
        ])
        setProjectDetail(detail)
        allRes = all
        currentRes = curr
      }

      // Calculate global project-wide stats across all statuses
      const allItems = allRes.items || []
      const pCount = allItems.filter((a) => a.application.status === "pending").length
      const aCount = allItems.filter((a) => a.application.status === "accepted").length
      const rCount = allItems.filter((a) => a.application.status === "rejected").length
      const tCount = allRes.pagination?.total_items ?? allItems.length

      setCounts({
        total: tCount,
        pending: pCount,
        accepted: aCount,
        rejected: rCount,
      })

      setAllApplications(allItems)
      setApplications(currentRes.items || [])
      setPaginationMeta({
        page: currentRes.pagination.current_page,
        pageSize: currentRes.pagination.page_size,
        total: currentRes.pagination.total_items,
        hasNext: currentRes.pagination.has_next,
        hasPrev: currentRes.pagination.has_previous,
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

  // 7-day application submission trend calculation for SparklineBars
  const applicationTrendBars = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const buckets: Array<{
      dateKey: string
      dayLabel: string
      dayName: string
      dateStr: string
      isToday: boolean
      count: number
    }> = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const isToday = i === 0
      const dayName = dayNames[d.getDay()]
      const monthStr = monthNames[d.getMonth()]
      const dateNum = d.getDate()

      buckets.push({
        dateKey: `${yyyy}-${mm}-${dd}`,
        dayLabel: isToday ? "Now" : dayName,
        dayName,
        dateStr: `${monthStr} ${dateNum}`,
        isToday,
        count: 0,
      })
    }

    if (allApplications && allApplications.length > 0) {
      allApplications.forEach((app) => {
        if (!app.application?.created_at) return
        const createdDate = new Date(app.application.created_at)
        const yyyy = createdDate.getFullYear()
        const mm = String(createdDate.getMonth() + 1).padStart(2, "0")
        const dd = String(createdDate.getDate()).padStart(2, "0")
        const key = `${yyyy}-${mm}-${dd}`
        const target = buckets.find((b) => b.dateKey === key)
        if (target) {
          target.count += 1
        }
      })
    }

    // If total count > 0 but created_at was outside the 7-day range or sample data:
    const recordedCount = buckets.reduce((acc, b) => acc + b.count, 0)
    if (recordedCount === 0 && counts.total > 0) {
      const todayBucket = buckets[buckets.length - 1]
      if (todayBucket) {
        todayBucket.count = counts.total
      }
    }

    return buckets.map((b) => ({
      label: b.dayLabel,
      value: b.count,
      sublabel: b.count === 1 ? "application" : "applications",
      tooltip: `${b.isToday ? "Today" : `${b.dayName} (${b.dateStr})`}: ${b.count} application${
        b.count === 1 ? "" : "s"
      }`,
    }))
  }, [allApplications, counts.total])

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
          value={counts.total}
          subtitle="submitted by candidates"
          tooltipTitle="Application Activity Trend"
          tooltipDesc="Candidate application submission volume across open positions over the last 7 days."
          tooltipDetail={`${counts.total} application${counts.total === 1 ? "" : "s"} in total • ${
            applicationTrendBars[applicationTrendBars.length - 1]?.value || 0
          } new today`}
          visual={
            <SparklineBars
              bars={applicationTrendBars}
              caption="Last 7 days"
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
          value={counts.pending}
          subtitle="awaiting your decision"
          tooltipTitle="Review Queue Status"
          tooltipDesc="Candidate applications waiting for leader evaluation before recruitment expires."
          tooltipDetail={
            counts.pending > 0
              ? `${counts.pending} candidate(s) awaiting your decision`
              : "Review queue is clear • 0 pending applications"
          }
          visual={<CapsuleSlots variant="faint" />}
          footerLeft={counts.pending > 0 ? "Requires action" : "All caught up"}
          actionLabel="Review pending"
          actionOnClick={() => {
            setSelectedStatus("pending")
            setCurrentPage(1)
          }}
        />

        <MetricCard
          index={2}
          label="Accepted"
          value={counts.accepted}
          subtitle="confirmed teammates"
          tooltipTitle="Team Roster Filling Rate"
          tooltipDesc="Circular gauge showing confirmed team members vs maximum team capacity."
          tooltipDetail={
            projectDetail && projectDetail.max_team_capacity > 0
              ? `${projectDetail.current_team_size || 0} of ${projectDetail.max_team_capacity} seats filled (${Math.min(
                  100,
                  Math.round(
                    ((projectDetail.current_team_size || 0) /
                      projectDetail.max_team_capacity) *
                      100,
                  ),
                )}% capacity)`
              : `${projectDetail?.current_team_size || 0} confirmed teammates`
          }
          visual={
            <DonutProgressRing
              pct={
                projectDetail && projectDetail.max_team_capacity > 0
                  ? Math.min(
                      100,
                      Math.round(
                        ((projectDetail.current_team_size || 0) /
                          projectDetail.max_team_capacity) *
                          100,
                      ),
                    )
                  : projectDetail?.current_team_size
                  ? 100
                  : 0
              }
              strokeColor="#0d9488"
            />
          }
          footerLeft={
            projectDetail && projectDetail.max_team_capacity > 0
              ? `${projectDetail.current_team_size || 0}/${projectDetail.max_team_capacity} seats filled`
              : `${projectDetail?.current_team_size || 0} seats filled`
          }
          actionLabel="Open workspace"
          actionTo={activeProjectId ? `/team/${activeProjectId}` : "/team"}
        />

        <MetricCard
          index={3}
          label="Open positions"
          value={openPositionsCount}
          subtitle="places for new teammates"
          tooltipTitle="Recruitment Vacancies by Role"
          tooltipDesc="Breakdown of remaining openings and filled status per project role."
          tooltipDetail={
            openPositionsCount > 0
              ? `${openPositionsCount} opening${openPositionsCount === 1 ? "" : "s"} actively recruiting`
              : "All positions currently filled"
          }
          visual={
            <CategoryBreakdown
              items={(projectDetail?.positions || [])
                .slice(0, 2)
                .map((p, idx) => {
                  const remaining = Math.max(0, p.required_count - p.filled_count)
                  const pct = p.required_count > 0 ? Math.round((remaining / p.required_count) * 100) : 0
                  return {
                    label: p.title.split(" ")[0],
                    count: remaining,
                    pct,
                    color: idx === 0 ? "#2563eb" : "#0d9488",
                  }
                })}
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
            {counts.total} {counts.total === 1 ? "applicant" : "applicants"}
          </span>
        }
      />

      {/* 5. Filter Toolbar (Status Tabs + Position + Sort) */}
      <section className="applications-toolbar" aria-label="Application filters">
        {/* Status Tabs Segmented Control */}
        <div className="applications-status-tabs" role="tablist">
          {(
            [
              { id: "pending", label: "Pending review", count: counts.pending },
              { id: "accepted", label: "Accepted", count: counts.accepted },
              { id: "rejected", label: "Rejected", count: counts.rejected },
              { id: "all", label: "All applications", count: counts.total },
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
                    tab.id === "pending" && counts.pending > 0 ? "pending-alert" : ""
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

                        {status === "accepted" ? (
                          <span className="candidate-status-tag accepted">
                            <CheckCircle2 size={13} strokeWidth={2.5} />
                            <span>Accepted</span>
                          </span>
                        ) : status === "rejected" ? (
                          <span className="candidate-status-tag rejected">
                            <XCircle size={13} strokeWidth={2.5} />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="candidate-status-tag pending">
                            <Clock size={13} strokeWidth={2.5} />
                            <span>Pending review</span>
                          </span>
                        )}
                      </div>

                      <div className="candidate-meta-line">
                        <span className="candidate-applied-badge">
                          <Briefcase size={12} className="candidate-applied-icon" />
                          <span>Applied for:</span>
                          <strong>{row.applied_position.title}</strong>
                          <span className="candidate-slots-tag">({openSlots} {openSlots === 1 ? "slot" : "slots"} left)</span>
                        </span>
                        {row.applicant.preferred_role_name && row.applicant.preferred_role_name.toLowerCase() !== row.applied_position.title.toLowerCase() && (
                          <>
                            <span className="candidate-meta-divider">•</span>
                            <span>{row.applicant.preferred_role_name}</span>
                          </>
                        )}
                        <span className="candidate-meta-divider">•</span>
                        <span>
                          {row.applicant.available_hours_per_week !== null
                            ? `${row.applicant.available_hours_per_week} hrs/week committed`
                            : "Availability flexible"}
                        </span>
                        <span className="candidate-meta-divider">•</span>
                        <span>
                          {row.applicant.experiences_count} exp, {row.applicant.certificates_count} certs
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
                  <div className="candidate-cover-message compact">
                    <MessageSquareQuote size={13} className="candidate-quote-icon" />
                    <span>&ldquo;{row.application.message}&rdquo;</span>
                  </div>
                ) : null}

                {/* Candidate Skills List with Icons */}
                <div className="candidate-skills-section">
                  <div className="candidate-skills-list">
                    {row.applicant.skills?.length > 0 ? (
                      row.applicant.skills.map((s) => (
                        <span key={s.skill_id} className="candidate-skill-tag">
                          <SkillIcon name={s.name} size={13} className="candidate-skill-icon" />
                          <span>{s.name}</span>
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
