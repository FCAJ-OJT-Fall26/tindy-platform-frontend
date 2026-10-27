import { useEffect, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  FolderKanban,
  Mail,
  Users,
} from "lucide-react"
import { Badge, Button, EmptyState, Modal, PageHeader, ProjectCard } from "../../components/ui"
import type { Project } from "../../data"
import { getStoredToken } from "../../services/apiClient"
import { getMyProjectsApi } from "../../services/projects.service"
import { useTindy } from "../../store"
import { useExplanation } from "../../utils/useExplanation"

function Cards({ projects, status }: { projects: Project[]; status?: string }) {
  const { saved, toggleSave } = useTindy()
  const explanation = useExplanation()
  return (
    <>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            saved={saved.includes(project.id)}
            onSave={() => toggleSave(project.id)}
            onExplain={() => explanation.open(project)}
            status={status}
          />
        ))}
      </div>
      {explanation.element}
    </>
  )
}

export function MyProjectsScreen() {
  const {
    profile,
    projects,
    setProjects,
    interested,
    saved,
    invited,
    active,
    completed,
    setInvited,
    setActive,
    notify,
  } = useTindy()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const tab =
    params.get("tab") ||
    (location.pathname === "/saved"
      ? "Saved"
      : location.pathname === "/interests"
        ? "Interested"
        : "Active")
  const [invitation, setInvitation] = useState<Project | null>(null)
  const [remoteLeadingIds, setRemoteLeadingIds] = useState<string[]>([])
  const [pendingApplicantsByProject, setPendingApplicantsByProject] = useState<
    Record<string, number>
  >({})

  useEffect(() => {
    if (!getStoredToken()) return
    const controller = new AbortController()
    getMyProjectsApi(controller.signal)
      .then((res) => {
        if (res.leading_projects?.length) {
          setRemoteLeadingIds(res.leading_projects.map((p) => p.project_id))
          const counts: Record<string, number> = {}
          for (const item of res.leading_projects) {
            counts[item.project_id] = item.pending_applications_count
          }
          setPendingApplicantsByProject(counts)
          setProjects((old) => {
            const next = [...old]
            for (const lp of res.leading_projects) {
              if (!next.some((existing) => existing.id === lp.project_id)) {
                next.push({
                  id: lp.project_id,
                  name: lp.name,
                  description: "Project managed in your leader workspace.",
                  type: "Web Application",
                  skills: [],
                  role: "Project Leader",
                  hours: 10,
                  duration: "3 months",
                  difficulty: "Intermediate",
                  team: lp.current_team_size,
                  capacity: lp.max_team_capacity,
                  leader: profile.name || "Project Leader",
                  initials: lp.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase(),
                  color: "indigo",
                  created: Date.now(),
                  closing: 14,
                  factors: [85, 90, 90, 80, 100],
                  goals: [],
                  gap: [],
                })
              }
            }
            return next
          })
        }
        if (res.joined_projects?.length) {
          const joinedIds = res.joined_projects.map((p) => p.project_id)
          setActive((old) => Array.from(new Set([...old, ...joinedIds])))
          setProjects((old) => {
            const next = [...old]
            for (const jp of res.joined_projects) {
              if (!next.some((existing) => existing.id === jp.project_id)) {
                next.push({
                  id: jp.project_id,
                  name: jp.name,
                  description: `Joined as ${jp.my_role}`,
                  type: "Collaborative Project",
                  skills: [],
                  role: jp.my_role,
                  hours: 10,
                  duration: "3 months",
                  difficulty: "Intermediate",
                  team: 2,
                  capacity: 5,
                  leader: jp.leader_name,
                  initials: jp.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase(),
                  color: "teal",
                  created: Date.now(),
                  closing: 14,
                  factors: [85, 90, 90, 80, 100],
                  goals: [],
                  gap: [],
                })
              }
            }
            return next
          })
        }
      })
      .catch(() => {
        // Fallback to local project lists when backend is offline
      })
    return () => controller.abort()
  }, [profile.name, setActive, setProjects])

  const leadingIds = Array.from(
    new Set([
      ...remoteLeadingIds,
      ...projects
        .filter((p) => p.id === "cloud-desk" || (profile.name && p.leader === profile.name))
        .map((p) => p.id),
    ]),
  )

  const statuses: Record<string, string[]> = {
    Interested: interested,
    Saved: saved,
    Invited: invited,
    Active: active,
    Leading: leadingIds,
    Completed: completed,
  }
  const selected = projects.filter((project) =>
    statuses[tab]?.includes(project.id),
  )
  return (
    <>
      <PageHeader
        title={
          location.pathname === "/interests" ? "My interests" : "My projects"
        }
        description="From the first spark of interest to the projects you ship."
        action={
          <Link to="/discover" className="btn btn-secondary">
            Discover projects <ArrowUpRight size={15} />
          </Link>
        }
      />
      <div className="status-tabs">
        {Object.entries(statuses).map(([status, ids]) => (
          <button
            key={status}
            onClick={() => setParams({ tab: status })}
            className={tab === status ? "active" : ""}
          >
            {status}
            <span>{ids.length}</span>
          </button>
        ))}
      </div>
      <div key={tab} className="tab-pane-transition">
        {selected.length ? (
          <>
            {tab === "Invited" && (
              <div className="info-banner">
                <Mail size={18} />
                <span>
                  A team is ready to welcome you. Review the invitation to see the
                  role and commitment.
                </span>
              </div>
            )}
            <Cards
              projects={selected}
              status={
                tab === "Interested"
                  ? "Interest sent · Waiting for project leader"
                  : tab === "Active"
                    ? "You’re on the team"
                    : tab === "Leading"
                      ? Object.values(pendingApplicantsByProject).some((c) => c > 0)
                        ? `Project leader · ${Object.values(pendingApplicantsByProject).reduce((a, b) => a + b, 0)} pending applicants`
                        : "You’re leading this project"
                      : tab === "Completed"
                        ? "Project completed"
                        : undefined
              }
            />
            {tab === "Invited" &&
              selected.map((project) => (
                <div className="invitation-bar" key={project.id}>
                  <span>
                    <strong>{project.leader}</strong> invited you to{" "}
                    <strong>{project.name}</strong>
                  </span>
                  <Button onClick={() => setInvitation(project)}>
                    Review invitation
                  </Button>
                </div>
              ))}
          </>
        ) : (
          <EmptyState
            title={
              tab === "Saved"
                ? "You haven't saved any projects yet."
                : tab === "Interested"
                  ? "Your next project is out there."
                  : `No ${tab.toLowerCase()} projects yet.`
            }
            description={
              tab === "Saved"
                ? "Save a project that catches your eye. You can always come back to it."
                : "Discover projects that fit your skills and take the next step."
            }
            action={
              <Link to="/discover" className="btn btn-primary">
                Discover projects <ArrowRight size={15} />
              </Link>
            }
          />
        )}
      </div>{" "}
      {invitation && (
        <Modal title="Team invitation" onClose={() => setInvitation(null)}>
          <Badge tone="success">YOU’RE INVITED</Badge>
          <h2>Build with {invitation.name}</h2>
          <p>
            {invitation.leader} invited you to join as a {invitation.role}.
          </p>
          <div className="invitation-terms">
            <span>
              <Clock size={16} />
              {invitation.hours} hours/week
            </span>
            <span>
              <FolderKanban size={16} />
              {invitation.duration}
            </span>
            <span>
              <Users size={16} />
              {invitation.team} current teammates
            </span>
          </div>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setInvited((old) =>
                  old.filter((item) => item !== invitation.id),
                )
                setInvitation(null)
                notify("Invitation declined")
              }}
            >
              Decline
            </Button>
            <Button
              onClick={() => {
                setActive((old) => [...new Set([...old, invitation.id])])
                setInvited((old) =>
                  old.filter((item) => item !== invitation.id),
                )
                setInvitation(null)
                notify("Welcome to the team!")
                setParams({ tab: "Active" })
              }}
            >
              Accept & join team <Check size={15} />
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export { MyProjectsScreen as MyProjects }
export default MyProjectsScreen
