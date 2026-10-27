import { AlertTriangle, X } from "lucide-react"

interface UnsavedChangesDialogProps {
  open: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}

export function UnsavedChangesDialog({
  open,
  onKeepEditing,
  onDiscard,
}: UnsavedChangesDialogProps) {
  if (!open) return null

  return (
    <div
      className="preview-modal-overlay"
      onClick={onKeepEditing}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
    >
      <div
        className="preview-modal-card discard-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preview-modal-header discard-modal-header">
          <div className="discard-modal-title-group">
            <div className="discard-modal-icon-badge">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 id="discard-dialog-title" className="discard-modal-title">
                Discard unsaved changes?
              </h2>
              <p className="discard-modal-subtitle">
                You have unsaved changes in this project brief.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onKeepEditing}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="preview-modal-body discard-modal-body">
          <p className="discard-modal-message">
            If you leave or cancel now, your recent edits will be lost. You can stay and finish, or discard your changes and return to the workspace.
          </p>
        </div>

        <div className="preview-modal-footer discard-modal-footer">
          <button
            type="button"
            className="action-btn secondary discard-cancel-btn"
            onClick={onKeepEditing}
          >
            Keep editing
          </button>
          <button
            type="button"
            className="action-btn danger discard-confirm-btn"
            onClick={onDiscard}
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  )
}

