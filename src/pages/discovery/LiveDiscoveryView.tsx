import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { ChevronDown, RefreshCw, SlidersHorizontal } from "lucide-react"
import useDiscoveryFeed from "../../hooks/useDiscoveryFeed"
import useRemoteResource from "../../hooks/useRemoteResource"
import { useTindy } from "../../store"
import { getProfessionalRolesApi, getSkillsApi } from "../../services/catalog.service"
import { mapDiscoveryCard, setDiscoveryFlag } from "../../services/discovery.service"
import { projectErrorMessage } from "../../services/projectEditor.service"
import type { DiscoveryCandidate, DiscoveryProject, RuleMatch, SwipeDirection } from "../../types/discovery"
import SwipeCardStack from "../../components/discovery/SwipeCardStack"
import DiscoverySegmentedControl from "../../components/discovery/DiscoverySegmentedControl"
import RuleMatchPanel from "../../components/discovery/RuleMatchPanel"
import { Modal } from "../../components/ui"
import ApplyModal from "../../components/projects/ApplyModal"

const categories = ["AI & Machine Learning", "Cloud & DevOps", "Web Application", "Mobile App", "Open Source", "Social Impact"]
const loadCatalog = async (signal: AbortSignal) => {
  const [roles, skills] = await Promise.all([getProfessionalRolesApi(undefined, signal), getSkillsApi(undefined, undefined, signal)])
  return { roles, skills }
}

export default function LiveDiscoveryView() {
  const { authUser, notify, saved, setProjectSaved } = useTindy()
  const navigate = useNavigate()
  const [category, setCategory] = useState("")
  const [role, setRole] = useState("")
  const [skill, setSkill] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [active, setActive] = useState<DiscoveryProject | null>(null)
  const [explanation, setExplanation] = useState<RuleMatch | null>(null)
  const [reset, setReset] = useState(0)
  const [applying, setApplying] = useState<DiscoveryProject | null>(null)
  const [actionError, setActionError] = useState("")
  const [history, setHistory] = useState<{ id: string; direction: "left" | "up"; wasSaved: boolean }[]>([])
  const scopeKey = `${authUser?.user_id}:${category}:${role}:${skill}`
  const actionScope = useRef(scopeKey); actionScope.current = scopeKey
  const catalog = useRemoteResource(authUser?.user_id ?? null, loadCatalog)
  const feed = useDiscoveryFeed({ category: category || undefined, role_id: role || undefined, skill_id: skill || undefined })
  const projects = useMemo(() => feed.items.map(mapDiscoveryCard), [feed.items])
  const activeChanged = useCallback((item: DiscoveryProject | DiscoveryCandidate | null) => setActive(item as DiscoveryProject | null), [])
  useEffect(() => { setActive(null); setExplanation(null); setApplying(null); setHistory([]); setActionError("") }, [feed.key])
  useEffect(() => {
    if (!active) return
    const index = active ? projects.findIndex(p => p.id === active.id) : projects.length
    if (!feed.loading && !feed.error && feed.hasMore && projects.length - index <= 4) feed.loadMore()
  }, [active, projects, feed.loading, feed.error, feed.hasMore, feed.loadMore])
  const refresh = () => { setActive(null); setReset(v => v + 1); feed.refresh() }
  const swipe = async (item: DiscoveryProject | DiscoveryCandidate, direction: SwipeDirection) => {
    if (direction === "right") { setApplying(item as DiscoveryProject); return false }
    const owner = actionScope.current
    setActionError("")
    const wasSaved = saved.includes(item.id) || Boolean(feed.items.find(p => p.project_id === item.id)?.is_saved)
    try {
      if (direction === "left") await setDiscoveryFlag(item.id, "skipped", true)
      else await setProjectSaved(item.id, true)
      if (actionScope.current !== owner) return false
      setHistory(old => [...old, { id: item.id, direction, wasSaved }])
      notify(direction === "left" ? "Project skipped." : "Project saved.")
      return true
    } catch (error) { if (actionScope.current === owner) setActionError(projectErrorMessage(error)); return false }
  }
  const undo = async () => {
    const previous = history[history.length - 1]
    if (!previous) return false
    const owner = actionScope.current
    try {
      if (previous.direction === "left") await setDiscoveryFlag(previous.id, "skipped", false)
      else await setProjectSaved(previous.id, previous.wasSaved)
      if (actionScope.current !== owner) return false
      setHistory(old => old.slice(0, -1)); setActionError(""); notify("Last discovery action undone.")
      return true
    } catch (error) { if (actionScope.current === owner) setActionError(projectErrorMessage(error)); return false }
  }
  const filters = <aside className="panel space-y-4 min-w-0" aria-label="Discovery filters">
    <strong>Find projects</strong>
    <label className="field-group">Category<select className="field-select" aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="field-group">Required role<select className="field-select" aria-label="Required role" value={role} onChange={e => setRole(e.target.value)} disabled={catalog.loading || !!catalog.error}><option value="">All roles</option>{catalog.data?.roles.map(value => <option key={value.professional_role_id} value={value.professional_role_id}>{value.name}</option>)}</select></label>
    <label className="field-group">Key technology<select className="field-select" aria-label="Key technology" value={skill} onChange={e => setSkill(e.target.value)} disabled={catalog.loading || !!catalog.error}><option value="">All skills</option>{catalog.data?.skills.map(value => <option key={value.skill_id} value={value.skill_id}>{value.name}</option>)}</select></label>
    {Boolean(catalog.error) && <div role="alert">{projectErrorMessage(catalog.error)} <button className="btn btn-secondary" onClick={catalog.reload}>Retry catalogs</button></div>}
    <button className="btn btn-secondary" onClick={() => { setCategory(""); setRole(""); setSkill("") }}>Reset filters</button>
    <p className="field-helper">Rule-based recommendations based on your profile.</p>
    <Link to="/projects?tab=Saved" className="text-link">Saved projects</Link>
  </aside>
  return <div className="w-full min-w-0 flex flex-col space-y-6 pb-16" data-live-discovery data-loaded-count={projects.length}>
    <DiscoverySegmentedControl value="student" options={[{ value: "student", label: "Find Projects" }, { value: "leader", label: "Find Teammates", sublabel: "Demo" }]} ariaLabel="Discovery Mode Switcher" onChange={value => { if (value === "leader") navigate("/discover?demo=1&mode=teammates") }} />
    <header className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
      <div><span className="insight-label">INTERACTIVE MATCHING STACK</span><h1 className="text-2xl font-extrabold">Discover Projects That Fit You</h1><p className="text-sm text-slate-500">Left to skip, up to save, right to review an application before confirming.</p></div>
      <button className="btn btn-secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</button>
    </header>
    <div className="lg:hidden"><button className="btn btn-secondary w-full" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={15} /> Filters <ChevronDown size={15} /></button></div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
      <div className={`${filtersOpen ? "block" : "hidden"} lg:block lg:col-span-3 min-w-0`}>{filters}</div>
      <main className="lg:col-span-6 min-w-0 space-y-3">
        {actionError && <p role="alert" className="panel">{actionError}</p>}
        {Boolean(feed.error) && <div className="panel" role="alert">{projectErrorMessage(feed.error)} <button className="btn btn-secondary" onClick={projects.length && feed.hasMore ? feed.loadMore : refresh}>Retry</button><button className="btn btn-ghost" onClick={refresh}>Refresh feed</button></div>}
        {feed.loading && <p role="status">{projects.length ? "Loading more projects…" : "Loading projects…"}</p>}
        {projects.length > 0 && <SwipeCardStack key={`${feed.key}:${reset}`} items={projects} mode="student" disabled={!!explanation || !!applying} live
          onSwipe={swipe} onUndo={undo} canUndo={history.length > 0} onCardTap={item => navigate(`/project/${item.id}`, { state: { match: (item as DiscoveryProject).ruleMatch, matchOwner: authUser?.user_id } })}
          onWhyMatchesClick={item => setExplanation((item as DiscoveryProject).ruleMatch ?? null)} activeItemChanged={activeChanged}
          onResetStack={refresh} />}
        {!feed.loading && !feed.error && projects.length === 0 && <section className="panel text-center"><h2>No eligible projects right now</h2><p>Refresh or adjust the filters to find more projects.</p><button className="btn btn-primary" onClick={refresh}>Refresh feed</button></section>}
        {feed.hasMore && <button className="btn btn-secondary" disabled={feed.loading} onClick={feed.loadMore}>Load more</button>}
      </main>
      <aside className="hidden lg:block lg:col-span-3 min-w-0">{active?.ruleMatch ? <RuleMatchPanel match={active.ruleMatch} /> : <section className="panel">Select a project to inspect its rule-based match.</section>}</aside>
    </div>
    {explanation && <Modal title="Why this matches" onClose={() => setExplanation(null)}><RuleMatchPanel match={explanation} /></Modal>}
    {applying && <ApplyModal key={applying.id} projectId={applying.id} preferredPositionId={applying.ruleMatch?.best_position.position_id} onClose={() => setApplying(null)} onConfirmed={application => {
      setApplying(null)
      if (application.status === "pending" || application.status === "accepted") feed.remove(application.project_id)
      notify(`Application confirmed: ${application.status}.`)
    }} />}
  </div>
}
