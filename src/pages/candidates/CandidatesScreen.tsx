import { useState } from "react"
import { useSearchParams, Link } from "react-router"
import {
  ArrowUpRight,
  Sparkles,
  Mail,
  Check,
  Bookmark,
  Code2,
  Clock,
  ChevronRight,
  MessageSquare,
  ArrowRight,
  Send,
} from "lucide-react"
import { useTindy, initialCandidates } from "../../store"
import { getMatchTier } from "../../utils/matchTier"
import {
  PageHeader,
  Avatar,
  Chips,
  Button,
  EmptyState,
  Modal,
  Badge,
  Score,
  CardStatusFooter,
} from "../../components/ui"

export function Candidates() {
  const {
    candidateInterested,
    candidateShortlisted,
    candidateInvites,
    candidateActive,
    candidateArchived,
    setCandidateInterested,
    setCandidateShortlisted,
    setCandidateInvites,
    setCandidateActive,
    setCandidateArchived,
    toggleShortlistCandidate,
    notify,
  } = useTindy()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") || "Interested"

  const [inviteModal, setInviteModal] = useState<string | null>(null)
  const [explainCandidate, setExplainCandidate] = useState<
    (typeof initialCandidates)[0] | null
  >(null)

  const statuses: Record<string, string[]> = {
    Interested: candidateInterested,
    Shortlisted: candidateShortlisted,
    Invited: candidateInvites,
    Active: candidateActive,
    Archived: candidateArchived,
  }

  const selected = initialCandidates.filter((candidate) =>
    (statuses[tab] || []).includes(candidate.name),
  )

  return (
    <>
      <PageHeader
        title="Candidate pipeline"
        description="From interested applicants to the teammates who ship with you."
        action={
          <Link to="/leader" className="btn btn-secondary">
            Leader workspace <ArrowUpRight size={15} />
          </Link>
        }
      />
      <div className="status-tabs">
        {Object.entries(statuses).map(([status, people]) => (
          <button
            key={status}
            onClick={() => setParams({ tab: status })}
            className={tab === status ? "active" : ""}
          >
            {status}
            <span>{people.length}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="tab-pane-transition">
        {selected.length > 0 ? (
          <>
            {tab === "Interested" && (
              <div className="info-banner">
                <Sparkles size={18} />
                <span>
                  These students have expressed interest in joining your project.
                  Review their qualifications and reach out.
                </span>
              </div>
            )}

            {tab === "Invited" && (
              <div className="info-banner">
                <Mail size={18} />
                <span>
                  Team invitations sent. You will be alerted when a candidate
                  accepts your invitation.
                </span>
              </div>
            )}

            {tab === "Active" && (
              <div className="info-banner">
                <Check size={18} />
                <span>
                  Active teammates collaborating on your projects in FCAJ.
                </span>
              </div>
            )}

            <div className="project-grid">
              {selected.map((candidate) => {
                const isShortlisted = candidateShortlisted.includes(
                  candidate.name,
                )
                const isInvited = candidateInvites.includes(candidate.name)
                const isActive = candidateActive.includes(candidate.name)

                let cardStatus: string | undefined = undefined
                if (tab === "Interested")
                  cardStatus = "Applicant · Expressed interest"
                else if (tab === "Shortlisted")
                  cardStatus = "Shortlisted · Ready for review"
                else if (tab === "Invited") cardStatus = "Invitation pending"
                else if (tab === "Active") cardStatus = "Team member · Active"
                else if (tab === "Archived") cardStatus = "Archived"

                return (
                  <article className="project-card" key={candidate.name}>
                    <div className="project-card-top">
                      <Avatar
                        name={candidate.name}
                        color={candidate.color}
                        size="md"
                      />
                      <div className="card-category">
                        FPT University · FCAJ
                        <span className="recruiting">
                          <i />
                          Available {candidate.hours}h/wk
                        </span>
                      </div>
                      <button
                        className={`icon-button ${isShortlisted ? "is-saved" : ""}`}
                        onClick={() => {
                          toggleShortlistCandidate(candidate.name)
                          notify(
                            isShortlisted
                              ? `${candidate.name} removed from shortlist`
                              : `${candidate.name} bookmarked to shortlist`,
                          )
                        }}
                        aria-label={
                          isShortlisted
                            ? "Remove from shortlist"
                            : "Shortlist candidate"
                        }
                        title={
                          isShortlisted
                            ? "Remove from shortlist"
                            : "Shortlist candidate"
                        }
                      >
                        <Bookmark
                          size={19}
                          fill={isShortlisted ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    <Link
                      className="project-title"
                      to={`/candidate/${encodeURIComponent(candidate.name)}`}
                    >
                      {candidate.name}
                    </Link>

                    <p className="project-description">{candidate.experience}</p>

                    <Chips items={candidate.skills} />

                    <div className="project-attributes">
                      <span>
                        <Code2 size={14} />
                        {candidate.role}
                      </span>
                      <span>
                        <Clock size={14} />
                        {candidate.hours} hrs/week <b>·</b> Capstone 2026
                      </span>
                    </div>

                    <div className={`match-strip match-tier-${getMatchTier(candidate.match).tier}`}>
                      <Score value={candidate.match} compact />
                      <button onClick={() => setExplainCandidate(candidate)}>
                        Why this match <ChevronRight size={13} />
                      </button>
                    </div>

                    <div className="project-card-bottom">
                      <div className="team-preview">
                        <div className="avatar-stack">
                          <Avatar
                            name={candidate.name}
                            color={candidate.color}
                          />
                        </div>
                        <small>
                          {candidate.role} · {candidate.hours}h/wk
                        </small>
                      </div>
                      <Link
                        className="view-project"
                        to={`/candidate/${encodeURIComponent(candidate.name)}`}
                      >
                        View candidate <ArrowRight size={14} />
                      </Link>
                    </div>

                    {cardStatus && <CardStatusFooter status={cardStatus} />}
                  </article>
                )
              })}
            </div>

            {tab === "Invited" &&
              selected.map((candidate) => (
                <div className="invitation-bar" key={candidate.name}>
                  <span>
                    Invitation sent to <strong>{candidate.name}</strong> for{" "}
                    <strong>{candidate.role}</strong>
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <Link
                      className="btn btn-secondary"
                      to={`/messages?conversation=${encodeURIComponent(candidate.name)}`}
                    >
                      <MessageSquare size={14} /> Chat
                    </Link>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCandidateInvites((old) =>
                          old.filter((n) => n !== candidate.name),
                        )
                        notify(`Invitation to ${candidate.name} cancelled`)
                      }}
                    >
                      Cancel invitation
                    </Button>
                  </div>
                </div>
              ))}
          </>
        ) : (
          <EmptyState
            title={
              tab === "Shortlisted"
                ? "You haven't bookmarked any candidates yet."
                : tab === "Interested"
                  ? "No candidates in your interest list yet."
                  : tab === "Invited"
                    ? "No pending team invitations."
                    : tab === "Active"
                      ? "No active team members in this pipeline yet."
                      : "No candidates archived."
            }
            description={
              tab === "Shortlisted"
                ? "Save standout applicants by clicking the bookmark icon on their card."
                : tab === "Interested"
                  ? "Browse candidate profiles or share your project brief to attract applicants."
                  : tab === "Invited"
                    ? "Invite candidates from your Interested or Shortlisted pipeline to form your team."
                    : tab === "Active"
                      ? "Once candidates accept your team invitations, they will appear here as active teammates."
                      : "Candidates you dismiss or archive will be kept here for reference."
            }
            action={
              tab === "Shortlisted" || tab === "Invited" ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setParams({ tab: "Interested" })}
                >
                  Browse interested candidates <ArrowRight size={15} />
                </button>
              ) : tab === "Active" ? (
                <Link to="/team" className="btn btn-primary">
                  Open team workspace <ArrowRight size={15} />
                </Link>
              ) : (
                <Link to="/leader" className="btn btn-primary">
                  Leader workspace <ArrowRight size={15} />
                </Link>
              )
            }
          />
        )}
      </div>

      {inviteModal && (
        <Modal title="Team invitation" onClose={() => setInviteModal(null)}>
          <Badge tone="success">INVITATION</Badge>
          <h2>Invite {inviteModal} to your team?</h2>
          <p>
            They will receive an invitation for the selected project.
            as a core contributor.
          </p>
          <label className="field">
            A personal note
            <textarea
              rows={3}
              defaultValue="Hi! Your background aligns nicely with our project goals. We'd love to build with you!"
            />
          </label>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setInviteModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCandidateInvites((old) => [
                  ...new Set([...old, inviteModal]),
                ])
                notify("Team invitation sent to " + inviteModal)
                setInviteModal(null)
              }}
            >
              Send invitation <Send size={15} />
            </Button>
          </div>
        </Modal>
      )}

      {explainCandidate && (
        <Modal
          drawer
          title="Match explanation"
          onClose={() => setExplainCandidate(null)}
        >
          <div className="drawer-header">
            <Score
              value={explainCandidate.match}
              subtitle="Calculated against the selected project requirements"
            />
          </div>
          <h3>Why {explainCandidate.name} matches your project</h3>
          <ul className="match-evidence">
            <li>
              <strong>Relevant Skills:</strong> Demonstrated expertise in{" "}
              {explainCandidate.skills.join(", ")}.
            </li>
            <li>
              <strong>Availability:</strong> Can commit{" "}
              {explainCandidate.hours} hrs/week to team milestones and reviews.
            </li>
            <li>
              <strong>Role Focus:</strong> Specializes in{" "}
              {explainCandidate.role} tasks.
            </li>
            <li>
              <strong>FCAJ Community:</strong> Active FPT University student
              with verified coursework.
            </li>
          </ul>
          <div className="modal-actions" style={{ marginTop: "20px" }}>
            <Button
              onClick={() => {
                const name = explainCandidate.name
                setExplainCandidate(null)
                setInviteModal(name)
              }}
            >
              Invite to team <ArrowRight size={14} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setExplainCandidate(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export default Candidates
