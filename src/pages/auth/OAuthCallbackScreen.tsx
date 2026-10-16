import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { ShieldCheck } from "lucide-react"
import { useTindy } from "../../store"
import { getStoredToken, setStoredToken } from "../../services/apiClient"
import { authErrorMessage } from "../../services/authValidation"
import {
  captureOAuthCallback,
  callbackErrorMessage,
  settleOAuthCallback,
} from "../../services/oauthCallback"
import {
  clearLinkUser,
  confirmAccountConnectionApi,
  exchangeOAuthTicketApi,
  readLinkUser,
} from "../../services/oauth.service"

export default function OAuthCallbackScreen() {
  const location = useLocation()
  const attempt = useMemo(
    () => captureOAuthCallback(),
    [location.key, location.hash, location.search],
  )
  const { authLoading, authUser, setAuthUser } = useTindy()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!attempt || attempt.handled) return
    if (
      attempt.error ||
      (!attempt.ticket && !attempt.loginRequest && !attempt.linkRequest)
    ) {
      if (attempt.flow === "link") clearLinkUser()
      setError(callbackErrorMessage(attempt.error, attempt.flow === "link"))
      settleOAuthCallback(attempt)
      return
    }
    if (attempt.flow === "link" && authLoading) return
    let active = true
    const sessionToken = getStoredToken()
    setError(null)
    if (
      attempt.flow === "link" &&
      (!sessionToken || !authUser || readLinkUser() !== authUser.user_id)
    ) {
      clearLinkUser()
      settleOAuthCallback(attempt)
      setError(
        "Sign in to the original Tindy account and start the connection again in Settings. Your current session has not been changed.",
      )
      return
    }
    const finish = async () => {
      try {
        if (attempt.flow === "login") {
          attempt.loginRequest ??= exchangeOAuthTicketApi(attempt.ticket!)
          attempt.ticket = null
          const session = await attempt.loginRequest
          if (!active || getStoredToken() !== sessionToken) return
          attempt.handled = true
          setStoredToken(session.access_token)
          setAuthUser(session.user)
          navigate(session.redirect_to, { replace: true })
        } else {
          attempt.linkRequest ??= confirmAccountConnectionApi(attempt.ticket!)
          attempt.ticket = null
          await attempt.linkRequest
          if (!active || getStoredToken() !== sessionToken) return
          attempt.handled = true
          clearLinkUser()
          navigate("/settings", {
            replace: true,
            state: { connectionUpdated: true },
          })
        }
      } catch (failure: unknown) {
        if (!active) return
        if (attempt.flow === "link") clearLinkUser()
        setError(authErrorMessage(failure, attempt.flow === "link"))
      } finally {
        settleOAuthCallback(attempt)
      }
    }
    void finish()
    return () => {
      active = false
    }
  }, [attempt, authLoading, authUser, navigate, setAuthUser])

  return (
    <main
      className="auth-page"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        className="panel"
        style={{ width: "100%", maxWidth: 520, padding: 32 }}
      >
        <ShieldCheck size={28} aria-hidden="true" />
        <h1 style={{ marginTop: 16 }}>
          {error ? "Let’s try that again." : "Completing your sign-in…"}
        </h1>
        {error ? (
          <>
            <p role="alert" style={{ margin: "16px 0" }}>
              {error}
            </p>
            <Link
              className="btn btn-primary"
              to={attempt?.flow === "link" && authUser ? "/settings" : "/login"}
              replace
            >
              {attempt?.flow === "link" && authUser
                ? "Back to Settings"
                : "Back to sign in"}
            </Link>
          </>
        ) : (
          <p role="status" style={{ marginTop: 16 }}>
            Please wait while Tindy securely completes your request.
          </p>
        )}
      </section>
    </main>
  )
}
