import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react"
import { Button } from "../ui"
import { ApiError } from "../../services/apiClient"
import {
  getCachedSkills,
  getProfessionalRolesApi,

} from "../../services/catalog.service"
import SkillSelector from "../onboarding/SkillSelector"
import {
  buildProfilePatch,
  nullable,
  profileDraft,
  profileErrorMessage,
  profileFields,
  safeHttpUrl,
  UUID_PATTERN,
  type ProfileDraft,
} from "../../services/profileValidation"
import type { CatalogSkill, SelectedSkill } from "../../types/catalog"
import type {
  MyProfileResponse,
  ProfilePatch,
  ExperienceResponse,
  ExperienceUpsert,
  CertificateResponse,
  CertificateUpsert,
} from "../../types/profile"
import useRemoteResource from "../../hooks/useRemoteResource"

type Errors = Record<string, string>
const validId = (value: string) =>
  UUID_PATTERN.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value)


const loadRoles = (signal: AbortSignal) =>
  getProfessionalRolesApi(undefined, signal)

export function RequestFeedback({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div className="profile-feedback" role="alert">
      {profileErrorMessage(error)}
    </div>
  )
}

function useSubmission(
  action: () => Promise<void>,
  validate: () => Errors,
  onBusyChange?: (busy: boolean) => void,
) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [errors, setErrors] = useState<Errors>({})
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current) return
    setError(null)
    const invalid = validate()
    setErrors(invalid)
    if (Object.keys(invalid).length) return
    pending.current = true
    setBusy(true)
    onBusyChange?.(true)
    try {
      await action()
    } catch (failure) {
      if (mounted.current) {
        setError(failure)
        if (failure instanceof ApiError && failure.validationErrors) {
          // Field names are from ProblemDetails; never render arbitrary exception text.
          setErrors(
            Object.fromEntries(
              Object.keys(failure.validationErrors).map((key) => [
                key,
                "Please check this field against the allowed format and limits.",
              ]),
            ),
          )
        }
      }
    } finally {
      pending.current = false
      if (mounted.current) {
        setBusy(false)
        onBusyChange?.(false)
      }
    }
  }
  return { busy, error, errors, submit }
}

