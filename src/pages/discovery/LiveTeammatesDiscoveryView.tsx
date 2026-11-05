import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { ArrowUpRight, ChevronDown, RefreshCw, SlidersHorizontal, Users } from "lucide-react"
import useTeammateProjectContext from "../../hooks/useTeammateProjectContext"
import useTeammateDiscovery from "../../hooks/useTeammateDiscovery"
import useCandidateAction from "../../hooks/useCandidateAction"
import useRemoteResource from "../../hooks/useRemoteResource"
import ProjectPositionSelector from "../../components/candidates/ProjectPositionSelector"
import CandidateCardContent from "../../components/candidates/CandidateCardContent"
import LiveCandidateDetail from "../../components/candidates/LiveCandidateDetail"
import SendInvitationModal from "../../components/candidates/SendInvitationModal"
import RuleMatchPanel from "../../components/discovery/RuleMatchPanel"
import SwipeCardStack from "../../components/discovery/SwipeCardStack"
import DiscoverySegmentedControl from "../../components/discovery/DiscoverySegmentedControl"
import { Modal } from "../../components/ui"
import {
  getProfessionalRolesApi,
  getSkillsApi,
} from "../../services/catalog.service"
import { teammateErrorMessage } from "../../services/teammates.service"
import { useTindy } from "../../store"
import type { CandidateAction, LiveTeammateCard } from "../../types/teammate"
import type { SwipeDirection } from "../../types/discovery"
import "./live-discovery.css"
import "./live-teammates.css"

const loadCatalog = async (signal: AbortSignal) => {
  const [roles, skills] = await Promise.all([
    getProfessionalRolesApi(undefined, signal),
    getSkillsApi(undefined, undefined, signal),
  ])
  return { roles, skills }
}

export interface LiveTeammatesDiscoveryViewProps {
  hideHeader?: boolean
  refreshTrigger?: number
}

