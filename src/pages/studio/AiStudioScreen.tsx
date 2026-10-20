import { Link } from "react-router"
import { FileText, Sparkles } from "lucide-react"
import { PageHeader } from "../../components/ui"

export function AiStudioScreen() {
  return (
    <>
      <PageHeader
        eyebrow="YOUR STORY, YOUR WORDS"
        title="AI Studio"
        description="Build a profile that reflects your experience and what you want to learn."
      />
      <section className="panel profile-studio-placeholder">
        <Sparkles size={28} />
        <h2>Profile tools are taking shape</h2>
        <p>
          AI summaries and skill extraction are not available yet. You can write
          your introduction, choose catalog skills, and manage your experience
          and certificates in your profile.
        </p>
        <Link className="btn btn-primary" to="/profile">
          <FileText size={16} />
          Manage your profile
        </Link>
      </section>
    </>
  )
}

export const AIStudio = AiStudioScreen
export default AiStudioScreen
