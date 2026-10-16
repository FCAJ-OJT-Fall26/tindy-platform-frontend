import { Navigate, Outlet } from "react-router"
import { useTindy } from "../../store"

export default function RequireAuth({
  completed = false,
  onboarding = false,
}: {
  completed?: boolean
  onboarding?: boolean
}) {
  const { authLoading, authUser } = useTindy()
  if (authLoading)
    return (
      <div className="info-banner" role="status">
        Restoring your Tindy session…
      </div>
    )
  if (!authUser) return <Navigate to="/login" replace />
  if (completed && !authUser.is_onboarding_completed)
    return <Navigate to="/onboarding" replace />
  if (onboarding && authUser.is_onboarding_completed)
    return <Navigate to="/discover" replace />
  return <Outlet />
}
