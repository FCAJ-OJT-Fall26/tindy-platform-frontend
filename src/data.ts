export type Project = {
  id: string
  name: string
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
  leader: string
  initials: string
  color: string
  created: number
  closing: number
  factors: number[]
  goals: string[]
  gap: string[]
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
export const initialProjects: Project[] = [
  {
    id: "cloud-desk",
    name: "AI Customer Support System",
    description:
      "Build an AI-powered customer support platform using RAG and cloud services. Real questions. Smarter answers.",
    type: "AI & Machine Learning",
    skills: [".NET", "AWS", "PostgreSQL", "RAG", "LLM"],
    role: "Backend Developer",
    hours: 10,
    duration: "3 months",
    difficulty: "Intermediate",
    team: 3,
    capacity: 5,
    leader: "Minh Nguyen",
    initials: "CS",
    color: "indigo",
    created: 6,
    closing: 4,
    factors: [90, 95, 100, 80, 100],
    goals: [
      "Build a retrieval-augmented knowledge base for customer support.",
      "Deploy a secure, scalable API on AWS.",
      "Reduce response time with contextual, source-cited AI answers.",
    ],
    gap: ["Docker"],
  },
  {
    id: "campus-cloud",
    name: "Campus Cloud",
    description:
      "One place for campus events, student communities, and everything that brings university life together.",
    type: "Web Application",
    skills: ["React", "TypeScript", "AWS", "DynamoDB"],
    role: "Frontend Developer",
    hours: 8,
    duration: "2 months",
    difficulty: "Beginner-friendly",
    team: 4,
    capacity: 6,
    leader: "Linh Tran",
    initials: "CC",
    color: "teal",
    created: 4,
    closing: 12,
    factors: [85, 90, 85, 100, 100],
    goals: [
      "Connect student clubs through a shared event platform.",
      "Build accessible event discovery and registration.",
      "Launch a pilot with three university communities.",
    ],
    gap: ["DynamoDB"],
  },
  {
    id: "cloud-guard",
    name: "CloudGuard",
    description:
      "Make cloud security accessible. Detect, investigate, and respond to threats with an intelligent AWS dashboard.",
    type: "Cloud & DevOps",
    skills: ["AWS", "Python", "CloudWatch", "Lambda"],
    role: "Cloud Engineer",
    hours: 10,
    duration: "3 months",
    difficulty: "Intermediate",
    team: 2,
    capacity: 4,
    leader: "Bao Pham",
    initials: "CG",
    color: "amber",
    created: 2,
    closing: 8,
    factors: [85, 90, 80, 65, 100],
    goals: [
      "Monitor cloud environments for unusual activity.",
      "Automate actionable security notifications.",
      "Develop a clear dashboard for incident response.",
    ],
    gap: ["EventBridge", "GuardDuty"],
  },
  {
    id: "studywise",
    name: "StudyWise AI",
    description:
      "Turn lecture notes into personalized study plans, flashcards, and quizzes. Make learning a little more personal.",
    type: "AI & Machine Learning",
    skills: ["Python", "React", "LLM", "FastAPI"],
    role: "AI Engineer",
    hours: 8,
    duration: "2 months",
    difficulty: "Intermediate",
    team: 3,
    capacity: 5,
    leader: "Thu Anh",
    initials: "SW",
    color: "sky",
    created: 5,
    closing: 14,
    factors: [80, 95, 70, 85, 100],
    goals: [
      "Create source-grounded quizzes from lecture notes.",
      "Personalize revision to each student’s learning goals.",
      "Validate the learning experience with student testers.",
    ],
    gap: ["FastAPI"],
  },
  {
    id: "openfolio",
    name: "OpenFolio",
    description:
      "A developer portfolio that grows with you. Showcase your projects, contributions, and the story behind your code.",
    type: "Open Source",
    skills: ["Next.js", "TypeScript", "PostgreSQL"],
    role: "Frontend Developer",
    hours: 6,
    duration: "1 month",
    difficulty: "Beginner-friendly",
    team: 2,
    capacity: 4,
    leader: "David Pham",
    initials: "OF",
    color: "rose",
    created: 3,
    closing: 6,
    factors: [75, 80, 85, 95, 100],
    goals: [
      "Build a customizable, accessible portfolio template.",
      "Integrate project evidence from GitHub.",
      "Publish an open-source starter for the FCAJ community.",
    ],
    gap: ["Next.js"],
  },
  {
    id: "ecotrack",
    name: "EcoTrack",
    description:
      "Small habits, meaningful impact. Help students understand their carbon footprint and build a more sustainable campus.",
    type: "Social Impact",
    skills: ["React", "Node.js", "PostgreSQL"],
    role: "Full-stack Developer",
    hours: 12,
    duration: "3 months",
    difficulty: "Intermediate",
    team: 3,
    capacity: 5,
    leader: "Jamie Le",
    initials: "ET",
    color: "green",
    created: 1,
    closing: 9,
    factors: [80, 60, 70, 70, 85],
    goals: [
      "Track the footprint of everyday student activities.",
      "Design actionable, accessible sustainability insights.",
      "Build a community leaderboard for positive impact.",
    ],
    gap: ["Node.js"],
  },
]
export const initialProfile = {
  name: "Alex Le",
  university: "FPT University",
  email: "alex.le@fpt.edu.vn",
  role: "Backend Developer",
  hours: "10",
  interests: "Cloud computing, AI applications, open source",
  skills: [".NET", "AWS", "PostgreSQL", "React", "TypeScript", "Git"],
  experience:
    "Built a RAG chatbot and a ticket management system using .NET, PostgreSQL, and AWS.",
  github: "github.com/alexle",
  portfolio: "alexle.dev",
  goals:
    "Build production-ready cloud applications and become a better team collaborator.",
  technologies: "Docker, AWS Lambda, EventBridge",
  summary:
    "Backend-focused developer with hands-on experience in .NET, AWS, and PostgreSQL. Passionate about building thoughtful AI applications and contributing to collaborative, cloud-first projects.",
}
export type Profile = typeof initialProfile
export const initialCandidates = [
  {
    name: "Cao Thanh Nhan",
    initials: "CN",
    role: "Backend Developer",
    skills: [".NET", "AWS", "PostgreSQL", "React"],
    hours: 10,
    match: 92,
    experience: "Built a RAG application and a ticket management system.",
    color: "teal",
  },
  {
    name: "Linh Tran",
    initials: "LT",
    role: "Frontend Developer",
    skills: ["React", "TypeScript", "Figma"],
    hours: 8,
    match: 88,
    experience: "Designed and built a campus event platform.",
    color: "rose",
  },
  {
    name: "David Pham",
    initials: "DP",
    role: "Backend Developer",
    skills: [".NET", "AWS", "Redis"],
    hours: 12,
    match: 85,
    experience: "Built a REST API with caching and JWT authentication.",
    color: "sky",
  },
  {
    name: "An Hoang",
    initials: "AH",
    role: "AI Engineer",
    skills: ["Python", "LLM", "RAG"],
    hours: 10,
    match: 81,
    experience: "Created a source-grounded university FAQ chatbot.",
    color: "amber",
  },
  {
    name: "Minh Nguyen",
    initials: "MN",
    role: "Full-stack Developer",
    skills: ["React", "Node.js", "Docker", "PostgreSQL"],
    hours: 14,
    match: 94,
    experience: "Contributed to distributed systems and realtime chat backends.",
    color: "indigo",
  },
  {
    name: "Thao Vu",
    initials: "TV",
    role: "Cloud Engineer",
    skills: ["AWS", "Terraform", "CI/CD", "Python"],
    hours: 10,
    match: 87,
    experience: "Architected serverless AWS pipelines and event-driven microservices.",
    color: "green",
  },
  {
    name: "Jamie Le",
    initials: "JL",
    role: "Full-stack Developer",
    skills: ["React", "Node.js", "PostgreSQL"],
    hours: 12,
    match: 90,
    experience: "Lead developer on EcoTrack sustainability project.",
    color: "teal",
  },
]
