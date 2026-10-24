import type { MediaQuota } from "../../types/profile"
import {
  formatMB,
  mediaErrorMessage,
} from "../../services/profileMedia.service"
import { Button } from "../ui"

export default function MediaQuotaSummary({
  data,
  loading,
  error,
  reload,
}: {
  data: MediaQuota | null
  loading: boolean
  error: unknown
  reload: () => void
}) {
  return (
    <div className="media-quota" aria-label="Certificate media quota">
      <h3>Certificate storage</h3>
      <p className="helper-text">Attachments only · 1 MB = 1,000,000 bytes</p>
      {data && (
        <>
          <progress
            aria-label="Certificate storage used and reserved"
            max={data.quota_bytes}
            value={data.used_bytes + data.reserved_bytes}
          />
          <dl>
            <div>
              <dt>Used</dt>
              <dd>{formatMB(data.used_bytes)}</dd>
            </div>
            <div>
              <dt>Reserved / processing</dt>
              <dd>{formatMB(data.reserved_bytes)}</dd>
            </div>
            <div>
              <dt>Available</dt>
              <dd>{formatMB(data.available_bytes)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatMB(data.quota_bytes)}</dd>
            </div>
          </dl>
        </>
      )}
      {loading && <p role="status">Loading storage quota…</p>}
      {Boolean(error) && (
        <p className="profile-feedback" role="alert">
          {mediaErrorMessage(error)}
        </p>
      )}
      <Button type="button" variant="ghost" disabled={loading} onClick={reload}>
        Refresh quota
      </Button>
    </div>
  )
}
