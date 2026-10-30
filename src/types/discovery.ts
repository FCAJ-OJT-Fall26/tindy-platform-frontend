import type { RecruitmentDeadlineDto } from "./project"

export interface MatchFactor {
  label: string;
  weight: number; // e.g. 40
  score: number; // e.g. 92
  detail: string;
}

export interface MatchBreakdown {
  overall: number; // e.g. 92
  verdict: 'Excellent Match' | 'Strong Match' | 'Good Match' | 'Moderate Match' | 'Warning: Low Match' | 'Low Match' | 'Rule-based match';
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
  ruleMatch?: RuleMatch;
  is_saved?: boolean;
  closingDate?: string;
  matchAvailable?: boolean;
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
  graduationYear?: string;
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

// Wire types follow the implemented backend, including nullable raw factors.
export interface RuleMatchFactor {
  name: string
  factor: number | null
  normalized_weight: number
  contribution: number
}
export interface MatchPositionSummary {
  position_id: string
  title: string
  role_id: string
  role_name: string
  experience_level: import("./project").ProjectDifficultyLevel
  required_count: number
  filled_count: number
  remaining_slots: number
}
export interface RuleMatch {
  match_score: number
  algorithm_version: "rule-v1"
  best_position: MatchPositionSummary
  match_factors: RuleMatchFactor[]
  matched_skills: import("./project").PositionSkillDto[]
  missing_skills: import("./project").PositionSkillDto[]
  data_incomplete: boolean
  explanation: string
}
export interface DiscoveryCardDto extends RuleMatch, RecruitmentDeadlineDto {
  project_id: string
  name: string
  tagline: string | null
  description: string
  category: string
  difficulty_level: import("./project").ProjectDifficultyLevel
  expected_commitment_hours: number
  duration: string
  color_theme: string | null
  current_team_size: number
  max_team_capacity: number
  leader: import("./project").ProjectLeaderSummary
  created_at: string
  closing_days_left: number
  feed_bucket: "best_match" | "new_projects" | "explore"
  is_saved: boolean
}
export interface DiscoveryQuery { category?: string; role_id?: string; skill_id?: string }
export interface DiscoveryPage { items: DiscoveryCardDto[]; next_cursor: string | null; has_more: boolean; feed_version: "feed-v1" }
export interface SavedDiscoveryProject {
  project_id: string; name: string; tagline: string | null; category: string; status: import("./project").ProjectStatus
  recruitment_closes_at: string; is_recruitment_open: boolean; is_skipped: boolean; updated_at: string
}
export interface SavedDiscoveryPage { items: SavedDiscoveryProject[]; pagination: import("./project").PaginationMeta }
