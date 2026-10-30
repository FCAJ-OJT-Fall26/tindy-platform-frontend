import { ArrowRight } from "lucide-react"
import { initialProjects } from "../../store"
import {
  PageHeader,
  Badge,
  Button,
  Chips,
  Avatar,
  Score,
  Skeleton,
  EmptyState,
} from "../../components/ui"

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

export default ComponentLibrary
