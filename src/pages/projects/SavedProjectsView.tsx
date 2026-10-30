import { useState } from "react"
import { Link } from "react-router"
import { useTindy } from "../../store"
import { Button } from "../../components/ui"
import { projectErrorMessage } from "../../services/projectEditor.service"

export default function SavedProjectsView() {
  const { savedProjects, setProjectSaved, notify } = useTindy()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const remove = async (id: string) => {
    if (busy) return
    setBusy(id); setError("")
    try { await setProjectSaved(id, false); notify("Project removed from saved.") }
    catch (reason) { setError(projectErrorMessage(reason)) }
    finally { setBusy(null) }
  }
  const rows = savedProjects.data ?? []
  const pages = Math.max(1, Math.ceil(rows.length / 20)); const current = Math.min(page, pages)
  return <section className="space-y-4" aria-label="Saved Projects"><h2>Saved projects</h2>
    {savedProjects.loading && <p role="status">Loading saved projects…</p>}
    {(Boolean(savedProjects.error) || error) && <div role="alert" className="panel">{error || projectErrorMessage(savedProjects.error)} <Button variant="secondary" onClick={savedProjects.reload}>Retry</Button></div>}
    {!savedProjects.loading && !savedProjects.error && !rows.length && <div className="panel">No saved projects. <Link to="/discover">Discover projects</Link></div>}
    {rows.slice((current - 1) * 20, current * 20).map(project => <article className="panel" key={project.project_id}>
      <div className="section-heading"><h3>{project.name}</h3><span className="badge">{project.is_recruitment_open ? "Recruitment open" : "Recruitment closed"} · {project.status}</span></div>
      <p>{project.tagline}</p><small>{project.category}{project.is_skipped ? " · Skipped in discovery" : ""}</small>
      <div className="modal-actions">{project.status !== "archived" && <Link className="btn btn-secondary" to={`/project/${project.project_id}`}>View project</Link>}<Button variant="secondary" disabled={!!busy} onClick={() => { void remove(project.project_id) }}>Unsave</Button></div>
    </article>)}
    {pages > 1 && <nav className="modal-actions"><Button variant="secondary" disabled={current <= 1} onClick={() => setPage(v => v - 1)}>Previous</Button><span>{current}/{pages}</span><Button variant="secondary" disabled={current >= pages} onClick={() => setPage(v => v + 1)}>Next</Button></nav>}
  </section>
}
