import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, Link } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
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
import { getProfessionalRolesApi, getSkillsApi } from "../../services/catalog.service"
import {
  createProjectApi,
  isGuid,
  toApiDifficulty,
  updateProjectApi,
} from "../../services/projects.service"
import type { CatalogSkill, ProfessionalRole, SelectedSkill } from "../../types/catalog"
import SkillPickerDialog from "./SkillPickerDialog"
import SkillIcon from "../onboarding/SkillIcon"
import AiWritingDialog from "./AiWritingDialog"
import FullPreviewDialog from "./FullPreviewDialog"
import { UnsavedChangesDialog } from "./UnsavedChangesDialog"

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

export interface ProjectFormProps {
  mode: "create" | "edit"
  initialProject?: Project
}

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

export function ProjectForm({ mode, initialProject }: ProjectFormProps) {
  const navigate = useNavigate()
  const { setProjects, profile, notify } = useTindy()

  // Form fields
  const [name, setName] = useState(initialProject?.name || "")
  const [tagline, setTagline] = useState(initialProject?.tagline || "")
  const [jd, setJd] = useState(initialProject?.description || "")
  const [goals, setGoals] = useState(initialProject?.goals?.join("\n") || "")
  const [type, setType] = useState(initialProject?.type || "Web Application")
  const parseInitialMonths = (durStr?: string): number => {
    if (!durStr) return 3
    const matched = durStr.match(/\d+/)
    return matched ? parseInt(matched[0], 10) : 3
  }

  const [hours, setHours] = useState(initialProject?.hours || 10)
  const [durationMonths, setDurationMonths] = useState<number>(() =>
    parseInitialMonths(initialProject?.duration),
  )

  const durationString = useMemo(() => {
    if (!durationMonths || durationMonths <= 0) return "0 months"
    return `${durationMonths} month${durationMonths !== 1 ? "s" : ""}`
  }, [durationMonths])
  const [members, setMembers] = useState(initialProject?.team || 1)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Positions list
  const [positionsList, setPositionsList] = useState<FormPositionItem[]>(() => {
    if (initialProject?.openPositions && initialProject.openPositions.length > 0) {
      return initialProject.openPositions.map((p, idx) => ({
        id: p.positionId || `pos-${idx + 1}`,
        role: p.role || "Backend Developer",
        title: p.title || p.role || "Backend Developer",
        description: p.description || "",
        count: p.count || 1,
        level: p.level || "Intermediate",
        requiredSkills: (p.requiredSkills || []).map((name) => ({
          skill_id: `skill_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          name,
        })),
        niceSkills: (p.niceSkills || []).map((name) => ({
          skill_id: `skill_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          name,
        })),
      }))
    }
    if (initialProject) {
      const reqNames = initialProject.requiredSkills || initialProject.skills.slice(0, 3) || []
      const niceNames = initialProject.gap || []
      return [
        {
          id: "pos-1",
          role: initialProject.role || "Backend Developer",
          title: initialProject.role || "Backend Developer",
          description: "",
          count: Math.max(1, initialProject.capacity - initialProject.team),
          level: initialProject.difficulty || "Intermediate",
          requiredSkills: reqNames.map((n) => ({
            skill_id: `skill_${n.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
            name: n,
          })),
          niceSkills: niceNames.map((n) => ({
            skill_id: `skill_${n.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
            name: n,
          })),
        },
      ]
    }
    return []
  })

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
  const [skillPickerState, setSkillPickerState] = useState<{
    open: boolean
    posIndex: number
    mode: "required" | "nice"
  } | null>(null)

  // Active section tracking for sticky nav
  const [activeSection, setActiveSection] = useState<"big-picture" | "people-skills" | "commitment">(
    "big-picture",
  )

  // Tracking dirty state
  const [isDirty, setIsDirty] = useState(false)
  const initialSnapshotRef = useRef<string>("")

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

  // Canonicalize initial skills with real catalog GUIDs once loaded
  useEffect(() => {
    if (catalogSkills.length === 0) return
    setPositionsList((prev) =>
      prev.map((pos) => ({
        ...pos,
        requiredSkills: pos.requiredSkills.map((s) => {
          const sName = (s.name || s.skill_id).toLowerCase().trim()
          const found = catalogSkills.find(
            (cs) =>
              cs.name.toLowerCase().trim() === sName ||
              cs.skill_id === s.skill_id ||
              cs.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") ===
                s.skill_id.replace(/^skill_/, ""),
          )
          return found ? { skill_id: found.skill_id, name: found.name } : s
        }),
        niceSkills: pos.niceSkills.map((s) => {
          const sName = (s.name || s.skill_id).toLowerCase().trim()
          const found = catalogSkills.find(
            (cs) =>
              cs.name.toLowerCase().trim() === sName ||
              cs.skill_id === s.skill_id ||
              cs.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") ===
                s.skill_id.replace(/^skill_/, ""),
          )
          return found ? { skill_id: found.skill_id, name: found.name } : s
        }),
      })),
    )
  }, [catalogSkills])

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
  }, [])

  // Position management
  const handleAddPosition = () => {
    handleFieldChange()
    const candidateRoles = [
      "Backend Developer",
      "Frontend Developer",
      "Full-stack Developer",
      "UI/UX Designer",
      "Mobile Developer",
      "AI & Data Engineer",
      "DevOps / Cloud Engineer",
      "QA / Tester",
    ]
    const nextRole =
      candidateRoles.find((r) => !positionsList.some((p) => p.role === r)) ||
      `Developer ${positionsList.length + 1}`

    const newId = `pos-${Date.now()}`
    const newPos: FormPositionItem = {
      id: newId,
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
    notify(`Removed position: "${target.title || target.role}"`)
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
            (s) => !removedSet.has((s.name || s.skill_id).toLowerCase()),
          )
          return {
            ...pos,
            requiredSkills: selected,
            niceSkills: cleanNice,
          }
        } else {
          const removedSet = new Set(removedFromOpposite.map((n) => n.toLowerCase()))
          const cleanReq = pos.requiredSkills.filter(
            (s) => !removedSet.has((s.name || s.skill_id).toLowerCase()),
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

  // Scroll to section helper
  const scrollTo = (elementId: string) => {
    const sectionKeyMap: Record<string, "big-picture" | "people-skills" | "commitment"> = {
      "section-big-picture": "big-picture",
      "section-people-skills": "people-skills",
      "section-commitment": "commitment",
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

  // Handle Form Submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim() || name.trim().length < 3) {
      notify("Project name must be at least 3 characters.")
      scrollTo("section-big-picture")
      return
    }

    if (!tagline.trim() || tagline.trim().length < 10) {
      notify("Please write a short tagline (at least 10 characters) for your project card.")
      scrollTo("section-big-picture")
      return
    }

    if (!jd.trim() || jd.trim().length < 20) {
      notify(`Project description must be at least 20 characters (currently ${jd.trim().length}).`)
      scrollTo("section-big-picture")
      return
    }

    if (positionsList.length === 0) {
      notify("Please add at least one open position before saving or publishing.")
      scrollTo("section-people-skills")
      return
    }

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

    const zeroCountPos = positionsList.find((p) => !p.count || p.count <= 0)
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

    if (!hours || hours <= 0) {
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

    // Auto-confirm on explicit submit click
    if (!confirmed) {
      setConfirmed(true)
    }

    setSubmitting(true)

    const goalList = goals.split("\n").map((g) => g.trim()).filter(Boolean)
    const stackList = autoSyncedTechStack.map((s) => s.name || s.skill_id)
    let finalProjectId = initialProject?.id || `project-${Date.now()}`

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
        if (mode === "edit" && initialProject && isGuid(initialProject.id)) {
          await updateProjectApi(initialProject.id, {
            name,
            tagline: tagline.trim() || undefined,
            description: jd,
            category: type,
            difficulty_level: toApiDifficulty(positionsList[0]?.level || "Intermediate"),
            expected_commitment_hours: hours,
            duration: durationString,
            max_team_capacity: members + totalOpenings,
            color_theme: initialProject.color || "indigo",
            goals: goalList,
          })
        } else if (mode === "create") {
          const created = await createProjectApi({
            name,
            tagline: tagline.trim() || undefined,
            description: jd,
            category: type,
            difficulty_level: toApiDifficulty(positionsList[0]?.level || "Intermediate"),
            expected_commitment_hours: hours,
            duration: durationString,
            initial_team_size: members,
            max_team_capacity: members + totalOpenings,
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
        console.warn("Backend project sync failed; falling back to local save:", err)
      }
    }

    const primaryPos = positionsList[0]
    const savedProject: Project = {
      id: finalProjectId,
      name,
      tagline: tagline.trim() || undefined,
      description: jd,
      type,
      skills: stackList,
      role: primaryPos?.title || primaryPos?.role || "Developer",
      hours,
      duration: durationString,
      difficulty: primaryPos?.level || "Intermediate",
      team: members,
      capacity: members + totalOpenings,
      leader: profile.name,
      initials: name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase() || "PR",
      color: "indigo",
      created: initialProject?.created || Date.now(),
      closing: 14,
      factors: initialProject?.factors || [85, 90, 80, 85, 95],
      goals: goalList,
      requiredSkills: primaryPos?.requiredSkills.map((s) => s.name || s.skill_id) || [],
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
      mode === "edit"
        ? old.map((item) => (item.id === savedProject.id ? savedProject : item))
        : [...old, savedProject],
    )

    setSubmitting(false)
    setIsDirty(false)

    if (mode === "create") {
      notify("Project published · Recruitment is open")
      navigate(`/project/${savedProject.id}/edit`, { replace: true })
    } else {
      notify("Changes saved")
    }
  }

  // Handle Cancel action
  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
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
      return <Sparkles size={16} />
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
    <div className="project-form-container">
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
          <nav className="project-section-nav" aria-label="Form sections">
            <button
              type="button"
              className={`section-nav-tab ${
                activeSection === "big-picture" ? "active" : ""
              }`}
              onClick={() => scrollTo("section-big-picture")}
            >
              {activeSection === "big-picture" ? (
                <span className="nav-badge-circle">1</span>
              ) : (
                <span className="nav-num-plain">1</span>
              )}
              <span className="nav-tab-label">The big picture</span>
            </button>

            <button
              type="button"
              className={`section-nav-tab ${
                activeSection === "people-skills" ? "active" : ""
              }`}
              onClick={() => scrollTo("section-people-skills")}
            >
              {activeSection === "people-skills" ? (
                <span className="nav-badge-circle">2</span>
              ) : (
                <span className="nav-num-plain">2</span>
              )}
              <span className="nav-tab-label">People & skills</span>
            </button>

            <button
              type="button"
              className={`section-nav-tab ${
                activeSection === "commitment" ? "active" : ""
              }`}
              onClick={() => scrollTo("section-commitment")}
            >
              {activeSection === "commitment" ? (
                <span className="nav-badge-circle">3</span>
              ) : (
                <span className="nav-num-plain">3</span>
              )}
              <span className="nav-tab-label">Commitment</span>
            </button>
          </nav>

          <form onSubmit={handleSubmit} className="project-unified-form">
            {/* SECTION 01: The big picture */}
            <section
              id="section-big-picture"
              className="project-form-section-card"
            >
              <div className="section-card-header">
                <div className="section-card-header-badge">01</div>
                <div>
                  <h2 className="section-card-title">The big picture</h2>
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
                    className="field-input"
                    placeholder="e.g. Campus Peer Learning Platform"
                    maxLength={80}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      handleFieldChange()
                    }}
                    required
                  />
                  <span className="field-helper">
                    Choose a recognizable, concise name that describes your project.
                  </span>
                </div>

                {/* Project Tagline */}
                <div className="field-group">
                  <div className="field-label-row">
                    <label className="field-label" htmlFor="project-tagline-input">
                      Project tagline <span className="required-star">*</span>
                    </label>
                    <span className="field-counter">{tagline.length}/140</span>
                  </div>
                  <input
                    id="project-tagline-input"
                    className="field-input"
                    placeholder="e.g. Connecting university students to build real-world software together"
                    maxLength={140}
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value)
                      handleFieldChange()
                    }}
                    required
                  />
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
                  <span className="field-helper">
                    Provide enough context so teammates understand the mission and why their contribution matters.
                  </span>

                  {/* AI Writing Assistance Callout */}
                  <div className="ai-assist-callout">
                    <div className="ai-assist-icon">
                      <Sparkles size={18} />
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
                      <Sparkles size={14} />
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
                    className="field-textarea"
                    rows={4}
                    placeholder="Ship functional MVP with responsive dashboard&#10;Implement end-to-end user authentication and profile management&#10;Deploy prototype on cloud with CI/CD automation"
                    value={goals}
                    onChange={(e) => {
                      setGoals(e.target.value)
                      handleFieldChange()
                    }}
                  />
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
                    className="field-select"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value)
                      handleFieldChange()
                    }}
                  >
                    {PROJECT_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

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
                      Add skills to a role below to automatically build your project stack.
                    </div>
                  )}
                  <span className="field-helper">
                    Automatically consolidated and deduplicated from all role skill sets.
                  </span>
                </div>
              </div>
            </section>

            {/* SECTION 02: The people & the fit */}
            <section
              id="section-people-skills"
              className="project-form-section-card"
            >
              <div className="section-card-header">
                <div className="section-card-header-badge">02</div>
                <div>
                  <h2 className="section-card-title">The people & the fit</h2>
                  <p className="section-card-subtitle">
                    Great teams are built on complementary strengths.
                  </p>
                </div>
              </div>

              <div className="section-card-body">
                {/* Team Summary Metric Bar */}
                <div className="team-summary-banner">
                  <div className="team-summary-item">
                    <div className="team-summary-label">Current members</div>
                    <div className="team-summary-input-wrap">
                      <Users size={16} />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="team-summary-number-input"
                        value={members}
                        onFocus={(e) => {
                          if (e.target.value === "0") e.target.select()
                        }}
                        onMouseUp={(e) => {
                          if (e.currentTarget.value === "0") e.currentTarget.select()
                        }}
                        onKeyDown={(e) => {
                          handleNumberKeyDown(e, setMembers, 20)
                        }}
                        onChange={(e) => {
                          handleNumberInput(e, setMembers, 20)
                        }}
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
                    <div className="team-summary-stat">
                      <span className="stat-number">{members + totalOpenings}</span>
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
                          onClick={() => setActivePosIndex(idx)}
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
                  <div className="active-position-panel">
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
                          value={currentPos.role}
                          onChange={(e) => {
                            handleUpdatePosition(currentPosIndex, {
                              role: e.target.value,
                              title:
                                currentPos.title === currentPos.role
                                  ? e.target.value
                                  : currentPos.title,
                            })
                          }}
                        >
                          {catalogRoles.length > 0 ? (
                            catalogRoles.map((r) => (
                              <option key={r.professional_role_id} value={r.name}>
                                {r.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="Frontend Developer">Frontend Developer</option>
                              <option value="Backend Developer">Backend Developer</option>
                              <option value="Full-stack Developer">Full-stack Developer</option>
                              <option value="UI/UX Designer">UI/UX Designer</option>
                              <option value="AI & Data Engineer">AI & Data Engineer</option>
                              <option value="Mobile Developer">Mobile Developer</option>
                              <option value="DevOps / Cloud Engineer">DevOps / Cloud Engineer</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Position Title */}
                      <div className="field-group">
                        <label className="field-label">
                          Position title <span className="required-star">*</span>
                        </label>
                        <input
                          className="field-input"
                          value={currentPos.title}
                          placeholder="e.g. Lead Frontend Engineer"
                          onChange={(e) =>
                            handleUpdatePosition(currentPosIndex, { title: e.target.value })
                          }
                          required
                        />
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
                      </div>

                      {/* Experience Level */}
                      <div className="field-group">
                        <label className="field-label">Experience level</label>
                        <select
                          className="field-select"
                          value={currentPos.level}
                          onChange={(e) =>
                            handleUpdatePosition(currentPosIndex, { level: e.target.value })
                          }
                        >
                          {EXPERIENCE_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
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
                    <div className="role-skills-wrapper">
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
              </div>
            </section>

            {/* SECTION 03: A realistic commitment */}
            <section
              id="section-commitment"
              className="project-form-section-card"
            >
              <div className="section-card-header">
                <div className="section-card-header-badge">03</div>
                <div>
                  <h2 className="section-card-title">A realistic commitment</h2>
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
                    <span className="field-helper">
                      Estimated sprint timeline in months (e.g. 1, 3, 6 months).
                    </span>
                  </div>
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

            {/* Bottom Action Bar Card */}
            <div className="project-form-actions-card">
              <div className="actions-card-status">
                <span className="status-dot green" />
                <div className="status-labels-group">
                  <span className="status-main-label">
                    {mode === "create"
                      ? "Not published yet"
                      : isDirty
                      ? "Unsaved edits"
                      : "Changes saved"}
                  </span>
                  <span className="status-sub-label">
                    {mode === "create"
                      ? "Publish to save on this device"
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

                <button
                  type="submit"
                  className="action-btn primary submit-btn"
                  disabled={submitting}
                >
                  <span>
                    {submitting
                      ? "Saving..."
                      : mode === "create"
                      ? "Publish project"
                      : "Save changes"}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
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
        goalsList={goals.split("\n").map((g) => g.trim()).filter(Boolean)}
        allSkills={autoSyncedTechStack}
        leaderName={profile.name || "Leader"}
        projectColor={initialProject?.color || "indigo"}
        positionsList={positionsList}
        onClose={() => setShowPreviewDialog(false)}
      />

      {/* 4. Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showDiscardDialog}
        onKeepEditing={() => setShowDiscardDialog(false)}
        onDiscard={() => {
          setShowDiscardDialog(false)
          navigate("/leader")
        }}
      />
    </div>
  )
}
