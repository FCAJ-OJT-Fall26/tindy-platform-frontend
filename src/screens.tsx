import { useState, useEffect, type ReactNode } from "react"
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  LayoutDashboard,
  ExternalLink,
  FileText,
  FolderKanban,
  GraduationCap,
  Info,
  Layers,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  X,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Brand,
  Button,
  Chips,
  EmptyState,
  MatchExplanation,
  Modal,
  PageHeader,
  ProjectCard,
  Score,
  Skeleton,
} from "./components/ui"
import {
  factors,
  initialCandidates,
  initialProfile,
  initialProjects,
  score,
  type Profile,
  type Project,
} from "./data"
import { useTindy } from "./store"

function useExplanation(
  evidence?: Pick<Profile, "skills" | "role" | "hours" | "experience">,
) {
  const [project, setProject] = useState<Project | null>(null)
  const [learning, setLearning] = useState(false)
  return {
    open: setProject,
    element: project && (
      <Modal
        drawer
        title={learning ? "Learning suggestions" : "Match explanation"}
        onClose={() => {
          setProject(null)
          setLearning(false)
        }}
      >
        {learning ? (
          <>
            <div className="insight-label">
              <GraduationCap size={16} /> NEXT STEPS
            </div>
            <h2>A little learning goes a long way.</h2>
            <p className="muted">
              Build on the skills you already have. These are suggestions, not
              prerequisites to applying.
            </p>
            {project.gap.map((skill) => (
              <div className="learning-card" key={skill}>
                <span className="icon-tile amber">
                  <Code2 size={19} />
                </span>
                <div>
                  <h3>{skill}</h3>
                  <p>
                    Start with the fundamentals, then try a small feature in a
                    practice project.
                  </p>
                  <a
                    className="text-link"
                    href={`https://www.google.com/search?q=${encodeURIComponent(skill + " official documentation tutorial")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find learning resources <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setLearning(false)}>
              Back to match analysis
            </Button>
          </>
        ) : (
          <>
            <MatchExplanation
              project={project}
              evidence={evidence}
              full
              onLearn={() => setLearning(true)}
            />
            <Link
              className="btn btn-primary full"
              to={`/project/${project.id}`}
              onClick={() => setProject(null)}
            >
              View project <ArrowRight size={16} />
            </Link>
          </>
        )}
      </Modal>
    ),
  }
}
function Cards({ projects, status }: {
  projects: Project[]
  status?: string
}) {
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

export function Dashboard() {
  const { profile, projects, saved, active, skipped } = useTindy()
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
            {available.length ? (
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
function UserIcon() {
  return <GraduationCap size={17} />
}

export function Discover() {
  const { projects, skipped } = useTindy()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("Best Match")
  const [view, setView] = useState("grid")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)
  const controls = [
    {
      name: "Role",
      options: [
        "Backend Developer",
        "Frontend Developer",
        "Full-stack Developer",
        "AI Engineer",
        "Cloud Engineer",
      ],
    },
    {
      name: "Technology",
      options: [...new Set(projects.flatMap((project) => project.skills))],
    },
    {
      name: "Project Type",
      options: [
        "AI & Machine Learning",
        "Cloud & DevOps",
        "Web Application",
        "Open Source",
        "Social Impact",
      ],
    },
    {
      name: "Availability",
      options: ["Up to 8 hrs/week", "Up to 10 hrs/week", "12+ hrs/week"],
    },
    { name: "Duration", options: ["1 month", "2 months", "3 months"] },
    { name: "Difficulty", options: ["Beginner-friendly", "Intermediate"] },
    {
      name: "Match Score",
      options: ["90% and above", "80% and above", "70% and above"],
    },
  ]
  const filtered = projects
    .filter(
      (project) =>
        !skipped.includes(project.id) &&
        `${project.name} ${project.description} ${project.skills.join(" ")} ${project.role}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!filters.Role || project.role === filters.Role) &&
        (!filters.Technology || project.skills.includes(filters.Technology)) &&
        (!filters["Project Type"] ||
          project.type === filters["Project Type"]) &&
        (!filters.Availability ||
          (filters.Availability === "Up to 8 hrs/week"
            ? project.hours <= 8
            : filters.Availability === "Up to 10 hrs/week"
              ? project.hours <= 10
              : project.hours >= 12)) &&
        (!filters.Duration || project.duration === filters.Duration) &&
        (!filters.Difficulty || project.difficulty === filters.Difficulty) &&
        (!filters["Match Score"] ||
          score(project) >= parseInt(filters["Match Score"])),
    )
    .sort((first, second) =>
      sort === "Newest"
        ? second.created - first.created
        : sort === "Closing Soon"
          ? first.closing - second.closing
          : score(second) - score(first),
    )
  const count = Object.values(filters).filter(Boolean).length
  return (
    <>
      <PageHeader
        eyebrow="FIND YOUR NEXT CHAPTER"
        title="Discover projects"
        description="Find projects that match your skills, interests, and goals."
        action={
          <Link className="btn btn-secondary" to="/profile">
            <Settings size={15} />
            Matching preferences
          </Link>
        }
      />
      <div className="discovery-search">
        <Search size={21} />
        <input
          aria-label="Search projects"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, skills, technologies…"
        />
        <kbd>Search</kbd>
      </div>
      <div className="discovery-filters">
        <div className="filters-row">
          {controls.slice(0, showAll ? 7 : 4).map((control) => (
            <label
              className={`filter-select ${
                filters[control.name] ? "has-value" : ""
              }`}
              key={control.name}
            >
              <select
                aria-label={control.name}
                value={filters[control.name] || ""}
                onChange={(event) =>
                  setFilters({ ...filters, [control.name]: event.target.value })
                }
              >
                <option value="">{control.name}</option>
                {control.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
          <Button variant="secondary" onClick={() => setShowAll(!showAll)}>
            <SlidersHorizontal size={14} />
            {showAll ? "Fewer filters" : "All filters"}
            {count > 0 && <Badge>{count}</Badge>}
          </Button>
          {count > 0 && (
            <button className="text-link" onClick={() => setFilters({})}>
              Clear filters <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="discovery-insight">
        <Sparkles size={15} />
        <span>
          Matched to <strong>your profile</strong>, not just your keywords.
        </span>
        <Link to="/profile">
          Improve your recommendations <ArrowRight size={13} />
        </Link>
      </div>
      <div className="results-toolbar">
        <div>
          <strong>{filtered.length} projects</strong>
          <span> to build something meaningful</span>
        </div>
        <div className="results-options">
          <label>
            Sort by{" "}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option>Best Match</option>
              <option>Newest</option>
              <option>Most Relevant</option>
              <option>Closing Soon</option>
            </select>
          </label>
          <div className="view-toggle">
            <button
              aria-label="Grid view"
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
            >
              <Layers size={16} />
            </button>
            <button
              aria-label="List view"
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <MenuLines />
            </button>
          </div>
        </div>
      </div>
      <div className={`discovery-projects ${view}`}>
        {filtered.length ? (
          <Cards projects={filtered} />
        ) : (
          <EmptyState
            title="No projects found"
            description="Try another keyword or clear your filters. Your next project might be one click away."
            action={
              <Button
                onClick={() => {
                  setQuery("")
                  setFilters({})
                }}
              >
                Reset search
              </Button>
            }
          />
        )}
      </div>
      <div className="discovery-bottom">
        <ShieldCheck size={15} />
        <span>
          Every match has a reason. Explore the explanation before you decide.
        </span>
      </div>
    </>
  )
}
function MenuLines() {
  return <SlidersHorizontal size={16} />
}

export function ProjectDetail() {
  const { id } = useParams()
  const {
    projects,
    saved,
    toggleSave,
    interested,
    setInterested,
    setSkipped,
    notify,
    active,
  } = useTindy()
  const project = projects.find((item) => item.id === id)
  const explanation = useExplanation()
  const [interestModal, setInterestModal] = useState(false)
  if (!project) return <NotFound />
  const sent = interested.includes(project.id)
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
            <Button variant="secondary" onClick={() => toggleSave(project.id)}>
              <Bookmark
                size={16}
                fill={saved.includes(project.id) ? "currentColor" : "none"}
              />
              {saved.includes(project.id) ? "Saved" : "Save"}
            </Button>
          </div>
          <div className="detail-sub-actions">
            {sent && (
              <span className="detail-status-pill">
                <Clock size={11} />
                Waiting for project leader
              </span>
            )}
            <button
              type="button"
              className="detail-skip-btn"
              onClick={() => {
                setSkipped((old) => [...old, project.id])
                notify("Project skipped — removed from recommendations")
                window.history.back()
              }}
            >
              Skip for now
            </button>
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
              action={<Badge>{project.capacity - project.team} openings</Badge>}
            />
            {[
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
            {[project.leader, "An Hoang", "Linh Tran"]
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
    </>
  )
}

export function MyProjects() {
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

export function ProfileScreen() {
  const { profile, setProfile, notify } = useTindy()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [file, setFile] = useState("AWS Cloud Practitioner.pdf")
  const [photo, setPhoto] = useState("")
  const [experience, setExperience] = useState(false)
  const [skill, setSkill] = useState("")
  const field = (
    label: string,
    key: keyof Omit<Profile, "skills">,
    multiline = false,
  ) => (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          value={draft[key]}
          onChange={(event) =>
            setDraft({ ...draft, [key]: event.target.value })
          }
        />
      ) : (
        <input
          value={draft[key]}
          onChange={(event) =>
            setDraft({ ...draft, [key]: event.target.value })
          }
        />
      )}
    </label>
  )
  return (
    <>
      <PageHeader
        title="Your professional profile"
        description="Your skills, your story, and what you want to build next."
        action={
          <div className="header-buttons">
            <Button
              variant="secondary"
              onClick={() => {
                setEdit(false)
                notify("Profile preview is showing")
              }}
            >
              <ExternalLink size={15} />
              Preview profile
            </Button>
            <Button
              onClick={() => {
                setDraft(profile)
                setEdit(!edit)
              }}
            >
              {edit ? "Cancel editing" : "Edit profile"}
              <Settings size={15} />
            </Button>
          </div>
        }
      />
      <div className="profile-cover">
        <div className="cover-line" />
        <span>FCAJ / BUILT TO BUILD</span>
      </div>
      <div className="profile-identity">
        <div className="profile-avatar-wrap">
          {photo ? (
            <img className="profile-photo" src={photo} alt="Your profile" />
          ) : (
            <Avatar name={profile.name} size="xl" color="neutral" />
          )}
          {edit && (
            <label className="photo-upload">
              <Upload size={13} />
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const uploaded = event.target.files?.[0]
                  if (uploaded) {
                    const reader = new FileReader()
                    reader.onload = () => setPhoto(String(reader.result))
                    reader.readAsDataURL(uploaded)
                  }
                }}
              />
            </label>
          )}
        </div>
        <div>
          <h2>
            {profile.name}
            <Badge tone="blue">
              <ShieldCheck size={12} />
              FCAJ MEMBER
            </Badge>
          </h2>
          <p>
            <GraduationCap size={15} />
            {profile.university}
            <b>·</b>
            {profile.role}
          </p>
          <div className="profile-links">
            <a
              href={`https://${profile.github.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <Code2 size={14} />
              GitHub <ArrowUpRight size={12} />
            </a>
            <a
              href={`https://${profile.portfolio.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
              Portfolio
            </a>
          </div>
        </div>
        <div className="availability-badge">
          <span className="online-dot" />
          Open to projects<small>{profile.hours} hours/week</small>
        </div>
      </div>
      {edit ? (
        <form
          className="panel profile-edit"
          onSubmit={(event) => {
            event.preventDefault()
            setProfile(draft)
            setEdit(false)
            notify("Profile updated · Ready for better matches")
          }}
        >
          <h2>Make it yours</h2>
          <div className="form-grid">
            {field("Full name", "name")}
            {field("University / community", "university")}
            {field("Preferred role", "role")}
            {field("Weekly availability (hours)", "hours")}
            {field("GitHub URL", "github")}
            {field("Portfolio URL", "portfolio")}
          </div>
          {field("Profile summary", "summary", true)}
          {field("Professional interests", "interests")}
          {field("Project experience", "experience", true)}
          {field("Learning goals", "goals", true)}
          {field("Technologies I want to learn", "technologies")}
          <h3>Technical skills</h3>
          <div className="editable-chips">
            {draft.skills.map((item) => (
              <span key={item}>
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      skills: draft.skills.filter((value) => value !== item),
                    })
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="inline-input">
            <input
              placeholder="Add a skill"
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (skill.trim()) {
                  setDraft({
                    ...draft,
                    skills: [...new Set([...draft.skills, skill.trim()])],
                  })
                  setSkill("")
                }
              }}
            >
              Add
            </Button>
          </div>
          <Button>
            Save profile <Check size={16} />
          </Button>
        </form>
      ) : (
        <div className="profile-layout">
          <div>
            <section className="panel">
              <SectionHeading
                title="About"
                action={
                  <Badge tone="blue">
                    <Sparkles size={12} />
                    AI ASSISTED
                  </Badge>
                }
              />
              <p>{profile.summary}</p>
              <h3>Technical skills</h3>
              <Chips items={profile.skills} />
              <h3>Professional interests</h3>
              <Chips
                items={profile.interests.split(",").map((item) => item.trim())}
              />
            </section>
            <section className="panel">
              <SectionHeading
                title="Previous projects"
                action={
                  <button
                    className="text-link"
                    onClick={() => setExperience(true)}
                  >
                    <Plus size={14} />
                    Add experience
                  </button>
                }
              />
              <div className="experience-card" style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="project-mark indigo">RC</span>
                <div>
                  <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>RAG Knowledge Chatbot</h3>
                  <p style={{ marginTop: '4px', marginBottom: '14px', lineHeight: '1.6' }}>{profile.experience}</p>
                  <Chips items={[".NET", "RAG", "AWS", "PostgreSQL"]} />
                </div>
              </div>
              <div className="experience-card" style={{ padding: '24px 0' }}>
                <span className="project-mark teal">TM</span>
                <div>
                  <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Ticket Management System</h3>
                  <p style={{ marginTop: '4px', marginBottom: '14px', lineHeight: '1.6' }}>
                    Designed a REST API, role-based access, and a responsive
                    issue tracking interface.
                  </p>
                  <Chips items={["React", ".NET", "REST API"]} />
                </div>
              </div>
            </section>
            <section className="panel">
              <SectionHeading title="Learning goals" />
              <p>{profile.goals}</p>
              <h3>Technologies I want to learn</h3>
              <Chips
                items={profile.technologies
                  .split(",")
                  .map((item) => item.trim())}
              />
            </section>
          </div>
          <aside>
            <section className="panel">
              <h3>At a glance</h3>
              <dl className="profile-facts">
                <dt>Preferred role</dt>
                <dd>{profile.role}</dd>
                <dt>Weekly availability</dt>
                <dd>{profile.hours} hours / week</dd>
                <dt>Project interests</dt>
                <dd>AI applications · Cloud · Open source</dd>
                <dt>Community</dt>
                <dd>First Cloud AI Journey</dd>
              </dl>
              <Link className="btn btn-secondary full" to="/ai">
                <Sparkles size={14} />
                Build with AI
              </Link>
            </section>
            <section className="panel">
              <h3>Certificates & evidence</h3>
              <div className="certificate">
                <ShieldCheck size={22} />
                <div>
                  <strong>{file}</strong>
                  <small>Uploaded evidence</small>
                </div>
              </div>
              <label className="file-drop">
                <Upload size={21} />
                <strong>Upload certificate or CV</strong>
                <small>PDF, PNG, JPG</small>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    const uploaded = event.target.files?.[0]
                    if (uploaded) {
                      setFile(uploaded.name)
                      notify(
                        "Evidence selected · Prototype stores filename only",
                      )
                    }
                  }}
                />
              </label>
            </section>
          </aside>
        </div>
      )}
      {experience && (
        <Modal
          title="Add project experience"
          onClose={() => setExperience(false)}
        >
          <h2>Show what you’ve built</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              setProfile({
                ...profile,
                experience: profile.experience + " " + data.get("description"),
              })
              setExperience(false)
              notify("Project experience added to profile")
            }}
          >
            {["Project name", "Your role", "Project URL"].map((label) => (
              <label className="field" key={label}>
                {label}
                <input required />
              </label>
            ))}
            <label className="field">
              What did you build?
              <textarea name="description" required rows={4} />
            </label>
            <Button>Add project experience</Button>
          </form>
        </Modal>
      )}
    </>
  )
}

export function AIStudio() {
  const { profile, setProfile, notify } = useTindy()
  const [tab, setTab] = useState("Profile builder")
  const [skills, setSkills] = useState(profile.skills.join(", "))
  const [projects, setProjects] = useState(profile.experience)
  const [interests, setInterests] = useState(profile.interests)
  const [experience, setExperience] = useState(
    "Student developer · FCAJ community",
  )
  const [summary, setSummary] = useState("")
  const [source, setSource] = useState("Project description")
  const [raw, setRaw] = useState("")
  const [file, setFile] = useState("")
  const [detected, setDetected] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const detectedSkills = [
    { category: "Backend", items: ["ASP.NET Core", "REST API", "JWT"] },
    { category: "Database", items: ["PostgreSQL", "Redis"] },
    { category: "Cloud", items: ["AWS S3"] },
  ]
  const generate = () => {
    setSummary(
      `${profile.role} with practical experience in ${skills.split(",").slice(0, 4).join(",").trim()}. ${projects.trim()} Interested in ${interests.toLowerCase()} and ready to contribute to a collaborative FCAJ project. ${experience.trim()}.`,
    )
    notify("Demo summary generated · Review and edit before accepting")
  }
  return (
    <>
      <PageHeader
        eyebrow="THOUGHTFUL AI. HUMAN DECISIONS."
        title="Build your profile with AI"
        description="A starting point for your story — always reviewed and confirmed by you."
      />
      <div className="status-tabs">
        {["Profile builder", "Skill extraction"].map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item === "Profile builder" ? (
              <Sparkles size={15} />
            ) : (
              <FileText size={15} />
            )}{" "}
            {item}
          </button>
        ))}
      </div>
      {tab === "Profile builder" ? (
        <div className="ai-layout">
          <section className="panel">
            <h2>Start with what you know</h2>
            <p>No perfect sentences needed. A few details are enough.</p>
            {[
              {
                label: "Skills",
                value: skills,
                set: setSkills,
                placeholder: ".NET, AWS, React, PostgreSQL",
              },
              {
                label: "Projects",
                value: projects,
                set: setProjects,
                placeholder: "RAG chatbot, ticket management system",
              },
              {
                label: "Interests",
                value: interests,
                set: setInterests,
                placeholder: "Backend, cloud, AI",
              },
              {
                label: "Experience",
                value: experience,
                set: setExperience,
                placeholder: "What have you worked on?",
              },
            ].map((item) => (
              <label className="field" key={item.label}>
                {item.label}
                <textarea
                  rows={2}
                  value={item.value}
                  onChange={(event) => item.set(event.target.value)}
                  placeholder={item.placeholder}
                />
              </label>
            ))}
            <Button
              onClick={generate}
              disabled={!skills.trim() || !projects.trim()}
            >
              <Sparkles size={16} />
              Generate profile
            </Button>
          </section>
          <section className="panel generated-panel">
            <Badge tone="blue">
              <Sparkles size={12} />
              AI GENERATED SUMMARY
            </Badge>
            {summary ? (
              <>
                <h2>Your experience, well expressed.</h2>
                <label className="field">
                  Review and edit
                  <textarea
                    rows={10}
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                  />
                </label>
                <div className="header-buttons">
                  <Button
                    onClick={() => {
                      setProfile({ ...profile, summary })
                      notify("Summary accepted and added to your profile")
                    }}
                  >
                    <Check size={15} />
                    Accept summary
                  </Button>
                  <Button variant="secondary" onClick={generate}>
                    Regenerate
                  </Button>
                </div>
                <p className="helper-text">
                  Nothing is published until you accept it.
                </p>
              </>
            ) : (
              <EmptyState
                title="Your story takes shape here"
                description="Generate a first draft, then make it sound like you."
              />
            )}
            <div className="trust-note">
              <ShieldCheck size={16} />
              <span>
                AI can help with the words. You’re always in control of the
                story. This prototype uses a local template, not a live model.
              </span>
            </div>
          </section>
        </div>
      ) : (
        <div className="ai-layout">
          <section className="panel">
            <h2>Let your work speak for you</h2>
            <p>Extract skills from evidence you already have.</p>
            <label className="field">
              Evidence source
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
              >
                {[
                  "Project description",
                  "GitHub README",
                  "CV",
                  "Certificate",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              {source === "GitHub README"
                ? "Paste your README"
                : "Paste your evidence"}
              <textarea
                rows={9}
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                placeholder="Describe your project or paste the content of your document…"
              />
            </label>
            <label className="file-drop">
              <Upload size={21} />
              <strong>{file || "Or select a document"}</strong>
              <small>PDF, TXT, PNG, JPG</small>
              <input
                type="file"
                onChange={(event) =>
                  setFile(event.target.files?.[0]?.name || "")
                }
              />
            </label>
            <Button
              disabled={!raw.trim() && !file}
              onClick={() => {
                setDetected(true)
                setSelected(detectedSkills.flatMap((group) => group.items))
              }}
            >
              Extract skills <Sparkles size={15} />
            </Button>
          </section>
          <section className="panel">
            {detected ? (
              <>
                <Badge tone="blue">DEMO DETECTION RESULTS</Badge>
                <h2>Skills detected</h2>
                <p>
                  Review these illustrative results. Only confirmed skills are
                  added.
                </p>
                {detectedSkills.map((group) => (
                  <div className="detected-group" key={group.category}>
                    <h3>{group.category}</h3>
                    {group.items.map((item, index) => (
                      <label className="detected-skill" key={item}>
                        <input
                          type="checkbox"
                          checked={selected.includes(item)}
                          onChange={(event) =>
                            setSelected(
                              event.target.checked
                                ? [...selected, item]
                                : selected.filter((skill) => skill !== item),
                            )
                          }
                        />
                        <span>
                          <strong>{item}</strong>
                          <small>{group.category}</small>
                        </span>
                        <Badge tone={index === 2 ? "warning" : "success"}>
                          {index === 2 ? "Review" : "High confidence"}
                        </Badge>
                      </label>
                    ))}
                  </div>
                ))}
                <Button
                  disabled={!selected.length}
                  onClick={() => {
                    setProfile({
                      ...profile,
                      skills: [...new Set([...profile.skills, ...selected])],
                    })
                    notify(
                      `${selected.length} confirmed skills added to your profile`,
                    )
                    setDetected(false)
                  }}
                >
                  <Plus size={15} />
                  Add selected skills ({selected.length})
                </Button>
              </>
            ) : (
              <EmptyState
                title="Discover the skills in your work"
                description="Start with a README, a certificate, or a project description. You confirm what belongs on your profile."
              />
            )}
          </section>
        </div>
      )}
    </>
  )
}

export function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setMode, setProfile, profile } = useTindy()

  // Track active mode: login vs register vs forgot with horizontal slide transition
  const [displayRegister, setDisplayRegister] = useState(
    location.pathname === "/register",
  )
  const [transitioning, setTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<
    "to-register" | "to-login" | "to-forgot" | "from-forgot"
  >("to-register")
  const [formPhase, setFormPhase] = useState<"idle" | "leaving" | "entering">("idle")

  const [forgot, setForgot] = useState(false)
  const [notice, setNotice] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Keep state synchronized with URL (e.g. browser back/forward)
  useEffect(() => {
    const isReg = location.pathname === "/register"
    if (isReg !== displayRegister && !transitioning) {
      setDisplayRegister(isReg)
    }
  }, [location.pathname])

  // Core transitions:
  // LOGIN → REGISTER:
  // - Outgoing Login form slides slightly LEFT (0 -> -40px) and fades out (1 -> 0)
  // - Incoming Register form enters from RIGHT (40px -> 0) and settles smoothly (0 -> 1)
  // REGISTER → LOGIN:
  // - Outgoing Register form slides slightly RIGHT (0 -> 40px) and fades out (1 -> 0)
  // - Incoming Login form enters from LEFT (-40px -> 0) and settles smoothly (0 -> 1)
  const handleSwitchMode = (targetRegister: boolean) => {
    if (transitioning) return
    const direction = targetRegister ? "to-register" : "to-login"
    setTransitionDirection(direction)
    setPassword("")
    setConfirmPassword("")
    setNotice("")
    setTransitioning(true)
    setFormPhase("leaving")

    // Outgoing form slides out slightly faster (200ms)
    setTimeout(() => {
      setDisplayRegister(targetRegister)
      setForgot(false)
      setFormPhase("entering")
      window.history.replaceState(null, "", targetRegister ? "/register" : "/login")

      // Incoming form enters slightly slower & settles smoothly (380ms) -> total ~580ms
      setTimeout(() => {
        setFormPhase("idle")
        setTransitioning(false)
      }, 380)
    }, 200)
  }

  // 1. LOGIN → FORGOT PASSWORD:
  // - Login moves slightly to the RIGHT and fades out (0 -> 40px, opacity 1 -> 0)
  // - Forgot Password enters from the LEFT and settles (-40px -> 0, opacity 0 -> 1)
  const handleOpenForgot = () => {
    if (transitioning) return
    setTransitionDirection("to-forgot")
    setNotice("")
    setTransitioning(true)
    setFormPhase("leaving")

    setTimeout(() => {
      setForgot(true)
      setFormPhase("entering")

      setTimeout(() => {
        setFormPhase("idle")
        setTransitioning(false)
      }, 380)
    }, 200)
  }

  // 2. FORGOT PASSWORD → LOGIN:
  // - Forgot Password moves slightly to the LEFT and fades out (0 -> -40px, opacity 1 -> 0)
  // - Login enters from the RIGHT (40px -> 0, opacity 0 -> 1)
  const handleBackToLogin = () => {
    if (transitioning) return
    setTransitionDirection("from-forgot")
    setNotice("")
    setTransitioning(true)
    setFormPhase("leaving")

    setTimeout(() => {
      setForgot(false)
      setFormPhase("entering")

      setTimeout(() => {
        setFormPhase("idle")
        setTransitioning(false)
      }, 380)
    }, 200)
  }

  const transitionClass =
    formPhase === "leaving"
      ? (transitionDirection === "to-register" || transitionDirection === "from-forgot")
        ? "auth-form-leave-to-left"
        : "auth-form-leave-to-right"
      : formPhase === "entering"
        ? (transitionDirection === "to-register" || transitionDirection === "from-forgot")
          ? "auth-form-enter-from-right"
          : "auth-form-enter-from-left"
        : ""

  // Mascot curved movement during Login <-> Register transition
  const mascotClass =
    formPhase !== "idle"
      ? transitionDirection === "to-register"
        ? "mascot-journey-to-register"
        : transitionDirection === "to-login"
          ? "mascot-journey-to-login"
          : ""
      : ""

  // Left slogan horizontal slide transition (synchronized with authentication state)
  const sloganTransitionClass =
    formPhase === "leaving"
      ? transitionDirection === "to-register"
        ? "auth-slogan-leave-to-left"
        : transitionDirection === "to-login"
          ? "auth-slogan-leave-to-right"
          : ""
      : formPhase === "entering"
        ? transitionDirection === "to-register"
          ? "auth-slogan-enter-from-right"
          : transitionDirection === "to-login"
            ? "auth-slogan-enter-from-left"
            : ""
        : ""

  return (
    <div className="auth-page">
      {/* Left Branding Panel: Stable Background with Dynamic Slogan & Mascot Motion */}
      <aside className="auth-story">
        <div className="auth-brand-wrapper">
          <Link className="brand" to="/" aria-label="Tindy home">
            <div className="auth-mascot-box">
              <img
                src="/logo.png"
                alt="Tindy logo"
                className={`brand-logo auth-mascot-img ${mascotClass}`}
              />
            </div>
            <span>
              tindy<span className="brand-period">.</span>
            </span>
          </Link>
        </div>

        <div className="auth-story-copy">
          <div className={`auth-story-copy-inner ${sloganTransitionClass}`}>
            <div className="eyebrow">
              {displayRegister ? "YOUR NEXT CHAPTER" : "FIRST CLOUD AI JOURNEY"}
            </div>
            <h1 className="auth-story-headline">
              {displayRegister ? (
                <>Let’s build something together.</>
              ) : (
                <>
                  Find the right project.
                  <br />
                  Build the right team.
                </>
              )}
            </h1>
            <p className="auth-story-desc">
              {displayRegister
                ? "Join your community. Find your next project."
                : "Your skills have a place. Discover meaningful projects and the people to build them with."}
            </p>
          </div>

          <div className="auth-feature">
            <span>
              <Target size={20} />
            </span>
            <div>
              <strong>Opportunities that fit you</strong>
              <p>Matched to your skills, interests, and ambitions.</p>
            </div>
          </div>
          <div className="auth-feature">
            <span>
              <ShieldCheck size={20} />
            </span>
            <div>
              <strong>Understand every recommendation</strong>
              <p>Clear explanations. Evidence-based connections.</p>
            </div>
          </div>
          <div className="auth-feature">
            <span>
              <Users size={20} />
            </span>
            <div>
              <strong>A community built to build</strong>
              <p>Connect with peers on the same journey.</p>
            </div>
          </div>
        </div>

        <div className="auth-community">
          <div className="avatar-stack">
            <Avatar name="Minh Nguyen" color="teal" />
            <Avatar name="Linh Tran" color="rose" />
            <Avatar name="An Hoang" color="amber" />
          </div>
          <span>Made for the FCAJ student community</span>
        </div>
      </aside>

      {/* Right Form Area */}
      <div className="auth-form-area">
        <Link className="auth-back auth-back-link" to="/">
          Explore the demo <ArrowUpRight size={14} />
        </Link>

        <section
          className={`auth-form auth-form-card ${transitionClass}`}
        >
          <div className="stagger-1">
            <Badge tone="blue">YOUR NEXT CHAPTER</Badge>
          </div>
          <h1 className="stagger-2">
            {forgot
              ? "Reset your password"
              : displayRegister
                ? "Let’s build something great."
                : "Welcome back."}
          </h1>
          <p className="stagger-3">
            {forgot
              ? "Enter your email to request a reset link."
              : displayRegister
                ? "Join your community. Find your next project."
                : "Your next great project is waiting."}
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (forgot) {
                setNotice(
                  "Demo only: no reset email has been sent. Authentication is not connected.",
                )
                return
              }
              if (displayRegister && password !== confirmPassword) {
                setNotice("Passwords do not match. Please ensure both passwords match.")
                return
              }
              const data = new FormData(event.currentTarget)
              setMode(String(data.get("mode") || "User"))
              if (displayRegister) {
                setProfile({
                  ...profile,
                  name: String(data.get("name") || profile.name),
                  email: String(data.get("email") || profile.email),
                  university: String(data.get("university") || "FPT University"),
                })
                navigate("/onboarding")
              } else {
                navigate("/")
              }
            }}
          >
            {displayRegister && (
              <label className="field auth-field stagger-4">
                <span className="field-label">Full name</span>
                <input
                  required
                  name="name"
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>
            )}

            {displayRegister && (
              <label className="field auth-field stagger-4">
                <span className="field-label">University / Community</span>
                <input
                  required
                  name="university"
                  list="university-list"
                  placeholder="e.g. FPT University, RMIT, VNU"
                  defaultValue="FPT University"
                  autoComplete="organization"
                />
                <datalist id="university-list">
                  <option value="FPT University" />
                  <option value="Vietnam National University (VNU)" />
                  <option value="RMIT University Vietnam" />
                  <option value="Hanoi University of Science & Technology" />
                  <option value="Foreign Trade University" />
                  <option value="Ton Duc Thang University" />
                  <option value="FCAJ Community" />
                </datalist>
              </label>
            )}

            {/* Email input with subtle focus glow & micro-interaction */}
            <label className="field auth-field stagger-4">
              <span className="field-label">
                {displayRegister ? "Institutional email address" : "Email address"}
              </span>
              <input
                required
                name="email"
                type="email"
                placeholder="you@university.edu"
                autoComplete="email"
              />
            </label>

            {!forgot && (
              <>
                <label className="field auth-field stagger-5">
                  <span className="field-label">Password</span>
                  <input
                    required
                    minLength={8}
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (notice) setNotice("")
                    }}
                    placeholder="At least 8 characters"
                    autoComplete={
                      displayRegister ? "new-password" : "current-password"
                    }
                  />
                </label>

                {displayRegister && (
                  <label className="field auth-field stagger-5">
                    <span className="field-label">Confirm password</span>
                    <input
                      required
                      minLength={8}
                      name="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (notice) setNotice("")
                      }}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <span style={{ fontSize: "10px", color: "#e11d48", fontWeight: 500, marginTop: "2px" }}>
                        Passwords do not match
                      </span>
                    )}
                  </label>
                )}

                {!displayRegister && (
                  <div className="stagger-6">
                    <button
                      type="button"
                      className="text-link forgot-link cursor-pointer"
                      onClick={handleOpenForgot}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {displayRegister && (
                  <label className="terms stagger-6">
                    <input required type="checkbox" />I agree to the community
                    guidelines and respectful collaboration.
                  </label>
                )}
              </>
            )}

            {/* Submit button with hover lift, shadow increase, and arrow nudge */}
            <div className="stagger-7">
              <button type="submit" className="auth-btn-primary">
                <span>
                  {forgot
                    ? "Request reset link"
                    : displayRegister
                      ? "Create account"
                      : "Sign in"}
                </span>
                <ArrowRight size={16} className="btn-arrow-icon" />
              </button>
            </div>
          </form>

          {notice && <div className="info-banner">{notice}</div>}

          <div className="stagger-8">
            {forgot ? (
              <button
                type="button"
                className="text-link auth-switch auth-back-signin-btn cursor-pointer"
                onClick={handleBackToLogin}
              >
                <ArrowLeft size={14} className="back-arrow-icon" />
                <span>Back to sign in</span>
              </button>
            ) : (
              <p className="auth-switch">
                {displayRegister
                  ? "Already have an account?"
                  : "New to Tindy?"}{" "}
                <button
                  type="button"
                  className="text-link font-semibold ml-1 cursor-pointer"
                  onClick={() => handleSwitchMode(!displayRegister)}
                >
                  {displayRegister ? "Sign in" : "Create an account"}
                </button>
              </p>
            )}

            <div className="trust-note">
              <Info size={14} />
              <span>
                Interactive prototype. Sign-in is simulated; no passwords are
                stored. Amazon Cognito is not connected.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export function Onboarding() {
  const { profile, setProfile } = useTindy()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(profile)
  const [done, setDone] = useState(false)
  const steps = [
    "Basic information",
    "Technical skills",
    "Preferred roles",
    "Interests",
    "Availability",
    "Projects & experience",
    "GitHub / portfolio",
    "AI profile summary",
  ]
  const update = (key: keyof Omit<Profile, "skills">, value: string) =>
    setDraft({ ...draft, [key]: value })
  const input = (
    label: string,
    key: keyof Omit<Profile, "skills">,
    multiline = false,
  ) => (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          rows={5}
          value={draft[key]}
          onChange={(event) => update(key, event.target.value)}
          required
        />
      ) : (
        <input
          value={draft[key]}
          onChange={(event) => update(key, event.target.value)}
          required
        />
      )}
    </label>
  )
  return (
    <div className="onboarding">
      <header>
        <Brand />
        <span>YOUR FCAJ JOURNEY</span>
        <Link className="text-link" to="/">
          Save & finish later <ArrowUpRight size={13} />
        </Link>
      </header>
      <div className="onboarding-layout">
        <aside>
          <div className="eyebrow">A STRONG START</div>
          <h2>
            A profile that opens
            <br />
            the right doors.
          </h2>
          <p>
            Tell us a little about yourself. We’ll help you find where you fit.
          </p>
          <ol>
            {steps.map((name, index) => (
              <li
                className={
                  index === step ? "active" : index < step ? "complete" : ""
                }
                key={name}
              >
                <span>{index < step ? <Check size={14} /> : index + 1}</span>
                {name}
              </li>
            ))}
          </ol>
        </aside>
        <section className="onboarding-panel">
          {done ? (
            <div className="onboarding-done">
              <span className="done-check">
                <Check size={30} />
              </span>
              <h1>Your Tindy profile is ready.</h1>
              <p>
                Find projects that match you. Meet the people you’ll build with.
              </p>
              <Chips items={draft.skills} />
              <Button onClick={() => navigate("/discover")}>
                Discover projects <ArrowRight size={17} />
              </Button>
            </div>
          ) : (
            <>
              <div className="step-caption">
                STEP {step + 1} OF 8{" "}
                <span>{Math.round(((step + 1) / 8) * 100)}%</span>
              </div>
              <div className="progress">
                <span style={{ width: `${((step + 1) / 8) * 100}%` }} />
              </div>
              <h1>{steps[step]}</h1>
              <p className="muted">
                {
                  [
                    "Let’s start with the basics.",
                    "What tools do you feel comfortable working with?",
                    "What would you like to contribute to a team?",
                    "What kind of work gets you curious?",
                    "Find a project that fits your schedule.",
                    "Your experience matters — including class and side projects.",
                    "Give your work a place to shine.",
                    "Review your story. Make it sound like you.",
                  ][step]
                }
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setProfile(draft)
                  if (step === 7) setDone(true)
                  else {
                    if (step === 6)
                      setDraft({
                        ...draft,
                        summary: `${draft.role} studying at ${draft.university}, with skills in ${draft.skills.slice(0, 4).join(", ")}. ${draft.experience} Interested in ${draft.interests.toLowerCase()} and available ${draft.hours} hours per week.`,
                      })
                    setStep(step + 1)
                  }
                }}
              >
                <div className="onboarding-fields">
                  {step === 0 && (
                    <>
                      {input("Full name", "name")}
                      {input("University / community", "university")}
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <label className="field">
                        Technical skills (comma separated)
                        <textarea
                          rows={3}
                          required
                          value={draft.skills.join(", ")}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              skills: event.target.value
                                .split(",")
                                .map((item) => item.trim()),
                            })
                          }
                        />
                      </label>
                      <Chips items={draft.skills.filter(Boolean)} />
                    </>
                  )}
                  {step === 2 && (
                    <div className="role-options">
                      {[
                        "Backend Developer",
                        "Frontend Developer",
                        "Full-stack Developer",
                        "AI Engineer",
                        "Cloud Engineer",
                        "UI/UX Designer",
                      ].map((role) => (
                        <button
                          type="button"
                          key={role}
                          className={draft.role === role ? "selected" : ""}
                          onClick={() => update("role", role)}
                        >
                          <Code2 size={18} />
                          {role}
                          {draft.role === role && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                  {step === 3 && (
                    <>
                      {input("Professional interests", "interests", true)}
                      {input("Learning goals", "goals", true)}
                    </>
                  )}
                  {step === 4 && (
                    <>
                      <label className="field">
                        Hours available per week
                        <input
                          type="number"
                          required
                          min="1"
                          max="40"
                          value={draft.hours}
                          onChange={(event) =>
                            update("hours", event.target.value)
                          }
                        />
                      </label>
                      <div className="info-banner">
                        <Clock size={18} />
                        Be realistic. A sustainable schedule makes for a better
                        team.
                      </div>
                    </>
                  )}
                  {step === 5 && (
                    <>
                      {input(
                        "Previous projects & your contribution",
                        "experience",
                        true,
                      )}
                      {input("Technologies you want to learn", "technologies")}
                    </>
                  )}
                  {step === 6 && (
                    <>
                      {input("GitHub profile", "github")}
                      {input("Portfolio URL", "portfolio")}
                    </>
                  )}
                  {step === 7 && (
                    <>
                      <Badge tone="blue">
                        <Sparkles size={13} />
                        AI ASSISTED DRAFT
                      </Badge>
                      {input("Your editable profile summary", "summary", true)}
                      <label className="terms">
                        <input required type="checkbox" />
                        I’ve reviewed this summary and confirm it represents my
                        experience.
                      </label>
                      <p className="helper-text">
                        Generated from your inputs using a demo template.
                      </p>
                    </>
                  )}
                </div>
                <div className="onboarding-actions">
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft size={15} />
                    Back
                  </Button>
                  <Button>
                    {step === 7 ? "Confirm & finish" : "Continue"}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

const mockProjectTemplates: Array<{
  name: string
  description: string
  type: string
  skills: string[]
  role: string
  hours: number
  duration: string
  difficulty: "Beginner-friendly" | "Intermediate" | "Advanced"
  team: number
  capacity: number
  initials: string
  color: string
  factors: number[]
  goals: string[]
  gap: string[]
}> = [
  {
    name: "CloudGuard Security Hub",
    description:
      "Make cloud security accessible. Detect, investigate, and respond to threats with an intelligent AWS dashboard.",
    type: "Cloud & DevOps",
    skills: ["AWS", "Python", "CloudWatch", "Lambda"],
    role: "Cloud Engineer",
    hours: 10,
    duration: "3 months",
    difficulty: "Intermediate",
    team: 2,
    capacity: 4,
    initials: "CG",
    color: "amber",
    factors: [85, 90, 80, 65, 100],
    goals: [
      "Monitor cloud environments for unusual activity.",
      "Automate actionable security notifications.",
      "Develop a clear dashboard for incident response.",
    ],
    gap: ["EventBridge", "GuardDuty"],
  },
  {
    name: "EcoTrack Carbon Footprint",
    description:
      "Help students measure and lower their daily carbon footprint with habit nudges, gamified challenges, and community leaderboards.",
    type: "Sustainability",
    skills: ["React Native", "TypeScript", "Node.js", "MongoDB"],
    role: "Mobile Developer",
    hours: 8,
    duration: "4 months",
    difficulty: "Intermediate",
    team: 3,
    capacity: 5,
    initials: "ET",
    color: "teal",
    factors: [90, 85, 90, 75, 100],
    goals: [
      "Track daily transport and meal choices.",
      "Build team-based reduction challenges.",
      "Integrate IoT smart campus meters.",
    ],
    gap: ["MongoDB"],
  },
  {
    name: "StudyWise Adaptive Tutor",
    description:
      "Turn lecture notes into personalized study plans, smart flashcards, and interactive quizzes with LLM-powered insights.",
    type: "EdTech & AI",
    skills: ["Python", "FastAPI", "React", "OpenAI"],
    role: "Fullstack Developer",
    hours: 12,
    duration: "3 months",
    difficulty: "Advanced",
    team: 4,
    capacity: 6,
    initials: "SW",
    color: "rose",
    factors: [95, 90, 95, 85, 100],
    goals: [
      "Vectorize lecture PDFs and course slides.",
      "Generate active recall questions with spaced repetition.",
      "Collaborative peer study groups.",
    ],
    gap: ["FastAPI"],
  },
  {
    name: "HealthPulse Telehealth Portal",
    description:
      "A collaborative clinical triage platform providing remote student consultations, appointment booking, and encrypted records.",
    type: "HealthTech",
    skills: [".NET", "PostgreSQL", "Docker", "WebRTC"],
    role: "Backend Engineer",
    hours: 10,
    duration: "5 months",
    difficulty: "Advanced",
    team: 3,
    capacity: 5,
    initials: "HP",
    color: "emerald",
    factors: [90, 80, 85, 90, 100],
    goals: [
      "HIPAA-compliant encrypted messaging and audio calls.",
      "Student clinic triage workflow automation.",
      "Integration with university medical center.",
    ],
    gap: ["Docker"],
  },
  {
    name: "SmartCampus IoT Sensor Grid",
    description:
      "Real-time energy tracking, room occupancy detection, and microclimate monitoring using campus-wide sensor meshes.",
    type: "IoT & Embedded",
    skills: ["MQTT", "Python", "C++", "AWS IoT Core"],
    role: "IoT Engineer",
    hours: 8,
    duration: "3 months",
    difficulty: "Intermediate",
    team: 1,
    capacity: 4,
    initials: "SC",
    color: "violet",
    factors: [80, 85, 90, 70, 95],
    goals: [
      "Deploy 50 low-power LoRaWAN temperature and air sensors.",
      "Streaming telemetry dashboard on AWS.",
      "Predictive HVAC optimization to reduce energy consumption.",
    ],
    gap: ["AWS IoT Core"],
  },
  {
    name: "FinSight Student Investing",
    description:
      "Gamified financial literacy and paper-trading portfolio simulator designed for university students.",
    type: "FinTech",
    skills: ["TypeScript", "Next.js", "Tailwind CSS", "PostgreSQL"],
    role: "Frontend Engineer",
    hours: 6,
    duration: "2 months",
    difficulty: "Beginner-friendly",
    team: 2,
    capacity: 4,
    initials: "FS",
    color: "indigo",
    factors: [85, 95, 80, 75, 90],
    goals: [
      "Virtual stock trading engine with real market delayed feeds.",
      "Interactive budgeting and compound interest lessons.",
      "Campus student investment league.",
    ],
    gap: ["PostgreSQL"],
  },
]

export function LeaderDashboard() {
  const {
    profile,
    projects,
    setProjects,
    candidateInvites,
    candidateInterested,
    dismissed,
    notify,
  } = useTindy()

  const [currentPage, setCurrentPage] = useState(1)
  const PROJECTS_PER_PAGE = 4

  const managed = projects.filter(
    (project) => project.id === "cloud-desk" || project.leader === profile.name,
  )

  const totalPages = Math.max(1, Math.ceil(managed.length / PROJECTS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE
  const currentProjects = managed.slice(
    startIndex,
    startIndex + PROJECTS_PER_PAGE,
  )
  const pageItemsCount = currentProjects.length

  const hasSimulated = projects.some((p) => p.id.startsWith("sim-proj-"))

  const handleSimulateAddProject = () => {
    const templateIndex = (managed.length - 1) % mockProjectTemplates.length
    const template =
      mockProjectTemplates[templateIndex >= 0 ? templateIndex : 0]
    const timestamp = Date.now()
    const newProject: Project = {
      ...template,
      id: `sim-proj-${timestamp}`,
      name: `${template.name} #${managed.length}`,
      leader: profile.name,
      created: 1,
      closing: 14,
    }

    setProjects((prev) => [...prev, newProject])
    const newTotal = managed.length + 1
    const newTotalPages = Math.ceil(newTotal / PROJECTS_PER_PAGE)
    if (newTotalPages > totalPages) {
      setCurrentPage(newTotalPages)
    }
    notify(
      `Simulated project created: "${newProject.name}" (Total: ${newTotal})`,
    )
  }

  const handleResetProjects = () => {
    setProjects(initialProjects)
    setCurrentPage(1)
    notify("Reset projects back to default.")
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    notify(`Project "${projectName}" removed.`)
  }

  return (
    <>
      <PageHeader
        eyebrow="PROJECT LEADER WORKSPACE"
        title="Great teams start here."
        description="Turn your next idea into a project. Find the people to bring it to life."
        action={
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={handleSimulateAddProject}
              title="Add a sample mock project to test auto-grid and pagination"
            >
              <Sparkles size={16} />
              Simulate Add Project
            </button>
            {hasSimulated && (
              <button
                className="btn btn-ghost"
                onClick={handleResetProjects}
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                title="Reset back to default project"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
            <Link className="btn btn-primary" to="/create-project">
              <Plus size={16} />
              Create project
            </Link>
          </div>
        }
      />
      <section className="stats-grid">
        <Stat
          label="Open positions"
          value={managed.reduce(
            (total, project) => total + project.capacity - project.team,
            0,
          )}
          detail="Find the right people"
          icon={<Code2 size={18} />}
        />
        <Stat
          label="Interested candidates"
          value={candidateInterested.length}
          detail="Ready to contribute"
          icon={<Users size={18} />}
          tone="teal"
        />
        <Stat
          label="Pending invitations"
          value={candidateInvites.length}
          detail="Your team is taking shape"
          icon={<Mail size={18} />}
          tone="amber"
        />
        <Stat
          label="Team members"
          value={managed.reduce((total, project) => total + project.team, 0)}
          detail="Building together"
          icon={<FolderKanban size={18} />}
          tone="sky"
        />
      </section>
      <SectionHeading
        title="Your projects"
        description="A clear picture of what’s moving forward."
        action={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                background: "#f0f4fa",
                color: "#3553b5",
                fontWeight: 600,
                padding: "4px 9px",
                borderRadius: "5px",
                border: "1px solid #dce6f6",
              }}
            >
              {managed.length === 0 && "0 projects"}
              {managed.length === 1 && "1 project · Full width"}
              {managed.length === 2 && "2 projects · 2 columns"}
              {managed.length === 3 && "3 projects · 3 columns"}
              {managed.length === 4 && "4 projects · 2×2 grid"}
              {managed.length > 4 &&
                `${managed.length} projects · Paginated (Max 4/page)`}
            </span>
            <button
              className="btn btn-secondary"
              style={{
                fontSize: "11px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
              onClick={handleSimulateAddProject}
              title="Add a sample mock project to test grid layout"
            >
              <Plus size={14} />
              Simulate Add Project
            </button>
            {hasSimulated && (
              <button
                className="btn btn-ghost"
                style={{
                  fontSize: "11px",
                  padding: "6px 10px",
                  color: "var(--text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={handleResetProjects}
                title="Reset to default project"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            )}
          </div>
        }
      />
      {managed.length === 0 ? (
        <div
          className="panel empty-state"
          style={{
            margin: "22px 0",
            textAlign: "center",
            padding: "40px 20px",
          }}
        >
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            No projects currently managed.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleSimulateAddProject}
          >
            <Plus size={16} />
            Simulate Add Project
          </button>
        </div>
      ) : (
        <>
          <div
            className={`leader-projects-grid grid-cols-${pageItemsCount}`}
            data-count={pageItemsCount}
          >
            {currentProjects.map((project) => (
              <section className="leader-project panel" key={project.id}>
                <div className="leader-project-top">
                  <span className={`project-mark ${project.color}`}>
                    {project.initials}
                  </span>
                  <div>
                    <Badge tone="success">RECRUITING</Badge>
                    <h2>{project.name}</h2>
                    <p title={project.description}>{project.description}</p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {project.id.startsWith("sim-proj-") && (
                      <button
                        className="icon-button"
                        onClick={() =>
                          handleDeleteProject(project.id, project.name)
                        }
                        title="Delete simulated project"
                        aria-label="Delete project"
                        style={{ color: "#d9534f" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <Link
                      className="icon-button"
                      to={`/project/${project.id}/edit`}
                      aria-label="Edit project"
                    >
                      <MoreHorizontal size={20} />
                    </Link>
                  </div>
                </div>
                <div className="leader-project-stats">
                  <span>
                    <Users size={16} />
                    <strong>
                      {project.team} / {project.capacity}
                    </strong>{" "}
                    members
                  </span>
                  <span>
                    <Code2 size={16} />
                    <strong>{project.capacity - project.team}</strong> open
                    positions
                  </span>
                  <Link
                    to="/candidates"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    <Sparkles size={16} />
                    <strong>{candidateInterested.length}</strong> interested
                    candidates
                  </Link>
                </div>
                <div className="leader-project-actions">
                  <Link to="/candidates" className="btn btn-primary">
                    Candidate pipeline <ArrowRight size={15} />
                  </Link>
                  <Link to="/team" className="btn btn-secondary">
                    Team workspace
                  </Link>
                  <Link
                    to={`/project/${project.id}/edit`}
                    className="text-link"
                  >
                    Manage project <ArrowUpRight size={14} />
                  </Link>
                </div>
              </section>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="leader-pagination">
              <div className="leader-pagination-info">
                Showing{" "}
                <strong>
                  {startIndex + 1}–
                  {Math.min(startIndex + PROJECTS_PER_PAGE, managed.length)}
                </strong>{" "}
                of <strong>{managed.length}</strong> projects (Page{" "}
                {currentPage} of {totalPages})
              </div>
              <div className="leader-pagination-controls">
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>
                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        className={`pagination-page-number ${pageNum === currentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(pageNum)}
                        aria-label={`Go to page ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="btn btn-secondary pagination-btn"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="two-column">
        <section className="panel">
          <SectionHeading
            title="Candidate shortlist"
            action={
              <Link className="text-link" to="/candidates">
                View pipeline <ArrowRight size={13} />
              </Link>
            }
          />
          {initialCandidates
            .filter((candidate) => !dismissed.includes(candidate.name))
            .slice(0, 3)
            .map((candidate) => (
              <Link
                className="recent-candidate"
                key={candidate.name}
                to={`/candidate/${encodeURIComponent(candidate.name)}`}
              >
                <Avatar name={candidate.name} color={candidate.color} />
                <div>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.role}</small>
                </div>
                <Badge tone="success">{candidate.match}% match</Badge>
              </Link>
            ))}
        </section>
        <section className="panel">
          <SectionHeading title="Keep the conversation going" />
          <div className="leader-message">
            <Avatar name="Cao Thanh Nhan" color="teal" />
            <div>
              <h3>Cao Thanh Nhan</h3>
              <p>“I’d love to learn more about the backend architecture.”</p>
              <Link
                className="text-link"
                to="/messages?conversation=Cao%20Thanh%20Nhan"
              >
                Reply in chat <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="trust-note">
            <Users size={18} />
            <span>
              The best team fit goes beyond a score. Start a conversation about
              goals, availability, and how you like to work.
            </span>
          </div>
        </section>
      </div>
    </>
  )
}

export function CreateProject() {
  const { id } = useParams()
  const { projects, setProjects, profile, notify } = useTindy()
  const existing = projects.find((project) => project.id === id)
  const navigate = useNavigate()
  const [jd, setJd] = useState(existing?.description || "")
  const [name, setName] = useState(existing?.name || "")
  const [goals, setGoals] = useState(existing?.goals.join("\n") || "")
  const [stack, setStack] = useState(existing?.skills.join(", ") || "")
  const [role, setRole] = useState(existing?.role || "Backend Developer")
  const [hours, setHours] = useState(existing?.hours || 10)
  const [duration, setDuration] = useState(existing?.duration || "3 months")
  const [type, setType] = useState(existing?.type || "AI & Machine Learning")
  const [members, setMembers] = useState(existing?.team || 1)
  const [positions, setPositions] = useState(
    existing ? existing.capacity - existing.team : 2,
  )
  const [required, setRequired] = useState(
    (existing?.requiredSkills || existing?.skills.slice(0, 3))?.join(", ") ||
      "",
  )
  const [nice, setNice] = useState(existing?.gap.join(", ") || "")
  const [level, setLevel] = useState(existing?.difficulty || "Intermediate")
  const [confirmed, setConfirmed] = useState(false)
  return (
    <>
      <Link className="back-link" to="/leader">
        <ArrowLeft size={14} />
        Leader workspace
      </Link>
      <PageHeader
        title={
          existing ? "Manage your project" : "Bring your next idea to life."
        }
        description="A clear project brief helps the right people find you."
      />
      <div className="create-layout">
        <form
          className="panel project-form"
          onSubmit={(event) => {
            event.preventDefault()
            const project: Project = {
              id: existing?.id || `project-${Date.now()}`,
              name,
              description: jd,
              type,
              skills: stack
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              role,
              hours,
              duration,
              difficulty: level,
              team: members,
              capacity: members + positions,
              leader: profile.name,
              initials: name
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
                .toUpperCase(),
              color: "indigo",
              created: Date.now(),
              closing: 14,
              factors: existing?.factors || [80, 85, 100, 75, 100],
              goals: goals.split("\n").filter(Boolean),
              requiredSkills: required
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              gap: nice
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            }
            setProjects((old) =>
              existing
                ? old.map((item) => (item.id === existing.id ? project : item))
                : [...old, project],
            )
            notify(
              existing
                ? "Project updated"
                : "Project published · Recruitment is open",
            )
            navigate("/leader")
          }}
        >
          <div className="form-section-heading">
            <span>01</span>
            <div>
              <h2>The big picture</h2>
              <p>Tell your future teammates what you’re building.</p>
            </div>
          </div>
          <label className="field">
            Project name
            <input
              required
              placeholder="e.g. AI Customer Support System"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            Project description
            <textarea
              required
              rows={5}
              placeholder="What are you building, and why does it matter?"
              value={jd}
              onChange={(event) => {
                setJd(event.target.value)
                setConfirmed(false)
              }}
            />
          </label>
          <div className="ai-assist-row">
            <span>
              <Sparkles size={15} />A starting point, not the final word.
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={!name.trim()}
              onClick={() => {
                setJd(
                  `${name} is a collaborative FCAJ project focused on ${type.toLowerCase()}. Our goal is to build a practical, user-centered solution using ${stack || "a modern technology stack"}. We’re looking for a ${role} to help design, develop, and deploy the product. You’ll work alongside a supportive student team and contribute ${hours} hours per week over ${duration}.`,
                )
                setConfirmed(false)
                notify("Demo JD generated · Please review before publishing")
              }}
            >
              <Sparkles size={14} />
              Generate JD with AI
            </Button>
          </div>
          <label className="field">
            Project goals <small>One objective per line</small>
            <textarea
              required
              rows={3}
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="What will your team achieve?"
            />
          </label>
          <div className="form-grid">
            <label className="field">
              Project type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {[
                  "AI & Machine Learning",
                  "Cloud & DevOps",
                  "Web Application",
                  "Open Source",
                  "Social Impact",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Technology stack
              <input
                required
                value={stack}
                onChange={(event) => setStack(event.target.value)}
                placeholder=".NET, AWS, PostgreSQL, React"
              />
            </label>
          </div>
          <div className="form-section-heading">
            <span>02</span>
            <div>
              <h2>The people & the fit</h2>
              <p>Define the roles, not just the tools.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              Current team members
              <input
                type="number"
                min="1"
                max="20"
                required
                value={members}
                onChange={(event) => setMembers(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Available positions
              <input
                type="number"
                min="1"
                max="20"
                required
                value={positions}
                onChange={(event) => setPositions(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Required role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {[
                  "Backend Developer",
                  "Frontend Developer",
                  "Full-stack Developer",
                  "AI Engineer",
                  "Cloud Engineer",
                  "UI/UX Designer",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Experience level
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option>Beginner-friendly</option>
                <option>Intermediate</option>
              </select>
            </label>
          </div>
          <label className="field">
            Required skills
            <input
              required
              value={required}
              onChange={(event) => setRequired(event.target.value)}
              placeholder=".NET, REST API, PostgreSQL"
            />
          </label>
          <label className="field">
            Nice-to-have skills
            <input
              value={nice}
              onChange={(event) => setNice(event.target.value)}
              placeholder="Docker, CI/CD"
            />
          </label>
          <div className="form-section-heading">
            <span>03</span>
            <div>
              <h2>A realistic commitment</h2>
              <p>Help students find a sustainable fit.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              Expected commitment (hours / week)
              <input
                type="number"
                required
                min="1"
                max="40"
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
              />
            </label>
            <label className="field">
              Project duration
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option>1 month</option>
                <option>2 months</option>
                <option>3 months</option>
              </select>
            </label>
          </div>
          <label className="terms">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              required
            />
            I have reviewed the project brief and confirm all information before
            publishing.
          </label>
          <div className="form-footer">
            <Link className="btn btn-secondary" to="/leader">
              Cancel
            </Link>
            <Button>
              {existing ? "Save changes" : "Publish project"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
        <aside className="panel create-advice">
          <span className="icon-tile teal">
            <FileText size={21} />
          </span>
          <h3>A brief worth joining</h3>
          <p>Great project briefs make three things clear:</p>
          <ul>
            <li>
              <Check size={15} />
              What you’re building
            </li>
            <li>
              <Check size={15} />
              How a student can contribute
            </li>
            <li>
              <Check size={15} />
              What they’ll learn along the way
            </li>
          </ul>
          <div className="trust-note">
            <Info size={16} />
            <span>
              AI-generated descriptions are editable drafts. Your review is
              required before publication. Generation is simulated in this
              prototype.
            </span>
          </div>
        </aside>
      </div>
    </>
  )
}

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

                  <div className="match-strip">
                    <div className="match-score compact">
                      <div className="score-number">
                        {candidate.match}
                        <span>%</span>
                      </div>
                      <div>
                        <strong>Match</strong>
                      </div>
                    </div>
                    <button onClick={() => setExplainCandidate(candidate)}>
                      Why this match <ChevronRight size={13} />
                    </button>
                  </div>

                  <div className="project-card-bottom">
                    <Link
                      className="btn btn-secondary"
                      to={`/messages?conversation=${encodeURIComponent(candidate.name)}`}
                    >
                      <MessageSquare size={14} />
                      Message
                    </Link>

                    {tab === "Archived" ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setCandidateArchived((old) =>
                            old.filter((n) => n !== candidate.name),
                          )
                          setCandidateInterested((old) => [
                            ...new Set([...old, candidate.name]),
                          ])
                          notify(`${candidate.name} restored to Interested`)
                        }}
                      >
                        Restore
                      </Button>
                    ) : isActive ? (
                      <Link className="btn btn-secondary" to="/team">
                        Team workspace
                      </Link>
                    ) : (
                      <Button
                        disabled={isInvited}
                        onClick={() => setInviteModal(candidate.name)}
                      >
                        {isInvited ? "Invited ✓" : "Invite to team"}
                      </Button>
                    )}
                  </div>

                  {cardStatus && (
                    <div className="card-status">
                      <Check size={13} />
                      {cardStatus}
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          {tab === "Invited" &&
            selected.map((candidate) => (
              <div className="invitation-bar" key={candidate.name}>
                <span>
                  Invitation sent to <strong>{candidate.name}</strong> for{" "}
                  <strong>AI Customer Support System</strong> ({candidate.role})
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
            They will receive an invitation to join AI Customer Support System
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
            <div className="match-score">
              <div className="score-number">
                {explainCandidate.match}
                <span>%</span>
              </div>
              <div>
                <strong>
                  {explainCandidate.match >= 85
                    ? "Excellent candidate match"
                    : "Strong candidate match"}
                </strong>
                <small>
                  Calculated against AI Customer Support System requirements
                </small>
              </div>
            </div>
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
  if (!candidate) return <NotFound />
  return (
    <>
      <Link className="back-link" to="/team">
        <ArrowLeft size={14} />
        Back to team workspace
      </Link>
      <PageHeader
        title="A person behind the profile."
        description="Candidate review · AI Customer Support System"
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
              <Sparkles size={15} />
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

type ChatMessage = {
  body: string
  outgoing: boolean
  file?: boolean
}
export function Messages() {
  const [params, setParams] = useSearchParams()
  const { notify, profile } = useTindy()
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState("")
  const [tab, setTab] = useState("General chat")
  const [history, setHistory] = useState<Record<string, ChatMessage[]>>({})
  const current = params.get("conversation") || "Minh Nguyen"
  const people = [
    ...new Set(["Minh Nguyen", "EcoTrack team", "Cao Thanh Nhan", current]),
  ]
  const team = current.includes("team")
  const initial: ChatMessage[] =
    current === "Minh Nguyen"
      ? [
          {
            body: `Hey ${profile.name.split(" ")[0]}! Your experience with .NET and RAG caught my eye. I think you’d be a great fit for our AI Customer Support project.`,
            outgoing: false,
          },
          {
            body: "Thanks for reaching out! The project sounds really interesting. I’d love to learn more about the architecture.",
            outgoing: true,
          },
          {
            body: "Absolutely. We’re building the backend on .NET, with PostgreSQL and AWS. Would you have 8–10 hours a week to collaborate?",
            outgoing: false,
          },
        ]
      : [
          {
            body: team
              ? "Welcome to the team! Our next check-in is Friday at 5 PM. Share what you’re working on here."
              : `Hi! I’d love to connect about AI Customer Support System.`,
            outgoing: !team,
          },
        ]
  const messages = history[current] || initial
  const send = (body: string, file = false) => {
    if (!body.trim()) return
    setHistory((old) => ({
      ...old,
      [current]: [...messages, { body, outgoing: true, file }],
    }))
    setDraft("")
    if (!file) notify("Message sent")
  }
  return (
    <>
      <PageHeader
        title="Conversations that move things forward."
        description="Connect with project leaders, candidates, and your team."
      />
      <section className="messaging">
        <aside className="conversation-sidebar">
          <div className="conversation-heading">
            <h3>Messages</h3>
            <span className="badge">{people.length}</span>
          </div>
          <label className="search-input">
            <Search size={16} />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="conversation-list">
            {people
              .filter((person) =>
                person.toLowerCase().includes(query.toLowerCase()),
              )
              .map((person, index) => (
                <button
                  key={person}
                  className={`conversation ${
                    current === person ? "active" : ""
                  }`}
                  onClick={() => {
                    setParams({ conversation: person })
                    setTab("General chat")
                    setDraft("")
                  }}
                >
                  <Avatar
                    name={person}
                    color={index === 0 ? "teal" : index === 1 ? "green" : "sky"}
                  />
                  <div>
                    <div>
                      <strong>{person}</strong>
                      <small>{index === 0 ? "10:42" : "Yesterday"}</small>
                    </div>
                    <span>
                      {person.includes("team")
                        ? "EcoTrack · Team conversation"
                        : "AI Customer Support System"}
                    </span>
                    <p>
                      {history[person]?.at(-1)?.body ||
                        (index === 0
                          ? "Would you have 8–10 hours a week?"
                          : "Let’s build something meaningful.")}
                    </p>
                  </div>
                  {index === 0 && <i />}
                </button>
              ))}
          </div>
          {query &&
            !people.some((person) =>
              person.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <EmptyState
                title="No conversations found"
                description="Try a different name."
              />
            )}
          <div className="conversation-context">
            <ShieldCheck size={15} />
            <span>
              Your project conversations,
              <br />
              all in one place.
            </span>
          </div>
        </aside>
        <div className="chat-main">
          <div className="chat-header">
            <Avatar name={current} color="teal" />
            <div>
              <h3>{current}</h3>
              <p>
                <span className="online-dot" />
                {team ? "Team conversation" : "Project leader / candidate"}{" "}
                <b>·</b> FCAJ
              </p>
            </div>
            <Link
              to={team ? "/project/ecotrack" : "/project/cloud-desk"}
              className="btn btn-secondary"
            >
              View project <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="chat-project-context">
            <FolderKanban size={15} />
            <span>{team ? "EcoTrack" : "AI Customer Support System"}</span>
            <Badge>PROJECT CONTEXT</Badge>
          </div>
          {team && (
            <div className="tabs chat-tabs">
              {["General chat", "Announcements", "Team members"].map((item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          {tab === "Announcements" ? (
            <div className="chat-announcement">
              <Badge tone="blue">TEAM UPDATE</Badge>
              <h3>Kickoff · Friday, 5 PM</h3>
              <p>
                Bring your ideas and questions. We’ll review the architecture
                and plan our first sprint.
              </p>
            </div>
          ) : tab === "Team members" ? (
            <div className="chat-announcement">
              {["Jamie Le", profile.name, "An Hoang", "Linh Tran"].map(
                (person) => (
                  <div className="team-person" key={person}>
                    <Avatar name={person} />
                    <strong>{person}</strong>
                    <Badge>MEMBER</Badge>
                  </div>
                ),
              )}
            </div>
          ) : (
            <>
              <div className="chat-messages">
                <div className="chat-date">
                  <span>Today</span>
                </div>
                {messages.map((message, index) => (
                  <div
                    className={`message-row ${
                      message.outgoing ? "outgoing" : ""
                    }`}
                    key={index}
                  >
                    {!message.outgoing && (
                      <Avatar name={current} color="teal" />
                    )}
                    <div>
                      <div className="chat-bubble">
                        {message.file && <Paperclip size={15} />} {message.body}
                      </div>
                      <small>
                        {message.outgoing ? "You" : current.split(" ")[0]} · 10:
                        {(32 + index).toString().padStart(2, "0")}{" "}
                        {message.outgoing && <CheckCheck size={12} />}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="message-composer"
                onSubmit={(event) => {
                  event.preventDefault()
                  send(draft)
                }}
              >
                <label className="attach-file" title="Attach a file">
                  <Paperclip size={20} />
                  <input
                    type="file"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        send(file.name, true)
                        notify(
                          "Attachment added · Filename only in this prototype",
                        )
                      }
                    }}
                  />
                </label>
                <input
                  aria-label="Write a message"
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button disabled={!draft.trim()} aria-label="Send message">
                  <Send size={17} />
                </Button>
              </form>
              <div className="chat-demo-note">
                Local demo conversation · Messages are not sent to a server.
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

export function Notifications() {
  const { read, setRead, notify } = useTindy()
  const [tab, setTab] = useState("All updates")
  const updates = [
    {
      title: "You received a team invitation.",
      description:
        "Minh Nguyen invited you to join AI Customer Support System.",
      icon: Mail,
      tone: "teal",
      path: "/projects?tab=Invited",
      label: "Review invitation",
      time: "12 minutes ago",
    },
    {
      title: "Your profile was viewed by a project team.",
      description:
        "The AI Customer Support System team is getting to know your experience.",
      icon: Users,
      tone: "indigo",
      path: "/profile",
      label: "View profile",
      time: "1 hour ago",
    },
    {
      title: "A new project recommendation is ready.",
      description:
        "Campus Cloud aligns with your React skills and community interests.",
      icon: Sparkles,
      tone: "sky",
      path: "/project/campus-cloud",
      label: "View project",
      time: "2 hours ago",
    },
    {
      title: "Your project has a new interested candidate.",
      description:
        "Cao Thanh Nhan is interested in contributing to your backend.",
      icon: Code2,
      tone: "amber",
      path: "/candidate/Cao%20Thanh%20Nhan",
      label: "Review candidate",
      time: "Yesterday",
    },
  ]
  return (
    <>
      <PageHeader
        title="Stay in the loop."
        description="Your invitations, opportunities, and community updates."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setRead([0, 1, 2, 3])
              notify("All notifications marked as read")
            }}
          >
            <CheckCheck size={15} />
            Mark all as read
          </Button>
        }
      />
      <div className="status-tabs">
        {["All updates", "Unread"].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={tab === item ? "active" : ""}
          >
            {item}
            {item === "Unread" && <span>{4 - read.length}</span>}
          </button>
        ))}
      </div>
      <section className="panel notifications-panel">
        {updates.map((update, index) =>
          tab === "Unread" && read.includes(index) ? null : (
            <div
              className={`notification-row ${
                read.includes(index) ? "" : "unread"
              }`}
              key={update.title}
            >
              <span className={`icon-tile ${update.tone}`}>
                <update.icon size={19} />
              </span>
              <div>
                <h3>
                  {update.title}
                  {!read.includes(index) && <i className="unread-dot" />}
                </h3>
                <p>{update.description}</p>
                <small>{update.time}</small>
              </div>
              <Link
                to={update.path}
                className="btn btn-secondary"
                onClick={() => setRead((old) => [...new Set([...old, index])])}
              >
                {update.label}
                <ArrowRight size={13} />
              </Link>
            </div>
          ),
        )}
        {tab === "Unread" && read.length === 4 && (
          <EmptyState
            title="You’re all caught up."
            description="New opportunities and updates will appear here."
          />
        )}
      </section>
    </>
  )
}

export function TeamScreen() {
  const { profile, notify } = useTindy()
  const [announcement, setAnnouncement] = useState("")
  const [posts, setPosts] = useState([
    "Welcome to EcoTrack! Our kickoff is Friday at 5 PM. Bring your ideas.",
  ])
  const [invite, setInvite] = useState(false)
  const [team, setTeam] = useState([
    "Jamie Le",
    profile.name,
    "An Hoang",
    "Linh Tran",
  ])
  return (
    <>
      <PageHeader
        eyebrow="TEAM WORKSPACE"
        title="EcoTrack"
        description="A shared space for the people building a greener future."
        action={
          <Link
            className="btn btn-primary"
            to="/messages?conversation=EcoTrack%20team"
          >
            <MessageSquare size={16} />
            Open team chat
          </Link>
        }
      />
      <div className="two-column">
        <section className="panel">
          <SectionHeading
            title="Your team"
            action={
              <Button variant="secondary" onClick={() => setInvite(true)}>
                <Plus size={14} />
                Invite
              </Button>
            }
          />
          {team.map((person, index) => (
            <div className="team-person" key={person}>
              <Avatar name={person} color={index === 0 ? "green" : "neutral"} />
              <div>
                <strong>{person}</strong>
                <p>
                  {index === 0
                    ? "Project leader"
                    : index === 1
                      ? "Backend Developer"
                      : index === 2
                        ? "AI Engineer"
                        : "Frontend Developer"}
                </p>
              </div>
              <Badge tone="success">ACTIVE</Badge>
            </div>
          ))}
          <Link to="/leader" className="text-link spaced">
            Leader workspace <ArrowRight size={14} />
          </Link>
        </section>
        <section className="panel">
          <h2>Team announcements</h2>
          {posts.map((post, index) => (
            <div className="announcement" key={index}>
              <Badge tone="blue">TEAM UPDATE</Badge>
              <p>{post}</p>
              <small>Published to your team</small>
            </div>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (announcement.trim()) {
                setPosts([...posts, announcement])
                setAnnouncement("")
                notify("Announcement published")
              }
            }}
          >
            <label className="field">
              Share an update
              <textarea
                rows={3}
                value={announcement}
                onChange={(event) => setAnnouncement(event.target.value)}
                placeholder="What should the team know?"
              />
            </label>
            <Button disabled={!announcement.trim()}>
              Post announcement <Send size={14} />
            </Button>
          </form>
        </section>
      </div>
      {invite && (
        <Modal title="Invite teammate" onClose={() => setInvite(false)}>
          <h2>Make room for one more.</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              setTeam([...team, String(data.get("name"))])
              setInvite(false)
              notify("Demo teammate added")
            }}
          >
            <label className="field">
              Name
              <input required name="name" />
            </label>
            <label className="field">
              Email
              <input required type="email" />
            </label>
            <Button>
              Send invitation <ArrowRight size={15} />
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}

export function SettingsScreen() {
  const { profile, setProfile, mode, setMode, notify } = useTindy()
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    () => {
      try {
        const stored = localStorage.getItem("tindy-v2-preferences")
        if (stored) return JSON.parse(stored)
      } catch {}
      return {
        "Email notifications": true,
        "Project invitations": true,
        "New recommendations": true,
        "Team announcements": true,
      }
    },
  )
  const [email, setEmail] = useState(profile.email)
  const [activeSection, setActiveSection] = useState("account")

  // ScrollSpy to highlight the active section when the page enters its region
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ["account", "preferences", "privacy"]
      const triggerY = 220

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i])
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= triggerY) {
            setActiveSection(sectionIds[i])
            return
          }
        }
      }
      setActiveSection("account")
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Smooth scroll handler when clicking navigation item
  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      const topOffset = 28
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - topOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
      window.history.replaceState(null, "", `#${id}`)
    }
  }

  // Handle initial hash in URL (e.g. /settings#preferences)
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.replace("#", "")
      if (["account", "preferences", "privacy"].includes(hash)) {
        window.setTimeout(() => {
          scrollToSection(hash)
        }, 120)
      }
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Your workspace, your way."
        description="Manage your account and choose what keeps you in the loop."
      />
      <div className="settings-layout">
        <aside
          className="settings-sidebar"
          style={{
            position: "sticky",
            top: "24px",
            alignSelf: "start",
            height: "fit-content",
            zIndex: 20,
          }}
        >
          <button
            type="button"
            className={`settings-nav-item ${activeSection === "account" ? "active" : ""}`}
            onClick={() => scrollToSection("account")}
          >
            <GraduationCap size={16} />
            <span>Account</span>
          </button>
          <button
            type="button"
            className={`settings-nav-item ${activeSection === "preferences" ? "active" : ""}`}
            onClick={() => scrollToSection("preferences")}
          >
            <Bell size={16} />
            <span>Notifications</span>
          </button>
          <button
            type="button"
            className={`settings-nav-item ${activeSection === "privacy" ? "active" : ""}`}
            onClick={() => scrollToSection("privacy")}
          >
            <ShieldCheck size={16} />
            <span>Privacy & security</span>
          </button>
        </aside>
        <div className="settings-content">
          <form
            id="account"
            className={`panel settings-panel ${activeSection === "account" ? "active-section" : ""}`}
            onSubmit={(event) => {
              event.preventDefault()
              setProfile({ ...profile, email })
              notify("Account preferences saved")
            }}
          >
            <h2>Account</h2>
            <label className="field">
              Email address
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <Button>
              Save changes <Check size={15} />
            </Button>
          </form>
          <section
            id="preferences"
            className={`panel settings-panel ${activeSection === "preferences" ? "active-section" : ""}`}
          >
            <h2>Notifications</h2>
            <p>Keep the important updates. Leave the noise.</p>
            {Object.entries(preferences).map(([label, value]) => (
              <label className="toggle-row" key={label}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={value}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      [label]: event.target.checked,
                    })
                  }
                />
              </label>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.setItem(
                  "tindy-v2-preferences",
                  JSON.stringify(preferences),
                )
                notify("Notification preferences saved")
              }}
            >
              Save preferences
            </Button>
          </section>
          <section
            id="privacy"
            className={`panel settings-panel ${activeSection === "privacy" ? "active-section" : ""}`}
          >
            <h2>Privacy & security</h2>
            <p>
              Your profile is visible to the FCAJ community. Other users and
              project creators can review it when you connect.
            </p>
            <div className="trust-note">
              <ShieldCheck size={17} />
              <span>
                This is an interactive frontend prototype. Cognito
                authentication, storage, AI services, and real-time
                communication are not connected.
              </span>
            </div>
            <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <Link to="/login" className="btn btn-secondary">
                <LogOut size={15} />
                Sign out of demo
              </Link>
            </div>
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Community Support Coordinator</div>
              <p style={{ margin: '4px 0 10px', fontSize: '11px' }}>Have questions about projects or matching? Reach out directly.</p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <a href="mailto:support@fcaj.community" className="text-link" style={{ gap: '4px' }}>
                  <Mail size={13} /> support@fcaj.community
                </a>
                <a href="tel:+8418006868" className="text-link" style={{ gap: '4px' }}>
                  <Phone size={13} /> +84 (0) 1800 6868
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export function ComponentLibrary() {
  return (
    <>
      <PageHeader
        eyebrow="TINDY DESIGN SYSTEM / 01"
        title="Clear by design."
        description="A consistent visual language for meaningful projects and thoughtful collaboration."
      />
      <div className="two-column">
        <section className="panel">
          <h2>Color & status</h2>
          <div className="token-swatches">
            {["indigo", "teal", "sky", "green", "amber", "rose"].map(
              (color) => (
                <div className={color} key={color}>
                  {color}
                </div>
              ),
            )}
          </div>
          <div className="header-buttons">
            <Badge tone="success">Excellent match</Badge>
            <Badge tone="warning">Opportunity to grow</Badge>
            <Badge tone="blue">AI insight</Badge>
          </div>
          <h3>Typography</h3>
          <h1>Find your next chapter.</h1>
          <h2>Build something meaningful.</h2>
          <p>
            Manrope for confident headings. Inter for clear, readable
            interfaces.
          </p>
          <h3>Actions</h3>
          <div className="header-buttons">
            <Button>
              Primary action <ArrowRight size={15} />
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Tertiary</Button>
            <Button disabled>Disabled</Button>
          </div>
          <h3>Skills & identity</h3>
          <Chips items={[".NET", "AWS", "PostgreSQL", "RAG"]} />
          <div className="header-buttons spaced">
            <Avatar name="Alex Le" />
            <Avatar name="Linh Tran" color="teal" />
            <Avatar name="An Hoang" color="amber" />
          </div>
        </section>
        <section className="panel">
          <h2>Score & progress</h2>
          <Score project={initialProjects[0]} />
          <h3>Loading state</h3>
          <Skeleton />
          <h3>Inputs</h3>
          <label className="field">
            Project name
            <input placeholder="What will you build?" />
          </label>
          <label className="field">
            Role
            <select>
              <option>Backend Developer</option>
            </select>
          </label>
          <h3>Empty state</h3>
          <EmptyState
            title="Your next project is out there."
            description="Start with a skill, an interest, or an idea."
          />
        </section>
      </div>
    </>
  )
}
export function NotFound() {
  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", textAlign: "center", padding: "30px 20px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "80px",
          height: "80px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)",
          color: "var(--primary)",
          fontSize: "30px",
          fontWeight: "800",
          marginBottom: "20px",
          boxShadow: "0 4px 12px rgba(48, 79, 197, 0.12)",
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: "28px",
          letterSpacing: "-0.8px",
          color: "var(--ink)",
          marginBottom: "10px",
        }}
      >
        Page not found
      </h1>
      <p
        className="muted"
        style={{
          fontSize: "13px",
          lineHeight: "1.7",
          maxWidth: "480px",
          margin: "0 auto 30px",
        }}
      >
        The page you are looking for doesn’t exist, has been moved, or is temporarily unavailable. Let’s get you back to the opportunities that matter.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "40px",
        }}
      >
        <Link className="btn btn-primary" to="/" style={{ padding: "11px 20px" }}>
          <LayoutDashboard size={16} />
          Go to Dashboard
        </Link>
        <Link className="btn btn-secondary" to="/discover" style={{ padding: "11px 20px" }}>
          <Compass size={16} />
          Discover Projects
        </Link>
        <Link className="btn btn-secondary" to="/ai" style={{ padding: "11px 20px" }}>
          <Sparkles size={16} />
          AI Studio
        </Link>
      </div>

      <div
        className="panel"
        style={{
          textAlign: "left",
          padding: "20px",
          background: "#f8fafc",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ fontSize: "13px", marginBottom: "12px", color: "var(--ink)" }}>
          Need assistance or looking for another section?
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            fontSize: "12px",
          }}
        >
          <Link to="/projects" className="text-link" style={{ gap: "6px" }}>
            <FolderKanban size={14} /> My Projects workspace
          </Link>
          <Link to="/team" className="text-link" style={{ gap: "6px" }}>
            <Users size={14} /> Team workspace
          </Link>
          <a
            href="mailto:support@fcaj.community"
            className="text-link"
            style={{ gap: "6px" }}
          >
            <Mail size={14} /> support@fcaj.community
          </a>
        </div>
      </div>
    </div>
  )
}
