import { useCallback } from "react"
import type { LiveTeammateCard } from "../../types/teammate"
import useRemoteResource from "../../hooks/useRemoteResource"
import useTeammateSession from "../../hooks/useTeammateSession"
import { getMemberProfile } from "../../services/profile.service"
import MatchScoreRing from "../discovery/MatchScoreRing"
import ProfileMediaImage from "../profile/ProfileMediaImage"
import { Avatar } from "../ui"
import SkillIcon from "../onboarding/SkillIcon"
import { sameId } from "../../services/teammates.service"

export default function LiveCandidateCardContent({
  candidate: card,
  isActive,
  onWhyMatchesClick,
  onViewDetailsClick,
  contextLabel,
}: {
  candidate: LiveTeammateCard
  isActive: boolean
  contextLabel?: string
  onWhyMatchesClick: (event: React.MouseEvent) => void
  onViewDetailsClick: (event: React.MouseEvent) => void
}) {
  const session = useTeammateSession()
  const candidate = card.candidate
  const load = useCallback(
    async (signal: AbortSignal) => {
      const profile = await getMemberProfile(candidate.user_id, signal)
      if (!sameId(profile.user_id, candidate.user_id)) throw Error("Candidate profile identity could not be verified.")
      return profile
    },
    [candidate.user_id],
  )
  const detail = useRemoteResource(
    isActive && session.key ? `${session.key}:${candidate.user_id}` : null,
    load,
  )
  const matched = new Set(card.matching.matched_skills.map((s) => s.skill_id))
  return (
    <article className="teammate-card" data-candidate-id={candidate.user_id}>
      <div className="teammate-card__context">
        <span>{contextLabel ?? card.matching.best_position.title}</span>
        <span>{card.interaction_action ?? "Recommended"}</span>
      </div>
      <div className="teammate-card__body" data-card-scroll role="region" aria-label="Candidate summary" tabIndex={isActive ? 0 : -1} onPointerDown={event => { if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) event.stopPropagation() }}>
        <div className="teammate-card__person">
          {detail.data ? (
            <ProfileMediaImage profile={detail.data} compact />
          ) : (
            <Avatar name={candidate.display_name} size="lg" />
          )}
          <div>
            <h2>{candidate.display_name}</h2>
            <p>{candidate.preferred_role_name ?? "Preferred role unknown"}</p>
            <small>
              {detail.loading
                ? "Loading university…"
                : detail.error
                  ? "University unavailable"
                  : detail.data ? detail.data.university ?? "University not provided" : "University unknown"}
            </small>
          </div>
        </div>
        <p>{candidate.headline ?? "No headline provided."}</p>
        <p>
          {candidate.available_hours_per_week === null
            ? "Availability unknown"
            : `${candidate.available_hours_per_week} hours/week`}{" "}
          · {candidate.experiences_count} experiences ·{" "}
          {candidate.certificates_count} certificates
        </p>
        <div className="teammate-card__score">
          <MatchScoreRing
            score={card.matching.match_score}
            compact
            staticValue
          />
          <div>
            <strong data-teammate-score>
              {card.matching.match_score}% Position Match
            </strong>
            <p>Rule-based Match · {card.matching.algorithm_version}</p>
          </div>
          <button onClick={onWhyMatchesClick} className="text-link">
            Why this match?
          </button>
        </div>
        <div className="chips">
          {candidate.skills.map((s) => (
            <span
              key={s.skill_id}
              className={
                matched.has(s.skill_id) ? "teammate-skill--matched" : ""
              }
            >
              <SkillIcon name={s.name} size={13} />
              {s.name}
            </span>
          ))}
        </div>
        <p className="helper-text">
          Matching Skills:{" "}
          {card.matching.matched_skills.map((s) => s.name).join(", ") || "None"}
        </p>
        <p className="helper-text">
          Missing Skills:{" "}
          {card.matching.missing_skills.map((s) => s.name).join(", ") || "None"}
        </p>
        {card.matching.data_incomplete && (
          <p className="helper-text">
            Some profile data is unknown. The breakdown shows the server's
            treatment.
          </p>
        )}
      </div>
      <button
        type="button"
        className="teammate-card__footer"
        onClick={onViewDetailsClick}
      >
        View Candidate Profile
      </button>
    </article>
  )
}