export default function LiveTeammatesDiscoveryView({
  hideHeader = false,
  refreshTrigger,
}: LiveTeammatesDiscoveryViewProps = {}) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const project = params.get("project_id") ?? "",
    position = params.get("position_id") ?? ""
  const context = useTeammateProjectContext(project, position)
  const { notify } = useTindy()
  const role = params.get("role_id") ?? "",
    skill = params.get("skill_id") ?? "",
    hours = params.get("hours") ?? ""
  const query = useMemo(
    () => ({
      limit: 20,
      sort_by: "match" as const,
      role_id: role || undefined,
      skill_id: skill || undefined,
      min_available_hours_per_week: hours ? Number(hours) : undefined,
    }),
    [role, skill, hours],
  )
  const catalog = useRemoteResource(context.key, loadCatalog)
  const feed = useTeammateDiscovery(project, position, query, !context.blocker)
  const action = useCandidateAction(feed.key, project, position)
  const [active, setActive] = useState<LiveTeammateCard | null>(null)
  const [detail, setDetail] = useState<LiveTeammateCard | null>(null)
  const [explanation, setExplanation] = useState<LiveTeammateCard | null>(null)
  const [shortlist, setShortlist] = useState<LiveTeammateCard | null>(null)
  const [invite, setInvite] = useState<LiveTeammateCard | null>(null)
  const [history, setHistory] = useState<{
    user: string
    previous: CandidateAction | null
  }[]>([])
  const [revision, setRevision] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const cards = useMemo<LiveTeammateCard[]>(
    () =>
      feed.items.map((card) => ({
        ...card,
        source: "live-teammate",
        id: card.candidate.user_id,
        name: card.candidate.display_name,
      })),
    [feed.items],
  )
  const scope = useRef(feed.key)
  scope.current = feed.key
  useEffect(() => {
    scope.current = feed.key
    setActive(null)
    setDetail(null)
    setExplanation(null)
    setShortlist(null)
    setInvite(null)
    setHistory([])
    return () => { scope.current = null }
  }, [feed.key])

  const activeChanged = useCallback(
    (card: LiveTeammateCard | null) => setActive(card),
    [],
  )

  const refresh = useCallback(() => {
    setActive(null)
    setRevision((v) => v + 1)
    feed.refresh()
    context.detail.reload()
  }, [feed, context.detail])

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refresh()
    }
  }, [refreshTrigger, refresh])

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next)
  }

  const perform = async (card: LiveTeammateCard, next: CandidateAction) => {
    const owner = feed.key
    if (!(await action.mutate(card.id, next)) || scope.current !== owner)
      return false
    setHistory((old) => [
      ...old,
      { user: card.id, previous: card.interaction_action },
    ])
    feed.setAction(card.id, next)
    notify(`Candidate ${next}.`)
    return true
  }

  const swipe = async (card: LiveTeammateCard, direction: SwipeDirection) => {
    if (direction === "right") {
      setShortlist(card)
      return false
    }
    return perform(card, direction === "left" ? "skipped" : "saved")
  }

  const undo = async () => {
    const previous = history[history.length - 1],
      owner = feed.key
    if (
      !previous ||
      !(await action.mutate(previous.user, previous.previous)) ||
      scope.current !== owner
    )
      return false
    setHistory((old) => old.slice(0, -1))
    feed.refresh()
    setRevision((v) => v + 1)
    notify("Previous stored action restored.")
    return true
  }

  const blocked = action.busy || action.uncertain || !!shortlist || !!invite
  const contextLabel = `${context.project?.name ?? project} · ${context.position?.title ?? position}`

  return (
    <div
      className={hideHeader ? "live-discovery-content live-teammates" : "live-discovery live-teammates"}
      data-live-teammates
      data-loaded-count={cards.length}
    >
      {!hideHeader && (
        <header className="live-discovery__header">
          <div>
            <span className="live-discovery__pill">INTERACTIVE MATCHING STACK</span>
            <h1>Discover Teammates That Fit Your Team</h1>
            <p>Review eligible members for a position you lead. Skip, shortlist, or send an invitation.</p>
          </div>
          <div className="live-discovery__header-actions">
            <DiscoverySegmentedControl
              ariaLabel="Discovery Mode Switcher"
              value="teammates"
              options={[
                { value: "projects", label: "Find Projects" },
                { value: "teammates", label: "Find Teammates" },
              ]}
              onChange={(v) => {
                if (v === "projects") navigate("/discover")
              }}
            />
            <button className="live-discovery__refresh" onClick={refresh}>
              <RefreshCw size={14} />Refresh
            </button>
          </div>
        </header>
      )}

      {/* Project & Position Context Selector Banner */}
      <div className="teammate-context-banner">
        <ProjectPositionSelector
          context={context}
          projectId={project}
          positionId={position}
          disabled={blocked}
          onChange={(p, s) => {
            const next = new URLSearchParams(params)
            next.set("mode", "teammates")
            if (p) next.set("project_id", p)
            else next.delete("project_id")
            if (s) next.set("position_id", s)
            else next.delete("position_id")
            setParams(next)
          }}
        />
      </div>

      {/* Mobile Toolbar */}
      <div className="live-discovery__mobile-tools">
        <button
          aria-expanded={filtersOpen}
          aria-controls="live-discovery-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <SlidersHorizontal size={15} />
          Filters
          {[role, skill, hours].filter(Boolean).length > 0 && (
            <span>{[role, skill, hours].filter(Boolean).length}</span>
          )}
          <ChevronDown size={14} />
        </button>
        <button
          disabled={!active?.matching}
          onClick={() => setExplanation(active)}
        >
          Match insights
        </button>
      </div>

      {/* 3-Column Matching Stack Layout */}
      <div className="live-discovery__layout">
        {/* Column 1: Filters */}
        <div
          id="live-discovery-filters"
          className={`live-discovery__filter-column${filtersOpen ? " is-open" : ""}`}
        >
          <aside className="live-discovery__filters" aria-label="Teammate filters">
            <div className="live-discovery__filter-heading">
              <span className="live-discovery__eyebrow">YOUR RECRUITMENT PIPELINE</span>
              <h2>Filter candidates</h2>
              <p>A few filters. The right people to build with.</p>
            </div>

            <label className="field-group">
              Preferred role
              <select
                className="field-select"
                aria-label="Candidate role"
                value={role}
                disabled={blocked || !catalog.data}
                onChange={(e) => update("role_id", e.target.value)}
              >
                <option value="">All roles</option>
                {catalog.data?.roles.map((r) => (
                  <option
                    key={r.professional_role_id}
                    value={r.professional_role_id}
                  >
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              Key technology
              <select
                className="field-select"
                aria-label="Candidate skill"
                value={skill}
                disabled={blocked || !catalog.data}
                onChange={(e) => update("skill_id", e.target.value)}
              >
                <option value="">All skills</option>
                {catalog.data?.skills.map((s) => (
                  <option key={s.skill_id} value={s.skill_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              Minimum hours/week
              <select
                className="field-select"
                aria-label="Candidate availability"
                value={hours}
                disabled={blocked}
                onChange={(e) => update("hours", e.target.value)}
              >
                <option value="">Any availability</option>
                {[1, 5, 10, 15, 20, 30, 40].map((h) => (
                  <option value={h} key={h}>
                    {h} hours/week
                  </option>
                ))}
              </select>
            </label>

            {Boolean(catalog.error) && (
              <div role="alert" style={{ marginBottom: 16 }}>
                Filter catalog unavailable.{" "}
                <button className="btn btn-secondary" onClick={catalog.reload}>
                  Retry
                </button>
              </div>
            )}

            <button
              className="live-discovery__reset"
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete("role_id")
                next.delete("skill_id")
                next.delete("hours")
                setParams(next)
              }}
            >
              <RefreshCw size={14} />Reset filters
            </button>

            <div className="live-discovery__session">
              <span className="live-discovery__eyebrow">YOUR OVERVIEW</span>
              <dl>
                <div>
                  <dt>Loaded</dt>
                  <dd>{cards.length}</dd>
                </div>
                <div>
                  <dt>Reviewed here</dt>
                  <dd>{history.length}</dd>
                </div>
                <div>
                  <dt>Shortlisted</dt>
                  <dd>
                    {cards.filter((c) => c.interaction_action === "shortlisted").length}
                  </dd>
                </div>
                <div>
                  <dt>Skipped here</dt>
                  <dd>
                    {cards.filter((c) => c.interaction_action === "skipped").length}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              to={`/candidates?project_id=${project}&position_id=${position}`}
              className="live-discovery__saved-link"
            >
              <Users size={14} />Candidate pipeline<ArrowUpRight size={14} />
            </Link>
          </aside>
        </div>

        {/* Column 2: Feed Stack */}
        <section
          className="live-discovery__feed"
          aria-label="Ranked candidates"
        >
          {Boolean(action.error) && (
            <p className="panel" role="alert">
              {action.error}
              {action.uncertain && (
                <button
                  className="btn btn-secondary"
                  disabled={action.busy}
                  onClick={async () => {
                    if (await action.check()) refresh()
                  }}
                >
                  Check stored action
                </button>
              )}
            </p>
          )}

          {feed.loading && !cards.length && (
            <p role="status">Loading ranked candidates…</p>
          )}

          {Boolean(feed.error) && (
            <div className="panel" role="alert">
              {teammateErrorMessage(feed.error)}{" "}
              <button
                className="btn btn-secondary"
                disabled={blocked}
                onClick={refresh}
              >
                Refresh feed
              </button>
            </div>
          )}

          {!feed.loading && !feed.error && feed.key && cards.length === 0 && (
            <section className="panel text-center">
              <h2>No eligible candidates right now</h2>
              <p>
                Try adjusting the filters or refresh after members update their profiles.
              </p>
              <button className="btn btn-primary" onClick={refresh}>
                Refresh feed
              </button>
            </section>
          )}

          {cards.length > 0 && (
            <SwipeCardStack<LiveTeammateCard>
              key={`${feed.key}:${revision}`}
              items={cards}
              mode="leader"
              live
              rightAction="Shortlist"
              disabled={blocked || !!feed.error || !!context.blocker}
              onSwipe={swipe}
              onUndo={undo}
              canUndo={history.length > 0}
              onResetStack={refresh}
              activeItemChanged={activeChanged}
              onCardTap={setDetail}
              onWhyMatchesClick={setExplanation}
              renderContent={(card, top) => (
                <CandidateCardContent
                  candidate={card}
                  isActive={top}
                  contextLabel={contextLabel}
                  onWhyMatchesClick={(e) => {
                    e.stopPropagation()
                    setExplanation(card)
                  }}
                  onViewDetailsClick={(e) => {
                    e.stopPropagation()
                    setDetail(card)
                  }}
                />
              )}
            />
          )}

          {active && (
            <button
              className="btn btn-primary teammate-invite-btn"
              disabled={blocked || !!context.blocker}
              onClick={() => setInvite(active)}
            >
              Send Invitation to {active.name}
            </button>
          )}

          {feed.hasMore && (
            <button
              className="btn btn-secondary"
              style={{ width: "100%", maxWidth: 580, margin: "0 auto" }}
              disabled={feed.loading || blocked}
              onClick={feed.loadMore}
            >
              {feed.loading ? "Loading…" : "Load more candidates"}
            </button>
          )}
        </section>

        {/* Column 3: Match Inspector */}
        <aside className="live-discovery__inspector">
          {active ? (
            <RuleMatchPanel
              match={active.matching}
              perspective="teammate"
              variant="discovery"
              projectName={contextLabel}
              onExplain={() => setExplanation(active)}
              onViewDetails={() => setDetail(active)}
            />
          ) : (
            <section className="live-discovery__inspector-empty">
              <h2>A closer look at candidate fit</h2>
              <p>
                Select a candidate to inspect their position compatibility.
              </p>
            </section>
          )}
        </aside>
      </div>

      {/* Modals */}
      {explanation && (
        <Modal
          title="Candidate Position Match"
          wide
          onClose={() => setExplanation(null)}
        >
          <RuleMatchPanel
            match={explanation.matching}
            perspective="teammate"
            projectName={`${explanation.name} · ${contextLabel}`}
          />
        </Modal>
      )}

      {detail && (
        <Modal title="Candidate Profile" wide onClose={() => setDetail(null)}>
          <LiveCandidateDetail userId={detail.id} />
        </Modal>
      )}

      {shortlist && (
        <Modal
          title="Shortlist candidate"
          onClose={() => setShortlist(null)}
          dismissible={!action.busy}
        >
          <div className="teammate-dialog">
            <h2>{shortlist.name}</h2>
            <p>
              Shortlist for {contextLabel}? This stores an interaction for this
              Position. Sending an Invitation is a separate action.
            </p>
            {action.error && <p role="alert">{action.error}</p>}
            {action.uncertain && (
              <button
                disabled={action.busy}
                onClick={async () => { if (await action.check()) refresh() }}
              >
                Check stored action
              </button>
            )}
            <div className="teammate-actions">
              <button
                disabled={action.busy}
                className="btn-secondary"
                onClick={() => setShortlist(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={action.busy || action.uncertain}
                onClick={async () => {
                  const card = shortlist
                  if (await perform(card, "shortlisted")) {
                    setShortlist(null)
                    feed.remove(card.id)
                  }
                }}
              >
                {action.busy ? "Saving…" : "Confirm Shortlist"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {invite && context.project && context.position && (
        <SendInvitationModal
          key={`${context.key}:${project}:${position}:${invite.id}`}
          projectId={project}
          positionId={position}
          userId={invite.id}
          candidateName={invite.name}
          projectName={context.project.name}
          positionName={context.position.title}
          blocker={context.blocker}
          onClose={() => setInvite(null)}
          onConfirmed={(row) => {
            setInvite(null)
            notify(
              `Invitation confirmed: ${row.status}. Position: ${context.project?.positions.find((p) => p.position_id === row.position_id)?.title ?? row.position_id}.`,
            )
            feed.refresh()
            setRevision((v) => v + 1)
          }}
        />
      )}
    </div>
  )
}
