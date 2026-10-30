import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router"
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  Info,
  Sparkles,
  Users,
  X,
  TriangleAlert,
} from "lucide-react"
import { factors, score, type Profile, type Project } from "../data"
import { useTindy } from "../store"
import { getMatchTier } from "../utils/matchTier"
import SkillIcon from "./onboarding/SkillIcon"
import ProjectSaveButton, { BookmarkBurst } from "./common/ProjectSaveButton"
import {
  SkipActionButton,
  StarActionButton,
  InterestedActionButton,
} from "./common/DiscoveryActionButtons"

export {
  SkillIcon,
  ProjectSaveButton,
  BookmarkBurst,
  SkipActionButton,
  StarActionButton,
  InterestedActionButton,
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
  children: ReactNode
}) {
  return (
    <button {...props} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  )
}
export function Avatar({
  name,
  color = "indigo",
  size = "",
}: {
  name: string
  color?: string
  size?: string
}) {
  return (
    <span className={`avatar ${color} ${size}`}>
      {name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")}
    </span>
  )
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode
  tone?: string
}) {
  return <span className={`badge ${tone}`}>{children}</span>
}
export function Chips({
  items,
  showIcon = true,
}: {
  items: string[]
  showIcon?: boolean
}) {
  const validItems = (items || []).filter(
    (item) => typeof item === "string" && item.trim().length > 0,
  )
  return (
    <div className="chips">
      {validItems.map((item) => (
        <span key={item}>
          {showIcon && <SkillIcon name={item} size={13} />}
          <span>{item}</span>
        </span>
      ))}
    </div>
  )
}
export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string
  description: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  detail,
  icon,
  tone = "indigo",
}: {
  label: string
  value: ReactNode
  detail: string
  icon: ReactNode
  tone?: string
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <small>{detail}</small>
    </article>
  )
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <Code2 size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
function describePieSlice(cx: number, cy: number, r: number, pct: number): string {
  const clampedPct = Math.max(0, Math.min(100, pct))
  if (clampedPct <= 0) return ""
  if (clampedPct >= 99.99) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
      "Z",
    ].join(" ")
  }
  const angle = (clampedPct / 100) * 2 * Math.PI - Math.PI / 2
  const x = cx + r * Math.cos(angle)
  const y = cy + r * Math.sin(angle)
  const largeArc = clampedPct > 50 ? 1 : 0
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`
}

export function Score({
  project,
  value: explicitValue,
  compact = false,
  subtitle,
}: {
  project?: Project
  value?: number
  compact?: boolean
  subtitle?: string
}) {
  const value =
    explicitValue !== undefined ? explicitValue : project ? score(project) : 0
  const clamped = Math.max(0, Math.min(100, value))
  const size = compact ? 28 : 44
  const center = size / 2
  const outerRadius = compact ? 12 : 19.5
  const pieRadius = compact ? 9.2 : 15.2

  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setAnimatedPct(clamped)
      return
    }

    setAnimatedPct(0)

    let countRaf = 0
    const duration = 950
    let startTime: number | null = null

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 2.4)
      setAnimatedPct(eased * clamped)
      if (progress < 1) {
        countRaf = requestAnimationFrame(step)
      } else {
        setAnimatedPct(clamped)
      }
    }
    countRaf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(countRaf)
    }
  }, [clamped])

  const displayValue = Math.round(animatedPct)
  const activeTier = getMatchTier(displayValue)
  const finalTier = getMatchTier(value)
  const pieColor =
    activeTier.tier === "low"
      ? "#e11d48"
      : activeTier.tier === "medium"
        ? "#ea580c"
        : "#10b981"
  const piePath = describePieSlice(center, center, pieRadius, animatedPct)

  if (project?.matchAvailable === false && explicitValue === undefined)
    return <span className="subtle-caption">Match score unavailable</span>

  return (
    <div className={`match-score match-tier-${activeTier.tier} ${compact ? "compact" : ""}`}>
      <div
        className="match-pie-chart"
        style={{ width: size, height: size }}
        title={`${value}% — ${finalTier.label}`}
        aria-hidden="true"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="match-pie-svg">
          {/* Outer dark-rimmed white circle */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="#ffffff"
            stroke="#334155"
            strokeWidth={compact ? 1.8 : 2.2}
          />
          {/* Dynamic solid pie slice with white gap inside outer ring */}
          {piePath && (
            <path
              d={piePath}
              fill={pieColor}
              className="match-pie-slice"
            />
          )}
        </svg>
      </div>
      <div className="score-number" style={{ fontVariantNumeric: "tabular-nums" }}>
        {displayValue}
        <span>%</span>
      </div>
      <div>
        <strong
          style={
            !compact
              ? {
                color:
                  finalTier.tier === "low"
                    ? "#be123c"
                    : finalTier.tier === "medium"
                      ? "#c2410c"
                      : "#047857",
              }
              : undefined
          }
        >
          {compact
            ? "Match"
            : finalTier.tier === "low"
              ? "Warning: Low match"
              : finalTier.tier === "medium"
                ? "Moderate match"
                : value >= 85
                  ? "Excellent match"
                  : "Strong match"}
        </strong>
        {!compact && <small>{subtitle || "Based on 5 matching factors"}</small>}
      </div>
      {!compact && (
        <div className="score-meter">
          <span style={{ width: `${animatedPct}%`, background: pieColor }} />
        </div>
      )}
    </div>
  )
}
export function CardStatusFooter({ status }: { status: string }) {
  const parts = status.split(" · ")
  const title = parts[0]
  const subtitle = parts.length > 1 ? parts.slice(1).join(" · ") : undefined
  const lower = status.toLowerCase()
  const isPending =
    lower.includes("waiting") ||
    lower.includes("pending") ||
    lower.includes("interest sent") ||
    lower.includes("applicant")

  return (
    <div className={`card-status ${isPending ? "is-pending" : "is-confirmed"}`}>
      <span className="card-status-icon" aria-hidden="true">
        {isPending ? <Clock size={15} /> : <Check size={15} />}
      </span>
      <div className="card-status-body">
        <strong className="card-status-title">{title}</strong>
        {subtitle && <span className="card-status-subtitle">{subtitle}</span>}
      </div>
    </div>
  )
}
export function ProjectCard({
  project,
  saved,
  onSave,
  onExplain,
  status,
}: {
  project: Project
  saved: boolean
  onSave: () => void
  onExplain: () => void
  status?: string
}) {
  const projectTier = getMatchTier(score(project))
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className={`project-mark ${project.color}`}>
          {project.initials}
        </span>
        <div className="card-category">
          {project.type}
          <span className="recruiting">
            <i />
            Recruiting
          </span>
        </div>
        <ProjectSaveButton
          saved={saved}
          onToggle={onSave}
          variant="icon"
          size={19}
          projectName={project.name}
        />
      </div>
      <Link className="project-title" to={`/project/${project.id}`}>
        {project.name}
      </Link>
      <p className="project-description">{project.description}</p>
      <Chips items={project.skills} />
      <div className="project-attributes">
        <span>
          <Code2 size={14} />
          {project.role}
        </span>
        <span>
          <Clock size={14} />
          {project.hours === 10 ? "8–10" : project.hours} hrs/week <b>·</b>{" "}
          {project.duration}
        </span>
      </div>
      <div className={`match-strip match-tier-${projectTier.tier}`}>
        <Score project={project} compact />
        <button onClick={onExplain}>
          Why this matches you <ChevronRight size={13} />
        </button>
      </div>
      <div className="project-card-bottom">
        <div className="team-preview">
          <div className="avatar-stack">
            <Avatar name={project.leader} color={project.color} />
          </div>
          <small>
            {project.team}/{project.capacity} members
          </small>
        </div>
        <Link className="view-project" to={`/project/${project.id}`}>
          View project <ArrowRight size={14} />
        </Link>
      </div>
      {status && <CardStatusFooter status={status} />}
    </article>
  )
}
function FactorBreakdownRow({
  name,
  targetScore,
  weight,
  projectId,
}: {
  name: string
  targetScore: number
  weight: number
  projectId: string
}) {
  const clamped = Math.max(0, Math.min(100, targetScore))
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setAnimatedPct(clamped)
      return
    }

    setAnimatedPct(0)
    let rafId = 0
    const duration = 950
    let startTime: number | null = null

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 2.4)
      setAnimatedPct(eased * clamped)
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        setAnimatedPct(clamped)
      }
    }
    rafId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [clamped, projectId])

  const displayScore = Math.round(animatedPct)

  return (
    <div className="factor">
      <div>
        <span>{name}</span>
        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
          {displayScore}% fit <small>· {weight}% weight</small>
        </strong>
      </div>
      <div className="progress">
        <span style={{ width: `${animatedPct}%`, transition: "none" }} />
      </div>
      <small style={{ fontVariantNumeric: "tabular-nums" }}>
        {((animatedPct * weight) / 100).toFixed(1)} / {weight} points
      </small>
    </div>
  )
}

export function MatchExplanation({
  project,
  full = false,
  onLearn,
  evidence,
}: {
  project: Project
  full?: boolean
  onLearn?: () => void
  evidence?: Pick<Profile, "skills" | "role" | "hours" | "experience">
}) {
  const { profile } = useTindy()
  const source = evidence || profile
  const hasSkill = (skill: string) =>
    source.skills.some((value) => value.toLowerCase() === skill.toLowerCase())
  const matchingSkills = project.skills.filter(hasSkill)
  const missingSkills = [
    ...new Set([...project.skills, ...project.gap]),
  ].filter((skill) => !hasSkill(skill))
  return (
    <div className="match-explanation">
      <h2>Why this project matches you</h2>
      <p className="muted">
        A clear look at your strengths, experience, and room to grow.
      </p>
      <Score project={project} />
      <div className="match-evidence">
        <h3>
          <Check size={17} />
          Strong matches
        </h3>
        <ul>
          {matchingSkills.map((skill) => (
            <li key={skill}>
              <Check size={14} />
              {skill} is listed in the profile’s technical skills
            </li>
          ))}
          {source.role === project.role && (
            <li>
              <Check size={14} />
              {project.role} is the preferred role
            </li>
          )}
        </ul>
        {!matchingSkills.length && (
          <p>
            No exact skill overlaps yet. Review the project requirements and
            discuss transferable experience with the leader.
          </p>
        )}
        <h3>
          <Code2 size={17} />
          Relevant experience
        </h3>
        <p>
          {source.experience ||
            "Add project experience to support more meaningful recommendations."}
        </p>
        <h3>
          <Clock size={17} />
          Availability
        </h3>
        <p>
          Project requires {project.hours} hrs/week. The profile lists{" "}
          {source.hours} hrs/week.
          {Number(source.hours) >= project.hours
            ? " This commitment fits."
            : " Discuss a sustainable schedule with the leader."}
        </p>
        <h3 className="gap-heading">
          <TriangleAlert size={17} />
          An opportunity to grow
        </h3>
        <Chips items={missingSkills} />
        <p>
          {missingSkills.length
            ? "These skills aren’t listed in the profile yet. That doesn’t mean you can’t contribute."
            : "All listed project skills are represented in the profile. Keep building on that foundation."}
        </p>
        <button className="text-link" onClick={onLearn}>
          View learning suggestions <ArrowRight size={13} />
        </button>
      </div>
      {full && (
        <section className="score-breakdown">
          <h3>How your score is calculated</h3>
          <p>Factor fit × weight = contribution to the final score.</p>
          {factors.map((factor, index) => (
            <FactorBreakdownRow
              key={factor.name}
              name={factor.name}
              targetScore={project.factors[index]}
              weight={factor.weight}
              projectId={project.id}
            />
          ))}
        </section>
      )}
      <div className="trust-note">
        <Info size={15} />
        <span>
          Prototype data. Scores are calculated from weighted factors, not
          generated by an LLM. Production matching will use verified profile
          evidence and semantic similarity.
        </span>
      </div>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
  dismissible = true,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  drawer?: boolean
  dismissible?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const canDismiss = useRef(dismissible)
  const closeAction = useRef(onClose)
  const closeTimer = useRef<number | undefined>(undefined)
  canDismiss.current = dismissible
  closeAction.current = onClose

  const handleClose = useCallback(() => {
    if (closingRef.current || !canDismiss.current) return
    closingRef.current = true
    setClosing(true)
    closeTimer.current = window.setTimeout(() => {
      closeAction.current()
    }, 220)
  }, [])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    container.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose()
      if (event.key === "Tab") {
        const focusable = container.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", handler)
    return () => {
      window.clearTimeout(closeTimer.current)
      document.body.style.overflow = overflow
      document.removeEventListener("keydown", handler)
      previous?.focus()
    }
  }, [handleClose])

  return createPortal(
    <div
      className={`overlay ${drawer ? "drawer-overlay" : ""} ${closing ? "closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div
        ref={container}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`${drawer ? "drawer" : "modal"} ${wide ? "wide" : ""} ${closing ? "closing" : ""}`}
      >
        <div className="modal-heading">
          <span>{title}</span>
          <button
            className="icon-button"
            aria-label="Close dialog"
            disabled={!dismissible}
            onClick={handleClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
export function Skeleton() {
  return (
    <div className="skeleton-card" aria-label="Loading projects">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Tindy home">
      <img
        src="/logo.png"
        alt="Tindy logo"
        className="brand-logo"
      />
      <span>
        tindy<span className="brand-period">.</span>
      </span>
    </Link>
  )
}
