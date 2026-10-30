import { useState } from "react"
import { Link } from "react-router"
import { MessageSquare, Plus, ArrowRight, Send } from "lucide-react"
import { useTindy } from "../../store"
import {
  PageHeader,
  SectionHeading,
  Button,
  Avatar,
  Badge,
  Modal,
} from "../../components/ui"

export function TeamScreen() {
  const { notify } = useTindy()
  const [announcement, setAnnouncement] = useState("")
  const [posts, setPosts] = useState<string[]>([])
  const [invite, setInvite] = useState(false)
  const [team, setTeam] = useState<string[]>([])

  return (
    <>
      <PageHeader
        eyebrow="TEAM WORKSPACE"
        title="Team workspace"
        description="A shared space for your active project team."
        action={
          <Link
            className="btn btn-primary"
            to="/messages"
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
          {team.length === 0 ? <p>No active team members yet.</p> : team.map((person, index) => (
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
          {posts.length === 0 && <p>No announcements yet.</p>}
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
              notify("Invitation sent")
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

export default TeamScreen
