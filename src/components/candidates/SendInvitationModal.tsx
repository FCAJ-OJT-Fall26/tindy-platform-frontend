import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { Modal } from "../ui"
import useTeammateSession from "../../hooks/useTeammateSession"
import {
  readInvitationAttempt,
  reconcileInvitationAttempt,
  sendInvitationSafely,
} from "../../services/invitationAttempts"
import { teammateErrorMessage } from "../../services/teammates.service"
import type { ProjectInvitationDto } from "../../types/invitation"

export default function SendInvitationModal({
  projectId,
  positionId,
  userId,
  candidateName,
  projectName,
  positionName,
  blocker,
  onClose,
  onConfirmed,
}: {
  projectId: string
  positionId: string
  userId: string
  candidateName: string
  projectName: string
  positionName: string
  blocker: string | null
  onClose: () => void
  onConfirmed: (invitation: ProjectInvitationDto) => void
}) {
  const session = useTeammateSession()
  const initial = () => {
    try {
      return {
        attempt: session.userId
          ? readInvitationAttempt(session.userId, projectId, userId)
          : null,
        error: "",
      }
    } catch (reason) {
      return { attempt: null, error: teammateErrorMessage(reason) }
    }
  }
  const [journal, setJournal] = useState(initial)
  const [message, setMessage] = useState(
    journal.attempt?.kind === "send" ? (journal.attempt.message ?? "") : "",
  )
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState(journal.error)
  const currentSession = useRef(session.key)
  currentSession.current = session.key
  useEffect(() => { currentSession.current = session.key; return () => { currentSession.current = null } }, [session.key])
  const run = async (check: boolean) => {
    if (!session.userId || lock.current) return
    const owner = session.key
    lock.current = true
    setBusy(true)
    setError("")
    try {
      const result =
        check && journal.attempt
          ? await reconcileInvitationAttempt(journal.attempt)
          : await sendInvitationSafely(
              session.userId,
              projectId,
              positionId,
              userId,
              message,
            )
      if (currentSession.current !== owner) return
      if (result) onConfirmed(result)
      else
        setError(
          "No unique committed result is confirmed yet. The message is retained; check status again. No second invitation will be sent.",
        )
    } catch (reason) {
      if (currentSession.current === owner)
        setError(teammateErrorMessage(reason))
    } finally {
      if (currentSession.current === owner) {
        try {
          setJournal({
            attempt: readInvitationAttempt(session.userId, projectId, userId),
            error: "",
          })
        } catch (reason) {
          setJournal({ attempt: null, error: teammateErrorMessage(reason) })
        }
        setBusy(false)
        lock.current = false
      }
    }
  }
  return (
    <Modal
      title="Send Project Invitation"
      onClose={onClose}
      dismissible={!busy}
    >
      <div className="teammate-dialog">
        <h2>{candidateName}</h2>
        <p>
          {projectName} · {positionName}
        </p>
        <p>
          Invitations expire 7 days after creation. A pending invitation does
          not reserve a slot.
        </p>
        <label className="field">
          Optional message
          <textarea
            aria-label="Invitation message"
            maxLength={2000}
            rows={5}
            value={message}
            disabled={busy || !!journal.attempt || !!journal.error}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <p className="helper-text">{message.length}/2000</p>
        {blocker && <p role="status">{blocker}</p>}
        {journal.attempt && (
          <p role="status">
            A previous invitation request has an unconfirmed outcome. Check
            backend history before continuing.
          </p>
        )}
        {(error || journal.error) && (
          <p role="alert">{error || journal.error}</p>
        )}
        <div className="teammate-actions">
          <button className="btn-secondary" disabled={busy} onClick={onClose}>
            Close
          </button>
          {journal.attempt ? (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => void run(true)}
            >
              {busy ? "Checking…" : "Check invitation status"}
            </button>
          ) : (
            <button
              className="btn-primary"
              disabled={busy || !!blocker || !!journal.error || !session.userId}
              onClick={() => void run(false)}
            >
              {busy ? "Sending…" : "Confirm Send Invitation"}
            </button>
          )}
        </div>
        <Link
          className="text-link"
          to={`/candidates?project_id=${projectId}&position_id=${positionId}&tab=Invited`}
        >
          View sent invitation history
        </Link>
      </div>
    </Modal>
  )
}
