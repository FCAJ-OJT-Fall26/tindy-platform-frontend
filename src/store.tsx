import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import {
  initialProjects,
  initialCandidates,
  type Profile,
  type Project,
} from "./data"

export {
  initialProjects,
  initialCandidates,
  type Profile,
  type Project,
}
import type { AuthUser } from "./types/auth"
import { ApiError, getStoredToken, clearStoredToken, SESSION_EXPIRED_EVENT, ONBOARDING_REQUIRED_EVENT } from "./services/apiClient"
import { getMeApi, logoutApi } from "./services/auth.service"
import { clearLinkUser } from "./services/oauth.service"
import { authErrorMessage } from "./services/authValidation"
import { getMyProfile, patchMyProfile } from "./services/profile.service"
import type { MyProfileResponse, ProfilePatch } from "./types/profile"
import useRemoteResource from "./hooks/useRemoteResource"
import { getProjectsApi, mapProjectSummaryToUiProject } from "./services/projects.service"
import { getAllSavedProjects, setDiscoveryFlag } from "./services/discovery.service"
import { projectErrorMessage } from "./services/projectEditor.service"
import useNotificationState from "./hooks/useNotificationState"

const loadProjectCatalog = (signal: AbortSignal) => getProjectsApi({ page_size: 50 }, signal)

const emptySessionProfile: Profile = { name: 'Tindy member', university: '', email: '', role: '',
  hours: '', interests: '', skills: [], experience: '', github: '', portfolio: '', goals: '',
  technologies: '', summary: '' }

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      localStorage.removeItem(`tindy-v2-${key}`)
      const stored = localStorage.getItem(`tindy-v3-${key}`)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })
  const update = useCallback((next: T | ((old: T) => T)) =>
    setValue((old) => {
      const updater = next as (previous: T) => T
      const result = typeof next === "function" ? updater(old) : next
      try {
        localStorage.setItem(`tindy-v3-${key}`, JSON.stringify(result))
      } catch {}
      return result
    }), [key])
  return [value, update] as const
}

