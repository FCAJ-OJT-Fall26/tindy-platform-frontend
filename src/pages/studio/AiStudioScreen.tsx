import { useState } from "react"
import {
  Check,
  FileText,
  Plus,
  ShieldCheck,
  Bot,
  Upload,
} from "lucide-react"
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
} from "../../components/ui"
import { useTindy } from "../../store"

export function AiStudioScreen() {
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
    notify("Summary generated · Review and edit before accepting")
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
              <Bot size={16} />
              Generate profile
            </Button>
          </section>
          <section className="panel generated-panel">
            <Badge tone="blue">
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
              Extract skills
            </Button>
          </section>
          <section className="panel">
            {detected ? (
              <>
                <Badge tone="blue">DETECTION RESULTS</Badge>
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
export { AiStudioScreen as AIStudio }
export default AiStudioScreen
