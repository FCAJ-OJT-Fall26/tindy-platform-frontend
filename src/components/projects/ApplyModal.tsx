import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { AlertCircle, ArrowUpRight } from "lucide-react"
import { Button, Modal } from "../ui"
import { useTindy } from "../../store"
import useRemoteResource from "../../hooks/useRemoteResource"
import { ApiError } from "../../services/apiClient"
import { getProjectByIdApi } from "../../services/projects.service"
import {
  APPLICATIONS_CHANGED_EVENT,
  applyToProject,
  applicationErrorMessage,
  getAllMyApplications,
} from "../../services/applications.service"
import { applicationBlocker, type ProjectApplicationDto } from "../../types/application"
import { formatClosingDate } from "../../services/recruitmentDeadline"
import "./apply-modal.css"

type Attempt = { position: string; message: string; knownIds: Set<string> }
const uncertainAttempts = new Map<string, Attempt>()

export default function ApplyModal({
  projectId,
  preferredPositionId,
  onClose,
  onConfirmed,
}: {
  projectId: string
  preferredPositionId?: string
  onClose: () => void
  onConfirmed: (application: ProjectApplicationDto) => void
}) {
  const { authUser } = useTindy()
  const owner = authUser?.user_id ?? ""
  const scope = `${owner}:${projectId}`
  const current = useRef(scope)
  current.current = scope
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const previous = uncertainAttempts.get(scope)
  const [position, setPosition] = useState(previous?.position ?? preferredPositionId ?? "")
  const [message, setMessage] = useState(previous?.message ?? "")
  const [unknown, setUnknown] = useState(Boolean(previous))
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [project, history] = await Promise.all([
        getProjectByIdApi(projectId, signal),
        getAllMyApplications(signal),
      ])
      return { project, history }
    },
    [projectId]
  )
  const resource = useRemoteResource(owner ? scope : null, load)
  const project = resource.data?.project
  const open = project?.positions.filter((p) => p.status === "open" && p.filled_count < p.required_count) ?? []

  useEffect(() => {
    if (!unknown && project && !open.some((p) => p.position_id === position)) {
      setPosition(open[0]?.position_id ?? "")
    }
  }, [project, unknown, position, open])

  const blocked = project && resource.data ? applicationBlocker(project, owner, resource.data.history) : "Checking eligibility…"

  const confirm = async () => {
    if (locked.current || !resource.data || (!unknown && (blocked || !position))) return
    locked.current = true
    setBusy(true)
    setError("")
    const expected = scope
    try {
      let application: ProjectApplicationDto
      if (unknown) {
        const attempt = uncertainAttempts.get(expected)
        if (!attempt) throw Error("No application attempt is available to reconcile.")
        const history = await getAllMyApplications()
        const found = history.filter(
          (a) =>
            !attempt.knownIds.has(a.application_id) &&
            a.project_id === projectId &&
            a.position_id === attempt.position &&
            (a.message ?? "") === attempt.message.trim()
        )
        if (found.length !== 1) {
          setError("The previous attempt is still unconfirmed. Check My Applications; no second POST has been sent.")
          return
        }
        application = found[0]
      } else {
        const currentBlock = applicationBlocker(resource.data.project, owner, resource.data.history)
        if (currentBlock) {
          setError(currentBlock)
          return
        }
        uncertainAttempts.set(expected, {
          position,
          message,
          knownIds: new Set(resource.data.history.map((a) => a.application_id)),
        })
        application = await applyToProject(projectId, position, message)
      }
      uncertainAttempts.delete(expected)
      if (mounted.current && current.current === expected) {
        window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT))
        onConfirmed(application)
      }
    } catch (reason) {
      if (!mounted.current || current.current !== expected) return
      const uncertain = !(reason instanceof ApiError) || reason.status >= 500 || reason.status < 400
      if (uncertain) setUnknown(true)
      else {
        uncertainAttempts.delete(expected)
        resource.reload()
      }
      setError(applicationErrorMessage(reason))
    } finally {
      locked.current = false
      if (mounted.current && current.current === expected) setBusy(false)
    }
  }

  return (
    <Modal title="Apply to a position" onClose={() => { if (!busy) onClose() }}>
      <div className="apply-modal-content">
        <div className="apply-modal-header">
          {project?.category && (
            <span className="apply-modal-project-badge">
              {project.category}
            </span>
          )}
          <h2>{project?.name ?? "Project application"}</h2>
          <p className="apply-modal-subtitle">
            Choose an open position and confirm. This submits your application for the leader to review.
          </p>
          {project && (
            <div className="apply-modal-deadline-line">
              Recruitment deadline: <strong>{formatClosingDate(project.recruitment_closing_date)}</strong> (Vietnam time)
            </div>
          )}
        </div>

        {resource.loading && <p role="status">Checking project and application status…</p>}

        {Boolean(resource.error) && (
          <div className="apply-modal-alert is-error" role="alert">
            <AlertCircle size={15} className="shrink-0" />
            <div className="flex-1 flex items-center justify-between gap-2">
              <span>{applicationErrorMessage(resource.error)}</span>
              <Button variant="secondary" onClick={resource.reload}>Retry</Button>
            </div>
          </div>
        )}

        {blocked && !resource.loading && !resource.error && (
          <div className="apply-modal-alert is-warning" role="status">
            <AlertCircle size={15} className="shrink-0" />
            <span>{blocked}</span>
          </div>
        )}

        <div className="apply-modal-form-fields">
          <div className="apply-modal-field">
            <label className="apply-modal-label" htmlFor="apply-position-select">
              <span>Target Position <span className="apply-modal-required-mark">*</span></span>
              <span className="apply-modal-label-helper">
                {open.length} {open.length === 1 ? "opening" : "openings"} available
              </span>
            </label>
            <div className="apply-modal-select-wrap">
              <select
                id="apply-position-select"
                className="apply-modal-select"
                aria-label="Application position"
                value={position}
                disabled={busy || unknown || !!blocked}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="">Select an open position</option>
                {open.map((p) => (
                  <option key={p.position_id} value={p.position_id}>
                    {p.title} · {p.required_count - p.filled_count} slots · {p.experience_level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="apply-modal-field">
            <div className="apply-modal-label">
              <span>Message to Leader <small>(optional)</small></span>
              <span className="apply-modal-label-helper">{message.length}/2000</span>
            </div>
            <textarea
              className="apply-modal-textarea"
              aria-label="Application message"
              placeholder="Introduce yourself, highlight relevant experience, or share why you want to join this project..."
              value={message}
              maxLength={2000}
              disabled={busy || unknown}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {(error || unknown) && (
          <div className="apply-modal-alert is-error" role="alert">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error || "The previous submission has an unknown outcome. Check its status before submitting again."}</span>
          </div>
        )}

        <div className="apply-modal-footer">
          <Link className="text-link" to="/projects?tab=Interested">
            <span>My Applications</span>
            <ArrowUpRight size={13} />
          </Link>
          <div className="apply-modal-buttons">
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                resource.loading ||
                !!resource.error ||
                (!unknown && (!!blocked || !position))
              }
              onClick={() => {
                void confirm()
              }}
            >
              {busy ? "Checking…" : unknown ? "Check application status" : "Confirm application"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
