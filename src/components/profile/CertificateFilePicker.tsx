import { useId, useRef } from "react"
import { CloudUpload, FileText, LockKeyhole, X } from "lucide-react"
import { Button } from "../ui"
import {
  formatMB,
  IMAGE_TYPES,
  validateMediaFile,
} from "../../services/profileMedia.service"
export default function CertificateFilePicker({
  file,
  disabled,
  onChange,
  onError,
}: {
  file: File | null
  disabled: boolean
  onChange: (file: File | null) => void
  onError: (error: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const helpId = useId()
  return (
    <div className="certificate-file-picker">
      <div className={`attachment-dropzone ${disabled ? "is-disabled" : ""}`}>
        <CloudUpload size={25} aria-hidden="true" />
        <span className="attachment-upload-copy">
          <strong>Choose certificate file</strong>
          <span>PDF, JPEG, PNG or WebP · Up to 10 MB</span>
        </span>
        <Button
          type="button"
          variant="secondary"
          className="attachment-browse"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          Browse files
        </Button>
        <input
          ref={input}
          className="attachment-sr-only"
          type="file"
          aria-label="Choose certificate file"
          aria-describedby={helpId}
          accept={[...IMAGE_TYPES, "application/pdf"].join(",")}
          disabled={disabled}
          onChange={(event) => {
            const next = event.currentTarget.files?.[0]
            event.currentTarget.value = ""
            if (!next || disabled) return
            const invalid = validateMediaFile(next, 10_000_000, true)
            onError(invalid)
            onChange(invalid ? null : next)
          }}
        />
      </div>
      <p className="attachment-upload-help" id={helpId}>
        <LockKeyhole size={12} aria-hidden="true" /> Private by default · One
        file per certificate
      </p>
      {file && (
        <div className="attachment-selection" role="status">
          <FileText size={20} aria-hidden="true" />
          <div>
            <strong title={file.name}>Selected: {file.name}</strong>
            <span>{formatMB(file.size)}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Clear selected attachment"
            disabled={disabled}
            onClick={() => {
              onChange(null)
              onError(null)
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
