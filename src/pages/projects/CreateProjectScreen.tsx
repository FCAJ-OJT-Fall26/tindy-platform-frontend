import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router"
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  FileText,
  Check,
  Info,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import { PageHeader, Button } from "../../components/ui"

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

export default CreateProject
