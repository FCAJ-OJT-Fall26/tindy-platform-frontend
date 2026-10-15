import { ApiError } from "../../services/apiClient"

export function requestErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return "Your session has expired. Please sign in again."
    if (error.status === 403 && error.errorCode === "ONBOARDING_REQUIRED") {
      return "Please complete your onboarding to continue. Your session is still active."
    }
    const validation = Object.values(error.validationErrors ?? {})
      .flat()
      .join(" ")
    return validation || error.message
  }
  return "Unable to connect to the server. Check your connection and try again."
}