function Field({
  name,
  label,
  value,
  onChange,
  errors,
  multiline = false,
  required = false,
  max,
  type = "text",
  disabled = false,
  min,
  maxValue,
}: {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  errors: Errors
  multiline?: boolean
  required?: boolean
  max?: number
  type?: string
  disabled?: boolean
  min?: string | number
  maxValue?: string | number
}) {
  const id = useId()
  const props = {
    id,
    name,
    value,
    required,
    disabled,
    maxLength: max,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${id}-error` : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  }
  return (
    <label className="field" htmlFor={id}>
      {label}
      {required ? " *" : ""}
      {multiline ? (
        <textarea {...props} rows={4} />
      ) : (
        <input
          {...props}
          type={type}
          min={min}
          max={maxValue}
          step={type === "number" ? 1 : undefined}
        />
      )}
      {errors[name] && (
        <span className="profile-field-error" id={`${id}-error`}>
          {errors[name]}
        </span>
      )}
    </label>
  )
}

function validateText(
  errors: Errors,
  key: string,
  value: string,
  max: number,
  required = false,
) {
  if (required && !value.trim()) errors[key] = "This field is required."
  else if (value.trim().length > max)
    errors[key] = `Use at most ${max} characters.`
}
function validateUrl(errors: Errors, key: string, value: string | null) {
  if (value && (!safeHttpUrl(value) || value.length > 1000))
    errors[key] =
      "Enter a full http:// or https:// URL (at most 1000 characters)."
}
function validateSkills(
  errors: Errors,
  ids: string[],
  min: number,
  max: number,
) {
  if (
    ids.length < min ||
    ids.length > max ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !validId(id))
  )
    errors.skill_ids = `Choose ${min}–${max} unique skills from the catalog.`
}
function validDate(value: string, monthOnly: boolean) {
  if (
    !(
      monthOnly ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/
    ).test(value) ||
    Number(value.slice(0, 4)) < 1
  )
    return false
  const full = monthOnly ? `${value}-01` : value
  const date = new Date(`${full}T00:00:00Z`)
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === full
  )
}
function validateDates(
  errors: Errors,
  startKey: string,
  endKey: string,
  start: string | null,
  end: string | null,
  monthOnly: boolean,
) {
  if (start && !validDate(start, monthOnly))
    errors[startKey] = `Use a valid ${
      monthOnly ? "YYYY-MM" : "YYYY-MM-DD"
    } date.`
  if (end && !validDate(end, monthOnly))
    errors[endKey] = `Use a valid ${monthOnly ? "YYYY-MM" : "YYYY-MM-DD"} date.`
  if (start && end && !errors[startKey] && !errors[endKey] && end < start)
    errors[endKey] = "End date must be on or after the start date."
}

function SkillsPicker({
  selected,
  saved,
  onChange,
  min,
  max,
  error,
}: {
  selected: string[]
  saved: CatalogSkill[]
  onChange: (ids: string[]) => void
  min: number
  max: number
  error?: string
}) {
  const nameCacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    for (const s of saved) {
      if (s.name && s.skill_id) {
        nameCacheRef.current.set(s.skill_id, s.name)
      }
    }
  }, [saved])

  const selectedObjects = useMemo(() => {
    const cached = getCachedSkills() ?? []
    return selected.map((id) => {
      let name = nameCacheRef.current.get(id)
      if (!name) {
        const foundSaved = saved.find((s) => s.skill_id === id)
        if (foundSaved) name = foundSaved.name
      }
      if (!name) {
        const foundCached = cached.find((s) => s.skill_id === id)
        if (foundCached) name = foundCached.name
      }
      return {
        skill_id: id,
        name: name || id,
      }
    })
  }, [selected, saved])

  const handleSkillsChange = useCallback(
    (newSkills: SelectedSkill[]) => {
      for (const s of newSkills) {
        if (s.name && s.name !== s.skill_id) {
          nameCacheRef.current.set(s.skill_id, s.name)
        }
      }
      onChange(newSkills.map((s) => s.skill_id))
    },
    [onChange],
  )

  return (
    <div className="profile-skill-section" role="group" aria-label="Technical skills">
      <div style={{ marginBottom: "14px" }}>
        <h3>Technical skills ({selected.length}/{max})</h3>
        <p className="helper-text" style={{ margin: 0 }}>
          Choose {min}–{max} skills. Previously saved skills can be kept even if
          no longer in the active catalog.
        </p>
      </div>
      <SkillSelector
        selected={selectedObjects}
        onChange={handleSkillsChange}
        min={min}
        max={max}
        savedSkills={saved}
        allowInactiveSaved={true}
        subtitle={`Choose ${min}–${max} skills. Your selection stays as you explore categories.`}
      />
      {error && (
        <p className="profile-field-error" role="alert" style={{ marginTop: "8px" }}>
          {error}
        </p>
      )}
    </div>
  )
}

function FormActions({
  busy,
  onCancel,
  label,
}: {
  busy: boolean
  onCancel: () => void
  label: string
}) {
  return (
    <div className="profile-form-actions">
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  )
}

export function ProfileEditor({
  profile,
  onSave,
  onCancel,
  onBusyChange,
}: {
  profile: MyProfileResponse
  onSave: (patch: ProfilePatch) => Promise<void>
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraft(profile))
  const roles = useRemoteResource("profile-role-catalog", loadRoles)
  const [unchanged, setUnchanged] = useState(false)
  const submission = useSubmission(
    async () => {
      const patch = buildProfilePatch(profile, draft)
      if (!Object.keys(patch).length) {
        setUnchanged(true)
        return
      }
      setUnchanged(false)
      await onSave(patch)
    },
    () => {
      const errors: Errors = {}
      for (const field of profileFields) {
        validateText(
          errors,
          field.key,
          draft[field.key],
          field.max,
          "required" in field && field.required,
        )
        if ("type" in field && field.type === "url")
          validateUrl(errors, field.key, nullable(draft[field.key]))
      }
      if (
        draft.public_email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.public_email.trim())
      )
        errors.public_email = "Enter a valid email address."
      if (!validId(draft.preferred_role_id))
        errors.preferred_role_id =
          "Choose a professional role from the catalog."
      const hours = Number(draft.available_hours_per_week)
      if (!Number.isInteger(hours) || hours < 1 || hours > 40)
        errors.available_hours_per_week = "Choose a whole number from 1 to 40."
      validateSkills(errors, draft.skill_ids, 1, 30)
      return errors
    },
    onBusyChange,
  )
  const update = (name: keyof ProfileDraft, value: string | string[]) => {
    setUnchanged(false)
    setDraft((previous) => ({ ...previous, [name]: value }))
  }
  return (
    <form
      className="panel profile-edit profile-api-form"
      noValidate
      onSubmit={submission.submit}
    >
      <h2>Edit your profile</h2>
      <p className="helper-text">
        Only changed fields are saved. Clear an optional field to remove its
        value. Your public contact email is visible to signed-in members.
      </p>
      <RequestFeedback error={submission.error} />
      <fieldset disabled={submission.busy}>
        <div className="form-grid">
          {profileFields
            .filter((field) => !("multiline" in field))
            .map(({ key, ...field }) => (
              <Field
                key={key}
                {...field}
                name={key}
                value={draft[key]}
                onChange={(value) => update(key, value)}
                errors={submission.errors}
              />
            ))}
          <Field
            name="available_hours_per_week"
            label="Weekly availability (hours)"
            type="number"
            required
            min={1}
            maxValue={40}
            value={draft.available_hours_per_week}
            onChange={(value) => update("available_hours_per_week", value)}
            errors={submission.errors}
          />
          <label className="field">
            Preferred role *
            <select
              name="preferred_role_id"
              value={draft.preferred_role_id}
              onChange={(event) =>
                update("preferred_role_id", event.target.value)
              }
              aria-invalid={Boolean(submission.errors.preferred_role_id)}
            >
              <option value="">Choose a role</option>
              {profile.preferred_role &&
                !roles.data?.some(
                  (role) =>
                    role.professional_role_id ===
                    profile.preferred_role?.professional_role_id,
                ) && (
                  <option value={profile.preferred_role.professional_role_id}>
                    {profile.preferred_role.name} (saved)
                  </option>
                )}
              {roles.data?.map((role) => (
                <option
                  key={role.professional_role_id}
                  value={role.professional_role_id}
                >
                  {role.name}
                </option>
              ))}
            </select>
            {roles.loading && <span role="status">Loading roles…</span>}
            {submission.errors.preferred_role_id && (
              <span className="profile-field-error">
                {submission.errors.preferred_role_id}
              </span>
            )}
          </label>
        </div>
        <RequestFeedback error={roles.error} />
        {Boolean(roles.error) && (
          <Button type="button" variant="secondary" onClick={roles.reload}>
            Retry role catalog
          </Button>
        )}
        {profileFields
          .filter((field) => "multiline" in field)
          .map(({ key, ...field }) => (
            <Field
              key={key}
              {...field}
              name={key}
              value={draft[key]}
              onChange={(value) => update(key, value)}
              errors={submission.errors}
            />
          ))}
        <SkillsPicker
          selected={draft.skill_ids}
          saved={profile.skills}
          onChange={(ids) => update("skill_ids", ids)}
          min={1}
          max={30}
          error={submission.errors.skill_ids}
        />
      </fieldset>
      {unchanged && <p role="status">No changes to save.</p>}
      <FormActions
        busy={submission.busy}
        onCancel={onCancel}
        label="Save profile"
      />
    </form>
  )
}

export function ExperienceEditor({
  item,
  onSave,
  onCancel,
  onBusyChange,
}: {
  item: ExperienceResponse | null
  onSave: (payload: ExperienceUpsert) => Promise<void>
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const [draft, setDraft] = useState<ExperienceUpsert>(() => ({
    project_name: item?.project_name ?? "",
    role_title: item?.role_title ?? "",
    description: item?.description ?? "",
    repo_url: item?.repo_url ?? null,
    start_date: item?.start_date ?? null,
    end_date: item?.end_date ?? null,
    is_ongoing: item?.is_ongoing ?? false,
    skill_ids: item?.technologies.map((skill) => skill.skill_id) ?? [],
  }))
  const payload = (): ExperienceUpsert => ({
    ...draft,
    project_name: draft.project_name.trim(),
    role_title: draft.role_title.trim(),
    description: draft.description.trim(),
    repo_url: nullable(draft.repo_url ?? ""),
    start_date: nullable(draft.start_date ?? ""),
    end_date: draft.is_ongoing ? null : nullable(draft.end_date ?? ""),
  })
  const submission = useSubmission(
    () => onSave(payload()),
    () => {
      const errors: Errors = {},
        value = payload()
      validateText(errors, "project_name", value.project_name, 150, true)
      validateText(errors, "role_title", value.role_title, 150, true)
      validateText(errors, "description", value.description, 5000, true)
      validateUrl(errors, "repo_url", value.repo_url)
      validateDates(
        errors,
        "start_date",
        "end_date",
        value.start_date,
        value.end_date,
        true,
      )
      validateSkills(errors, value.skill_ids, 0, 20)
      return errors
    },
    onBusyChange,
  )
  const field = (
    name: "project_name" | "role_title" | "description" | "repo_url" | "start_date" | "end_date",
    label: string,
    options = {},
  ) => (
    <Field
      name={name}
      label={label}
      value={draft[name] ?? ""}
      onChange={(value) =>
        setDraft((previous) => ({ ...previous, [name]: value }))
      }
      errors={submission.errors}
      {...options}
    />
  )
  return (
    <form className="profile-api-form" noValidate onSubmit={submission.submit}>
      <RequestFeedback error={submission.error} />
      <fieldset disabled={submission.busy}>
        <div className="form-grid">
          {field("project_name", "Project name", { required: true, max: 150 })}
          {field("role_title", "Role title", { required: true, max: 150 })}
        </div>
        {field("description", "Description", {
          required: true,
          multiline: true,
          max: 5000,
        })}
        {field("repo_url", "Repository URL", { type: "url", max: 1000 })}
        <div className="form-grid">
          {field("start_date", "Start month", {
            type: "month",
            min: "0001-01",
            maxValue: "9999-12",
          })}
          {field("end_date", "End month", {
            type: "month",
            min: "0001-01",
            maxValue: "9999-12",
            disabled: draft.is_ongoing,
          })}
        </div>
        <label className="profile-checkbox">
          <input
            name="is_ongoing"
            type="checkbox"
            checked={draft.is_ongoing}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                is_ongoing: event.target.checked,
                end_date: event.target.checked ? null : previous.end_date,
              }))
            }
          />
          I am currently working on this project
        </label>
        <SkillsPicker
          min={0}
          max={20}
          saved={item?.technologies ?? []}
          selected={draft.skill_ids}
          onChange={(ids) =>
            setDraft((previous) => ({ ...previous, skill_ids: ids }))
          }
          error={submission.errors.skill_ids}
        />
      </fieldset>
      <FormActions
        busy={submission.busy}
        onCancel={onCancel}
        label="Save experience"
      />
    </form>
  )
}

export function CertificateEditor({
  item,
  onSave,
  onCancel,
  onBusyChange,
}: {
  item: CertificateResponse | null
  onSave: (payload: CertificateUpsert) => Promise<void>
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const [draft, setDraft] = useState<CertificateUpsert>(() => ({
    title: item?.title ?? "",
    issuer: item?.issuer ?? "",
    credential_id: item?.credential_id ?? null,
    credential_url: item?.credential_url ?? null,
    issued_at: item?.issued_at ?? null,
    expires_at: item?.expires_at ?? null,
  }))
  const payload = (): CertificateUpsert => ({
    title: draft.title.trim(),
    issuer: draft.issuer.trim(),
    credential_id: nullable(draft.credential_id ?? ""),
    credential_url: nullable(draft.credential_url ?? ""),
    issued_at: nullable(draft.issued_at ?? ""),
    expires_at: nullable(draft.expires_at ?? ""),
  })
  const submission = useSubmission(
    () => onSave(payload()),
    () => {
      const errors: Errors = {},
        value = payload()
      validateText(errors, "title", value.title, 255, true)
      validateText(errors, "issuer", value.issuer, 255, true)
      validateText(errors, "credential_id", value.credential_id ?? "", 255)
      validateUrl(errors, "credential_url", value.credential_url)
      validateDates(
        errors,
        "issued_at",
        "expires_at",
        value.issued_at,
        value.expires_at,
        false,
      )
      return errors
    },
    onBusyChange,
  )
  const field = (
    name: keyof CertificateUpsert,
    label: string,
    options = {},
  ) => (
    <Field
      name={name}
      label={label}
      value={draft[name] ?? ""}
      onChange={(value) =>
        setDraft((previous) => ({ ...previous, [name]: value }))
      }
      errors={submission.errors}
      {...options}
    />
  )
  return (
    <form className="profile-api-form" noValidate onSubmit={submission.submit}>
      <p className="helper-text">
        Add the certificate details supplied by its issuer.
      </p>
      <RequestFeedback error={submission.error} />
      <fieldset disabled={submission.busy}>
        <div className="form-grid">
          {field("title", "Certificate title", { required: true, max: 255 })}
          {field("issuer", "Issuer", { required: true, max: 255 })}
          {field("credential_id", "Credential ID", { max: 255 })}
          {field("credential_url", "Credential URL", {
            type: "url",
            max: 1000,
          })}
          {field("issued_at", "Issued date", {
            type: "date",
            min: "0001-01-01",
            maxValue: "9999-12-31",
          })}
          {field("expires_at", "Expiry date", {
            type: "date",
            min: "0001-01-01",
            maxValue: "9999-12-31",
          })}
        </div>
      </fieldset>
      <FormActions
        busy={submission.busy}
        onCancel={onCancel}
        label="Save certificate"
      />
    </form>
  )
}
