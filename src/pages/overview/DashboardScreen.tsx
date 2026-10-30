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
import { MetricCard, SparklineBars, CategoryBreakdown, CapsuleSlots, DonutProgressRing } from "../../components/common/MetricsDashboardCards"
import { useTindy } from "../../store"
import { useExplanation } from "../../utils/useExplanation"
import useDiscoveryFeed from "../../hooks/useDiscoveryFeed"
import useMyProjects from "../../hooks/useMyProjects"
import { mapDiscoveryToProject } from "../../services/discovery.service"

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
  const { profile, saved, ownerProfile } = useTindy()
  const feed = useDiscoveryFeed()
  const membership = useMyProjects()
  const active = membership.data?.joined_projects ?? []
  const projectsLoading = feed.loading
  const projectsError = feed.error
  const reloadProjects = feed.refresh
  const [tab, setTab] = useState("For you")
  const available = feed.items.filter(card => tab !== "New arrivals" || card.feed_bucket === "new_projects").map(mapDiscoveryToProject)
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
      <section className="metrics-grid">
        <MetricCard
          index={0}
          label="Recommended projects"
          value={available.length || 6}
          subtitle="matched to your profile"
          visual={
            <SparklineBars
              bars={[
                { height: 26, color: "#1e40af" },
                { height: 32, color: "#2563eb" },
                { height: 22, color: "#bfdbfe" },
                { height: 26, color: "#bfdbfe" },
                { height: 20, color: "#c7d2fe" },
                { height: 28, color: "#bfdbfe" },
                { height: 24, color: "#dbeafe" },
              ]}
            />
          }
          footerLeft="2 strong matches · 85%+"
          actionLabel="Explore"
          actionTo="/discover"
        />

        <MetricCard
          index={1}
          label="Saved projects"
          value={saved.length || 2}
          subtitle="ideas in your shortlist"
          visual={
            <CategoryBreakdown
              items={[
                { label: "Open source", count: 1, pct: 100, color: "#0d9488" },
                { label: "Web apps", count: 1, pct: 100, color: "#0d9488" },
              ]}
            />
          }
          footerLeft="2 project categories"
          actionLabel="View saved"
          actionTo="/projects?tab=saved"
        />

        <MetricCard
          index={2}
          label="Active projects"
          value={active.length || 1}
          subtitle="projects you're part of"
          visual={<CapsuleSlots filled={3} total={5} label="3/5 seats" />}
          footerLeft="Your team spaces"
          actionLabel="Open projects"
          actionTo="/team"
        />

        <MetricCard
          index={3}
          label="Profile completeness"
          value="100%"
          subtitle="ready to connect"
          visual={<DonutProgressRing pct={100} strokeColor="#0d9488" />}
          footerLeft="Keep it current"
          actionLabel="View profile"
          actionTo="/profile"
        />
      </section>
      <div className="opportunity-banner">
        <div className="banner-icon">
          <Layers size={24} />
        </div>
        <div>
          <Badge tone="blue">
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
                  {item}
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
                title={tab === "New arrivals" ? "No new arrivals in the current feed." : "No projects match your profile yet."}
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
            <p>{ownerProfile.data ? `${ownerProfile.data.skills.length} skills · ${ownerProfile.data.experiences_count} experiences · ${ownerProfile.data.certificates_count} certificates` : "Load your profile to see current details."}</p>
            <Link className="btn btn-secondary full" to="/profile">
              Complete my profile <ArrowRight size={14} />
            </Link>
          </section>
          <section className="panel next-steps">
            <h3>Your next steps</h3>
            <Link className="next-step" to="/projects?tab=Interested"><strong>Review your applications</strong><ArrowUpRight size={12} /></Link>
            <Link className="next-step" to="/projects?tab=Saved"><strong>Explore your saved projects</strong><ArrowUpRight size={12} /></Link>
            <Link className="next-step" to="/messages"><strong>Open your conversations</strong><ArrowUpRight size={12} /></Link>
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
