import { useState, useEffect } from "react"
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  NavLink,
  Link,
  useLocation,
} from "react-router"
import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  UserRound,
  Users,
  Menu,
  X,
  ArrowUpRight,
  Search,
  Mail,
  Phone,
} from "lucide-react"
import { TindyProvider, useTindy } from "./store"
import { Avatar, Brand } from "./components/ui"
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
import ScrollToTopButton from "./components/common/ScrollToTopButton"

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover Projects", icon: Compass },
  { to: "/interests", label: "My Interests", icon: Bookmark },
  { to: "/projects", label: "My Projects", icon: FolderKanban },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
]

function Layout() {
  const { profile, mode, setMode, read, toast } = useTindy()
  const location = useLocation()
  const [mobile, setMobile] = useState(false)

  // Dynamic document title updater
  useEffect(() => {
    const titleMap: Record<string, string> = {
      "/": "Dashboard — Tindy",
      "/discover": "Discover Projects — Tindy",
      "/interests": "My Interests — Tindy",
      "/projects": "My Projects — Tindy",
      "/saved": "Saved Projects — Tindy",
      "/candidates": "Candidate Pipeline — Tindy",
      "/candidate": "Candidate Profile — Tindy",
      "/messages": "Messages & Chats — Tindy",
      "/notifications": "Notifications — Tindy",
      "/profile": "Alex Le Profile — Tindy",
      "/ai": "AI Studio — Tindy",
      "/ai-studio": "AI Studio — Tindy",
      "/leader": "Leader Workspace — Tindy",
      "/create-project": "Create Project — Tindy",
      "/settings": "Settings — Tindy",
      "/team": "Team Workspace — Tindy",
      "/components": "Component Library — Tindy",
      "/login": "Sign In — Tindy",
      "/register": "Register — Tindy",
      "/onboarding": "Onboarding — Tindy",
    }
    const matched = Object.entries(titleMap).find(([path]) =>
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
    )
    document.title = matched ? matched[1] : "Tindy — Project & Teammate Matching"
  }, [location.pathname])

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobile(false)
  }, [location.pathname])

  const current =
    items.find((item) => item.to === location.pathname)?.label ||
    (location.pathname.includes("/candidate/")
      ? "Candidate Profile"
      : location.pathname.includes("/project/")
        ? "Project Details"
        : location.pathname.includes("leader")
          ? "Leader Workspace"
          : location.pathname.includes("ai")
            ? "AI Studio"
            : location.pathname.includes("settings")
              ? "Settings"
              : location.pathname.includes("team")
                ? "Team Workspace"
                : "Workspace")

  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="fcaj-symbol">
            F<span>↗</span>
          </div>
          <div>
            <strong>FCAJ Community</strong>
            <small>First Cloud AI Journey</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {items.map((item) => (
            <NavLink
              end
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              key={item.to}
              onClick={() => setMobile(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.label === "Messages" && (
                <span className="nav-count">2</span>
              )}
              {item.label === "Notifications" && read.length < 4 && (
                <span className="nav-dot" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-label">BUILD TOGETHER</div>
        <NavLink
          to="/leader"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={() => setMobile(false)}
        >
          <Users size={18} />
          Leader Workspace
          <ArrowUpRight className="nav-trailing" size={13} />
        </NavLink>
        <NavLink
          to="/ai"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={() => setMobile(false)}
        >
          <Sparkles size={18} />
          AI Studio<span className="beta">BETA</span>
        </NavLink>
        <div className="sidebar-note">
          <span className="tiny-squares">
            <i />
            <i />
            <i />
          </span>
          <strong>Find your next chapter.</strong>
          <p>
            Real projects. Shared ambition.
            <br />A community to build with.
          </p>
          <Link to="/discover" onClick={() => setMobile(false)}>
            Explore opportunities <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link to="/settings" className="nav-item" onClick={() => setMobile(false)}>
            <Settings size={17} />
            Settings
          </Link>
          <Link to="/profile" className="sidebar-user" onClick={() => setMobile(false)}>
            <Avatar name={profile.name} color="neutral" />
            <div>
              <strong>{profile.name}</strong>
              <small>{profile.university}</small>
            </div>
            <ChevronDown size={14} />
          </Link>
        </div>
      </aside>
      {mobile && (
        <div className="mobile-shade" onClick={() => setMobile(false)} />
      )}
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Open mobile navigation menu"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <Link
              to="/discover"
              className="icon-button top-search"
              aria-label="Search projects"
            >
              <Search size={18} />
            </Link>
            <Link
              to="/notifications"
              className="icon-button bell-link"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {read.length < 4 && <i />}
            </Link>
            <Link to="/profile" aria-label="View user profile">
              <Avatar name={profile.name} color="neutral" />
            </Link>
          </div>
        </header>
        <main key={location.pathname} className="page-transition">
          <Outlet />
        </main>
        <footer className="app-footer" style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "26px 0 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "18px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16 px", flexWrap: "wrap" }}>
              <Brand />
              <span style={{ color: "var(--muted)", fontSize: "11px", padding: "10px 15px 0 15px" }}>Find the right project. Build the right team.</span>
              <span style={{ color: "var(--muted)", fontSize: "11px", padding: "10px 0 0 0" }}>
                © {new Date().getFullYear()} FCAJ Community. All rights reserved.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", fontSize: "11px", padding: "10px 0 0 0" }}>
              <Link to="/" className="text-link neutral">Dashboard</Link>
              <Link to="/discover" className="text-link neutral">Discover</Link>
              <Link to="/projects" className="text-link neutral">Projects</Link>
              <Link to="/team" className="text-link neutral">Team</Link>
              <Link to="/components" className="text-link neutral">Design System</Link>
              <Link to="/settings" className="text-link neutral">Settings</Link>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", width: "100%", fontSize: "11px", color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span>Need help? Contact community team:</span>
              <a href="mailto:support@fcaj.community" className="text-link" style={{ gap: "4px" }}>
                <Mail size={12} />
                <span>support@fcaj.community</span>
              </a>
              <span>·</span>
              <a href="tel:+8418006868" className="text-link" style={{ gap: "4px" }}>
                <Phone size={12} />
                <span>+84 (0) 1800 6868</span>
              </a>
            </div>
            <div>
              <span>Interactive academic & project matching prototype</span>
            </div>
          </div>
        </footer>
      </div>
      <nav className="mobile-bottom">
        {items
          .filter((item) =>
            [
              "Dashboard",
              "Discover Projects",
              "My Projects",
              "Messages",
              "Profile",
            ].includes(item.label),
          )
          .map((item) => (
            <NavLink end to={item.to} key={item.to}>
              <item.icon size={19} />
              <span>
                {item.label === "Discover Projects"
                  ? "Discover"
                  : item.label === "My Projects"
                    ? "Projects"
                    : item.label}
              </span>
            </NavLink>
          ))}
      </nav>
      <ScrollToTopButton />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  )
}

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
