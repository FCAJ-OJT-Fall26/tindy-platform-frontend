import { GitBranch, ExternalLink } from "lucide-react"
import { safeProjectGithubUrl } from "../../services/projectGithub"

export default function ProjectGithubLink({ url }: { url?: string | null }) {
  const href = safeProjectGithubUrl(url)
  if (!href) return null
  return <a className="project-github-link" href={href} target="_blank" rel="noopener noreferrer">
    <GitBranch size={18} aria-hidden="true" />
    <span><strong>View GitHub repository</strong><small>{href.replace(/^https:\/\//i, "")}</small></span>
    <ExternalLink size={15} aria-hidden="true" />
  </a>
}
