import { useState, useRef, useEffect } from "react"
import {
  Menu,
  ChevronRight,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  GraduationCap,
  Clock,
  CheckCheck,
  Check,
  ArrowRight,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router"
import { Avatar } from "../ui"
import { useTindy } from "../../store"
import { navItems } from "./Sidebar"
import ProfileMediaImage from "../profile/ProfileMediaImage"
import { INITIAL_NOTIFICATIONS, AppNotification } from "../../data/notifications"

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
  const { profile, read, setRead, notify, ownerProfile, authUser, logout, loggingOut } = useTindy()
  const location = useLocation()
  const navigate = useNavigate()
  const breadcrumb = getBreadcrumb(location.pathname)
  const currentTitle = title || breadcrumb.title
  const currentCategory = breadcrumb.category

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all")

  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadNotifications = INITIAL_NOTIFICATIONS.filter((n) => !read.includes(n.id))
  const unreadCount = unreadNotifications.length
  const displayedNotifications =
    notifFilter === "unread" ? unreadNotifications : INITIAL_NOTIFICATIONS

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false)
        setIsNotifOpen(false)
      }
    }
    if (isMenuOpen || isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMenuOpen, isNotifOpen])

  useEffect(() => {
    setIsMenuOpen(false)
    setIsNotifOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    setIsMenuOpen(false)
    await logout()
    navigate("/login", { replace: true })
  }

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRead(INITIAL_NOTIFICATIONS.map((n) => n.id))
    notify("All notifications marked as read")
  }

  const handleNotifClick = (notif: AppNotification) => {
    setRead((prev) => Array.from(new Set([...prev, notif.id])))
    setIsNotifOpen(false)
    navigate(notif.path)
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
        {/* Notification Bell with Dropdown Popover */}
        <div className="topbar-notif-container" ref={notifRef}>
          <button
            type="button"
            className={`icon-button bell-link topbar-notif-trigger ${isNotifOpen ? "active" : ""}`}
            onClick={() => {
              setIsNotifOpen((prev) => !prev)
              setIsMenuOpen(false)
            }}
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
            aria-haspopup="true"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="notif-badge-dot" />}
          </button>

          {isNotifOpen && (
            <div
              className="topbar-notification-popover"
              role="dialog"
              aria-label="Notifications popover"
            >
              <div className="notif-popover-header">
                <div className="notif-header-title-wrap">
                  <span className="notif-header-title">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="notif-count-badge">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="notif-mark-all-btn"
                    onClick={handleMarkAllAsRead}
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                ) : (
                  <span className="notif-all-read-badge">
                    <Check size={13} /> All caught up
                  </span>
                )}
              </div>

              <div className="notif-popover-tabs">
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === "all" ? "active" : ""}`}
                  onClick={() => setNotifFilter("all")}
                >
                  All ({INITIAL_NOTIFICATIONS.length})
                </button>
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === "unread" ? "active" : ""}`}
                  onClick={() => setNotifFilter("unread")}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="notif-popover-list">
                {displayedNotifications.length === 0 ? (
                  <div className="notif-popover-empty">
                    <Bell size={28} className="notif-popover-empty-icon" />
                    <strong>No unread notifications</strong>
                    <p>You're all caught up with your updates.</p>
                  </div>
                ) : (
                  displayedNotifications.map((notif) => {
                    const isUnread = !read.includes(notif.id)
                    return (
                      <div
                        key={notif.id}
                        className={`notif-popover-item ${isUnread ? "unread" : ""}`}
                        onClick={() => handleNotifClick(notif)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleNotifClick(notif)
                          }
                        }}
                      >
                        <span className={`notif-icon-tile ${notif.tone}`}>
                          <notif.icon size={16} />
                        </span>
                        <div className="notif-item-body">
                          <div className="notif-item-header">
                            <strong className="notif-item-title">{notif.title}</strong>
                            {isUnread && <span className="notif-item-dot" title="Unread" />}
                          </div>
                          <p className="notif-item-desc">{notif.description}</p>
                          <small className="notif-item-time">{notif.time}</small>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="notif-popover-footer">
                <Link
                  to="/notifications"
                  className="notif-footer-link"
                  onClick={() => setIsNotifOpen(false)}
                >
                  View all in Notifications <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Info Trigger & Popover Tag */}
        <div className="topbar-user-container" ref={menuRef}>
          <button
            type="button"
            className={`topbar-user topbar-user-trigger ${isMenuOpen ? "active" : ""}`}
            onClick={() => {
              setIsMenuOpen((prev) => !prev)
              setIsNotifOpen(false)
            }}
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
