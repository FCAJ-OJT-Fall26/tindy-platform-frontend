export interface ProfileProjectExperience {
  id: string
  initials: string
  title: string
  desc: string
  tags: string[]
}

export interface ProfileCertificate {
  id: string
  name: string
  subtext: string
  verified?: boolean
}

export interface UserProfile {
  name: string
  university: string
  preferredRole: string
  availabilityHours: number | string
  githubUrl: string
  portfolioUrl: string
  summary: string
  professionalInterests: string[]
  projectExperienceText: string
  learningGoals: string
  technologiesToLearn: string[]
  technicalSkills: string[]
  community: string
  openToProjects: boolean
  projects: ProfileProjectExperience[]
  certificates: ProfileCertificate[]
}

// Production profile data is read from the authenticated profile API.
export const INITIAL_USER_PROFILE: UserProfile = {
  name: "",
  university: "",
  preferredRole: "",
  availabilityHours: "",
  githubUrl: "",
  portfolioUrl: "",
  summary: "",
  professionalInterests: [],
  projectExperienceText: "",
  learningGoals: "",
  technologiesToLearn: [],
  technicalSkills: [],
  community: "",
  openToProjects: false,
  projects: [],
  certificates: [],
}
