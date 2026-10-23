import { useState } from "react"
import { FileImage, FileText, LoaderCircle } from "lucide-react"
import usePrivateMedia from "../../hooks/usePrivateMedia"
import {
  IMAGE_TYPES,
  mediaErrorMessage,
} from "../../services/profileMedia.service"
import type { CertificateAttachment } from "../../types/profile"

export default function CertificateAttachmentThumbnail({
  attachment,
  accessible,
  disabled,
  onPreview,
}: {
  attachment: CertificateAttachment
  accessible: boolean
  disabled: boolean
  onPreview: () => void
}) {
  const image = IMAGE_TYPES.includes(attachment.content_type)
  const media = usePrivateMedia(
    accessible && image ? attachment.media_asset_id : null,
  )
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = Boolean(media.error || (media.url && failedUrl === media.url))
  return (
    <div className="attachment-thumbnail-wrap">
      <button
        type="button"
        className={`attachment-thumbnail ${
          image ? "" : "attachment-thumbnail-pdf"
        }`}
        disabled={disabled}
        aria-label={`Preview ${attachment.file_name}`}
        onClick={onPreview}
      >
        {image && media.url && !failed ? (
          <img
            src={media.url}
            alt={`Thumbnail of ${attachment.file_name}`}
            onError={() => setFailedUrl(media.url)}
          />
        ) : media.loading ? (
          <span role="status">
            <LoaderCircle size={22} aria-hidden="true" />
            <small>Loading…</small>
          </span>
        ) : (
          <span>
            {image ? (
              <FileImage size={28} aria-hidden="true" />
            ) : (
              <FileText size={30} aria-hidden="true" />
            )}
            <small>{image ? (failed ? "Unavailable" : "Image") : "PDF"}</small>
          </span>
        )}
      </button>
      {failed && (
        <button
          type="button"
          className="text-link attachment-thumbnail-retry"
          title={mediaErrorMessage(
            media.error || "This image could not be displayed.",
          )}
          onClick={() => {
            setFailedUrl(null)
            media.retry()
          }}
        >
          Retry thumbnail
        </button>
      )}
    </div>
  )
}
