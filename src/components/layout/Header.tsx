import { useState, useRef, useEffect } from "react"
import {
  Menu,
  ChevronRight,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  GraduationCap,
  Clock,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router"
import { Avatar } from "../ui"
import { useTindy } from "../../store"
import { navItems } from "./Sidebar"
import ProfileMediaImage from "../profile/ProfileMediaImage"

interface HeaderProps {
  title?: string
  onOpenMobileMenu: () => void
}

interface BreadcrumbInfo {
  category: string
  title: string
}

function getBreadcrumb(pathname: string): BreadcrumbInfo {
  // 1. Settings & Account
  if (pathname.startsWith("/settings")) {
    return { category: "Account", title: "Settings" }
  }
  if (pathname === "/profile") {
    return { category: "Account", title: "Your Profile" }
  }
  if (pathname.startsWith("/users/")) {
    return { category: "Account", title: "Member Profile" }
  }

  // 2. Build Together
  if (pathname === "/leader" || pathname.startsWith("/leader/")) {
    return { category: "Build Together", title: "Leader Workspace" }
  }
  if (pathname === "/create-project") {
    return { category: "Build Together", title: "Create Project" }
  }
  if (pathname.includes("/edit")) {
    return { category: "Build Together", title: "Edit Project" }
  }
  if (pathname.startsWith("/ai")) {
    return { category: "Build Together", title: "AI Studio" }
  }
  if (pathname.startsWith("/team")) {
    return { category: "Build Together", title: "Team Workspace" }
  }

  // 3. Legal
  if (pathname.includes("privacypolicy")) {
    return { category: "Legal", title: "Privacy Policy" }
  }
  if (pathname.includes("termsofservice")) {
    return { category: "Legal", title: "Terms of Service" }
  }

  // 4. Candidate & Project details
  if (pathname.includes("/candidate/")) {
    return { category: "Workspace", title: "Candidate Profile" }
  }
  if (pathname.includes("/project/")) {
    return { category: "Workspace", title: "Project Details" }
  }

  // 5. Sidebar Workspace navigation items
  const matched = navItems.find((item) => item.to === pathname)
  if (matched) {
    return { category: "Workspace", title: matched.label }
  }

  return { category: "Workspace", title: "Dashboard" }
}

export default function Header({ title, onOpenMobileMenu }: HeaderProps) {
  const { profile, read, ownerProfile, authUser, logout, loggingOut } = useTindy()
  const location = useLocation()
  const navigate = useNavigate()
  const breadcrumb = getBreadcrumb(location.pathname)
  const currentTitle = title || breadcrumb.title
  const currentCategory = breadcrumb.category

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false)
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMenuOpen])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    setIsMenuOpen(false)
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button mobile-menu"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation menu"
        >
          <Menu size={20} />
        </button>
        <span>{currentCategory}</span>
        <ChevronRight size={12} />
        <strong>{currentTitle}</strong>
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

        {/* User Info Trigger & Popover Tag */}
        <div className="topbar-user-container" ref={menuRef}>
          <button
            type="button"
            className={`topbar-user topbar-user-trigger ${isMenuOpen ? "active" : ""}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-label="User account menu"
          >
            {ownerProfile.data ? (
              <ProfileMediaImage profile={ownerProfile.data} compact />
            ) : (
              <Avatar name={profile.name} color="neutral" />
            )}
            <div className="topbar-user-info">
              <strong>{profile.name}</strong>
              <small>{profile.university || "FPT University"}</small>
            </div>
            <ChevronDown size={14} className={`topbar-user-chevron ${isMenuOpen ? "open" : ""}`} />
          </button>

          {isMenuOpen && (
            <div className="topbar-user-popover" role="dialog" aria-label="User details tag">
              <div className="user-popover-header">
                {ownerProfile.data ? (
                  <ProfileMediaImage profile={ownerProfile.data} />
                ) : (
                  <Avatar name={profile.name} color="neutral" size="md" />
                )}
                <div className="user-popover-details">
                  <div className="user-popover-name-row">
                    <span className="user-popover-name">{profile.name}</span>
                    <span className="user-popover-status-dot" title="Active member" />
                  </div>
                  {profile.role && <div className="user-popover-role">{profile.role}</div>}
                  <div className="user-popover-email">{authUser?.email || profile.email || "student@fpt.edu.vn"}</div>
                </div>
              </div>

              <div className="user-popover-info-list">
                <div className="user-popover-info-item">
                  <GraduationCap size={14} />
                  <span>{profile.university || "FPT University"}</span>
                </div>
                {profile.hours ? (
                  <div className="user-popover-info-item">
                    <Clock size={14} />
                    <span>{profile.hours} hrs/week committed</span>
                  </div>
                ) : null}
              </div>

              <div className="user-popover-actions">
                <Link
                  to="/profile"
                  className="user-popover-btn"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={15} />
                  <span>View profile</span>
                </Link>
                <Link
                  to="/settings"
                  className="user-popover-btn"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings size={15} />
                  <span>Settings & preferences</span>
                </Link>
                <button
                  type="button"
                  className="user-popover-btn logout"
                  disabled={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
