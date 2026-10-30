import type { RuleMatch } from "../../types/discovery"

const labels: Record<string, string> = { required_skills: "Required skills", preferred_role: "Preferred role", availability: "Availability", optional_skills: "Optional skills" }

export default function RuleMatchPanel({ match }: { match: RuleMatch }) {
  return <section className="panel space-y-3" aria-label="Rule-based match explanation">
    <div className="insight-label">RULE-BASED MATCH · {match.algorithm_version}</div>
    <h2>{match.match_score}% compatibility</h2>
    <p>{match.explanation}</p>
    <p><strong>{match.best_position.title}</strong> · {match.best_position.role_name} · {match.best_position.remaining_slots} remaining slots</p>
    <small>Leader expectation: {match.best_position.experience_level.replace(/_/g, " ")} (display only)</small>
    {match.data_incomplete && <p role="note" className="field-helper">Some profile data is missing. Unknown factors are marked below; no experience or certificate bonus is added.</p>}
    <dl className="space-y-2">{match.match_factors.map(factor => <div key={factor.name} className="flex justify-between gap-3 text-sm">
      <dt>{labels[factor.name] ?? factor.name} <small>({Number(factor.normalized_weight.toFixed(2))}% weight)</small></dt>
      <dd>{factor.factor === null ? "Unknown / excluded" : `${Number((factor.factor * 100).toFixed(2))}% · ${Number(factor.contribution.toFixed(2))} points`}</dd>
    </div>)}</dl>
    <p><strong>Matched skills:</strong> {match.matched_skills.length ? match.matched_skills.map(s => s.name).join(", ") : "None"}</p>
    <p><strong>Unmatched skills:</strong> {match.missing_skills.length ? match.missing_skills.map(s => `${s.name}${s.is_required ? " (required)" : " (optional)"}`).join(", ") : "None"}</p>
    <small>Compatibility summarizes these rules; acceptance is decided by the project leader.</small>
  </section>
}
