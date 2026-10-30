import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, Link, useBlocker } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Eye,
  Briefcase,
  Code2,
  Palette,
  Cpu,
  Info,
  Clock,
  Check,
  X,
  AlertCircle,
  Users,
  Layers,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import { getStoredToken } from "../../services/apiClient"
import { bindCreatedPositions, createProjectOnce, positionFromDto, projectErrorMessage, saveProjectEdits, validatePositionCatalog, type ProjectDraftPosition, type ProjectSaveProgress } from "../../services/projectEditor.service"
import type { ProjectDetailDto, ProjectDifficultyLevel, UpdateProjectRequest } from "../../types/project"
import { getProfessionalRolesApi, getSkillsApi } from "../../services/catalog.service"
import {
  getProjectByIdApi,
  mapProjectDetailToUiProject,
  toApiDifficulty,
} from "../../services/projects.service"
import type { CatalogSkill, ProfessionalRole, SelectedSkill } from "../../types/catalog"
import SkillPickerDialog from "./SkillPickerDialog"
import SkillIcon from "../onboarding/SkillIcon"
import AiWritingDialog from "./AiWritingDialog"
import FullPreviewDialog from "./FullPreviewDialog"
import { UnsavedChangesDialog } from "./UnsavedChangesDialog"
import { SaveConfirmDialog } from "./SaveConfirmDialog"
import { addCalendarDays, formatClosingDate, useVietnamToday, validFutureDate, type DeadlineMode } from "../../services/recruitmentDeadline"

export type FormPositionItem = ProjectDraftPosition

export interface ProjectFormProps {
  mode: "create" | "edit"
  initialProject?: Project
  initialDetail?: ProjectDetailDto
}

type FormSection = "big-picture" | "people-skills" | "commitment"
const FORM_STEPS: FormSection[] = ["big-picture", "people-skills", "commitment"]
type StepErrors = Partial<Record<"name" | "tagline" | "description" | "goals" | "category" | "positions" | "capacity" | "role" | "title" | "count" | "skills" | "hours" | "duration" | "deadline", string>>

const PROJECT_TYPES = [
  "AI & Machine Learning",
  "Cloud & DevOps",
  "Web Application",
  "Mobile App",
  "Open Source",
  "Social Impact",
]

const DURATION_OPTIONS = [
  "1-2 months",
  "3 months",
  "3-6 months",
  "6+ months",
]

const EXPERIENCE_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
]

interface DraftFields {
  name?: string
  tagline?: string
  jd?: string
  goals?: string
  type?: string
  hours?: number
  durationMonths?: number
  durationEdited?: boolean
  capacity?: number
  difficulty?: ProjectDifficultyLevel
  positionsList?: FormPositionItem[]
  wizardStep?: FormSection
  deadlineMode?: DeadlineMode
  deadlineDate?: string
  deadlineEdited?: boolean
}

function hasDraftChanges(
  draft: DraftFields | null | undefined,
  detail: ProjectDetailDto | undefined,
  project: Project | undefined,
): boolean {
  if (!draft || !detail) return false
  if ((draft.name ?? '').trim() !== (detail.name ?? '').trim()) return true
  if ((draft.tagline ?? '').trim() !== (detail.tagline ?? '').trim()) return true
  if ((draft.jd ?? '').trim() !== (detail.description ?? '').trim()) return true
  if (draft.type && draft.type !== detail.category) return true
  if (typeof draft.hours === 'number' && draft.hours !== detail.expected_commitment_hours) return true
  if (typeof draft.capacity === 'number' && draft.capacity !== detail.max_team_capacity) return true
  if (draft.difficulty && draft.difficulty !== detail.difficulty_level) return true

  const detailGoals = (detail.goals ?? []).join('\n').trim()
  if ((draft.goals ?? '').trim() !== detailGoals) return true

  if (draft.deadlineEdited && draft.deadlineDate && detail.recruitment_closing_date && draft.deadlineDate !== detail.recruitment_closing_date) {
    return true
  }

  if (draft.durationEdited && typeof draft.durationMonths === 'number') {
    const durMatch = detail.duration ? detail.duration.match(/\d+/) : null
    const originalMonths = durMatch ? parseInt(durMatch[0], 10) : 3
    if (draft.durationMonths !== originalMonths) return true
  }

  const draftPos = draft.positionsList ?? []
  const detailPos = detail.positions ?? []
  if (draftPos.length !== detailPos.length) return true

  for (let i = 0; i < draftPos.length; i++) {
    const dp = draftPos[i]
    const sp = detailPos[i]
    if (!dp || !sp) return true
    if ((dp.title ?? '').trim() !== (sp.title ?? '').trim()) return true
    if (dp.roleId !== sp.role_id) return true
    if (dp.count !== sp.required_count) return true
    if (dp.level !== sp.experience_level) return true

    const dpReq = (dp.requiredSkills || []).map((s) => s.skill_id).sort().join(',')
    const spReq = (sp.skills || []).filter((s) => s.is_required).map((s) => s.skill_id).sort().join(',')
    if (dpReq !== spReq) return true

    const dpNice = (dp.niceSkills || []).map((s) => s.skill_id).sort().join(',')
    const spNice = (sp.skills || []).filter((s) => !s.is_required).map((s) => s.skill_id).sort().join(',')
    if (dpNice !== spNice) return true
  }

  return false
}

