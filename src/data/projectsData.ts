import { FolderKanban } from "lucide-react"

export interface ProjectItem {
  id: number
  name: string
  sub: string
  desc: string
  icon: typeof FolderKanban
  color: string
  type: string
  tags: string[]
  role: string
  score: number
  people: string[]
  duration: string
  hours: string
}

// The project catalog is server-owned. This compatibility collection is empty
// until the screen is fully backed by the projects API.
export const projects: ProjectItem[] = []
