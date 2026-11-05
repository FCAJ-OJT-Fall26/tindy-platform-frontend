import InvitationHistory from "../../components/candidates/InvitationHistory"

import "../discovery/live-teammates.css"

export default function MyProjectInvitationsView() {
  return (
    <div className="live-teammates project-invitations-view">
      <InvitationHistory mode="member" />
    </div>
  )
}
