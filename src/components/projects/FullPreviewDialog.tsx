import {
  Clock,
  Users,
  Target,
  Briefcase,
  Check,
  Info,
  Calendar,
  Layers,
} from "lucide-react"
import { Modal, Button, Badge, Avatar, Chips } from "../ui"
import type { SelectedSkill } from "../../types/catalog"
import SkillIcon from "../onboarding/SkillIcon"

export interface FullPreviewPosition {
  id: string
  role: string
  title: string
  description: string
  count: number
  level: string
  requiredSkills: SelectedSkill[]
  niceSkills: SelectedSkill[]
}

export interface FullPreviewDialogProps {
  isOpen: boolean
  mode: "create" | "edit"
  projectName: string
  tagline: string
  description: string
  projectType: string
  hours: number
  duration: string
  currentMembers: number
  goalsList: string[]
  positionsList: FullPreviewPosition[]
  allSkills: SelectedSkill[]
  leaderName: string
  projectColor?: string
  onClose: () => void
}

export default function FullPreviewDialog({
  isOpen,
  mode,
  projectName,
  tagline,
  description,
  projectType,
  hours,
  duration,
  currentMembers,
  goalsList,
  positionsList,
  allSkills,
  leaderName,
  projectColor = "indigo",
  onClose,
}: FullPreviewDialogProps) {
  if (!isOpen) return null

  const totalOpenings = positionsList.reduce((acc, p) => acc + (Number(p.count) || 1), 0)
  const maxCapacity = currentMembers + totalOpenings
  const initials = (projectName.trim() || "UP")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  return (
    <Modal title="Project Brief Preview — Teammate's Perspective" onClose={onClose} wide>
      <div className="full-preview-dialog-body">
        {/* Banner */}
        <div className="preview-status-banner">
          <Info size={16} />
          <div>
            <strong>Preview Mode</strong> ·{" "}
            {mode === "create"
              ? "This reflects your live draft. Publish the project when you're ready to open team recruitment."
              : "Review how teammates will see your project. Save changes on the form to apply updates."}
          </div>
        </div>

        {/* Hero Section */}
        <div className="preview-hero-card panel">
          <div className="preview-hero-top">
            <span className={`project-mark ${projectColor}`}>{initials}</span>
            <div className="preview-hero-details">
              <div className="preview-badge-row">
                <Badge tone={mode === "create" ? "neutral" : "success"}>
                  {mode === "create" ? "Not published" : "Recruiting"}
                </Badge>
                <span className="preview-type-tag">{projectType}</span>
              </div>
              <h2>{projectName.trim() || "Untitled Project"}</h2>
              {tagline && <p className="preview-tagline">{tagline}</p>}
            </div>
          </div>

          <div className="preview-quick-metrics">
            <span>
              <Users size={14} />
              <strong>{currentMembers}</strong> / {maxCapacity} team members
            </span>
            <span>
              <Briefcase size={14} />
              <strong>{totalOpenings}</strong> open {totalOpenings === 1 ? "position" : "positions"}
            </span>
            <span>
              <Clock size={14} />
              <strong>{hours}</strong> hrs/week
            </span>
            <span>
              <Calendar size={14} />
              <strong>{duration}</strong>
            </span>
          </div>
        </div>

        {/* What are we building */}
        <div className="preview-section-card panel">
          <h3>What we&rsquo;re building</h3>
          <div className="preview-story-text">
            {description.trim() ? (
              description.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
            ) : (
              <p className="placeholder-text">No project description provided yet.</p>
            )}
          </div>
        </div>

        {/* Milestones / Goals */}
        {goalsList.length > 0 && (
          <div className="preview-section-card panel">
            <h3>Key milestones & deliverables</h3>
            <ul className="preview-goals-list">
              {goalsList.map((goal, i) => (
                <li key={i}>
                  <Check size={14} className="goal-check" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto-synced Tech Stack */}
        <div className="preview-section-card panel">
          <div className="tech-stack-header">
            <h3>Technology stack</h3>
            <span className="auto-synced-pill">Auto-synced</span>
          </div>
          {allSkills.length > 0 ? (
            <div className="preview-stack-chips">
              {allSkills.map((s) => (
                <span key={s.skill_id} className="preview-tech-chip">
                  <SkillIcon name={s.name || s.skill_id || ""} size={14} />
                  <span>{s.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="placeholder-text">
              Add skills to recruitment positions to build your team stack.
            </p>
          )}
        </div>

        {/* Open Positions List */}
        <div className="preview-section-card panel">
          <h3>
            Recruitment positions ({positionsList.length}{" "}
            {positionsList.length === 1 ? "role" : "roles"} · {totalOpenings} openings)
          </h3>
          <div className="preview-positions-list">
            {positionsList.map((pos) => (
              <div key={pos.id} className="preview-position-item panel">
                <div className="pos-item-top">
                  <div className="pos-title-wrap">
                    <h4>{pos.title || pos.role}</h4>
                    <span className="role-archetype-tag">{pos.role}</span>
                  </div>
                  <div className="pos-badges-wrap">
                    <Badge tone="blue">
                      {pos.count} {pos.count === 1 ? "opening" : "openings"}
                    </Badge>
                    <Badge tone="neutral">{pos.level}</Badge>
                  </div>
                </div>

                {pos.description && (
                  <p className="pos-deliverables-text">{pos.description}</p>
                )}

                {/* Skills */}
                <div className="pos-skills-breakdown">
                  {pos.requiredSkills.length > 0 && (
                    <div className="skills-subgroup">
                      <span className="subgroup-label">Required skills:</span>
                      <div className="chip-row">
                        {pos.requiredSkills.map((sk) => (
                          <span key={sk.skill_id} className="pos-skill-pill required">
                            <SkillIcon name={sk.name || sk.skill_id || ""} size={14} />
                            <span>{sk.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {pos.niceSkills.length > 0 && (
                    <div className="skills-subgroup">
                      <span className="subgroup-label">Nice to have:</span>
                      <div className="chip-row">
                        {pos.niceSkills.map((sk) => (
                          <span key={sk.skill_id} className="pos-skill-pill nice">
                            <SkillIcon name={sk.name || sk.skill_id || ""} size={14} />
                            <span>{sk.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Leader info */}
        <div className="preview-leader-card panel">
          <Avatar name={leaderName || "Leader"} color={projectColor} />
          <div>
            <strong>{leaderName || "Project Leader"}</strong>
            <small>Project creator · Peer mentor</small>
          </div>
        </div>

        {/* Footer */}
        <div className="preview-dialog-footer">
          <Button variant="secondary" onClick={onClose}>
            Back to editor
          </Button>
        </div>
      </div>
    </Modal>
  )
}
