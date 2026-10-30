import { createBrowserRouter, RouterProvider, Navigate } from "react-router"
import type { ReactNode } from "react"
import { TindyProvider } from "./store"
import ProjectApplicationsScreen from "./pages/leader/ProjectApplicationsScreen"
import { Layout } from "./components/layout"
import RequireAuth from "./components/auth/RequireAuth"
import OAuthCallbackScreen from "./pages/auth/OAuthCallbackScreen"
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
  SwipeDiscoveryView,
  PrivacyPolicy,
  TermsOfService,
} from "./pages"

function DemoPreview({ children }: { children: ReactNode }) {
  return <><div className="info-banner" role="note">Demo preview — sample data and interactions. This workflow is not connected to the backend yet.</div>{children}</>
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <RequireAuth completed />,
        children: [
          { index: true, Component: Dashboard },
          { path: "discover", Component: SwipeDiscoveryView },
          { path: "interests", element: <Navigate to="/projects?tab=Interested" replace /> },
          { path: "saved", element: <Navigate to="/projects?tab=Saved" replace /> },
          { path: "projects", Component: MyProjects },
          { path: "candidates", element: <DemoPreview><Candidates /></DemoPreview> },
          { path: "candidate/:id", element: <DemoPreview><CandidateDetail /></DemoPreview> },
          { path: "project/:id", Component: ProjectDetail },
          { path: "profile", Component: ProfileScreen },
          { path: "users/:userId", Component: ProfileScreen },
          { path: "ai", Component: AIStudio },
          { path: "ai-studio", Component: AIStudio },
          { path: "leader", Component: LeaderDashboard },
          { path: "create-project", Component: CreateProject },
          { path: "project/:id/edit", Component: CreateProject },
          { path: "project/:id/applications", Component: ProjectApplicationsScreen },
          { path: "messages", element: <DemoPreview><Messages /></DemoPreview> },
          { path: "notifications", element: <DemoPreview><Notifications /></DemoPreview> },
          { path: "team", Component: TeamScreen },
          { path: "team/:projectId", Component: TeamScreen },
          { path: "project/:id/workspace", Component: TeamScreen },
          { path: "components", Component: ComponentLibrary },
        ],
      },
      { element: <RequireAuth />, children: [{ path: "settings", Component: SettingsScreen }] },
      { path: "privacypolicy", Component: PrivacyPolicy },
      { path: "termsofservice", Component: TermsOfService },
      { path: "*", Component: NotFound },
    ],
  },
  { path: "login", Component: Auth },
  { path: "register", Component: Auth },
  { path: "auth/oauth/callback", Component: OAuthCallbackScreen },
  { element: <RequireAuth onboarding />, children: [{ path: "onboarding", Component: Onboarding }] },
])

export default function App() {
  return (
    <TindyProvider>
      <RouterProvider router={router} />
    </TindyProvider>
  )
}
