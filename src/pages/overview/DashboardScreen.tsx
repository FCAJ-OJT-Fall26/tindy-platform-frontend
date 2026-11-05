import { useEffect, useMemo, useState, type ReactNode } from "react"
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
  const { profile, saved, ownerProfile, savedProjects } = useTindy()
  const feed = useDiscoveryFeed()
  const membership = useMyProjects()
  const active = membership.data?.joined_projects ?? []
  const projectsLoading = feed.loading
  const projectsError = feed.error
  const reloadProjects = feed.refresh
  const [tab, setTab] = useState("For you")
  const available = feed.items.filter(card => tab !== "New arrivals" || card.feed_bucket === "new_projects").map(mapDiscoveryToProject)

  // Calculate real project match distribution across 3 intuitive compatibility tiers
  const matchDistribution = useMemo(() => {
    let strong = 0
    let good = 0
    let moderate = 0

    available.forEach((p) => {
      const s = score(p)
      if (s >= 85) strong++
      else if (s >= 70) good++
      else moderate++
    })

    return [
      {
        label: "≥85%",
        value: strong,
        sublabel: "projects",
        color: "#1d4ed8",
        tooltip: `Match ≥85%: ${strong} strong match project${strong === 1 ? "" : "s"}`,
      },
      {
        label: "70-84%",
        value: good,
        sublabel: "projects",
        color: "#3b82f6",
        tooltip: `Match 70–84%: ${good} good match project${good === 1 ? "" : "s"}`,
      },
      {
        label: "<70%",
        value: moderate,
        sublabel: "projects",
        color: "#94a3b8",
        tooltip: `Match <70%: ${moderate} moderate match project${moderate === 1 ? "" : "s"}`,
      },
    ]
  }, [available])

  const strongMatches = matchDistribution[0]?.value ?? 0
  const goodMatches = matchDistribution[1]?.value ?? 0
  const moderateMatches = matchDistribution[2]?.value ?? 0

  const matchFooter = useMemo(() => {
    if (available.length === 0) return "No recommendations yet"
    if (strongMatches > 0) {
      return `${strongMatches} strong match${strongMatches === 1 ? "" : "es"} · 85%+`
    }
    if (goodMatches > 0) {
      return `${goodMatches} good match${goodMatches === 1 ? "" : "es"} · 70%+`
    }
    return `${moderateMatches} project${moderateMatches === 1 ? "" : "s"} · <70% match`
  }, [available.length, strongMatches, goodMatches, moderateMatches])

  const matchTooltipDetail = useMemo(() => {
    if (available.length === 0) return "No recommended projects loaded yet"
    if (strongMatches > 0 || goodMatches > 0) {
      const parts: string[] = []
      if (strongMatches > 0) parts.push(`${strongMatches} strong match${strongMatches === 1 ? "" : "es"} (≥85%)`)
      if (goodMatches > 0) parts.push(`${goodMatches} good match${goodMatches === 1 ? "" : "es"} (70–84%)`)
      if (moderateMatches > 0) parts.push(`${moderateMatches} moderate (<70%)`)
      return parts.join(" • ")
    }
    return `0 high matches (≥70%) • ${moderateMatches} project${moderateMatches === 1 ? "" : "s"} with moderate match (<70%)`
  }, [available.length, strongMatches, goodMatches, moderateMatches])

  // Real saved projects category breakdown
  const savedList = savedProjects.data ?? []
  const savedCount = saved.length
  const savedCategories = useMemo(() => {
    if (savedList.length === 0) return []
    const map = new Map<string, number>()
    for (const item of savedList) {
      const cat = item.category?.trim() || "General"
      map.set(cat, (map.get(cat) || 0) + 1)
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    return entries.slice(0, 3).map(([cat, count], idx) => ({
      label: cat,
      count,
      pct: Math.round((count / savedList.length) * 100),
      color: idx === 0 ? "#0d9488" : idx === 1 ? "#2563eb" : "#f59e0b",
    }))
  }, [savedList])

  // Real active projects membership & capacity calculation
  const activeJoinedIds = useMemo(
    () => new Set(active.map((p) => p.project_id)),
    [active],
  )
  const activeJoinedProjects = useMemo(
    () => (membership.data?.projects ?? []).filter((p) => activeJoinedIds.has(p.id)),
    [membership.data?.projects, activeJoinedIds],
  )
  const activeFilledSeats = useMemo(
    () => activeJoinedProjects.reduce((sum, p) => sum + (p.team || 0), 0),
    [activeJoinedProjects],
  )
  const activeTotalSeats = useMemo(
    () => activeJoinedProjects.reduce((sum, p) => sum + (p.capacity || 0), 0),
    [activeJoinedProjects],
  )

  // Real profile completeness calculation
  const profileCompleteness = useMemo(() => {
    const op = ownerProfile.data
    if (!op) return 0
    let sc = 0
    if (op.display_name?.trim()) sc += 20
    if (op.bio?.trim()) sc += 20
    if (op.preferred_role) sc += 20
    if (Array.isArray(op.skills) && op.skills.length >= 3) sc += 20
    else if (Array.isArray(op.skills) && op.skills.length > 0) sc += 10
    if (op.available_hours_per_week && op.available_hours_per_week > 0) sc += 20
    return Math.min(100, sc)
  }, [ownerProfile.data])

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
          value={available.length}
          subtitle="matched to your profile"
          tooltipTitle="Project Match Distribution"
          tooltipDesc="Relative match distribution of recommended projects tailored to your skills and preferences."
          tooltipDetail={matchTooltipDetail}
          visual={
            <SparklineBars
              bars={matchDistribution}
              caption="3 match tiers"
            />
          }
          footerLeft={matchFooter}
          actionLabel="Explore"
          actionTo="/discover"
        />

        <MetricCard
          index={1}
          label="Saved projects"
          value={savedCount}
          subtitle="ideas in your shortlist"
          tooltipTitle="Shortlist Categories"
          tooltipDesc="Breakdown of bookmarked projects by category."
          tooltipDetail={
            savedCount === 0
              ? "No saved projects in your shortlist"
              : savedCategories.length > 0
              ? savedCategories.map((c) => `${c.label}: ${c.count}`).join(" • ")
              : `${savedCount} saved project${savedCount === 1 ? "" : "s"}`
          }
          visual={
            savedCategories.length > 0 ? (
              <CategoryBreakdown items={savedCategories} />
            ) : (
              <CapsuleSlots variant="faint" />
            )
          }
          footerLeft={
            savedCount === 0
              ? "No saved projects"
              : `${savedCategories.length} project ${
                  savedCategories.length === 1 ? "category" : "categories"
                }`
          }
          actionLabel="View saved"
          actionTo="/projects?tab=saved"
        />

        <MetricCard
          index={2}
          label="Active projects"
          value={active.length}
          subtitle={active.length === 1 ? "project you're part of" : "projects you're part of"}
          tooltipTitle="Active Workspace Seats"
          tooltipDesc="Visual representation of active member seats filled in your teams."
          tooltipDetail={
            active.length === 0
              ? "You have not joined any active project team yet"
              : `${activeFilledSeats} of ${activeTotalSeats} team seats filled across ${active.length} project${
                  active.length === 1 ? "" : "s"
                }`
          }
          visual={
            active.length > 0 && activeTotalSeats > 0 ? (
              <CapsuleSlots
                filled={activeFilledSeats}
                total={Math.min(10, activeTotalSeats)}
                label={`${activeFilledSeats}/${activeTotalSeats} seats`}
              />
            ) : (
              <CapsuleSlots variant="faint" />
            )
          }
          footerLeft={
            active.length === 0
              ? "No active teams"
              : `${active.length} active team space${active.length === 1 ? "" : "s"}`
          }
          actionLabel="Open projects"
          actionTo="/team"
        />

        <MetricCard
          index={3}
          label="Profile completeness"
          value={`${profileCompleteness}%`}
          subtitle={profileCompleteness === 100 ? "ready to connect" : "profile completion"}
          tooltipTitle="Profile Readiness Gauge"
          tooltipDesc="Completeness score based on display name, bio, preferred role, skills, and weekly availability."
          tooltipDetail={
            profileCompleteness === 100
              ? "100% complete • Profile fully optimized"
              : `${profileCompleteness}% complete • Add more details to boost match accuracy`
          }
          visual={
            <DonutProgressRing
              pct={profileCompleteness}
              strokeColor={
                profileCompleteness >= 80
                  ? "#0d9488"
                  : profileCompleteness >= 50
                  ? "#3b82f6"
                  : "#f59e0b"
              }
            />
          }
          footerLeft={profileCompleteness === 100 ? "Keep it current" : "Needs attention"}
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
