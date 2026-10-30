import { useState, useEffect, useRef, useCallback } from "react"
import { NavLink, Link, useLocation } from "react-router"
import {
  ChevronDown,
  LayoutDashboard,
  Compass,
  Bookmark,
  FolderKanban,
  Users,
  MessageSquare,
  Bell,
  Settings,
  Sparkles,
  X,
  ArrowUpRight,
  LogOut,
} from "lucide-react"
import { useNavigate } from "react-router"
import { Brand } from "../ui"
import { useTindy } from "../../store"

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover Projects", icon: Compass },
  { to: "/projects", label: "My Projects", icon: FolderKanban },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
]

interface SidebarProps {
  mobile: boolean
  onClose: () => void
}

export default function Sidebar({ mobile, onClose }: SidebarProps) {
  const { logout, loggingOut } = useTindy()
  const location = useLocation()
  const navigate = useNavigate()

  const sidebarNavRef = useRef<HTMLDivElement>(null)
  const [sidebarIndicator, setSidebarIndicator] = useState({ top: 0, height: 0, visible: false })
  const [isReady, setIsReady] = useState(false)

  const updateIndicator = useCallback(() => {
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
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updateIndicator()
      if (!isReady) {
        requestAnimationFrame(() => setIsReady(true))
      }
    })
    const timer = mobile ? setTimeout(updateIndicator, 220) : undefined
    return () => {
      cancelAnimationFrame(id)
      if (timer) clearTimeout(timer)
    }
  }, [location.pathname, mobile, updateIndicator, isReady])

  useEffect(() => {
    let resizeTimer: number
    const handleResize = () => {
      cancelAnimationFrame(resizeTimer)
      resizeTimer = requestAnimationFrame(updateIndicator)
    }
    window.addEventListener("resize", handleResize, { passive: true })
    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(resizeTimer)
    }
  }, [updateIndicator])

  return (
    <aside className={`sidebar ${mobile ? "open" : ""}`}>
      <div className="sidebar-brand">
        <Brand />
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation"
          onClick={onClose}
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
          {navItems.map((item) => (
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
        <button
          type="button"
          disabled={loggingOut}
          onClick={async () => {
            await logout()
            navigate("/login", { replace: true })
          }}
          className="nav-item cursor-pointer text-left w-full hover:text-rose-600 transition-colors"
          style={{ background: "transparent", border: "none" }}
        >
          <LogOut size={17} />
          <span>{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  )
}
