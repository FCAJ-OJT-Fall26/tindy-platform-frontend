import { useEffect, useState } from "react"
import {
  Brain,
  Briefcase,
  Check,
  Cloud,
  Code2,
  Database,
  Gamepad2,
  Infinity,
  Layers,
  Layout,
  LineChart,
  Palette,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
} from "lucide-react"

function getRoleIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes("backend")) return Server
  if (lower.includes("frontend")) return Layout
  if (lower.includes("full-stack") || lower.includes("fullstack")) return Layers
  if (
    lower.includes("ai") ||
    lower.includes("machine learning") ||
    lower.includes("intelligence") ||
    lower.includes("llm")
  ) {
    return Brain
  }
  if (lower.includes("cloud")) return Cloud
  if (
    lower.includes("ui") ||
    lower.includes("ux") ||
    lower.includes("design")
  ) {
    return Palette
  }
  if (
    lower.includes("mobile") ||
    lower.includes("android") ||
    lower.includes("ios") ||
    lower.includes("flutter") ||
    lower.includes("react native")
  ) {
    return Smartphone
  }
  if (
    lower.includes("devops") ||
    lower.includes("sre") ||
    lower.includes("infrastructure")
  ) {
    return Infinity
  }
  if (
    lower.includes("data") ||
    lower.includes("database")
  ) {
    return Database
  }
  if (
    lower.includes("qa") ||
    lower.includes("quality") ||
    lower.includes("test")
  ) {
    return ShieldCheck
  }
  if (
    lower.includes("business") ||
    lower.includes("analyst") ||
    lower.includes("analytics")
  ) {
    return LineChart
  }
  if (
    lower.includes("security") ||
    lower.includes("cyber") ||
    lower.includes("infosec")
  ) {
    return Shield
  }
  if (
    lower.includes("product") ||
    lower.includes("project") ||
    lower.includes("scrum") ||
    lower.includes("leader")
  ) {
    return Briefcase
  }
  if (lower.includes("game")) return Gamepad2
  return Code2
}
import { getProfessionalRolesApi, getCachedRoles } from "../../services"
import type { ProfessionalRole } from "../../types/catalog"
import { requestErrorMessage } from "./catalogFeedback"

interface Props {
  selectedId: string | null
  selectedName: string | null
  onChange: (role: ProfessionalRole) => void
  onNameResolved: (name: string) => void
  onValidityChange: (valid: boolean) => void
}

export default function ProfessionalRoleSelector({
  selectedId,
  selectedName,
  onChange,
  onNameResolved,
  onValidityChange,
}: Props) {
  const cachedRoles = getCachedRoles()
  const [roles, setRoles] = useState<ProfessionalRole[]>(() =>
    cachedRoles
      ? [...cachedRoles].sort((a, b) => a.display_order - b.display_order)
      : [],
  )
  const [loading, setLoading] = useState(() => !cachedRoles)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (roles.length > 0 && retry === 0) return
    const controller = new AbortController()
    setLoading(true)
    setError("")
    getProfessionalRolesApi(undefined, controller.signal, retry > 0)
      .then((data) => {
        if (!controller.signal.aborted)
          setRoles([...data].sort((a, b) => a.display_order - b.display_order))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(requestErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [retry])

  const selectedRole = roles.find(
    (role) => role.professional_role_id === selectedId,
  )
  const valid = !loading && !error && Boolean(selectedRole)
  useEffect(() => {
    onValidityChange(valid)
  }, [valid, onValidityChange])
  useEffect(() => {
    if (selectedRole && !loading && !error) onNameResolved(selectedRole.name)
  }, [selectedRole, loading, error, onNameResolved])

  if (loading)
    return (
      <p className="catalog-feedback" role="status">
        Loading professional roles…
      </p>
    )
  if (error)
    return (
      <div className="catalog-feedback" role="alert">
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry roles
        </button>
      </div>
    )

  return (
    <div>
      {selectedId && !selectedRole && (
        <p className="catalog-validation" role="alert">
          {selectedName
            ? `Your saved role, ${selectedName}, is`
            : "Your saved role is"}{" "}
          no longer available. Choose an active role below to continue.
        </p>
      )}
      {roles.length === 0 ? (
        <p className="catalog-feedback">
          No professional roles are available yet.{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => setRetry((value) => value + 1)}
          >
            Check again
          </button>
        </p>
      ) : (
        <div
          className="role-options catalog-role-options"
          aria-label="Preferred professional role"
        >
          {roles.map((role) => {
            const Icon = getRoleIcon(role.name)
            const isSelected = selectedId === role.professional_role_id
            return (
              <button
                type="button"
                key={role.professional_role_id}
                aria-pressed={isSelected}
                className={isSelected ? "selected" : ""}
                onClick={() => onChange(role)}
              >
                <span className="role-icon-wrapper" aria-hidden="true">
                  <Icon size={19} className="role-icon" />
                </span>
                <span>
                  <strong>{role.name}</strong>
                  {role.description && <small>{role.description}</small>}
                </span>
                {isSelected && (
                  <Check size={16} className="role-check-indicator" strokeWidth={2.5} />
                )}
              </button>
            )
          })}
        </div>
      )}
      {!selectedId && roles.length > 0 && (
        <p className="catalog-selection-hint">Choose one role to continue.</p>
      )}
    </div>
  )
}
