import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle,
} from "lucide-react"
import { Avatar, Button, Chips, Modal, PageHeader } from "../../components/ui"
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

export default function ProjectApplicationsScreen() {
  const { id: routeId } = useParams<{ id?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { authUser, notify } = useTindy()

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
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading applications center...
      </div>
    )
  }

  if (!loadingProjects && leadingProjects.length === 0 && !activeProjectId) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Briefcase size={32} />
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
    )
  }

  return (
    <div className="space-y-6" data-leader-applications>
      {/* Top Breadcrumb & Nav Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          to="/leader"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Leader Workspace</span>
        </Link>

        {activeProjectId && (
          <div className="flex items-center gap-2">
            <Link
              to={`/team/${activeProjectId}`}
              className="text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-1"
            >
              <span>Project workspace</span>
              <ArrowUpRight size={13} />
            </Link>
            <span>•</span>
            <Link
              to={`/project/${activeProjectId}`}
              className="text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-1"
            >
              <span>Public project brief</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* Main Header with Project Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Leader Applications Center
              </span>
              {projectDetail && (
                <span className="text-xs text-slate-500 font-medium">
                  {projectDetail.current_team_size}/{projectDetail.max_team_capacity} members filled
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {projectDetail ? `${projectDetail.name} — Applications` : "Candidate Applications"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Review and decide student applications for open roles. Match scores summarize rule
              compatibility; the final team decision is yours.
            </p>
          </div>

          {/* Project Switcher Dropdown */}
          {leadingProjects.length > 1 && (
            <div className="shrink-0 flex items-center gap-2">
              <label htmlFor="project-select" className="text-xs font-semibold text-slate-600">
                Switch project:
              </label>
              <select
                id="project-select"
                value={activeProjectId}
                onChange={(e) => handleProjectSwitch(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
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

        {/* 4 Mini Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block">Total Applications</span>
            <span className="text-lg font-bold text-slate-900">{paginationMeta.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            <span className="text-[11px] font-medium text-amber-700 block">Pending Review</span>
            <span className="text-lg font-bold text-amber-800">{pendingCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-medium text-emerald-700 block">Team Roster</span>
            <span className="text-lg font-bold text-emerald-800">
              {projectDetail
                ? `${projectDetail.current_team_size} / ${projectDetail.max_team_capacity}`
                : "1 / 5"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-medium text-blue-700 block">Open Positions</span>
            <span className="text-lg font-bold text-blue-800">
              {projectDetail?.positions?.filter((p) => p.status === "open").length || 0} roles
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Status Tabs + Position + Sort) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto bg-slate-100/80 p-1 rounded-lg">
            {(
              [
                { id: "pending", label: "Pending review", count: pendingCount },
                { id: "accepted", label: "Accepted", count: acceptedCount },
                { id: "rejected", label: "Rejected", count: rejectedCount },
                { id: "all", label: "All applications", count: paginationMeta.total },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id)
                  setCurrentPage(1)
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedStatus === tab.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "pending" && pendingCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Secondary Controls (Position & Sort) */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter applications by position"
              value={selectedPosition}
              disabled={busy}
              onChange={(e) => {
                setSelectedPosition(e.target.value)
                setCurrentPage(1)
              }}
              className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 cursor-pointer"
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
              className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 cursor-pointer"
            >
              <option value="match">Highest match %</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            className="font-bold underline hover:no-underline"
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

      {/* Empty State */}
      {!loading && applications.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Users size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No applications match these filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {selectedStatus !== "all"
                ? `There are no applications with status "${selectedStatus}". Try switching to "All applications" or reset position filters.`
                : "No candidates have applied to this project yet. Share your project link or review open positions."}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            {selectedStatus !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("all")
                  setSelectedPosition("")
                }}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
            <Link
              to={`/project/${activeProjectId}`}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              View open positions
            </Link>
          </div>
        </div>
      )}

      {/* Applications List */}
      {!loading && applications.length > 0 && (
        <div className="space-y-4">
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
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 sm:p-6 shadow-xs transition-all space-y-4"
              >
                {/* Top Row: Applicant Profile & Match Ring */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 shrink-0">
                      {initials}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-extrabold text-slate-900 truncate">
                          {row.applicant.display_name}
                        </h2>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                            : status === "rejected"
                            ? "Rejected"
                            : status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        {row.applicant.preferred_role_name || "Role unknown"} &nbsp;•&nbsp;{" "}
                        {row.applicant.available_hours_per_week !== null
                          ? `${row.applicant.available_hours_per_week} hrs/week committed`
                          : "Availability flexible"}
                      </p>

                      <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                        <span className="text-slate-500 font-normal">Applied position:</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                          {row.applied_position.title}
                        </span>
                        <span className="text-slate-400 font-normal text-[11px]">
                          ({openSlots} {openSlots === 1 ? "slot" : "slots"} left)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Ring Badge */}
                  <div className="flex items-center gap-3 shrink-0 self-start">
                    <MatchScoreRing score={row.matching.match_score} compact />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-900 block">
                        {row.matching.match_score}% Rule Match
                      </span>
                      <button
                        type="button"
                        onClick={() => setMatchModalData(row)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Why this match</span>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cover Note / Application Message */}
                {row.application.message ? (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Applicant Message
                    </span>
                    <p className="italic leading-relaxed">&ldquo;{row.application.message}&rdquo;</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Applicant expressed interest without an additional note.
                  </p>
                )}

                {/* Candidate Skills & Experience Badges */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold">Candidate Skills:</span>
                    <span>
                      {row.applicant.experiences_count} experiences &nbsp;•&nbsp;{" "}
                      {row.applicant.certificates_count} verified certificates
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {row.applicant.skills?.length > 0 ? (
                      row.applicant.skills.map((s) => (
                        <span
                          key={s.skill_id}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                        >
                          {s.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No skills listed on profile</span>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <Link
                    to={`/users/${row.applicant.user_id}`}
                    className="text-slate-600 hover:text-blue-600 font-semibold inline-flex items-center gap-1.5"
                  >
                    <span>View full student profile & experiences</span>
                    <ArrowUpRight size={13} />
                  </Link>

                  {status === "pending" && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDecision({ row, action: "reject" })}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDecision({ row, action: "accept" })}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <UserCheck size={14} />
                        <span>Accept to team</span>
                      </button>
                    </div>
                  )}

                  {status === "accepted" && (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      <span>Joined active team</span>
                    </span>
                  )}

                  {status === "rejected" && (
                    <span className="text-slate-400 font-medium flex items-center gap-1">
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

      {/* Modal: Why this matches */}
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
