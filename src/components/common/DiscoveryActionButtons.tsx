import React, { useState, useRef, useEffect, useCallback, ReactNode } from "react"
import { X, Star, Heart } from "lucide-react"

// Sparkle particle definitions for Star action (3 subtle micro-sparkles)
export const STAR_SPARKLES = [
  { id: 1, dx: 11, dy: -10, size: 5, color: "#0284c7", delay: 0 },
  { id: 2, dx: -12, dy: -7, size: 4, color: "#38bdf8", delay: 15 },
  { id: 3, dx: 1, dy: 13, size: 4.5, color: "#7dd3fc", delay: 10 },
]

// Emerald micro-particle definitions for Interested action (3 subtle dots)
export const HEART_PARTICLES = [
  { id: 1, dx: 11, dy: -9, size: 4, color: "#10b981", delay: 0 },
  { id: 2, dx: -11, dy: -8, size: 3.5, color: "#34d399", delay: 10 },
  { id: 3, dx: 0, dy: 11, size: 4, color: "#059669", delay: 15 },
]

export interface SkipActionButtonProps {
  onClick: () => void | Promise<void>
  disabled?: boolean
  title?: string
  className?: string
  iconSize?: number
  strokeWidth?: number
  children?: ReactNode
  ariaLabel?: string
  showIcon?: boolean
}

export function SkipActionButton({
  onClick,
  disabled = false,
  title = "Skip recommendation",
  className = "",
  iconSize = 15,
  strokeWidth = 2.5,
  children,
  ariaLabel = "Skip",
  showIcon = true,
}: SkipActionButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (disabled || busyRef.current) return

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      if (!prefersReduced) {
        if (timerRef.current) window.clearTimeout(timerRef.current)
        setIsPressed(true)
        timerRef.current = window.setTimeout(() => {
          setIsPressed(false)
          timerRef.current = null
        }, 220)
      }

      busyRef.current = true
      try {
        await onClick()
      } catch (err) {
        console.error("Skip action error", err)
      } finally {
        window.setTimeout(() => {
          busyRef.current = false
        }, 220)
      }
    },
    [disabled, onClick],
  )

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`skip-micro-btn ${isPressed ? "is-active" : ""} ${className}`.trim()}
      title={title}
      aria-label={ariaLabel}
    >
      {showIcon && (
        <X
          size={iconSize}
          strokeWidth={strokeWidth}
          className={`skip-micro-icon ${isPressed ? "is-active" : ""}`}
        />
      )}
      {children}
    </button>
  )
}

export interface StarActionButtonProps {
  starred?: boolean
  onToggle: () => void | Promise<void>
  disabled?: boolean
  title?: string
  className?: string
  iconSize?: number
  children?: ReactNode
  ariaLabel?: string
  isActionTrigger?: boolean
}

export function StarActionButton({
  starred = false,
  onToggle,
  disabled = false,
  title,
  className = "",
  iconSize = 16,
  children,
  ariaLabel,
  isActionTrigger = false,
}: StarActionButtonProps) {
  const [isPopping, setIsPopping] = useState(false)
  const [isUnselecting, setIsUnselecting] = useState(false)
  const [popKey, setPopKey] = useState(0)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (disabled || busyRef.current) return

      const willBeStarred = isActionTrigger ? true : !starred
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      if (!willBeStarred) {
        // Unselecting: gentle shrink feedback, NO sparkles
        if (timerRef.current) window.clearTimeout(timerRef.current)
        setIsPopping(false)
        if (!prefersReduced) {
          setIsUnselecting(true)
          timerRef.current = window.setTimeout(() => {
            setIsUnselecting(false)
            timerRef.current = null
          }, 200)
        }
      }

      busyRef.current = true
      try {
        await onToggle()

        if (willBeStarred && !prefersReduced) {
          if (timerRef.current) window.clearTimeout(timerRef.current)
          setIsUnselecting(false)
          setIsPopping(true)
          setPopKey((k) => k + 1)
          timerRef.current = window.setTimeout(() => {
            setIsPopping(false)
            timerRef.current = null
          }, 320)
        }
      } catch (err) {
        if (timerRef.current) window.clearTimeout(timerRef.current)
        setIsPopping(false)
        setIsUnselecting(false)
        console.error("Star action error", err)
      } finally {
        window.setTimeout(() => {
          busyRef.current = false
        }, 240)
      }
    },
    [disabled, starred, isActionTrigger, onToggle],
  )

  const defaultTitle = isActionTrigger
    ? "Save for later"
    : starred
    ? "Remove from saved"
    : "Save for later"
  const defaultAriaLabel = isActionTrigger
    ? "Save for later"
    : starred
    ? "Saved"
    : "Save for later"

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`star-micro-btn ${isPopping ? "is-active" : ""} ${className}`.trim()}
      title={title || defaultTitle}
      aria-label={ariaLabel || defaultAriaLabel}
      aria-pressed={!isActionTrigger ? starred : undefined}
    >
      <span className="star-micro-icon-wrapper">
        <Star
          key={popKey}
          size={iconSize}
          className={`star-micro-icon ${
            isPopping ? "is-popping" : isUnselecting ? "is-unselecting" : ""
          }`}
          fill={starred || isActionTrigger ? "currentColor" : "none"}
        />
        {isPopping && (
          <>
            <span className="star-micro-aura" aria-hidden="true" />
            <span className="star-micro-sparkles-container" aria-hidden="true">
              {STAR_SPARKLES.map((sp) => (
                <span
                  key={`${popKey}-${sp.id}`}
                  className="star-micro-sparkle"
                  style={
                    {
                      "--sp-dx": `${sp.dx}px`,
                      "--sp-dy": `${sp.dy}px`,
                      animationDelay: `${sp.delay}ms`,
                      color: sp.color,
                    } as React.CSSProperties
                  }
                >
                  <svg
                    width={sp.size}
                    height={sp.size}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ display: "block" }}
                  >
                    <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
                  </svg>
                </span>
              ))}
            </span>
          </>
        )}
      </span>
      {children}
    </button>
  )
}

