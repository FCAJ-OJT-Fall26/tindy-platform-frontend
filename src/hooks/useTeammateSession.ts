import { useEffect, useState } from "react"
import { useTindy } from "../store"
import { SESSION_CHANGED_EVENT } from "../services/apiClient"

export default function useTeammateSession() {
  const { authUser } = useTindy()
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const changed = () => setRevision((v) => v + 1)
    window.addEventListener(SESSION_CHANGED_EVENT, changed)
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, changed)
  }, [])
  const userId = authUser?.is_onboarding_completed ? authUser.user_id : null
  return { userId, key: userId ? `${userId}:${revision}` : null }
}
