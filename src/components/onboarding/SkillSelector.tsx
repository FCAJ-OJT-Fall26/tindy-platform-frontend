import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Check, Plus, Search, X } from "lucide-react"
import {
  getSkillCategoriesApi,
  getSkillsApi,
  getCachedCategories,
  getCachedSkills,
} from "../../services"
import type {
  CatalogSkill,
  SelectedSkill,
  SkillCategory,
} from "../../types/catalog"
import { requestErrorMessage } from "./catalogFeedback"
import SkillIcon from "./SkillIcon"

interface Props {
  selected: SelectedSkill[]
  onChange: (skills: SelectedSkill[]) => void
  onValidityChange?: (valid: boolean) => void
  min?: number
  max?: number
  savedSkills?: CatalogSkill[]
  allowInactiveSaved?: boolean
  selectedHeading?: string
  subtitle?: string
}

export default function SkillSelector({
  selected,
  onChange,
  onValidityChange,
  min = 1,
  max = 30,
  savedSkills,
  allowInactiveSaved = false,
  selectedHeading = "Selected skills",
  subtitle,
}: Props) {
  const cachedSkills = getCachedSkills()
  const cachedCategories = getCachedCategories()

  const [categories, setCategories] = useState<SkillCategory[]>(() =>
    cachedCategories
      ? [...cachedCategories].sort((a, b) => a.display_order - b.display_order)
      : [],
  )
  const [allSkills, setAllSkills] = useState<CatalogSkill[]>(() =>
    cachedSkills
      ? [...cachedSkills].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        )
      : [],
  )
  const [results, setResults] = useState<CatalogSkill[]>(() =>
    cachedSkills
      ? [...cachedSkills].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        )
      : [],
  )
  const [categoryId, setCategoryId] = useState("")
  const [search, setSearch] = useState("")
  const [catalogLoading, setCatalogLoading] = useState(() => !cachedSkills)
  const [categoriesLoading, setCategoriesLoading] = useState(
    () => !cachedCategories,
  )
  const [resultsLoading, setResultsLoading] = useState(false)
  const [catalogError, setCatalogError] = useState("")
  const [categoriesError, setCategoriesError] = useState("")
  const [resultsError, setResultsError] = useState("")
  const [catalogRetry, setCatalogRetry] = useState(0)
  const [categoriesRetry, setCategoriesRetry] = useState(0)
  const [resultsRetry, setResultsRetry] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const prevPositionsRef = useRef<Map<string, { left: number; top: number }>>(
    new Map(),
  )
  const categoryCacheRef = useRef<Map<string, CatalogSkill[]>>(new Map())

  // FLIP animation: smoothly transition skill buttons into their alphabetical positions
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".catalog-skill-option"),
    )
    const prevPositions = prevPositionsRef.current
    const currentPositions = new Map<string, { left: number; top: number }>()

    buttons.forEach((btn) => {
      const id = btn.getAttribute("data-skill-id")
      if (id) {
        const rect = btn.getBoundingClientRect()
        currentPositions.set(id, { left: rect.left, top: rect.top })
      }
    })

    if (prevPositions.size > 0) {
      buttons.forEach((btn) => {
        const id = btn.getAttribute("data-skill-id")
        if (!id) return

        const current = currentPositions.get(id)
        const prev = prevPositions.get(id)

        if (prev && current) {
          const deltaX = prev.left - current.left
          const deltaY = prev.top - current.top

          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            btn.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
            btn.style.transition = "none"

            requestAnimationFrame(() => {
              btn.style.transition =
                "transform 0.38s cubic-bezier(0.2, 0.9, 0.3, 1)"
              btn.style.transform = "translate3d(0, 0, 0)"
            })
          }
        } else {
          btn.style.opacity = "0"
          btn.style.transform = "scale(0.85) translateY(6px)"
          btn.style.transition = "none"

          requestAnimationFrame(() => {
            btn.style.transition =
              "transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.25s ease"
            btn.style.transform = "translate3d(0, 0, 0)"
            btn.style.opacity = "1"
          })
        }

        setTimeout(() => {
          btn.style.transform = ""
          btn.style.transition = ""
          btn.style.opacity = ""
        }, 420)
      })
    }

    prevPositionsRef.current = currentPositions
  }, [results])

  useEffect(() => {
    if (categories.length > 0 && categoriesRetry === 0) return
    const controller = new AbortController()
    setCategoriesLoading(true)
    setCategoriesError("")
    getSkillCategoriesApi(controller.signal, categoriesRetry > 0)
      .then((data) => {
        if (!controller.signal.aborted)
          setCategories(
            [...data].sort((a, b) => a.display_order - b.display_order),
          )
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setCategoriesError(requestErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false)
      })
    return () => controller.abort()
  }, [categoriesRetry])

  // Initial catalog load: sort skills alphabetically
  useEffect(() => {
    if (allSkills.length > 0 && catalogRetry === 0) return
    const controller = new AbortController()
    setCatalogLoading(true)
    setCatalogError("")
    getSkillsApi(undefined, undefined, controller.signal, catalogRetry > 0)
      .then((data) => {
        if (!controller.signal.aborted) {
          const sorted = [...data].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
          )
          setAllSkills(sorted)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setCatalogError(requestErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false)
      })
    return () => controller.abort()
  }, [catalogRetry])

  // Category and search filtering with instant caching and alphabetical sorting
  useEffect(() => {
    if (catalogLoading || catalogError) return

    const trimmedSearch = search.trim()

    // 1. All categories with no search: use allSkills sorted
    if (!categoryId && !trimmedSearch) {
      setResults(allSkills)
      setResultsError("")
      setResultsLoading(false)
      return
    }

    // 2. Category only (no search): check in-memory cache for instant switch (0ms)
    if (
      categoryId &&
      !trimmedSearch &&
      categoryCacheRef.current.has(categoryId)
    ) {
      setResults(categoryCacheRef.current.get(categoryId)!)
      setResultsError("")
      setResultsLoading(false)
      return
    }

    // 3. Fetch from API
    const controller = new AbortController()
    setResultsLoading(true)
    setResultsError("")

    const doFetch = () => {
      getSkillsApi(categoryId || undefined, trimmedSearch, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            const sorted = [...data].sort((a, b) =>
              a.name.localeCompare(b.name, undefined, {
                sensitivity: "base",
              }),
            )
            if (categoryId && !trimmedSearch) {
              categoryCacheRef.current.set(categoryId, sorted)
            }
            setResults(sorted)
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResultsError(requestErrorMessage(error))
        })
        .finally(() => {
          if (!controller.signal.aborted) setResultsLoading(false)
        })
    }

    if (trimmedSearch) {
      const timer = window.setTimeout(doFetch, 250)
      return () => {
        window.clearTimeout(timer)
        controller.abort()
      }
    } else {
      doFetch()
      return () => {
        controller.abort()
      }
    }
  }, [
    allSkills,
    catalogLoading,
    catalogError,
    categoryId,
    search,
    resultsRetry,
  ])

  const savedSkillsMap = useMemo(
    () => new Map((savedSkills ?? []).map((s) => [s.skill_id, s])),
    [savedSkills],
  )

  const activeSkills = new Map(
    allSkills.map((skill) => [skill.skill_id, skill]),
  )
  const activeSkillsByName = useMemo(
    () => new Map(allSkills.map((skill) => [skill.name.toLowerCase().trim(), skill])),
    [allSkills],
  )
  const selectedIds = new Set(selected.map((skill) => skill.skill_id))
  const unavailable =
    !catalogLoading &&
    !catalogError &&
    selected.some(
      (skill) =>
        !activeSkills.has(skill.skill_id) &&
        !activeSkillsByName.has((skill.name || "").toLowerCase().trim()) &&
        (!allowInactiveSaved || !savedSkillsMap.has(skill.skill_id)),
    )
  const valid =
    !catalogLoading &&
    !catalogError &&
    (allowInactiveSaved || !unavailable) &&
    selected.length >= min &&
    selected.length <= max

  useEffect(() => {
    onValidityChange?.(valid)
  }, [valid, onValidityChange])

  // Resolve names and IDs; preserve valid IDs while mapping existing profile skill names
  useEffect(() => {
    if (catalogLoading || catalogError || allSkills.length === 0) return
    const names = new Map(
      [...(savedSkills ?? []), ...allSkills].map((skill) => [skill.skill_id, skill.name]),
    )
    const byName = new Map(
      [...(savedSkills ?? []), ...allSkills].map((skill) => [skill.name.toLowerCase().trim(), skill]),
    )

    let changed = false
    const updated = selected.map((skill) => {
      if (names.has(skill.skill_id)) {
        const canonicalName = names.get(skill.skill_id)!
        if (skill.name !== canonicalName) {
          changed = true
          return { ...skill, name: canonicalName }
        }
        return skill
      }
      const lookup = (skill.name || skill.skill_id).toLowerCase().trim()
      if (byName.has(lookup)) {
        const found = byName.get(lookup)!
        changed = true
        return { skill_id: found.skill_id, name: found.name }
      }
      return skill
    })

    if (changed) {
      onChange(updated)
    }
  }, [allSkills, catalogLoading, catalogError, selected, onChange, savedSkills])

  const [exitingMap, setExitingMap] = useState<
    Map<string, { skill: SelectedSkill; initialWidth?: number }>
  >(new Map())
  const orderRef = useRef<string[]>([])
  const exitingTimersRef = useRef<Map<string, number>>(new Map())
  const prevChipPositionsRef = useRef<Map<string, { left: number; top: number }>>(
    new Map(),
  )
  const prevContainerHeightRef = useRef<number | null>(null)
  const chipsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      exitingTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      exitingTimersRef.current.clear()
    }
  }, [])

  // If a skill currently marked as exiting is re-added by the user, cancel its exit
  useEffect(() => {
    const selectedIdsSet = new Set(selected.map((s) => s.skill_id))
    setExitingMap((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const [id] of prev) {
        if (selectedIdsSet.has(id)) {
          next.delete(id)
          changed = true
          const timer = exitingTimersRef.current.get(id)
          if (timer) {
            window.clearTimeout(timer)
            exitingTimersRef.current.delete(id)
          }
        }
      }
      return changed ? next : prev
    })
  }, [selected])

  // Derive displayed chips in stable visual order, keeping exiting chips in place
  const displayedChips = useMemo(() => {
    const selectedMap = new Map(selected.map((s) => [s.skill_id, s]))
    const currentOrder = [...orderRef.current]

    for (const s of selected) {
      if (!currentOrder.includes(s.skill_id)) {
        currentOrder.push(s.skill_id)
      }
    }
    orderRef.current = currentOrder

    const chips: {
      skill: SelectedSkill
      isExiting: boolean
      initialWidth?: number
    }[] = []

    for (const id of currentOrder) {
      if (selectedMap.has(id)) {
        chips.push({
          skill: selectedMap.get(id)!,
          isExiting: false,
        })
      } else if (exitingMap.has(id)) {
        const exiting = exitingMap.get(id)!
        chips.push({
          skill: exiting.skill,
          isExiting: true,
          initialWidth: exiting.initialWidth,
        })
      }
    }

    return chips
  }, [selected, exitingMap])

  function recordChipPositions() {
    const container = chipsContainerRef.current
    if (!container) return
    prevContainerHeightRef.current = container.offsetHeight
    const chipButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-chip-id]"),
    )
    const map = new Map<string, { left: number; top: number }>()
    chipButtons.forEach((btn) => {
      const id = btn.getAttribute("data-chip-id")
      if (id) {
        const rect = btn.getBoundingClientRect()
        map.set(id, { left: rect.left, top: rect.top })
      }
    })
    prevChipPositionsRef.current = map
  }

  function finishExit(skillId: string) {
    const timer = exitingTimersRef.current.get(skillId)
    if (timer) {
      window.clearTimeout(timer)
      exitingTimersRef.current.delete(skillId)
    }

    // The exiting chip has already collapsed to 0 footprint via CSS animation.
    // Clear previous positions so unmounting the 0px node doesn't trigger a redundant FLIP restart.
    prevChipPositionsRef.current = new Map()

    setExitingMap((prev) => {
      if (!prev.has(skillId)) return prev
      const next = new Map(prev)
      next.delete(skillId)
      return next
    })

    orderRef.current = orderRef.current.filter((id) => id !== skillId)
  }

  function removeSkill(skillId: string) {
    if (exitingMap.has(skillId)) return

    const skill = selected.find((s) => s.skill_id === skillId)
    if (!skill) return

    recordChipPositions()

    const container = chipsContainerRef.current
    const btn = container?.querySelector<HTMLButtonElement>(
      `[data-chip-id="${skillId}"]`,
    )
    const initialWidth = btn ? btn.getBoundingClientRect().width : undefined

    // 1. Mark as exiting in separate animation state
    setExitingMap((prev) => {
      const next = new Map(prev)
      next.set(skillId, { skill, initialWidth })
      return next
    })

    // 2. Fallback safety timer
    const timer = window.setTimeout(() => {
      finishExit(skillId)
    }, 280)
    exitingTimersRef.current.set(skillId, timer)

    // 3. IMMEDIATELY update application data
    onChange(selected.filter((item) => item.skill_id !== skillId))
  }

  function toggle(skill: CatalogSkill) {
    if (selectedIds.has(skill.skill_id)) {
      removeSkill(skill.skill_id)
    } else if (selected.length < max) {
      recordChipPositions()
      onChange([...selected, skill])
    }
  }

  useLayoutEffect(() => {
    const container = chipsContainerRef.current
    if (!container) return

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      prevContainerHeightRef.current = container.offsetHeight
      return
    }

    // Animate container height when rows collapse or expand
    const currentHeight = container.offsetHeight
    const prevHeight = prevContainerHeightRef.current
    if (prevHeight !== null && Math.abs(prevHeight - currentHeight) > 3) {
      container.style.height = `${prevHeight}px`
      container.style.transition = "none"
      void container.offsetHeight
      container.style.transition = "height 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
      container.style.height = `${currentHeight}px`

      const onHeightEnd = (e: TransitionEvent) => {
        if (e.target === container && e.propertyName === "height") {
          container.style.height = ""
          container.style.transition = ""
          container.removeEventListener("transitionend", onHeightEnd)
        }
      }
      container.addEventListener("transitionend", onHeightEnd)
    }
    prevContainerHeightRef.current = currentHeight

    // FLIP layout animation for remaining chips that moved across rows
    const chipButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-chip-id]"),
    )
    const prevPositions = prevChipPositionsRef.current
    const currentPositions = new Map<string, { left: number; top: number }>()

    chipButtons.forEach((btn) => {
      const id = btn.getAttribute("data-chip-id")
      if (id) {
        const rect = btn.getBoundingClientRect()
        currentPositions.set(id, { left: rect.left, top: rect.top })
      }
    })

    if (prevPositions.size > 0) {
      chipButtons.forEach((btn) => {
        const id = btn.getAttribute("data-chip-id")
        const isExiting = btn.getAttribute("data-exiting") === "true"
        if (!id || isExiting) return

        const prev = prevPositions.get(id)
        const current = currentPositions.get(id)

        if (prev && current) {
          const deltaX = prev.left - current.left
          const deltaY = prev.top - current.top

          // Disambiguate cross-row wrap from same-row shift:
          // - Cross-row wrap (Math.abs(deltaY) > 3): animate both deltaX and deltaY smoothly.
          // - Same-row movement: Flexbox width animations (chipPushOut/chipRetractIn) already provide
          //   fluid horizontal motion; only use FLIP if there was an instant multi-item leap (> 25px).
          const isCrossRow = Math.abs(deltaY) > 3
          const isLargeShift = Math.abs(deltaX) > 25
          if (isCrossRow || isLargeShift) {
            btn.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
            btn.style.transition = "none"

            requestAnimationFrame(() => {
              btn.style.transition =
                "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
              btn.style.transform = "translate3d(0, 0, 0)"

              const onEnd = () => {
                btn.style.transform = ""
                btn.style.transition = ""
                btn.removeEventListener("transitionend", onEnd)
              }
              btn.addEventListener("transitionend", onEnd)
            })
          }
        }
      })
    }

    prevChipPositionsRef.current = currentPositions
  }, [displayedChips])

  return (
    <div className="skill-selector">
      <div className="skill-selector-layout">
        <div className="skill-selector-main">
          <label className="catalog-search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search skills"
              placeholder="Search skills by name…"
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div
            className="catalog-results"
            aria-busy={catalogLoading || resultsLoading}
          >
            {resultsLoading && (
              <div className="catalog-loading-bar" aria-hidden="true" />
            )}
            {catalogLoading ? (
              <p role="status">Loading skills…</p>
            ) : catalogError ? (
              <div className="catalog-feedback" role="alert">
                <p>{catalogError}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCatalogRetry((value) => value + 1)}
                >
                  Retry skills
                </button>
              </div>
            ) : resultsError ? (
              <div className="catalog-feedback" role="alert">
                <p>{resultsError}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResultsRetry((value) => value + 1)}
                >
                  Retry search
                </button>
              </div>
            ) : results.length === 0 && !resultsLoading ? (
              <div className="catalog-feedback">
                <p>No skills match these filters.</p>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setSearch("")
                    setCategoryId("")
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="catalog-skill-options profile-skill-options"
                aria-label="Available skills"
              >
                {results.map((skill) => {
                  const isSelected = selectedIds.has(skill.skill_id)
                  return (
                    <button
                      key={skill.skill_id}
                      data-skill-id={skill.skill_id}
                      type="button"
                      aria-pressed={isSelected}
                      className={`catalog-skill-option ${
                        isSelected ? "selected" : ""
                      }`}
                      disabled={!isSelected && selected.length >= max}
                      onClick={() => toggle(skill)}
                    >
                      <span
                        className={`skill-toggle-indicator ${
                          isSelected ? "is-selected" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <Plus className="toggle-icon toggle-plus" size={14} />
                        <Check className="toggle-icon toggle-check" size={14} />
                      </span>
                      <SkillIcon name={skill.name} size={15} />
                      {skill.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <aside className="skill-category-filter" aria-label="Skill categories">
          <h3>Categories</h3>
          {categoriesLoading ? (
            <p role="status">Loading categories…</p>
          ) : categoriesError ? (
            <div className="catalog-feedback" role="alert">
              <p>{categoriesError}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCategoriesRetry((value) => value + 1)}
              >
                Retry categories
              </button>
            </div>
          ) : (
            <div className="skill-category-options">
              <button
                type="button"
                aria-pressed={!categoryId}
                className={!categoryId ? "selected" : ""}
                onClick={() => setCategoryId("")}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.category_id}
                  title={category.description ?? undefined}
                  aria-pressed={categoryId === category.category_id}
                  className={
                    categoryId === category.category_id ? "selected" : ""
                  }
                  onClick={() => setCategoryId(category.category_id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
      <div className="selected-skills">
        <div className="selected-skills-heading">
          <h3>{selectedHeading}</h3>
          <span aria-live="polite">{selected.length} / {max}</span>
        </div>
        <p className="muted">
          {subtitle ?? `Choose ${min}–${max} skills. Your selection stays as you explore categories.`}
        </p>
        <div className="selected-skills-chips-wrapper">
          {displayedChips.length > 0 ? (
            <div className="selected-skill-chips" ref={chipsContainerRef}>
              {displayedChips.map(
                ({ skill, isExiting, initialWidth }, index) => {
                  const name =
                    activeSkills.get(skill.skill_id)?.name ||
                    savedSkillsMap.get(skill.skill_id)?.name ||
                    skill.name ||
                    `Saved skill ${index + 1}`
                  const isAvailable =
                    activeSkills.has(skill.skill_id) ||
                    activeSkillsByName.has((skill.name || "").toLowerCase().trim()) ||
                    savedSkillsMap.has(skill.skill_id)
                  const inactive =
                    !catalogLoading &&
                    !catalogError &&
                    !isAvailable
                  return (
                    <button
                      type="button"
                      key={skill.skill_id}
                      data-chip-id={skill.skill_id}
                      data-exiting={isExiting ? "true" : undefined}
                      className={`${inactive ? "unavailable" : ""} ${
                        isExiting ? "chip-retracting chip-popping-out" : ""
                      }`.trim()}
                      style={
                        isExiting && initialWidth
                          ? ({
                              ["--chip-start-width"]: `${initialWidth}px`,
                            } as React.CSSProperties)
                          : undefined
                      }
                      aria-label={isExiting ? undefined : `Remove ${name}`}
                      aria-hidden={isExiting ? true : undefined}
                      tabIndex={isExiting ? -1 : undefined}
                      onClick={
                        isExiting ? undefined : () => removeSkill(skill.skill_id)
                      }
                      onAnimationEnd={
                        isExiting ? () => finishExit(skill.skill_id) : undefined
                      }
                    >
                      <SkillIcon name={name} size={13} />
                      {name}
                      {inactive && " (unavailable)"}
                      <X size={12} className="chip-remove-icon" />
                    </button>
                  )
                },
              )}
            </div>
          ) : (
            <p className="catalog-selection-hint">
              Select a skill above to get started.
            </p>
          )}
        </div>
        {selected.length >= max && (
          <p role="status" className="catalog-selection-hint">
            You have reached the {max}-skill limit. Remove a skill to select
            another.
          </p>
        )}
        {!allowInactiveSaved && unavailable && (
          <p role="alert" className="catalog-validation">
            Some saved skills are no longer available. Remove them and choose
            from the current catalog to continue.
          </p>
        )}
      </div>
    </div>
  )
}
