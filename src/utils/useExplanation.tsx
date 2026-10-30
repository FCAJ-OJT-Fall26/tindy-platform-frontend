import { useState } from "react"
import { Link } from "react-router"
import { ArrowRight, Code2, ExternalLink, GraduationCap } from "lucide-react"
import { Button, MatchExplanation, Modal } from "../components/ui"
import type { Profile, Project } from "../data"
import RuleMatchPanel from "../components/discovery/RuleMatchPanel"

export function useExplanation(
  evidence?: Pick<Profile, "skills" | "role" | "hours" | "experience">,
) {
  const [project, setProject] = useState<Project | null>(null)
  const [learning, setLearning] = useState(false)
  return {
    open: setProject,
    element: project && (
      <Modal
        drawer
        className={project.serverMatch ? "rule-match-dialog" : undefined}
        title={learning ? "Learning suggestions" : "Match explanation"}
        onClose={() => {
          setProject(null)
          setLearning(false)
        }}
      >
        {project.serverMatch ? <RuleMatchPanel match={project.serverMatch} projectName={project.name} /> : project.matchAvailable === false ? <p>Matching is available from your personalized Discovery feed.</p> : learning ? (
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
