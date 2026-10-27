import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router"
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  FileText,
  Check,
  Info,
  Plus,
  Trash2,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import { PageHeader, Button } from "../../components/ui"
import { getStoredToken } from "../../services/apiClient"
import { getProfessionalRolesApi, getSkillsApi } from "../../services/catalog.service"
import {
  createProjectApi,
  isGuid,
  toApiDifficulty,
  updateProjectApi,
} from "../../services/projects.service"
import type { CatalogSkill, ProfessionalRole, SelectedSkill } from "../../types/catalog"
import SkillSelector from "../../components/onboarding/SkillSelector"
import SkillIcon from "../../components/onboarding/SkillIcon"

export interface FormPositionItem {
  id: string
  role: string
  title: string
  description: string
  count: number
  level: string
  requiredSkills: SelectedSkill[]
  niceSkills: SelectedSkill[]
}

export function CreateProject() {
  const { id } = useParams()
  const { projects, setProjects, profile, notify } = useTindy()
  const existing = projects.find((project) => project.id === id)
  const navigate = useNavigate()
  const [jd, setJd] = useState(existing?.description || "")
  const [name, setName] = useState(existing?.name || "")
  const [tagline, setTagline] = useState(existing?.tagline || "")
  const [goals, setGoals] = useState(existing?.goals.join("\n") || "")
  const [hours, setHours] = useState(existing?.hours || 10)
  const [duration, setDuration] = useState(existing?.duration || "3 months")
  const [type, setType] = useState(existing?.type || "AI & Machine Learning")
  const [members, setMembers] = useState(existing?.team || 1)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [catalogRoles, setCatalogRoles] = useState<ProfessionalRole[]>([])
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([])

  const [positionsList, setPositionsList] = useState<FormPositionItem[]>([
    {
      id: "pos-1",
      role: existing?.role || "Backend Developer",
      title: existing?.role || "Backend Developer",
      description: "",
      count: existing ? Math.max(1, existing.capacity - existing.team) : 2,
      level: existing?.difficulty || "Intermediate",
      requiredSkills: [],
      niceSkills: [],
    },
  ])
  const [activePosIndex, setActivePosIndex] = useState(0)
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

    if (existing?.openPositions?.length) {
      const mapped: FormPositionItem[] = existing.openPositions.map((p, idx) => ({
        id: p.positionId || `pos-${idx + 1}`,
        role: p.role,
        title: p.title || p.role,
        description: p.description || "",
        count: p.count || 1,
        level: p.level || "Intermediate",
        requiredSkills: (p.requiredSkills || []).map(findSkill),
        niceSkills: (p.niceSkills || []).map(findSkill),
      }))
      setPositionsList(mapped)
    } else if (existing) {
      const reqNames =
        existing.requiredSkills || existing.skills.slice(0, 3) || []
      const niceNames = existing.gap || []
      setPositionsList([
        {
          id: "pos-1",
          role: existing.role || "Backend Developer",
          title: existing.role || "Backend Developer",
          description: "",
          count: Math.max(1, existing.capacity - existing.team),
          level: existing.difficulty || "Intermediate",
          requiredSkills: reqNames.map(findSkill),
          niceSkills: niceNames.map(findSkill),
        },
      ])
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
      setPositionsList([
        {
          id: "pos-1",
          role: "Backend Developer",
          title: "Backend Developer",
          description: "Build scalable backend APIs and cloud services.",
          count: 2,
          level: "Intermediate",
          requiredSkills: reqMatches,
          niceSkills: niceMatches,
        },
      ])
    }
  }, [catalogSkills, existing])

  const currentPos =
    positionsList[activePosIndex] ||
    positionsList[0] || {
      id: "pos-fallback",
      role: "Backend Developer",
      title: "Backend Developer",
      description: "",
      count: 1,
      level: "Intermediate",
      requiredSkills: [],
      niceSkills: [],
    }

  const updateActivePosition = (patch: Partial<FormPositionItem>) => {
    setPositionsList((prev) =>
      prev.map((pos, idx) =>
        idx === activePosIndex ? { ...pos, ...patch } : pos,
      ),
    )
  }

  const handleAddPosition = () => {
    const candidateRoles = [
      "Frontend Developer",
      "Backend Developer",
      "Full-stack Developer",
      "UI/UX Designer",
      "AI Engineer",
      "Mobile Developer",
      "Cloud Engineer",
      "DevOps Engineer",
      "QA / Tester",
    ]
    const nextRole =
      candidateRoles.find((r) => !positionsList.some((p) => p.role === r)) ||
      `Developer ${positionsList.length + 1}`

    const newPos: FormPositionItem = {
      id: `pos-${Date.now()}`,
      role: nextRole,
      title: nextRole,
      description: "",
      count: 1,
      level: "Intermediate",
      requiredSkills: [],
      niceSkills: [],
    }
    setPositionsList((prev) => [...prev, newPos])
    setActivePosIndex(positionsList.length)
    notify(`Added new position: "${nextRole}"`)
  }

  const handleRemovePosition = (indexToRemove: number) => {
    if (positionsList.length <= 1) {
      notify("A project must have at least one position.")
      return
    }
    const targetName =
      positionsList[indexToRemove]?.title ||
      positionsList[indexToRemove]?.role ||
      "position"
    setPositionsList((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    if (activePosIndex >= indexToRemove && activePosIndex > 0) {
      setActivePosIndex((prev) => prev - 1)
    }
    notify(`Removed position: "${targetName}"`)
  }

  const totalAvailablePositions = useMemo(() => {
    return positionsList.reduce((acc, p) => acc + (Number(p.count) || 1), 0)
  }, [positionsList])

  const allProjectSkills = useMemo(() => {
    const map = new Map<string, SelectedSkill>()
    for (const pos of positionsList) {
      for (const s of pos.requiredSkills) map.set(s.skill_id, s)
      for (const s of pos.niceSkills) map.set(s.skill_id, s)
    }
    return Array.from(map.values())
  }, [positionsList])

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
            if (!name.trim() || name.trim().length < 3) {
              notify("Project name must be at least 3 characters.")
              return
            }

            if (!jd.trim() || jd.trim().length < 20) {
              notify(`Project description must be at least 20 characters (currently ${jd.trim().length}).`)
              return
            }

            const missingSkillPos = positionsList.find(
              (p) => p.requiredSkills.length === 0,
            )
            if (missingSkillPos) {
              notify(
                `Please select at least 1 required skill for "${missingSkillPos.title || missingSkillPos.role}".`,
              )
              const targetIdx = positionsList.indexOf(missingSkillPos)
              if (targetIdx >= 0) setActivePosIndex(targetIdx)
              return
            }

            setSubmitting(true)

            const goalList = goals.split("\n").filter(Boolean)
            const stackList = allProjectSkills.map((s) => s.name || s.skill_id)

            let finalProjectId = existing?.id || `project-${Date.now()}`

            const resolveRoleGuid = (roleName: string): string => {
              const matched = catalogRoles.find(
                (r) => r.name.toLowerCase() === roleName.toLowerCase(),
              )
              if (matched?.professional_role_id && isGuid(matched.professional_role_id)) {
                return matched.professional_role_id
              }
              const firstValid = catalogRoles.find((r) => isGuid(r.professional_role_id))
              return firstValid?.professional_role_id || "e8e72cb0-e5b2-515a-92b3-1abf59733d97"
            }

            const resolveSkillGuid = (s: SelectedSkill): string => {
              if (isGuid(s.skill_id)) return s.skill_id
              const matched = catalogSkills.find(
                (cs) => cs.name.toLowerCase() === (s.name || "").toLowerCase(),
              )
              if (matched?.skill_id && isGuid(matched.skill_id)) {
                return matched.skill_id
              }
              const firstValid = catalogSkills.find((cs) => isGuid(cs.skill_id))
              return firstValid?.skill_id || "e0027d9c-48c9-5496-8904-658b13776f4c"
            }

            if (getStoredToken()) {
              try {
                if (existing && isGuid(existing.id)) {
                  await updateProjectApi(existing.id, {
                    name,
                    tagline: tagline.trim() || undefined,
                    description: jd,
                    category: type,
                    difficulty_level: toApiDifficulty(currentPos.level),
                    expected_commitment_hours: hours,
                    duration,
                    max_team_capacity: members + totalAvailablePositions,
                    color_theme: existing.color || "indigo",
                    goals: goalList,
                  })
                } else {
                  const created = await createProjectApi({
                    name,
                    tagline: tagline.trim() || undefined,
                    description: jd,
                    category: type,
                    difficulty_level: toApiDifficulty(currentPos.level),
                    expected_commitment_hours: hours,
                    duration,
                    initial_team_size: members,
                    max_team_capacity: members + totalAvailablePositions,
                    color_theme: "indigo",
                    recruitment_closing_days: 14,
                    goals: goalList,
                    positions: positionsList.map((pos) => ({
                      role_id: resolveRoleGuid(pos.role),
                      title: pos.title || pos.role,
                      required_count: pos.count,
                      experience_level: toApiDifficulty(pos.level),
                      description: pos.description.trim() || undefined,
                      skills: [
                        ...pos.requiredSkills.map((s) => ({
                          skill_id: resolveSkillGuid(s),
                          is_required: true,
                        })),
                        ...pos.niceSkills.map((s) => ({
                          skill_id: resolveSkillGuid(s),
                          is_required: false,
                        })),
                      ],
                    })),
                  })
                  if (created?.project_id) {
                    finalProjectId = created.project_id
                  }
                }
              } catch (err: any) {
                setSubmitting(false)
                const errorMsg = err?.message || "Failed to save project on server."
                notify(errorMsg)
                console.error("Backend project sync failed:", err)
                return
              }
            }

            const primaryPos = positionsList[0]
            const project: Project = {
              id: finalProjectId,
              name,
              tagline: tagline.trim() || undefined,
              description: jd,
              type,
              skills: stackList,
              role: primaryPos?.title || primaryPos?.role || "Developer",
              hours,
              duration,
              difficulty: primaryPos?.level || "Intermediate",
              team: members,
              capacity: members + totalAvailablePositions,
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
              requiredSkills:
                primaryPos?.requiredSkills.map((s) => s.name || s.skill_id) ||
                [],
              gap: primaryPos?.niceSkills.map((s) => s.name || s.skill_id) || [],
              openPositions: positionsList.map((p) => ({
                positionId: p.id,
                role: p.role,
                title: p.title || p.role,
                count: p.count,
                level: p.level,
                description: p.description,
                requiredSkills: p.requiredSkills.map((s) => s.name || s.skill_id),
                niceSkills: p.niceSkills.map((s) => s.name || s.skill_id),
              })),
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
            Project description <small>Minimum 20 characters ({jd.trim().length} chars)</small>
            <textarea
              required
              rows={5}
              placeholder="What are you building, and why does it matter? (At least 20 characters)"
              value={jd}
              onChange={(event) => {
                setJd(event.target.value)
                setConfirmed(false)
              }}
            />
            {jd.trim().length > 0 && jd.trim().length < 20 && (
              <small style={{ color: "var(--red, #f43f5e)", marginTop: "4px" }}>
                Description is too short ({jd.trim().length}/20 characters minimum).
              </small>
            )}
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
                const stackText = allProjectSkills
                  .map((s) => s.name)
                  .join(", ")
                const rolesText = positionsList
                  .map((p) => `${p.count} ${p.title || p.role}`)
                  .join(", ")
                setJd(
                  `${name} is a collaborative FCAJ project focused on ${type.toLowerCase()}. Our goal is to build a practical, user-centered solution using ${stackText || "a modern technology stack"}. We’re looking for ${rolesText || "teammates"} to help design, develop, and deploy the product. You’ll work alongside a supportive student team and contribute ${hours} hours per week over ${duration}.`,
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
                <small>(Auto-synced from all positions below)</small>
              </span>
              <div className="tech-stack-readonly-display">
                {allProjectSkills.length > 0 ? (
                  <div className="tech-stack-chips">
                    {allProjectSkills.map((skill) => (
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
              <p>Define the positions you are recruiting for your team.</p>
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
            <div className="field">
              <span>
                Total open positions{" "}
                <small>(Auto-calculated across all positions)</small>
              </span>
              <div className="readonly-metric-box">
                <strong>{totalAvailablePositions}</strong>
                <span>
                  openings across {positionsList.length} role
                  {positionsList.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Option A: Position Tabs */}
          <div className="position-tabs-container">
            <div className="position-tabs-header">
              <div className="position-tabs-list">
                {positionsList.map((pos, idx) => {
                  const isActive = idx === activePosIndex
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      className={`position-tab ${isActive ? "active" : ""}`}
                      onClick={() => setActivePosIndex(idx)}
                    >
                      <span className="pos-tab-badge">{pos.count}</span>
                      <span className="pos-tab-title">
                        {pos.title || pos.role}
                      </span>
                      {positionsList.length > 1 && (
                        <span
                          className="pos-tab-close"
                          title="Delete position"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemovePosition(idx)
                          }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="btn btn-secondary add-position-btn"
                onClick={handleAddPosition}
              >
                <Plus size={14} />
                <span>Add another position</span>
              </button>
            </div>

            {/* Position Editor Card */}
            <div className="position-editor-card">
              <div className="position-editor-header">
                <div>
                  <h3>
                    {currentPos.title || currentPos.role}
                    <span className="position-badge-num">
                      Position {activePosIndex + 1} of {positionsList.length}
                    </span>
                  </h3>
                  <p
                    className="muted"
                    style={{ fontSize: "11px", margin: "2px 0 0" }}
                  >
                    Configure requirements, headcount, and specific skills for
                    this position.
                  </p>
                </div>
                {positionsList.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      color: "#d9534f",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onClick={() => handleRemovePosition(activePosIndex)}
                  >
                    <Trash2 size={14} />
                    <span>Delete this position</span>
                  </button>
                )}
              </div>

              <div className="form-grid">
                <label className="field">
                  Required role
                  <select
                    value={currentPos.role}
                    onChange={(event) => {
                      const newRole = event.target.value
                      updateActivePosition({
                        role: newRole,
                        title:
                          currentPos.title === currentPos.role
                            ? newRole
                            : currentPos.title,
                      })
                    }}
                  >
                    {[
                      "Backend Developer",
                      "Frontend Developer",
                      "Full-stack Developer",
                      "AI Engineer",
                      "Mobile Developer",
                      "Cloud Engineer",
                      "DevOps Engineer",
                      "UI/UX Designer",
                      "Data Analyst",
                      "QA / Tester",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Job title <small>Custom role title</small>
                  <input
                    placeholder="e.g. Lead Frontend Engineer"
                    value={currentPos.title}
                    onChange={(event) =>
                      updateActivePosition({ title: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="field">
                  Number of openings
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={currentPos.count}
                    onChange={(event) =>
                      updateActivePosition({
                        count: Math.max(1, Number(event.target.value)),
                      })
                    }
                  />
                </label>
                <label className="field">
                  Experience level
                  <select
                    value={currentPos.level}
                    onChange={(event) =>
                      updateActivePosition({ level: event.target.value })
                    }
                  >
                    <option>Beginner-friendly</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
              </div>

              <label className="field">
                Specific tasks & deliverables{" "}
                <small>What will they actually build with these tools?</small>
                <textarea
                  rows={2}
                  placeholder="e.g. Build responsive SaaS dashboard, integrate REST APIs, and optimize mobile web performance."
                  value={currentPos.description}
                  onChange={(event) =>
                    updateActivePosition({ description: event.target.value })
                  }
                />
              </label>

              {/* Position Skills Manager */}
              <div className="project-skills-manager">
                <div className="skill-category-tabs-header">
                  <div>
                    <h4
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        margin: "0 0 4px",
                      }}
                    >
                      Technical skills for:{" "}
                      <strong style={{ color: "#3553b5" }}>
                        {currentPos.title || currentPos.role}
                      </strong>
                    </h4>
                    <p className="muted" style={{ fontSize: "11px", margin: 0 }}>
                      Select the required and nice-to-have skills specifically
                      for this position.
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
                      <span className="mode-count">
                        {currentPos.requiredSkills.length}
                      </span>
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
                      <span className="mode-count">
                        {currentPos.niceSkills.length}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="skill-selector-wrapper">
                  <SkillSelector
                    key={`${currentPos.id}-${skillMode}`}
                    selected={
                      skillMode === "required"
                        ? currentPos.requiredSkills
                        : currentPos.niceSkills
                    }
                    onChange={(newSkills) => {
                      if (skillMode === "required") {
                        const newIds = new Set(newSkills.map((s) => s.skill_id))
                        updateActivePosition({
                          requiredSkills: newSkills,
                          niceSkills: currentPos.niceSkills.filter(
                            (s) => !newIds.has(s.skill_id),
                          ),
                        })
                      } else {
                        const newIds = new Set(newSkills.map((s) => s.skill_id))
                        updateActivePosition({
                          niceSkills: newSkills,
                          requiredSkills: currentPos.requiredSkills.filter(
                            (s) => !newIds.has(s.skill_id),
                          ),
                        })
                      }
                    }}
                    min={skillMode === "required" ? 1 : 0}
                    max={15}
                    selectedHeading={
                      skillMode === "required"
                        ? `Required skills for ${currentPos.title || currentPos.role} (${currentPos.requiredSkills.length})`
                        : `Nice-to-have skills for ${currentPos.title || currentPos.role} (${currentPos.niceSkills.length})`
                    }
                    subtitle={
                      skillMode === "required"
                        ? `Choose mandatory skills candidates must have for this ${currentPos.role} role.`
                        : `Choose bonus or optional skills for this ${currentPos.role} role.`
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
                        REQUIRED ({currentPos.requiredSkills.length})
                      </span>
                      <small className="muted">Mandatory qualifications</small>
                    </div>
                    <div className="skills-overview-chips">
                      {currentPos.requiredSkills.length > 0 ? (
                        currentPos.requiredSkills.map((s) => (
                          <span
                            key={s.skill_id}
                            className="overview-chip chip-required"
                          >
                            <SkillIcon name={s.name || ""} size={13} />
                            <span className="chip-label">
                              {s.name || s.skill_id}
                            </span>
                            <button
                              type="button"
                              className="chip-action-btn"
                              title="Move to Nice-to-have"
                              onClick={() => {
                                updateActivePosition({
                                  requiredSkills:
                                    currentPos.requiredSkills.filter(
                                      (x) => x.skill_id !== s.skill_id,
                                    ),
                                  niceSkills: [
                                    ...currentPos.niceSkills.filter(
                                      (x) => x.skill_id !== s.skill_id,
                                    ),
                                    s,
                                  ],
                                })
                              }}
                            >
                              ⇄
                            </button>
                            <button
                              type="button"
                              className="chip-remove-btn"
                              title="Remove skill"
                              onClick={() => {
                                updateActivePosition({
                                  requiredSkills:
                                    currentPos.requiredSkills.filter(
                                      (x) => x.skill_id !== s.skill_id,
                                    ),
                                })
                              }}
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
                        NICE-TO-HAVE ({currentPos.niceSkills.length})
                      </span>
                      <small className="muted">Preferred / bonus skills</small>
                    </div>
                    <div className="skills-overview-chips">
                      {currentPos.niceSkills.length > 0 ? (
                        currentPos.niceSkills.map((s) => (
                          <span
                            key={s.skill_id}
                            className="overview-chip chip-nice"
                          >
                            <SkillIcon name={s.name || ""} size={13} />
                            <span className="chip-label">
                              {s.name || s.skill_id}
                            </span>
                            <button
                              type="button"
                              className="chip-action-btn"
                              title="Move to Required"
                              onClick={() => {
                                updateActivePosition({
                                  niceSkills: currentPos.niceSkills.filter(
                                    (x) => x.skill_id !== s.skill_id,
                                  ),
                                  requiredSkills: [
                                    ...currentPos.requiredSkills.filter(
                                      (x) => x.skill_id !== s.skill_id,
                                    ),
                                    s,
                                  ],
                                })
                              }}
                            >
                              ⇄
                            </button>
                            <button
                              type="button"
                              className="chip-remove-btn"
                              title="Remove skill"
                              onClick={() => {
                                updateActivePosition({
                                  niceSkills: currentPos.niceSkills.filter(
                                    (x) => x.skill_id !== s.skill_id,
                                  ),
                                })
                              }}
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

