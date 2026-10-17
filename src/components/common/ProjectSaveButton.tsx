import React, { useState, useRef, useEffect, useCallback } from "react"
import { Bookmark } from "lucide-react"

export interface StarParticle {
  id: number
  dx: number
  dy: number
  rot: number
  size: number
  delay: number
  color: string
  type: "star" | "sparkle" | "dot"
}

export const BURST_PARTICLES: StarParticle[] = [
  { id: 1, dx: 7, dy: -23, rot: 45, size: 9, delay: 0, color: "#f59e0b", type: "star" },
  { id: 2, dx: 23, dy: -10, rot: 80, size: 11, delay: 20, color: "#304fc5", type: "sparkle" },
  { id: 3, dx: 21, dy: 10, rot: -35, size: 7, delay: 15, color: "#fbbf24", type: "star" },
  { id: 4, dx: 0, dy: 24, rot: 60, size: 9, delay: 35, color: "#6366f1", type: "star" },
  { id: 5, dx: -19, dy: 11, rot: -45, size: 6, delay: 10, color: "#f59e0b", type: "dot" },
  { id: 6, dx: -24, dy: -9, rot: 90, size: 10, delay: 30, color: "#38bdf8", type: "sparkle" },
  { id: 7, dx: -11, dy: -21, rot: -60, size: 8, delay: 15, color: "#fbbf24", type: "star" },
]

export function BookmarkBurst({
  saved,
  isBursting,
  burstKey,
  size = 18,
}: {
  saved: boolean
  isBursting: boolean
  burstKey: number
  size?: number
}) {
  return (
    <span className="project-save-icon-wrapper">
      <Bookmark
        key={burstKey}
        size={size}
        className={`save-bookmark-icon ${isBursting ? "save-bookmark-pop" : ""}`}
        fill={saved ? "currentColor" : "none"}
      />
      {isBursting && (
        <span className="save-burst-container" aria-hidden="true">
          {BURST_PARTICLES.map((p) => (
            <span
              key={`${burstKey}-${p.id}`}
              className="save-burst-particle"
              style={
                {
                  "--star-dx": `${p.dx}px`,
                  "--star-dy": `${p.dy}px`,
                  "--star-rot": `${p.rot}deg`,
                  animationDelay: `${p.delay}ms`,
                  color: p.color,
                } as React.CSSProperties
              }
            >
              {p.type === "star" ? (
                <svg
                  width={p.size}
                  height={p.size}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ display: "block" }}
                >
                  <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
                </svg>
              ) : p.type === "sparkle" ? (
                <svg
                  width={p.size}
                  height={p.size}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ display: "block" }}
                >
                  <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
                </svg>
              ) : (
                <svg
                  width={p.size}
                  height={p.size}
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  style={{ display: "block" }}
                >
                  <circle cx="6" cy="6" r="4.5" />
                </svg>
              )}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

export interface ProjectSaveButtonProps {
  saved: boolean
  onToggle: () => void | Promise<void>
  variant?: "button" | "icon"
  size?: number
  className?: string
  projectName?: string
  disabled?: boolean
  title?: string
}

export default function ProjectSaveButton({
  saved,
  onToggle,
  variant = "icon",
  size,
  className = "",
  projectName,
  disabled = false,
  title,
}: ProjectSaveButtonProps) {
  const [isBursting, setIsBursting] = useState(false)
  const [burstKey, setBurstKey] = useState(0)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  // Clean up any pending burst timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (disabled || busyRef.current) return

      const willBeSaved = !saved

      if (!willBeSaved) {
        // If un-saving, stop any active burst immediately
        if (timerRef.current) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }
        setIsBursting(false)
      }

      busyRef.current = true
      try {
        await onToggle()

        // Trigger burst ONLY if successfully transitioning to saved state
        if (willBeSaved) {
          const prefersReduced =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

          if (!prefersReduced) {
            if (timerRef.current) {
              window.clearTimeout(timerRef.current)
            }
            setIsBursting(true)
            setBurstKey((k) => k + 1)
            timerRef.current = window.setTimeout(() => {
              setIsBursting(false)
              timerRef.current = null
            }, 580)
          }
        }
      } catch (err) {
        // In case of error, ensure burst is cancelled
        if (timerRef.current) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }
        setIsBursting(false)
        console.error("Failed to toggle project save", err)
      } finally {
        window.setTimeout(() => {
          busyRef.current = false
        }, 300)
      }
    },
    [saved, onToggle, disabled],
  )

  const resolvedSize = size ?? (variant === "button" ? 16 : 19)
  const projectLabel = projectName ? ` "${projectName}"` : " project"
  const defaultTitle = saved ? `Remove${projectLabel} from saved` : `Save${projectLabel}`

  if (variant === "button") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={`btn btn-secondary project-save-btn ${saved ? "is-saved" : ""} ${className}`.trim()}
        aria-label={saved ? `Unsave${projectLabel}` : `Save${projectLabel}`}
        aria-pressed={saved}
        title={title || (saved ? "Saved" : "Save project")}
      >
        <BookmarkBurst
          saved={saved}
          isBursting={isBursting}
          burstKey={burstKey}
          size={resolvedSize}
        />
        <span className="project-save-btn-label">{saved ? "Saved" : "Save"}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`icon-button project-save-icon-btn ${saved ? "is-saved" : ""} ${className}`.trim()}
      aria-label={saved ? `Unsave${projectLabel}` : `Save${projectLabel}`}
      aria-pressed={saved}
      title={title || defaultTitle}
    >
      <BookmarkBurst
        saved={saved}
        isBursting={isBursting}
        burstKey={burstKey}
        size={resolvedSize}
      />
    </button>
  )
}
