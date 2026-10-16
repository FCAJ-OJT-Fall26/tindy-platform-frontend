import { createBrowserRouter, RouterProvider } from "react-router"
import { TindyProvider } from "./store"
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

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <RequireAuth completed />,
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
          { path: "team", Component: TeamScreen },
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
