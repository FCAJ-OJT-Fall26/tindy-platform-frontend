import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
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
import { getStoredToken, clearStoredToken } from "./services/apiClient"
import { getMeApi, logoutApi } from "./services/auth.service"

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`tindy-v2-${key}`)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })
  const update = (next: T | ((old: T) => T)) =>
    setValue((old) => {
      const updater = next as (previous: T) => T
      const result = typeof next === "function" ? updater(old) : next
      try {
        localStorage.setItem(`tindy-v2-${key}`, JSON.stringify(result))
      } catch {}
      return result
    })
  return [value, update] as const
}

function useAppState() {
  const [profile, setProfile] = useStored<Profile>("profile", initialProfile)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState<boolean>(true)

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
    const token = getStoredToken()
    if (!token) {
      setAuthLoading(false)
      return
    }

    getMeApi()
      .then((user) => {
        setAuthUser(user)
        if (user) {
          setProfile((prev) => ({
            ...prev,
            name: user.display_name || prev.name,
            email: user.email || prev.email,
            university: user.university || prev.university,
          }))
        }
      })
      .catch(() => {
        setAuthUser(null)
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [])

  const logout = async () => {
    try {
      await logoutApi()
    } catch {
      clearStoredToken()
    } finally {
      setAuthUser(null)
    }
  }

  const toggleSave = (id: string) =>
    setSaved((old) =>
      old.includes(id) ? old.filter((item) => item !== id) : [...old, id],
    )
  const toggleShortlistCandidate = (name: string) =>
    setCandidateShortlisted((old) =>
      old.includes(name) ? old.filter((item) => item !== name) : [...old, name],
    )
  return {
    profile,
    setProfile,
    authUser,
    setAuthUser,
    authLoading,
    logout,
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
