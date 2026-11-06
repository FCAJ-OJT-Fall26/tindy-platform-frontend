import { apiRequest } from "./apiClient"
export interface MemberSearchItem {
  user_id: string
  username: string | null
  display_name: string
  university: string | null
  headline: string | null
}
export interface MemberSearchResponse {
  items: MemberSearchItem[]
  page: number
  page_size: number
  has_more: boolean
}
export async function searchMembers(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query.trim(), page_size: "10" })
  return (await apiRequest<MemberSearchResponse>("/api/users?" + params, { signal })).data
}
