import {
  Clock,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  X,
  Sparkles,
} from "lucide-react"
import type { SelectedSkill } from "../../types/catalog"
import SkillIcon from "../onboarding/SkillIcon"

export interface FullPreviewPosition {
  id: string
  role: string
  title: string
  description?: string
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
  onClose,
}: FullPreviewDialogProps) {
  if (!isOpen) return null

  const totalOpenings = positionsList.reduce(
    (acc, p) => acc + (Number(p.count) || 1),
    0,
  )
  const maxCapacity = currentMembers + totalOpenings
  const leaderInitial = (leaderName.trim() || "N")[0].toUpperCase()

  return (
    <div
      className="dark-preview-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dark-preview-header-title"
    >
      <div
        className="dark-preview-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="dark-preview-header">
          <span id="dark-preview-header-title" className="dark-preview-header-title">
            PROJECT PREVIEW
          </span>
          <button
            type="button"
            className="dark-preview-close-btn"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="dark-preview-body">
          {/* Hero Section */}
          <div className="dark-preview-hero">
            <div className="dark-preview-hero-icon-box">
              <Sparkles size={24} className="dark-preview-sparkle-icon" />
            </div>

            <div className="dark-preview-hero-info">
              <div className="dark-preview-badge-row">
                <span className="dark-preview-recruiting-badge">Recruiting</span>
                <span className="dark-preview-category-text">
                  {projectType || "AI & Machine Learning"}
                </span>
              </div>

              <h1 className="dark-preview-title">
                {projectName.trim() || "AI Customer Support System"}
              </h1>

              <p className="dark-preview-tagline">
                {tagline.trim() || "Real questions. Smarter answers."}
              </p>
            </div>
          </div>

          {/* Key Metrics 2x2 Grid */}
          <div className="dark-preview-metrics-grid">
            <div className="dark-preview-metric-item">
              <div className="dark-preview-metric-label">
                <Users size={14} />
                <span>Team members</span>
              </div>
              <div className="dark-preview-metric-value">
                {currentMembers} / {maxCapacity}
              </div>
            </div>

            <div className="dark-preview-metric-item">
              <div className="dark-preview-metric-label">
                <Briefcase size={14} />
                <span>Open positions</span>
              </div>
              <div className="dark-preview-metric-value">
                {totalOpenings} {totalOpenings === 1 ? "opening" : "openings"}
              </div>
            </div>

            <div className="dark-preview-metric-item">
              <div className="dark-preview-metric-label">
                <Clock size={14} />
                <span>Commitment</span>
              </div>
              <div className="dark-preview-metric-value">
                {hours || 10} hrs/week
              </div>
            </div>

            <div className="dark-preview-metric-item">
              <div className="dark-preview-metric-label">
                <Calendar size={14} />
                <span>Duration</span>
              </div>
              <div className="dark-preview-metric-value">
                {duration || "3 months"}
              </div>
            </div>
          </div>

          <div className="dark-preview-divider" />

          {/* What we're building */}
          <div className="dark-preview-section">
            <h2 className="dark-preview-section-title">What we&apos;re building</h2>
            <div className="dark-preview-description-text">
              {description.trim() ? (
                description.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p>Build an AI-powered customer support platform using RAG and cloud services.</p>
              )}
            </div>
          </div>

          {/* Milestones & deliverables */}
          {goalsList.length > 0 && (
            <div className="dark-preview-section">
              <h2 className="dark-preview-section-title">Milestones & deliverables</h2>
              <ul className="dark-preview-goals-list">
                {goalsList.map((goal, i) => (
                  <li key={i} className="dark-preview-goal-item">
                    <CheckCircle2 size={16} className="dark-preview-check-icon" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="dark-preview-divider" />

          {/* Technology stack */}
          <div className="dark-preview-section">
            <div className="dark-preview-tech-header">
              <h2 className="dark-preview-section-title">Technology stack</h2>
              <span className="dark-preview-auto-synced-label">Auto-synced</span>
            </div>

            <div className="dark-preview-chips-wrap">
              {allSkills.length > 0 ? (
                allSkills.map((s) => (
                  <span key={s.skill_id} className="dark-preview-skill-chip">
                    <SkillIcon name={s.name || s.skill_id} size={14} />
                    <span>{s.name}</span>
                  </span>
                ))
              ) : (
                <>
                  <span className="dark-preview-skill-chip">.NET</span>
                  <span className="dark-preview-skill-chip">AWS</span>
                  <span className="dark-preview-skill-chip">PostgreSQL</span>
                  <span className="dark-preview-skill-chip">Docker</span>
                </>
              )}
            </div>
          </div>

          <div className="dark-preview-divider" />

          {/* Recruitment positions */}
          <div className="dark-preview-section">
            <div className="dark-preview-positions-header">
              <h2 className="dark-preview-section-title">Recruitment positions</h2>
              <span className="dark-preview-roles-count-pill">
                {positionsList.length} {positionsList.length === 1 ? "role" : "roles"} · {totalOpenings} openings
              </span>
            </div>

            <div className="dark-preview-positions-list">
              {positionsList.length > 0 ? (
                positionsList.map((pos) => (
                  <div key={pos.id} className="dark-preview-pos-card">
                    <div className="dark-preview-pos-header">
                      <h3 className="dark-preview-pos-title">
                        {pos.title || pos.role}
                      </h3>
                      <span className="dark-preview-openings-pill">
                        {pos.count} {pos.count === 1 ? "opening" : "openings"}
                      </span>
                    </div>

                    <div className="dark-preview-pos-level">
                      {pos.level || "Intermediate"}
                    </div>

                    {pos.description && (
                      <p className="dark-preview-pos-desc">{pos.description}</p>
                    )}

                    {pos.requiredSkills.length > 0 && (
                      <div className="dark-preview-pos-skills-group">
                        <div className="dark-preview-pos-skills-label">Required skills</div>
                        <div className="dark-preview-chips-wrap">
                          {pos.requiredSkills.map((sk) => (
                            <span key={sk.skill_id} className="dark-preview-skill-chip">
                              <SkillIcon name={sk.name || sk.skill_id} size={13} />
                              <span>{sk.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {pos.niceSkills.length > 0 && (
                      <div className="dark-preview-pos-skills-group">
                        <div className="dark-preview-pos-skills-label">Nice to have</div>
                        <div className="dark-preview-chips-wrap">
                          {pos.niceSkills.map((sk) => (
                            <span key={sk.skill_id} className="dark-preview-skill-chip">
                              <SkillIcon name={sk.name || sk.skill_id} size={13} />
                              <span>{sk.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="dark-preview-pos-card">
                  <div className="dark-preview-pos-header">
                    <h3 className="dark-preview-pos-title">Backend Developer</h3>
                    <span className="dark-preview-openings-pill">2 openings</span>
                  </div>
                  <div className="dark-preview-pos-level">Intermediate</div>
                  <div className="dark-preview-pos-skills-group">
                    <div className="dark-preview-pos-skills-label">Required skills</div>
                    <div className="dark-preview-chips-wrap">
                      <span className="dark-preview-skill-chip">.NET</span>
                      <span className="dark-preview-skill-chip">AWS</span>
                      <span className="dark-preview-skill-chip">PostgreSQL</span>
                    </div>
                  </div>
                  <div className="dark-preview-pos-skills-group">
                    <div className="dark-preview-pos-skills-label">Nice to have</div>
                    <div className="dark-preview-chips-wrap">
                      <span className="dark-preview-skill-chip">Docker</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Leader / Creator */}
          <div className="dark-preview-leader-section">
            <div className="dark-preview-leader-avatar">
              {leaderInitial}
            </div>
            <div className="dark-preview-leader-info">
              <div className="dark-preview-leader-name">{leaderName || "Nagi"}</div>
              <div className="dark-preview-leader-role">Project creator · Peer mentor</div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="dark-preview-footer">
          <span className="dark-preview-footer-note">
            Preview only · Changes are not saved
          </span>
          <button
            type="button"
            className="dark-preview-back-btn"
            onClick={onClose}
          >
            Back to editor
          </button>
        </div>
      </div>
    </div>
  )
}
