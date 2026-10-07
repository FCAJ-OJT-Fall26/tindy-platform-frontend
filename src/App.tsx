import { useState, useEffect, useRef, useCallback } from "react"
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

  // Directional navigation indicator refs & dynamic measurements
  const sidebarNavRef = useRef<HTMLDivElement>(null)
  const mobileBottomRef = useRef<HTMLElement>(null)
  const [sidebarIndicator, setSidebarIndicator] = useState({ top: 0, height: 0, visible: false })
  const [mobileIndicator, setMobileIndicator] = useState({ left: 0, width: 0, visible: false })
  const [isReady, setIsReady] = useState(false)

  const updateIndicators = useCallback(() => {
    // 1. Sidebar indicator (Desktop & Mobile Drawer)
    if (sidebarNavRef.current) {
      const activeLink = sidebarNavRef.current.querySelector(".nav-item.active") as HTMLElement | null
      if (activeLink) {
        const containerRect = sidebarNavRef.current.getBoundingClientRect()
        const linkRect = activeLink.getBoundingClientRect()
        setSidebarIndicator({
          top: linkRect.top - containerRect.top,
          height: linkRect.height,
          visible: true,
        })
      } else {
        setSidebarIndicator((prev) => ({ ...prev, visible: false }))
      }
    }

    // 2. Mobile bottom bar horizontal indicator
    if (mobileBottomRef.current) {
      const activeLink = mobileBottomRef.current.querySelector("a.active") as HTMLElement | null
      if (activeLink) {
        const containerRect = mobileBottomRef.current.getBoundingClientRect()
        const linkRect = activeLink.getBoundingClientRect()
        setMobileIndicator({
          left: linkRect.left - containerRect.left,
          width: linkRect.width,
          visible: true,
        })
      } else {
        setMobileIndicator((prev) => ({ ...prev, visible: false }))
      }
    }
  }, [])

  // Recalculate indicators when route or drawer state changes
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updateIndicators()
      if (!isReady) {
        requestAnimationFrame(() => setIsReady(true))
      }
    })
    // If mobile drawer was opened, ensure accurate measurement after drawer slide animation (220ms)
    const timer = mobile ? setTimeout(updateIndicators, 220) : undefined
    return () => {
      cancelAnimationFrame(id)
      if (timer) clearTimeout(timer)
    }
  }, [location.pathname, mobile, updateIndicators, isReady])

  // Recalculate on window resize / orientation change
  useEffect(() => {
    let resizeTimer: number
    const handleResize = () => {
      cancelAnimationFrame(resizeTimer)
      resizeTimer = requestAnimationFrame(updateIndicators)
    }
    window.addEventListener("resize", handleResize, { passive: true })
    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(resizeTimer)
    }
  }, [updateIndicators])

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
        <div className="sidebar-nav-container" ref={sidebarNavRef}>
          <div
            className={`sidebar-active-indicator ${isReady ? "ready" : ""}`}
            style={{
              transform: `translateY(${sidebarIndicator.top}px)`,
              height: `${sidebarIndicator.height}px`,
              opacity: sidebarIndicator.visible ? 1 : 0,
            }}
            aria-hidden="true"
          />
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
          >
            <Users size={18} />
            Leader Workspace
            <ArrowUpRight className="nav-trailing" size={13} />
          </NavLink>
          <NavLink
            to="/ai"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Sparkles size={18} />
            AI Studio<span className="beta">BETA</span>
          </NavLink>
        </div>
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
          <Link to="/discover">
            Explore opportunities <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Settings size={17} />
            <span>Settings</span>
          </NavLink>
          <Link to="/profile" className="sidebar-user">
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
        <footer className="app-footer">
          <div className="footer-top-row">
            <div className="footer-brand-group">
              <Brand />
              <span className="footer-tagline">
                Find the right project. Build the right team.
              </span>
            </div>
            <nav className="footer-nav" aria-label="Footer navigation">
              <Link to="/" className="footer-nav-link">Dashboard</Link>
              <span className="footer-sep">·</span>
              <Link to="/discover" className="footer-nav-link">Discover</Link>
              <span className="footer-sep">·</span>
              <Link to="/projects" className="footer-nav-link">Projects</Link>
              <span className="footer-sep">·</span>
              <Link to="/team" className="footer-nav-link">Team</Link>
              <span className="footer-sep">·</span>
              <Link to="/components" className="footer-nav-link">Design System</Link>
              <span className="footer-sep">·</span>
              <Link to="/settings" className="footer-nav-link">Settings</Link>
            </nav>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-meta-info">
              <span>© {new Date().getFullYear()} FCAJ Community</span>
              <span className="footer-sep">·</span>
              <span className="footer-help-text">Need help?</span>
              <a href="mailto:support@fcaj.community" className="footer-contact-link">
                <Mail size={12} />
                <span>support@fcaj.community</span>
              </a>
              <span className="footer-sep">·</span>
              <a href="tel:+8418006868" className="footer-contact-link">
                <Phone size={12} />
                <span>+84 (0) 1800 6868</span>
              </a>
            </div>
            <span className="footer-disclaimer">
              Interactive academic & project matching prototype
            </span>
          </div>
        </footer>
      </div>
      <nav className="mobile-bottom" ref={mobileBottomRef}>
        <div
          className={`mobile-bottom-indicator ${isReady ? "ready" : ""}`}
          style={{
            transform: `translateX(${mobileIndicator.left}px)`,
            width: `${mobileIndicator.width}px`,
            opacity: mobileIndicator.visible ? 1 : 0,
          }}
          aria-hidden="true"
        />
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
            <NavLink
              end
              to={item.to}
              key={item.to}
              onClick={() => requestAnimationFrame(updateIndicators)}
            >
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
