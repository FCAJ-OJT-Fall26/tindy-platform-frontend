import { useEffect, useState } from "react"
import { Avatar } from "../ui"
import usePrivateMedia from "../../hooks/usePrivateMedia"
import { safeHttpUrl } from "../../services/profileValidation"
import { mediaErrorMessage } from "../../services/profileMedia.service"
import type { MemberProfileResponse } from "../../types/profile"

export default function ProfileMediaImage({
  profile,
  kind = "avatar",
  compact = false,
}: {
  profile: MemberProfileResponse
  kind?: "avatar" | "cover"
  compact?: boolean
}) {
  const id =
    kind === "avatar"
      ? profile.avatar_media_asset_id
      : profile.cover_media_asset_id
  const media = usePrivateMedia(id)
  const [failed, setFailed] = useState(false)
  const legacy =
    kind === "avatar" ? profile.avatar_url : profile.cover_image_url
  // Legacy is used only for records without a source/asset. A private failure never falls back to it.
  const src = id
    ? media.url
    : kind === "avatar" && profile.avatar_source
      ? null
      : safeHttpUrl(legacy)
  useEffect(() => setFailed(false), [src])
  const fallback =
    kind === "avatar" ? (
      <Avatar
        name={profile.display_name || "Tindy member"}
        size={compact ? "" : "xl"}
        color="neutral"
      />
    ) : null
  return (
    <>
      {src && !failed ? (
        <img
          className={
            kind === "cover"
              ? "profile-cover-image"
              : compact
                ? "avatar neutral profile-header-photo"
                : "profile-photo"
          }
          src={src}
          alt={
            kind === "cover"
              ? "Profile cover"
              : `${profile.display_name}'s avatar`
          }
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
      {!compact && media.loading && (
        <span className="media-image-status" role="status">
          Loading {kind}…
        </span>
      )}
      {!compact && Boolean(media.error || (id && failed)) && (
        <div className="media-image-status" role="alert">
          {mediaErrorMessage(
            media.error || "This image could not be displayed.",
          )}
          <button type="button" className="text-link" onClick={media.retry}>
            Retry {kind}
          </button>
        </div>
      )}
    </>
  )
}
