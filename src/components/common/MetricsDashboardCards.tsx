import React from "react"
import { Link } from "react-router"
import "./metric-cards.css"

/* --- Animated Metric Counter (Ease-out transitions from 0 to value) --- */

export function AnimatedMetricValue({ value }: { value: React.ReactNode }) {
  const [displayValue, setDisplayValue] = React.useState<React.ReactNode>(() => {
    if (typeof value === "number") return 0
    if (typeof value === "string") {
      const match = value.match(/^(\d+)(.*)$/)
      if (match) return `0${match[2]}`
    }
    return value
  })

  const prevValueRef = React.useRef<number>(0)

  React.useEffect(() => {
    if (typeof value === "number") {
      const start = prevValueRef.current
      const end = value
      prevValueRef.current = end
      if (start === end) {
        setDisplayValue(end)
        return
      }

      const duration = 750
      const startTime = performance.now()
      let rafId: number

      const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        const current = Math.round(start + (end - start) * ease)
        setDisplayValue(current)

        if (progress < 1) {
          rafId = requestAnimationFrame(step)
        }
      }

      rafId = requestAnimationFrame(step)
      return () => cancelAnimationFrame(rafId)
    }

    if (typeof value === "string") {
      const match = value.match(/^(\d+)(.*)$/)
      if (match) {
        const start = prevValueRef.current
        const end = parseInt(match[1], 10)
        const suffix = match[2]
        prevValueRef.current = end

        if (start === end) {
          setDisplayValue(value)
          return
        }

        const duration = 750
        const startTime = performance.now()
        let rafId: number

        const step = (now: number) => {
          const elapsed = now - startTime
          const progress = Math.min(1, elapsed / duration)
          const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
          const current = Math.round(start + (end - start) * ease)
          setDisplayValue(`${current}${suffix}`)

          if (progress < 1) {
            rafId = requestAnimationFrame(step)
          }
        }

        rafId = requestAnimationFrame(step)
        return () => cancelAnimationFrame(rafId)
      }
      setDisplayValue(value)
    } else {
      setDisplayValue(value)
    }
  }, [value])

  return <span className="metric-animated-value">{displayValue}</span>
}

/* --- Shared Micro Visual Components --- */

export function SparklineBars({
  bars = [
    { height: 26, color: "#1e40af" },
    { height: 32, color: "#2563eb" },
    { height: 22, color: "#93c5fd" },
    { height: 25, color: "#bfdbfe" },
    { height: 20, color: "#c7d2fe" },
    { height: 28, color: "#bfdbfe" },
    { height: 23, color: "#dbeafe" },
  ],
}: {
  bars?: Array<{ height: number; color: string }>
}) {
  return (
    <div className="metric-bars-wrap" aria-hidden="true">
      {bars.map((bar, i) => (
        <span
          key={i}
          className="metric-bar-pill"
          style={{
            height: `${bar.height}px`,
            backgroundColor: bar.color,
            animationDelay: `${i * 50 + 100}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function CategoryBreakdown({
  items,
}: {
  items: Array<{ label: string; count: number; pct: number; color?: string }>
}) {
  return (
    <div className="metric-breakdown-list">
      {items.map((item, i) => (
        <div key={i} className="metric-breakdown-item">
          <div className="metric-breakdown-meta">
            <span>{item.label}</span>
            <strong>
              <AnimatedMetricValue value={item.count} />
            </strong>
          </div>
          <div className="metric-breakdown-track">
            <div
              className="metric-breakdown-fill"
              style={{
                width: `${Math.max(8, Math.min(100, item.pct))}%`,
                backgroundColor: item.color || "#0d9488",
                animationDelay: `${i * 100 + 150}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CapsuleSlots({
  filled = 3,
  total = 5,
  label = "3/5 seats",
  variant = "seats",
}: {
  filled?: number
  total?: number
  label?: string
  variant?: "seats" | "faint"
}) {
  if (variant === "faint") {
    return (
      <div className="metric-capsules-wrap" aria-hidden="true">
        <div className="metric-capsules-row">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="metric-capsule-pill faint"
              style={{ animationDelay: `${i * 40 + 80}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="metric-capsules-wrap">
      <div className="metric-capsules-row" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`metric-capsule-pill ${i < filled ? "filled" : "empty"}`}
            style={{ animationDelay: `${i * 50 + 100}ms` }}
          />
        ))}
      </div>
      {label && <span className="metric-capsules-label">{label}</span>}
    </div>
  )
}

export function DonutProgressRing({
  pct = 100,
  strokeColor = "#0d9488",
  trackColor = "#f1f5f9",
  size = 46,
}: {
  pct?: number
  strokeColor?: string
  trackColor?: string
  size?: number
}) {
  const radius = 17
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))
  const targetOffset = circumference * (1 - clamped / 100)

  // Start with full circumference so the stroke draws clockwise on mount
  const [dashoffset, setDashoffset] = React.useState(circumference)

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDashoffset(targetOffset)
    })
    return () => cancelAnimationFrame(frame)
  }, [targetOffset])

  return (
    <div
      className="metric-ring-wrap"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg className="metric-ring-svg" viewBox="0 0 46 46">
        <circle
          className="metric-ring-bg"
          cx="23"
          cy="23"
          r={radius}
          style={{ stroke: trackColor }}
        />
        <circle
          className="metric-ring-fill"
          cx="23"
          cy="23"
          r={radius}
          style={{
            stroke: strokeColor,
            strokeDasharray: circumference,
            strokeDashoffset: dashoffset,
          }}
        />
      </svg>
    </div>
  )
}

/* --- Metric Card Wrapper --- */

export interface MetricCardProps {
  label: string
  value: React.ReactNode
  subtitle: string
  visual: React.ReactNode
  footerLeft: string
  actionLabel: string
  actionTo: string
  index?: number
}

export function MetricCard({
  label,
  value,
  subtitle,
  visual,
  footerLeft,
  actionLabel,
  actionTo,
  index = 0,
}: MetricCardProps) {
  return (
    <article
      className="metric-card"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="metric-card-header">{label}</div>
      <div className="metric-card-body">
        <div className="metric-card-main">
          <div className="metric-card-value">
            <AnimatedMetricValue value={value} />
          </div>
          <div className="metric-card-subtitle">{subtitle}</div>
        </div>
        <div className="metric-card-visual">{visual}</div>
      </div>
      <div className="metric-card-footer">
        <span className="metric-footer-text">{footerLeft}</span>
        <Link to={actionTo} className="metric-footer-action">
          {actionLabel}
        </Link>
      </div>
    </article>
  )
}
