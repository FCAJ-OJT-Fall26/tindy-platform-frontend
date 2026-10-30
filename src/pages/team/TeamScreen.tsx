import { useState, useMemo } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import useMyProjects from "../../hooks/useMyProjects"
import { PageHeader, EmptyState, Chips } from "../../components/ui"
import { ProjectWorkspaceView } from "./ProjectWorkspaceView"

interface TeamProjectItem {
  project_id: string
  name: string
  category: string
  status: string
  current_team_size: number
  max_team_capacity: number
  tagline?: string
  skills?: string[]
  isLeader: boolean
  my_role?: string
  leader_name?: string
}

export function TeamScreen() {
  const { projectId } = useParams<{ projectId?: string }>()
  const { authUser, profile, projects } = useTindy()
  const myProjectsResource = useMyProjects()

  // Tab filter: all | leading | member
  const [filterTab, setFilterTab] = useState<"all" | "leading" | "member">("all")

  // If a specific projectId is requested in route, render the Project Workspace directly
  if (projectId) {
    return <ProjectWorkspaceView projectId={projectId} />
  }

  // Projects where user is leader
  const leadingList = useMemo<TeamProjectItem[]>(() => {
    const fromApi = myProjectsResource.data?.leading_projects ?? []
    const apiIds = new Set(fromApi.map((p) => p.project_id))

    const fromStore = projects
      .filter(
        (p) =>
          (p.leaderId === authUser?.user_id ||
            (profile.name && p.leader?.trim().toLowerCase() === profile.name.trim().toLowerCase())) &&
          !apiIds.has(p.id),
      )
      .map((p) => ({
        project_id: p.id,
        name: p.name,
        category: p.type || "Software Engineering",
        status: p.status || "recruiting",
        current_team_size: p.team || 1,
        max_team_capacity: p.capacity || 5,
        tagline: p.tagline,
        skills: p.skills || [],
        isLeader: true,
        my_role: "Project Leader",
      }))

    const mappedApi = fromApi.map((p) => {
      const full = projects.find((fp) => fp.id === p.project_id)
      return {
        project_id: p.project_id,
        name: p.name,
        category: full?.type || "Software Engineering",
        status: p.status || "recruiting",
        current_team_size: p.current_team_size || 1,
        max_team_capacity: p.max_team_capacity || 5,
        tagline: full?.tagline,
        skills: full?.skills || [],
        isLeader: true,
        my_role: "Project Leader",
      }
    })

    return [...mappedApi, ...fromStore]
  }, [myProjectsResource.data?.leading_projects, projects, authUser, profile.name])

  // Projects where user joined as member
  const joinedList = useMemo<TeamProjectItem[]>(() => {
    const fromApi = myProjectsResource.data?.joined_projects ?? []
    return fromApi.map((p) => {
      const full = projects.find((fp) => fp.id === p.project_id)
      return {
        project_id: p.project_id,
        name: p.name,
        category: full?.type || "Web Application",
        status: p.status || "active",
        current_team_size: full?.team || 3,
        max_team_capacity: full?.capacity || 5,
        tagline: full?.tagline,
        skills: full?.skills || [],
        isLeader: false,
        my_role: p.my_role || "Team Member",
        leader_name: p.leader_name,
      }
    })
  }, [myProjectsResource.data?.joined_projects, projects])

  const totalTeamsCount = leadingList.length + joinedList.length

  const displayProjects = useMemo(() => {
    if (filterTab === "leading") return leadingList
    if (filterTab === "member") return joinedList
    return [...leadingList, ...joinedList]
  }, [filterTab, leadingList, joinedList])

  return (
    <>
      <PageHeader
        title="Team workspace"
        description="All active project teams you are collaborating with and leading."
        action={
          <Link to="/create-project" className="btn btn-secondary">
            <Plus size={15} /> Create project
          </Link>
        }
      />

      <div className="status-tabs">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={filterTab === "all" ? "active" : ""}
        >
          All teams <span>{totalTeamsCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("leading")}
          className={filterTab === "leading" ? "active" : ""}
        >
          Teams you lead <span>{leadingList.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("member")}
          className={filterTab === "member" ? "active" : ""}
        >
          Teams you joined <span>{joinedList.length}</span>
        </button>
      </div>

      {displayProjects.length === 0 ? (
        <EmptyState
          title="No active team projects yet."
          description="Explore projects matching your skills on the Discovery feed or create your own project to start collaborating."
          action={
            <Link to="/discover" className="btn btn-primary">
              Discover projects <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="project-grid">
          {displayProjects.map((proj) => {
            const initials = proj.name ? proj.name.slice(0, 2).toUpperCase() : "PR"
            return (
              <article className="project-card" key={proj.project_id}>
                <div className="project-card-top">
                  <span className={`project-mark ${proj.isLeader ? "indigo" : "teal"}`}>
                    {initials}
                  </span>
                  <div className="card-category">
                    {proj.category}
                    <span className="recruiting">
                      <i />
                      {proj.isLeader ? "Project Leader" : "Team Member"}
                    </span>
                  </div>
                </div>

                <Link className="project-title" to={`/team/${proj.project_id}`}>
                  {proj.name}
                </Link>
                <p className="project-description">
                  {proj.tagline || (proj.leader_name ? `Led by ${proj.leader_name}. Active team space.` : "Active collaborative team workspace.")}
                </p>

                <Chips items={proj.skills && proj.skills.length > 0 ? proj.skills : ["PostgreSQL", ".NET", "C#"]} />

                <div className="project-attributes">
                  <span>
                    <Code2 size={14} />
                    {proj.isLeader ? "Project Leader" : proj.my_role}
                  </span>
                  <span>
                    <Users size={14} />
                    {proj.current_team_size}/{proj.max_team_capacity} members
                  </span>
                </div>

                <div className="project-card-bottom" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="team-preview">
                    <small>
                      {proj.current_team_size}/{proj.max_team_capacity} members
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                    {proj.isLeader && (
                      <Link
                        to={`/project/${proj.project_id}/edit`}
                        className="btn btn-secondary"
                        style={{ padding: "5px 11px", fontSize: "11.5px", gap: "5px" }}
                      >
                        <Settings size={13} />
                        <span>Manage</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                    <Link
                      to={`/team/${proj.project_id}`}
                      className="btn btn-primary"
                      style={{ padding: "5px 13px", fontSize: "11.5px", gap: "5px" }}
                    >
                      <span>Open workspace</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

export default TeamScreen
