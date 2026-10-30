import { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  SlidersHorizontal,
  Clock,
  
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
  getProjectByIdApi,
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
import { positionFromDto, projectErrorMessage, saveProjectEdits, type ProjectSaveProgress } from "../../services/projectEditor.service"
import type { ProfessionalRole, CatalogSkill } from "../../types/catalog"

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

  const [positions, setPositions] = useState<ProjectPositionDto[]>(initialPositions ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyPosId, setBusyPosId] = useState<string | null>(null)
  const busy = useRef(false)
  const progress = useRef<ProjectSaveProgress>({ positionIds: {} })
  const [roles, setRoles] = useState<ProfessionalRole[]>([])
  const [availableSkills, setAvailableSkills] = useState<CatalogSkill[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [version, setVersion] = useState(0)
  const [isAddingPosition, setIsAddingPosition] = useState(false)
  const [newRoleId, setNewRoleId] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newCount, setNewCount] = useState(1)
  const [newLevel, setNewLevel] = useState<ProjectDifficultyLevel>("intermediate")
  const [newDescription, setNewDescription] = useState("")
  const [addingSubmitting, setAddingSubmitting] = useState(false)
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editCount, setEditCount] = useState(1)
  const [editLevel, setEditLevel] = useState<ProjectDifficultyLevel>("intermediate")
  const [editDesc, setEditDesc] = useState("")
  const [activeSkillPosId, setActiveSkillPosId] = useState<string | null>(null)
  const [selectedSkillId, setSelectedSkillId] = useState("")
  const [skillIsRequired, setSkillIsRequired] = useState(true)
  const catalogBlocked = catalogLoading || Boolean(catalogError)

  const fetchPositions = useCallback(async () => {
    const data = await getProjectPositionsApi(projectId)
    setPositions(data)
    return data
  }, [projectId])
  useEffect(() => {
    let active = true
    setLoading(true)
    getProjectPositionsApi(projectId).then(data => { if (active) setPositions(data) })
      .catch(error => { if (active) { setPositions([]); setError(projectErrorMessage(error)) } })
      .finally(() => { if (active) setLoading(false) })
    setCatalogLoading(true)
    setCatalogError("")
    Promise.all([getProfessionalRolesApi(undefined, undefined, true), getSkillsApi(undefined, undefined, undefined, true)])
      .then(([roles, skills]) => {
        if (!active) return
        setRoles(roles); setAvailableSkills(skills)
        if (!roles.length || !skills.length) setCatalogError("Active role and skill catalogs are unavailable.")
      })
      .catch(error => { if (active) setCatalogError(projectErrorMessage(error)) })
      .finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [projectId, version])

  const runMutation = async (id: string, action: () => Promise<unknown>, message: string) => {
    if (busy.current || loading) return false
    busy.current = true; setBusyPosId(id); setError("")
    try {
      await action()
      await fetchPositions()
      onPositionsChanged?.()
      notify(message)
      return true
    } catch (error: unknown) {
      let message = projectErrorMessage(error)
      try { await fetchPositions(); onPositionsChanged?.() }
      catch { message += " Saved positions could not be refreshed." }
      setError("The operation was not fully confirmed. Some changes may already be saved. " + message)
      return false
    } finally { busy.current = false; setBusyPosId(null) }
  }
  const handleStatusChange = (position: ProjectPositionDto, status: PositionStatus) => {
    if (position.status === status) return
    void runMutation(position.position_id, () => updateProjectPositionApi(projectId, position.position_id, {
      title: position.title, required_count: position.required_count, experience_level: position.experience_level,
      status, description: position.description ?? "",
    }), "Position status updated")
  }
  const handleDeletePosition = (id: string, title: string) => {
    if (window.confirm('Delete position "' + title + '"?'))
      void runMutation(id, () => deleteProjectPositionApi(projectId, id), "Position deleted")
  }
  const startEditing = (position: ProjectPositionDto) => {
    setEditingPosId(position.position_id); setEditTitle(position.title); setEditCount(position.required_count)
    setEditLevel(position.experience_level); setEditDesc(position.description ?? "")
  }
  const handleSaveEdit = async (id: string) => {
    if (editTitle.trim().length < 2 || editTitle.trim().length > 100 || !Number.isInteger(editCount) || editCount < 1) {
      setError("Position title must have 2–100 characters and headcount must be at least 1."); return
    }
    const position = positions.find(position => position.position_id === id)
    if (!position) return
    if (await runMutation(id, () => updateProjectPositionApi(projectId, id, {
      title: editTitle.trim(), required_count: editCount, experience_level: editLevel, status: position.status, description: editDesc,
    }), "Position details updated")) setEditingPosId(null)
  }
  const handleAddSkill = async (id: string) => {
    if (catalogBlocked || !availableSkills.some(skill => skill.skill_id === selectedSkillId)) { setError("Select an active catalog skill."); return }
    if (await runMutation(id, () => addPositionSkillApi(projectId, id, { skill_id: selectedSkillId, is_required: skillIsRequired }), "Position skill saved")) {
      setActiveSkillPosId(null); setSelectedSkillId("")
    }
  }
  const handleRemoveSkill = (id: string, skillId: string, name: string) => {
    void runMutation(id, () => removePositionSkillApi(projectId, id, skillId), "Removed skill " + name)
  }
  const handleCreateNewPosition = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy.current || catalogBlocked) return
    if (!roles.some(role => role.professional_role_id === newRoleId) || newTitle.trim().length < 2 || newTitle.trim().length > 100 || !Number.isInteger(newCount) || newCount < 1) {
      setError("Choose an active role, a title of 2–100 characters and headcount of at least 1."); return
    }
    setAddingSubmitting(true)
    const success = await runMutation("new", async () => {
      const project = await getProjectByIdApi(projectId)
      await saveProjectEdits(projectId, { ...project, tagline: project.tagline ?? "", color_theme: project.color_theme ?? "indigo" },
        [...project.positions.filter(position => position.position_id !== progress.current.positionIds["manager-new"]).map(position => positionFromDto(position)), {
          id: "manager-new", roleId: newRoleId, role: newTitle, title: newTitle, count: newCount, level: newLevel,
          description: newDescription, status: "open", requiredSkills: [], niceSkills: [],
        }], [], progress.current, () => {})
    }, "Position created")
    setAddingSubmitting(false)
    if (success) {
      progress.current = { positionIds: {} }; setIsAddingPosition(false); setNewRoleId(""); setNewTitle("")
      setNewDescription(""); setNewCount(1)
    }
  }
  const requestClose = () => {
    if (busy.current) return
    if ((isAddingPosition || editingPosId) && !window.confirm("Discard the unsaved position input? Changes already confirmed by the server will remain.")) return
    onClose()
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
    <Modal title={`Manage Positions — ${projectName}`} onClose={requestClose} wide>
      <div className="position-manager-modal">
      <fieldset disabled={busyPosId !== null} style={{ display: "contents", border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {(error || catalogError || catalogLoading) && <div className="info-banner" role={catalogLoading ? "status" : "alert"}>{error || catalogError || "Loading active catalogs…"} <button disabled={busyPosId !== null} onClick={() => { setError(""); setVersion(value => value + 1) }}>Reload</button></div>}
        <div className="position-manager-intro">
          <p>
            Configure open recruitment roles, adjust headcount, change recruitment status (Open,
            Filled, Closed), and manage specific skill expectations.
          </p>
          {!isAddingPosition && (
            <Button variant="secondary" disabled={catalogBlocked || loading || busyPosId !== null} onClick={() => setIsAddingPosition(true)}>
              <Plus size={16} /> Add new position
            </Button>
          )}
        </div>

        {/* Add new position form */}
        {isAddingPosition && (
          <form className="position-create-card panel" onSubmit={handleCreateNewPosition}>
            <div className="position-create-header">
              <h4>
                Add New Position to Project
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
                  disabled={catalogBlocked || Boolean(progress.current.positionIds["manager-new"])}
                  onChange={(e) => {
                    setNewRoleId(e.target.value)
                    const r = roles.find((x) => x.professional_role_id === e.target.value)
                    if (r && !newTitle) setNewTitle(r.name)
                  }}
                  required
                >
                  <option value="">Select an active role</option>
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
                disabled={addingSubmitting || catalogBlocked || busyPosId !== null}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingSubmitting || catalogBlocked || busyPosId !== null}>
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
              const isBusy = busyPosId !== null
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
                          <Briefcase size={13} /> {roles.find(role => role.professional_role_id === pos.role_id)?.name ?? "Role unavailable"} (read-only)
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
                          disabled={catalogBlocked || !availableSkills.some(skill => skill.skill_id === selectedSkillId) || isBusy}
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
          <Button variant="secondary" disabled={busyPosId !== null} onClick={requestClose}>
            Close
          </Button>
        </div>
      </fieldset>
      </div>
    </Modal>
  )
}
