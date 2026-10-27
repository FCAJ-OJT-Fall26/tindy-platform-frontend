import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Tag,
  AlertCircle,
  Briefcase,
  ChevronDown,
} from "lucide-react"
import { Modal, Button, Badge } from "../ui"
import { useTindy } from "../../store"
import {
  getProjectPositionsApi,
  createProjectPositionApi,
  updateProjectPositionApi,
  deleteProjectPositionApi,
  addPositionSkillApi,
  removePositionSkillApi,
  fromApiDifficulty,
  toApiDifficulty,
  isGuid,
} from "../../services/projects.service"
import {
  getProfessionalRolesApi,
  getSkillsApi,
} from "../../services/catalog.service"
import type {
  ProjectPositionDto,
  PositionStatus,
  ProjectDifficultyLevel,
} from "../../types/project"
import type { ProfessionalRole, CatalogSkill } from "../../types/catalog"

const FALLBACK_ROLES: ProfessionalRole[] = [
  { professional_role_id: "role_frontend", name: "Frontend Developer", description: null, display_order: 1 },
  { professional_role_id: "role_backend", name: "Backend Developer", description: null, display_order: 2 },
  { professional_role_id: "role_fullstack", name: "Fullstack Developer", description: null, display_order: 3 },
  { professional_role_id: "role_mobile", name: "Mobile Developer", description: null, display_order: 4 },
  { professional_role_id: "role_uiux", name: "UI/UX Designer", description: null, display_order: 5 },
  { professional_role_id: "role_ai_engineer", name: "AI / RAG Engineer", description: null, display_order: 6 },
  { professional_role_id: "role_devops", name: "DevOps Engineer", description: null, display_order: 7 },
  { professional_role_id: "role_qa", name: "QA / Test Engineer", description: null, display_order: 8 },
]

export interface LeaderPositionManagerModalProps {
  projectId: string
  projectName: string
  projectRole?: string
  projectSkills?: string[]
  initialPositions?: ProjectPositionDto[]
  onClose: () => void
  onPositionsChanged?: () => void
}

