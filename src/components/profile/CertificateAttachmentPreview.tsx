import { useEffect, useState } from "react"
import { Download, FileText, LoaderCircle } from "lucide-react"
import { Button } from "../ui"
import { useTindy } from "../../store"
import usePrivateMedia from "../../hooks/usePrivateMedia"
import { getStoredToken, SESSION_CHANGED_EVENT } from "../../services/apiClient"
import {
  getMediaContent,
  mediaErrorMessage,
} from "../../services/profileMedia.service"
import type { CertificateAttachment } from "../../types/profile"

function ImagePreview({ attachment }: { attachment: CertificateAttachment }) {
  // The mounted thumbnail retains the same ref-counted, authenticated resource.
  const media = usePrivateMedia(attachment.media_asset_id)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return (
    <div className="attachment-preview-body" aria-busy={media.loading}>
      {media.loading && (
        <p role="status">
          <LoaderCircle size={18} aria-hidden="true" /> Loading attachment
          image…
        </p>
      )}
      {Boolean(media.error || (media.url && failedUrl === media.url)) && (
        <div className="profile-feedback" role="alert">
          <p>
            {mediaErrorMessage(
              media.error || "This image could not be displayed.",
            )}
          </p>
          <button
            type="button"
            className="text-link"
            disabled={media.loading}
            onClick={() => {
              setFailedUrl(null)
              media.retry()
            }}
          >
            Retry image
          </button>
        </div>
      )}
      {media.url && failedUrl !== media.url && (
        <img
          className="attachment-preview"
          src={media.url}
          alt={`Certificate attachment: ${attachment.file_name}`}
          onError={() => setFailedUrl(media.url)}
        />
      )}
    </div>
  )
}

function PdfPreview({ attachment }: { attachment: CertificateAttachment }) {
  const { authUser, loggingOut } = useTindy()
  const token = getStoredToken()
  const scope =
    authUser && token && !loggingOut
      ? `${authUser.user_id}:${token}:${attachment.media_asset_id}`
      : null
  const supported = navigator.pdfViewerEnabled === true
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{
    scope: string
    url: string | null
    error: unknown
  } | null>(null)
  const [viewerFailed, setViewerFailed] = useState(false)
  useEffect(() => {
    if (!scope || !supported) return
    const controller = new AbortController()
    let url: string | null = null
    const release = () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
      url = null
    }
    const sessionChanged = () => {
      release()
      setState(null)
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === "tindy_access_token" || event.key === null)
        sessionChanged()
    }
    window.addEventListener(SESSION_CHANGED_EVENT, sessionChanged)
    window.addEventListener("storage", storageChanged)
    setState({ scope, url: null, error: null })
    setViewerFailed(false)
    getMediaContent(attachment.media_asset_id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted || token !== getStoredToken()) return
        if (blob.type.toLowerCase() !== "application/pdf")
          throw new Error(
            "PDF preview received an unsupported file format. Try downloading the attachment instead.",
          )
        url = URL.createObjectURL(blob)
        setState({ scope, url, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && token === getStoredToken())
          setState({ scope, url: null, error })
      })
    return () => {
      release()
      window.removeEventListener(SESSION_CHANGED_EVENT, sessionChanged)
      window.removeEventListener("storage", storageChanged)
    }
  }, [scope, token, attachment.media_asset_id, supported, version])
  const current = state?.scope === scope ? state : null
  const unavailable = !supported || viewerFailed
  return (
    <div className="attachment-pdf-preview">
      {unavailable ? (
        <div className="attachment-preview-fallback" role="status">
          <FileText size={36} aria-hidden="true" />
          <strong>PDF preview is unavailable in this browser.</strong>
          <p>
            Download the attachment to open it in your preferred PDF viewer.
          </p>
        </div>
      ) : current?.error ? (
        <div className="profile-feedback" role="alert">
          <p>
            {current.error instanceof Error &&
            current.error.message.startsWith("PDF preview received")
              ? current.error.message
              : mediaErrorMessage(current.error)}
          </p>
          <button
            type="button"
            className="text-link"
            onClick={() => setVersion((value) => value + 1)}
          >
            Retry preview
          </button>
        </div>
      ) : current?.url ? (
        <>
          <iframe
            className="attachment-pdf-frame"
            src={current.url}
            title={`PDF preview: ${attachment.file_name}`}
            onError={() => setViewerFailed(true)}
          />
          <p className="helper-text">
            If the PDF does not appear, use Download to open it on your device.
          </p>
        </>
      ) : (
        <p role="status">
          <LoaderCircle size={18} aria-hidden="true" /> Loading PDF preview…
        </p>
      )}
    </div>
  )
}

export default function CertificateAttachmentPreview({
  attachment,
  busy,
  downloadError,
  onDownload,
}: {
  attachment: CertificateAttachment
  busy: boolean
  downloadError: unknown
  onDownload: () => void
}) {
  return (
    <div className="attachment-preview-content">
      {attachment.content_type === "application/pdf" ? (
        <PdfPreview attachment={attachment} />
      ) : (
        <ImagePreview attachment={attachment} />
      )}
      {Boolean(downloadError) && (
        <p className="profile-feedback" role="alert">
          {mediaErrorMessage(downloadError)}
        </p>
      )}
      <div className="attachment-preview-footer">
        <p className="helper-text">
          {attachment.visibility === "members"
            ? "Shared with members"
            : "Only you"}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onDownload}
        >
          <Download size={15} aria-hidden="true" /> Download
        </Button>
      </div>
    </div>
  )
}
