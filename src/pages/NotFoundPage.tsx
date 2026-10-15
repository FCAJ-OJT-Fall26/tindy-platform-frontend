import { Link } from "react-router"
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  FolderKanban,
  Users,
  Mail,
} from "lucide-react"

export function NotFound() {
  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "40px auto",
        textAlign: "center",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "80px",
          height: "80px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)",
          color: "var(--primary)",
          fontSize: "30px",
          fontWeight: "800",
          marginBottom: "20px",
          boxShadow: "0 4px 12px rgba(48, 79, 197, 0.12)",
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: "28px",
          letterSpacing: "-0.8px",
          color: "var(--ink)",
          marginBottom: "10px",
        }}
      >
        Page not found
      </h1>
      <p
        className="muted"
        style={{
          fontSize: "13px",
          lineHeight: "1.7",
          maxWidth: "480px",
          margin: "0 auto 30px",
        }}
      >
        The page you are looking for doesn’t exist, has been moved, or is
        temporarily unavailable. Let’s get you back to the opportunities that
        matter.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "40px",
        }}
      >
        <Link
          className="btn btn-primary"
          to="/"
          style={{ padding: "11px 20px" }}
        >
          <LayoutDashboard size={16} />
          Go to Dashboard
        </Link>
        <Link
          className="btn btn-secondary"
          to="/discover"
          style={{ padding: "11px 20px" }}
        >
          <Compass size={16} />
          Discover Projects
        </Link>
        <Link
          className="btn btn-secondary"
          to="/ai"
          style={{ padding: "11px 20px" }}
        >
          <Sparkles size={16} />
          AI Studio
        </Link>
      </div>

      <div
        className="panel"
        style={{
          textAlign: "left",
          padding: "20px",
          background: "#f8fafc",
          borderRadius: "8px",
        }}
      >
        <h3
          style={{
            fontSize: "13px",
            marginBottom: "12px",
            color: "var(--ink)",
          }}
        >
          Need assistance or looking for another section?
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            fontSize: "12px",
          }}
        >
          <Link to="/projects" className="text-link" style={{ gap: "6px" }}>
            <FolderKanban size={14} /> My Projects workspace
          </Link>
          <Link to="/team" className="text-link" style={{ gap: "6px" }}>
            <Users size={14} /> Team workspace
          </Link>
          <a
            href="mailto:support@fcaj.community"
            className="text-link"
            style={{ gap: "6px" }}
          >
            <Mail size={14} /> support@fcaj.community
          </a>
        </div>
      </div>
    </div>
  )
}

export default NotFound
