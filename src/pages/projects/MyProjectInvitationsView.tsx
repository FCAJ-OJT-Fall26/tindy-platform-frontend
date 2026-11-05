import InvitationHistory from "../../components/candidates/InvitationHistory"
import "../discovery/live-teammates.css"

export default function MyProjectInvitationsView() {
  return (
    <div className="live-teammates">
      <h2>Project Invitations</h2>
      <p>
        Review invitations sent to this account. Acceptance is confirmed by the
        Backend and refreshes your actual memberships.
      </p>
      <InvitationHistory mode="member" />
    </div>
  )
}
