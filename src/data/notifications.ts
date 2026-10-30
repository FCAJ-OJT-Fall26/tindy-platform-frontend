import type { LucideIcon } from "lucide-react"

export interface AppNotification {
  id: number | string
  title: string
  description: string
  time: string
  type?: string
  path: string
  icon?: LucideIcon
  tone?: "teal" | "blue" | "indigo" | "amber" | string
  isRead?: boolean
}

// Server-owned notifications: empty until API integration
export const INITIAL_NOTIFICATIONS: AppNotification[] = []
