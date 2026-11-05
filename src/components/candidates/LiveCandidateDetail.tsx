import { useCallback, useEffect } from "react"
import { Link } from "react-router"
import useRemoteResource from "../../hooks/useRemoteResource"
import useTeammateSession from "../../hooks/useTeammateSession"
import {
  getCertificates,
  getExperiences,
  getMemberProfile,
} from "../../services/profile.service"
import { sameId, teammateErrorMessage } from "../../services/teammates.service"
import ProfileMediaImage from "../profile/ProfileMediaImage"
import type { MemberProfileResponse } from "../../types/profile"

export default function LiveCandidateDetail({ userId, onLoaded }: { userId: string; onLoaded?: (profile: MemberProfileResponse) => void }) {
  const session = useTeammateSession()
  const load = useCallback(
    async (signal: AbortSignal) => {
      const profile = await getMemberProfile(userId, signal)
      if (!sameId(profile.user_id, userId))
        throw Error("Candidate identity could not be verified.")
      return profile
    },
    [userId],
  )
  const profile = useRemoteResource(
    session.key ? `${session.key}:${userId}` : null,
    load,
  )
  const evidenceLoad = useCallback(
    async (signal: AbortSignal) => {
      const [experiences, certificates] = await Promise.allSettled([
        getExperiences(userId, signal),
        getCertificates(userId, signal),
      ])
      return { experiences, certificates }
    },
    [userId],
  )
  const evidence = useRemoteResource(
    profile.data && session.key ? `${session.key}:${userId}` : null,
    evidenceLoad,
  )
  useEffect(() => { if (profile.data) onLoaded?.(profile.data) }, [profile.data, onLoaded])
  if (profile.loading) return <p role="status">Loading candidate profile…</p>
  if (profile.error)
    return (
      <p role="alert">
        {teammateErrorMessage(profile.error)}{" "}
        <button onClick={profile.reload}>Retry profile</button>
      </p>
    )
  const p = profile.data
  if (!p) return null
  return (
    <div className="teammate-detail">
      <div className="teammate-card__person">
        <ProfileMediaImage profile={p} compact />
        <div>
          <h2>{p.display_name}</h2>
          <p>{p.preferred_role?.name ?? "Preferred role unknown"}</p>
          <p>{p.university ?? "University not provided"}</p>
        </div>
      </div>
      <p>{p.headline ?? "No headline provided."}</p>
      <p>{p.bio ?? "No biography provided."}</p>
      <p>
        {p.available_hours_per_week === null
          ? "Availability unknown"
          : `${p.available_hours_per_week} hours/week`}
      </p>
      <div className="chips">
        {p.skills.map((s) => (
          <span key={s.skill_id}>{s.name}</span>
        ))}
      </div>
      <h3>Experiences</h3>
      {evidence.loading ? (
        <p role="status">Loading evidence…</p>
      ) : evidence.data?.experiences.status === "fulfilled" ? (
        evidence.data.experiences.value.length ? (
          evidence.data.experiences.value.map((e) => (
            <article className="panel" key={e.experience_id}>
              <strong>
                {e.project_name} · {e.role_title}
              </strong>
              <p>{e.description}</p>
            </article>
          ))
        ) : (
          <p>No experiences shared.</p>
        )
      ) : (
        <p>
          Experience details unavailable.{" "}
          <button onClick={evidence.reload}>Retry evidence</button>
        </p>
      )}
      <h3>Certificates</h3>
      {evidence.data?.certificates.status === "fulfilled" ? (
        evidence.data.certificates.value.length ? (
          evidence.data.certificates.value.map((c) => (
            <article className="panel" key={c.certificate_id}>
              <strong>{c.title}</strong>
              <p>{c.issuer}</p>
              <p>{c.description}</p>
            </article>
          ))
        ) : (
          <p>No certificates shared.</p>
        )
      ) : (
        !evidence.loading && <p>Certificate details unavailable.</p>
      )}
      <Link className="text-link" to={`/users/${userId}`}>
        Open full member profile
      </Link>
    </div>
  )
}
