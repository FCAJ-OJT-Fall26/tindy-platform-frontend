import {
  UserRound,
  GraduationCap,
  MapPin,
  BriefcaseBusiness,
  Clock3,
  Code2,
  FolderKanban,
  Award,
  ArrowUpRight,
  Link2,
  Globe,
  LoaderCircle,
} from "lucide-react"
import SkillIcon from "../onboarding/SkillIcon"
import { safeHttpUrl } from "../../services/profileValidation"
import "./candidate-detail.css"
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

function monthYear(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
}

function experiencePeriod(
  start: string | null,
  end: string | null,
  ongoing: boolean,
) {
  return [
    start ? monthYear(start) : "",
    ongoing ? "Present" : end ? monthYear(end) : "",
  ]
    .filter(Boolean)
    .join(" — ")
}

export default function LiveCandidateDetail({
  userId,
  onLoaded,
}: {
  userId: string
  onLoaded?: (profile: MemberProfileResponse) => void
}) {
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
  useEffect(() => {
    if (profile.data) onLoaded?.(profile.data)
  }, [profile.data, onLoaded])
  if (profile.loading)
    return (
      <div className="candidate-profile-state" role="status">
        <LoaderCircle size={22} />
        <p>Loading candidate profile…</p>
      </div>
    )
  if (profile.error)
    return (
      <p role="alert">
        {teammateErrorMessage(profile.error)}{" "}
        <button onClick={profile.reload}>Retry profile</button>
      </p>
    )
  const p = profile.data
  if (!p) return null
  const experiences =
    evidence.data?.experiences.status === "fulfilled"
      ? evidence.data.experiences.value
      : null
  const certificates =
    evidence.data?.certificates.status === "fulfilled"
      ? evidence.data.certificates.value
      : null
  const github = safeHttpUrl(p.github_url)
  const linkedin = safeHttpUrl(p.linkedin_url)
  const website = safeHttpUrl(p.personal_website_url)
  return (
    <div className="candidate-overview">
      <header className="candidate-overview-hero">
        <span className="candidate-overview-eyebrow">
          <UserRound size={13} />
          MEMBER OVERVIEW
        </span>
        <div className="candidate-overview-identity">
          <div className="candidate-overview-avatar">
            <ProfileMediaImage profile={p} compact />
          </div>
          <div className="candidate-overview-name">
            <h2>{p.display_name}</h2>
            {p.headline && <p>{p.headline}</p>}
            <div className="candidate-overview-meta">
              {p.university && (
                <span>
                  <GraduationCap size={14} />
                  {p.university}
                </span>
              )}
              {p.location && (
                <span>
                  <MapPin size={13} />
                  {p.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="candidate-overview-facts">
          <div>
            <span className="candidate-fact-icon">
              <BriefcaseBusiness size={16} />
            </span>
            <span>
              <small>Preferred role</small>
              <strong>{p.preferred_role?.name ?? "Not shared"}</strong>
            </span>
          </div>
          <div>
            <span className="candidate-fact-icon mint">
              <Clock3 size={16} />
            </span>
            <span>
              <small>Weekly availability</small>
              <strong>
                {p.available_hours_per_week == null
                  ? "Not shared"
                  : p.available_hours_per_week + " hours / week"}
              </strong>
            </span>
          </div>
        </div>
      </header>
      <div className="candidate-overview-content">
        <section className="candidate-overview-section">
          <div className="candidate-section-title">
            <span>
              <UserRound size={16} />
              <h3>About</h3>
            </span>
            {(github || linkedin || website) && (
              <div className="candidate-socials">
                {github && (
                  <a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub profile"
                    title="GitHub"
                  >
                    <Code2 size={15} />
                  </a>
                )}
                {linkedin && (
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn profile"
                    title="LinkedIn"
                  >
                    <Link2 size={15} />
                  </a>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Personal website"
                    title="Personal website"
                  >
                    <Globe size={15} />
                  </a>
                )}
              </div>
            )}
          </div>
          <p className={"candidate-about " + (!p.bio ? "candidate-muted" : "")}>
            {p.bio || "This member hasn’t added an introduction yet."}
          </p>
        </section>
        <section className="candidate-overview-section">
          <div className="candidate-section-title">
            <span>
              <Code2 size={16} />
              <h3>Skills & tools</h3>
            </span>
            <span className="candidate-section-count">{p.skills.length + (p.custom_skills?.length ?? 0)}</span>
          </div>
          {p.skills.length || (p.custom_skills && p.custom_skills.length > 0) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {p.skills.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.05em" }}>
                    Kỹ năng chuẩn (Catalog)
                  </div>
                  <div className="candidate-overview-skills">
                    {p.skills.map((s) => (
                      <span key={s.skill_id}>
                        <SkillIcon name={s.name} size={14} />
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {p.custom_skills && p.custom_skills.length > 0 && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Kỹ năng bổ sung (Custom skills)</span>
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", backgroundColor: "#dbeafe", color: "#1e40af", fontWeight: 500, textTransform: "none" }}>Self-declared</span>
                  </div>
                  <div className="candidate-overview-skills">
                    {p.custom_skills.map((cs, idx) => (
                      <span
                        key={idx}
                        style={{
                          border: "1px dashed #3b82f6",
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: "16px",
                          padding: "4px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "inline-block" }} />
                        {cs}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="candidate-empty-note">No skills shared yet.</p>
          )}
        </section>
        <section className="candidate-overview-section">
          <div className="candidate-section-title">
            <span>
              <BriefcaseBusiness size={16} />
              <h3>Experience</h3>
            </span>
            <span className="candidate-section-count">
              {experiences?.length ?? p.experiences_count}
            </span>
          </div>
          {evidence.loading ? (
            <div className="candidate-evidence-loading" role="status">
              <LoaderCircle size={15} />
              Loading experience…
            </div>
          ) : experiences ? (
            experiences.length ? (
              <div className="candidate-experience-list">
                {experiences.map((e) => (
                  <article
                    className="candidate-experience"
                    key={e.experience_id}
                  >
                    <span className="candidate-experience-icon">
                      <FolderKanban size={17} />
                    </span>
                    <div className="candidate-experience-content">
                      <header>
                        <h4>{e.project_name}</h4>
                        {safeHttpUrl(e.repo_url) && (
                          <a
                            href={safeHttpUrl(e.repo_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={"View repository for " + e.project_name}
                            title="View repository"
                          >
                            <ArrowUpRight size={16} />
                          </a>
                        )}
                      </header>
                      <div className="candidate-experience-meta">
                        <span>{e.role_title}</span>
                        {(e.start_date || e.end_date || e.is_ongoing) && (
                          <small>
                            {experiencePeriod(
                              e.start_date,
                              e.end_date,
                              e.is_ongoing,
                            )}
                          </small>
                        )}
                      </div>
                      {e.description && <p>{e.description}</p>}
                      {e.technologies?.length > 0 && (
                        <div className="candidate-evidence-skills">
                          {e.technologies.map((t) => (
                            <span key={t.skill_id}>{t.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="candidate-empty-note">No experiences shared.</p>
            )
          ) : (
            <div className="candidate-empty-note">
              Experience details unavailable.{" "}
              <button onClick={evidence.reload}>Retry evidence</button>
            </div>
          )}
        </section>
        <section className="candidate-overview-section">
          <div className="candidate-section-title">
            <span>
              <Award size={16} />
              <h3>Certificates</h3>
            </span>
            <span className="candidate-section-count">
              {certificates?.length ?? p.certificates_count}
            </span>
          </div>
          {evidence.loading ? (
            <div className="candidate-evidence-loading" role="status">
              <LoaderCircle size={15} />
              Loading certificates…
            </div>
          ) : certificates ? (
            certificates.length ? (
              <div className="candidate-certificate-grid">
                {certificates.map((c) => (
                  <article
                    className="candidate-certificate"
                    key={c.certificate_id}
                  >
                    <span className="candidate-certificate-icon">
                      <Award size={20} strokeWidth={1.6} />
                    </span>
                    <div>
                      <header>
                        <h4>{c.title}</h4>
                        {safeHttpUrl(c.credential_url) && (
                          <a
                            href={safeHttpUrl(c.credential_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={"View credential for " + c.title}
                            title="View credential"
                          >
                            <ArrowUpRight size={15} />
                          </a>
                        )}
                      </header>
                      {c.issuer && (
                        <span className="candidate-certificate-issuer">
                          {c.issuer}
                        </span>
                      )}
                      {c.description && <p>{c.description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="candidate-empty-note">No certificates shared.</p>
            )
          ) : (
            <div className="candidate-empty-note">
              Certificate details unavailable.{" "}
              <button onClick={evidence.reload}>Retry certificates</button>
            </div>
          )}
        </section>
      </div>
      <footer className="candidate-overview-footer">
        <span>Get to know their work.</span>
        <Link to={"/users/" + userId}>
          Open full member profile
          <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  )
}
