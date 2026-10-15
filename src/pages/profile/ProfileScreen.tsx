import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  ExternalLink,
  GraduationCap,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Chips,
  Modal,
  PageHeader,
} from "../../components/ui"
import type { Profile } from "../../data"
import { useTindy } from "../../store"
import SkillSelector from "../../components/onboarding/SkillSelector"
import type { SelectedSkill } from "../../types/catalog"

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

export default function ProfileScreen() {
  const { profile, setProfile, notify } = useTindy()
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>(() =>
    profile.skills.map((name) => ({ skill_id: name, name })),
  )
  const [skillsValid, setSkillsValid] = useState(true)
  const [file, setFile] = useState("AWS Cloud Practitioner.pdf")
  const [photo, setPhoto] = useState("")
  const [experience, setExperience] = useState(false)
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
                setSelectedSkills(
                  profile.skills.map((name) => ({ skill_id: name, name })),
                )
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
            const finalSkills = selectedSkills
              .map((s) => s.name || s.skill_id)
              .filter(Boolean) as string[]
            setProfile({ ...draft, skills: finalSkills })
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
          <div className="profile-skill-section">
            <h3>Technical skills</h3>
            <p className="muted" style={{ marginBottom: "12px", fontSize: "11px" }}>
              Choose 1–30 skills from the standard catalog to improve team and project recommendations.
            </p>
            <SkillSelector
              selected={selectedSkills}
              onChange={setSelectedSkills}
              onValidityChange={setSkillsValid}
            />
          </div>
          <Button disabled={!skillsValid || selectedSkills.length === 0} style={{ marginTop: "24px" }}>
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
export { ProfileScreen }
