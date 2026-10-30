export type Project = {
  recruitmentClosingDate?: string
  recruitmentClosesAt?: string
  isRecruitmentOpen?: boolean
  serverMatch?: import("./types/discovery").RuleMatch
  id: string
  name: string
  tagline?: string
  description: string
  type: string
  skills: string[]
  requiredSkills?: string[]
  role: string
  hours: number
  duration: string
  difficulty: string
  team: number
  capacity: number
  openings?: number
  leader: string
  leaderId?: string
  matchAvailable?: boolean
  status?: import("./types/project").ProjectStatus
  initials: string
  color: string
  created: number
  closing: number
  factors: number[]
  goals: string[]
  gap: string[]
  openPositions?: Array<{
    positionId: string
    role: string
    title: string
    count: number
    level: string
    description?: string
    requiredSkills: string[]
    niceSkills: string[]
  }>
}

export const factors = [
  { name: "Technical skills", weight: 40 },
  { name: "Interest match", weight: 20 },
  { name: "Preferred role", weight: 15 },
  { name: "Previous experience", weight: 15 },
  { name: "Availability", weight: 10 },
]

export const score = (project: Project) =>
  Math.round(
    project.factors.reduce(
      (total, value, index) => total + (value * factors[index].weight) / 100,
      0,
    ),
  )

// Production data must come from the authenticated API. These arrays intentionally
// remain empty so a missing API response can never display demo records.
export const initialProjects: Project[] = []
export const initialCandidates: Array<{
  name: string
  initials: string
  role: string
  skills: string[]
  hours: number
  match: number
  experience: string
  color: string
}> = []

export type Profile = {
  name: string
  university: string
  email: string
  role: string
  hours: string
  interests: string
  skills: string[]
  experience: string
  github: string
  portfolio: string
  goals: string
  technologies: string
  summary: string
}
