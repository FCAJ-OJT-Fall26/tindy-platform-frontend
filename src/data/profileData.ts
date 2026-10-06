export interface ProfileProjectExperience {
  id: string;
  initials: string;
  title: string;
  desc: string;
  tags: string[];
}

export interface ProfileCertificate {
  id: string;
  name: string;
  subtext: string;
  verified?: boolean;
}

export interface UserProfile {
  name: string;
  university: string;
  preferredRole: string;
  availabilityHours: number | string;
  githubUrl: string;
  portfolioUrl: string;
  summary: string;
  professionalInterests: string[];
  projectExperienceText: string;
  learningGoals: string;
  technologiesToLearn: string[];
  technicalSkills: string[];
  community: string;
  openToProjects: boolean;
  projects: ProfileProjectExperience[];
  certificates: ProfileCertificate[];
}

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Alex Le',
  university: 'FPT University',
  preferredRole: 'Backend Developer',
  availabilityHours: 10,
  githubUrl: 'github.com/alexle',
  portfolioUrl: 'alexle.dev',
  summary:
    'Backend-focused developer with hands-on experience in .NET, AWS, and PostgreSQL. Passionate about building thoughtful AI applications and contributing to collaborative, cloud-first projects.',
  professionalInterests: ['Cloud computing', 'AI applications', 'open source'],
  projectExperienceText:
    'Built a RAG chatbot and a ticket management system using .NET, PostgreSQL, and AWS.',
  learningGoals:
    'Build production-ready cloud applications and become a better team collaborator.',
  technologiesToLearn: ['Docker', 'AWS Lambda', 'EventBridge'],
  technicalSkills: ['.NET', 'AWS', 'PostgreSQL', 'React', 'TypeScript', 'Git'],
  community: 'First Cloud AI Journey',
  openToProjects: true,
  projects: [
    {
      id: 'proj-exp-1',
      initials: 'RC',
      title: 'RAG Knowledge Chatbot',
      desc: 'Built a RAG chatbot and a ticket management system using .NET, PostgreSQL, and AWS.',
      tags: ['.NET', 'RAG', 'AWS', 'PostgreSQL'],
    },
    {
      id: 'proj-exp-2',
      initials: 'TM',
      title: 'Ticket Management System',
      desc: 'Designed a REST API, role-based access, and a responsive issue tracking interface.',
      tags: ['React', '.NET', 'REST API'],
    },
  ],
  certificates: [
    {
      id: 'cert-1',
      name: 'AWS Cloud Practitioner.pdf',
      subtext: 'Uploaded evidence',
      verified: true,
    },
  ],
};
