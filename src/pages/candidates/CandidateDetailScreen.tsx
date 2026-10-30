import { useParams, Link } from "react-router"
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  
  Check,
  TriangleAlert,
  ArrowRight,
  Info,
} from "lucide-react"
import { useTindy, initialCandidates, initialProjects } from "../../store"
import { useExplanation } from "../../utils/useExplanation"
import { PageHeader, Avatar, Badge, Button, Chips } from "../../components/ui"
import NotFoundPage from "../NotFoundPage"

export function CandidateDetail() {
  const { id } = useParams()
  const candidate = initialCandidates.find((person) => person.name === id)
  const { candidateInvites, setCandidateInvites, notify } = useTindy()
  const explanation = useExplanation(
    candidate
      ? {
          skills: candidate.skills,
          role: candidate.role,
          hours: String(candidate.hours),
          experience: candidate.experience,
        }
      : undefined,
  )

  if (!candidate) return <NotFoundPage />

  return (
    <>
      <Link className="back-link" to="/team">
        <ArrowLeft size={14} />
        Back to team workspace
      </Link>
      <PageHeader
        title="A person behind the profile."
        description="Candidate review"
      />
      <div className="panel candidate-detail-top">
        <Avatar name={candidate.name} color={candidate.color} size="xl" />
        <div>
          <h1>{candidate.name}</h1>
          <p>{candidate.role} · FPT University</p>
          <div className="header-buttons">
            <Badge tone="success">{candidate.match}% match</Badge>
            <Badge>
              <Clock size={12} />
              {candidate.hours} hrs/week
            </Badge>
          </div>
        </div>
        <div className="header-buttons">
          <Link
            className="btn btn-secondary"
            to={`/messages?conversation=${encodeURIComponent(candidate.name)}`}
          >
            <MessageSquare size={15} />
            Invite to chat
          </Link>
          <Button
            disabled={candidateInvites.includes(candidate.name)}
            onClick={() => {
              setCandidateInvites((old) => [...old, candidate.name])
              notify("Team invitation sent")
            }}
          >
            {candidateInvites.includes(candidate.name)
              ? "Invitation sent ✓"
              : "Invite to team"}
          </Button>
        </div>
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <h2>Profile summary</h2>
            <p>
              {candidate.role} with practical experience in{" "}
              {candidate.skills.join(", ")}. Passionate about building reliable
              applications, learning through real projects, and collaborating
              with the FCAJ community.
            </p>
            <h3>Technical skills</h3>
            <Chips items={candidate.skills} />
            <h3>Project experience</h3>
            <div className="experience-card">
              <span className={`project-mark ${candidate.color}`}>PR</span>
              <div>
                <h3>Student project portfolio</h3>
                <p>{candidate.experience}</p>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Explore GitHub <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
            <h3>Certificates</h3>
            <div className="certificate">
              <ShieldCheck size={21} />
              <div>
                <strong>AWS Cloud Practitioner</strong>
                <small>Supporting evidence · Example certificate</small>
              </div>
            </div>
          </section>
          <section className="panel">
            <h2>Preferences & availability</h2>
            <div className="form-grid">
              <div>
                <h3>Preferred role</h3>
                <p>{candidate.role}</p>
              </div>
              <div>
                <h3>Weekly commitment</h3>
                <p>{candidate.hours} hours / week</p>
              </div>
            </div>
            <h3>Interests</h3>
            <Chips
              items={["Cloud computing", "AI applications", "Open source"]}
            />
          </section>
        </div>
        <aside>
          <section className="panel">
            <div className="insight-label">
              AI MATCH ANALYSIS
            </div>
            <h2>{candidate.match}% match</h2>
            <div className="quick-matches">
              <p>
                <Check size={14} />
                {candidate.skills[0]} experience
              </p>
              <p>
                <Check size={14} />
                Relevant project evidence
              </p>
              <p>
                <Check size={14} />
                Availability fits the project
              </p>
            </div>
            <div className="gap-summary">
              <TriangleAlert size={15} />
              <div>
                <strong>Room to grow</strong>
                <p>Docker deployment experience isn’t listed.</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="full"
              onClick={() =>
                explanation.open({
                  ...initialProjects[0],
                  factors: [
                    candidate.match,
                    candidate.match,
                    candidate.match,
                    candidate.match,
                    candidate.match,
                  ],
                })
              }
            >
              See full explanation <ArrowRight size={14} />
            </Button>
          </section>
          <div className="trust-note">
            <Info size={15} />
            <span>
              Illustrative candidate data. A score supports your review; it
              doesn’t replace it.
            </span>
          </div>
        </aside>
      </div>
      {explanation.element}
    </>
  )
}

export default CandidateDetail
