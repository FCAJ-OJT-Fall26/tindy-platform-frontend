import { Link } from "react-router"
import { Mail, Phone } from "lucide-react"
import { Brand } from "../ui"

export default function Footer() {
  return (
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
          <Link to="/privacypolicy" className="footer-nav-link">Privacy & Policy</Link>
          <span className="footer-sep">·</span>
          <Link to="/termsofservice" className="footer-nav-link">Terms of Service</Link>
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
  )
}
