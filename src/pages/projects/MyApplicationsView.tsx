import { useCallback, useRef, useState } from "react"
import { Link } from "react-router"
import { useTindy } from "../../store"
import { Button } from "../../components/ui"
import ApplyModal from "../../components/projects/ApplyModal"
import useMyApplications from "../../hooks/useMyApplications"
import useRemoteResource from "../../hooks/useRemoteResource"
import { ApiError } from "../../services/apiClient"
import { getProjectByIdApi } from "../../services/projects.service"
import { applicationErrorMessage, withdrawApplication } from "../../services/applications.service"
import { applicationBlocker } from "../../types/application"

export default function MyApplicationsView() {
  const { authUser, notify } = useTindy()
  const history = useMyApplications()
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
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
  const rows = history.data ?? []
  const pages = Math.max(1, Math.ceil(rows.length / 20))
  const currentPage = Math.min(page, pages)
  return <section className="space-y-4" aria-label="My Applications">
    <h2>My Applications</h2><p>Rejected or withdrawn? You may apply again immediately, including to the same open position.</p>
    {history.loading && <p role="status">Loading applications…</p>}
    {(Boolean(history.error) || Boolean(details.error) || error) && <div className="panel" role="alert">{error || applicationErrorMessage(history.error || details.error)} <Button variant="secondary" onClick={() => { history.reload(); details.reload() }}>Refresh applications</Button></div>}
    {!history.loading && !history.error && rows.length === 0 && <div className="panel">No applications yet. <Link to="/discover">Discover projects</Link></div>}
    {rows.slice((currentPage - 1) * 20, currentPage * 20).map(application => {
      const project = details.data?.[application.project_id]
      const position = project?.positions.find(p => p.position_id === application.position_id)
      const blocked = project ? applicationBlocker(project, authUser?.user_id ?? "", rows) : "Project availability is unavailable."
      return <article className="panel" key={application.application_id} data-application-id={application.application_id}>
        <div className="section-heading"><h3>{project?.name ?? `Project ${application.project_id}`}</h3><span className="badge">{application.status}</span></div>
        <p>Position: {position?.title ?? application.position_id}</p><small>Submitted {new Date(application.created_at).toLocaleString()}</small>
        {application.message && <p>{application.message}</p>}
        <div className="modal-actions"><Link to={`/project/${application.project_id}`} className="btn btn-secondary">View project</Link>
          {application.status === "pending" && <Button variant="secondary" disabled={!!busy} onClick={() => { void withdraw(application.application_id) }}>Withdraw</Button>}
          {(application.status === "rejected" || application.status === "withdrawn") && <Button disabled={!!blocked || details.loading} title={blocked ?? undefined} onClick={() => setApply({ project: application.project_id, position: application.position_id })}>Apply Again</Button>}
        </div>{(application.status === "rejected" || application.status === "withdrawn") && blocked && <p className="field-helper">{blocked}</p>}
      </article>
    })}
    {pages > 1 && <nav className="modal-actions" aria-label="Application history pages"><Button variant="secondary" disabled={currentPage <= 1} onClick={() => setPage(v => v - 1)}>Previous</Button><span>{currentPage}/{pages}</span><Button variant="secondary" disabled={currentPage >= pages} onClick={() => setPage(v => v + 1)}>Next</Button></nav>}
    {apply && <ApplyModal projectId={apply.project} preferredPositionId={apply.position} onClose={() => setApply(null)} onConfirmed={application => { setApply(null); history.reload(); details.reload(); notify(`Application confirmed: ${application.status}.`) }} />}
  </section>
}
