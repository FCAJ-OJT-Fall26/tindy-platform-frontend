import { useCallback, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { Avatar, Button, Modal, PageHeader } from "../../components/ui"
import RuleMatchPanel from "../../components/discovery/RuleMatchPanel"
import { useTindy } from "../../store"
import useRemoteResource from "../../hooks/useRemoteResource"
import { getProjectByIdApi } from "../../services/projects.service"
import { applicationErrorMessage, decideApplication, getProjectApplications } from "../../services/applications.service"
import type { ApplicationReviewDto, ApplicationStatus } from "../../types/application"

export default function ProjectApplicationsScreen() {
  const { id = "" } = useParams()
  const { authUser, notify } = useTindy()
  const [position, setPosition] = useState("")
  const [status, setStatus] = useState<ApplicationStatus | "all">("pending")
  const [sort, setSort] = useState<"match" | "newest">("match")
  const [page, setPage] = useState(1)
  const [decision, setDecision] = useState<{ row: ApplicationReviewDto; action: "accept" | "reject" } | null>(null)
  const [match, setMatch] = useState<ApplicationReviewDto | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const scope = `${authUser?.user_id}:${id}:${position}:${status}:${sort}:${page}`
  const current = useRef(scope); current.current = scope
  const load = useCallback(async (signal: AbortSignal) => {
    const [project, applications] = await Promise.all([getProjectByIdApi(id, signal), getProjectApplications(id,
      { position_id: position || undefined, status, sort_by: sort, page, page_size: 20 }, signal)])
    return { project, applications }
  }, [id, position, status, sort, page])
  const resource = useRemoteResource(authUser ? scope : null, load)
  const confirmed = useRef(new Set<string>())
  const confirm = async () => {
    if (locked.current || !decision) return
    locked.current = true; setBusy(true); setError("")
    const expected = scope
    try {
      await decideApplication(id, decision.row.application.application_id, decision.action)
      if (current.current !== expected) return
      confirmed.current.add(decision.row.application.application_id)
      notify(`Application ${decision.action === "accept" ? "accepted" : "rejected"}.`)
      setDecision(null); resource.reload()
    } catch (reason) {
      if (current.current !== expected) return
      setError(applicationErrorMessage(reason)); setDecision(null); resource.reload()
    } finally { locked.current = false; if (current.current === expected) setBusy(false) }
  }
  const data = resource.data
  return <div className="space-y-5" data-leader-applications>
    <Link className="back-link" to="/leader">Back to Leader Workspace</Link>
    <PageHeader title={data ? `${data.project.name} — Applications` : "Project Applications"} description="Review applications to specific positions. Match scores summarize rules; the final decision is yours." />
    {data && <p>{data.project.current_team_size}/{data.project.max_team_capacity} active team members · <Link to={`/project/${id}`}>View current team</Link></p>}
    <div className="panel grid grid-cols-1 sm:grid-cols-3 gap-4">
      <label className="field-group">Position<select className="field-select" aria-label="Filter applications by position" value={position} disabled={busy} onChange={e => { setPosition(e.target.value); setPage(1) }}><option value="">All positions</option>{data?.project.positions.map(p => <option key={p.position_id} value={p.position_id}>{p.title}</option>)}</select></label>
      <label className="field-group">Status<select className="field-select" aria-label="Filter application status" value={status} disabled={busy} onChange={e => { setStatus(e.target.value as ApplicationStatus | "all"); setPage(1) }}>{["pending", "accepted", "rejected", "withdrawn", "all"].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="field-group">Sort<select className="field-select" aria-label="Sort applications" value={sort} disabled={busy} onChange={e => { setSort(e.target.value as "match" | "newest"); setPage(1) }}><option value="match">Match</option><option value="newest">Newest</option></select></label>
    </div>
    {resource.loading && <p role="status">Loading applications…</p>}
    {(Boolean(resource.error) || error) && <div role="alert" className="panel">{error || applicationErrorMessage(resource.error)} <Button variant="secondary" onClick={() => { setError(""); resource.reload() }}>Refresh</Button></div>}
    {data?.applications.items.map(row => <article className="panel" key={row.application.application_id} data-review-application={row.application.application_id}>
      <div className="section-heading"><div className="leader-line"><Avatar name={row.applicant.display_name} /><div><h2>{row.applicant.display_name}</h2><small>{row.applicant.preferred_role_name ?? "Preferred role unknown"} · {row.applicant.available_hours_per_week === null ? "Availability unknown" : `${row.applicant.available_hours_per_week} hours/week`}</small></div></div><span className="badge">{row.application.status}</span></div>
      <p>Applied position: <strong>{row.applied_position.title}</strong> · {row.applied_position.required_count - row.applied_position.filled_count} remaining slots</p>
      <p><strong data-applied-match-score>{row.matching.match_score}%</strong> rule-based match for this applied position · {row.matching.algorithm_version}</p>
      <p>{row.application.message}</p><p>Skills: {row.applicant.skills.map(s => s.name).join(", ") || "Not provided"}</p>
      <div className="modal-actions"><Link className="btn btn-secondary" to={`/users/${row.applicant.user_id}`}>View profile, experiences & certificates</Link>
        <span>{row.applicant.experiences_count} experiences · {row.applicant.certificates_count} certificates (metadata)</span><Button variant="secondary" onClick={() => setMatch(row)}>Why this matches</Button></div>
      {row.application.status === "pending" && <div className="modal-actions"><Button disabled={busy || resource.loading || confirmed.current.has(row.application.application_id)} onClick={() => setDecision({ row, action: "accept" })}>Accept</Button><Button variant="secondary" disabled={busy || resource.loading || confirmed.current.has(row.application.application_id)} onClick={() => setDecision({ row, action: "reject" })}>Reject</Button></div>}
    </article>)}
    {data && !data.applications.items.length && !resource.loading && <section className="panel">No applications match these filters.</section>}
    {data && <nav className="modal-actions" aria-label="Applicant list pages"><Button variant="secondary" disabled={!data.applications.pagination.has_previous || resource.loading || busy} onClick={() => setPage(v => v - 1)}>Previous</Button><span>Page {data.applications.pagination.current_page} · {data.applications.pagination.total_items} applications</span><Button variant="secondary" disabled={!data.applications.pagination.has_next || resource.loading || busy} onClick={() => setPage(v => v + 1)}>Next</Button></nav>}
    {match && <Modal title="Applied position match" onClose={() => setMatch(null)}><RuleMatchPanel match={match.matching} /></Modal>}
    {decision && <Modal title={decision.action === "accept" ? "Accept application?" : "Reject application?"} onClose={() => { if (!locked.current) setDecision(null) }}>
      <h2>{decision.row.applicant.display_name}</h2><p>{decision.row.applied_position.title} · {data?.project.name}</p>
      <p>{decision.action === "accept" ? "Acceptance joins this member to the project and occupies one position slot." : "Rejection leaves the team and slot count unchanged. The member may apply again immediately."}</p>
      <div className="modal-actions"><Button variant="secondary" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button><Button disabled={busy} onClick={() => { void confirm() }}>{busy ? "Saving…" : decision.action === "accept" ? "Confirm accept" : "Confirm reject"}</Button></div>
    </Modal>}
  </div>
}
