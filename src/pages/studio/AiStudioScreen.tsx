import { useEffect, useRef, useState } from "react"
import { Bot, BriefcaseBusiness, Check, ChevronDown, CircleHelp, FileText, Plus } from "lucide-react"
import { Button, EmptyState, PageHeader } from "../../components/ui"
import { apiRequest } from "../../services/apiClient"
import { getSkillsApi } from "../../services/catalog.service"
import { useTindy } from "../../store"
import type { CatalogSkill } from "../../types/catalog"
import type { ProfilePatch } from "../../types/profile"

interface ExtractionDraft {
  profile: {
    headline: string | null
    professional_interests: string | null
    previous_projects_and_contribution: string | null
    skill_ids: string[]
  }
  experiences: { project_name: string | null; role_title: string | null; description: string | null }[]
  certificates: { title: string | null; issuer: string | null }[]
  warnings: { field: string; code: string; message: string }[]
}

const reviewFields = [
  { key: "headline", label: "Headline", maxLength: 255 },
  { key: "professional_interests", label: "Professional interests", maxLength: 5000 },
  { key: "previous_projects_and_contribution", label: "Previous projects and contributions", maxLength: 5000 },
] as const

type ReviewField = (typeof reviewFields)[number]["key"]

interface PdfScan {
  upload_id: string
  status: "scanning" | "clean" | "blocked" | "expired"
  scan_result: string | null
}

type PdfSelection = { name: string } & (
  | { status: "uploading" }
  | PdfScan
  | { status: "status_error"; upload_id: string }
)

const pdfUploadsEndpoint = "/api/ai/pdf-uploads"
const pdfStatusText = {
  uploading: "Uploading PDF…",
  scanning: "Scanning PDF for malware…",
  clean: "Scan complete. Ready to extract.",
  blocked: "This PDF could not be cleared by the malware scan. Choose another file.",
  expired: "The scan or upload expired. Choose a new PDF.",
  status_error: "Scan status is temporarily unavailable.",
}

