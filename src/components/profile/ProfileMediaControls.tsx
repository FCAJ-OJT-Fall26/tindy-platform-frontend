import { useCallback, useEffect, useId, useRef, useState } from "react"
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { Button, Modal } from "../ui"
import { useTindy } from "../../store"
import useRemoteResource from "../../hooks/useRemoteResource"
import {
  ApiError,
  getStoredToken,
  SESSION_CHANGED_EVENT,
} from "../../services/apiClient"
import { getAccountConnectionsApi } from "../../services/oauth.service"
import { getMyProfile } from "../../services/profile.service"
import { safeHttpUrl } from "../../services/profileValidation"
import ProfileMediaImage from "./ProfileMediaImage"
import {
  IMAGE_TYPES,
  mediaErrorMessage,
  removeProfileImage,
  selectAvatarSource,
  uploadProfileImage,
  validateMediaFile,
} from "../../services/profileMedia.service"
import type { ProfileMediaState } from "../../types/profile"

type SelectedImage = {
  file: File
  url: string
}

export default function ProfileMediaControls({
  kind,
  coverElement,
  onClose,
}: {
  kind: "avatar" | "cover-image"
  coverElement: HTMLDivElement | null
  onClose: () => void
}) {
  const { authUser, ownerProfile, notify, loggingOut } = useTindy()
  const profile = ownerProfile.data
  const token = getStoredToken()
  const avatar = kind === "avatar"
  const label = avatar ? "avatar" : "cover"
  const inputId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [selection, setSelection] = useState<SelectedImage | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [coverRatio, setCoverRatio] = useState(3)
  const pending = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const closeAction = useRef(onClose)
  closeAction.current = onClose
  const load = useCallback(
    (signal: AbortSignal) => getAccountConnectionsApi(signal),
    [],
  )
  const connections = useRemoteResource(
    avatar && authUser && token && !loggingOut
      ? `${authUser.user_id}:${token}`
      : null,
    load,
  )
  useEffect(() => {
    const reset = () => {
      controller.current?.abort()
      setFile(null)
      closeAction.current()
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === "tindy_access_token" || event.key === null) reset()
    }
    window.addEventListener(SESSION_CHANGED_EVENT, reset)
    window.addEventListener("storage", storageChanged)
    return () => {
      controller.current?.abort()
      window.removeEventListener(SESSION_CHANGED_EVENT, reset)
      window.removeEventListener("storage", storageChanged)
    }
  }, [])
  useEffect(() => {
    setPreviewFailed(false)
    if (!file) {
      setSelection(null)
      return
    }
    const url = URL.createObjectURL(file)
    setSelection({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => {
    if (avatar || !coverElement) return
    const update = () => {
      const { width, height } = coverElement.getBoundingClientRect()
      if (width && height) setCoverRatio(width / height)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(coverElement)
    return () => observer.disconnect()
  }, [avatar, coverElement])
  const preview = selection?.file === file ? selection?.url : null
  const available = Boolean(authUser && token && !loggingOut && profile)
  const hasCurrent = Boolean(
    profile &&
      (avatar
        ? profile.avatar_media_asset_id ||
          (!profile.avatar_source && safeHttpUrl(profile.avatar_url))
        : profile.cover_media_asset_id || safeHttpUrl(profile.cover_image_url)),
  )
  const source =
    profile?.avatar_source === "uploaded"
      ? "Uploaded photo"
      : profile?.avatar_source === "oauth"
        ? "Connected account"
        : !profile?.avatar_source && hasCurrent
          ? "Existing photo"
          : "Default avatar"
  const run = async (
    action: (signal: AbortSignal) => Promise<ProfileMediaState | unknown>,
  ) => {
    if (pending.current || !available || token !== getStoredToken()) return
    pending.current = true
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setError(null)
    try {
      const state = await action(request.signal)
      if (request.signal.aborted || token !== getStoredToken()) return
      if (state && typeof state === "object" && "avatar_source" in state) {
        // A media response is partial. Keep unrelated profile metadata intact.
        ownerProfile.replace((previous) => ({
          ...previous!,
          ...state as ProfileMediaState,
        }))
      }
      const updated = await getMyProfile(request.signal)
      if (request.signal.aborted || token !== getStoredToken()) return
      ownerProfile.replace(updated)
      closeAction.current()
      notify("Profile media updated")
    } catch (failure) {
      if (!request.signal.aborted && token === getStoredToken()) {
        setError(failure)
        // A failed response may follow a server commit; reconcile without losing the selection.
        ownerProfile.reload()
      }
    } finally {
      if (controller.current === request) {
        controller.current = null
        pending.current = false
        if (!request.signal.aborted && token === getStoredToken())
          setBusy(false)
      }
    }
  }
  const failureMessage =
    error instanceof ApiError &&
    error.errorCode === "MEDIA_OAUTH_AVATAR_UNAVAILABLE"
      ? "Could not retrieve that account’s avatar. Try again or choose another avatar source."
      : mediaErrorMessage(error)
  if (!profile || !available) return null
  return (
    <Modal title={`Edit ${label}`} dismissible={!busy} onClose={onClose}>
      <div
        className={`profile-media-editor media-editor-${label}`}
        aria-busy={busy}
      >
        <div className="media-current">
          <div className={`media-current-image media-current-${label}`}>
            {hasCurrent || avatar ? (
              <ProfileMediaImage
                profile={profile}
                kind={avatar ? "avatar" : "cover"}
              />
            ) : (
              <ImagePlus size={24} aria-hidden="true" />
            )}
          </div>
          <div>
            <h3>Current {label}</h3>
            <p>
              {avatar
                ? `Current source: ${source}`
                : hasCurrent
                  ? "Your profile banner"
                  : "No cover image yet"}
            </p>
          </div>
        </div>
        <label
          className={`media-image-picker ${busy ? "is-disabled" : ""}`}
          htmlFor={inputId}
        >
          <input
            id={inputId}
            type="file"
            name="profile_media"
            aria-label={`Choose ${label} image`}
            aria-describedby={`${inputId}-help`}
            accept={IMAGE_TYPES.join(",")}
            disabled={busy}
            onChange={(event) => {
              const next = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              if (!next) return
              const invalid = validateMediaFile(
                next,
                avatar ? 5_000_000 : 10_000_000,
              )
              setFile(invalid ? null : next)
              setError(invalid)
            }}
          />
          <span className="media-picker-icon">
            <Camera size={22} aria-hidden="true" />
          </span>
          <span className="media-picker-copy">
            <strong>Choose {label} image</strong>
            <small id={`${inputId}-help`}>
              JPEG, PNG or WebP · Up to {avatar ? "5 MB" : "10 MB"}
            </small>
          </span>
          <span className="media-picker-browse">Browse</span>
        </label>
        <p className="media-crop-help">
          {avatar
            ? "Your photo is center-cropped to a circle. Keep your face near the center."
            : "Your image is center-cropped to 3:1 (1500 × 500). The banner crops it further to fit your screen. Keep important details near the center."}
        </p>
        {file && (
          <div className="media-selected-file">
            <Upload size={16} aria-hidden="true" />
            <span title={file.name}>{file.name}</span>
            <button
              type="button"
              className="icon-button"
              aria-label={`Clear selected ${label} image`}
              disabled={busy}
              onClick={() => {
                setFile(null)
                setError(null)
              }}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        {preview && (
          <figure className={`media-upload-preview media-preview-${kind}`}>
            <img
              src={preview}
              alt="Selected image preview"
              style={previewFailed ? { display: "none" } : undefined}
              onError={() => setPreviewFailed(true)}
            />
            {previewFailed && (
              <p className="media-preview-unavailable" role="status">
                Preview unavailable. You can choose another image or upload it
                for validation.
              </p>
            )}
            <figcaption>New {label} preview</figcaption>
            {!avatar && !previewFailed && (
              <div className="media-cover-display">
                <span>On your profile</span>
                <div
                  className="media-cover-display-crop"
                  style={{ aspectRatio: coverRatio }}
                >
                  <div
                    className="media-cover-normalized"
                    style={{
                      width: coverRatio >= 3 ? "100%" : `${300 / coverRatio}%`,
                      height:
                        coverRatio >= 3 ? `${(coverRatio / 3) * 100}%` : "100%",
                    }}
                  >
                    <img
                      src={preview}
                      alt="Selected cover as displayed in your profile banner"
                    />
                  </div>
                </div>
              </div>
            )}
          </figure>
        )}
        {Boolean(error) && (
          <p className="profile-feedback" role="alert">
            {failureMessage}
          </p>
        )}
        {busy && (
          <p className="media-update-status" role="status">
            <LoaderCircle size={15} aria-hidden="true" />
            Updating media…
          </p>
        )}
        <div className="media-editor-actions">
          <Button
            type="button"
            disabled={!file || busy}
            onClick={() => {
              if (file)
                void run((signal) => uploadProfileImage(kind, file, signal))
            }}
          >
            <Upload size={15} aria-hidden="true" />
            Upload {label}
          </Button>
          {hasCurrent && (
            <Button
              type="button"
              variant="ghost"
              className="media-remove"
              disabled={busy}
              onClick={() =>
                void run((signal) => removeProfileImage(kind, signal))
              }
            >
              <Trash2 size={15} aria-hidden="true" />
              Remove {label}
            </Button>
          )}
        </div>
        {avatar && (
          <div className="media-avatar-sources">
            <h3>Avatar source</h3>
            <p>
              Choose the photo you want to use. Connected accounts are loaded
              below.
            </p>
            <Button
              type="button"
              variant="secondary"
              aria-pressed={source === "Default avatar"}
              disabled={busy}
              onClick={() =>
                void run((signal) => selectAvatarSource(undefined, signal))
              }
            >
              {source === "Default avatar" && (
                <Check size={14} aria-hidden="true" />
              )}
              Use default avatar
            </Button>
            {connections.loading && (
              <p role="status">Loading connected accounts…</p>
            )}
            {Boolean(connections.error) && (
              <div className="media-connections-error" role="alert">
                Could not load connected accounts.{" "}
                <button
                  type="button"
                  className="text-link"
                  disabled={busy}
                  onClick={connections.reload}
                >
                  Retry connections
                </button>
              </div>
            )}
            {!connections.loading &&
              !connections.error &&
              connections.data?.providers.map((item) => (
                <Button
                  key={item.provider}
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run((signal) =>
                      selectAvatarSource(
                        item.provider === "Google" ? "google" : "github",
                        signal,
                      ),
                    )
                  }
                >
                  Use {item.provider} avatar
                </Button>
              ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
