import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  Award,
  CloudUpload,
  Download,
  Eye,
  Globe,
  LoaderCircle,
  LockKeyhole,
  Paperclip,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Button, Modal } from "../ui"
import { getStoredToken, SESSION_CHANGED_EVENT } from "../../services/apiClient"
import { useTindy } from "../../store"
import CertificateAttachmentPreview from "./CertificateAttachmentPreview"
import CertificateAttachmentThumbnail from "./CertificateAttachmentThumbnail"
import CertificateFilePicker from "./CertificateFilePicker"
import useCertificateAttachments from "../../hooks/useCertificateAttachments"
import {
  changeAttachmentVisibility,
  deleteAttachment,
  getMediaContent,
  IMAGE_TYPES,
  mediaErrorMessage,
  uploadAttachment,
} from "../../services/profileMedia.service"
import type { CertificateAttachment, MediaQuota } from "../../types/profile"
const statusLabel: Record<CertificateAttachment["status"], string> = {
  active: "Active",
  processing: "Processing",
  pending_upload: "Pending upload",
  rejected: "Rejected",
  pending_delete: "Pending deletion",
}
const noop = () => {}
type CertificateFileParts = Record<"thumbnail" | "content", ReactNode>
export default function CertificateAttachments({
  certificateId,
  userId,
  quota,
  quotaChanged,
  revision = 0,
  disabled = false,
  allowUpload = true,
  onLinkedChange,
  onDialogChange,
  render,
}: {
  certificateId: string
  userId?: string
  quota: MediaQuota | null
  quotaChanged: () => void
  revision?: number
  disabled?: boolean
  allowUpload?: boolean
  onLinkedChange?: (linked: boolean) => void
  onDialogChange?: (open: boolean) => void
  render?: (parts: CertificateFileParts) => ReactNode
}) {
  const { authUser, loggingOut } = useTindy()
  const owner = !userId
  const token = getStoredToken()
  const scope = `${authUser?.user_id}:${token}:${userId ?? "owner"}:${certificateId}`
  const attachments = useCertificateAttachments(
    scope,
    certificateId,
    userId,
    owner ? quotaChanged : noop,
    revision,
  )
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [operation, setOperation] =
    useState<"upload" | "download" | "visibility" | "delete" | null>(null)
  const busy = operation !== null || disabled
  const sessionAvailable = Boolean(authUser && token && !loggingOut)
  const [deletion, setDeletion] = useState<CertificateAttachment | null>(null)
  const [preview, setPreview] = useState<CertificateAttachment | null>(null)
  const request = useRef<AbortController | null>(null)
  const pending = useRef(false)
  const urls = useRef(new Set<string>())
  useEffect(() => {
    const reset = () => {
      request.current?.abort()
      request.current = null
      pending.current = false
      for (const url of urls.current) URL.revokeObjectURL(url)
      urls.current.clear()
      setPreview(null)
      setDeletion(null)
      setFile(null)
      setError(null)
      setOperation(null)
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === "tindy_access_token" || event.key === null) reset()
    }
    window.addEventListener(SESSION_CHANGED_EVENT, reset)
    window.addEventListener("storage", storageChanged)
    return () => {
      request.current?.abort()
      request.current = null
      for (const url of urls.current) URL.revokeObjectURL(url)
      urls.current.clear()
      window.removeEventListener(SESSION_CHANGED_EVENT, reset)
      window.removeEventListener("storage", storageChanged)
    }
  }, [scope])
  // Every linked row occupies the slot, including rejected and pending files.
  const linked = Boolean(attachments.data?.length)
  useEffect(() => {
    if (attachments.data && !attachments.loading && !attachments.error)
      onLinkedChange?.(linked)
  }, [
    attachments.data,
    attachments.loading,
    attachments.error,
    linked,
    onLinkedChange,
  ])
  const run = async (
    action: (signal: AbortSignal) => Promise<unknown>,
    kind: NonNullable<typeof operation>,
  ) => {
    if (
      pending.current ||
      busy ||
      !sessionAvailable ||
      token !== getStoredToken()
    )
      return
    pending.current = true
    const controller = new AbortController()
    request.current = controller
    setOperation(kind)
    setError(null)
    try {
      await action(controller.signal)
      if (controller.signal.aborted || token !== getStoredToken()) return
      if (kind === "upload") setFile(null)
      if (kind === "delete") setDeletion(null)
    } catch (failure) {
      if (request.current === controller && token === getStoredToken())
        setError(failure)
    } finally {
      if (request.current === controller) {
        request.current = null
        pending.current = false
        if (token === getStoredToken()) {
          setOperation(null)
          if (kind !== "download") {
            attachments.reload()
            quotaChanged()
          }
        }
      }
    }
  }
  const download = (item: CertificateAttachment) =>
    run(async (signal) => {
      const blob = await getMediaContent(item.media_asset_id, signal)
      if (signal.aborted || token !== getStoredToken()) return
      const url = URL.createObjectURL(blob)
      urls.current.add(url)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = item.file_name
      anchor.click()
      window.setTimeout(() => {
        if (urls.current.delete(url)) URL.revokeObjectURL(url)
      }, 1_000)
    }, "download")
  const openPreview = (item: CertificateAttachment) => {
    setError(null)
    setPreview(item)
  }
  const accessible = (item: CertificateAttachment) =>
    sessionAvailable &&
    !attachments.error &&
    item.status === "active" &&
    (owner || item.visibility === "members")
  const canPreview = (item: CertificateAttachment) =>
    accessible(item) &&
    (IMAGE_TYPES.includes(item.content_type) ||
      item.content_type === "application/pdf")
  const previewItem =
    sessionAvailable &&
    !attachments.error &&
    preview &&
    attachments.data?.find(
      (item) =>
        item.attachment_id === preview.attachment_id && accessible(item),
    )
  useEffect(() => {
    if (preview && !previewItem) setPreview(null)
  }, [preview, previewItem])
  useEffect(() => {
    onDialogChange?.(Boolean(previewItem || deletion))
  }, [previewItem, deletion, onDialogChange])
  useEffect(() => () => onDialogChange?.(false), [onDialogChange])
  const visibleFiles =
    attachments.data?.filter(
      (item) =>
        owner || (item.visibility === "members" && item.status === "active"),
    ) ?? []
  const first = visibleFiles[0]
  const thumbnail = first ? (
    <CertificateAttachmentThumbnail
      key={first.media_asset_id}
      attachment={first}
      accessible={accessible(first)}
      disabled={busy || !canPreview(first)}
      onPreview={() => openPreview(first)}
    />
  ) : (
    <div
      className="certificate-placeholder"
      role="img"
      aria-label={
        attachments.loading ? "Loading certificate file" : "No certificate file"
      }
    >
      {attachments.loading ? (
        <LoaderCircle size={28} aria-hidden="true" />
      ) : (
        <Award size={32} aria-hidden="true" />
      )}
      <small>{attachments.loading ? "Loading…" : "Certificate"}</small>
    </div>
  )
  const selectionDisabled =
    busy ||
    !sessionAvailable ||
    attachments.loading ||
    Boolean(attachments.error) ||
    linked
  const content = (
    <div className="certificate-attachments" aria-label="Certificate file">
      <h4>
        <Paperclip size={14} aria-hidden="true" /> Certificate file
      </h4>
      {attachments.loading && <p role="status">Loading attachments…</p>}
      {Boolean(attachments.error) && (
        <p className="profile-feedback" role="alert">
          {mediaErrorMessage(attachments.error)}
        </p>
      )}
      {!attachments.loading && !attachments.error && !first && (
        <p className="helper-text attachment-empty">
          {owner ? "No file attached." : "No shared file."}
        </p>
      )}
      <ul className="attachment-list">
        {visibleFiles.map((item) => (
          <li className="attachment-card" key={item.attachment_id}>
            {render && (
              <CertificateAttachmentThumbnail
                attachment={item}
                accessible={accessible(item)}
                disabled={busy || !canPreview(item)}
                onPreview={() => openPreview(item)}
              />
            )}
            <div className="attachment-info">
              <button
                type="button"
                className="attachment-name"
                title={item.file_name}
                disabled={busy || !canPreview(item)}
                onClick={() => openPreview(item)}
              >
                {item.file_name}
              </button>
              <div className="attachment-state">
                <span className={`badge media-status-${item.status}`}>
                  {statusLabel[item.status]}
                </span>
                <span className="attachment-visibility">
                  {item.visibility === "members" ? (
                    <Globe size={12} aria-hidden="true" />
                  ) : (
                    <LockKeyhole size={12} aria-hidden="true" />
                  )}
                  {item.visibility === "members"
                    ? "Shared with members"
                    : "Only you"}
                </span>
              </div>
              {item.status === "processing" && (
                <p className="helper-text">
                  Processing PDF. Preview, download and sharing become available
                  after the security scan.
                </p>
              )}
              {item.status === "rejected" && (
                <p className="helper-text">
                  This file was rejected. Delete it before uploading another
                  file.
                </p>
              )}
              {item.status === "pending_upload" && (
                <p className="helper-text">
                  Upload is pending. Check attachments again for the latest
                  status.
                </p>
              )}
            </div>
            <div className="attachment-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={busy || !canPreview(item)}
                onClick={() => openPreview(item)}
              >
                <Eye size={14} aria-hidden="true" /> Preview
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy || !accessible(item)}
                onClick={() => void download(item)}
              >
                <Download size={14} aria-hidden="true" /> Download
              </Button>
              {owner && (
                <>
                  <label>
                    <span className="attachment-sr-only">
                      Visibility for {item.file_name}
                    </span>
                    <select
                      aria-label={`Visibility for ${item.file_name}`}
                      value={item.visibility}
                      disabled={busy || !accessible(item)}
                      onChange={(event) => {
                        const visibility =
                          event.currentTarget.value === "members"
                            ? "members"
                            : "owner_only"
                        void run(
                          (signal) =>
                            changeAttachmentVisibility(
                              certificateId,
                              item.attachment_id,
                              visibility,
                              signal,
                            ),
                          "visibility",
                        )
                      }}
                    >
                      <option value="owner_only">Only you</option>
                      <option value="members">Members</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="attachment-delete"
                    disabled={busy || !sessionAvailable}
                    onClick={() => {
                      setError(null)
                      setDeletion(item)
                    }}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Delete file
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {owner && linked && (
        <p className="helper-text certificate-slot-help">
          Delete the existing file before choosing another.
        </p>
      )}
      {owner && allowUpload && !linked && (
        <div className="attachment-upload">
          <CertificateFilePicker
            file={file}
            disabled={selectionDisabled}
            onChange={setFile}
            onError={setError}
          />
          {file && quota && file.size > quota.available_bytes && (
            <p role="alert">
              Not enough available storage. Refresh quota or remove an
              attachment.
            </p>
          )}
          <Button
            type="button"
            disabled={
              !file ||
              selectionDisabled ||
              Boolean(file && quota && file.size > quota.available_bytes)
            }
            onClick={() =>
              void run(
                (signal) => uploadAttachment(certificateId, file!, signal),
                "upload",
              )
            }
          >
            {operation === "upload" ? (
              <>
                <LoaderCircle size={15} aria-hidden="true" /> Uploading
                attachment…
              </>
            ) : (
              <>
                <CloudUpload size={15} aria-hidden="true" /> Upload attachment
              </>
            )}
          </Button>
        </div>
      )}
      {operation === "upload" && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => request.current?.abort()}
        >
          Cancel upload
        </Button>
      )}
      {operation && (
        <p role="status">
          {operation === "upload"
            ? "Uploading attachment. Please wait…"
            : "Please wait…"}
        </p>
      )}
      {Boolean(error) && (
        <p className="profile-feedback" role="alert">
          {mediaErrorMessage(error)}
        </p>
      )}
      {attachments.expired && (
        <p role="status">
          Automatic checking paused after two minutes. The file is still
          processing on the server.
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        className="attachment-check-again"
        disabled={busy || attachments.loading || !sessionAvailable}
        onClick={attachments.checkAgain}
      >
        <RefreshCw size={13} aria-hidden="true" /> Check attachments again
      </Button>
    </div>
  )
  return (
    <>
      {render ? (
        render({ thumbnail, content })
      ) : (
        <div className="certificate-file-summary">
          {first && thumbnail}
          {content}
        </div>
      )}
      {previewItem && (
        <Modal
          title={`Preview: ${previewItem.file_name}`}
          wide
          onClose={() => setPreview(null)}
        >
          <CertificateAttachmentPreview
            key={previewItem.media_asset_id}
            attachment={previewItem}
            busy={operation !== null}
            downloadError={error}
            onDownload={() => void download(previewItem)}
          />
        </Modal>
      )}
      {deletion && (
        <Modal
          title="Delete attachment"
          dismissible={operation === null}
          onClose={() => setDeletion(null)}
        >
          <p>Delete “{deletion.file_name}” from this certificate?</p>
          {Boolean(error) && (
            <p className="profile-feedback" role="alert">
              {mediaErrorMessage(error)}
            </p>
          )}
          <div className="profile-form-actions">
            <Button
              type="button"
              disabled={operation !== null}
              onClick={() =>
                void run(
                  (signal) =>
                    deleteAttachment(
                      certificateId,
                      deletion.attachment_id,
                      signal,
                    ),
                  "delete",
                )
              }
            >
              Confirm delete attachment
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={operation !== null}
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