export function AiStudioScreen() {
  const { ownerProfile, saveOwnerProfile, notify } = useTindy()
  const [text, setText] = useState("")
  const [draft, setDraft] = useState<ExtractionDraft | null>(null)
  const [edits, setEdits] = useState<Partial<Record<ReviewField, string>>>({})
  const [skills, setSkills] = useState<CatalogSkill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [catalogUnavailable, setCatalogUnavailable] = useState(false)
  const [busy, setBusy] = useState<"extract" | "save" | null>(null)
  const [error, setError] = useState("")
  const [pdf, setPdf] = useState<PdfSelection | null>(null)
  const uploadController = useRef<AbortController | null>(null)
  const profileSkillIds = new Set(ownerProfile.data?.skills.map((skill) => skill.skill_id))
  const selectedCount = Object.values(edits).filter((value) => value?.trim()).length +
    selectedSkills.filter((id) => !profileSkillIds.has(id)).length

  useEffect(() => () => uploadController.current?.abort(), [])

  useEffect(() => {
    if (pdf?.status !== "scanning") return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const { data } = await apiRequest<PdfScan>(
          `${pdfUploadsEndpoint}/${encodeURIComponent(pdf.upload_id)}`,
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return
        if (data.status === "scanning") timer = setTimeout(poll, 5000)
        else setPdf({ ...data, name: pdf.name })
      } catch {
        if (!controller.signal.aborted)
          setPdf({ name: pdf.name, upload_id: pdf.upload_id, status: "status_error" })
      }
    }

    timer = setTimeout(poll, 2000)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [pdf])

  const selectPdf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size === 0 || file.size > 2 * 1024 * 1024) {
      setError("Choose a non-empty PDF up to 2 MiB.")
      return
    }
    uploadController.current?.abort()
    const controller = new AbortController()
    uploadController.current = controller
    setError("")
    setDraft(null)
    setPdf({ name: file.name, status: "uploading" })
    try {
      const form = new FormData()
      form.set("file", file.slice(0, file.size, "application/pdf"), file.name)
      const { data } = await apiRequest<PdfScan>(pdfUploadsEndpoint, {
        method: "POST",
        body: form,
        signal: controller.signal,
        timeoutMs: 75_000,
      })
      if (!controller.signal.aborted) setPdf({ ...data, name: file.name })
    } catch (cause) {
      if (controller.signal.aborted) return
      setPdf(null)
      setError(cause instanceof Error ? cause.message : "Could not upload the PDF.")
    } finally {
      if (uploadController.current === controller) uploadController.current = null
    }
  }

  const extract = async () => {
    if (pdf && pdf.status !== "clean") return
    setBusy("extract")
    setError("")
    try {
      const form = new FormData()
      if (text.trim()) form.set("text", text.trim())
      if (pdf?.status === "clean") form.set("upload_id", pdf.upload_id)
      const { data } = await apiRequest<ExtractionDraft>("/api/ai/extract-profile", {
        method: "POST",
        body: form,
        // Allow the API's 120-second extraction deadline to return a response.
        timeoutMs: 130_000,
      })
      setDraft(data)
      setEdits({})
      setSelectedSkills([])
      setSkills([])
      setCatalogUnavailable(false)
      if (data.profile.skill_ids.length > 0) {
        const catalog = await getSkillsApi().catch(() => null)
        setCatalogUnavailable(!catalog)
        setSkills(catalog?.filter((skill) => data.profile.skill_ids.includes(skill.skill_id)) ?? [])
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "TimeoutError") {
        setError("AI extraction took too long. Please try again.")
      } else {
        setError(cause instanceof Error ? cause.message : "Could not extract a profile draft.")
      }
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    const current = ownerProfile.data
    if (!current) return
    const patch: ProfilePatch = {}
    for (const { key } of reviewFields) {
      const value = edits[key]?.trim()
      if (value && value !== current[key]) patch[key] = value
    }
    const existing = current.skills.map((skill) => skill.skill_id)
    const merged = [...new Set([...existing, ...selectedSkills])]
    if (merged.length > 30) {
      setError("Your profile can contain up to 30 skills. Select fewer skills and try again.")
      return
    }
    if (merged.length > existing.length) patch.skill_ids = merged
    if (Object.keys(patch).length === 0) {
      setError("The selected suggestions are already on your profile.")
      return
    }
    setBusy("save")
    setError("")
    try {
      await saveOwnerProfile(patch)
      setEdits({})
      setSelectedSkills([])
      notify("Selected suggestions saved to your profile")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your profile.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader title="AI Studio" description="Turn your experience into profile suggestions you can review and save." />
      <div className="ai-layout">
        <section className="panel">
          <h2>Describe your experience</h2>
          <label className="field">
            Profile text
            <textarea
              rows={10}
              maxLength={20000}
              value={text}
              disabled={busy !== null}
              placeholder="Paste text from your CV, or describe your skills and projects."
              onChange={(event) => {
                setText(event.target.value)
                setDraft(null)
                setError("")
              }}
            />
          </label>
          <p>{text.length.toLocaleString()} / 20,000 characters</p>
          <div className="mb-4 grid gap-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
              <span className="flex items-center gap-2">
                <FileText size={16} aria-hidden="true" /> CV (optional)
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="min-w-0 text-sm font-normal file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-[var(--border)] file:bg-white file:px-2 file:py-1 file:font-semibold focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                disabled={busy !== null || pdf?.status === "uploading"}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ""
                  if (file) void selectPdf(file)
                }}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              <span role="status" className="wrap-anywhere">
                {pdf ? `${pdf.name} · ${pdfStatusText[pdf.status]}` : "PDF up to 2 MiB and 10 pages."}
              </span>
              {pdf?.status === "status_error" && (
                <button type="button" className="text-[var(--primary)] underline" onClick={() =>
                  setPdf({ name: pdf.name, upload_id: pdf.upload_id, status: "scanning", scan_result: null })}>
                  Check scan status
                </button>
              )}
              {pdf && (
                <button type="button" disabled={busy !== null} className="text-[var(--primary)] underline"
                  onClick={() => {
                    uploadController.current?.abort()
                    setPdf(null)
                    setDraft(null)
                    setError("")
                  }}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <Button type="button" onClick={extract} disabled={busy !== null || (pdf ? pdf.status !== "clean" : !text.trim())}>
            <Bot size={16} aria-hidden="true" />
            {busy === "extract" ? "Extracting suggestions…" : "Extract suggestions"}
          </Button>
          {error && <p role="alert">{error}</p>}
        </section>
        <section className="panel min-w-0" aria-label="Review suggestions">
          {draft ? (
            <>
              <h2>Review suggestions</h2>
              <p>Choose what to add to your profile.</p>
              <div className="mt-5 grid gap-4">
                {reviewFields.map(({ key, label, maxLength }) => {
                  const suggestion = draft.profile[key]
                  if (!suggestion) return null
                  const selected = edits[key] !== undefined
                  return (
                    <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3" key={key}>
                      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-[var(--primary)]"
                          checked={selected}
                          disabled={busy !== null}
                          onChange={(event) => setEdits((previous) => ({
                            ...previous,
                            [key]: event.target.checked ? suggestion : undefined,
                          }))}
                        />
                        {label}
                      </label>
                      <textarea
                        aria-label={label}
                        className="min-w-0 resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm leading-relaxed text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:bg-transparent disabled:text-[var(--muted)]"
                        rows={key === "headline" ? 2 : 3}
                        maxLength={maxLength}
                        value={edits[key] ?? suggestion}
                        disabled={busy !== null || !selected}
                        onChange={(event) => {
                          const value = event.target.value
                          setEdits((previous) => ({ ...previous, [key]: value }))
                        }}
                      />
                    </div>
                  )
                })}
                {skills.length > 0 && (
                  <fieldset className="min-w-0">
                    <legend className="mb-3 text-sm font-semibold text-[var(--ink)]">Skills</legend>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => {
                        const existing = profileSkillIds.has(skill.skill_id)
                        if (existing) {
                          return (
                            <span key={skill.skill_id} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm leading-snug text-slate-600">
                              <Check size={14} className="shrink-0" aria-hidden="true" />
                              <span className="wrap-anywhere">{skill.name}</span>
                              <span className="sr-only">, already on your profile</span>
                            </span>
                          )
                        }
                        const selected = selectedSkills.includes(skill.skill_id)
                        const Icon = selected ? Check : Plus
                        return (
                          <label key={skill.skill_id} className="relative inline-flex max-w-full">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={selected}
                              disabled={busy !== null}
                              onChange={(event) => {
                                const checked = event.target.checked
                                setSelectedSkills((previous) => checked
                                  ? [...previous, skill.skill_id]
                                  : previous.filter((id) => id !== skill.skill_id))
                              }}
                            />
                            <span className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium leading-snug text-[var(--ink)] transition-colors hover:border-[var(--primary)] peer-checked:border-blue-200 peer-checked:bg-blue-50 peer-checked:text-[var(--primary)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)] peer-disabled:cursor-default peer-disabled:opacity-60">
                              <Icon size={14} className="shrink-0" aria-hidden="true" />
                              <span className="wrap-anywhere">{skill.name}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                )}
                {catalogUnavailable && <p className="text-sm text-[var(--muted)]">Skill names are unavailable. Extract again to retry loading them.</p>}
                {!reviewFields.some(({ key }) => draft.profile[key]) && skills.length === 0 &&
                  <p className="text-sm text-[var(--muted)]">No profile fields or skills are available to save from this draft.</p>}
                {draft.experiences.length + draft.certificates.length > 0 && (
                  <details className="group min-w-0 rounded-xl border border-[var(--border)]">
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[var(--primary)] [&::-webkit-details-marker]:hidden">
                      <BriefcaseBusiness size={17} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
                      <span className="flex-1">Experience and certificates</span>
                      <ChevronDown size={16} className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="border-t border-[var(--border)] px-3 pt-3 text-sm text-[var(--muted)]">You can add these entries from your profile.</p>
                    <ul className="grid gap-2 p-3">
                      {draft.experiences.map((item, index) => (
                        <li key={`experience-${index}`} className="wrap-anywhere rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-semibold text-[var(--ink)]">{item.project_name || item.role_title || "Untitled experience"}</p>
                          {item.project_name && item.role_title && <p className="mt-1 text-[var(--muted)]">{item.role_title}</p>}
                          {item.description && <p className="mt-1.5 leading-relaxed text-slate-600">{item.description}</p>}
                        </li>
                      ))}
                      {draft.certificates.map((item, index) => (
                        <li key={`certificate-${index}`} className="wrap-anywhere rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-semibold text-[var(--ink)]">{item.title || "Untitled certificate"}</p>
                          {item.issuer && <p className="mt-1 text-[var(--muted)]">{item.issuer}</p>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {draft.warnings.length > 0 && (
                  <details className="group min-w-0 rounded-xl bg-slate-50">
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] [&::-webkit-details-marker]:hidden">
                      <CircleHelp size={17} className="shrink-0" aria-hidden="true" />
                      <span className="flex-1">Extraction notes ({draft.warnings.length})</span>
                      <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="list-disc space-y-1.5 px-8 pb-3 text-sm leading-relaxed text-slate-600">
                      {draft.warnings.map((warning, index) => <li key={index}>{warning.message}</li>)}
                    </ul>
                  </details>
                )}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <span className="text-sm text-[var(--muted)]" aria-live="polite">
                  {selectedCount > 0 ? `${selectedCount} selected` : "Select suggestions to save"}
                </span>
                <Button type="button" onClick={save} disabled={busy !== null || !ownerProfile.data || selectedCount === 0}>
                  {busy === "save" ? "Saving…" : "Save selected suggestions"}
                </Button>
              </div>
              {ownerProfile.error && <p role="alert" className="mt-3">Your profile is unavailable. Reload before saving suggestions.</p>}
            </>
          ) : (
            <EmptyState title="No suggestions yet" description="Extract suggestions from your text to review them here." />
          )}
        </section>
      </div>
    </>
  )
}

export { AiStudioScreen as AIStudio }
export default AiStudioScreen
