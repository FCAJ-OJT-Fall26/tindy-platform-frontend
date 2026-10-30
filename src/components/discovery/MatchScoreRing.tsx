import { useEffect, useState } from "react"
import { getMatchTier } from "../../utils/matchTier"
import "./rule-match.css"

export default function MatchScoreRing({
  score,
  compact = false,
  large = false,
  serverValue = false,
}: {
  score: number
  compact?: boolean
  large?: boolean
  serverValue?: boolean
}) {
  const radius = 25
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setAnimatedScore(clamped)
      return
    }

    setAnimatedScore(0)
    let rafId = 0
    const duration = 850
    let startTime: number | null = null

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 2.4)
      setAnimatedScore(eased * clamped)
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        setAnimatedScore(clamped)
      }
    }
    rafId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(rafId)
  }, [clamped])

  const displayScore = Math.round(animatedScore)
  const tier = getMatchTier(displayScore)

  return (
    <div
      className={`rule-match-ring${compact ? " rule-match-ring--compact" : large ? " rule-match-ring--large" : ""}`}
      data-tone={tier.tier}
      style={{ color: tier.stroke }}
      role="img"
      aria-label={`${score}% rule-based match`}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle
          className="rule-match-ring__track"
          cx="30"
          cy="30"
          r={radius}
          style={{ stroke: tier.trackStroke }}
        />
        <circle
          className="rule-match-ring__value"
          cx="30"
          cy="30"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - animatedScore / 100)}
          style={{ stroke: tier.stroke, transition: "none" }}
        />
      </svg>
      <span className="rule-match-ring__text">
        <strong data-server-match-score={serverValue ? "" : undefined}>
          {displayScore}%
        </strong>
        <small>MATCH</small>
      </span>
    </div>
  )
}
