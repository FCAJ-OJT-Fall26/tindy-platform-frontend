import { useCallback } from "react"
import { ArrowUpRight, BriefcaseBusiness, Clock, GraduationCap } from "lucide-react"
import type { LiveTeammateCard } from "../../types/teammate"
import useRemoteResource from "../../hooks/useRemoteResource"
import useTeammateSession from "../../hooks/useTeammateSession"
import { getMemberProfile } from "../../services/profile.service"
import MatchScoreRing from "../discovery/MatchScoreRing"
import ProfileMediaImage from "../profile/ProfileMediaImage"
import { Avatar } from "../ui"
import SkillIcon from "../onboarding/SkillIcon"
import { sameId } from "../../services/teammates.service"
import "../../pages/discovery/live-discovery.css"

export default function LiveCandidateCardContent({
  candidate: card,
  isActive,
  onWhyMatchesClick,
  onViewDetailsClick,
  contextLabel: _contextLabel,
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
      if (!sameId(profile.user_id, candidate.user_id))
        throw Error("Candidate profile identity could not be verified.")
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
    <article
      className="live-project-card teammate-card"
      data-candidate-id={candidate.user_id}
    >
      {/* Top Banner / University & Role */}
      <div className="live-project-card__top">
        <span className="live-discovery__pill">
          {candidate.preferred_role_name ?? "Candidate"}
        </span>
        <span className="live-project-card__team">
          <GraduationCap size={14} />
          <strong>
            {detail.loading
              ? "Loading…"
              : detail.error
                ? "University unavailable"
                : detail.data?.university || "University not provided"}
          </strong>
        </span>
      </div>

      {/* Main Card Body */}
      <div
        className="live-project-card__body"
        data-card-scroll
        role="region"
        aria-label="Candidate summary"
        tabIndex={isActive ? 0 : -1}
        onPointerDown={(event) => {
          if (event.currentTarget.scrollHeight > event.currentTarget.clientHeight) {
            event.stopPropagation()
          }
        }}
      >
        {/* Candidate Info with Avatar */}
        <div className="live-project-card__intro">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ flexShrink: 0 }}>
              {detail.data ? (
                <ProfileMediaImage profile={detail.data} compact />
              ) : (
                <Avatar name={candidate.display_name} size="lg" />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: 0 }} className="truncate">
                {candidate.display_name}
              </h3>
              <p
                className="live-project-card__tagline truncate"
                style={{ margin: "4px 0 0" }}
              >
                {candidate.headline ||
                  candidate.preferred_role_name ||
                  "Aspiring Engineer"}
              </p>
            </div>
          </div>
        </div>

        {/* Position Match Score Block */}
        <div className="live-project-card__match">
          <div className="live-project-card__match-label">
            <MatchScoreRing score={card.matching.match_score} serverValue />
            <div>
              <strong data-teammate-score>
                {card.matching.match_score}% Position Match
              </strong>
              <span>
                Rule-based Match · {card.matching.algorithm_version}
              </span>
            </div>
          </div>
          <button type="button" onClick={onWhyMatchesClick}>
            Why this match? <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Target Position */}
        <div className="live-project-card__position">
          <div>
            <span className="live-discovery__eyebrow">TARGET POSITION</span>
            <strong>
              <BriefcaseBusiness size={16} />
              {card.matching.best_position.title}
            </strong>
          </div>
          <span className="live-project-card__slots">
            {card.matching.best_position.remaining_slots}{" "}
            {card.matching.best_position.remaining_slots === 1
              ? "slot"
              : "slots"}{" "}
            open
          </span>
        </div>

        {/* Candidate Skills */}
        <div className="live-project-card__skills">
          <span className="live-discovery__eyebrow">SKILLS & TECHNOLOGIES</span>
          <div>
            {candidate.skills.length ? (
              candidate.skills.map((s) => {
                const isMatched = matched.has(s.skill_id)
                return (
                  <span
                    key={s.skill_id}
                    className={`live-project-card__skill${
                      isMatched ? " is-matched" : ""
                    }`}
                  >
                    <SkillIcon name={s.name} size={13} />
                    {s.name}
                  </span>
                )
              })
            ) : (
              <span className="live-discovery__muted">
                No skills specified
              </span>
            )}
          </div>
          {card.matching.missing_skills.length > 0 && (
            <p>
              Missing for position:{" "}
              {card.matching.missing_skills.map((s) => s.name).join(" · ")}
            </p>
          )}
        </div>

        {/* Bottom Meta */}
        <div className="live-project-card__bottom">
          <div className="live-project-card__meta">
            <span>
              <Clock size={15} />
              {candidate.available_hours_per_week !== null
                ? `${candidate.available_hours_per_week} hrs/week`
                : "Flexible availability"}
            </span>
            <span>
              {candidate.experiences_count}{" "}
              {candidate.experiences_count === 1
                ? "experience"
                : "experiences"}{" "}
              · {candidate.certificates_count}{" "}
              {candidate.certificates_count === 1 ? "cert" : "certs"}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <button
        type="button"
        className="live-project-card__footer"
        onClick={onViewDetailsClick}
      >
        <span>Inspect candidate background, portfolio & history</span>
        <strong>
          View Candidate Profile <ArrowUpRight size={14} />
        </strong>
      </button>
    </article>
  )
}
