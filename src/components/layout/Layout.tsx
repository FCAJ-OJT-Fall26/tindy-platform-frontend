import { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import { Check } from "lucide-react"
import { useTindy } from "../../store"
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"
import MobileBottomNav from "./MobileBottomNav"
import ScrollToTopButton from "../common/ScrollToTopButton"

export default function Layout() {
  const { toast } = useTindy()
  const location = useLocation()
  const [mobile, setMobile] = useState(false)

  // Close mobile sidebar drawer automatically when viewport expands above mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 760) {
        setMobile((prev) => (prev ? false : prev))
      }
    }
    window.addEventListener("resize", handleResize, { passive: true })
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
      "/profile": "Your Profile — Tindy",
      "/users/": "Member Profile — Tindy",
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
      "/privacypolicy": "Privacy Policy — Tindy",
      "/termsofservice": "Terms of Service — Tindy",
    }
    const matched = Object.entries(titleMap).find(([path]) =>
      path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
    )
    document.title = matched ? matched[1] : "Tindy — Project & Teammate Matching"
  }, [location.pathname])

  return (
    <div className="app">
      <Sidebar mobile={mobile} onClose={() => setMobile(false)} />
      {mobile && (
        <div
          className="mobile-shade"
          onClick={() => setMobile(false)}
          aria-hidden="true"
        />
      )}
      <div className="app-content">
        <Header onOpenMobileMenu={() => setMobile(true)} />
        <main key={location.pathname} className="page-transition">
          <Outlet />
        </main>
        <Footer />
      </div>
      <MobileBottomNav />
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
