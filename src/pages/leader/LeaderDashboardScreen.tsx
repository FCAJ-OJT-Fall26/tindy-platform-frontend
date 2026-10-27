import { useState, useEffect } from "react"
import { Link } from "react-router"
import {
  Sparkles,
  RotateCcw,
  Plus,
  Code2,
  Users,
  Mail,
  FolderKanban,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useTindy, Project, initialProjects, initialCandidates } from "../../store"
import { PageHeader, Stat, SectionHeading, Avatar, Badge } from "../../components/ui"
import { getStoredToken } from "../../services/apiClient"
import { deleteProjectApi } from "../../services/projects.service"

export const mockProjectTemplates: Array<{
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

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (getStoredToken() && !projectId.startsWith("sim-proj-")) {
      try {
        await deleteProjectApi(projectId)
      } catch {
        // Keep local archive working when backend is offline
      }
    }
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
                    <button
                      className="icon-button"
                      onClick={() =>
                        handleDeleteProject(project.id, project.name)
                      }
                      title="Close or archive project"
                      aria-label="Delete project"
                      style={{ color: "#d9534f" }}
                    >
                      <Trash2 size={16} />
                    </button>
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

export default LeaderDashboard
