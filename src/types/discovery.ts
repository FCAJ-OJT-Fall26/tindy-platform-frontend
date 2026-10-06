export interface MatchFactor {
  label: string;
  weight: number; // e.g. 40
  score: number; // e.g. 92
  detail: string;
}

export interface MatchBreakdown {
  overall: number; // e.g. 92
  verdict: 'Excellent Match' | 'Strong Match' | 'Good Match' | 'Moderate Match';
  factors: MatchFactor[];
  strongMatches: string[];
  skillGaps: {
    skill: string;
    note: string;
    recommendation?: string;
  }[];
  explanationSummary: string;
  strengths?: string[];
  gaps?: string[];
  dimensions?: MatchFactor[];
}

export interface ProjectTeamMember {
  name: string;
  role: string;
  avatar: string;
  initials: string;
}

export interface DiscoveryProject {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  category: string;
  badge?: string;
  role: string;
  skills: string[];
  niceToHave: string[];
  niceToHaveSkills?: string[];
  hours: string;
  commitment?: string;
  duration: string;
  teamSize: number;
  maxTeamSize: number;
  teamMembers: ProjectTeamMember[];
  members?: ProjectTeamMember[];
  goals: string[];
  techStack: string[];
  leadName: string;
  leadRole: string;
  leadAvatar: string;
  color: 'violet' | 'emerald' | 'amber' | 'blue' | 'rose';
  match: MatchBreakdown;
}

export interface DiscoveryCandidate {
  id: string;
  name: string;
  preferredRole: string;
  university: string;
  avatar: string;
  initials: string;
  hours: string;
  summary: string;
  skills: string[];
  relevantProjects: {
    title: string;
    role: string;
    tech: string[];
    description: string;
  }[];
  certificates: string[];
  match: MatchBreakdown;
  portfolioUrl?: string;
  githubUrl?: string;
}

export type DiscoveryMode = 'student' | 'leader';

export type SwipeDirection = 'left' | 'right' | 'up';

export interface SwipeHistoryEntry {
  id: string;
  direction: SwipeDirection;
  item: DiscoveryProject | DiscoveryCandidate;
  timestamp: number;
}

export type FunnelStatus = 'Interested' | 'Shortlisted' | 'Chatting' | 'Invitation Sent' | 'Joined';
