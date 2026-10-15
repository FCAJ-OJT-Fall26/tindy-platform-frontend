import { useEffect, useState } from "react"
import { Check, Plus, Search, X } from "lucide-react"
import { getSkillCategoriesApi, getSkillsApi } from "../../services"
import type {
  CatalogSkill,
  SelectedSkill,
  SkillCategory,
} from "../../types/catalog"
import { requestErrorMessage } from "./catalogFeedback"

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

  // The unfiltered catalog lets us distinguish inactive saved selections from
  // skills that simply do not match the current search or category.
  useEffect(() => {
    const controller = new AbortController()
    setCatalogLoading(true)
    setCatalogError("")
    getSkillsApi(undefined, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAllSkills(data)
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

  useEffect(() => {
    if (catalogLoading || catalogError) return
    if (!categoryId && !search.trim()) {
      setResults(allSkills)
      setResultsError("")
      setResultsLoading(false)
      return
    }
    const controller = new AbortController()
    setResultsLoading(true)
    setResultsError("")
    const timer = window.setTimeout(() => {
      getSkillsApi(categoryId || undefined, search, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setResults(data)
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResultsError(requestErrorMessage(error))
        })
        .finally(() => {
          if (!controller.signal.aborted) setResultsLoading(false)
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
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

  // Resolve names only; catalog requests never replace the user's selected IDs.
  useEffect(() => {
    if (catalogLoading || catalogError) return
    const names = new Map(
      allSkills.map((skill) => [skill.skill_id, skill.name]),
    )
    if (
      selected.some(
        (skill) =>
          names.has(skill.skill_id) && names.get(skill.skill_id) !== skill.name,
      )
    ) {
      onChange(
        selected.map((skill) => ({
          ...skill,
          name: names.get(skill.skill_id) ?? skill.name,
        })),
      )
    }
  }, [allSkills, catalogLoading, catalogError, selected, onChange])

  function toggle(skill: CatalogSkill) {
    if (selectedIds.has(skill.skill_id)) {
      onChange(selected.filter((item) => item.skill_id !== skill.skill_id))
    } else if (selected.length < 30) {
      onChange([...selected, skill])
    }
  }

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
            ) : resultsLoading ? (
              <p role="status">Searching skills…</p>
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
            ) : results.length === 0 ? (
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
                className="catalog-skill-options"
                aria-label="Available skills"
              >
                {results.map((skill) => (
                  <button
                    key={skill.skill_id}
                    type="button"
                    aria-pressed={selectedIds.has(skill.skill_id)}
                    className={`catalog-skill-option ${
                      selectedIds.has(skill.skill_id) ? "selected" : ""
                    }`}
                    disabled={
                      !selectedIds.has(skill.skill_id) && selected.length >= 30
                    }
                    onClick={() => toggle(skill)}
                  >
                    {selectedIds.has(skill.skill_id) ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                    {skill.name}
                  </button>
                ))}
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
          <div className="selected-skill-chips">
            {selected.map((skill, index) => {
              const name =
                activeSkills.get(skill.skill_id)?.name ||
                skill.name ||
                `Saved skill ${index + 1}`
              const inactive =
                !catalogLoading &&
                !catalogError &&
                !activeSkills.has(skill.skill_id)
              return (
                <button
                  type="button"
                  key={skill.skill_id}
                  className={inactive ? "unavailable" : ""}
                  aria-label={`Remove ${name}`}
                  onClick={() =>
                    onChange(
                      selected.filter(
                        (item) => item.skill_id !== skill.skill_id,
                      ),
                    )
                  }
                >
                  {name}
                  {inactive && " (unavailable)"}
                  <X size={12} />
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
