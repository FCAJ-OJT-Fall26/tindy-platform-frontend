import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router"
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  FileText,
  Check,
  Info,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import { PageHeader, Button } from "../../components/ui"
import { getStoredToken } from "../../services/apiClient"
import { getProfessionalRolesApi, getSkillsApi } from "../../services/catalog.service"
import {
  createProjectApi,
  toApiDifficulty,
  updateProjectApi,
} from "../../services/projects.service"
import type { CatalogSkill, ProfessionalRole, SelectedSkill } from "../../types/catalog"
import SkillSelector from "../../components/onboarding/SkillSelector"
import SkillIcon from "../../components/onboarding/SkillIcon"

export function CreateProject() {
  const { id } = useParams()
  const { projects, setProjects, profile, notify } = useTindy()
  const existing = projects.find((project) => project.id === id)
  const navigate = useNavigate()
  const [jd, setJd] = useState(existing?.description || "")
  const [name, setName] = useState(existing?.name || "")
  const [tagline, setTagline] = useState(existing?.tagline || "")
  const [goals, setGoals] = useState(existing?.goals.join("\n") || "")
  const [role, setRole] = useState(existing?.role || "Backend Developer")
  const [hours, setHours] = useState(existing?.hours || 10)
  const [duration, setDuration] = useState(existing?.duration || "3 months")
  const [type, setType] = useState(existing?.type || "AI & Machine Learning")
  const [members, setMembers] = useState(existing?.team || 1)
  const [positions, setPositions] = useState(
    existing ? existing.capacity - existing.team : 2,
  )
  const [level, setLevel] = useState(existing?.difficulty || "Intermediate")
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [catalogRoles, setCatalogRoles] = useState<ProfessionalRole[]>([])
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([])

  const [selectedRequired, setSelectedRequired] = useState<SelectedSkill[]>([])
  const [selectedNice, setSelectedNice] = useState<SelectedSkill[]>([])
  const [skillMode, setSkillMode] = useState<"required" | "nice">("required")
  const initializedSkillsRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getProfessionalRolesApi(undefined, controller.signal)
      .then(setCatalogRoles)
      .catch(() => {})
    getSkillsApi(undefined, undefined, controller.signal)
      .then(setCatalogSkills)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (catalogSkills.length === 0 || initializedSkillsRef.current) return
    initializedSkillsRef.current = true

    const findSkill = (skillName: string): SelectedSkill => {
      const found = catalogSkills.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase(),
      )
      return {
        skill_id:
          found?.skill_id ||
          `skill_${skillName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: found?.name || skillName,
      }
    }

    if (existing) {
      const reqNames =
        existing.requiredSkills || existing.skills.slice(0, 3) || []
      const niceNames = existing.gap || []
      setSelectedRequired(reqNames.map(findSkill))
      setSelectedNice(niceNames.map(findSkill))
    } else {
      const defaultReq = [".NET", "PostgreSQL", "C#"]
      const defaultNice = ["Docker", "AWS"]
      const reqMatches: SelectedSkill[] = catalogSkills
        .filter((s) =>
          defaultReq.some((d) => d.toLowerCase() === s.name.toLowerCase()),
        )
        .map((s) => ({
          skill_id: s.skill_id,
          name: s.name,
        }))
      const niceMatches: SelectedSkill[] = catalogSkills
        .filter((s) =>
          defaultNice.some((d) => d.toLowerCase() === s.name.toLowerCase()),
        )
        .map((s) => ({
          skill_id: s.skill_id,
          name: s.name,
        }))
      if (reqMatches.length > 0) setSelectedRequired(reqMatches)
      if (niceMatches.length > 0) setSelectedNice(niceMatches)
    }
  }, [catalogSkills, existing])

  const handleRequiredChange = (newSkills: SelectedSkill[]) => {
    setSelectedRequired(newSkills)
    const newIds = new Set(newSkills.map((s) => s.skill_id))
    setSelectedNice((prev) => prev.filter((s) => !newIds.has(s.skill_id)))
  }

  const handleNiceChange = (newSkills: SelectedSkill[]) => {
    setSelectedNice(newSkills)
    const newIds = new Set(newSkills.map((s) => s.skill_id))
    setSelectedRequired((prev) => prev.filter((s) => !newIds.has(s.skill_id)))
  }

  const moveToNice = (skill: SelectedSkill) => {
    setSelectedRequired((prev) =>
      prev.filter((s) => s.skill_id !== skill.skill_id),
    )
    setSelectedNice((prev) => [
      ...prev.filter((s) => s.skill_id !== skill.skill_id),
      skill,
    ])
  }

  const moveToRequired = (skill: SelectedSkill) => {
    setSelectedNice((prev) =>
      prev.filter((s) => s.skill_id !== skill.skill_id),
    )
    setSelectedRequired((prev) => [
      ...prev.filter((s) => s.skill_id !== skill.skill_id),
      skill,
    ])
  }

  const removeRequired = (skillId: string) => {
    setSelectedRequired((prev) => prev.filter((s) => s.skill_id !== skillId))
  }

  const removeNice = (skillId: string) => {
    setSelectedNice((prev) => prev.filter((s) => s.skill_id !== skillId))
  }

  const allSelectedSkills = useMemo(() => {
    const list = [...selectedRequired, ...selectedNice]
    const seen = new Set<string>()
    return list.filter((s) => {
      if (seen.has(s.skill_id)) return false
      seen.add(s.skill_id)
      return true
    })
  }, [selectedRequired, selectedNice])

  return (
    <>
      <Link className="back-link" to="/leader">
        <ArrowLeft size={14} />
        Leader workspace
      </Link>
      <PageHeader
        title={
          existing ? "Manage your project" : "Bring your next idea to life."
        }
        description="A clear project brief helps the right people find you."
      />
      <div className="create-layout">
        <form
          className="panel project-form"
          onSubmit={async (event) => {
            event.preventDefault()
            if (submitting) return

            if (selectedRequired.length === 0) {
              notify("Please select at least 1 required skill from the catalog")
              return
            }

            setSubmitting(true)

            const requiredList: string[] = selectedRequired.map(
              (s) => s.name || s.skill_id,
            )
            const niceList: string[] = selectedNice.map(
              (s) => s.name || s.skill_id,
            )
            const goalList = goals.split("\n").filter(Boolean)
            const stackList: string[] = allSelectedSkills.map(
              (s) => s.name || s.skill_id,
            )

            let finalProjectId = existing?.id || `project-${Date.now()}`

            if (getStoredToken()) {
              try {
                const matchedRole = catalogRoles.find(
                  (r) => r.name.toLowerCase() === role.toLowerCase(),
                )

                if (existing) {
                  await updateProjectApi(existing.id, {
                    name,
                    tagline: tagline.trim() || undefined,
                    description: jd,
                    category: type,
                    difficulty_level: toApiDifficulty(level),
                    expected_commitment_hours: hours,
                    duration,
                    max_team_capacity: members + positions,
                    color_theme: existing.color || "indigo",
                    goals: goalList,
                  })
                } else {
                  const created = await createProjectApi({
                    name,
                    tagline: tagline.trim() || undefined,
                    description: jd,
                    category: type,
                    difficulty_level: toApiDifficulty(level),
                    expected_commitment_hours: hours,
                    duration,
                    initial_team_size: members,
                    max_team_capacity: members + positions,
                    color_theme: "indigo",
                    recruitment_closing_days: 14,
                    goals: goalList,
                    positions: [
                      {
                        role_id:
                          matchedRole?.professional_role_id ||
                          `role_${role.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
                        title: role,
                        required_count: positions,
                        experience_level: toApiDifficulty(level),
                        skills: [
                          ...selectedRequired.map((s) => ({
                            skill_id: s.skill_id,
                            is_required: true,
                          })),
                          ...selectedNice.map((s) => ({
                            skill_id: s.skill_id,
                            is_required: false,
                          })),
                        ],
                      },
                    ],
                  })
                  if (created?.project_id) {
                    finalProjectId = created.project_id
                  }
                }
              } catch {
                // Keep local state working when backend is offline in prototype mode
              }
            }

            const project: Project = {
              id: finalProjectId,
              name,
              tagline: tagline.trim() || undefined,
              description: jd,
              type,
              skills: stackList,
              role,
              hours,
              duration,
              difficulty: level,
              team: members,
              capacity: members + positions,
              leader: profile.name,
              initials: name
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
                .toUpperCase(),
              color: "indigo",
              created: Date.now(),
              closing: 14,
              factors: existing?.factors || [80, 85, 100, 75, 100],
              goals: goalList,
              requiredSkills: requiredList,
              gap: niceList,
            }
            setProjects((old) =>
              existing
                ? old.map((item) => (item.id === existing.id ? project : item))
                : [...old, project],
            )
            setSubmitting(false)
            notify(
              existing
                ? "Project updated"
                : "Project published · Recruitment is open",
            )
            navigate("/leader")
          }}
        >
          <div className="form-section-heading">
            <span>01</span>
            <div>
              <h2>The big picture</h2>
              <p>Tell your future teammates what you’re building.</p>
            </div>
          </div>
          <label className="field">
            Project name
            <input
              required
              placeholder="e.g. AI Customer Support System"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            Project tagline <small>Short summary shown on cards</small>
            <input
              placeholder="e.g. Empowering student mental health with AI"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
            />
          </label>
          <label className="field">
            Project description
            <textarea
              required
              rows={5}
              placeholder="What are you building, and why does it matter?"
              value={jd}
              onChange={(event) => {
                setJd(event.target.value)
                setConfirmed(false)
              }}
            />
          </label>
          <div className="ai-assist-row">
            <span>
              <Sparkles size={15} />A starting point, not the final word.
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={!name.trim()}
              onClick={() => {
                const stackText = allSelectedSkills
                  .map((s) => s.name)
                  .join(", ")
                setJd(
                  `${name} is a collaborative FCAJ project focused on ${type.toLowerCase()}. Our goal is to build a practical, user-centered solution using ${stackText || "a modern technology stack"}. We’re looking for a ${role} to help design, develop, and deploy the product. You’ll work alongside a supportive student team and contribute ${hours} hours per week over ${duration}.`,
                )
                setConfirmed(false)
                notify("Demo JD generated · Please review before publishing")
              }}
            >
              <Sparkles size={14} />
              Generate JD with AI
            </Button>
          </div>
          <label className="field">
            Project goals <small>One objective per line</small>
            <textarea
              required
              rows={3}
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="What will your team achieve?"
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Project type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {[
                  "AI & Machine Learning",
                  "Cloud & DevOps",
                  "Web Application",
                  "Open Source",
                  "Social Impact",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>
                Technology stack{" "}
                <small>(Auto-synced from skills selected below)</small>
              </span>
              <div className="tech-stack-readonly-display">
                {allSelectedSkills.length > 0 ? (
                  <div className="tech-stack-chips">
                    {allSelectedSkills.map((skill) => (
                      <span key={skill.skill_id} className="tech-stack-pill">
                        <SkillIcon name={skill.name || ""} size={13} />
                        {skill.name || "Skill"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: "12px" }}>
                    Select skills in Section 02 below to populate the project stack.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="form-section-heading">
            <span>02</span>
            <div>
              <h2>The people & the fit</h2>
              <p>Define the roles, not just the tools.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              Current team members
              <input
                type="number"
                min="1"
                max="20"
                required
                value={members}
                onChange={(event) => setMembers(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Available positions
              <input
                type="number"
                min="1"
                max="20"
                required
                value={positions}
                onChange={(event) => setPositions(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Required role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {[
                  "Backend Developer",
                  "Frontend Developer",
                  "Full-stack Developer",
                  "AI Engineer",
                  "Cloud Engineer",
                  "UI/UX Designer",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Experience level
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option>Beginner-friendly</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
          </div>

          <div className="project-skills-manager">
            <div className="skill-category-tabs-header">
              <div>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    margin: "0 0 4px",
                  }}
                >
                  Technical skills catalog
                </h3>
                <p className="muted" style={{ fontSize: "11px", margin: 0 }}>
                  Choose directly from the verified catalog. Plain text entry is disabled.
                </p>
              </div>
              <div className="skill-mode-toggle">
                <button
                  type="button"
                  className={`skill-mode-btn ${
                    skillMode === "required" ? "active required-active" : ""
                  }`}
                  onClick={() => setSkillMode("required")}
                >
                  <span className="mode-indicator required-dot" />
                  Required skills
                  <span className="mode-count">{selectedRequired.length}</span>
                </button>
                <button
                  type="button"
                  className={`skill-mode-btn ${
                    skillMode === "nice" ? "active nice-active" : ""
                  }`}
                  onClick={() => setSkillMode("nice")}
                >
                  <span className="mode-indicator nice-dot" />
                  Nice-to-have skills
                  <span className="mode-count">{selectedNice.length}</span>
                </button>
              </div>
            </div>

            <div className="skill-selector-wrapper">
              <SkillSelector
                key={skillMode}
                selected={
                  skillMode === "required" ? selectedRequired : selectedNice
                }
                onChange={
                  skillMode === "required"
                    ? handleRequiredChange
                    : handleNiceChange
                }
                min={skillMode === "required" ? 1 : 0}
                max={20}
                selectedHeading={
                  skillMode === "required"
                    ? `Selected required skills (${selectedRequired.length})`
                    : `Selected nice-to-have skills (${selectedNice.length})`
                }
                subtitle={
                  skillMode === "required"
                    ? "Choose mandatory technical skills applicants must possess for this role."
                    : "Choose optional or nice-to-have skills for this role."
                }
              />
            </div>

            <div className="skills-overview-container">
              <div className="skills-overview-column">
                <div className="skills-overview-header">
                  <span
                    style={{
                      background: "#eef3ff",
                      color: "#1d40a0",
                      border: "1px solid #c9dafb",
                      fontWeight: 700,
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    REQUIRED ({selectedRequired.length})
                  </span>
                  <small className="muted">Mandatory qualifications</small>
                </div>
                <div className="skills-overview-chips">
                  {selectedRequired.length > 0 ? (
                    selectedRequired.map((s) => (
                      <span
                        key={s.skill_id}
                        className="overview-chip chip-required"
                      >
                        <SkillIcon name={s.name || ""} size={13} />
                        <span className="chip-label">{s.name || s.skill_id}</span>
                        <button
                          type="button"
                          className="chip-action-btn"
                          title="Move to Nice-to-have"
                          onClick={() => moveToNice(s)}
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          className="chip-remove-btn"
                          title="Remove skill"
                          onClick={() => removeRequired(s.skill_id)}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span
                      className="muted"
                      style={{ fontSize: "12px", fontStyle: "italic" }}
                    >
                      No required skills selected yet. Select at least 1 skill
                      above.
                    </span>
                  )}
                </div>
              </div>

              <div className="skills-overview-column">
                <div className="skills-overview-header">
                  <span
                    style={{
                      background: "#eafaf6",
                      color: "#0b6858",
                      border: "1px solid #c1ece0",
                      fontWeight: 700,
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    NICE-TO-HAVE ({selectedNice.length})
                  </span>
                  <small className="muted">Preferred / bonus skills</small>
                </div>
                <div className="skills-overview-chips">
                  {selectedNice.length > 0 ? (
                    selectedNice.map((s) => (
                      <span
                        key={s.skill_id}
                        className="overview-chip chip-nice"
                      >
                        <SkillIcon name={s.name || ""} size={13} />
                        <span className="chip-label">{s.name || s.skill_id}</span>
                        <button
                          type="button"
                          className="chip-action-btn"
                          title="Move to Required"
                          onClick={() => moveToRequired(s)}
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          className="chip-remove-btn"
                          title="Remove skill"
                          onClick={() => removeNice(s.skill_id)}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span
                      className="muted"
                      style={{ fontSize: "12px", fontStyle: "italic" }}
                    >
                      No nice-to-have skills selected (Optional).
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="form-section-heading">
            <span>03</span>
            <div>
              <h2>A realistic commitment</h2>
              <p>Help students find a sustainable fit.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              Expected commitment (hours / week)
              <input
                type="number"
                required
                min="1"
                max="40"
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Project duration
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option>1 month</option>
                <option>2 months</option>
                <option>3 months</option>
              </select>
            </label>
          </div>
          <label className="terms">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              required
            />
            I have reviewed the project brief and confirm all information before
            publishing.
          </label>
          <div className="form-footer">
            <Link className="btn btn-secondary" to="/leader">
              Cancel
            </Link>
            <Button disabled={submitting}>
              {existing ? "Save changes" : "Publish project"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
        <aside className="panel create-advice">
          <span className="icon-tile teal">
            <FileText size={21} />
          </span>
          <h3>A brief worth joining</h3>
          <p>Great project briefs make three things clear:</p>
          <ul>
            <li>
              <Check size={15} />
              What you’re building
            </li>
            <li>
              <Check size={15} />
              How a student can contribute
            </li>
            <li>
              <Check size={15} />
              What they’ll learn along the way
            </li>
          </ul>
          <div className="trust-note">
            <Info size={16} />
            <span>
              AI-generated descriptions are editable drafts. Your review is
              required before publication. Generation is simulated in this
              prototype.
            </span>
          </div>
        </aside>
      </div>
    </>
  )
}

export default CreateProject
