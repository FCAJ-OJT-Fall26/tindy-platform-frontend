import { useState, useMemo } from "react"
import { Link, useParams } from "react-router"
import {
  MessageSquare,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Settings,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FolderKanban,
} from "lucide-react"
import { useTindy, Project } from "../../store"
import useMyProjects from "../../hooks/useMyProjects"
import { ProjectWorkspaceView } from "./ProjectWorkspaceView"
import { Chips } from "../../components/ui"
import { Code2 } from "lucide-react"

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
  const leadingList = useMemo(() => {
    const fromApi = myProjectsResource.data?.leading_projects ?? []
    const apiIds = new Set(fromApi.map((p) => p.project_id))

    // Also include from global projects store if leaderId matches
    const fromStore = projects
      .filter(
        (p) =>
          (p.leaderId === authUser?.user_id ||
            p.leader?.toLowerCase() === profile.name?.toLowerCase()) &&
          !apiIds.has(p.id),
      )
      .map((p) => ({
        project_id: p.id,
        name: p.name,
        category: p.type,
        status: p.status || "recruiting",
        current_team_size: p.team || 1,
        max_team_capacity: p.capacity || 5,
        pending_applications_count: 0,
        created_at: new Date(p.created || Date.now()).toISOString(),
        tagline: p.tagline,
        skills: p.skills,
      }))

    return [
      ...fromApi.map((p) => {
        const full = projects.find((fp) => fp.id === p.project_id)
        return {
          ...p,
          category: full?.type || "Software Engineering",
          tagline: full?.tagline,
          skills: full?.skills || [],
        }
      }),
      ...fromStore,
    ]
  }, [myProjectsResource.data?.leading_projects, projects, authUser, profile.name])

  // Projects where user joined as member
  const joinedList = useMemo(() => {
    const fromApi = myProjectsResource.data?.joined_projects ?? []
    return fromApi.map((p) => {
      const full = projects.find((fp) => fp.id === p.project_id)
      return {
        ...p,
        category: full?.type || "Web Application",
        skills: full?.skills || [],
        current_team_size: full?.team || 3,
        max_team_capacity: full?.capacity || 5,
      }
    })
  }, [myProjectsResource.data?.joined_projects, projects])

  const totalTeamsCount = leadingList.length + joinedList.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-1">
            TEAM WORKSPACE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Team workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            All active project teams you are collaborating with and leading.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/create-project"
            className="btn btn-secondary"
          >
            <Plus size={14} />
            <span>Create project</span>
          </Link>
          <Link
            to="/messages"
            className="btn btn-secondary"
          >
            <MessageSquare size={14} />
            <span>Open team chat</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filterTab === "all"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          All teams ({totalTeamsCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("leading")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filterTab === "leading"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Teams you lead ({leadingList.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("member")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            filterTab === "member"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Teams you joined ({joinedList.length})
        </button>
      </div>

      {/* Empty State */}
      {totalTeamsCount === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <FolderKanban size={24} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">No active team projects yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Join an exciting project team from the discovery deck or create your own project to start collaborating.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/discover"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Discover projects
            </Link>
            <Link
              to="/create-project"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Create project
            </Link>
          </div>
        </div>
      )}

      {/* Section 1: Teams you lead */}
      {(filterTab === "all" || filterTab === "leading") && leadingList.length > 0 && (
        <div className="mb-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              TEAMS YOU LEAD
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Leader ({leadingList.length})
            </span>
          </div>

          <div className="project-grid">
            {leadingList.map((proj) => {
              const initials = proj.name ? proj.name.slice(0, 2).toUpperCase() : "PR"
              return (
                <article className="project-card" key={proj.project_id}>
                  <div className="project-card-top">
                    <span className="project-mark indigo">
                      {initials}
                    </span>
                    <div className="card-category">
                      {proj.category || "Software Engineering"}
                      <span className="recruiting">
                        <i />
                        You are Leader
                      </span>
                    </div>
                  </div>

                  <Link className="project-title" to={`/team/${proj.project_id}`}>
                    {proj.name}
                  </Link>
                  <p className="project-description">
                    {proj.tagline || "Active collaborative team workspace."}
                  </p>

                  <Chips items={proj.skills && proj.skills.length > 0 ? proj.skills : ["PostgreSQL", ".NET", "C#"]} />

                  <div className="project-attributes">
                    <span>
                      <Code2 size={14} />
                      Project Leader
                    </span>
                    <span>
                      <Users size={14} />
                      {proj.current_team_size}/{proj.max_team_capacity} members
                    </span>
                  </div>

                  <div className="project-card-bottom" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Link
                      to={`/project/${proj.project_id}/edit`}
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px", gap: "5px" }}
                    >
                      <Settings size={13} />
                      <span>Manage project</span>
                      <ArrowUpRight size={13} />
                    </Link>

                    <Link
                      to={`/team/${proj.project_id}`}
                      className="btn btn-primary"
                      style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}
                    >
                      <span>Open workspace</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 2: Teams you joined as member */}
      {(filterTab === "all" || filterTab === "member") && joinedList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              TEAMS YOU JOINED
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              Member ({joinedList.length})
            </span>
          </div>

          <div className="project-grid">
            {joinedList.map((proj) => {
              const initials = proj.name ? proj.name.slice(0, 2).toUpperCase() : "TM"
              return (
                <article className="project-card" key={proj.project_id}>
                  <div className="project-card-top">
                    <span className="project-mark teal">
                      {initials}
                    </span>
                    <div className="card-category">
                      {proj.category || "Web Application"}
                      <span className="recruiting">
                        <i />
                        {proj.my_role || "Member"}
                      </span>
                    </div>
                  </div>

                  <Link className="project-title" to={`/team/${proj.project_id}`}>
                    {proj.name}
                  </Link>
                  <p className="project-description">
                    Led by <strong>{proj.leader_name}</strong>. Active collaborative team workspace.
                  </p>

                  <Chips items={proj.skills && proj.skills.length > 0 ? proj.skills : ["React", "TypeScript", "Tailwind CSS"]} />

                  <div className="project-attributes">
                    <span>
                      <Code2 size={14} />
                      {proj.my_role || "Team Member"}
                    </span>
                    <span>
                      <Users size={14} />
                      {proj.current_team_size}/{proj.max_team_capacity} members
                    </span>
                  </div>

                  <div className="project-card-bottom" style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginTop: "12px", display: "flex", alignItems: "center", justifyItems: "flex-end", justifyContent: "flex-end" }}>
                    <Link
                      to={`/team/${proj.project_id}`}
                      className="btn btn-primary"
                      style={{ padding: "6px 14px", fontSize: "12px", gap: "6px" }}
                    >
                      <span>Open workspace</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamScreen
