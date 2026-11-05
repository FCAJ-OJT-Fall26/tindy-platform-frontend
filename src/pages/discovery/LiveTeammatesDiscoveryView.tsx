import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import {
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  UsersRound,
} from "lucide-react"
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
export default function LiveTeammatesDiscoveryView() {
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
    return () => {
      scope.current = null
    }
  }, [feed.key])
  const activeChanged = useCallback(
    (card: LiveTeammateCard | null) => setActive(card),
    [],
  )
  const refresh = () => {
    setActive(null)
    setRevision((v) => v + 1)
    feed.refresh()
    context.detail.reload()
  }
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
      className="live-discovery live-teammates teammate-discovery"
      data-live-teammates
      data-loaded-count={cards.length}
    >
      <header className="live-discovery__header">
        <div>
          <span className="live-discovery__pill">
            INTERACTIVE MATCHING STACK
          </span>
          <h1>Discover Teammates for Your Team</h1>
          <p>
            Find the right people for your project. Skip, save, or shortlist a
            candidate.
          </p>
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
          <button
            className="live-discovery__refresh"
            disabled={!feed.key || blocked || feed.loading}
            onClick={refresh}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </header>
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
      <div className="live-discovery__mobile-tools teammate-discovery-mobile-tools">
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="teammate-filters"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <SlidersHorizontal size={15} />
          Filters
          {[role, skill, hours].filter(Boolean).length > 0 && (
            <span>{[role, skill, hours].filter(Boolean).length}</span>
          )}
          <ChevronDown size={14} />
        </button>
        <Link
          to={"/candidates?project_id=" + project + "&position_id=" + position}
        >
          <UsersRound size={15} />
          Candidate Pipeline
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="teammate-discovery-grid">
        <aside
          id="teammate-filters"
          className={`live-discovery__filters teammate-filters${
            filtersOpen ? " is-open" : ""
          }`}
          aria-label="Teammate filters"
        >
          <div className="live-discovery__filter-heading">
            <span className="live-discovery__eyebrow">YOUR NEXT TEAMMATE</span>
            <h2>Find your people</h2>
            <p>A few filters. A stronger team.</p>
          </div>
          {catalog.error ? (
            <p role="alert">
              Filter catalog unavailable.{" "}
              <button onClick={catalog.reload}>Retry catalog</button>
            </p>
          ) : null}
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
            Weekly availability
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
          <button
            className="live-discovery__reset"
            disabled={blocked}
            onClick={() => {
              const next = new URLSearchParams(params)
              ;["role_id", "skill_id", "hours"].forEach((key) =>
                next.delete(key),
              )
              setParams(next)
            }}
          >
            <RefreshCw size={14} />
            Reset filters
          </button>
          <div className="live-discovery__session">
            <span className="live-discovery__eyebrow">YOUR OVERVIEW</span>
            <dl>
              <div>
                <dt>Loaded</dt>
                <dd>{feed.loading && !cards.length ? "…" : cards.length}</dd>
              </div>
              <div>
                <dt>Reviewed here</dt>
                <dd>{history.length}</dd>
              </div>
            </dl>
          </div>
          <Link
            className="live-discovery__saved-link"
            to={
              "/candidates?project_id=" + project + "&position_id=" + position
            }
          >
            <UsersRound size={14} />
            Candidate Pipeline
            <ArrowUpRight size={14} />
          </Link>
          {feed.scoredAt && (
            <p className="teammate-snapshot-note">
              Updated{" "}
              {new Date(feed.scoredAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
              . Refresh to update matches.
            </p>
          )}
        </aside>
        <section
          className="teammate-discovery-main"
          aria-label="Ranked candidates"
        >
          {Boolean(action.error) && (
            <p className="error-banner" role="alert">
              {action.error}
              {action.uncertain && (
                <button
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
            <div className="panel" role="status">
              Loading ranked candidates…
            </div>
          )}
          {Boolean(feed.error) && (
            <div className="panel" role="alert">
              {teammateErrorMessage(feed.error)}{" "}
              <button disabled={blocked} onClick={refresh}>
                Refresh feed
              </button>
            </div>
          )}
          {!feed.loading && !feed.error && feed.key && cards.length === 0 && (
            <div className="panel">
              <h2>No eligible candidates</h2>
              <p>
                Try other filters or refresh after members update their
                profiles.
              </p>
            </div>
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
              className="btn-primary teammate-invite"
              disabled={blocked || !!context.blocker}
              onClick={() => setInvite(active)}
            >
              Send Invitation to {active.name}
            </button>
          )}
          {feed.hasMore && (
            <button
              className="btn-secondary"
              disabled={feed.loading || blocked}
              onClick={feed.loadMore}
            >
              {feed.loading ? "Loading…" : "Load more candidates"}
            </button>
          )}
        </section>
        <aside>
          {active ? (
            <RuleMatchPanel
              match={active.matching}
              perspective="teammate"
              variant="sidebar"
              projectName={contextLabel}
              onExplain={() => setExplanation(active)}
              onViewDetails={() => setDetail(active)}
            />
          ) : (
            <section className="panel">
              <h3>Match Inspector</h3>
              <p>
                Select a Project and Position to review a candidate's Position
                Match.
              </p>
            </section>
          )}
        </aside>
      </div>
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
        <Modal
          title="Candidate profile"
          wide
          className="candidate-profile-modal"
          onClose={() => setDetail(null)}
        >
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
                onClick={async () => {
                  if (await action.check()) refresh()
                }}
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
