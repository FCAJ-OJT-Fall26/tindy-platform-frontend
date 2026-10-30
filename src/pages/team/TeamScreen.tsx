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
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus size={14} />
            <span>Create project</span>
          </Link>
          <Link
            to="/messages"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
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
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>👑 Teams you lead</span>
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Project Leader ({leadingList.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leadingList.map((proj) => (
              <div
                key={proj.project_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {proj.category || "AI & Machine Learning"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      You are Leader
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {proj.name}
                  </h3>
                  {proj.tagline && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{proj.tagline}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Users size={13} />
                      <strong>{proj.current_team_size}</strong> / {proj.max_team_capacity} members
                    </span>
                    {proj.pending_applications_count > 0 && (
                      <span className="text-blue-600 font-semibold">
                        {proj.pending_applications_count} pending applications
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Manage Project + Open Workspace */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Link
                    to={`/project/${proj.project_id}/edit`}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <Settings size={13} />
                    <span>Manage project</span>
                    <ArrowUpRight size={13} />
                  </Link>

                  <Link
                    to={`/team/${proj.project_id}`}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Open workspace</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Teams you joined as member */}
      {(filterTab === "all" || filterTab === "member") && joinedList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🤝 Teams you joined</span>
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Team Member ({joinedList.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinedList.map((proj) => (
              <div
                key={proj.project_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {proj.category || "Web Application"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Role: {proj.my_role || "Member"}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {proj.name}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    <span>
                      Led by <strong>{proj.leader_name}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Users size={13} />
                      {proj.current_team_size} members
                    </span>
                  </div>
                </div>

                {/* Actions: Open Workspace */}
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <Link
                    to={`/team/${proj.project_id}`}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Open workspace</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamScreen
