import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowUpRight, Bookmark, ChevronDown, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react"
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
import ProjectDetailModal from "../../components/projects/ProjectDetailModal"
import MinMatchScoreSlider from "../../components/discovery/MinMatchScoreSlider"
import "./live-discovery.css"

const categories = ["AI & Machine Learning", "Cloud & DevOps", "Web Application", "Mobile App", "Open Source", "Social Impact"]
const loadCatalog = async (signal: AbortSignal) => {
  const [roles, skills] = await Promise.all([getProfessionalRolesApi(undefined, signal), getSkillsApi(undefined, undefined, signal)])
  return { roles, skills }
}

export default function LiveDiscoveryView() {
  const { authUser, notify, saved, savedProjects, setProjectSaved } = useTindy()
  const navigate = useNavigate()
  const [category, setCategory] = useState("")
  const [role, setRole] = useState("")
  const [skill, setSkill] = useState("")
  const [minScore, setMinScore] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [active, setActive] = useState<DiscoveryProject | null>(null)
  const [explanation, setExplanation] = useState<RuleMatch | null>(null)
  const [previewProject, setPreviewProject] = useState<DiscoveryProject | null>(null)
  const [reset, setReset] = useState(0)
  const [applying, setApplying] = useState<DiscoveryProject | null>(null)
  const [actionError, setActionError] = useState("")
  const [history, setHistory] = useState<{ id: string; direction: "left" | "up"; wasSaved: boolean }[]>([])
  const [reviewedApplications, setReviewedApplications] = useState<Set<string>>(new Set())
  const scopeKey = `${authUser?.user_id}:${category}:${role}:${skill}`
  const actionScope = useRef(scopeKey); actionScope.current = scopeKey
  const catalog = useRemoteResource(authUser?.user_id ?? null, loadCatalog)
  const feed = useDiscoveryFeed({ category: category || undefined, role_id: role || undefined, skill_id: skill || undefined })
  const rawProjects = useMemo(() => feed.items.map(mapDiscoveryCard), [feed.items])
  const projects = useMemo(() => {
    if (minScore <= 0) return rawProjects
    return rawProjects.filter(p => (p.ruleMatch?.match_score ?? p.match?.overall ?? 0) >= minScore)
  }, [rawProjects, minScore])
  const activeChanged = useCallback((item: DiscoveryProject | DiscoveryCandidate | null) => setActive(item as DiscoveryProject | null), [])
  useEffect(() => { setActive(null); setExplanation(null); setPreviewProject(null); setApplying(null); setHistory([]); setReviewedApplications(new Set()); setActionError("") }, [feed.key])
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
  const filters = <aside className="live-discovery__filters" aria-label="Discovery filters">
    <div className="live-discovery__filter-heading"><span className="live-discovery__eyebrow">YOUR NEXT OPPORTUNITY</span><h2>Find your fit</h2><p>A few filters. A better place to start.</p></div>
    <label className="field-group">Category<select className="field-select" aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="field-group">Required role<select className="field-select" aria-label="Required role" value={role} onChange={e => setRole(e.target.value)} disabled={catalog.loading || !!catalog.error}><option value="">All roles</option>{catalog.data?.roles.map(value => <option key={value.professional_role_id} value={value.professional_role_id}>{value.name}</option>)}</select></label>
    <label className="field-group">Key technology<select className="field-select" aria-label="Key technology" value={skill} onChange={e => setSkill(e.target.value)} disabled={catalog.loading || !!catalog.error}><option value="">All skills</option>{catalog.data?.skills.map(value => <option key={value.skill_id} value={value.skill_id}>{value.name}</option>)}</select></label>
    <div className="field-group" style={{ textTransform: "none", marginBottom: 22 }}><MinMatchScoreSlider value={minScore} onChange={setMinScore} /></div>
    {Boolean(catalog.error) && <div role="alert">{projectErrorMessage(catalog.error)} <button className="btn btn-secondary" onClick={catalog.reload}>Retry catalogs</button></div>}
    <button className="live-discovery__reset" onClick={() => { setCategory(""); setRole(""); setSkill(""); setMinScore(0) }}><RefreshCw size={14} />Reset filters</button>
    <div className="live-discovery__session"><span className="live-discovery__eyebrow">YOUR OVERVIEW</span><dl><div><dt>Loaded</dt><dd>{projects.length}</dd></div><div><dt>Reviewed here</dt><dd aria-label="Reviewed projects in this feed">{history.length + reviewedApplications.size}</dd></div><div><dt>Saved total</dt><dd>{savedProjects.loading ? "…" : savedProjects.error ? "—" : saved.length}</dd></div><div><dt>Skipped here</dt><dd>{history.filter(item => item.direction === "left").length}</dd></div></dl></div>
    <Link to="/projects?tab=Saved" className="live-discovery__saved-link"><Bookmark size={14} />Your saved projects<ArrowUpRight size={14} /></Link>
  </aside>
  const viewActiveProject = () => { if (active) setPreviewProject(active) }
  return <div className="live-discovery" data-live-discovery data-loaded-count={projects.length}>
    <header className="live-discovery__header">
      <div><span className="live-discovery__pill"><Sparkles size={12} />INTERACTIVE MATCHING STACK</span><h1>Discover Projects That Fit You</h1><p>Discover your next team. Skip, save, or explore a position before you apply.</p></div>
      <div className="live-discovery__header-actions"><DiscoverySegmentedControl value="student" options={[{ value: "student", label: "Find Projects" }, { value: "leader", label: "Find Teammates", sublabel: "Demo" }]} ariaLabel="Discovery Mode Switcher" onChange={value => { if (value === "leader") navigate("/discover?mode=teammates") }} /><button className="live-discovery__refresh" onClick={refresh}><RefreshCw size={14} />Refresh</button></div>
    </header>
    <div className="live-discovery__mobile-tools"><button aria-expanded={filtersOpen} aria-controls="live-discovery-filters" onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={15} />Filters{([category, role, skill].filter(Boolean).length + (minScore > 0 ? 1 : 0)) > 0 && <span>{[category, role, skill].filter(Boolean).length + (minScore > 0 ? 1 : 0)}</span>}<ChevronDown size={14} /></button><button disabled={!active?.ruleMatch} onClick={() => setExplanation(active?.ruleMatch ?? null)}><Sparkles size={15} />Match insights</button></div>
    <div className="live-discovery__layout">
      <div id="live-discovery-filters" className={`live-discovery__filter-column${filtersOpen ? " is-open" : ""}`}>{filters}</div>
      <section className="live-discovery__feed" aria-label="Project discovery feed">
        {actionError && <p role="alert" className="panel">{actionError}</p>}
        {Boolean(feed.error) && <div className="panel" role="alert">{projectErrorMessage(feed.error)} <button className="btn btn-secondary" onClick={projects.length && feed.hasMore ? feed.loadMore : refresh}>Retry</button><button className="btn btn-ghost" onClick={refresh}>Refresh feed</button></div>}
        {feed.loading && <p role="status">{projects.length ? "Loading more projects…" : "Loading projects…"}</p>}
        {projects.length > 0 && <SwipeCardStack key={`${feed.key}:${reset}`} items={projects} mode="student" disabled={!!explanation || !!applying} live
          onSwipe={swipe} onUndo={undo} canUndo={history.length > 0} onCardTap={item => setPreviewProject(item as DiscoveryProject)}
          onWhyMatchesClick={item => setExplanation((item as DiscoveryProject).ruleMatch ?? null)} activeItemChanged={activeChanged}
          onResetStack={refresh} />}
        {!feed.loading && !feed.error && projects.length === 0 && <section className="panel text-center"><h2>No eligible projects right now</h2><p>Refresh or adjust the filters to find more projects.</p><button className="btn btn-primary" onClick={refresh}>Refresh feed</button></section>}
      </section>
      <aside className="live-discovery__inspector">{active?.ruleMatch ? <RuleMatchPanel variant="discovery" match={active.ruleMatch} projectName={active.name} onExplain={() => setExplanation(active.ruleMatch ?? null)} onViewDetails={viewActiveProject} /> : <section className="live-discovery__inspector-empty"><Sparkles size={23} /><h2>A closer look at your fit</h2><p>Select a project to see how its position matches your profile.</p></section>}</aside>
    </div>
    
    {previewProject && (
      <ProjectDetailModal
        project={previewProject}
        isOpen={Boolean(previewProject)}
        isSaved={Boolean(saved.includes(previewProject.id) || feed.items.find(p => p.project_id === previewProject.id)?.is_saved)}
        isInterested={Boolean(reviewedApplications.has(previewProject.id))}
        onClose={() => setPreviewProject(null)}
        onToggleSave={async (projectId) => {
          const isCurrentlySaved = saved.includes(projectId) || Boolean(feed.items.find(p => p.project_id === projectId)?.is_saved);
          await setProjectSaved(projectId, !isCurrentlySaved);
          notify(isCurrentlySaved ? "Project removed from saved." : "Project saved.");
        }}
        onMarkInterested={(projectId) => {
          const proj = projects.find(p => p.id === projectId) || previewProject;
          setPreviewProject(null);
          if (proj) setApplying(proj);
        }}
        onOpenAiBreakdown={() => {
          if (previewProject.ruleMatch) {
            setExplanation(previewProject.ruleMatch);
          }
        }}
      />
    )}
    {explanation && <Modal title="Why this matches" className="rule-match-dialog" onClose={() => setExplanation(null)}><RuleMatchPanel match={explanation} projectName={active?.name} /></Modal>}
    {applying && <ApplyModal key={applying.id} projectId={applying.id} preferredPositionId={applying.ruleMatch?.best_position.position_id} onClose={() => setApplying(null)} onConfirmed={application => {
      setApplying(null)
      if (application.status === "pending" || application.status === "accepted") {
        setReviewedApplications(old => new Set([...old, application.application_id]))
        feed.remove(application.project_id)
      }
      notify(`Application confirmed: ${application.status}.`)
    }} />}
  </div>
}
