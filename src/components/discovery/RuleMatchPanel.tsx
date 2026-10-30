import type { RuleMatch } from "../../types/discovery"
import { ArrowUpRight, BriefcaseBusiness, Check, ChevronDown, CircleHelp, Info, Sparkles } from "lucide-react"
import MatchScoreRing from "./MatchScoreRing"
import SkillIcon from "../onboarding/SkillIcon"
import "./rule-match.css"

const labels: Record<string, string> = { required_skills: "Required skills", preferred_role: "Preferred role", availability: "Availability", optional_skills: "Optional skills" }

export default function RuleMatchPanel({ match, variant = "default", projectName, onExplain, onViewDetails }: {
  match: RuleMatch; variant?: "default" | "discovery" | "sidebar"; projectName?: string; onExplain?: () => void; onViewDetails?: () => void
}) {
  if (variant !== "default") return <section className={`live-match-inspector${variant === "sidebar" ? " rule-match-sidebar" : ""}`} aria-label="Match Inspector">
    <header><div><span className="live-discovery__eyebrow">MATCH INSPECTOR</span><strong>Your compatibility</strong></div>{onExplain && <button type="button" onClick={onExplain}>Details <ArrowUpRight size={13} /></button>}</header>
    <div className="live-match-inspector__project"><h2>{projectName}</h2><p>{match.best_position.title}</p></div>
    <div className="live-match-inspector__score"><MatchScoreRing score={match.match_score} compact /><div><strong>Rule-based match</strong><span>A fit based on your profile</span></div></div>
    <div className="live-match-inspector__factors"><span className="live-discovery__eyebrow">SCORING FACTORS</span>{match.match_factors.map(factor => {
      const value = factor.factor === null ? null : Number((factor.factor * 100).toFixed(2))
      return <div className="live-match-inspector__factor" key={factor.name}><div><span>{labels[factor.name] ?? factor.name}</span><span>{value === null ? <em>Unknown / excluded</em> : <strong>{value}%</strong>}<small> ({Number(factor.normalized_weight.toFixed(2))}% weight)</small></span></div>
        {value === null ? <div className="live-match-inspector__unknown"><CircleHelp size={12} />Not enough profile information</div> : <div className="live-match-inspector__track" role="progressbar" aria-label={labels[factor.name] ?? factor.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>}</div>
    })}</div>
    <div className="live-match-inspector__summary"><span className="live-discovery__eyebrow">SKILL SUMMARY</span><p><Check size={14} /><span><strong>Matched: </strong>{match.matched_skills.map(skill => skill.name).join(", ") || "None"}</span></p>{match.missing_skills.length > 0 && <p className="live-match-inspector__gaps"><CircleHelp size={14} /><span><strong>To grow: </strong>{match.missing_skills.map(skill => skill.name).join(", ")}</span></p>}
      {match.data_incomplete && <p className="live-discovery__muted">Some profile data is unknown. View Details for the full explanation.</p>}</div>
    <p className="live-match-inspector__note">The project leader makes the final decision.</p>
    {onViewDetails && <button type="button" className="live-match-inspector__inspect" onClick={onViewDetails}>Inspect project <ArrowUpRight size={14} /></button>}
  </section>
  return <section className="rule-match-panel" aria-label="Rule-based match explanation" data-match-details-score={match.match_score}>
    <div className="rule-match__hero"><MatchScoreRing score={match.match_score} large /><div><span className="rule-match__eyebrow"><Sparkles size={12} />RULE-BASED COMPATIBILITY</span><h2>Your position match</h2>{projectName && <p className="rule-match__project-name">{projectName}</p>}<p>How your profile fits this project's position.</p></div></div>
    <div className="rule-match__position"><div><BriefcaseBusiness size={18} /><div><strong>{match.best_position.title}</strong><span>{match.best_position.role_name !== match.best_position.title ? `${match.best_position.role_name} · ` : ""}{match.best_position.experience_level.replace(/_/g, " ")} expectation</span></div></div><span className="rule-match__slots">{match.best_position.remaining_slots} {match.best_position.remaining_slots === 1 ? "slot" : "slots"} remaining</span></div>
    <p className="rule-match__explanation">{match.explanation}</p>
    {match.data_incomplete && <p role="note" className="rule-match__notice"><Info size={16} /><span>Some profile information is missing. Unknown factors are marked below rather than treated as a zero match.</span></p>}
    <div className="rule-match__section-heading"><h3>What shapes your score</h3><span>{match.match_factors.length} factors</span></div>
    <div className="rule-match__factors">{match.match_factors.map(factor => {
      const value = factor.factor === null ? null : Number((factor.factor * 100).toFixed(2))
      return <div className={`rule-match__factor${value === null ? " is-unknown" : ""}`} key={factor.name}>
        <div className="rule-match__factor-heading"><strong>{labels[factor.name] ?? factor.name}</strong><span>{value === null ? "Unknown / excluded" : `${value}%`}</span></div>
        {value === null ? <div className="rule-match__unknown"><CircleHelp size={13} />Not enough profile information</div> : <div className="rule-match__track" role="progressbar" aria-label={labels[factor.name] ?? factor.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>}
        <div className="rule-match__factor-meta"><span>{Number(factor.normalized_weight.toFixed(2))}% weight</span><span>{Number(factor.contribution.toFixed(2))} points</span></div>
      </div>
    })}</div>
    <div className="rule-match__skills">{[{ label: "Matched skills", skills: match.matched_skills, matched: true }, { label: "Missing skills", skills: match.missing_skills, matched: false }].map(group => <section className={group.matched ? "is-matched" : "is-missing"} key={group.label}>
      <h3>{group.matched ? <Check size={15} /> : <CircleHelp size={15} />}{group.label}<span>{group.skills.length}</span></h3>
      {group.skills.length ? <ul>{group.skills.map(skill => <li key={skill.skill_id}><SkillIcon name={skill.name} size={13} /><span>{skill.name}<small>{skill.is_required ? "Required" : "Optional"}</small></span></li>)}</ul> : <p>{group.matched ? "No matched skills for this position." : "No unmatched skills for this position."}</p>}
    </section>)}</div>
    <details className="rule-match__calculation"><summary>About this calculation<ChevronDown size={14} /></summary><p>This rule-based score uses the percentages, weights and points shown above.</p><p>Experience expectation is descriptive. Experiences and certificates do not add match points.</p></details>
    <p className="rule-match__footer"><Info size={14} /><span>Compatibility describes your fit. The project leader makes the final decision.</span></p>
  </section>
}
