import type { ReactNode } from "react"
import { LoaderCircle, type LucideIcon } from "lucide-react"

export default function PipelineState({
  icon: Icon,
  title,
  description,
  kind = "empty",
  children,
}: {
  icon?: LucideIcon
  title?: string
  description: string
  kind?: "empty" | "loading" | "error" | "prompt"
  children?: ReactNode
}) {
  return (
    <div
      className={`panel pipeline-state pipeline-state--${kind}`}
      role={kind === "loading" || kind === "prompt" ? "status" : kind === "error" ? "alert" : undefined}
    >
      {kind === "loading" ? (
        <LoaderCircle size={22} className="pipeline-spinner" aria-hidden="true" />
      ) : Icon ? (
        <span className="pipeline-state-icon"><Icon size={24} aria-hidden="true" /></span>
      ) : null}
      {title && <h3>{title}</h3>}
      <p>{description}</p>
      {children}
    </div>
  )
}
