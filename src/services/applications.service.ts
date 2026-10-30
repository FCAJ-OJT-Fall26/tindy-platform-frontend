import { ApiError, apiRequest } from "./apiClient"
import { requireProjectId } from "./projects.service"
import { assertRuleMatch } from "./discovery.service"
import type { ApplicationReviewPage, ApplicationReviewQuery, MyApplicationsPage, ProjectApplicationDto } from "../types/application"

export const APPLICATIONS_CHANGED_EVENT = "tindy:applications-changed"
const base = (id: string) => { requireProjectId(id, "Project"); return `/api/projects/${encodeURIComponent(id)}/applications` }
export const getMyApplications = (page = 1, signal?: AbortSignal) => apiRequest<MyApplicationsPage>(`/api/me/project-applications?page=${page}&page_size=50`, { signal }).then(res => res.data)
export async function getAllMyApplications(signal?: AbortSignal): Promise<ProjectApplicationDto[]> {
  const rows: ProjectApplicationDto[] = []
  for (let page = 1; ; page++) {
    const result = await getMyApplications(page, signal)
    if (!Array.isArray(result.items) || result.pagination.current_page !== page) throw Error("Invalid application history response.")
    rows.push(...result.items)
    if (!result.pagination.has_next) return rows
  }
}
export async function applyToProject(project: string, position: string, message: string): Promise<ProjectApplicationDto> {
  requireProjectId(position, "Position")
  const { data } = await apiRequest<ProjectApplicationDto>(base(project), { method: "POST", body: JSON.stringify({ position_id: position, message: message.trim() || null }) })
  if (!data?.application_id || data.project_id !== project || data.position_id !== position || data.status !== "pending") throw Error("The application response could not be confirmed. Check My Applications before trying again.")
  window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT))
  return data
}
export async function withdrawApplication(id: string): Promise<ProjectApplicationDto> {
  requireProjectId(id, "Application")
  const { data } = await apiRequest<ProjectApplicationDto>(`/api/me/project-applications/${encodeURIComponent(id)}/withdraw`, { method: "POST" })
  if (data.application_id !== id || data.status !== "withdrawn") throw Error("Withdrawal could not be confirmed. Refresh its server status.")
  window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT))
  return data
}
export async function getProjectApplications(project: string, query: ApplicationReviewQuery, signal?: AbortSignal): Promise<ApplicationReviewPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value))
  const { data } = await apiRequest<ApplicationReviewPage>(`${base(project)}?${params}`, { signal })
  for (const item of data.items) {
    assertRuleMatch(item.matching)
    if (item.matching.best_position.position_id !== item.application.position_id || item.applied_position.position_id !== item.application.position_id)
      throw Error("The backend returned matching for a different applied position.")
  }
  return data
}
export async function decideApplication(project: string, id: string, decision: "accept" | "reject"): Promise<ProjectApplicationDto> {
  requireProjectId(id, "Application")
  const { data } = await apiRequest<ProjectApplicationDto>(`${base(project)}/${encodeURIComponent(id)}/${decision}`, { method: "POST" })
  if (data.application_id !== id || data.project_id !== project || data.status !== (decision === "accept" ? "accepted" : "rejected")) throw Error("The review result could not be confirmed. Refresh its server status.")
  window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT))
  return data
}
export function applicationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      APPLICATION_ALREADY_PENDING: "You already have a pending application to this project. Check My Applications.",
      APPLICATION_NOT_PENDING: "This application was already reviewed or withdrawn. Refreshing its current status.",
      PROJECT_NOT_ELIGIBLE: "This project is no longer eligible: it may be closed, full or already joined.",
      POSITION_UNAVAILABLE: "This position has closed or filled. Refresh to check other positions.",
      PROJECT_CAPACITY_EXCEEDED: "The project team is full. Refresh to see the current team.",
      PROJECT_NOT_RECRUITING: "This project is no longer recruiting.",
      APPLICATION_RATE_LIMITED: "Too many attempts. Try again after the current rate-limit window.",
      PROJECT_ACCESS_DENIED: "Only this project's leader can manage applications.",
    }
    return messages[error.errorCode ?? ""] ?? error.message
  }
  return "The result could not be confirmed. Check the server state before retrying."
}
