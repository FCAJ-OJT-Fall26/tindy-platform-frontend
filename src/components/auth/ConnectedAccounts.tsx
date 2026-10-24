import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router"
import { KeyRound, Link2 } from "lucide-react"
import type { AccountConnections, OAuthProvider } from "../../types/auth"
import { useTindy } from "../../store"
import { ApiError, getStoredToken } from "../../services/apiClient"
import { authErrorMessage } from "../../services/authValidation"
import {
  disconnectAccountApi,
  getAccountConnectionsApi,
  rememberLinkUser,
  startAccountConnectionApi,
} from "../../services/oauth.service"

export default function ConnectedAccounts() {
  const { authUser, ownerProfile } = useTindy()
  const location = useLocation()
  const [data, setData] = useState<AccountConnections | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState<OAuthProvider | null>(null)
  const pending = useRef(false)
  const mounted = useRef(false)
  const [confirm, setConfirm] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState(
    location.state?.connectionUpdated === true
      ? "Account connected successfully."
      : "",
  )

  useEffect(() => {
    mounted.current = true
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        pending.current = false
        setBusy(null)
        setRetry((value) => value + 1)
      }
    }
    window.addEventListener("pageshow", restored)
    return () => {
      mounted.current = false
      window.removeEventListener("pageshow", restored)
    }
  }, [])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setError("")
    getAccountConnectionsApi(controller.signal)
      .then((connections) => {
        if (active) setData(connections)
      })
      .catch((failure: unknown) => {
        if (active) setError(authErrorMessage(failure, true))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [retry])

  const connect = async (provider: OAuthProvider) => {
    if (pending.current || !authUser) return
    pending.current = true
    setBusy(provider)
    setError("")
    const sessionToken = getStoredToken()
    let navigating = false
    try {
      const url = await startAccountConnectionApi(provider)
      if (
        !mounted.current ||
        !sessionToken ||
        getStoredToken() !== sessionToken
      )
        return
      rememberLinkUser(authUser.user_id)
      window.location.assign(url)
      navigating = true
    } catch (failure: unknown) {
      setError(authErrorMessage(failure, true))
    } finally {
      if (!navigating) {
        pending.current = false
        setBusy(null)
      }
    }
  }

  const disconnect = async (provider: OAuthProvider) => {
    if (pending.current) return
    pending.current = true
    setBusy(provider)
    setError("")
    setNotice("")
    try {
      await disconnectAccountApi(provider)
      ownerProfile.reload()
      setConfirm(null)
      setNotice("Account disconnected. Your Tindy session is still active.")
      setRetry((value) => value + 1)
    } catch (failure: unknown) {
      setError(
        failure instanceof ApiError && failure.status === 409
          ? "Keep at least one sign-in method. Connect another provider before disconnecting your last method, or reload if your connections changed."
          : authErrorMessage(failure, true),
      )
      setConfirm(null)
    } finally {
      pending.current = false
      setBusy(null)
    }
  }

  return (
    <div className="connected-accounts" style={{ marginTop: 24 }}>
      <h3>Connected accounts</h3>
      <p
        style={{
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--muted)",
          margin: "8px 0 16px",
        }}
      >
        Choose how you sign in to Tindy. Keep at least one sign-in method
        connected.
      </p>
      {notice && (
        <p className="info-banner" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="info-banner" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p role="status">Loading connected accounts…</p>
      ) : (
        data && (
          <>
            <div className="toggle-row">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <KeyRound size={16} aria-hidden="true" /> Local Password
              </span>
              <strong>
                {data.has_local_password ? "Connected" : "Not configured"}
              </strong>
            </div>
            {(["google", "github"] as const).map((provider) => {
              const name = provider === "google" ? "Google" : "GitHub"
              const connected = data.providers.find(
                (item) => item.provider === name,
              )
              return (
                <div
                  className="toggle-row"
                  key={provider}
                  style={{ gap: 12, flexWrap: "wrap" }}
                >
                  <div>
                    <strong
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Link2 size={16} />
                      {name}
                    </strong>
                    <span style={{ display: "block", marginTop: 4 }}>
                      {connected ? "Connected" : "Not connected"}
                      {connected?.provider_username
                        ? ` · ${connected.provider_username}`
                        : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy !== null || loading}
                    aria-label={`${
                      connected ? "Disconnect" : "Connect"
                    } ${name}`}
                    onClick={() =>
                      connected ? setConfirm(provider) : void connect(provider)
                    }
                  >
                    {busy === provider
                      ? "Please wait…"
                      : connected
                        ? "Disconnect"
                        : "Connect"}
                  </button>
                </div>
              )
            })}
          </>
        )
      )}
      {!loading && (
        <button
          type="button"
          className="text-link"
          style={{ fontSize: 12, marginTop: 12 }}
          disabled={busy !== null}
          onClick={() => setRetry((value) => value + 1)}
        >
          Reload connections
        </button>
      )}
      {confirm && (
        <div
          className="info-banner"
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="disconnect-title"
          style={{ marginTop: 16 }}
        >
          <strong id="disconnect-title">
            Disconnect {confirm === "google" ? "Google" : "GitHub"} account?
          </strong>
          <p>You will need another connected method to sign in next time.</p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => void disconnect(confirm)}
            >
              Confirm disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
