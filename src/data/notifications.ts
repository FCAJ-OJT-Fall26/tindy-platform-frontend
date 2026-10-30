import { Mail, Users, Sparkles, MessageSquare } from "lucide-react"

export interface AppNotification {
  id: number
  title: string
  description: string
  time: string
  type: "invite" | "view" | "match" | "message"
  path: string
  icon: typeof Mail
  tone: "teal" | "blue" | "indigo" | "amber"
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    title: "Team invitation received",
    description: "Minh Nguyen invited you to join AI Customer Support System as Frontend Developer.",
    time: "15m ago",
    type: "invite",
    path: "/projects?tab=Invited",
    icon: Mail,
    tone: "teal",
  },
  {
    id: 2,
    title: "New high project match (92%)",
    description: "Campus Cloud aligns with your React and TypeScript skills.",
    time: "1h ago",
    type: "match",
    path: "/discover",
    icon: Sparkles,
    tone: "blue",
  },
  {
    id: 3,
    title: "Profile viewed by project lead",
    description: "The Open Source Issue Explorer team reviewed your skills and experience.",
    time: "3h ago",
    type: "view",
    path: "/profile",
    icon: Users,
    tone: "indigo",
  },
  {
    id: 4,
    title: "New candidate inquiry",
    description: "Cao Thanh Nhan asked a question about your backend architecture.",
    time: "Yesterday",
    type: "message",
    path: "/messages?conversation=Cao%20Thanh%20Nhan",
    icon: MessageSquare,
    tone: "amber",
  },
]
