import { useState, useEffect } from "react"
import { Link } from "react-router"
import {
  GraduationCap,
  Bell,
  ShieldCheck,
  Check,
  LogOut,
  Mail,
  Phone,
} from "lucide-react"
import { useTindy } from "../../store"
import { PageHeader, Button } from "../../components/ui"

export function SettingsScreen() {
  const { profile, setProfile, notify } = useTindy()
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    () => {
      try {
        const stored = localStorage.getItem("tindy-v2-preferences")
        if (stored) return JSON.parse(stored)
      } catch {}
      return {
        "Email notifications": true,
        "Project invitations": true,
        "New recommendations": true,
        "Team announcements": true,
      }
    },
  )
  const [email, setEmail] = useState(profile.email)
  const [activeSection, setActiveSection] = useState("account")

  // ScrollSpy to highlight the active section when the page enters its region
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ["account", "preferences", "privacy"]
      const triggerY = 220

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i])
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= triggerY) {
            setActiveSection(sectionIds[i])
            return
          }
        }
      }
      setActiveSection("account")
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Smooth scroll handler when clicking navigation item
  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      const topOffset = 28
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - topOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
      window.history.replaceState(null, "", `#${id}`)
    }
  }

  // Handle initial hash in URL (e.g. /settings#preferences)
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.replace("#", "")
      if (["account", "preferences", "privacy"].includes(hash)) {
        window.setTimeout(() => {
          scrollToSection(hash)
        }, 120)
      }
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Your workspace, your way."
        description="Manage your account and choose what keeps you in the loop."
      />
      <div className="settings-layout">
        <aside
          className="settings-sidebar"
          style={{
            position: "sticky",
            top: "24px",
            alignSelf: "start",
            height: "fit-content",
            zIndex: 20,
          }}
        >
          <button
            type="button"
            className={`settings-nav-item ${activeSection === "account" ? "active" : ""}`}
            onClick={() => scrollToSection("account")}
          >
            <GraduationCap size={16} />
            <span>Account</span>
          </button>
          <button
            type="button"
            className={`settings-nav-item ${activeSection === "preferences" ? "active" : ""}`}
            onClick={() => scrollToSection("preferences")}
          >
            <Bell size={16} />
            <span>Notifications</span>
          </button>
          <button
            type="button"
            className={`settings-nav-item ${activeSection === "privacy" ? "active" : ""}`}
            onClick={() => scrollToSection("privacy")}
          >
            <ShieldCheck size={16} />
            <span>Privacy & security</span>
          </button>
        </aside>
        <div className="settings-content">
          <form
            id="account"
            className={`panel settings-panel ${activeSection === "account" ? "active-section" : ""}`}
            onSubmit={(event) => {
              event.preventDefault()
              setProfile({ ...profile, email })
              notify("Account preferences saved")
            }}
          >
            <h2>Account</h2>
            <label className="field">
              Email address
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <Button>
              Save changes <Check size={15} />
            </Button>
          </form>
          <section
            id="preferences"
            className={`panel settings-panel ${activeSection === "preferences" ? "active-section" : ""}`}
          >
            <h2>Notifications</h2>
            <p>Keep the important updates. Leave the noise.</p>
            {Object.entries(preferences).map(([label, value]) => (
              <label className="toggle-row" key={label}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={value}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      [label]: event.target.checked,
                    })
                  }
                />
              </label>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.setItem(
                  "tindy-v2-preferences",
                  JSON.stringify(preferences),
                )
                notify("Notification preferences saved")
              }}
            >
              Save preferences
            </Button>
          </section>
          <section
            id="privacy"
            className={`panel settings-panel ${activeSection === "privacy" ? "active-section" : ""}`}
          >
            <h2>Privacy & security</h2>
            <p>
              Your profile is visible to the FCAJ community. Other users and
              project creators can review it when you connect.
            </p>
            <div className="trust-note">
              <ShieldCheck size={17} />
              <span>
                This is an interactive frontend prototype. Cognito
                authentication, storage, AI services, and real-time
                communication are not connected.
              </span>
            </div>
            <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <Link to="/login" className="btn btn-secondary">
                <LogOut size={15} />
                Sign out of demo
              </Link>
            </div>
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Community Support Coordinator</div>
              <p style={{ margin: '4px 0 10px', fontSize: '11px' }}>Have questions about projects or matching? Reach out directly.</p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <a href="mailto:support@fcaj.community" className="text-link" style={{ gap: '4px' }}>
                  <Mail size={13} /> support@fcaj.community
                </a>
                <a href="tel:+8418006868" className="text-link" style={{ gap: '4px' }}>
                  <Phone size={13} /> +84 (0) 1800 6868
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default SettingsScreen