function useAppState() {
  // Onboarding can mirror its saved steps in memory. Completed profiles come only from the API.
  const [profile, setProfile] = useState<Profile>(emptySessionProfile)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState<boolean>(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const notifications = useNotificationState(authUser, !authLoading && !loggingOut)
  const logoutRequest = useRef<Promise<void> | null>(null)
  const sessionGeneration = useRef(0)
  const profileOwner = useRef<string | null>(null)
  const profileKey = authUser?.is_onboarding_completed ? `${authUser.user_id}:${getStoredToken()}` : null
  const ownerProfile = useRemoteResource(profileKey, getMyProfile)
  const saveOwnerProfile = async (patch: ProfilePatch) => {
    const token = getStoredToken()
    const generation = sessionGeneration.current
    const confirms = (value: MyProfileResponse) =>
      value.user_id === authUser?.user_id &&
      Object.entries(patch).every(([field, expected]) => {
        const actual =
          field === "preferred_role_id"
            ? value.preferred_role?.professional_role_id
            : field === "skill_ids"
              ? value.skills.map((s) => s.skill_id)
              : value[field as keyof MyProfileResponse]

        return Array.isArray(expected) && Array.isArray(actual)
          ? [...expected].sort().join(",") === [...actual].sort().join(",")
          : actual === expected
      })

    let updated: MyProfileResponse

    try {
      updated = await patchMyProfile(patch)
      if (patch.open_to_team_invitations !== undefined && !confirms(updated))
        throw Error("Invitation consent could not be confirmed.")
    } catch (reason) {
      if (
        patch.open_to_team_invitations === undefined ||
        (reason instanceof ApiError &&
          reason.status >= 400 &&
          reason.status < 500)
      )
        throw reason

      // PATCH may have committed before a response was lost. Read; never repeat consent automatically.

      updated = await getMyProfile()

      if (!confirms(updated))
        throw Error(
          "The profile update is unconfirmed. Reload your profile before trying again.",
        )
    }

    if (generation !== sessionGeneration.current || token !== getStoredToken())
      throw Error("The account session changed.")

    ownerProfile.replace(updated)
  }

  // API Projects are memory-only and scoped to the signed-in account.
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsRequested, setProjectsRequested] = useState(false)
  const requestProjects = useCallback(() => setProjectsRequested(true), [])
  const projectCatalog = useRemoteResource(projectsRequested && authUser?.is_onboarding_completed ? authUser.user_id : null, loadProjectCatalog)
  useEffect(() => { setProjects([]) }, [authUser?.user_id])
  useEffect(() => {
    if (projectCatalog.data) setProjects(projectCatalog.data.items.map(dto => mapProjectSummaryToUiProject(dto)))
  }, [projectCatalog.data])
  const savedProjects = useRemoteResource(authUser?.is_onboarding_completed ? authUser.user_id : null, getAllSavedProjects)
  const [savedOverrides, setSavedOverrides] = useState<{ owner: string; flags: Record<string, boolean> }>({ owner: "", flags: {} })
  const confirmedFlags = savedOverrides.owner === authUser?.user_id ? savedOverrides.flags : {}
  const saved = [...new Set([...(savedProjects.data?.map(p => p.project_id) ?? []), ...Object.keys(confirmedFlags)])]
    .filter(id => confirmedFlags[id] ?? Boolean(savedProjects.data?.some(p => p.project_id === id)))
  const saveRequests = useRef(new Map<string, { value: boolean; promise: Promise<void> }>())
  const isProjectSaved = useCallback((id: string, initialIsSaved?: boolean): boolean => {
    if (confirmedFlags[id] !== undefined) return confirmedFlags[id]
    if (savedProjects.data) return savedProjects.data.some(p => p.project_id === id)
    return initialIsSaved ?? saved.includes(id)
  }, [confirmedFlags, savedProjects.data, saved])
  useEffect(() => {
    if (!savedProjects.data || !authUser) return
    const ids = new Set(savedProjects.data.map(p => p.project_id))
    setSavedOverrides(old => old.owner === authUser.user_id ? { owner: old.owner, flags: Object.fromEntries(Object.entries(old.flags).filter(([id, flag]) => ids.has(id) !== flag)) } : old)
  }, [savedProjects.data, authUser?.user_id])
  const [interested, setInterested] = useStored<string[]>("interested", [])
  const [skipped, setSkipped] = useStored<string[]>("skipped", [])
  const [active, setActive] = useStored<string[]>("active", [])
  const [invited, setInvited] = useStored<string[]>("invited", [])
  const [completed] = useStored<string[]>("completed", [])
  const [mode, setMode] = useStored<string>("mode", "User")
  const [dismissed, setDismissed] = useStored<string[]>("dismissed", [])
  const [candidateInvites, setCandidateInvites] = useStored<string[]>(
    "candidate-invites",
    [],
  )
  const [candidateShortlisted, setCandidateShortlisted] = useStored<string[]>(
    "candidate-shortlisted",
    [],
  )
  const [candidateInterested, setCandidateInterested] = useStored<string[]>(
    "candidate-interested",
    [],
  )
  const [candidateActive, setCandidateActive] = useStored<string[]>(
    "candidate-active",
    [],
  )
  const [toast, setToast] = useState("")
  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(
      () => setToast((current) => (current === message ? "" : current)),
      3500,
    )
  }

  // Khôi phục phiên làm việc (GET /api/me) khi ứng dụng khởi chạy
  useEffect(() => {
    let active = true
    const generation = sessionGeneration.current
    const controller = new AbortController()
    const token = getStoredToken()
    if (!token) {
      setAuthLoading(false)
      return
    }

    getMeApi(controller.signal)
      .then((user) => {
        if (!active || sessionGeneration.current !== generation || getStoredToken() !== token) return
        setAuthUser(user)
      })
      .catch((error: unknown) => {
        if (!active || sessionGeneration.current !== generation || getStoredToken() !== token) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) clearStoredToken()
        setSessionError(authErrorMessage(error))
        setAuthUser(null)
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })
    return () => { active = false; controller.abort() }
  }, [])

  // Null OAuth metadata must never fall back to a previous account's profile.
  useEffect(() => {
    if (!authUser) return
    setSessionError('')
    const sameOwner = profileOwner.current === authUser.user_id
    profileOwner.current = authUser.user_id
    setProfile(prev => ({ ...(sameOwner ? prev : emptySessionProfile),
      name: authUser.display_name, email: authUser.email ?? "", university: authUser.university ?? "" }))
  }, [authUser, setProfile])

  const resetSession = useCallback(() => {
    sessionGeneration.current += 1
    clearStoredToken()
    clearLinkUser()
    profileOwner.current = null
    setProfile(emptySessionProfile)
    setToast('')
    setAuthUser(null)
    setProjectsRequested(false)
    setAuthLoading(false)
    setSessionError('')
  }, [setProfile])

  useEffect(() => {
    const expired = () => { resetSession(); setSessionError('Your session has expired or is unavailable. Please sign in again.') }
    const onboardingRequired = () => setAuthUser(user => user ? { ...user, is_onboarding_completed: false } : null)
    const storageChanged = (event: StorageEvent) => {
      // A different tab changing accounts must not retain this tab's old identity.
      if (event.key === "tindy_access_token" || event.key === null) window.location.reload()
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expired)
    window.addEventListener(ONBOARDING_REQUIRED_EVENT, onboardingRequired)
    window.addEventListener("storage", storageChanged)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired)
      window.removeEventListener(ONBOARDING_REQUIRED_EVENT, onboardingRequired)
      window.removeEventListener("storage", storageChanged)
    }
  }, [resetSession])

  const logout = useCallback(() => {
    if (logoutRequest.current) return logoutRequest.current
    sessionGeneration.current += 1
    setLoggingOut(true)
    const request = (async () => {
      try { await logoutApi() } catch { /* Local cleanup is required even when the API fails. */ }
      finally {
        resetSession()
        setLoggingOut(false)
        logoutRequest.current = null
      }
    })()
    logoutRequest.current = request
    return request
  }, [resetSession])

  const setProjectSaved = (id: string, value: boolean): Promise<void> => {
    const owner = authUser?.user_id
    if (!owner) return Promise.reject(new Error("Sign in to save projects."))
    const key = `${owner}:${id}`
    const pending = saveRequests.current.get(key)
    if (pending) return pending.value === value ? pending.promise : Promise.reject(new Error("A save change is still in progress. Try again when it finishes."))
    const generation = sessionGeneration.current
    const token = getStoredToken()
    const operation = (async () => {
      try {
        await setDiscoveryFlag(id, "saved", value)
        if (generation !== sessionGeneration.current || getStoredToken() !== token) return
        setSavedOverrides(old => ({ owner, flags: { ...(old.owner === owner ? old.flags : {}), [id]: value } }))
        savedProjects.reload()
      } catch (error) { if (generation === sessionGeneration.current && getStoredToken() === token) notify(projectErrorMessage(error)); throw error }
      finally { saveRequests.current.delete(key) }
    })()
    saveRequests.current.set(key, { value, promise: operation })
    return operation
  }
  const toggleSave = (id: string) => setProjectSaved(id, !saved.includes(id))
  const toggleShortlistCandidate = (name: string) =>
    setCandidateShortlisted((old) =>
      old.includes(name) ? old.filter((item) => item !== name) : [...old, name],
    )
  return {
    profile: authUser ? ownerProfile.data ? {
      name: ownerProfile.data.display_name,
      university: ownerProfile.data.university ?? '',
      email: authUser.email ?? '',
      role: ownerProfile.data.preferred_role?.name ?? '',
      hours: String(ownerProfile.data.available_hours_per_week ?? ''),
      interests: ownerProfile.data.professional_interests ?? '',
      skills: ownerProfile.data.skills.map(skill => skill.name),
      experience: ownerProfile.data.previous_projects_and_contribution ?? '',
      github: ownerProfile.data.github_url ?? '',
      portfolio: ownerProfile.data.personal_website_url ?? '',
      goals: ownerProfile.data.learning_goals ?? '',
      technologies: ownerProfile.data.technologies_to_learn ?? '',
      summary: ownerProfile.data.bio ?? '',
    } : { ...(!authUser.is_onboarding_completed && profileOwner.current === authUser.user_id ? profile : emptySessionProfile),
      name: authUser.display_name, email: authUser.email ?? '', university: authUser.university ?? '' }
      : emptySessionProfile,
    ownerProfile,
    saveOwnerProfile,
    setProfile,
    authUser,
    setAuthUser,
    authLoading,
    logout,
    loggingOut,
    sessionError,
    projects,
    setProjects,
    projectsLoading: projectCatalog.loading,
    projectsError: projectCatalog.error,
    reloadProjects: projectCatalog.reload,
    requestProjects,
    saved,
    savedProjects,
    isProjectSaved,
    setProjectSaved,
    toggleSave,
    interested,
    setInterested,
    skipped,
    setSkipped,
    active,
    setActive,
    invited,
    setInvited,
    completed,
    mode,
    setMode,
    notifications,
    dismissed,
    setDismissed,
    candidateInvites,
    setCandidateInvites,
    candidateShortlisted,
    setCandidateShortlisted,
    candidateInterested,
    setCandidateInterested,
    candidateActive,
    setCandidateActive,
    toggleShortlistCandidate,
    toast,
    notify,
  }
}

type AppState = ReturnType<typeof useAppState>

const Context =
  ((globalThis as unknown as { __TINDY_CONTEXT__?: React.Context<AppState | null> }).__TINDY_CONTEXT__ ??=
  createContext<AppState | null>(null))

export function TindyProvider({ children }: { children: ReactNode }) {
  const state = useAppState()
  ;(globalThis as unknown as { __TINDY_LAST_STATE__?: AppState }).__TINDY_LAST_STATE__ = state
  return <Context.Provider value={state}>{children}</Context.Provider>
}

export function useTindy() {
  const state =
    useContext(Context) ??
    (globalThis as unknown as { __TINDY_LAST_STATE__?: AppState }).__TINDY_LAST_STATE__
  if (!state) throw new Error("Tindy provider is missing")
  return state
}
