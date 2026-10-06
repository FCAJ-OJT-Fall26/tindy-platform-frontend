import { FolderKanban } from 'lucide-react';

export interface ProjectItem {
  id: number;
  name: string;
  sub: string;
  desc: string;
  icon: typeof FolderKanban;
  color: string;
  type: string;
  tags: string[];
  role: string;
  score: number;
  people: string[];
  duration: string;
  hours: string;
}

export const projects: ProjectItem[] = [
  {
    id: 1,
    name: 'EcoTrack',
    sub: 'Actionable carbon footprint monitoring for academic campuses.',
    desc: 'An explainable AI platform helping university teams monitor building energy footprints and deliver verified sustainability milestones.',
    icon: FolderKanban,
    color: 'default',
    type: 'Sustainability',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    role: 'Frontend Developer',
    score: 96,
    people: ['JL', 'AN', 'KT'],
    duration: '8-12 weeks',
    hours: '10 hrs/week'
  },
  {
    id: 2,
    name: 'StudyBuddy AI',
    sub: 'Peer learning systems and algorithmic study grouping.',
    desc: 'Build an open study companion that maps course syllabus topics to real-time collaborative coding sessions.',
    icon: FolderKanban,
    color: 'default',
    type: 'EdTech',
    tags: ['Python', 'React', 'FastAPI'],
    role: 'Full-stack Developer',
    score: 92,
    people: ['MK', 'TH'],
    duration: '6-8 weeks',
    hours: '8 hrs/week'
  },
  {
    id: 3,
    name: 'DevConnect',
    sub: 'Structured developer workspace and code review platform.',
    desc: 'A verified campus workspace where student developers share architectural designs, audit pull requests, and ship production software.',
    icon: FolderKanban,
    color: 'default',
    type: 'Developer Tools',
    tags: ['Next.js', 'TypeScript', 'Supabase'],
    role: 'Frontend Developer',
    score: 89,
    people: ['HN', 'DP', 'LT'],
    duration: '10-12 weeks',
    hours: '12 hrs/week'
  },
  {
    id: 4,
    name: 'Mindful',
    sub: 'Clinical-grade student wellness and habits tracking.',
    desc: 'An evidence-based mental wellness application engineered with structured mood analytics and campus counseling integration.',
    icon: FolderKanban,
    color: 'default',
    type: 'HealthTech',
    tags: ['React', 'Firebase', 'TypeScript'],
    role: 'UI/UX Designer',
    score: 85,
    people: ['CN', 'AL'],
    duration: '8 weeks',
    hours: '8 hrs/week'
  },
];
