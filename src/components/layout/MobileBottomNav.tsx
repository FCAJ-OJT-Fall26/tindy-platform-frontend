import { useState, useEffect, useRef, useCallback } from "react"
import { NavLink, useLocation } from "react-router"
import { navItems } from "./Sidebar"

export default function MobileBottomNav() {
  const location = useLocation()
  const mobileBottomRef = useRef<HTMLElement>(null)
  const [mobileIndicator, setMobileIndicator] = useState({ left: 0, width: 0, visible: false })
  const [isReady, setIsReady] = useState(false)

  const updateIndicators = useCallback(() => {
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

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updateIndicators()
      if (!isReady) {
        requestAnimationFrame(() => setIsReady(true))
      }
    })
    return () => cancelAnimationFrame(id)
  }, [location.pathname, updateIndicators, isReady])

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

  const mobileNavItems = navItems.filter((item) =>
    [
      "Dashboard",
      "Discover Projects",
      "My Projects",
      "Messages",
      "Profile",
    ].includes(item.label)
  )

  return (
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
      {mobileNavItems.map((item) => (
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
  )
}
