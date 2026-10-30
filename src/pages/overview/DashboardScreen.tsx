import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  FolderKanban,
  GraduationCap,
  Layers,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  ProjectCard,
} from "../../components/ui"
import { score, type Project } from "../../data"
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

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function Stat({
  label,
  value,
  detail,
  icon,
  tone = "indigo",
}: {
  label: string
  value: ReactNode
  detail: string
  icon: ReactNode
  tone?: string
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function UserIcon() {
  return <GraduationCap size={17} />
}

export function DashboardScreen() {
  const { profile, projects, saved, active, skipped, requestProjects, projectsLoading, projectsError, reloadProjects } = useTindy()
  useEffect(() => { requestProjects() }, [requestProjects])
  const [tab, setTab] = useState("For you")
  const available = projects
    .filter((project) => !skipped.includes(project.id))
    .sort((first, second) =>
      tab === "New arrivals"
        ? second.created - first.created
        : score(second) - score(first),
    )
  return (
    <>
      <PageHeader
        eyebrow="YOUR FCAJ WORKSPACE"
        title={`Good morning, ${profile.name.split(" ")[0]}`}
        description="Here are projects that match your skills and interests."
        action={
          <Link className="btn btn-secondary" to="/discover">
            Explore projects <ArrowUpRight size={16} />
          </Link>
        }
      />
      <section className="stats-grid">
        <Stat
          label="Recommended projects"
          value={available.length}
          detail="Based on your skills & interests"
          icon={<Sparkles size={19} />}
        />
        <Stat
          label="Saved projects"
          value={saved.length.toString().padStart(2, "0")}
          detail="Good ideas to come back to"
          icon={<Bookmark size={19} />}
          tone="teal"
        />
        <Stat
          label="Active projects"
          value={active.length.toString().padStart(2, "0")}
          detail="You’re building something great"
          icon={<FolderKanban size={19} />}
          tone="sky"
        />
        <Stat
          label="Profile strength"
          value={
            <>
              85<span>%</span>
            </>
          }
          detail="Add a certificate to stand out"
          icon={<ShieldCheck size={19} />}
          tone="green"
        />
      </section>
      <div className="opportunity-banner">
        <div className="banner-icon">
          <Layers size={24} />
        </div>
        <div>
          <Badge tone="blue">
            <Sparkles size={11} />
            SMARTER CONNECTIONS
          </Badge>
          <h2>Your next great project starts with the right fit.</h2>
          <p>Discover where your skills matter — and who you can build with.</p>
        </div>
        <Link to="/discover">
          Find my next project <ArrowRight size={17} />
        </Link>
      </div>
      <div className="dashboard-columns">
        <section>
          <SectionHeading
            title="Recommended for you"
            description="Real opportunities. Matched to what you bring."
            action={
              <Link className="text-link" to="/discover">
                View all projects <ArrowUpRight size={14} />
              </Link>
            }
          />
          <div className="recommend-toolbar">
            <div className="tabs">
              {["For you", "New arrivals"].map((item) => (
                <button
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                  key={item}
                >
                  {item === "For you" && <Sparkles size={13} />} {item}
                </button>
              ))}
            </div>
            <span className="subtle-caption">
              <ShieldCheck size={12} />
              Explainable matches
            </span>
          </div>
          <div key={tab} className="tab-pane-transition">
            {projectsLoading ? <div className="info-banner" role="status">Loading projects…</div> : projectsError ? <div className="info-banner" role="alert">Projects could not be loaded. <button onClick={reloadProjects}>Retry</button></div> : available.length ? (
              <Cards projects={available.slice(0, 4)} />
            ) : (
              <EmptyState
                title="No projects match your profile yet."
                description="Add your skills and interests to discover more possibilities."
                action={
                  <Link to="/profile" className="btn btn-primary">
                    Improve my profile
                  </Link>
                }
              />
            )}
          </div>
        </section>
        <aside className="context-column">
          <section className="profile-strength panel">
            <div className="section-heading">
              <h3>Your profile, your potential</h3>
              <span className="icon-tile small teal">
                <UserIcon />
              </span>
            </div>
            <p>A little more detail makes better matches.</p>
            <div className="strength-number">
              <strong>
                85<span>%</span>
              </strong>
              <Badge tone="success">Looking good</Badge>
            </div>
            <div className="progress">
              <span style={{ width: "85%" }} />
            </div>
            <ul className="profile-checklist">
              <li>
                <Check size={14} />
                Basic information
              </li>
              <li>
                <Check size={14} />
                Skills & preferred roles
              </li>
              <li>
                <Check size={14} />
                Project experience
              </li>
              <li className="pending">
                <Plus size={14} />
                Add a certificate
              </li>
            </ul>
            <Link className="btn btn-secondary full" to="/profile">
              Complete my profile <ArrowRight size={14} />
            </Link>
          </section>
          <section className="panel next-steps">
            <h3>Your next steps</h3>
            <Link
              className="next-step"
              to="/messages?conversation=Minh%20Nguyen"
            >
              <Avatar name="Minh Nguyen" color="teal" />
              <div>
                <strong>A conversation worth having</strong>
                <p>Minh invited you to chat about CloudDesk.</p>
                <span>
                  View conversation <ArrowUpRight size={12} />
                </span>
              </div>
            </Link>
            <Link className="next-step" to="/projects?tab=Invited">
              <span className="icon-tile amber">
                <Mail size={18} />
              </span>
              <div>
                <strong>You have a team invitation</strong>
                <p>AI Customer Support System is ready for you.</p>
                <span>
                  Review invitation <ArrowUpRight size={12} />
                </span>
              </div>
            </Link>
          </section>
          <div className="community-footnote">
            <span className="fcaj-symbol">
              F<span>↗</span>
            </span>
            <div>
              <strong>Built for the FCAJ community</strong>
              <p>Learn by building. Grow together.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
export { DashboardScreen as Dashboard }
export default DashboardScreen
