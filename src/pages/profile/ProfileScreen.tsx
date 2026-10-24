import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Camera,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import {
  Button,
  Chips,
  EmptyState,
  Modal,
  PageHeader,
  SectionHeading,
} from "../../components/ui"
import {
  CertificateEditor,
  ExperienceEditor,
  ProfileEditor,
  RequestFeedback,
} from "../../components/profile/ProfileForms"
import { useTindy } from "../../store"
import useRemoteResource from "../../hooks/useRemoteResource"
import { getStoredToken } from "../../services/apiClient"
import { UUID_PATTERN, safeHttpUrl } from "../../services/profileValidation"
import {
  createCertificate,
  createExperience,
  deleteCertificate,
  deleteExperience,
  getCertificates,
  getExperiences,
  getMemberProfile,
  updateCertificate,
  updateExperience,
} from "../../services/profile.service"
import type {
  CertificateResponse,
  ExperienceResponse,
  MemberProfileResponse,
  MyProfileResponse,
} from "../../types/profile"
import "./profile.css"
import ProfileMediaImage from "../../components/profile/ProfileMediaImage"
import ProfileMediaControls from "../../components/profile/ProfileMediaControls"
import CertificateAttachments from "../../components/profile/CertificateAttachments"
import MediaQuotaSummary from "../../components/profile/MediaQuotaSummary"
import { getMediaQuota } from "../../services/profileMedia.service"
function ResourceStatus({
  loading,
  error,
  retry,
  label,
}: {
  loading: boolean
  error: unknown
  retry: () => void
  label: string
}) {
  return (
    <>
      {loading && (
        <p className="profile-loading" role="status">
          Loading {label}…
        </p>
      )}
      <RequestFeedback error={error} />
      {Boolean(error) && (
        <Button type="button" variant="secondary" onClick={retry}>
          Retry {label}
        </Button>
      )}
    </>
  )
}
function ExternalLink({
  url,
  children,
}: {
  url: string | null
  children: ReactNode
}) {
  const href = safeHttpUrl(url)
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={13} />
    </a>
  ) : null
}
function ProfileDetails({
  profile,
  owner,
}: {
  profile: MemberProfileResponse
  owner: boolean
}) {
  const privateProfile = owner ? profile as MyProfileResponse : null
  const facts = [
    ["University / community", profile.university],
    ["Current role", profile.current_role],
    ["Preferred role", profile.preferred_role?.name],
    ["Location", profile.location],
    [
      "Availability",
      profile.available_hours_per_week == null
        ? null
        : `${profile.available_hours_per_week} hours/week`,
    ],
    ["Public contact email", profile.public_email],
    ...(privateProfile
      ? [["Phone number (only you)", privateProfile.phone_number]]
      : []),
  ]
  return (
    <>
      <section className="panel">
        <SectionHeading title="Profile details" />
        <dl className="profile-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
        <div className="profile-contact-links">
          <ExternalLink url={profile.github_url}>GitHub</ExternalLink>
          <ExternalLink url={profile.linkedin_url}>LinkedIn</ExternalLink>
          <ExternalLink url={profile.personal_website_url}>
            Personal website
          </ExternalLink>
          {privateProfile && (
            <ExternalLink url={privateProfile.resume_url}>
              Resume (only you)
            </ExternalLink>
          )}
        </div>
      </section>
      {owner && (
        <section className="panel">
          <h3>Member view</h3>
          <p className="helper-text">
            Your public contact email is shared with signed-in members. Phone
            number and resume are only visible to you.
          </p>
          <Link className="text-link" to={`/users/${profile.user_id}`}>
            Preview member profile <ArrowUpRight size={13} />
          </Link>
        </section>
      )}
    </>
  )
}
function About({ profile }: { profile: MemberProfileResponse }) {
  return (
    <section className="panel">
      <SectionHeading title="About" />
      <p className="profile-prose">{profile.bio || "No introduction yet."}</p>
      <h3>Technical skills</h3>
      {profile.skills.length ? (
        <Chips items={profile.skills.map((skill) => skill.name)} />
      ) : (
        <p>No skills added.</p>
      )}
      {([
        ["Professional interests", profile.professional_interests],
        ["Experience summary", profile.previous_projects_and_contribution],
        ["Learning goals", profile.learning_goals],
        ["Technologies to learn", profile.technologies_to_learn],
      ] as const).map(
        ([label, value]) =>
          value && (
            <div className="profile-about-block" key={label}>
              <h3>{label}</h3>
              <p className="profile-prose">{value}</p>
            </div>
          ),
      )}
    </section>
  )
}
type Editor = {
  kind: "experience"
  item: ExperienceResponse | null
} | {
  kind: "certificate"
  item: CertificateResponse | null
}
type Deletion = {
  kind: "experience" | "certificate"
  id: string
  title: string
}
function ProfileView({ userId }: { userId?: string }) {
  const owner = !userId
  const { authUser, ownerProfile, saveOwnerProfile, notify } = useTindy()
  const token = getStoredToken()
  const key = `${authUser?.user_id}:${token}:${userId ?? "owner"}`
  const loadMember = useCallback(
    (signal: AbortSignal) => getMemberProfile(userId!, signal),
    [userId],
  )
  const memberProfile = useRemoteResource(userId ? key : null, loadMember)
  const profileResource = owner ? ownerProfile : memberProfile
  const profile = profileResource.data
  const loadExperiences = useCallback(
    (signal: AbortSignal) => getExperiences(userId, signal),
    [userId],
  )
  const loadCertificates = useCallback(
    (signal: AbortSignal) => getCertificates(userId, signal),
    [userId],
  )
  const experiences = useRemoteResource(key, loadExperiences)
  const certificates = useRemoteResource(key, loadCertificates)
  const quota = useRemoteResource(owner ? key : null, getMediaQuota)
  const [certificateFileRevisions, setCertificateFileRevisions] =
    useState<Record<string, number>>({})
  const certificateFileChanged = useCallback(
    (id: string) => {
      setCertificateFileRevisions((previous) => ({
        ...previous,
        [id]: (previous[id] ?? 0) + 1,
      }))
      quota.reload()
    },
    [quota.reload],
  )
  useEffect(() => {
    // Returning after an aborted upload must reconcile a possible server commit.
    // The provider performs the initial load when no cached owner profile exists.
    if (owner && ownerProfile.data) ownerProfile.reload()
  }, [owner, ownerProfile.reload])
  const [editing, setEditing] = useState(false)
  const [mediaEditing, setMediaEditing] = useState<"avatar" | "cover-image" | null>(null)
  const coverElement = useRef<HTMLDivElement>(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [editorBusy, setEditorBusy] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deletion, setDeletion] = useState<Deletion | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<unknown>(null)
  const busyDelete = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const currentSession = () => mounted.current && token === getStoredToken()
  const refreshCounts = (kind: "experience" | "certificate", delta: number) => {
    if (!ownerProfile.data) {
      ownerProfile.reload()
      return
    }
    ownerProfile.replace((previous) => {
      const base = previous ?? ownerProfile.data!
      const field =
        kind === "experience" ? "experiences_count" : "certificates_count"
      return { ...base, [field]: Math.max(0, base[field] + delta) }
    })
  }
  const remove = async () => {
    if (!deletion || busyDelete.current) return
    busyDelete.current = true
    setDeleting(true)
    setDeleteError(null)
    try {
      if (deletion.kind === "experience") await deleteExperience(deletion.id)
      else await deleteCertificate(deletion.id)
      if (!currentSession()) return
      if (deletion.kind === "experience")
        experiences.replace((previous) =>
          (previous ?? []).filter((item) => item.experience_id !== deletion.id),
        )
      else
        certificates.replace((previous) =>
          (previous ?? []).filter(
            (item) => item.certificate_id !== deletion.id,
          ),
        )
      refreshCounts(deletion.kind, -1)
      if (deletion.kind === "certificate") quota.reload()
      setDeletion(null)
      notify("Item deleted")
    } catch (error) {
      if (currentSession()) setDeleteError(error)
    } finally {
      busyDelete.current = false
      if (mounted.current) setDeleting(false)
    }
  }
  const beginDelete = (next: Deletion) => {
    setDeleteError(null)
    setDeletion(next)
  }
  const actions = (
    kind: "experience" | "certificate",
    item: ExperienceResponse | CertificateResponse,
  ) => {
    if (!owner) return null
    const id =
      "experience_id" in item ? item.experience_id : item.certificate_id
    const title = "project_name" in item ? item.project_name : item.title
    return (
      <div className="profile-item-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={`Edit ${title}`}
          onClick={() =>
            setEditor(
              kind === "experience"
                ? { kind, item: item as ExperienceResponse }
                : { kind, item: item as CertificateResponse },
            )
          }
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={`Delete ${title}`}
          onClick={() => beginDelete({ kind, id, title })}
        >
          <Trash2 size={15} />
        </button>
      </div>
    )
  }
  return (
    <>
      <PageHeader
        title={owner ? "Your professional profile" : "Member profile"}
        description={
          owner
            ? "Your skills, your story, and what you want to build next."
            : "Discover this member’s skills, experience, and interests."
        }
        action={
          owner && profile ? (
            <Button
              type="button"
              disabled={profileBusy}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "Cancel editing" : "Edit profile"}
              <Pencil size={15} />
            </Button>
          ) : undefined
        }
      />
      <ResourceStatus
        {...profileResource}
        retry={profileResource.reload}
        label="profile"
      />
      {profile && (
        <>
          <div className={`profile-cover ${profile.cover_media_asset_id || safeHttpUrl(profile.cover_image_url) ? "has-cover-image" : ""}`} ref={coverElement}>
            <ProfileMediaImage profile={profile} kind="cover" />
            <div className="cover-line" />
            <span>TINDY / BUILT TO BUILD</span>
            {owner && <button type="button" className="profile-cover-edit" aria-label="Edit cover" onClick={() => setMediaEditing("cover-image")}><Camera size={15} aria-hidden="true" />Edit cover</button>}
          </div>
          <div className="profile-identity">
            <div className="profile-avatar-wrap">
              <ProfileMediaImage profile={profile} />
              {owner && <button type="button" className="profile-avatar-edit" aria-label="Edit avatar" title="Edit avatar" onClick={() => setMediaEditing("avatar")}><Camera size={16} aria-hidden="true" /><span className="profile-media-sr-only">Edit avatar</span></button>}
            </div>
            <div>
              <h2>{profile.display_name}</h2>
              {profile.username && <p>@{profile.username}</p>}
              {profile.headline && <p>{profile.headline}</p>}
              <p>
                <GraduationCap size={15} />
                {profile.university || "University not provided"}
              </p>
              {profile.location && (
                <p>
                  <MapPin size={14} />
                  {profile.location}
                </p>
              )}
            </div>
            {profile.available_hours_per_week != null && (
              <div className="availability-badge">
                <span className="online-dot" />
                Availability
                <small>{profile.available_hours_per_week} hours/week</small>
              </div>
            )}
          </div>
          {owner && mediaEditing && <ProfileMediaControls kind={mediaEditing} coverElement={coverElement.current} onClose={() => setMediaEditing(null)} />}
          {owner && editing && (
            <ProfileEditor
              profile={profile as MyProfileResponse}
              onBusyChange={setProfileBusy}
              onCancel={() => setEditing(false)}
              onSave={async (patch) => {
                await saveOwnerProfile(patch)
                if (currentSession()) {
                  setProfileBusy(false)
                  setEditing(false)
                  notify("Profile saved")
                }
              }}
            />
          )}
        </>
      )}
      {profile && !editing && (
        <div className="profile-layout">
          <div>
            {profile && <About profile={profile} />}
            <section className="panel" aria-label="Experiences">
              <SectionHeading
                title="Experiences"
                action={
                  owner && (
                    <button
                      type="button"
                      className="text-link"
                      disabled={experiences.loading || !profile}
                      onClick={() =>
                        setEditor({ kind: "experience", item: null })
                      }
                    >
                      <Plus size={14} />
                      Add experience
                    </button>
                  )
                }
              />
              <ResourceStatus
                {...experiences}
                retry={experiences.reload}
                label="experiences"
              />
              {experiences.data?.length === 0 &&
                !experiences.loading &&
                !experiences.error && (
                  <EmptyState
                    title="No experiences yet"
                    description={
                      owner
                        ? "Add a project and describe your contribution."
                        : "This member has not added any experiences."
                    }
                  />
                )}
              {experiences.data?.map((item) => (
                <article
                  className="experience-card profile-api-item"
                  key={item.experience_id}
                >
                  <span className="project-mark indigo">
                    <BriefcaseBusiness size={18} />
                  </span>
                  <div className="profile-item-body">
                    <h3>{item.project_name}</h3>
                    <p className="profile-item-meta">
                      {item.role_title} ·{" "}
                      {item.start_date ?? "Start not specified"} –{" "}
                      {item.is_ongoing
                        ? "Present"
                        : (item.end_date ?? "End not specified")}
                    </p>
                    <p className="profile-prose">{item.description}</p>
                    {item.technologies.length > 0 && (
                      <Chips
                        items={item.technologies.map((skill) => skill.name)}
                      />
                    )}
                    <div className="profile-contact-links">
                      <ExternalLink url={item.repo_url}>
                        Repository
                      </ExternalLink>
                    </div>
                  </div>
                  {actions("experience", item)}
                </article>
              ))}
            </section>
            <section className="panel" aria-label="Certificates">
              <SectionHeading
                title="Certificates"
                description="Certificate details are provided by the member."
                action={
                  owner && (
                    <button
                      type="button"
                      className="text-link"
                      disabled={certificates.loading || !profile}
                      onClick={() =>
                        setEditor({ kind: "certificate", item: null })
                      }
                    >
                      <Plus size={14} />
                      Add certificate
                    </button>
                  )
                }
              />
              {owner && <MediaQuotaSummary {...quota} />}
              <ResourceStatus
                {...certificates}
                retry={certificates.reload}
                label="certificates"
              />
              {certificates.data?.length === 0 &&
                !certificates.loading &&
                !certificates.error && (
                  <EmptyState
                    title="No certificates yet"
                    description={
                      owner
                        ? "Add the title, issuer, and credential details of a certificate."
                        : "This member has not added any certificates."
                    }
                  />
                )}
              {certificates.data?.map((item) => (
                <CertificateAttachments
                  key={`${key}:${item.certificate_id}`}
                  certificateId={item.certificate_id}
                  userId={userId}
                  quota={quota.data}
                  quotaChanged={quota.reload}
                  revision={certificateFileRevisions[item.certificate_id] ?? 0}
                  render={({ thumbnail, content }) => (
                    <article
                      className="certificate-card profile-api-item"
                      data-certificate-id={item.certificate_id}
                    >
                      {thumbnail}
                      <div className="profile-item-body">
                        <div className="certificate-card-heading">
                          <div>
                            <h3>{item.title}</h3>
                            <p className="certificate-issuer">{item.issuer}</p>
                          </div>
                          {actions("certificate", item)}
                        </div>
                        {item.description && (
                          <p className="profile-prose certificate-description">
                            {item.description}
                          </p>
                        )}
                        {item.credential_url && (
                          <div className="profile-contact-links">
                            <ExternalLink url={item.credential_url}>
                              Verify credential
                            </ExternalLink>
                          </div>
                        )}
                      </div>
                      {content}
                    </article>
                  )}
                />
              ))}
            </section>
          </div>
          <aside>
            {profile && <ProfileDetails profile={profile} owner={owner} />}
          </aside>
        </div>
      )}
      {owner && editor && (
        <Modal
          title={editor.item ? `Edit ${editor.kind}` : `Add ${editor.kind}`}
          wide
          dismissible={!editorBusy}
          onClose={() => setEditor(null)}
        >
          {editor.kind === "experience" ? (
            <ExperienceEditor
              item={editor.item}
              onBusyChange={setEditorBusy}
              onCancel={() => setEditor(null)}
              onSave={async (payload) => {
                const item = editor.item
                  ? await updateExperience(editor.item.experience_id, payload)
                  : await createExperience(payload)
                if (!currentSession()) return
                experiences.replace((previous) => [
                  item,
                  ...(previous ?? []).filter(
                    (value) => value.experience_id !== item.experience_id,
                  ),
                ])
                experiences.reload()
                if (!editor.item) refreshCounts("experience", 1)
                setEditorBusy(false)
                setEditor(null)
                notify("Experience saved")
              }}
            />
          ) : (
            <CertificateEditor
              item={editor.item}
              onBusyChange={setEditorBusy}
              onCancel={() => setEditor(null)}
              quota={quota.data}
              onFileChange={certificateFileChanged}
              onSave={async (payload, id, signal) => {
                const item = id
                  ? await updateCertificate(id, payload, signal)
                  : await createCertificate(payload, signal)
                if (!currentSession())
                  throw new DOMException("Session changed", "AbortError")
                certificates.replace((previous) => [
                  item,
                  ...(previous ?? []).filter(
                    (value) => value.certificate_id !== item.certificate_id,
                  ),
                ])
                certificates.reload()
                if (!id) refreshCounts("certificate", 1)
                return item
              }}
              onComplete={() => {
                if (!currentSession()) return
                setEditorBusy(false)
                setEditor(null)
                notify("Certificate saved")
              }}
            />
          )}
        </Modal>
      )}
      {owner && deletion && (
        <Modal
          title={`Delete ${deletion.kind}`}
          dismissible={!deleting}
          onClose={() => setDeletion(null)}
        >
          <p>Delete “{deletion.title}” from your profile?</p>
          <RequestFeedback error={deleteError} />
          <div className="profile-form-actions">
            <Button type="button" disabled={deleting} onClick={remove}>
              {deleting ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setDeletion(null)}
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export default function ProfileScreen() {
  const { userId } = useParams<{ userId: string }>()
  const { authUser, loggingOut } = useTindy()
  if (loggingOut) return <p role="status">Signing out…</p>
  if (userId && !UUID_PATTERN.test(userId))
    return (
      <EmptyState
        title="Profile unavailable"
        description="Open a member profile using a valid user ID."
        action={
          <Link className="btn btn-secondary" to="/profile">
            Your profile
          </Link>
        }
      />
    )
  return (
    <ProfileView
      key={`${authUser?.user_id}:${getStoredToken()}:${userId ?? "owner"}`}
      userId={userId}
    />
  )
}
export { ProfileScreen }