export function ProjectForm({ mode, initialProject, initialDetail }: ProjectFormProps) {
  const isWizard = mode === "create"
  const navigate = useNavigate()
  const { setProjects, profile, authUser, notify } = useTindy()
  const draftKey = `tindy-project-draft:${authUser?.user_id}:${initialProject?.id ?? "new"}`
  const [restored] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(draftKey) || "null") as { fields: { name: string; tagline: string; jd: string; goals: string; type: string; hours: number; durationMonths: number; durationEdited?: boolean; capacity: number; difficulty: ProjectDifficultyLevel; positionsList: FormPositionItem[]; wizardStep?: FormSection; deadlineMode?: DeadlineMode; deadlineDate?: string; deadlineEdited?: boolean }; progress: ProjectSaveProgress } | null } catch { return null }
  })
  const [activeSection, setActiveSection] = useState<FormSection>(
    isWizard && restored?.fields.wizardStep && FORM_STEPS.includes(restored.fields.wizardStep)
      ? restored.fields.wizardStep : "big-picture",
  )
  const stepIndex = FORM_STEPS.indexOf(activeSection)
  const [stepErrors, setStepErrors] = useState<StepErrors>({})

  // Form fields
  const [name, setName] = useState(restored?.fields.name ?? initialDetail?.name ?? initialProject?.name ?? "")
  const [tagline, setTagline] = useState(restored?.fields.tagline ?? initialDetail?.tagline ?? initialProject?.tagline ?? "")
  const [jd, setJd] = useState(restored?.fields.jd ?? initialDetail?.description ?? initialProject?.description ?? "")
  const [goals, setGoals] = useState(restored?.fields.goals ?? initialDetail?.goals?.join("\n") ?? initialProject?.goals?.join("\n") ?? "")
  const [type, setType] = useState(restored?.fields.type ?? initialDetail?.category ?? initialProject?.type ?? "Web Application")
  const parseInitialMonths = (durStr?: string): number => {
    if (!durStr) return 3
    const matched = durStr.match(/\d+/)
    return matched ? parseInt(matched[0], 10) : 3
  }

  const [hours, setHours] = useState(restored?.fields.hours ?? initialDetail?.expected_commitment_hours ?? initialProject?.hours ?? 10)
  const [durationMonths, setDurationMonthsState] = useState<number>(() =>
    restored?.fields.durationMonths ?? parseInitialMonths(initialDetail?.duration ?? initialProject?.duration),
  )
  const [durationChanged, setDurationChanged] = useState(restored?.fields.durationEdited ?? false)
  const setDurationMonths = (value: number) => { setDurationChanged(true); setDurationMonthsState(value) }

  const durationString = useMemo(() => {
    if (!durationChanged && initialDetail) return initialDetail.duration
    if (!durationMonths || durationMonths <= 0) return "0 months"
    return `${durationMonths} month${durationMonths !== 1 ? "s" : ""}`
  }, [durationMonths, durationChanged, initialDetail])
  const members = initialDetail?.current_team_size ?? 1
  const [capacity, setCapacity] = useState(restored?.fields.capacity ?? initialDetail?.max_team_capacity ?? 5)
  const [difficulty, setDifficulty] = useState<ProjectDifficultyLevel>(restored?.fields.difficulty ?? initialDetail?.difficulty_level ?? "intermediate")
  const [confirmed, setConfirmed] = useState(false)
  const today = useVietnamToday()
  const [deadlineMode, setDeadlineMode] = useState<DeadlineMode>(restored?.fields.deadlineMode ?? (initialDetail ? "custom" : "14"))
  const [deadlineDate, setDeadlineDate] = useState(restored?.fields.deadlineDate ?? initialDetail?.recruitment_closing_date ?? addCalendarDays(today, 14))
  const [deadlineEdited, setDeadlineEdited] = useState(restored?.fields.deadlineEdited ?? false)
  const closingDate = deadlineMode === "custom" ? deadlineDate : addCalendarDays(today, Number(deadlineMode))
  const deadlineChanged = mode === "create" || deadlineEdited
  const [submitting, setSubmitting] = useState(false)

  // Positions list
  const [positionsList, setPositionsList] = useState<FormPositionItem[]>(() =>
    restored?.fields.positionsList ?? initialDetail?.positions.map(position => positionFromDto(position)) ?? [])
  const progressRef = useRef<ProjectSaveProgress>(restored?.progress ?? { projectId: initialDetail?.project_id, positionIds: {} })
  const submittingRef = useRef(false)
  const savedRef = useRef(false)
  const [saveError, setSaveError] = useState("")
  const [serverState, setServerState] = useState<ProjectDetailDto | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState("")
  const [catalogVersion, setCatalogVersion] = useState(0)
  const isDirtyRef = useRef(false)

  const persistDraft = () => {
    if (savedRef.current) return
    if (mode === "edit" && !isDirtyRef.current) return
    try { sessionStorage.setItem(draftKey, JSON.stringify({ fields: { name, tagline, jd, goals, type, hours, durationMonths, durationEdited: durationChanged, capacity, difficulty, positionsList, wizardStep: activeSection, deadlineMode, deadlineDate, deadlineEdited }, progress: progressRef.current })) } catch {}
  }
  useEffect(() => { persistDraft() }, [name, tagline, jd, goals, type, hours, durationMonths, durationChanged, capacity, difficulty, positionsList, activeSection, deadlineMode, deadlineDate, deadlineEdited, today])

  // Active position tab index
  const [activePosIndex, setActivePosIndex] = useState<number>(0)

  // Safe current position
  const currentPosIndex = Math.min(
    Math.max(0, activePosIndex),
    Math.max(0, positionsList.length - 1),
  )
  const currentPos = positionsList.length > 0 ? (positionsList[currentPosIndex] || positionsList[0]) : null

  // Catalog data
  const [catalogRoles, setCatalogRoles] = useState<ProfessionalRole[]>([])
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([])

  // Dialog states
  const [showAiDialog, setShowAiDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false)
  const [skillPickerState, setSkillPickerState] = useState<{
    open: boolean
    posIndex: number
    mode: "required" | "nice"
  } | null>(null)

  // Tracking dirty state
  const [isDirty, setIsDirty] = useState(() => {
    if (mode === "create") {
      return Boolean(restored?.fields.name || restored?.fields.jd || restored?.fields.positionsList?.length)
    }
    const hasChanges = hasDraftChanges(restored?.fields, initialDetail, initialProject)
    if (!hasChanges && restored) {
      try {
        sessionStorage.removeItem(draftKey)
      } catch {}
    }
    return hasChanges
  })
  isDirtyRef.current = isDirty
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !savedRef.current && (isDirty || submittingRef.current) && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (isDirty || submittingRef.current) { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [isDirty])
  const initialSnapshotRef = useRef<string>("")

  useEffect(() => {
    const controller = new AbortController()
    setCatalogLoading(true)
    setCatalogError("")
    Promise.all([getProfessionalRolesApi(undefined, controller.signal, true), getSkillsApi(undefined, undefined, controller.signal, true)])
      .then(([roles, skills]) => {
        if (controller.signal.aborted) return
        setCatalogRoles(roles)
        setCatalogSkills(skills)
        if (!roles.length || !skills.length) setCatalogError("The active role and skill catalogs must be available before saving.")
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setCatalogError(projectErrorMessage(error)) })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    return () => controller.abort()
  }, [catalogVersion])
  const selectionError = catalogLoading || catalogError ? null : validatePositionCatalog(positionsList, catalogRoles, catalogSkills)
  const saveBlocked = catalogLoading || Boolean(catalogError) || Boolean(selectionError)

  // Create initial snapshot once
  useEffect(() => {
    const currentData = JSON.stringify({
      name,
      tagline,
      jd,
      goals,
      type,
      hours,
      duration: durationString,
      closingDate,
      members,
      positionsList,
    })
    if (!initialSnapshotRef.current) {
      initialSnapshotRef.current = currentData
    }
  }, [])

  // Check dirty and reset confirmation if data changes
  const handleFieldChange = () => {
    setIsDirty(true)
    setStepErrors({})
    setSaveError("")
    if (confirmed) {
      setConfirmed(false)
    }
  }

  // Handle keydown for number inputs:
  // 1. Replaces default '0' immediately when user types 1-9
  // 2. Prevents leading zeros ('00')
  // 3. Blocks exponents ('e', 'E') and signs ('+', '-')
  const handleNumberKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    setter: (val: number) => void,
    max = 999,
  ) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault()
      return
    }

    const currentVal = e.currentTarget.value
    if (/^[1-9]$/.test(e.key) && (currentVal === "0" || currentVal === "")) {
      e.preventDefault()
      const val = Math.min(max, parseInt(e.key, 10))
      setter(val)
      e.currentTarget.value = String(val)
      handleFieldChange()
      return
    }

    if (e.key === "0" && (currentVal === "0" || currentVal === "")) {
      e.preventDefault()
    }
  }

  // Handle number input: defaults to 0 when cleared, replaces 0 with the first typed digit
  const handleNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: number) => void,
    max = 999,
  ) => {
    handleFieldChange()
    const rawVal = e.target.value
    if (rawVal === "" || rawVal === "-") {
      setter(0)
      e.target.value = "0"
      return
    }
    // Remove leading zeros so if user types over "0", e.g. "05" -> 5
    const digits = rawVal.replace(/\D/g, "")
    if (!digits || digits === "0") {
      setter(0)
      e.target.value = "0"
      return
    }
    const clean = digits.replace(/^0+/, "")
    const num = parseInt(clean || "0", 10)
    const finalVal = Math.min(max, isNaN(num) ? 0 : num)
    setter(finalVal)
    e.target.value = String(finalVal)
  }

  // Total open positions across all roles
  const totalOpenings = useMemo(() => {
    return positionsList.reduce((acc, p) => acc + (Number(p.count) || 1), 0)
  }, [positionsList])

  // Auto-synced technology stack (deduplicated across all roles)
  const autoSyncedTechStack = useMemo(() => {
    const map = new Map<string, SelectedSkill>()
    for (const pos of positionsList) {
      for (const s of pos.requiredSkills) {
        const key = (s.name || s.skill_id).toLowerCase()
        if (!map.has(key)) map.set(key, s)
      }
      for (const s of pos.niceSkills) {
        const key = (s.name || s.skill_id).toLowerCase()
        if (!map.has(key)) map.set(key, s)
      }
    }
    return Array.from(map.values())
  }, [positionsList])

  const isManualScrollingRef = useRef(false)
  const manualScrollTimerRef = useRef<number | undefined>(undefined)

  // Accurate scroll tracking for sticky nav (smooth both downwards and upwards)
  useEffect(() => {
    if (isWizard) return
    let ticking = false
    const handleScroll = () => {
      if (isManualScrollingRef.current) return
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Bottom of page clamp check: if scrolled to the very bottom, activate last section
          const isAtBottom =
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 60
          if (isAtBottom) {
            setActiveSection("commitment")
            ticking = false
            return
          }

          const sec2 = document.getElementById("section-people-skills")
          const sec3 = document.getElementById("section-commitment")

          if (!sec2 || !sec3) {
            ticking = false
            return
          }

          // Offset accounts for sticky topbar (~65px) + sticky section nav (~55px) + threshold
          const offset = 180
          const top3 = sec3.getBoundingClientRect().top
          const top2 = sec2.getBoundingClientRect().top

          if (top3 <= offset) {
            setActiveSection("commitment")
          } else if (top2 <= offset) {
            setActiveSection("people-skills")
          } else {
            setActiveSection("big-picture")
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (manualScrollTimerRef.current) clearTimeout(manualScrollTimerRef.current)
    }
  }, [isWizard])

  // Position management
  const handleAddPosition = () => {
    handleFieldChange()
    const newPos: FormPositionItem = {
      id: "draft-" + crypto.randomUUID(), roleId: "", role: "Select a role", title: "", description: "",
      count: 1, level: "intermediate", status: "open", requiredSkills: [], niceSkills: [],
    }

    setPositionsList((prev) => [...prev, newPos])
    setActivePosIndex(positionsList.length)

  }

  const handleUpdatePosition = (
    index: number,
    patch: Partial<FormPositionItem>,
  ) => {
    handleFieldChange()
    setPositionsList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    )
  }

  const handleRemovePosition = (indexToRemove: number) => {
    const target = positionsList[indexToRemove]
    if (!target) return
    if (
      target.requiredSkills.length > 0 ||
      target.description.trim().length > 10
    ) {
      if (
        !window.confirm(
          `Are you sure you want to remove "${target.title || target.role}"? Its skills and deliverables will be deleted.`,
        )
      ) {
        return
      }
    }
    handleFieldChange()
    setPositionsList((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    if (activePosIndex >= indexToRemove && activePosIndex > 0) {
      setActivePosIndex((prev) => prev - 1)
    }
    notify(`Removed from draft: "${target.title || target.role}"`)
  }

  // Remove individual skill chip from a position
  const handleRemoveSkill = (
    posIndex: number,
    skillId: string,
    group: "required" | "nice",
  ) => {
    handleFieldChange()
    setPositionsList((prev) =>
      prev.map((pos, idx) => {
        if (idx !== posIndex) return pos
        if (group === "required") {
          return {
            ...pos,
            requiredSkills: pos.requiredSkills.filter((s) => s.skill_id !== skillId),
          }
        }
        return {
          ...pos,
          niceSkills: pos.niceSkills.filter((s) => s.skill_id !== skillId),
        }
      }),
    )
  }

  // Apply skills from picker
  const handleApplySkillsFromPicker = (
    selected: SelectedSkill[],
    removedFromOpposite: string[],
  ) => {
    if (!skillPickerState) return
    handleFieldChange()
    const { posIndex, mode: pickerMode } = skillPickerState
    setPositionsList((prev) =>
      prev.map((pos, idx) => {
        if (idx !== posIndex) return pos
        if (pickerMode === "required") {
          const removedSet = new Set(removedFromOpposite.map((n) => n.toLowerCase()))
          const cleanNice = pos.niceSkills.filter(
            (s) => !removedSet.has(s.skill_id.toLowerCase()),
          )
          return {
            ...pos,
            requiredSkills: selected,
            niceSkills: cleanNice,
          }
        } else {
          const removedSet = new Set(removedFromOpposite.map((n) => n.toLowerCase()))
          const cleanReq = pos.requiredSkills.filter(
            (s) => !removedSet.has(s.skill_id.toLowerCase()),
          )
          return {
            ...pos,
            niceSkills: selected,
            requiredSkills: cleanReq,
          }
        }
      }),
    )
    setSkillPickerState(null)
  }

  // Quality Checklist computations
  const checklist = useMemo(() => {
    const hasNameAndTagline = name.trim().length >= 3 && tagline.trim().length >= 10
    const hasDescription = jd.trim().length >= 20
    const hasGoals = goals.split("\n").filter((g) => g.trim().length > 0).length >= 1
    const hasValidRoles =
      positionsList.length >= 1 &&
      positionsList.every((p) => p.title.trim().length >= 2 && p.requiredSkills.length >= 1)
    const hasCommitment = hours >= 1 && hours <= 40 && durationMonths >= 1
    const hasConfirmed = confirmed

    const totalSteps = 6
    const completedSteps = [
      hasNameAndTagline,
      hasDescription,
      hasGoals,
      hasValidRoles,
      hasCommitment,
      hasConfirmed,
    ].filter(Boolean).length

    return {
      hasNameAndTagline,
      hasDescription,
      hasGoals,
      hasValidRoles,
      hasCommitment,
      hasConfirmed,
      completedSteps,
      totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
    }
  }, [name, tagline, jd, goals, positionsList, hours, durationMonths, confirmed])

  const validateWizardStep = (section: FormSection) => {
    const errors: StepErrors = {}
    let positionIndex: number | undefined
    if (section === "big-picture") {
      if (name.trim().length < 3 || name.trim().length > 150) errors.name = "Enter a project name between 3 and 150 characters."
      if (tagline.trim().length > 255) errors.tagline = "Keep the tagline within 255 characters."
      if (jd.trim().length < 20) errors.description = "Describe your project in at least 20 characters."
      if (!goals.split("\n").some(goal => goal.trim())) errors.goals = "Add at least one goal for your team."
      if (!type.trim()) errors.category = "Choose a project type."
    } else if (section === "people-skills") {
      if (!positionsList.length) errors.positions = "Add at least one position before continuing."
      if (!Number.isInteger(capacity) || capacity < Math.max(1, members)) errors.capacity = "Capacity must be at least the current member count and at least 1."
      if (catalogLoading || catalogError) errors.positions = catalogError || "Wait for the active role and skill catalogs to load."
      if (!catalogLoading && !catalogError) {
        for (const [index, position] of positionsList.entries()) {
          const positionErrors: StepErrors = {}
          if (!catalogRoles.some(role => role.professional_role_id === position.roleId)) positionErrors.role = "Select an available role from the catalog."
          if (position.title.trim().length < 2 || position.title.trim().length > 100) positionErrors.title = "Enter a position title between 2 and 100 characters."
          if (!Number.isInteger(position.count) || position.count < 1 || position.count > 10) positionErrors.count = "Enter a whole number of openings between 1 and 10."
          if (!position.requiredSkills.length) positionErrors.skills = "Select at least one required skill."
          const catalogValidation = validatePositionCatalog([position], catalogRoles, catalogSkills)
          if (catalogValidation && !positionErrors.role) positionErrors.skills = catalogValidation
          if (Object.keys(positionErrors).length) {
            Object.assign(errors, positionErrors)
            positionIndex = index
            break
          }
        }
      }
    } else {
      if (!Number.isInteger(hours) || hours < 1 || hours > 40) errors.hours = "Enter between 1 and 40 whole hours per week."
      if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 36) errors.duration = "Enter a duration between 1 and 36 whole months."
      if (deadlineChanged && !validFutureDate(closingDate, today)) errors.deadline = "Choose a future closing date, earliest tomorrow in Vietnam."
    }
    return { errors, positionIndex }
  }

  const showStepErrors = (section: FormSection, result: ReturnType<typeof validateWizardStep>) => {
    setStepErrors(result.errors)
    setActiveSection(section)
    if (result.positionIndex !== undefined) setActivePosIndex(result.positionIndex)
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.project-unified-form [aria-invalid="true"]')?.focus()
    })
  }

  const goToWizardStep = (section: FormSection) => {
    if (submittingRef.current || section === activeSection) return
    const targetIndex = FORM_STEPS.indexOf(section)
    if (targetIndex > stepIndex) {
      for (const previous of FORM_STEPS.slice(0, targetIndex)) {
        const result = validateWizardStep(previous)
        if (Object.keys(result.errors).length) { showStepErrors(previous, result); return }
      }
    }
    setStepErrors({})
    setActiveSection(section)
  }

  const slidePane0Ref = useRef<HTMLDivElement | null>(null)
  const slidePane1Ref = useRef<HTMLDivElement | null>(null)
  const slidePane2Ref = useRef<HTMLDivElement | null>(null)
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!isWizard) return
    const panes = [slidePane0Ref.current, slidePane1Ref.current, slidePane2Ref.current]
    const activePane = panes[stepIndex]
    if (!activePane) return

    setContainerHeight(activePane.offsetHeight)

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        if (activePane) {
          setContainerHeight(activePane.offsetHeight)
        }
      })
      observer.observe(activePane)
      return () => observer.disconnect()
    }
  }, [stepIndex, isWizard, positionsList, jd, goals, name, tagline])

  const previousWizardSection = useRef(activeSection)
  useEffect(() => {
    if (!isWizard || previousWizardSection.current === activeSection) return
    previousWizardSection.current = activeSection
    const frame = window.requestAnimationFrame(() => {
      const focusTarget = document.querySelector<HTMLElement>('.project-unified-form [aria-invalid="true"]')
        ?? document.getElementById("project-step-title")
      focusTarget?.focus({ preventScroll: true })
      const navigation = document.querySelector(".project-section-nav")
      if (navigation) {
        const topOffset = 85
        const elementPosition = navigation.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - topOffset
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth",
        })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeSection, isWizard])

  const validationProps = (field: keyof StepErrors) => ({
    "aria-invalid": stepErrors[field] ? true as const : undefined,
    "aria-describedby": stepErrors[field] ? `project-error-${field}` : undefined,
  })
  const fieldError = (field: keyof StepErrors) => stepErrors[field]
    ? <span id={`project-error-${field}`} className="project-field-error" role="alert">{stepErrors[field]}</span> : null

  // Scroll to section helper
  const scrollTo = (elementId: string) => {
    const sectionKeyMap: Record<string, "big-picture" | "people-skills" | "commitment"> = {
      "section-big-picture": "big-picture",
      "section-people-skills": "people-skills",
      "section-commitment": "commitment",
    }
    if (isWizard) {
      goToWizardStep(sectionKeyMap[elementId] ?? "commitment")
      return
    }
    if (sectionKeyMap[elementId]) {
      setActiveSection(sectionKeyMap[elementId])
      isManualScrollingRef.current = true
      if (manualScrollTimerRef.current) clearTimeout(manualScrollTimerRef.current)
      manualScrollTimerRef.current = window.setTimeout(() => {
        isManualScrollingRef.current = false
      }, 500)
    }

    const el = document.getElementById(elementId)
    if (el) {
      const topOffset = 145
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - topOffset
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      })
    }
  }

  // Handle Form Submission - validates and triggers confirmation dialog
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (submittingRef.current) return
    if (!isWizard && deadlineChanged && !validFutureDate(closingDate, today)) {
      showStepErrors("commitment", { errors: { deadline: "Choose a future closing date, earliest tomorrow in Vietnam." }, positionIndex: undefined })
      return
    }
    if (isWizard) {
      if (stepIndex < FORM_STEPS.length - 1) { goToWizardStep(FORM_STEPS[stepIndex + 1]); return }
      for (const section of FORM_STEPS) {
        const result = validateWizardStep(section)
        if (Object.keys(result.errors).length) { showStepErrors(section, result); return }
      }
      if (saveBlocked) { setSaveError(selectionError || catalogError || "Wait for the catalog to finish loading."); return }
      setShowSaveConfirmDialog(true)
      return
    }
    if (saveBlocked) { setSaveError(selectionError || catalogError || "Wait for the catalog to finish loading."); return }
    if (!name.trim() || name.trim().length < 3 || name.trim().length > 150) {
      notify("Project name must be between 3 and 150 characters.")
      scrollTo("section-big-picture")
      return
    }

    if (tagline.trim().length > 255) {
      notify("Project tagline must be at most 255 characters.")
      scrollTo("section-big-picture")
      return
    }

    if (!jd.trim() || jd.trim().length < 20) {
      notify(`Project description must be at least 20 characters (currently ${jd.trim().length}).`)
      scrollTo("section-big-picture")
      return
    }

    const invalidTitle = positionsList.find(p => p.title.trim().length < 2 || p.title.trim().length > 100)
    if (invalidTitle) { setSaveError("Position titles must be between 2 and 100 characters."); return }
    if (!Number.isInteger(capacity) || capacity < Math.max(1, members)) { setSaveError("Maximum team capacity must be at least the actual member count and at least 1."); return }
    const missingSkillPos = positionsList.find((p) => p.requiredSkills.length === 0)
    if (missingSkillPos) {
      const idx = positionsList.indexOf(missingSkillPos)
      if (idx !== -1) setActivePosIndex(idx)
      notify(
        `Please add at least 1 required skill for "${missingSkillPos.title || missingSkillPos.role}".`,
      )
      scrollTo("section-people-skills")
      return
    }

    const zeroCountPos = positionsList.find((p) => !Number.isInteger(p.count) || p.count <= 0)
    if (zeroCountPos) {
      const idx = positionsList.indexOf(zeroCountPos)
      if (idx !== -1) setActivePosIndex(idx)
      notify(
        `Number of openings for "${zeroCountPos.title || zeroCountPos.role}" must be at least 1.`,
      )
      scrollTo("section-people-skills")
      return
    }

    if (!members || members <= 0) {
      notify("Current team members must be at least 1.")
      scrollTo("section-people-skills")
      return
    }

    if (!Number.isInteger(hours) || hours < 1 || hours > 40) {
      notify("Weekly commitment must be at least 1 hour per week (cannot be 0).")
      scrollTo("section-commitment")
      document.getElementById("hours-input")?.focus()
      return
    }

    if (!durationMonths || durationMonths <= 0) {
      notify("Project duration must be at least 1 month (cannot be 0).")
      scrollTo("section-commitment")
      document.getElementById("duration-input")?.focus()
      return
    }

    // All validations passed -> Prompt confirmation modal
    setShowSaveConfirmDialog(true)
  }

  // Execute Save after user confirms in modal
  const executeSave = async () => {
    if (submittingRef.current || saveBlocked) return
    submittingRef.current = true
    setSubmitting(true)
    setSaveError("")
    setShowSaveConfirmDialog(false)
    const request: UpdateProjectRequest = {
      ...(deadlineChanged ? { recruitment_closing_date: closingDate } : {}),
      name: name.trim(), tagline: tagline.trim(), description: jd.trim(), category: type,
      difficulty_level: difficulty, expected_commitment_hours: hours, duration: durationString,
      max_team_capacity: capacity, color_theme: initialDetail?.color_theme ?? "indigo",
      goals: goals.split("\n").map(goal => goal.trim()).filter(Boolean),
    }
    try {
      if (!getStoredToken()) throw new Error("Sign in again before saving. Your draft is kept in this tab.")
      let id = progressRef.current.projectId
      if (!id && !progressRef.current.creationAttempt) progressRef.current.creationDraftKeys = positionsList.map(position => position.id)
      if (!id) id = await createProjectOnce({
        ...request, initial_team_size: 1,
        positions: positionsList.map(position => ({
          role_id: position.roleId, title: position.title.trim(), description: position.description.trim(),
          required_count: position.count, experience_level: toApiDifficulty(position.level),
          skills: [...position.requiredSkills.map(skill => ({ skill_id: skill.skill_id, is_required: true })),
            ...position.niceSkills.map(skill => ({ skill_id: skill.skill_id, is_required: false }))],
        })),
      }, progressRef.current, persistDraft)
      let detail: ProjectDetailDto
      if (mode === "edit") {
        detail = await saveProjectEdits(id, request, positionsList, initialDetail?.positions.map(position => position.position_id) ?? [], progressRef.current, persistDraft)
      } else {
        const created = await getProjectByIdApi(id)
        bindCreatedPositions(created, progressRef.current)
        persistDraft()
        detail = await saveProjectEdits(id, request, positionsList, Object.values(progressRef.current.positionIds), progressRef.current, persistDraft)
      }
      const mapped = mapProjectDetailToUiProject(detail)
      setProjects(old => [...old.filter(project => project.id !== id), mapped])
      savedRef.current = true
      sessionStorage.removeItem(draftKey)
      setIsDirty(false)
      navigate("/leader", { state: { savedSuccess: true, projectName: detail.name, isCreate: mode === "create" }, replace: true })
    } catch (error: unknown) {
      let message = projectErrorMessage(error)
      if (progressRef.current.projectId) {
        message = "Some changes may already be saved. " + message + " Retry to apply only the remaining changes."
        try {
          const detail = await getProjectByIdApi(progressRef.current.projectId)
          setServerState(detail)
          const mapped = mapProjectDetailToUiProject(detail)
          setProjects(old => [...old.filter(project => project.id !== mapped.id), mapped])
        } catch { message += " The saved state could not be refreshed." }
      }
      setSaveError(message)
      persistDraft()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // Handle Cancel action
  const handleCancel = () => {
    if (submittingRef.current) return
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      try { sessionStorage.removeItem(draftKey) } catch {}
      navigate("/leader")
    }
  }

  // Render role icon helper
  const getRoleIcon = (title: string, role: string) => {
    const text = `${title} ${role}`.toLowerCase()
    if (text.includes("design") || text.includes("ui") || text.includes("ux")) {
      return <Palette size={16} />
    }
    if (text.includes("ai") || text.includes("data") || text.includes("machine")) {
      return <Bot size={16} />
    }
    if (text.includes("cloud") || text.includes("devops") || text.includes("infra")) {
      return <Layers size={16} />
    }
    if (text.includes("front") || text.includes("web") || text.includes("mobile")) {
      return <Code2 size={16} />
    }
    return <Briefcase size={16} />
  }

  const initials = useMemo(() => {
    if (!name.trim()) return "UP"
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  }, [name])

  return (
    <div className={`project-form-container ${isWizard ? "project-form-wizard" : ""}`}>
      {/* 1. Header & Context Bar */}
      <div className="project-form-header">
        <div className="project-form-header-main">
          <button
            type="button"
            className="back-link project-back-btn"
            onClick={handleCancel}
          >
            <ArrowLeft size={16} />
            <span>Leader workspace</span>
          </button>
          <div className="project-form-title-wrap">
            <h1 className="project-form-title">
              {mode === "create"
                ? "Bring your next idea to life."
                : "Make room for great teammates."}
            </h1>
            <p className="project-form-subtitle">
              {mode === "create"
                ? "A clear project brief helps the right teammates find you and get excited to build together."
                : "Update your project brief and positions to match your team’s evolving goals."}
            </p>
          </div>
        </div>

        <div className="project-form-header-actions">
          <button
            type="button"
            className="action-btn secondary preview-trigger-btn"
            onClick={() => setShowPreviewDialog(true)}
          >
            <Eye size={16} />
            <span>Preview project</span>
          </button>
        </div>
      </div>

      {/* Project Context Bar */}
      <div className="project-context-bar">
        <div className="project-context-left">
          <div className="project-context-avatar">{initials}</div>
          <div className="project-context-info">
            <div className="project-context-name">
              {name.trim() ? name : "Untitled project"}
            </div>
            <div className="project-context-sub">
              {mode === "create" ? "New project" : "Project settings"}
            </div>
          </div>
        </div>
        <div className="project-context-right">
          {mode === "create" ? (
            <span className="project-status-badge unpublished">
              <span className="status-dot gray" />
              Not published
            </span>
          ) : (
            <span className="project-status-badge recruiting">
              <span className="status-dot green" />
              Recruiting
            </span>
          )}
        </div>
      </div>

      {/* 2. Main 2-Column Desktop Layout */}
      <div className="project-form-layout">
        {/* Left Column: Form (~70%) */}
        <div className="project-form-main-col">
          {/* Sticky Section Navigation */}
          <nav className="project-section-nav" aria-label={isWizard ? "Project creation steps" : "Form sections"}>
            {/* Sliding active pill indicator */}
            <div
              className={`section-nav-slider slider-pos-${
                activeSection === "big-picture" ? 0 : activeSection === "people-skills" ? 1 : 2
              }`}
              aria-hidden="true"
            />

            <button
              type="button"
              className={`section-nav-tab ${
                activeSection === "big-picture" ? "active" : ""
              }`}
              aria-current={isWizard && activeSection === "big-picture" ? "step" : undefined}
              disabled={submitting}
              onClick={() => scrollTo("section-big-picture")}
            >
              <span className={activeSection === "big-picture" ? "nav-badge-circle" : "nav-num-plain"}>
                1
              </span>
              <span className="nav-tab-label">The big picture</span>
            </button>

            <button
              type="button"
              className={`section-nav-tab ${
                activeSection === "people-skills" ? "active" : ""
              }`}
              aria-current={isWizard && activeSection === "people-skills" ? "step" : undefined}
              disabled={submitting}
              onClick={() => scrollTo("section-people-skills")}
            >
              <span className={activeSection === "people-skills" ? "nav-badge-circle" : "nav-num-plain"}>
                2
              </span>
              <span className="nav-tab-label">People & skills</span>
            </button>

            <button
              type="button"
              className={`section-nav-tab ${
                activeSection === "commitment" ? "active" : ""
              }`}
              aria-current={isWizard && activeSection === "commitment" ? "step" : undefined}
              disabled={submitting}
              onClick={() => scrollTo("section-commitment")}
            >
              <span className={activeSection === "commitment" ? "nav-badge-circle" : "nav-num-plain"}>
                3
              </span>
              <span className="nav-tab-label">{isWizard ? "Commitment & review" : "Commitment"}</span>
            </button>
          </nav>

          <form onSubmit={handleSubmit} noValidate={isWizard} className="project-unified-form">
            {(catalogLoading || catalogError || selectionError || saveError) && <div className="info-banner" role={catalogLoading ? "status" : "alert"}>
              {saveError || catalogError || selectionError || "Loading active roles and skills…"}
              {(catalogError || selectionError) && <button type="button" onClick={() => setCatalogVersion(value => value + 1)}>Reload catalog</button>}
            </div>}
            {serverState && saveError && <details className="info-banner"><summary>Saved state refreshed — your pending edits are kept</summary><p>{serverState.name}: {serverState.positions.length} saved positions, {serverState.current_team_size} actual members.</p></details>}
            <fieldset disabled={submitting} style={{ display: "contents", border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div
              className={isWizard ? "wizard-slide-viewport" : "project-sections-stack"}
              style={isWizard && containerHeight ? { height: `${containerHeight}px` } : undefined}
            >
              <div
                className={isWizard ? "wizard-slide-track" : undefined}
                style={isWizard ? { transform: `translateX(-${stepIndex * 100}%)` } : undefined}
              >
                {/* PANE 0: The big picture */}
                <div
                  ref={slidePane0Ref}
                  className={isWizard ? "wizard-slide-pane" : undefined}
                  aria-hidden={isWizard ? stepIndex !== 0 : undefined}
                  inert={isWizard && stepIndex !== 0}
                >
                  <section
                    id="section-big-picture"
                    className={`project-form-section-card ${isWizard ? "project-step-panel" : ""}`}
                  >
              <div className="section-card-header">
                <div className="section-card-header-badge">01</div>
                <div>
                  <h2 id={isWizard ? "project-step-title" : undefined} tabIndex={isWizard ? -1 : undefined} className="section-card-title">The big picture</h2>
                  <p className="section-card-subtitle">
                    Tell your future teammates what you’re building.
                  </p>
                </div>
              </div>

              <div className="section-card-body">
                {/* Project Name */}
                <div className="field-group">
                  <label className="field-label" htmlFor="project-name-input">
                    Project name <span className="required-star">*</span>
                  </label>
                  <input
                    id="project-name-input"
                    {...validationProps("name")}
                    className="field-input"
                    placeholder="e.g. Campus Peer Learning Platform"
                    maxLength={150}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      handleFieldChange()
                    }}
                    required
                  />
                  {fieldError("name")}
                  <span className="field-helper">
                    Choose a recognizable, concise name that describes your project.
                  </span>
                </div>

                {/* Project Tagline */}
                <div className="field-group">
                  <div className="field-label-row">
                    <label className="field-label" htmlFor="project-tagline-input">
                      Project tagline
                    </label>
                    <span className="field-counter">{tagline.length}/140</span>
                  </div>
                  <input
                    id="project-tagline-input"
                    {...validationProps("tagline")}
                    className="field-input"
                    placeholder="e.g. Connecting university students to build real-world software together"
                    maxLength={140}
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value)
                      handleFieldChange()
                    }}
                  />
                  {fieldError("tagline")}
                  <span className="field-helper">
                    Shown on your project card. A compelling one-sentence hook for discoverability.
                  </span>
                </div>

                {/* What are you building? (Description) */}
                <div className="field-group">
                  <label className="field-label" htmlFor="project-desc-input">
                    What are you building? <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="project-desc-input"
                    {...validationProps("description")}
                    className="field-textarea"
                    rows={5}
                    placeholder="Describe the problem, your proposed solution, and who benefits. Share why you are excited to build this..."
                    value={jd}
                    onChange={(e) => {
                      setJd(e.target.value)
                      handleFieldChange()
                    }}
                    required
                  />
                  {fieldError("description")}
                  <span className="field-helper">
                    Provide enough context so teammates understand the mission and why their contribution matters.
                  </span>

                  {/* AI Writing Assistance Callout */}
                  <div className="ai-assist-callout">
                    <div className="ai-assist-icon">
                      <Bot size={18} />
                    </div>
                    <div className="ai-assist-content">
                      <div className="ai-assist-title">A little help getting started?</div>
                      <div className="ai-assist-desc">
                        Generate a structured student project draft, then customize it with your own voice.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ai-assist-btn"
                      onClick={() => setShowAiDialog(true)}
                    >
                      <Bot size={14} />
                      <span>Help me write</span>
                    </button>
                  </div>
                </div>

                {/* What will your team achieve? (Goals) */}
                <div className="field-group">
                  <label className="field-label" htmlFor="project-goals-input">
                    What will your team achieve? <span className="required-star">*</span>
                  </label>
                  <textarea
                    id="project-goals-input"
                    {...validationProps("goals")}
                    className="field-textarea"
                    rows={4}
                    placeholder="Ship functional MVP with responsive dashboard&#10;Implement end-to-end user authentication and profile management&#10;Deploy prototype on cloud with CI/CD automation"
                    value={goals}
                    onChange={(e) => {
                      setGoals(e.target.value)
                      handleFieldChange()
                    }}
                  />
                  {fieldError("goals")}
                  <span className="field-helper">
                    One goal per line. Small, specific milestones work best.
                  </span>
                </div>

                {/* Project Type */}
                <div className="field-group">
                  <label className="field-label" htmlFor="project-type-select">
                    Project type
                  </label>
                  <select
                    id="project-type-select"
                    {...validationProps("category")}
                    className="field-select"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value)
                      handleFieldChange()
                    }}
                  >
                    {!PROJECT_TYPES.includes(type) && <option value={type}>{type}</option>}
                    {PROJECT_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                  {fieldError("category")}
                </div>

              </div>
            </section>
                </div>

                {/* PANE 1: The people & the fit */}
                <div
                  ref={slidePane1Ref}
                  className={isWizard ? "wizard-slide-pane" : undefined}
                  aria-hidden={isWizard ? stepIndex !== 1 : undefined}
                  inert={isWizard && stepIndex !== 1}
                >
                  <section
                    id="section-people-skills"
                    className={`project-form-section-card ${isWizard ? "project-step-panel" : ""}`}
                  >
              <div className="section-card-header">
                <div className="section-card-header-badge">02</div>
                <div>
                  <h2 id={isWizard ? "project-step-title" : undefined} tabIndex={isWizard ? -1 : undefined} className="section-card-title">The people & the fit</h2>
                  <p className="section-card-subtitle">
                    Great teams are built on complementary strengths.
                  </p>
                </div>
              </div>

              <div className="section-card-body">
                {fieldError("positions")}
                {/* Team Summary Metric Bar */}
                <div className="team-summary-banner">
                  <div className="team-summary-item">
                    <div className="team-summary-label">Current members</div>
                    <small>{mode === "create" ? "A new project starts with its leader." : "Active members from the saved project."}</small>
                    <div className="team-summary-input-wrap">
                      <Users size={16} />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="team-summary-number-input"
                        value={members}
                        readOnly
                        aria-label="Current members"
                      />
                    </div>
                  </div>

                  <div className="team-summary-divider" />

                  <div className="team-summary-item">
                    <div className="team-summary-label">Total open positions</div>
                    <div className="team-summary-stat">
                      <span className="stat-number">{totalOpenings}</span>
                      <span className="stat-desc">
                        opening{totalOpenings > 1 ? "s" : ""} across {positionsList.length} role{positionsList.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="team-summary-divider" />

                  <div className="team-summary-item">
                    <div className="team-summary-label">Total team capacity</div>
                    {fieldError("capacity")}
                    <div className="team-summary-stat">
                      <input aria-label="Maximum team capacity" type="number" min={Math.max(1, members)} className="team-summary-number-input" value={capacity} {...validationProps("capacity")} onChange={event => { setCapacity(Number(event.target.value)); handleFieldChange() }} />
                      <span className="stat-desc">members target</span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Positions Tab Bar */}
                <div className="positions-tabs-bar-wrapper">
                  <div className="positions-tabs-header-row">
                    <span className="positions-tabs-header-title">
                      Open roles ({positionsList.length})
                    </span>
                    <span className="positions-tabs-counter-desc">
                      {positionsList.length > 0
                        ? "Select a role tab to view and edit its details"
                        : 'Click "+ Add position" to specify roles for your project'}
                    </span>
                  </div>

                  <div className="positions-horizontal-tabs-nav" role="tablist" aria-label="Open positions">
                    {positionsList.map((pos, idx) => {
                      const isActive = idx === currentPosIndex
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={`position-tab-btn ${isActive ? "active" : ""}`}
                          onClick={() => { setActivePosIndex(idx); setStepErrors({}) }}
                        >
                          <span className="position-tab-icon">
                            {getRoleIcon(pos.title, pos.role)}
                          </span>
                          <span className="position-tab-title">
                            {pos.title.trim() ? pos.title : pos.role}
                          </span>
                          <span className="position-tab-badge">
                            {pos.count}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="position-tab-delete-btn"
                            title="Delete position"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemovePosition(idx)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation()
                                handleRemovePosition(idx)
                              }
                            }}
                          >
                            <X size={12} />
                          </span>
                        </button>
                      )
                    })}

                    {/* Inline Add Position Button */}
                    <button
                      type="button"
                      className="position-tab-add-btn"
                      onClick={handleAddPosition}
                      title="Add another open position"
                    >
                      <Plus size={14} />
                      <span>Add position</span>
                    </button>
                  </div>
                </div>

                {/* Active Position Details Panel or Empty State */}
                {positionsList.length === 0 ? (
                  <div className="positions-empty-card">
                    <div className="positions-empty-icon">
                      <Briefcase size={26} />
                    </div>
                    <div className="positions-empty-content">
                      <h3 className="positions-empty-title">No open positions added yet</h3>
                      <p className="positions-empty-desc">
                        Define the roles and required skill sets you need for this project. Teammates will discover your project and apply based on these positions.
                      </p>
                      <button
                        type="button"
                        className="action-btn primary empty-add-role-btn"
                        onClick={handleAddPosition}
                      >
                        <Plus size={15} />
                        <span>Add first position</span>
                      </button>
                    </div>
                  </div>
                ) : currentPos ? (
                  <div className="active-position-panel" key={currentPosIndex}>
                      <div className="active-position-panel-heading">
                        <div className="active-position-panel-heading-left">
                          <div className="panel-role-icon">
                            {getRoleIcon(currentPos.title, currentPos.role)}
                          </div>
                          <div>
                            <div className="panel-role-title-text">
                              {currentPos.title.trim() ? currentPos.title : currentPos.role}
                            </div>
                            <div className="panel-role-pills">
                              <span className="role-pill openings">
                                {currentPos.count} opening{currentPos.count > 1 ? "s" : ""}
                              </span>
                              <span className="role-pill level">{currentPos.level}</span>
                              {currentPos.requiredSkills.length > 0 && (
                                <span className="role-pill skills-count">
                                  {currentPos.requiredSkills.length} required skill{currentPos.requiredSkills.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="remove-role-btn"
                          onClick={() => handleRemovePosition(currentPosIndex)}
                        >
                          <Trash2 size={14} />
                          <span>Remove position</span>
                        </button>
                      </div>

                    <div className="form-grid-2">
                      {/* Role Category */}
                      <div className="field-group">
                        <label className="field-label">
                          Role category <span className="required-star">*</span>
                        </label>
                        <select
                          className="field-select"
                          id="position-role-input"
                          {...validationProps("role")}
                          value={currentPos.roleId}
                          disabled={Boolean(currentPos.positionId || progressRef.current.positionIds[currentPos.id]) || catalogLoading || Boolean(catalogError)}
                          onChange={(e) => {
                            handleUpdatePosition(currentPosIndex, {
                              roleId: e.target.value,
                              role: catalogRoles.find(role => role.professional_role_id === e.target.value)?.name || "",
                              title:
                                currentPos.title === currentPos.role
                                  ? catalogRoles.find(role => role.professional_role_id === e.target.value)?.name || ""
                                  : currentPos.title,
                            })
                          }}
                        >
                          <option value="">Select an active role</option>
                          {currentPos.roleId && !catalogRoles.some(role => role.professional_role_id === currentPos.roleId) && <option value={currentPos.roleId}>Unavailable role ({currentPos.roleId})</option>}
                          {catalogRoles.map(role => <option key={role.professional_role_id} value={role.professional_role_id}>{role.name}</option>)}
                        </select>
                        {fieldError("role")}
                        {(currentPos.positionId || progressRef.current.positionIds[currentPos.id]) && <small>The role of an existing position cannot be changed.</small>}
                      </div>

                      {/* Position Title */}
                      <div className="field-group">
                        <label className="field-label">
                          Position title <span className="required-star">*</span>
                        </label>
                        <input
                          className="field-input"
                          id="position-title-input"
                          {...validationProps("title")}
                          value={currentPos.title}
                          placeholder="e.g. Lead Frontend Engineer"
                          onChange={(e) =>
                            handleUpdatePosition(currentPosIndex, { title: e.target.value })
                          }
                          required
                        />
                        {fieldError("title")}
                      </div>
                    </div>

                    <div className="form-grid-2">
                      {/* Openings count */}
                      <div className="field-group">
                        <label className="field-label">
                          Number of openings <span className="required-star">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          className="field-input"
                          id="position-count-input"
                          {...validationProps("count")}
                          value={currentPos.count}
                          onFocus={(e) => {
                            if (e.target.value === "0") e.target.select()
                          }}
                          onMouseUp={(e) => {
                            if (e.currentTarget.value === "0") e.currentTarget.select()
                          }}
                          onKeyDown={(e) => {
                            handleNumberKeyDown(
                              e,
                              (val) => handleUpdatePosition(currentPosIndex, { count: val }),
                              10,
                            )
                          }}
                          onChange={(e) => {
                            handleNumberInput(
                              e,
                              (val) => handleUpdatePosition(currentPosIndex, { count: val }),
                              10,
                            )
                          }}
                          required
                        />
                        {fieldError("count")}
                      </div>

                      {/* Experience Level */}
                      <div className="field-group">
                        <label className="field-label">Experience level</label>
                        <select
                          className="field-select"
                          value={toApiDifficulty(currentPos.level)}
                          onChange={(e) =>
                            handleUpdatePosition(currentPosIndex, { level: e.target.value })
                          }
                        >
                          {EXPERIENCE_LEVELS.map((lvl) => (
                            <option key={lvl} value={toApiDifficulty(lvl)}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* What will this teammate work on? */}
                    <div className="field-group">
                      <label className="field-label">
                        What will this teammate work on?
                      </label>
                      <textarea
                        className="field-textarea"
                        rows={3}
                        placeholder="Key deliverables, responsibilities, and learning opportunities for this role..."
                        value={currentPos.description}
                        onChange={(e) =>
                          handleUpdatePosition(currentPosIndex, {
                            description: e.target.value,
                          })
                        }
                      />
                      <span className="field-helper">
                        Describe the day-to-day work, features they'll own, or skills they'll get to practice.
                      </span>
                    </div>

                    {/* Skills Section: Required & Nice to have */}
                    <div className="role-skills-wrapper" role="group" tabIndex={-1} {...validationProps("skills")}>
                      {fieldError("skills")}
                      {/* Required Skills */}
                      <div className="role-skill-subgroup required-skills-box">
                        <div className="skill-subgroup-header">
                          <div>
                            <div className="skill-subgroup-title indigo-text">
                              Required skills
                              <span className="required-star"> *</span>
                            </div>
                            <div className="skill-subgroup-desc">
                              Skills teammates should already have before joining
                            </div>
                          </div>
                          <button
                            type="button"
                            className="skill-add-trigger-btn indigo-btn"
                            onClick={() =>
                              setSkillPickerState({
                                open: true,
                                posIndex: currentPosIndex,
                                mode: "required",
                              })
                            }
                          >
                            <Plus size={14} />
                            <span>Add skill</span>
                          </button>
                        </div>

                        <div className="skill-chips-row">
                          {currentPos.requiredSkills.length > 0 ? (
                            currentPos.requiredSkills.map((s) => (
                              <span key={s.skill_id} className="skill-tag required-tag">
                                <SkillIcon name={s.name || s.skill_id} size={15} />
                                <span className="tag-name">{s.name || s.skill_id}</span>
                                <button
                                  type="button"
                                  className="tag-remove-btn"
                                  onClick={() =>
                                    handleRemoveSkill(currentPosIndex, s.skill_id, "required")
                                  }
                                  title={`Remove ${s.name || s.skill_id}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="skill-empty-note">
                              No required skills selected yet. At least 1 is required.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nice to have Skills */}
                      <div className="role-skill-subgroup nice-skills-box">
                        <div className="skill-subgroup-header">
                          <div>
                            <div className="skill-subgroup-title teal-text">
                              Nice to have
                            </div>
                            <div className="skill-subgroup-desc">
                              A bonus, not a barrier to joining the team
                            </div>
                          </div>
                          <button
                            type="button"
                            className="skill-add-trigger-btn teal-btn"
                            onClick={() =>
                              setSkillPickerState({
                                open: true,
                                posIndex: currentPosIndex,
                                mode: "nice",
                              })
                            }
                          >
                            <Plus size={14} />
                            <span>Add skill</span>
                          </button>
                        </div>

                        <div className="skill-chips-row">
                          {currentPos.niceSkills.length > 0 ? (
                            currentPos.niceSkills.map((s) => (
                              <span key={s.skill_id} className="skill-tag nice-tag">
                                <SkillIcon name={s.name || s.skill_id} size={15} />
                                <span className="tag-name">{s.name || s.skill_id}</span>
                                <button
                                  type="button"
                                  className="tag-remove-btn"
                                  onClick={() =>
                                    handleRemoveSkill(currentPosIndex, s.skill_id, "nice")
                                  }
                                  title={`Remove ${s.name || s.skill_id}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="skill-empty-note">
                              Optional bonus skills or technologies to learn together.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Auto-synced Tech Stack */}
                <div className="field-group tech-stack-summary-group">
                  <div className="tech-stack-header-row">
                    <label className="field-label">Technology stack</label>
                    <span className="auto-synced-badge">
                      <Check size={12} /> Auto-synced
                    </span>
                  </div>
                  {autoSyncedTechStack.length > 0 ? (
                    <div className="tech-stack-chips">
                      {autoSyncedTechStack.map((s) => (
                        <span key={s.skill_id} className="tech-stack-chip">
                          <SkillIcon name={s.name || s.skill_id} size={14} />
                          <span>{s.name || s.skill_id}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="tech-stack-empty-state">
                      Add skills to roles above to automatically build your project stack.
                    </div>
                  )}
                  <span className="field-helper">
                    Automatically consolidated and deduplicated from all role skill sets.
                  </span>
                </div>
              </div>
            </section>
                </div>

                {/* PANE 2: A realistic commitment & review */}
                <div
                  ref={slidePane2Ref}
                  className={isWizard ? "wizard-slide-pane" : undefined}
                  aria-hidden={isWizard ? stepIndex !== 2 : undefined}
                  inert={isWizard && stepIndex !== 2}
                >
                  <section
                    id="section-commitment"
                    className={`project-form-section-card ${isWizard ? "project-step-panel" : ""}`}
                  >
              <div className="section-card-header">
                <div className="section-card-header-badge">03</div>
                <div>
                  <h2 id={isWizard ? "project-step-title" : undefined} tabIndex={isWizard ? -1 : undefined} className="section-card-title">{isWizard ? "Commitment & review" : "A realistic commitment"}</h2>
                  <p className="section-card-subtitle">
                    Make space for learning, life, and building together.
                  </p>
                </div>
              </div>

              <div className="section-card-body">
                <div className="form-grid-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="hours-input">
                      Hours per week <span className="required-star">*</span>
                    </label>
                    <input
                      id="hours-input"
                    {...validationProps("hours")}
                      type="number"
                      min={1}
                      max={40}
                      className="field-input"
                      value={hours}
                      onFocus={(e) => {
                        if (e.target.value === "0") e.target.select()
                      }}
                      onMouseUp={(e) => {
                        if (e.currentTarget.value === "0") e.currentTarget.select()
                      }}
                      onKeyDown={(e) => {
                        handleNumberKeyDown(e, setHours, 40)
                      }}
                      onChange={(e) => {
                        handleNumberInput(e, setHours, 40)
                      }}
                      required
                    />
                  {fieldError("hours")}
                    <span className="field-helper">
                      Typical student projects target 8-15 hours/week.
                    </span>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="duration-input">
                      Project duration (months) <span className="required-star">*</span>
                    </label>
                    <input
                      id="duration-input"
                    {...validationProps("duration")}
                      type="number"
                      min={1}
                      max={36}
                      className="field-input"
                      value={durationMonths}
                      onFocus={(e) => {
                        if (e.target.value === "0") e.target.select()
                      }}
                      onMouseUp={(e) => {
                        if (e.currentTarget.value === "0") e.currentTarget.select()
                      }}
                      onKeyDown={(e) => {
                        handleNumberKeyDown(e, setDurationMonths, 36)
                      }}
                      onChange={(e) => {
                        handleNumberInput(e, setDurationMonths, 36)
                      }}
                      required
                    />
                  {fieldError("duration")}
                    <span className="field-helper">
                      Estimated sprint timeline in months (e.g. 1, 3, 6 months).
                    </span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="recruitment-deadline-mode">Recruitment deadline</label>
                  <select id="recruitment-deadline-mode" className="field-select" value={deadlineMode} onChange={event => {
                    setDeadlineMode(event.target.value as DeadlineMode); setDeadlineEdited(true); handleFieldChange()
                  }}>
                    <option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="custom">Custom Date</option>
                  </select>
                  {deadlineMode === "custom" && <><label className="field-label" htmlFor="recruitment-closing-date">Closing date (Vietnam time)</label>
                    <input id="recruitment-closing-date" type="date" className="field-input" min={addCalendarDays(today, 1)} max="9999-12-30" value={deadlineDate}
                      {...validationProps("deadline")} onChange={event => { setDeadlineDate(event.target.value); setDeadlineEdited(true); handleFieldChange() }} /></>}
                  {fieldError("deadline")}
                  <strong>Recruitment closes on {formatClosingDate(closingDate)} (Vietnam time)</strong>
                  <span className="field-helper">Applications close at midnight after this date. Project duration is separate.</span>
                </div>
                {/* Guidance callout */}
                <div className="commitment-guidance-box">
                  <div className="guidance-icon">
                    <Clock size={18} />
                  </div>
                  <div className="guidance-text">
                    <strong>A sustainable pace makes a stronger team.</strong> You can discuss exact schedules, study breaks, and exam weeks together once you connect.
                  </div>
                </div>
              </div>
            </section>

            <div className="field-group"><label className="field-label" htmlFor="project-difficulty">Project difficulty</label><select id="project-difficulty" className="field-select" value={difficulty} onChange={event => { setDifficulty(event.target.value as ProjectDifficultyLevel); handleFieldChange() }}><option value="beginner_friendly">Beginner-friendly</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
            {isWizard && <section className="project-form-section-card project-review-summary" aria-label="Project review">
              <div className="section-heading"><h3>Ready to publish?</h3><button type="button" className="action-btn secondary" onClick={() => setShowPreviewDialog(true)}><Eye size={15} /> Review full brief</button></div>
              <dl>
                <div><dt>Project</dt><dd>{name}</dd></div>
                <div><dt>Category</dt><dd>{type}</dd></div>
                <div><dt>Recruitment</dt><dd>{positionsList.length} role{positionsList.length === 1 ? "" : "s"} · {totalOpenings} opening{totalOpenings === 1 ? "" : "s"}</dd></div>
                <div><dt>Team</dt><dd>1 leader · up to {capacity} members</dd></div>
                <div><dt>Commitment</dt><dd>{hours} hours/week · {durationString}</dd></div>
                <div><dt>Recruitment deadline</dt><dd>{formatClosingDate(closingDate)} (Vietnam time)</dd></div>
                <div><dt>Skills</dt><dd>{autoSyncedTechStack.map(skill => skill.name ?? skill.skill_id).join(", ")}</dd></div>
              </dl>
              <p className="field-helper">Your project is created only after you confirm Publish.</p>
            </section>}
            {/* SECTION 04: Review confirmation */}
            <div id="section-confirmation" className="confirmation-review-card">
              <label className="confirmation-checkbox-label">
                <input
                  type="checkbox"
                  className="confirmation-checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <div className="confirmation-text-group">
                  <span className="confirmation-main-text">
                    I’ve reviewed the project brief and confirm it’s ready for future teammates to see.
                  </span>
                  <span className="confirmation-sub-text">
                    AI-assisted content is always yours to review, adjust, and edit.
                  </span>
                </div>
              </label>
            </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar Card */}
            <div className="project-form-actions-card">
              <div className="actions-card-status">
                <span className="status-dot green" />
                <div className="status-labels-group">
                  <span className="status-main-label">
                    {isWizard
                      ? `Step ${stepIndex + 1} of 3`
                      : isDirty
                      ? "Unsaved edits"
                      : "Changes saved"}
                  </span>
                  <span className="status-sub-label">
                    {isWizard
                      ? (stepIndex < 2 ? "Your input is kept between steps" : "Review and publish your project")
                      : isDirty
                      ? "Click save to persist changes"
                      : "All edits up to date"}
                  </span>
                </div>
              </div>

              <div className="actions-card-buttons">
                <button
                  type="button"
                  className="action-btn secondary cancel-btn"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </button>

                {isWizard && stepIndex > 0 && <button type="button" className="action-btn secondary wizard-back-btn" onClick={() => goToWizardStep(FORM_STEPS[stepIndex - 1])} disabled={submitting}><ArrowLeft size={16} /> Back</button>}
                {isWizard && stepIndex < 2 ? <button type="submit" className="action-btn primary continue-btn" disabled={submitting || (activeSection === "people-skills" && (catalogLoading || Boolean(catalogError)))}>
                  Continue <ArrowRight size={16} />
                </button> : (
                <button
                  type="submit"
                  className={`action-btn primary submit-btn ${
                    mode === "edit" && !isDirty ? "disabled" : ""
                  }`}
                  disabled={submitting || saveBlocked || (mode === "edit" && !isDirty)}
                  title={mode === "edit" && !isDirty ? "No changes to save" : undefined}
                >
                  <span>
                    {submitting
                      ? "Saving..."
                      : mode === "create"
                      ? (progressRef.current.creationAttempt ? "Check save status" : "Publish project")
                      : "Save changes"}
                  </span>
                  <ArrowRight size={16} />
                </button>
                )}
              </div>
            </div>
            </fieldset>
          </form>
        </div>

        {/* Right Column: Live Sidebar Preview (~30%) */}
        <aside className="project-form-sidebar-col">
          <div className="sticky-sidebar-wrapper">
            {/* Card 1: Teammate's First Look Preview */}
            <div className="sidebar-preview-card">
              <div className="preview-card-header-badge">
                A TEAMMATE'S FIRST LOOK
              </div>

              <div className="preview-content-box">
                <div className="preview-top-row">
                  <div className="preview-avatar">{initials}</div>
                  <div className="preview-title-wrap">
                    <div className="preview-name">
                      {name.trim() ? name : "Untitled project"}
                    </div>
                    <div className="preview-leader">By {profile.name || "Leader"}</div>
                  </div>
                </div>

                <div className="preview-tagline">
                  {tagline.trim()
                    ? tagline
                    : "A short, engaging tagline will appear right here on your card."}
                </div>

                <div className="preview-chips-row">
                  <span className="preview-meta-pill type-pill">{type}</span>
                  <span className="preview-meta-pill time-pill">
                    <Clock size={12} /> {hours}h / week
                  </span>
                  <span className="preview-meta-pill dur-pill">{durationString}</span>
                </div>

                <div className="preview-positions-section">
                  <div className="preview-section-title">
                    Open positions ({totalOpenings})
                  </div>
                  <div className="preview-roles-list">
                    {positionsList.map((pos) => (
                      <div key={pos.id} className="preview-role-row">
                        <div className="preview-role-info">
                          <span className="role-name">{pos.title || pos.role}</span>
                          <span className="role-count">
                            {pos.count} opening{pos.count > 1 ? "s" : ""} · {pos.level}
                          </span>
                        </div>
                        {pos.requiredSkills.length > 0 && (
                          <div className="preview-role-skills">
                            {pos.requiredSkills.slice(0, 3).map((s) => (
                              <span key={s.skill_id} className="preview-skill-tiny">
                                <SkillIcon name={s.name || s.skill_id || ""} size={11} />
                                <span>{s.name}</span>
                              </span>
                            ))}
                            {pos.requiredSkills.length > 3 && (
                              <span className="preview-skill-more">
                                +{pos.requiredSkills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="preview-full-modal-btn"
                  onClick={() => setShowPreviewDialog(true)}
                >
                  <Eye size={15} />
                  <span>Preview full project brief</span>
                </button>
              </div>
            </div>

            {/* Card 2: A Brief Worth Joining Checklist */}
            <div className="sidebar-checklist-card">
              <div className="checklist-header">
                <div className="checklist-title">A brief worth joining</div>
                <div className="checklist-progress-text">
                  {checklist.completedSteps} of {checklist.totalSteps} complete
                </div>
              </div>

              <div className="checklist-progress-bar-bg">
                <div
                  className="checklist-progress-bar-fill"
                  style={{ width: `${checklist.percentage}%` }}
                />
              </div>

              <div className="checklist-items-list">
                <button
                  type="button"
                  className={`checklist-item-btn ${
                    checklist.hasNameAndTagline ? "completed" : "pending"
                  }`}
                  onClick={() => scrollTo("section-big-picture")}
                >
                  {checklist.hasNameAndTagline ? (
                    <CheckCircle2 size={16} className="item-icon-done" />
                  ) : (
                    <Circle size={16} className="item-icon-pending" />
                  )}
                  <span>Name & descriptive tagline</span>
                </button>

                <button
                  type="button"
                  className={`checklist-item-btn ${
                    checklist.hasDescription ? "completed" : "pending"
                  }`}
                  onClick={() => scrollTo("section-big-picture")}
                >
                  {checklist.hasDescription ? (
                    <CheckCircle2 size={16} className="item-icon-done" />
                  ) : (
                    <Circle size={16} className="item-icon-pending" />
                  )}
                  <span>Detailed project description</span>
                </button>

                <button
                  type="button"
                  className={`checklist-item-btn ${
                    checklist.hasGoals ? "completed" : "pending"
                  }`}
                  onClick={() => scrollTo("section-big-picture")}
                >
                  {checklist.hasGoals ? (
                    <CheckCircle2 size={16} className="item-icon-done" />
                  ) : (
                    <Circle size={16} className="item-icon-pending" />
                  )}
                  <span>At least 1 concrete milestone</span>
                </button>

                <button
                  type="button"
                  className={`checklist-item-btn ${
                    checklist.hasValidRoles ? "completed" : "pending"
                  }`}
                  onClick={() => scrollTo("section-people-skills")}
                >
                  {checklist.hasValidRoles ? (
                    <CheckCircle2 size={16} className="item-icon-done" />
                  ) : (
                    <Circle size={16} className="item-icon-pending" />
                  )}
                  <span>Role with required skills</span>
                </button>

                <button
                  type="button"
                  className={`checklist-item-btn ${
                    checklist.hasCommitment ? "completed" : "pending"
                  }`}
                  onClick={() => scrollTo("section-commitment")}
                >
                  {checklist.hasCommitment ? (
                    <CheckCircle2 size={16} className="item-icon-done" />
                  ) : (
                    <Circle size={16} className="item-icon-pending" />
                  )}
                  <span>Hours & duration set</span>
                </button>

                <button
                  type="button"
                  className={`checklist-item-btn ${
                    checklist.hasConfirmed ? "completed" : "pending"
                  }`}
                  onClick={() => scrollTo("section-confirmation")}
                >
                  {checklist.hasConfirmed ? (
                    <CheckCircle2 size={16} className="item-icon-done" />
                  ) : (
                    <Circle size={16} className="item-icon-pending" />
                  )}
                  <span>Review confirmed</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      {/* 1. Skill Picker Dialog */}
      {skillPickerState && (
        <SkillPickerDialog
          isOpen={skillPickerState.open}
          groupMode={skillPickerState.mode}
          roleTitle={
            positionsList[skillPickerState.posIndex]?.title ||
            positionsList[skillPickerState.posIndex]?.role ||
            "Position"
          }
          availableSkills={catalogSkills}
          initialSelected={
            skillPickerState.mode === "required"
              ? positionsList[skillPickerState.posIndex]?.requiredSkills || []
              : positionsList[skillPickerState.posIndex]?.niceSkills || []
          }
          oppositeGroupSkills={
            skillPickerState.mode === "required"
              ? positionsList[skillPickerState.posIndex]?.niceSkills || []
              : positionsList[skillPickerState.posIndex]?.requiredSkills || []
          }
          onClose={() => setSkillPickerState(null)}
          onApply={handleApplySkillsFromPicker}
        />
      )}

      {/* 2. AI Writing Assistance Dialog */}
      <AiWritingDialog
        isOpen={showAiDialog}
        currentDescription={jd}
        projectName={name}
        projectType={type}
        tagline={tagline}
        onClose={() => setShowAiDialog(false)}
        onApplyDraft={(draft: string) => {
          setJd(draft)
          handleFieldChange()
          setShowAiDialog(false)
          notify("Applied AI draft to project description")
        }}
      />

      {/* 3. Full Project Preview Dialog */}
      <FullPreviewDialog
        isOpen={showPreviewDialog}
        mode={mode}
        projectName={name.trim() || "Untitled Project"}
        tagline={tagline.trim() || "No tagline provided yet."}
        description={jd.trim() || "No detailed description provided yet."}
        projectType={type}
        hours={hours}
        duration={durationString}
        currentMembers={members}
        capacity={capacity}
        goalsList={goals.split("\n").map((g) => g.trim()).filter(Boolean)}
        allSkills={autoSyncedTechStack}
        leaderName={profile.name || "Leader"}
        projectColor={initialProject?.color || "indigo"}
        positionsList={positionsList}
        onClose={() => setShowPreviewDialog(false)}
      />

      {/* 4. Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showDiscardDialog || blocker.state === "blocked"}
        onKeepEditing={() => { setShowDiscardDialog(false); if (blocker.state === "blocked") blocker.reset() }}
        onDiscard={() => {
          savedRef.current = true
          sessionStorage.removeItem(draftKey)
          setShowDiscardDialog(false)
          if (blocker.state === "blocked") blocker.proceed()
          else navigate("/leader")
        }}
      />

      {/* 5. Save Confirmation Dialog */}
      <SaveConfirmDialog
        open={showSaveConfirmDialog}
        projectName={name}
        recruitmentClosingDate={formatClosingDate(closingDate)}
        isSubmitting={submitting}
        mode={mode}
        onCancel={() => setShowSaveConfirmDialog(false)}
        onConfirm={executeSave}
      />
    </div>
  )
}
