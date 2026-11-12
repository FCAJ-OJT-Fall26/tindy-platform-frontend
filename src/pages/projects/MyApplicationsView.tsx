import { useCallback, useRef, useState } from "react"
import { Link } from "react-router"
import { AlertCircle, Bell, Clock } from "lucide-react"
import { useTindy } from "../../store"
import { Button } from "../../components/ui"
import ApplyModal from "../../components/projects/ApplyModal"
import useMyApplications from "../../hooks/useMyApplications"
import useRemoteResource from "../../hooks/useRemoteResource"
import { ApiError } from "../../services/apiClient"
import { getProjectByIdApi } from "../../services/projects.service"
import {
  applicationErrorMessage,
  nudgeApplication,
  withdrawApplication,
} from "../../services/applications.service"
import { applicationBlocker } from "../../types/application"

function getDaysUntilExpire(expiresAt?: string | null): number | null {
  if (!expiresAt) return null
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

function isEligibleToNudge(createdAt: string, nudgedAt?: string | null): boolean {
  if (nudgedAt) return false
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return diffMs >= 3 * 24 * 60 * 60 * 1000
}

export default function MyApplicationsView() {
  const { authUser, notify } = useTindy()
  const history = useMyApplications()
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [nudgingId, setNudgingId] = useState<string | null>(null)
  const writing = useRef(false)
  const [error, setError] = useState("")
  const [apply, setApply] = useState<{ project: string; position: string } | null>(null)
  const ids = [...new Set(history.data?.map(a => a.project_id) ?? [])].sort().join(",")
  const load = useCallback(async (signal: AbortSignal) => Object.fromEntries(await Promise.all(ids.split(",").filter(Boolean).map(async id => {
    try { return [id, await getProjectByIdApi(id, signal)] as const }
    catch (reason) { if (reason instanceof ApiError && reason.status === 404) return [id, null] as const; throw reason }
  }))), [ids])
  const details = useRemoteResource(authUser && ids ? `${authUser.user_id}:${ids}` : null, load)
  const withdraw = async (id: string) => {
    if (writing.current || !window.confirm("Withdraw this pending application? You can apply again immediately if the project remains eligible.")) return
    writing.current = true
    setBusy(id); setError("")
    try { await withdrawApplication(id); notify("Application withdrawn."); history.reload() }
    catch (reason) { setError(applicationErrorMessage(reason)); history.reload() }
    finally { writing.current = false; setBusy(null) }
  }

  const handleNudge = async (id: string) => {
    if (nudgingId) return
    setNudgingId(id)
    try {
      await nudgeApplication(id)
      notify("Đã gửi lời nhắc tới Leader.")
      history.reload()
    } catch (reason) {
      notify(applicationErrorMessage(reason))
      history.reload()
    } finally {
      setNudgingId(null)
    }
  }

  const rows = history.data ?? []
  const pages = Math.max(1, Math.ceil(rows.length / 20))
  const currentPage = Math.min(page, pages)
  return <section className="space-y-4" aria-label="My Applications">
    <h2>My Applications</h2><p>Rejected, expired or withdrawn? You may apply again immediately, including to the same open position.</p>
    {history.loading && <p role="status">Loading applications…</p>}
    {(Boolean(history.error) || Boolean(details.error) || error) && <div className="panel" role="alert">{error || applicationErrorMessage(history.error || details.error)} <Button variant="secondary" onClick={() => { history.reload(); details.reload() }}>Refresh applications</Button></div>}
    {!history.loading && !history.error && rows.length === 0 && <div className="panel">No applications yet. <Link to="/discover">Discover projects</Link></div>}
    {rows.slice((currentPage - 1) * 20, currentPage * 20).map(application => {
      const project = details.data?.[application.project_id]
      const position = project?.positions.find(p => p.position_id === application.position_id)
      const blocked = project ? applicationBlocker(project, authUser?.user_id ?? "", rows) : "Project availability is unavailable."
      const daysLeft = application.status === "pending" ? getDaysUntilExpire(application.expires_at) : null
      const canNudge = application.status === "pending" && isEligibleToNudge(application.created_at, application.nudged_at)

      return <article className="panel" key={application.application_id} data-application-id={application.application_id}>
        <div className="section-heading">
          <h3>{project?.name ?? `Project ${application.project_id}`}</h3>
          <span className="badge">{application.status}</span>
        </div>
        <p>Position: {position?.title ?? application.position_id}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <small>Submitted {new Date(application.created_at).toLocaleString()}</small>
          {daysLeft !== null && (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              {daysLeft > 0 ? `Tự động hết hạn sau ${daysLeft} ngày` : "Sắp hết hạn hôm nay"}
            </span>
          )}
        </div>

        {application.status === "rejected" && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 mt-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Lý do từ chối:</span>{" "}
              {application.rejection_reason || "Đã chọn ứng viên khác hoặc dự án đã đủ thành viên."}
            </div>
          </div>
        )}

        {application.message && <p className="mt-2 text-sm text-slate-700">{application.message}</p>}

        <div className="modal-actions mt-3">
          <Link to={`/project/${application.project_id}`} className="btn btn-secondary">View project</Link>
          {application.status === "pending" && (
            <>
              {application.nudged_at ? (
                <Button variant="secondary" disabled title="Bạn đã gửi thông báo nhắc nhở tới Leader">
                  ✓ Đã nhắc
                </Button>
              ) : canNudge ? (
                <Button
                  variant="secondary"
                  disabled={nudgingId === application.application_id}
                  onClick={() => { void handleNudge(application.application_id) }}
                  title="Nhắc nhở Leader xem xét đơn sau 3 ngày chờ đợi"
                >
                  <Bell className="w-3.5 h-3.5 mr-1 text-amber-500 inline" />
                  {nudgingId === application.application_id ? "Đang gửi…" : "Nhắc nhở Leader (Nudge)"}
                </Button>
              ) : null}
              <Button variant="secondary" disabled={!!busy} onClick={() => { void withdraw(application.application_id) }}>
                Withdraw
              </Button>
            </>
          )}
          {(application.status === "rejected" || application.status === "withdrawn" || application.status === "expired") && (
            <Button disabled={!!blocked || details.loading} title={blocked ?? undefined} onClick={() => setApply({ project: application.project_id, position: application.position_id })}>
              Apply Again
            </Button>
          )}
        </div>
        {(application.status === "rejected" || application.status === "withdrawn" || application.status === "expired") && blocked && <p className="field-helper">{blocked}</p>}
      </article>
    })}
    {pages > 1 && <nav className="modal-actions" aria-label="Application history pages"><Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage(v => v - 1)}>Previous</Button><span>{currentPage}/{pages}</span><Button variant="secondary" disabled={currentPage >= pages} onClick={() => setPage(v => v + 1)}>Next</Button></nav>}
    {apply && <ApplyModal projectId={apply.project} preferredPositionId={apply.position} onClose={() => setApply(null)} onConfirmed={application => { setApply(null); history.reload(); details.reload(); notify(`Application confirmed: ${application.status}.`) }} />}
  </section>
}
