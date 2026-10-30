import "./rule-match.css"

export default function MatchScoreRing({ score, compact = false, large = false, serverValue = false }: {
  score: number; compact?: boolean; large?: boolean; serverValue?: boolean
}) {
  const radius = 25
  const circumference = 2 * Math.PI * radius
  return <div className={`rule-match-ring${compact ? " rule-match-ring--compact" : large ? " rule-match-ring--large" : ""}`} data-tone={score < 35 ? "low" : score <= 65 ? "moderate" : "high"} role="img" aria-label={`${score}% rule-based match`}>
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <circle className="rule-match-ring__track" cx="30" cy="30" r={radius} />
      <circle className="rule-match-ring__value" cx="30" cy="30" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
    </svg>
    <span className="rule-match-ring__text"><strong data-server-match-score={serverValue ? "" : undefined}>{score}%</strong><small>MATCH</small></span>
  </div>
}
