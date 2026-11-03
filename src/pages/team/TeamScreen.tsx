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
import "./team-screen.css"

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
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>()
  const effectiveProjectId = projectId || id
  const { authUser, profile, projects } = useTindy()
  const myProjectsResource = useMyProjects()

  // Tab filter: all | leading | member
  const [filterTab, setFilterTab] = useState<"all" | "leading" | "member">("all")

  // If a specific projectId is requested in route, render the Project Workspace directly
  if (effectiveProjectId) {
    return <ProjectWorkspaceView projectId={effectiveProjectId} />
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
    <div className="team-workspace-page">
      <PageHeader
        title="Team workspace"
        description="All active project teams you are collaborating with and leading."
        action={
          <Link to="/create-project" className="btn btn-secondary team-workspace-btn">
            <Plus size={15} /> <span>Create project</span>
          </Link>
        }
      />

      <div className="status-tabs" role="tablist" aria-label="Team workspace filters">
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === "all"}
          onClick={() => setFilterTab("all")}
          className={filterTab === "all" ? "active" : ""}
        >
          All teams <span>{totalTeamsCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === "leading"}
          onClick={() => setFilterTab("leading")}
          className={filterTab === "leading" ? "active" : ""}
        >
          Teams you lead <span>{leadingList.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterTab === "member"}
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
            <Link to="/discover" className="btn btn-primary team-workspace-btn">
              <span>Discover projects</span> <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="team-workspace-grid">
          {displayProjects.map((proj) => {
            const initials = proj.name ? proj.name.slice(0, 2).toUpperCase() : "PR"
            return (
              <article className="team-workspace-card" key={proj.project_id}>
                <div className="team-workspace-card-top">
                  <span className={`project-mark ${proj.isLeader ? "indigo" : "teal"}`}>
                    {initials}
                  </span>
                  <div className="team-workspace-card-category">
                    <span>{proj.category}</span>
                    <span className="team-workspace-role-pill">
                      <i />
                      {proj.isLeader ? "Project Leader" : "Team Member"}
                    </span>
                  </div>
                </div>

                <Link className="team-workspace-card-title" to={`/team/${proj.project_id}`}>
                  {proj.name}
                </Link>
                <p className="team-workspace-card-desc">
                  {proj.tagline || (proj.leader_name ? `Led by ${proj.leader_name}. Active team space.` : "Active collaborative team workspace.")}
                </p>

                <Chips items={proj.skills && proj.skills.length > 0 ? proj.skills : ["PostgreSQL", ".NET", "C#"]} />

                <div className="team-workspace-attributes">
                  <span>
                    <Code2 size={14} />
                    {proj.isLeader ? "Project Leader" : proj.my_role}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {proj.status === "active" ? "In progress" : "Recruiting"}
                  </span>
                </div>

                <div className="team-workspace-card-footer">
                  <div className="team-workspace-members-preview">
                    <Users size={13} />
                    <span>
                      {proj.current_team_size}/{proj.max_team_capacity} members
                    </span>
                  </div>
                  <div className={`team-workspace-card-actions ${!proj.isLeader ? "is-single" : ""}`}>
                    {proj.isLeader && (
                      <Link
                        to={`/project/${proj.project_id}/edit`}
                        className="btn btn-secondary team-workspace-btn"
                        title="Manage project settings and recruitment"
                      >
                        <Settings size={13} />
                        <span>Manage</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                    <Link
                      to={`/team/${proj.project_id}`}
                      className="btn btn-primary team-workspace-btn"
                      title="Open team workspace and goals"
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
    </div>
  )
}

export default TeamScreen
