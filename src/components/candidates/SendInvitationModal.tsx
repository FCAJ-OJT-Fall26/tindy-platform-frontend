import {
  Send,
  FolderKanban,
  Clock3,
  ArrowUpRight,
  History,
  LoaderCircle,
} from "lucide-react"
import "./send-invitation.css"
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
  useEffect(() => {
    currentSession.current = session.key
    return () => {
      currentSession.current = null
    }
  }, [session.key])
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
          "We couldn’t confirm whether the invitation was sent. Your message is saved. Check its status before trying again.",
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
  const initials = candidateName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  return (
    <Modal
      title="Project invitation"
      onClose={onClose}
      dismissible={!busy}
      className="project-invitation-modal"
    >
      <div className="invitation-content">
        <div className="invitation-recipient">
          <span className="invitation-avatar">{initials || "?"}</span>
          <div>
            <span className="invitation-eyebrow">INVITE TO YOUR TEAM</span>
            <h2>{candidateName}</h2>
          </div>
        </div>
        <div className="invitation-context">
          <span className="invitation-project-icon">
            <FolderKanban size={20} strokeWidth={1.6} />
          </span>
          <div>
            <span>PROJECT & POSITION</span>
            <strong>{projectName}</strong>
            <p>{positionName}</p>
          </div>
        </div>
        <div className="invitation-notice">
          <Clock3 size={16} />
          <p>
            <strong>They’ll have 7 days to respond.</strong>
            <span>A pending invitation doesn’t reserve a slot.</span>
          </p>
        </div>
        <label className="invitation-message-field">
          <span>
            Your message <small>Optional</small>
          </span>
          <textarea
            aria-label="Invitation message"
            maxLength={2000}
            rows={4}
            value={message}
            disabled={busy || !!journal.attempt || !!journal.error}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hello and share why you’d love to have them on your team…"
          />
        </label>
        <div className="invitation-message-meta">
          <span>A personal note goes a long way.</span>
          <span aria-live="polite">
            {message.length.toLocaleString("en-US")} / 2,000
          </span>
        </div>
        {blocker && (
          <p className="invitation-status" role="status">
            {blocker}
          </p>
        )}
        {journal.attempt && (
          <p className="invitation-status" role="status">
            We’re still confirming your previous invitation. Check its status
            before sending another.
          </p>
        )}
        {(error || journal.error) && (
          <p className="invitation-error" role="alert">
            {error || journal.error}
          </p>
        )}
      </div>
      <footer className="invitation-footer">
        <Link
          className="invitation-history"
          to={
            "/candidates?project_id=" +
            projectId +
            "&position_id=" +
            positionId +
            "&tab=Invited"
          }
        >
          <History size={14} />
          Sent invitations
          <ArrowUpRight size={12} />
        </Link>
        <div className="invitation-actions">
          <button
            className="invitation-cancel"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
          {journal.attempt ? (
            <button
              className="invitation-send"
              disabled={busy}
              onClick={() => void run(true)}
            >
              {busy && (
                <LoaderCircle size={15} className="invitation-spinner" />
              )}
              {busy ? "Checking…" : "Check invitation status"}
            </button>
          ) : (
            <button
              className="invitation-send"
              disabled={busy || !!blocker || !!journal.error || !session.userId}
              onClick={() => void run(false)}
            >
              {busy ? (
                <LoaderCircle size={15} className="invitation-spinner" />
              ) : (
                <Send size={14} />
              )}
              {busy ? "Sending…" : "Send invitation"}
            </button>
          )}
        </div>
      </footer>
    </Modal>
  )
}
