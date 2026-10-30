import { useEffect } from "react"
import { useTindy } from "../store"
import useRemoteResource from "./useRemoteResource"
import { APPLICATIONS_CHANGED_EVENT, getAllMyApplications } from "../services/applications.service"

export default function useMyApplications() {
  const { authUser } = useTindy()
  const resource = useRemoteResource(authUser?.is_onboarding_completed ? authUser.user_id : null, getAllMyApplications)
  useEffect(() => {
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, resource.reload)
    return () => window.removeEventListener(APPLICATIONS_CHANGED_EVENT, resource.reload)
  }, [resource.reload])
  return resource
}
