import { Menu, ChevronRight, Search, Bell, ChevronDown } from "lucide-react"
import { Link, useLocation } from "react-router"
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
  const { profile, read, ownerProfile } = useTindy()
  const location = useLocation()
  const breadcrumb = getBreadcrumb(location.pathname)
  const currentTitle = title || breadcrumb.title
  const currentCategory = breadcrumb.category

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
          title="Notifications — Demo preview"
        >
          <Bell size={19} />
          {read.length < 4 && <i />}
        </Link>
        <Link to="/profile" className="topbar-user" aria-label="View user profile">
          {ownerProfile.data ? <ProfileMediaImage profile={ownerProfile.data} compact /> : <Avatar name={profile.name} color="neutral" />}
          <div className="topbar-user-info">
            <strong>{profile.name}</strong>
            <small>{profile.university}</small>
          </div>
          <ChevronDown size={14} />
        </Link>
      </div>
    </header>
  )
}
