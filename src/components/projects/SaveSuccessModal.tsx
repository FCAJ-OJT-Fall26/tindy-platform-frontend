import { Check, ArrowRight, X } from "lucide-react"

export interface SaveSuccessModalProps {
  open: boolean
  projectName: string
  isCreate?: boolean
  onClose: () => void
}

export function SaveSuccessModal({
  open,
  projectName,
  isCreate,
  onClose,
}: SaveSuccessModalProps) {
  if (!open) return null

  return (
    <div
      className="preview-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-dialog-title"
    >
      <div
        className="preview-modal-card save-success-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="close-modal-btn save-success-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="save-success-icon-wrap">
          <div className="save-success-icon-badge">
            <Check size={32} strokeWidth={2.8} />
          </div>
        </div>

        <div className="save-success-content">
          <h2 id="success-dialog-title" className="save-success-title">
            {isCreate ? "Project Published Successfully!" : "Changes Saved Successfully!"}
          </h2>
          <p className="save-success-description">
            {isCreate
              ? `Your project "${projectName.trim() || "Project"}" is now live and accepting applications.`
              : `All recent updates to "${projectName.trim() || "Project"}" have been saved and applied.`}
          </p>
        </div>

        <div className="save-success-footer">
          <button
            type="button"
            className="action-btn primary save-success-btn"
            onClick={onClose}
          >
            <span>Back to projects</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
