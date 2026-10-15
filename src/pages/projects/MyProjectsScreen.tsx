import { useState } from "react"
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
    projects,
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
  const statuses: Record<string, string[]> = {
    Interested: interested,
    Saved: saved,
    Invited: invited,
    Active: active,
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
