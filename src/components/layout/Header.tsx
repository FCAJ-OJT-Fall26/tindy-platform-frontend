import { Menu, ChevronRight, Search, Bell } from "lucide-react"
import { Link, useLocation } from "react-router"
import { Avatar } from "../ui"
import { useTindy } from "../../store"
import { navItems } from "./Sidebar"

interface HeaderProps {
  title?: string
  onOpenMobileMenu: () => void
}

function getBreadcrumbTitle(pathname: string): string {
  const matched = navItems.find((item) => item.to === pathname)
  if (matched) return matched.label
  if (pathname.includes("/candidate/")) return "Candidate Profile"
  if (pathname.includes("/project/")) return "Project Details"
  if (pathname.includes("leader")) return "Leader Workspace"
  if (pathname.includes("ai")) return "AI Studio"
  if (pathname.includes("settings")) return "Settings"
  if (pathname.includes("team")) return "Team Workspace"
  if (pathname.includes("privacypolicy")) return "Privacy Policy"
  if (pathname.includes("termsofservice")) return "Terms of Service"
  return "Workspace"
}

export default function Header({ title, onOpenMobileMenu }: HeaderProps) {
  const { profile, read } = useTindy()
  const location = useLocation()
  const current = title || getBreadcrumbTitle(location.pathname)

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
  )
}
