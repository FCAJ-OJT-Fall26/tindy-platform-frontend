import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import {
  initialProfile,
  initialProjects,
  initialCandidates,
  type Profile,
  type Project,
} from "./data"

export {
  initialProfile,
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

const emptySessionProfile: Profile = { name: 'Tindy member', university: '', email: '', role: '',
  hours: '', interests: '', skills: [], experience: '', github: '', portfolio: '', goals: '',
  technologies: '', summary: '' }

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`tindy-v2-${key}`)
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
        localStorage.setItem(`tindy-v2-${key}`, JSON.stringify(result))
      } catch {}
      return result
    }), [key])
  return [value, update] as const
}

function useAppState() {
  const [profile, setProfile] = useStored<Profile>("profile", initialProfile)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState<boolean>(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const logoutRequest = useRef<Promise<void> | null>(null)
  const sessionGeneration = useRef(0)
  const profileOwner = useRef<string | null>((() => {
    try { return localStorage.getItem("tindy-v2-profile-owner") } catch { return null }
  })())

  const [projects, setProjects] = useStored<Project[]>(
    "projects",
    initialProjects,
  )
  const [saved, setSaved] = useStored<string[]>("saved", [
    "campus-cloud",
    "openfolio",
  ])
  const [interested, setInterested] = useStored<string[]>("interested", [
    "studywise",
  ])
  const [skipped, setSkipped] = useStored<string[]>("skipped", [])
  const [active, setActive] = useStored<string[]>("active", ["ecotrack"])
  const [invited, setInvited] = useStored<string[]>("invited", ["cloud-desk"])
  const [completed] = useStored<string[]>("completed", [])
  const [mode, setMode] = useStored<string>("mode", "User")
  const [read, setRead] = useStored<number[]>("read", [])
  const [dismissed, setDismissed] = useStored<string[]>("dismissed", [])
  const [candidateInvites, setCandidateInvites] = useStored<string[]>(
    "candidate-invites",
    ["Minh Nguyen"],
  )
  const [candidateShortlisted, setCandidateShortlisted] = useStored<string[]>(
    "candidate-shortlisted",
    ["Cao Thanh Nhan", "Linh Tran"],
  )
  const [candidateInterested, setCandidateInterested] = useStored<string[]>(
    "candidate-interested",
    ["Cao Thanh Nhan", "David Pham", "An Hoang"],
  )
  const [candidateActive, setCandidateActive] = useStored<string[]>(
    "candidate-active",
    ["Jamie Le"],
  )
  const [candidateArchived, setCandidateArchived] = useStored<string[]>(
    "candidate-archived",
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
    try { localStorage.setItem("tindy-v2-profile-owner", authUser.user_id) } catch {}
    setProfile(prev => ({ ...(sameOwner ? prev : emptySessionProfile),
      name: authUser.display_name, email: authUser.email ?? "", university: authUser.university ?? "" }))
  }, [authUser, setProfile])

  const resetSession = useCallback(() => {
    sessionGeneration.current += 1
    clearStoredToken()
    clearLinkUser()
    profileOwner.current = null
    try { localStorage.removeItem("tindy-v2-profile-owner") } catch {}
    setProfile(emptySessionProfile)
    setToast('')
    setAuthUser(null)
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

  const toggleSave = (id: string) =>
    setSaved((old) =>
      old.includes(id) ? old.filter((item) => item !== id) : [...old, id],
    )
  const toggleShortlistCandidate = (name: string) =>
    setCandidateShortlisted((old) =>
      old.includes(name) ? old.filter((item) => item !== name) : [...old, name],
    )
  return {
    profile: authUser ? { ...(profileOwner.current === authUser.user_id ? profile : emptySessionProfile),
      name: authUser.display_name, email: authUser.email ?? '', university: authUser.university ?? '' } : emptySessionProfile,
    setProfile,
    authUser,
    setAuthUser,
    authLoading,
    logout,
    loggingOut,
    sessionError,
    projects,
    setProjects,
    saved,
    setSaved,
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
    read,
    setRead,
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
    candidateArchived,
    setCandidateArchived,
    toggleShortlistCandidate,
    toast,
    notify,
  }
}

type AppState = ReturnType<typeof useAppState>
const Context = createContext<AppState | null>(null)

export function TindyProvider({ children }: { children: ReactNode }) {
  const state = useAppState()
  return <Context.Provider value={state}>{children}</Context.Provider>
}

export function useTindy() {
  const state = useContext(Context)
  if (!state) throw new Error("Tindy provider is missing")
  return state
}
