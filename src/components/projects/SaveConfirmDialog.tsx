import { CheckCircle2, X } from "lucide-react"

export interface SaveConfirmDialogProps {
  open: boolean
  projectName: string
  recruitmentClosingDate?: string
  isSubmitting?: boolean
  mode: "create" | "edit"
  onCancel: () => void
  onConfirm: () => void
}

export function SaveConfirmDialog({
  open,
  projectName,
  recruitmentClosingDate,
  isSubmitting,
  mode,
  onCancel,
  onConfirm,
}: SaveConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="preview-modal-overlay"
      onClick={isSubmitting ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-dialog-title"
    >
      <div
        className="preview-modal-card save-confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preview-modal-header save-confirm-modal-header">
          <div className="save-confirm-modal-title-group">
            <div className="save-confirm-icon-badge">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 id="save-dialog-title" className="save-confirm-modal-title">
                {mode === "create" ? "Publish project?" : "Save project changes?"}
              </h2>
              <p className="save-confirm-modal-subtitle">
                {mode === "create"
                  ? "Make your project live and start recruiting"
                  : "Confirm and persist all recent edits"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="preview-modal-body save-confirm-modal-body">
          {recruitmentClosingDate && <p><strong>Recruitment deadline: {recruitmentClosingDate} (Vietnam time)</strong></p>}
          <p className="save-confirm-message">
            {mode === "create"
              ? `Are you sure you want to publish "${projectName.trim() || "this project"}"? It will be visible to students and recruitment will open immediately.`
              : `Are you sure you want to save all changes to "${projectName.trim() || "this project"}"? All updates will be applied to your workspace immediately.`}
          </p>
        </div>

        <div className="preview-modal-footer save-confirm-modal-footer">
          <button
            type="button"
            className="action-btn secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="action-btn primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
              ? "Confirm & Publish"
              : "Confirm & Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
