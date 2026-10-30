import { useCallback, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  FolderKanban,
  GraduationCap,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react"
import { Avatar, Badge, Button, Chips, Modal, Score, ProjectSaveButton, SkipActionButton } from "../../components/ui"
import LeaderPositionManagerModal from "../../components/projects/LeaderPositionManagerModal"
import { useTindy } from "../../store"
import {
  fromApiDifficulty,
  getProjectByIdApi,
  isGuid,
  mapProjectDetailToUiProject,
} from "../../services/projects.service"
import type { ProjectDetailDto } from "../../types/project"
import { useExplanation } from "../../utils/useExplanation"
import useRemoteResource from "../../hooks/useRemoteResource"
import { projectErrorMessage } from "../../services/projectEditor.service"
import ApplyModal from "../../components/projects/ApplyModal"
import useMyApplications from "../../hooks/useMyApplications"
import { applicationBlocker } from "../../types/application"
import { setDiscoveryFlag } from "../../services/discovery.service"
import { formatClosingDate } from "../../services/recruitmentDeadline"
import RuleMatchPanel from "../../components/discovery/RuleMatchPanel"
import type { RuleMatch } from "../../types/discovery"
import "./project-detail.css"

function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action}
    </div>
  )
}

export function ProjectDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const applications = useMyApplications()
  const [actionError, setActionError] = useState("")
  const {
    authUser,
    setProjects,
    saved,
    toggleSave,
    interested,
    setInterested,
    setSkipped,
    notify,
    active,
  } = useTindy()
  const load = useCallback((signal: AbortSignal) => getProjectByIdApi(id ?? "", signal), [id])
  const resource = useRemoteResource(id && authUser ? `${authUser.user_id}:${id}` : null, load)
  const remoteDetail = resource.data
  const explanation = useExplanation()
  const [interestModal, setInterestModal] = useState(false)
  const [showPositionManager, setShowPositionManager] = useState(false)
  const [matchDetailsOpen, setMatchDetailsOpen] = useState(false)

  useEffect(() => {
    if (!remoteDetail) return
    const mapped = mapProjectDetailToUiProject(remoteDetail)
    setProjects(old => [...old.filter(project => project.id !== mapped.id), mapped])
  }, [remoteDetail, setProjects])

  if (resource.loading) return <div className="info-banner" role="status">Loading project…</div>
  if (resource.error) return <div className="info-banner" role="alert">{projectErrorMessage(resource.error)} <button onClick={resource.reload}>Retry</button> <Link to="/projects">Back to projects</Link></div>
  if (!remoteDetail) return null
  const project = mapProjectDetailToUiProject(remoteDetail)
  const sent = applications.data?.some(a => a.project_id === project.id && a.status === "pending") ?? false
  const blocked = applicationBlocker(remoteDetail, authUser?.user_id ?? "", applications.data ?? [])
  const fromFeed: RuleMatch | null = location.state?.matchOwner === authUser?.user_id ? location.state?.match ?? null : null
  const isOwner = remoteDetail.leader.user_id === authUser?.user_id
  return (
    <section className="project-detail-page">
      <Link className="back-link" to="/discover">
        <ArrowLeft size={14} />
        Back to projects
      </Link>
      <div className="project-detail-header">
        <div>
          <div className="project-detail-brand">
            <span className={`project-mark big ${project.color}`}>
              {project.initials}
            </span>
            <Badge tone="success">
              <span className="online-dot" />
              {remoteDetail.status.replace(/_/g, " ")}
            </Badge>
            <span className="muted">{project.type}</span>
          </div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
          <div className="leader-line">
            <Avatar name={project.leader} color={project.color} />
            <span>
              Led by <strong>{project.leader}</strong>
            </span>
            <b>·</b>
            <Users size={14} />
            {project.team} / {project.capacity} members
          </div>
        </div>
        <div className="detail-header-actions">
          <div className="detail-primary-actions">
            {isOwner ? (
              <>
                <Link className="btn btn-primary" to={`/project/${project.id}/edit`}>
                  Manage project <ArrowRight size={16} />
                </Link>
                <Link className="btn btn-secondary" to={`/project/${project.id}/applications`}>
                  <Users size={15} />
                  Candidate pipeline
                </Link>
              </>
            ) : (
              <>
                <Button
                  disabled={!!blocked || applications.loading || !!applications.error}
                  title={blocked ?? undefined}
                  onClick={() => setInterestModal(true)}
                >
                  {sent ? (
                    <>
                      <Check size={16} />
                      Application pending
                    </>
                  ) : (
                    <>
                      Apply to Position <ArrowRight size={16} />
                    </>
                  )}
                </Button>
                <ProjectSaveButton
                  saved={saved.includes(project.id)}
                  onToggle={() => toggleSave(project.id)}
                  variant="button"
                  size={16}
                  projectName={project.name}
                />
              </>
            )}
          </div>
          {!isOwner && (
            <div className="detail-sub-actions">
              {Boolean(applications.error) && (
                <p role="alert">
                  Application status unavailable. <button onClick={applications.reload}>Retry</button>
                </p>
              )}
              {actionError && <p role="alert">{actionError}</p>}
              {sent ? (
                <span className="detail-status-pill">
                  <Clock size={11} />
                  Waiting for leader review
                </span>
              ) : (
                <>
                  {blocked && <span className="detail-blocked-note">{blocked}</span>}
                  <SkipActionButton
                    onClick={async () => {
                      try {
                        await setDiscoveryFlag(project.id, "skipped", true);
                        notify("Project skipped.");
                        navigate("/discover");
                      } catch (error) {
                        setActionError(projectErrorMessage(error));
                      }
                    }}
                    className="detail-skip-btn"
                    title="Skip recommendation"
                    ariaLabel="Skip for now"
                    showIcon={false}
                  >
                    Skip for now
                  </SkipActionButton>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <h2>About the project</h2>
            <p>
              {project.description}
            </p>
            <h3>Project goals</h3>
            <ul className="goal-list">
              {project.goals.map((goal) => (
                <li key={goal}>
                  <span>
                    <Check size={13} />
                  </span>
                  {goal}
                </li>
              ))}
            </ul>
            <h3>Technology stack</h3>
            <Chips items={project.skills} />
          </section>
          <section className="panel">
            <SectionHeading
              title="Open positions"
              action={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Badge>{project.openings ?? 0} openings</Badge>
                  {isOwner && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowPositionManager(true)}
                      style={{
                        fontSize: "12px",
                        padding: "5px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <SlidersHorizontal size={14} />
                      Manage roles
                    </Button>
                  )}
                </div>
              }
            />
            {remoteDetail.positions.length
              ? remoteDetail.positions.map((pos) => {
                  const reqSkills = pos.skills
                    .filter((s) => s.is_required)
                    .map((s) => s.name)
                  const niceSkills = pos.skills
                    .filter((s) => !s.is_required)
                    .map((s) => s.name)
                  const openCount = Math.max(0, pos.required_count - pos.filled_count)
                  return (
                    <div className="position-card" key={pos.position_id}>
                      <div className="section-heading">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <h3>{pos.title}</h3>
                          {pos.status === "open" && <Badge tone="success">Open</Badge>}
                          {pos.status === "filled" && <Badge tone="blue">Filled</Badge>}
                          {pos.status === "closed" && <Badge tone="neutral">Closed</Badge>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Badge tone="blue">
                            {openCount} {openCount === 1 ? "position" : "positions"}
                          </Badge>
                          {isOwner && (
                            <button
                              type="button"
                              className="icon-button"
                              title="Manage recruitment for this role"
                              aria-label="Manage recruitment for this role"
                              onClick={() => setShowPositionManager(true)}
                              style={{ padding: "4px" }}
                            >
                              <SlidersHorizontal size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p>
                        {pos.description ||
                          "Help build our next release with an ambitious, supportive team."}
                      </p>
                      <Chips
                        items={
                          reqSkills.length
                            ? reqSkills
                            : project.requiredSkills || project.skills.slice(0, 3)
                        }
                      />
                      <div className="position-meta">
                        <span>
                          <Clock size={13} />
                          {project.hours} hrs/week
                        </span>
                        <span>{fromApiDifficulty(pos.experience_level)}</span>
                      </div>
                      <small>
                        Nice to have:{" "}
                        {(niceSkills.length ? niceSkills : project.gap).join(", ")} ·
                        Collaborative development
                      </small>
                    </div>
                  )
                })
              : <p>No recruitment positions.</p>}
          </section>
          <section className="panel">
            <SectionHeading
              title="Current team"
              action={
                <span className="muted">
                  {project.team}/{project.capacity} members
                </span>
              }
            />
            {remoteDetail?.team_members?.length
              ? remoteDetail.team_members.map((member) => (
                  <div className="team-person" key={member.user_id}>
                    <Avatar
                      name={member.display_name}
                      color={member.is_leader ? project.color : "neutral"}
                    />
                    <div>
                      <strong>{member.display_name}</strong>
                      <p>{member.role_title}</p>
                    </div>
                    <Badge tone={member.is_leader ? "blue" : ""}>
                      {member.is_leader ? "LEADER" : "MEMBER"}
                    </Badge>
                  </div>
                ))
              : <p>No active members.</p>}
          </section>
        </div>
        <aside className="project-detail-sidebar">
          {fromFeed ? <RuleMatchPanel variant="sidebar" match={fromFeed} projectName={project.name} onExplain={() => setMatchDetailsOpen(true)} /> : <section className="panel detail-match">
            <div className="insight-label">
              POSITION MATCH
            </div>
            <p>See your current rule-based match and explanation in Discovery.</p><Link className="btn btn-secondary" to="/discover">Open Discovery</Link>
          </section>}
          <section className="panel commitment-panel">
            <h3>At a glance</h3>
            <div>
              <Clock size={17} />
              <span>
                Commitment<strong>{project.hours} hours / week</strong>
              </span>
            </div>
            <div>
              <FolderKanban size={17} />
              <span>
                Duration<strong>{project.duration}</strong>
              </span>
            </div>
            <div>
              <GraduationCap size={17} />
              <span>
                Experience<strong>{project.difficulty}</strong>
              </span>
            </div>
            <div>
              <Users size={17} />
              <span>
                Community<strong>First Cloud AI Journey</strong>
              </span>
            </div>
            <p>Recruitment {remoteDetail.is_recruitment_open ? "closes" : "closed"} on {formatClosingDate(remoteDetail.recruitment_closing_date)} (Vietnam time)</p>
          </section>
          {active.includes(project.id) && (
            <Link className="btn btn-primary full" to="/team">
              Open team workspace
            </Link>
          )}
        </aside>
      </div>
      {explanation.element}
      {fromFeed && matchDetailsOpen && <Modal title="Why this matches" className="rule-match-dialog" onClose={() => setMatchDetailsOpen(false)}><RuleMatchPanel match={fromFeed} projectName={project.name} /></Modal>}
      {interestModal && <ApplyModal projectId={project.id} onClose={() => setInterestModal(false)} onConfirmed={application => {
        setInterestModal(false); applications.reload(); resource.reload(); notify(`Application confirmed: ${application.status}.`)
      }} />}
      {showPositionManager && (
        <LeaderPositionManagerModal
          projectId={project.id}
          projectName={project.name}
          initialPositions={remoteDetail?.positions}
          onClose={() => setShowPositionManager(false)}
          onPositionsChanged={resource.reload}
        />
      )}
    </section>
  )
}
export { ProjectDetailScreen as ProjectDetail }
export default ProjectDetailScreen
