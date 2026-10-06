import { useEffect, useRef, useState, type ReactNode } from "react"
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
export function Chips({ items }: { items: string[] }) {
  return (
    <div className="chips">
      {items.map((item) => (
        <span key={item}>{item}</span>
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
export function Score({
  project,
  compact = false,
}: {
  project: Project
  compact?: boolean
}) {
  const value = score(project)
  return (
    <div className={`match-score ${compact ? "compact" : ""}`}>
      <div className="score-number">
        {value}
        <span>%</span>
      </div>
      <div>
        <strong>
          {compact
            ? "Match"
            : value >= 85
              ? "Excellent match"
              : value >= 75
                ? "Strong match"
                : "Potential match"}
        </strong>
        {!compact && <small>Based on 5 matching factors</small>}
      </div>
      {!compact && (
        <div className="score-meter">
          <span style={{ width: `${value}%` }} />
        </div>
      )}
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
        <button
          className={`icon-button ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-label={saved ? "Unsave project" : "Save project"}
          title={saved ? "Unsave project" : "Save project"}
        >
          <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
        </button>
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
      <div className="match-strip">
        <Score project={project} compact />
        <button onClick={onExplain}>
          Why this matches you <ChevronRight size={13} />
        </button>
      </div>
      <div className="project-card-bottom">
        <div className="team-preview">
          <div className="avatar-stack">
            <Avatar name={project.leader} color={project.color} />
            <Avatar name="An Hoang" color="neutral" />
            <Avatar name="Linh Tran" color="green" />
          </div>
          <small>
            {project.team}/{project.capacity} members
          </small>
        </div>
        <Link className="view-project" to={`/project/${project.id}`}>
          View project <ArrowRight size={14} />
        </Link>
      </div>
      {status && (
        <div className="card-status">
          <Check size={13} />
          {status}
        </div>
      )}
    </article>
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
      <div className="insight-label">
        <Sparkles size={15} /> AI MATCH ANALYSIS
      </div>
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
            <div className="factor" key={factor.name}>
              <div>
                <span>{factor.name}</span>
                <strong>
                  {project.factors[index]}% fit{" "}
                  <small>· {factor.weight}% weight</small>
                </strong>
              </div>
              <div className="progress">
                <span style={{ width: `${project.factors[index]}%` }} />
              </div>
              <small>
                {((project.factors[index] * factor.weight) / 100).toFixed(1)} /{" "}
                {factor.weight} points
              </small>
            </div>
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
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  drawer?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      onClose()
    }, 220)
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    container.current?.focus()
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose()
      if (event.key === "Tab") {
        const focusable = container.current?.querySelectorAll<HTMLElement>(
          'button, a, input, select, textarea, [tabindex="0"]',
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
      document.body.style.overflow = overflow
      document.removeEventListener("keydown", handler)
      previous?.focus()
    }
  }, [handleClose])

  return (
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
            onClick={handleClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
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
