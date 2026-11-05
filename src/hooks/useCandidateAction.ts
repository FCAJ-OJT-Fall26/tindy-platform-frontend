import { useEffect, useRef, useState } from "react"
import { ApiError } from "../services/apiClient"
import {
  getCandidateInteractions,
  resetCandidateInteraction,
  sameId,
  setCandidateInteraction,
  teammateErrorMessage,
} from "../services/teammates.service"
import type { CandidateAction } from "../types/teammate"

export default function useCandidateAction(
  key: string | null,
  project: string,
  position: string,
) {
  const scope = useRef(key)
  scope.current = key
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [uncertain, setUncertain] = useState<{
    user: string
    action: CandidateAction | null
  } | null>(null)
  useEffect(() => {
    scope.current = key
    lock.current = false
    setBusy(false)
    setError("")
    setUncertain(null)
    return () => { scope.current = null }
  }, [key])
  const readCurrent = async (user: string): Promise<CandidateAction | null> => {
    for (let page = 1; ; page++) {
      const result = await getCandidateInteractions(project, position, {
        page,
        page_size: 50,
      })
      const row = result.items.find((i) => sameId(i.candidate_user_id, user))
      if (row) return row.action
      if (!result.pagination.has_next) return null
    }
  }
  const mutate = async (
    user: string,
    action: CandidateAction | null,
  ): Promise<boolean> => {
    if (!key || lock.current || uncertain) return false
    lock.current = true
    setBusy(true)
    setError("")
    const owner = key
    try {
      if (action === null)
        await resetCandidateInteraction(project, position, user)
      else await setCandidateInteraction(project, position, user, action)
      return scope.current === owner
    } catch (reason) {
      if (scope.current !== owner) return false
      if (
        !(reason instanceof ApiError) ||
        reason.status >= 500 ||
        reason.status < 400 ||
        reason.status === 408
      ) {
        try {
          if ((await readCurrent(user)) === action && scope.current === owner)
            return true
        } catch {
          /* keep uncertain intent */
        }
        if (scope.current === owner) setUncertain({ user, action })
      }
      if (scope.current === owner) setError(teammateErrorMessage(reason))
      return false
    } finally {
      if (scope.current === owner) {
        lock.current = false
        setBusy(false)
      }
    }
  }
  const check = async () => {
    if (!uncertain || lock.current) return false
    const owner = key
    lock.current = true
    setBusy(true)
    try {
      await readCurrent(uncertain.user)
      if (scope.current === owner) {
        setUncertain(null)
        setError("")
        return true
      }
    } catch (reason) {
      if (scope.current === owner) setError(teammateErrorMessage(reason))
    } finally {
      if (scope.current === owner) {
        lock.current = false
        setBusy(false)
      }
    }
    return false
  }
  return { busy, error, uncertain: !!uncertain, mutate, check }
}