export interface InterestedActionButtonProps {
  interested?: boolean
  onClick: () => void | Promise<void>
  disabled?: boolean
  title?: string
  className?: string
  iconSize?: number
  children?: ReactNode
  ariaLabel?: string
  isActionTrigger?: boolean
}

export function InterestedActionButton({
  interested = false,
  onClick,
  disabled = false,
  title,
  className = "",
  iconSize = 15,
  children,
  ariaLabel,
  isActionTrigger = false,
}: InterestedActionButtonProps) {
  const [isPopping, setIsPopping] = useState(false)
  const [isGlowing, setIsGlowing] = useState(false)
  const [popKey, setPopKey] = useState(0)
  const timerRef = useRef<number | null>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (disabled || busyRef.current) return

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      busyRef.current = true
      try {
        await onClick()

        if (!prefersReduced) {
          if (timerRef.current) window.clearTimeout(timerRef.current)
          setIsPopping(true)
          setIsGlowing(true)
          setPopKey((k) => k + 1)
          timerRef.current = window.setTimeout(() => {
            setIsPopping(false)
            setIsGlowing(false)
            timerRef.current = null
          }, 350)
        }
      } catch (err) {
        if (timerRef.current) window.clearTimeout(timerRef.current)
        setIsPopping(false)
        setIsGlowing(false)
        console.error("Interested action error", err)
      } finally {
        window.setTimeout(() => {
          busyRef.current = false
        }, 260)
      }
    },
    [disabled, onClick],
  )

  const defaultTitle = isActionTrigger
    ? "Mark Interested"
    : interested
    ? "Interest Confirmed"
    : "Mark Interested"
  const defaultAriaLabel = isActionTrigger
    ? "Interested"
    : interested
    ? "Interest Confirmed"
    : "Mark Interested"

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`interested-micro-btn ${isPopping ? "is-active" : ""} ${
        isGlowing ? "is-glow" : ""
      } ${className}`.trim()}
      title={title || defaultTitle}
      aria-label={ariaLabel || defaultAriaLabel}
      aria-pressed={!isActionTrigger ? interested : undefined}
    >
      <span className="heart-micro-icon-wrapper">
        <Heart
          key={popKey}
          size={iconSize}
          className={`heart-micro-icon ${isPopping ? "is-popping" : ""}`}
          fill={interested || isActionTrigger ? "currentColor" : "none"}
        />
        {isPopping && (
          <>
            <span className="heart-micro-aura" aria-hidden="true" />
            <span className="heart-micro-particles-container" aria-hidden="true">
              {HEART_PARTICLES.map((hp) => (
                <span
                  key={`${popKey}-${hp.id}`}
                  className="heart-micro-particle"
                  style={
                    {
                      "--hp-dx": `${hp.dx}px`,
                      "--hp-dy": `${hp.dy}px`,
                      animationDelay: `${hp.delay}ms`,
                      color: hp.color,
                    } as React.CSSProperties
                  }
                >
                  <svg
                    width={hp.size}
                    height={hp.size}
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    style={{ display: "block" }}
                  >
                    <circle cx="5" cy="5" r="4" />
                  </svg>
                </span>
              ))}
            </span>
          </>
        )}
      </span>
      {children}
    </button>
  )
}
