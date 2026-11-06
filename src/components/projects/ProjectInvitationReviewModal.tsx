import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { BriefcaseBusiness, CalendarDays, Clock3, Mail, MessageSquareQuote, ShieldCheck } from "lucide-react"
import "./project-invitation-review.css"
import { Modal } from "../ui"
import useTeammateSession from "../../hooks/useTeammateSession"
import { useTindy } from "../../store"
import {
  readInvitationAttempt,
  reconcileInvitationAttempt,
  respondInvitationSafely,
} from "../../services/invitationAttempts"
import { sameId, teammateErrorMessage } from "../../services/teammates.service"
import type { ProjectInvitationDto } from "../../types/invitation"

export default function ProjectInvitationReviewModal({
  invitation,
  mode,
  projectName,
  positionName,
  personName,
  onClose,
  onConfirmed,
  onRefresh,
}: {
  invitation: ProjectInvitationDto
  mode: "member" | "leader"
  projectName: string
  positionName: string
  personName: string
  onClose: () => void
  onConfirmed: (row: ProjectInvitationDto) => void
  onRefresh: () => void
}) {
  const session = useTeammateSession()
  const { ownerProfile } = useTindy()
  const read = () => {
    try {
      return {
        attempt: session.userId
          ? readInvitationAttempt(
              session.userId,
              invitation.project_id,
              invitation.invited_user_id,
            )
          : null,
        error: "",
      }
    } catch (reason) {
      return { attempt: null, error: teammateErrorMessage(reason) }
    }
  }
  const [journal, setJournal] = useState(read)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState("")
  const scope = useRef(session.key)
  scope.current = session.key
  useEffect(() => { scope.current = session.key; return () => { scope.current = null } }, [session.key])
  const own =
    !!session.userId &&
    (mode === "leader" || sameId(invitation.invited_user_id, session.userId))
  // Leader rows arrive from the project-owned history endpoint. Cancel is
  // authorized by the CURRENT project leader, not the historical sender UUID.
  const expired = Date.now() >= Date.parse(invitation.expires_at)
  const optedOut =
    mode === "member" && ownerProfile.data?.open_to_team_invitations === false
  const act = async (action: "accept" | "decline" | "cancel" | "check") => {
    if (!session.userId || lock.current || !own) return
    const owner = session.key
    lock.current = true
    setBusy(true)
    setError("")
    try {
      const result =
        action === "check" && journal.attempt
          ? await reconcileInvitationAttempt(journal.attempt)
          : action === "check"
            ? null
            : await respondInvitationSafely(session.userId, invitation, action)
      if (scope.current !== owner) return
      if (result) onConfirmed(result)
      else
        setError(
          "The previous outcome is still unconfirmed. Check history again; no mutation will be repeated automatically.",
        )
    } catch (reason) {
      if (scope.current === owner) {
        setError(teammateErrorMessage(reason))
        onRefresh()
      }
    } finally {
      if (scope.current === owner) {
        setJournal(read())
        lock.current = false
        setBusy(false)
      }
    }
  }
  const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
  const timeLabel = (value: string) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value))
  const personInitials = personName.split(" ").filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase()
  return (
    <Modal
      title={
        mode === "leader" ? "Sent Invitation" : "Review Project Invitation"
      }
      onClose={onClose}
      className="project-invitation-review"
      dismissible={!busy}
    >
      <div className="teammate-dialog invitation-review-body">
        <div className="invitation-review-summary">
          <div className="invitation-review-topline">
            <span className="invitation-review-kicker"><Mail size={14} aria-hidden="true" /> PROJECT INVITATION</span>
            <span className="teammate-status invitation-review-status" data-status={invitation.status}>
              <span aria-hidden="true" />{invitation.status}
            </span>
          </div>
          <h2>{projectName}</h2>
          <div className="invitation-review-position"><BriefcaseBusiness size={16} aria-hidden="true" />{positionName}</div>
          <div className="invitation-review-person">
            <span className="invitation-review-avatar" aria-hidden="true">{personInitials || "?"}</span>
            <div><span>{mode === "leader" ? "Invited member" : "Invited by"}</span><strong>{personName}</strong></div>
          </div>
        </div>
        <section className="invitation-review-message" aria-label="Invitation message">
          <h3><MessageSquareQuote size={15} aria-hidden="true" />A personal note</h3>
          <p>{invitation.message?.trim() || "No message included."}</p>
        </section>
        <dl className="invitation-review-dates">
          <div>
            <dt><CalendarDays size={15} aria-hidden="true" />Sent</dt>
            <dd><time dateTime={invitation.created_at}>{dateLabel(invitation.created_at)}<small>{timeLabel(invitation.created_at)}</small></time></dd>
          </div>
          <div>
            <dt><Clock3 size={15} aria-hidden="true" />{invitation.status === "pending" ? "Respond by" : "Expiration"}</dt>
            <dd><time dateTime={invitation.expires_at}>{dateLabel(invitation.expires_at)}<small>{timeLabel(invitation.expires_at)}</small></time></dd>
          </div>
          {invitation.responded_at && <div>
            <dt><CalendarDays size={15} aria-hidden="true" />Responded</dt>
            <dd><time dateTime={invitation.responded_at}>{dateLabel(invitation.responded_at)}<small>{timeLabel(invitation.responded_at)}</small></time></dd>
          </div>}
        </dl>
        {mode === "member" && invitation.status === "pending" && (
          <div className="invitation-review-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>Accept to join this project. The position must still be available.<span>You can respond until this invitation expires, even if recruitment has closed.</span></p>
          </div>
        )}
        {optedOut && (
          <p role="status">
            Invitation consent is disabled.{" "}
            <Link className="text-link" to="/profile">
              Open Profile Settings to re-enable it
            </Link>
            . You can still decline.
          </p>
        )}
        {expired && invitation.status === "pending" && (
          <p role="status">
            This invitation has expired. Refresh to see its latest status.
          </p>
        )}
        {invitation.status === "declined" && invitation.responded_at && (
          <p className="helper-text">
            New invitations for this Project/member are blocked for 7 days after
            the recorded decline.
          </p>
        )}
        {!own && (
          <p role="alert">
            This invitation does not belong to the current account.
          </p>
        )}
        {(error || journal.error) && (
          <p role="alert">{error || journal.error}</p>
        )}
        {journal.attempt && (
          <p className="teammate-unknown">
            A previous request has an unknown result. Check its status before
            another action.
          </p>
        )}
        <div className="teammate-actions invitation-review-actions">
          <button className="btn-secondary" disabled={busy} onClick={onClose}>
            Close
          </button>
          {journal.attempt ? (
            <button
              className="btn-primary"
              disabled={busy || !own}
              onClick={() => void act("check")}
            >
              Check invitation status
            </button>
          ) : (
            invitation.status === "pending" &&
            own && (
              <>
                {mode === "leader" ? (
                  <button
                    className="btn-primary"
                    disabled={busy || !!journal.error}
                    onClick={() => void act("cancel")}
                  >
                    Confirm Cancel Invitation
                  </button>
                ) : (
                  <>
                    <button
                      className="btn-secondary"
                      disabled={busy || !!journal.error}
                      onClick={() => void act("decline")}
                    >
                      Confirm Decline
                    </button>
                    <button
                      className="btn-primary"
                      disabled={busy || !!journal.error || expired || optedOut}
                      onClick={() => void act("accept")}
                    >
                      Confirm Accept
                    </button>
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}
