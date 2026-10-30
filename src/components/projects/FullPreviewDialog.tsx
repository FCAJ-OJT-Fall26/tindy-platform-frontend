import {
  Clock,
  Users,
  Briefcase,
  CheckCircle2,
  Calendar,
  X,
  
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
  capacity?: number
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
  capacity,
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
  const maxCapacity = capacity ?? currentMembers + totalOpenings
  const leaderInitial = (leaderName.trim() || "N")[0].toUpperCase()

  return (
    <div
      className="light-preview-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="light-preview-header-title"
    >
      <div
        className="light-preview-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="light-preview-header">
          <span id="light-preview-header-title" className="light-preview-header-title">
            PROJECT PREVIEW
          </span>
          <button
            type="button"
            className="light-preview-close-btn"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="light-preview-body">
          {/* Hero Section */}
          <div className="light-preview-hero">
            <div className="light-preview-hero-icon-box">
              
            </div>

            <div className="light-preview-hero-info">
              <div className="light-preview-badge-row">
                <span className="light-preview-recruiting-badge">Recruiting</span>
                <span className="light-preview-category-text">
                  {projectType || "AI & Machine Learning"}
                </span>
              </div>

              <h1 className="light-preview-title">
                {projectName.trim() || "Untitled project"}
              </h1>

              <p className="light-preview-tagline">
                {tagline.trim() || "Real questions. Smarter answers."}
              </p>
            </div>
          </div>

          {/* Key Metrics 2x2 Grid */}
          <div className="light-preview-metrics-grid">
            <div className="light-preview-metric-item">
              <div className="light-preview-metric-label">
                <Users size={14} />
                <span>Team members</span>
              </div>
              <div className="light-preview-metric-value">
                {currentMembers} / {maxCapacity}
              </div>
            </div>

            <div className="light-preview-metric-item">
              <div className="light-preview-metric-label">
                <Briefcase size={14} />
                <span>Open positions</span>
              </div>
              <div className="light-preview-metric-value">
                {totalOpenings} {totalOpenings === 1 ? "opening" : "openings"}
              </div>
            </div>

            <div className="light-preview-metric-item">
              <div className="light-preview-metric-label">
                <Clock size={14} />
                <span>Commitment</span>
              </div>
              <div className="light-preview-metric-value">
                {hours || 10} hrs/week
              </div>
            </div>

            <div className="light-preview-metric-item">
              <div className="light-preview-metric-label">
                <Calendar size={14} />
                <span>Duration</span>
              </div>
              <div className="light-preview-metric-value">
                {duration || "3 months"}
              </div>
            </div>
          </div>

          <div className="light-preview-divider" />

          {/* What we're building */}
          <div className="light-preview-section">
            <h2 className="light-preview-section-title">What we&apos;re building</h2>
            <div className="light-preview-description-text">
              {description.trim() ? (
                description.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p>Build an AI-powered customer support platform using RAG and cloud services.</p>
              )}
            </div>
          </div>

          {/* Milestones & deliverables */}
          {goalsList.length > 0 && (
            <div className="light-preview-section">
              <h2 className="light-preview-section-title">Milestones & deliverables</h2>
              <ul className="light-preview-goals-list">
                {goalsList.map((goal, i) => (
                  <li key={i} className="light-preview-goal-item">
                    <CheckCircle2 size={16} className="light-preview-check-icon" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="light-preview-divider" />

          {/* Technology stack */}
          <div className="light-preview-section">
            <div className="light-preview-tech-header">
              <h2 className="light-preview-section-title">Technology stack</h2>
              <span className="light-preview-auto-synced-label">Auto-synced</span>
            </div>

            <div className="light-preview-chips-wrap">
              {allSkills.length > 0 ? (
                allSkills.map((s) => (
                  <span key={s.skill_id} className="light-preview-skill-chip">
                    <SkillIcon name={s.name || s.skill_id} size={14} />
                    <span>{s.name}</span>
                  </span>
                ))
              ) : (
                <>
                  <span className="light-preview-skill-chip">.NET</span>
                  <span className="light-preview-skill-chip">AWS</span>
                  <span className="light-preview-skill-chip">PostgreSQL</span>
                  <span className="light-preview-skill-chip">Docker</span>
                </>
              )}
            </div>
          </div>

          <div className="light-preview-divider" />

          {/* Recruitment positions */}
          <div className="light-preview-section">
            <div className="light-preview-positions-header">
              <h2 className="light-preview-section-title">Recruitment positions</h2>
              <span className="light-preview-roles-count-pill">
                {positionsList.length} {positionsList.length === 1 ? "role" : "roles"} · {totalOpenings} openings
              </span>
            </div>

            <div className="light-preview-positions-list">
              {positionsList.length > 0 ? (
                positionsList.map((pos) => (
                  <div key={pos.id} className="light-preview-pos-card">
                    <div className="light-preview-pos-header">
                      <h3 className="light-preview-pos-title">
                        {pos.title || pos.role}
                      </h3>
                      <span className="light-preview-openings-pill">
                        {pos.count} {pos.count === 1 ? "opening" : "openings"}
                      </span>
                    </div>

                    <div className="light-preview-pos-level">
                      {pos.level || "Intermediate"}
                    </div>

                    {pos.description && (
                      <p className="light-preview-pos-desc">{pos.description}</p>
                    )}

                    {pos.requiredSkills.length > 0 && (
                      <div className="light-preview-pos-skills-group">
                        <div className="light-preview-pos-skills-label">Required skills</div>
                        <div className="light-preview-chips-wrap">
                          {pos.requiredSkills.map((sk) => (
                            <span key={sk.skill_id} className="light-preview-skill-chip">
                              <SkillIcon name={sk.name || sk.skill_id} size={13} />
                              <span>{sk.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {pos.niceSkills.length > 0 && (
                      <div className="light-preview-pos-skills-group">
                        <div className="light-preview-pos-skills-label">Nice to have</div>
                        <div className="light-preview-chips-wrap">
                          {pos.niceSkills.map((sk) => (
                            <span key={sk.skill_id} className="light-preview-skill-chip">
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
                <div className="light-preview-pos-card">
                  <div className="light-preview-pos-header">
                    <h3 className="light-preview-pos-title">Backend Developer</h3>
                    <span className="light-preview-openings-pill">2 openings</span>
                  </div>
                  <div className="light-preview-pos-level">Intermediate</div>
                  <div className="light-preview-pos-skills-group">
                    <div className="light-preview-pos-skills-label">Required skills</div>
                    <div className="light-preview-chips-wrap">
                      <span className="light-preview-skill-chip">.NET</span>
                      <span className="light-preview-skill-chip">AWS</span>
                      <span className="light-preview-skill-chip">PostgreSQL</span>
                    </div>
                  </div>
                  <div className="light-preview-pos-skills-group">
                    <div className="light-preview-pos-skills-label">Nice to have</div>
                    <div className="light-preview-chips-wrap">
                      <span className="light-preview-skill-chip">Docker</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Leader / Creator */}
          <div className="light-preview-leader-section">
            <div className="light-preview-leader-avatar">
              {leaderInitial}
            </div>
            <div className="light-preview-leader-info">
              <div className="light-preview-leader-name">{leaderName || "Nagi"}</div>
              <div className="light-preview-leader-role">Project creator · Peer mentor</div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="light-preview-footer">
          <span className="light-preview-footer-note">
            Preview only · Changes are not saved
          </span>
          <button
            type="button"
            className="light-preview-back-btn"
            onClick={onClose}
          >
            Back to editor
          </button>
        </div>
      </div>
    </div>
  )
}