export default function LeaderPositionManagerModal({
  projectId,
  projectName,
  projectRole,
  projectSkills,
  initialPositions,
  onClose,
  onPositionsChanged,
}: LeaderPositionManagerModalProps) {
  const { notify } = useTindy()

  const defaultFallbackPositions: ProjectPositionDto[] = useMemo(() => {
    if (initialPositions && initialPositions.length > 0) return initialPositions
    return [
      {
        position_id: `mock-pos-1`,
        project_id: projectId,
        role_id: "role_frontend",
        title: projectRole || "Frontend Developer",
        description: "Build intuitive user interfaces, state management, and real-time interaction flows.",
        required_count: 2,
        filled_count: 0,
        experience_level: "intermediate",
        status: "open",
        skills: (projectSkills || ["React", "TypeScript", "Tailwind"]).slice(0, 3).map((name) => ({
          skill_id: `skill-${name.toLowerCase().replace(/\s+/g, "_")}`,
          name,
          is_required: true,
        })),
      },
      {
        position_id: `mock-pos-2`,
        project_id: projectId,
        role_id: "role_backend",
        title: "Backend Engineer",
        description: "Develop resilient APIs, manage relational/vector databases, and ensure cloud security.",
        required_count: 1,
        filled_count: 0,
        experience_level: "intermediate",
        status: "open",
        skills: [
          { skill_id: "skill_dotnet", name: ".NET / C#", is_required: true },
          { skill_id: "skill_postgres", name: "PostgreSQL", is_required: true },
          { skill_id: "skill_docker", name: "Docker", is_required: false },
        ],
      },
    ]
  }, [initialPositions, projectId, projectRole, projectSkills])

  const [positions, setPositions] = useState<ProjectPositionDto[]>(
    initialPositions && initialPositions.length > 0 ? initialPositions : defaultFallbackPositions,
  )
  const [loading, setLoading] = useState(false)
  const [busyPosId, setBusyPosId] = useState<string | null>(null)

  // Catalog
  const [roles, setRoles] = useState<ProfessionalRole[]>(FALLBACK_ROLES)
  const [availableSkills, setAvailableSkills] = useState<CatalogSkill[]>([])

  // New position form visibility & state
  const [isAddingPosition, setIsAddingPosition] = useState(false)
  const [newRoleId, setNewRoleId] = useState("role_frontend")
  const [newTitle, setNewTitle] = useState("")
  const [newCount, setNewCount] = useState(1)
  const [newLevel, setNewLevel] = useState<ProjectDifficultyLevel>("intermediate")
  const [newDescription, setNewDescription] = useState("")
  const [addingSubmitting, setAddingSubmitting] = useState(false)

  // Editing existing position state
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCount, setEditCount] = useState(1)
  const [editLevel, setEditLevel] = useState<ProjectDifficultyLevel>("intermediate")
  const [editDesc, setEditDesc] = useState("")

  // Quick skill add state
  const [activeSkillPosId, setActiveSkillPosId] = useState<string | null>(null)
  const [selectedSkillId, setSelectedSkillId] = useState("")
  const [skillIsRequired, setSkillIsRequired] = useState(true)

  // Load catalog & positions
  const fetchPositions = useCallback(async () => {
    if (!isGuid(projectId)) {
      if (initialPositions && initialPositions.length > 0) {
        setPositions(initialPositions)
      } else {
        setPositions(defaultFallbackPositions)
      }
      return
    }
    setLoading(true)
    try {
      const data = await getProjectPositionsApi(projectId)
      if (Array.isArray(data) && data.length > 0) {
        setPositions(data)
      } else if (initialPositions && initialPositions.length > 0) {
        setPositions(initialPositions)
      }
    } catch {
      if (initialPositions && initialPositions.length > 0) {
        setPositions(initialPositions)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, initialPositions, defaultFallbackPositions])

  useEffect(() => {
    fetchPositions()
    getProfessionalRolesApi()
      .then((data) => {
        if (data?.length) setRoles(data)
      })
      .catch(() => {})
    getSkillsApi()
      .then((data) => {
        if (data?.length) setAvailableSkills(data)
      })
      .catch(() => {})
  }, [fetchPositions])

  // Update position status (open, filled, closed)
  const handleStatusChange = async (pos: ProjectPositionDto, nextStatus: PositionStatus) => {
    if (pos.status === nextStatus) return
    setBusyPosId(pos.position_id)
    try {
      await updateProjectPositionApi(projectId, pos.position_id, {
        title: pos.title,
        required_count: pos.required_count,
        experience_level: pos.experience_level,
        status: nextStatus,
        description: pos.description || undefined,
      })
      setPositions((prev) =>
        prev.map((p) => (p.position_id === pos.position_id ? { ...p, status: nextStatus } : p)),
      )
      notify(`Status changed to ${nextStatus.toUpperCase()}`)
      onPositionsChanged?.()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to update position status")
    } finally {
      setBusyPosId(null)
    }
  }

  // Delete position
  const handleDeletePosition = async (posId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete position "${title}"?`)) return
    setBusyPosId(posId)
    try {
      await deleteProjectPositionApi(projectId, posId)
      setPositions((prev) => prev.filter((p) => p.position_id !== posId))
      notify(`Position "${title}" deleted`)
      onPositionsChanged?.()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to delete position")
    } finally {
      setBusyPosId(null)
    }
  }

  // Edit position details
  const startEditing = (pos: ProjectPositionDto) => {
    setEditingPosId(pos.position_id)
    setEditTitle(pos.title)
    setEditCount(pos.required_count)
    setEditLevel(pos.experience_level)
    setEditDesc(pos.description || "")
  }

  const handleSaveEdit = async (posId: string) => {
    setBusyPosId(posId)
    const current = positions.find((p) => p.position_id === posId)
    try {
      await updateProjectPositionApi(projectId, posId, {
        title: editTitle || current?.title || "Role",
        required_count: editCount || 1,
        experience_level: editLevel,
        status: current?.status || "open",
        description: editDesc,
      })
      setPositions((prev) =>
        prev.map((p) =>
          p.position_id === posId
            ? {
                ...p,
                title: editTitle,
                required_count: editCount,
                experience_level: editLevel,
                description: editDesc,
              }
            : p,
        ),
      )
      setEditingPosId(null)
      notify("Position details updated")
      onPositionsChanged?.()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to save position")
    } finally {
      setBusyPosId(null)
    }
  }

  // Add skill to position
  const handleAddSkill = async (posId: string) => {
    if (!selectedSkillId) return
    setBusyPosId(posId)
    try {
      const res = await addPositionSkillApi(projectId, posId, {
        skill_id: selectedSkillId,
        is_required: skillIsRequired,
      })
      setPositions((prev) =>
        prev.map((p) => {
          if (p.position_id !== posId) return p
          const exists = p.skills.some((s) => s.skill_id === selectedSkillId)
          if (exists) return p
          return {
            ...p,
            skills: [
              ...p.skills,
              {
                skill_id: res.skill_id,
                name: res.skill_name || "Skill",
                is_required: res.is_required,
              },
            ],
          }
        }),
      )
      setActiveSkillPosId(null)
      setSelectedSkillId("")
      notify("Skill added to position")
      onPositionsChanged?.()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to add skill")
    } finally {
      setBusyPosId(null)
    }
  }

  // Remove skill from position
  const handleRemoveSkill = async (posId: string, skillId: string, skillName: string) => {
    setBusyPosId(posId)
    try {
      await removePositionSkillApi(projectId, posId, skillId)
      setPositions((prev) =>
        prev.map((p) =>
          p.position_id === posId
            ? { ...p, skills: p.skills.filter((s) => s.skill_id !== skillId) }
            : p,
        ),
      )
      notify(`Removed skill ${skillName}`)
      onPositionsChanged?.()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to remove skill")
    } finally {
      setBusyPosId(null)
    }
  }

  // Create brand new position
  const handleCreateNewPosition = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingSubmitting(true)
    const roleObj = roles.find((r) => r.professional_role_id === newRoleId)
    const title = newTitle.trim() || roleObj?.name || "New Role"
    try {
      const created = await createProjectPositionApi(projectId, {
        role_id: newRoleId,
        title,
        required_count: Number(newCount) || 1,
        experience_level: newLevel,
        description: newDescription.trim() || undefined,
      })
      setPositions((prev) => [...prev, { ...created, skills: created.skills || [] }])
      notify(`Position "${title}" created successfully`)
      setIsAddingPosition(false)
      setNewTitle("")
      setNewDescription("")
      setNewCount(1)
      onPositionsChanged?.()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to create position")
    } finally {
      setAddingSubmitting(false)
    }
  }

  const getStatusBadge = (status: PositionStatus) => {
    switch (status) {
      case "open":
        return <Badge tone="success">Open (Recruiting)</Badge>
      case "filled":
        return <Badge tone="blue">Filled (Staffed)</Badge>
      case "closed":
        return <Badge tone="neutral">Closed (Paused)</Badge>
      default:
        return <Badge tone="neutral">{status}</Badge>
    }
  }

  return (
    <Modal title={`Manage Positions — ${projectName}`} onClose={onClose} wide>
      <div className="position-manager-modal">
        <div className="position-manager-intro">
          <p>
            Configure open recruitment roles, adjust headcount, change recruitment status (Open,
            Filled, Closed), and manage specific skill expectations.
          </p>
          {!isAddingPosition && (
            <Button variant="secondary" onClick={() => setIsAddingPosition(true)}>
              <Plus size={16} /> Add new position
            </Button>
          )}
        </div>

        {/* Add new position form */}
        {isAddingPosition && (
          <form className="position-create-card panel" onSubmit={handleCreateNewPosition}>
            <div className="position-create-header">
              <h4>
                <Sparkles size={16} /> Add New Position to Project
              </h4>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsAddingPosition(false)}
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="form-grid">
              <label className="field">
                Select role archetype *
                <select
                  value={newRoleId}
                  onChange={(e) => {
                    setNewRoleId(e.target.value)
                    const r = roles.find((x) => x.professional_role_id === e.target.value)
                    if (r && !newTitle) setNewTitle(r.name)
                  }}
                  required
                >
                  {roles.map((r) => (
                    <option key={r.professional_role_id} value={r.professional_role_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Job title *
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                Headcount to recruit *
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newCount}
                  onChange={(e) => setNewCount(Number(e.target.value))}
                  required
                />
              </label>

              <label className="field">
                Required experience level
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value as ProjectDifficultyLevel)}
                >
                  <option value="beginner_friendly">Beginner-friendly</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>

            <label className="field">
              Key responsibilities & deliverables
              <textarea
                rows={2}
                placeholder="What will this person be responsible for building?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </label>

            <div className="position-create-actions">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsAddingPosition(false)}
                disabled={addingSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingSubmitting}>
                {addingSubmitting ? "Adding..." : "Add position"}
              </Button>
            </div>
          </form>
        )}

        {/* Existing positions list */}
        {loading ? (
          <div className="position-loading-state">
            <span className="spinner" /> Loading project positions...
          </div>
        ) : positions.length === 0 ? (
          <div className="empty-positions-notice">
            <AlertCircle size={24} />
            <p>No open positions found. Add your first position to begin recruiting team members.</p>
          </div>
        ) : (
          <div className="position-manager-list">
            {positions.map((pos) => {
              const isBusy = busyPosId === pos.position_id
              const isEditing = editingPosId === pos.position_id
              const isAddingSkill = activeSkillPosId === pos.position_id

              return (
                <div
                  key={pos.position_id}
                  className={`position-manager-item panel ${isBusy ? "busy-fade" : ""}`}
                >
                  {/* Position Header & Quick Status */}
                  <div className="pos-item-header">
                    <div>
                      <div className="pos-title-row">
                        <h3>{pos.title}</h3>
                        {getStatusBadge(pos.status)}
                      </div>
                      <div className="pos-meta-sub">
                        <span>
                          <Briefcase size={13} /> {pos.role_id}
                        </span>
                        <span>
                          <Clock size={13} /> Level: {fromApiDifficulty(pos.experience_level)}
                        </span>
                        <span>
                          Target headcount: <strong>{pos.required_count}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="pos-actions-row">
                      {/* Status changer select */}
                      <div className="status-select-wrap">
                        <label htmlFor={`status-${pos.position_id}`} className="sr-only">
                          Recruitment Status
                        </label>
                        <select
                          id={`status-${pos.position_id}`}
                          className={`status-select ${pos.status}`}
                          value={pos.status}
                          disabled={isBusy}
                          onChange={(e) =>
                            handleStatusChange(pos, e.target.value as PositionStatus)
                          }
                        >
                          <option value="open">🟢 Open (Recruiting)</option>
                          <option value="filled">🟡 Filled (Staffed)</option>
                          <option value="closed">🔴 Closed (Paused)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="icon-button"
                        title="Edit position details"
                        aria-label="Edit position details"
                        onClick={() => (isEditing ? setEditingPosId(null) : startEditing(pos))}
                        disabled={isBusy}
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete"
                        title="Delete this position"
                        aria-label="Delete this position"
                        onClick={() => handleDeletePosition(pos.position_id, pos.title)}
                        disabled={isBusy}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {isEditing ? (
                    <div className="pos-inline-edit panel">
                      <div className="form-grid">
                        <label className="field">
                          Title
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </label>
                        <label className="field">
                          Count
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={editCount}
                            onChange={(e) => setEditCount(Number(e.target.value))}
                          />
                        </label>
                        <label className="field">
                          Level
                          <select
                            value={editLevel}
                            onChange={(e) =>
                              setEditLevel(e.target.value as ProjectDifficultyLevel)
                            }
                          >
                            <option value="beginner_friendly">Beginner-friendly</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </label>
                      </div>
                      <label className="field">
                        Description
                        <textarea
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                        />
                      </label>
                      <div className="pos-edit-buttons">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setEditingPosId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleSaveEdit(pos.position_id)}
                          disabled={isBusy}
                        >
                          <Check size={14} /> Save changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    pos.description && (
                      <p className="pos-desc-preview">{pos.description}</p>
                    )
                  )}

                  {/* Skills Section */}
                  <div className="pos-skills-wrapper">
                    <div className="pos-skills-header">
                      <span className="skills-label">
                        <Tag size={13} /> Associated Skills ({pos.skills?.length || 0}):
                      </span>
                      <button
                        type="button"
                        className="btn-add-skill-trigger"
                        onClick={() =>
                          setActiveSkillPosId(isAddingSkill ? null : pos.position_id)
                        }
                      >
                        <Plus size={13} /> {isAddingSkill ? "Close" : "Add skill"}
                      </button>
                    </div>

                    {/* Skill Add Dropdown Form */}
                    {isAddingSkill && (
                      <div className="pos-quick-skill-form">
                        <select
                          value={selectedSkillId}
                          onChange={(e) => setSelectedSkillId(e.target.value)}
                          className="skill-dropdown"
                        >
                          <option value="">-- Select a skill from catalog --</option>
                          {availableSkills.map((s) => (
                            <option key={s.skill_id} value={s.skill_id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <label className="skill-req-toggle">
                          <input
                            type="checkbox"
                            checked={skillIsRequired}
                            onChange={(e) => setSkillIsRequired(e.target.checked)}
                          />
                          Required skill
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleAddSkill(pos.position_id)}
                          disabled={!selectedSkillId || isBusy}
                        >
                          Add
                        </Button>
                      </div>
                    )}

                    {/* Skill chips */}
                    <div className="pos-skill-chips">
                      {pos.skills && pos.skills.length > 0 ? (
                        pos.skills.map((sk) => (
                          <span
                            key={sk.skill_id}
                            className={`pos-skill-chip ${sk.is_required ? "required" : "nice"}`}
                          >
                            <span className="chip-type-dot" />
                            {sk.name}
                            <button
                              type="button"
                              className="chip-remove-btn"
                              title={`Remove ${sk.name}`}
                              aria-label={`Remove ${sk.name}`}
                              onClick={() =>
                                handleRemoveSkill(pos.position_id, sk.skill_id, sk.name)
                              }
                              disabled={isBusy}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="no-skills-text">No specific skills linked yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="position-manager-footer">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
