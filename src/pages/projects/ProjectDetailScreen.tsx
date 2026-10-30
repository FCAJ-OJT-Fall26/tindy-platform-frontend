import { useEffect, useState } from "react"
import { Link, useParams } from "react-router"
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
import NotFoundPage from "../NotFoundPage"

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
  const {
    authUser,
    profile,
    projects,
    setProjects,
    saved,
    toggleSave,
    interested,
    setInterested,
    setSkipped,
    notify,
    active,
  } = useTindy()
  const localProject = projects.find((item) => item.id === id)
  const [remoteDetail, setRemoteDetail] = useState<ProjectDetailDto | null>(null)
  const explanation = useExplanation()
  const [interestModal, setInterestModal] = useState(false)
  const [showPositionManager, setShowPositionManager] = useState(false)

  useEffect(() => {
    if (!id || !isGuid(id)) return
    const controller = new AbortController()
    getProjectByIdApi(id, controller.signal)
      .then((dto) => {
        setRemoteDetail(dto)
        setProjects((old) => {
          const existing = old.find((p) => p.id === dto.project_id)
          const mapped = mapProjectDetailToUiProject(dto, existing)
          return existing
            ? old.map((p) => (p.id === dto.project_id ? mapped : p))
            : [...old, mapped]
        })
      })
      .catch(() => {
        // Fallback to local project state when backend is unavailable
      })
    return () => controller.abort()
  }, [id, setProjects])

  const project =
    (remoteDetail ? mapProjectDetailToUiProject(remoteDetail, localProject) : undefined) ||
    localProject
  if (!project) return <NotFoundPage />
  const sent = interested.includes(project.id)
  const isOwner = Boolean(
    (authUser?.user_id && remoteDetail?.leader?.user_id === authUser.user_id) ||
      (profile.name && project.leader === profile.name),
  )
  return (
    <>
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
              Recruiting
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
              <Link className="btn btn-primary" to={`/project/${project.id}/edit`}>
                Manage your project <ArrowRight size={16} />
              </Link>
            ) : (
              <Button disabled={sent} onClick={() => setInterestModal(true)}>
                {sent ? (
                  <>
                    <Check size={16} />
                    Interest sent
                  </>
                ) : (
                  <>
                    Interested <ArrowRight size={16} />
                  </>
                )}
              </Button>
            )}
            <ProjectSaveButton
              saved={saved.includes(project.id)}
              onToggle={() => toggleSave(project.id)}
              variant="button"
              size={16}
              projectName={project.name}
            />
          </div>
          <div className="detail-sub-actions">
            {sent && (
              <span className="detail-status-pill">
                <Clock size={11} />
                Waiting for project leader
              </span>
            )}
            <SkipActionButton
              onClick={() => {
                setSkipped((old) => [...old, project.id])
                notify("Project skipped — removed from recommendations")
                window.history.back()
              }}
              className="detail-skip-btn"
              title="Skip recommendation"
              ariaLabel="Skip for now"
              showIcon={false}
            >
              Skip for now
            </SkipActionButton>
          </div>
        </div>
      </div>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <h2>About the project</h2>
            <p>
              {project.description} We’re a team of FCAJ students turning a
              shared idea into a real, deployable product. You’ll work closely
              with other developers, contribute to technical decisions, and
              build something you’re proud to put in your portfolio.
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
                  <Badge>{project.capacity - project.team} openings</Badge>
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
            {remoteDetail?.positions?.length
              ? remoteDetail.positions.map((pos) => {
                  const reqSkills = pos.skills
                    .filter((s) => s.is_required)
                    .map((s) => s.name)
                  const niceSkills = pos.skills
                    .filter((s) => !s.is_required)
                    .map((s) => s.name)
                  const openCount = Math.max(1, pos.required_count - pos.filled_count)
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
              : project.openPositions?.length
                ? project.openPositions.map((pos) => (
                    <div className="position-card" key={pos.positionId}>
                      <div className="section-heading">
                        <h3>{pos.title}</h3>
                        <Badge tone="blue">
                          {pos.count} {pos.count === 1 ? "position" : "positions"}
                        </Badge>
                      </div>
                      <p>
                        {pos.description ||
                          "Help build our next release with an ambitious, supportive team."}
                      </p>
                      <Chips
                        items={
                          pos.requiredSkills.length
                            ? pos.requiredSkills
                            : project.skills.slice(0, 3)
                        }
                      />
                      <div className="position-meta">
                        <span>
                          <Clock size={13} />
                          {project.hours} hrs/week
                        </span>
                        <span>{pos.level}</span>
                      </div>
                      <small>
                        Nice to have:{" "}
                        {(pos.niceSkills.length ? pos.niceSkills : project.gap).join(
                          ", ",
                        ) || "None"}{" "}
                        · Collaborative development
                      </small>
                    </div>
                  ))
                : [
                    project.role,
                    project.role === "Frontend Developer"
                      ? "Backend Developer"
                      : "Frontend Developer",
                  ].map((role, index) => (
                    <div className="position-card" key={role}>
                      <div className="section-heading">
                        <h3>{role}</h3>
                        <Badge tone="blue">1 position</Badge>
                      </div>
                      <p>
                        Help build our next release with an ambitious, supportive
                        team.
                      </p>
                      <Chips
                        items={
                          index
                            ? ["React", "TypeScript", "Git"]
                            : project.requiredSkills || project.skills.slice(0, 3)
                        }
                      />
                      <div className="position-meta">
                        <span>
                          <Clock size={13} />
                          {project.hours} hrs/week
                        </span>
                        <span>{project.difficulty}</span>
                      </div>
                      <small>
                        Nice to have: {project.gap.join(", ")} · Collaborative
                        development
                      </small>
                    </div>
                  ))}
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
              : [project.leader]
                  .slice(0, project.team)
                  .map((name, index) => (
                    <div className="team-person" key={name}>
                      <Avatar
                        name={name}
                        color={index ? "neutral" : project.color}
                      />
                      <div>
                        <strong>{name}</strong>
                        <p>
                          {index === 0
                            ? "Project leader · Backend"
                            : index === 1
                              ? "AI Engineer · Python, RAG"
                              : "Frontend Developer · React"}
                        </p>
                      </div>
                      <Badge tone={index === 0 ? "blue" : ""}>
                        {index === 0 ? "LEADER" : "MEMBER"}
                      </Badge>
                    </div>
                  ))}
          </section>
        </div>
        <aside>
          <section className="panel detail-match">
            <div className="insight-label">
              <Sparkles size={14} /> AI RECOMMENDED
            </div>
            <Score project={project} />
            <div className="quick-matches">
              <p>
                <Check size={14} />
                Your technical skills align
              </p>
              <p>
                <Check size={14} />
                Relevant project experience
              </p>
              <p>
                <Clock size={14} />
                {project.hours <= 10
                  ? "Fits your weekly availability"
                  : "May need extra weekly availability"}
              </p>
            </div>
            <Button
              variant="secondary"
              className="full"
              onClick={() => explanation.open(project)}
            >
              Why this matches you <ArrowRight size={14} />
            </Button>
            <small className="evidence-caption">
              Weighted factors. Transparent reasoning.
            </small>
          </section>
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
            <p>Recruitment closes in {project.closing} days</p>
          </section>
          {active.includes(project.id) && (
            <Link className="btn btn-primary full" to="/team">
              Open team workspace
            </Link>
          )}
        </aside>
      </div>
      {explanation.element}
      {interestModal && (
        <Modal title="Project interest" onClose={() => setInterestModal(false)}>
          <span className="icon-tile teal">
            <FolderKanban size={23} />
          </span>
          <h2>Interested in this project?</h2>
          <p>
            The project leader will be able to review your profile, skills, and
            availability. Your interest starts a conversation — it’s not a
            commitment.
          </p>
          <div className="interest-preview">
            <Avatar name={project.leader} color={project.color} />
            <div>
              <strong>{project.name}</strong>
              <small>{project.leader} · Project leader</small>
            </div>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setInterestModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setInterested((old) => [...new Set([...old, project.id])])
                setInterestModal(false)
                notify("Interest sent · Waiting for project leader")
              }}
            >
              Send interest <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {showPositionManager && (
        <LeaderPositionManagerModal
          projectId={project.id}
          projectName={project.name}
          initialPositions={remoteDetail?.positions}
          onClose={() => setShowPositionManager(false)}
          onPositionsChanged={() => {
            if (id && isGuid(id)) {
              getProjectByIdApi(id)
                .then((dto) => setRemoteDetail(dto))
                .catch(() => {})
            }
          }}
        />
      )}
    </>
  )
}
export { ProjectDetailScreen as ProjectDetail }
export default ProjectDetailScreen
