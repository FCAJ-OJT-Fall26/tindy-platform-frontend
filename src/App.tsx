import { createBrowserRouter, RouterProvider } from "react-router"
import { TindyProvider } from "./store"
import { Layout } from "./components/layout"
import {
  Dashboard,
  ProjectDetail,
  MyProjects,
  ProfileScreen,
  AIStudio,
  Onboarding,
  Auth,
  LeaderDashboard,
  CreateProject,
  Messages,
  Notifications,
  SettingsScreen,
  TeamScreen,
  ComponentLibrary,
  Candidates,
  CandidateDetail,
  NotFound,
} from "./screens"
import SwipeDiscoveryView from "./pages/discovery/SwipeDiscoveryView"
import PrivacyPolicy from "./pages/legal/PrivacyPolicy"
import TermsOfService from "./pages/legal/TermsOfService"

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, Component: Dashboard },
      { path: "discover", Component: SwipeDiscoveryView },
      { path: "interests", Component: MyProjects },
      { path: "saved", Component: MyProjects },
      { path: "projects", Component: MyProjects },
      { path: "candidates", Component: Candidates },
      { path: "candidate/:id", Component: CandidateDetail },
      { path: "project/:id", Component: ProjectDetail },
      { path: "profile", Component: ProfileScreen },
      { path: "ai", Component: AIStudio },
      { path: "ai-studio", Component: AIStudio },
      { path: "leader", Component: LeaderDashboard },
      { path: "create-project", Component: CreateProject },
      { path: "project/:id/edit", Component: CreateProject },
      { path: "messages", Component: Messages },
      { path: "notifications", Component: Notifications },
      { path: "settings", Component: SettingsScreen },
      { path: "team", Component: TeamScreen },
      { path: "components", Component: ComponentLibrary },
      { path: "privacypolicy", Component: PrivacyPolicy },
      { path: "termsofservice", Component: TermsOfService },
      { path: "*", Component: NotFound },
    ],
  },
  { path: "login", Component: Auth },
  { path: "register", Component: Auth },
  { path: "onboarding", Component: Onboarding },
])

export default function App() {
  return (
    <TindyProvider>
      <RouterProvider router={router} />
    </TindyProvider>
  )
}
