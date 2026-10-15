import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Check, Plus, Search, X } from "lucide-react"
import { getSkillCategoriesApi, getSkillsApi } from "../../services"
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
  onValidityChange: (valid: boolean) => void
}

export default function SkillSelector({
  selected,
  onChange,
  onValidityChange,
}: Props) {
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [allSkills, setAllSkills] = useState<CatalogSkill[]>([])
  const [results, setResults] = useState<CatalogSkill[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [search, setSearch] = useState("")
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
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
    const controller = new AbortController()
    setCategoriesLoading(true)
    setCategoriesError("")
    getSkillCategoriesApi(controller.signal)
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
    const controller = new AbortController()
    setCatalogLoading(true)
    setCatalogError("")
    getSkillsApi(undefined, undefined, controller.signal)
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

  const activeSkills = new Map(
    allSkills.map((skill) => [skill.skill_id, skill]),
  )
  const selectedIds = new Set(selected.map((skill) => skill.skill_id))
  const unavailable =
    !catalogLoading &&
    !catalogError &&
    selected.some((skill) => !activeSkills.has(skill.skill_id))
  const valid =
    !catalogLoading &&
    !catalogError &&
    !unavailable &&
    selected.length >= 1 &&
    selected.length <= 30

  useEffect(() => {
    onValidityChange(valid)
  }, [valid, onValidityChange])

  // Resolve names and IDs; preserve valid IDs while mapping existing profile skill names
  useEffect(() => {
    if (catalogLoading || catalogError || allSkills.length === 0) return
    const names = new Map(
      allSkills.map((skill) => [skill.skill_id, skill.name]),
    )
    const byName = new Map(
      allSkills.map((skill) => [skill.name.toLowerCase().trim(), skill]),
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
  }, [allSkills, catalogLoading, catalogError, selected, onChange])

  const [removingId, setRemovingId] = useState<string | null>(null)
  const chipsContainerRef = useRef<HTMLDivElement>(null)
  const prevChipPositionsRef = useRef<Map<string, { left: number; top: number }>>(
    new Map(),
  )

  function removeSkill(skillId: string) {
    if (removingId === skillId) return
    setRemovingId(skillId)
    setTimeout(() => {
      onChange(selected.filter((item) => item.skill_id !== skillId))
      setRemovingId(null)
    }, 180)
  }

  function toggle(skill: CatalogSkill) {
    if (selectedIds.has(skill.skill_id)) {
      removeSkill(skill.skill_id)
    } else if (selected.length < 30) {
      onChange([...selected, skill])
    }
  }

  // FLIP animation for selected chips: smoothly slide remaining chips together ("dồn lại giống stack")
  useLayoutEffect(() => {
    const container = chipsContainerRef.current
    if (!container) return

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
        if (!id || id === removingId) return

        const prev = prevPositions.get(id)
        const current = currentPositions.get(id)

        if (prev && current) {
          const deltaX = prev.left - current.left
          const deltaY = prev.top - current.top

          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
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
  }, [selected, removingId])

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
                className="catalog-skill-options"
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
                      disabled={!isSelected && selected.length >= 30}
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
          <h3>Selected skills</h3>
          <span aria-live="polite">{selected.length} / 30</span>
        </div>
        <p className="muted">
          Choose 1–30 skills. Your selection stays as you explore categories.
        </p>
        {selected.length > 0 ? (
          <div className="selected-skill-chips" ref={chipsContainerRef}>
            {selected.map((skill, index) => {
              const name =
                activeSkills.get(skill.skill_id)?.name ||
                skill.name ||
                `Saved skill ${index + 1}`
              const inactive =
                !catalogLoading &&
                !catalogError &&
                !activeSkills.has(skill.skill_id)
              const isPoppingOut = removingId === skill.skill_id
              return (
                <button
                  type="button"
                  key={skill.skill_id}
                  data-chip-id={skill.skill_id}
                  className={`${inactive ? "unavailable" : ""} ${
                    isPoppingOut ? "chip-retracting chip-popping-out" : ""
                  }`.trim()}
                  aria-label={`Remove ${name}`}
                  onClick={() => removeSkill(skill.skill_id)}
                >
                  <SkillIcon name={name} size={13} />
                  {name}
                  {inactive && " (unavailable)"}
                  <X size={12} className="chip-remove-icon" />
                </button>
              )
            })}
          </div>
        ) : (
          <p className="catalog-selection-hint">
            Select a skill above to get started.
          </p>
        )}
        {selected.length >= 30 && (
          <p role="status" className="catalog-selection-hint">
            You have reached the 30-skill limit. Remove a skill to select
            another.
          </p>
        )}
        {unavailable && (
          <p role="alert" className="catalog-validation">
            Some saved skills are no longer available. Remove them and choose
            from the current catalog to continue.
          </p>
        )}
      </div>
    </div>
  )
}
