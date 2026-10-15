import { useEffect, useState } from "react"
import { Check, Code2 } from "lucide-react"
import { getProfessionalRolesApi } from "../../services"
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
  const [roles, setRoles] = useState<ProfessionalRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    getProfessionalRolesApi(undefined, controller.signal)
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
          {roles.map((role) => (
            <button
              type="button"
              key={role.professional_role_id}
              aria-pressed={selectedId === role.professional_role_id}
              className={
                selectedId === role.professional_role_id ? "selected" : ""
              }
              onClick={() => onChange(role)}
            >
              <Code2 size={18} />
              <span>
                <strong>{role.name}</strong>
                {role.description && <small>{role.description}</small>}
              </span>
              {selectedId === role.professional_role_id && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
      {!selectedId && roles.length > 0 && (
        <p className="catalog-selection-hint">Choose one role to continue.</p>
      )}
    </div>
  )
}
