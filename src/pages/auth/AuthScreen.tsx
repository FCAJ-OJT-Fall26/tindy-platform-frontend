import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react"
import { Avatar, Badge } from "../../components/ui"
import { useTindy } from "../../store"
import { registerApi, loginApi, ApiError, startOAuthLogin, authErrorMessage } from "../../services"
import type { OAuthProvider } from "../../types/auth"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

export function AuthScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setAuthUser, authUser, authLoading, sessionError } = useTindy()
  const authPending = useRef(false)

  // Track active mode: login vs register vs forgot with horizontal slide transition
  const [displayRegister, setDisplayRegister] = useState(
    location.pathname === "/register",
  )
  const [transitioning, setTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<
    "to-register" | "to-login" | "to-forgot" | "from-forgot"
  >("to-register")
  const [formPhase, setFormPhase] = useState<"idle" | "leaving" | "entering">("idle")

  const [forgot, setForgot] = useState(false)
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) { authPending.current = false; setLoading(false) }
    }
    window.addEventListener('pageshow', restored)
    return () => window.removeEventListener('pageshow', restored)
  }, [])

  useEffect(() => {
    if (!authLoading && authUser) navigate(authUser.is_onboarding_completed ? "/discover" : "/onboarding", { replace: true })
  }, [authLoading, authUser, navigate])

  const handleOAuth = (provider: OAuthProvider) => {
    if (authPending.current) return
    authPending.current = true
    setLoading(true)
    try { startOAuthLogin(provider) }
    catch (error: unknown) {
      authPending.current = false
      setLoading(false)
      setNotice(authErrorMessage(error))
    }
  }

  // Keep state synchronized with URL (e.g. browser back/forward)
  useEffect(() => {
    const isReg = location.pathname === "/register"
    if (isReg !== displayRegister && !transitioning) {
      setDisplayRegister(isReg)
    }
  }, [location.pathname])

  const handleSwitchMode = (targetRegister: boolean) => {
    if (transitioning) return
    const direction = targetRegister ? "to-register" : "to-login"
    setTransitionDirection(direction)
    setPassword("")
    setConfirmPassword("")
    setNotice("")
    setFieldErrors({})
    setTransitioning(true)
    setFormPhase("leaving")

    // Outgoing form slides out slightly faster (200ms)
    setTimeout(() => {
      setDisplayRegister(targetRegister)
      setForgot(false)
      setFormPhase("entering")
      window.history.replaceState(null, "", targetRegister ? "/register" : "/login")

      // Incoming form enters slightly slower & settles smoothly (380ms) -> total ~580ms
      setTimeout(() => {
        setFormPhase("idle")
        setTransitioning(false)
      }, 380)
    }, 200)
  }

  const handleOpenForgot = () => {
    if (transitioning) return
    setTransitionDirection("to-forgot")
    setNotice("")
    setFieldErrors({})
    setTransitioning(true)
    setFormPhase("leaving")

    setTimeout(() => {
      setForgot(true)
      setFormPhase("entering")

      setTimeout(() => {
        setFormPhase("idle")
        setTransitioning(false)
      }, 380)
    }, 200)
  }

  const handleBackToLogin = () => {
    if (transitioning) return
    setTransitionDirection("from-forgot")
    setNotice("")
    setFieldErrors({})
    setTransitioning(true)
    setFormPhase("leaving")

    setTimeout(() => {
      setForgot(false)
      setFormPhase("entering")

      setTimeout(() => {
        setFormPhase("idle")
        setTransitioning(false)
      }, 380)
    }, 200)
  }

  const transitionClass =
    formPhase === "leaving"
      ? (transitionDirection === "to-register" || transitionDirection === "from-forgot")
        ? "auth-form-leave-to-left"
        : "auth-form-leave-to-right"
      : formPhase === "entering"
        ? (transitionDirection === "to-register" || transitionDirection === "from-forgot")
          ? "auth-form-enter-from-right"
          : "auth-form-enter-from-left"
        : ""

  const mascotClass =
    formPhase !== "idle"
      ? transitionDirection === "to-register"
        ? "mascot-journey-to-register"
        : transitionDirection === "to-login"
          ? "mascot-journey-to-login"
          : ""
      : ""

  const sloganTransitionClass =
    formPhase === "leaving"
      ? transitionDirection === "to-register"
        ? "auth-slogan-leave-to-left"
        : transitionDirection === "to-login"
          ? "auth-slogan-leave-to-right"
          : ""
      : formPhase === "entering"
        ? transitionDirection === "to-register"
          ? "auth-slogan-enter-from-right"
          : transitionDirection === "to-login"
            ? "auth-slogan-enter-from-left"
            : ""
        : ""

  return (
    <div className="auth-page">
      {/* Left Branding Panel: Stable Background with Dynamic Slogan & Mascot Motion */}
      <aside className="auth-story">
        <div className="auth-brand-wrapper">
          <Link className="brand" to="/" aria-label="Tindy home">
            <div className="auth-mascot-box">
              <img
                src="/logo.png"
                alt="Tindy logo"
                className={`brand-logo auth-mascot-img ${mascotClass}`}
              />
            </div>
            <span>
              tindy<span className="brand-period">.</span>
            </span>
          </Link>
        </div>

        <div className="auth-story-copy">
          <div className={`auth-story-copy-inner ${sloganTransitionClass}`}>
            <div className="eyebrow">
              {displayRegister ? "YOUR NEXT CHAPTER" : "FIRST CLOUD AI JOURNEY"}
            </div>
            <h1 className="auth-story-headline">
              {displayRegister ? (
                <>Let’s build something together.</>
              ) : (
                <>
                  Find the right project.
                  <br />
                  Build the right team.
                </>
              )}
            </h1>
            <p className="auth-story-desc">
              {displayRegister
                ? "Join your community. Find your next project."
                : "Your skills have a place. Discover meaningful projects and the people to build them with."}
            </p>
          </div>

          <div className="auth-feature">
            <span>
              <Target size={20} />
            </span>
            <div>
              <strong>Opportunities that fit you</strong>
              <p>Matched to your skills, interests, and ambitions.</p>
            </div>
          </div>
          <div className="auth-feature">
            <span>
              <ShieldCheck size={20} />
            </span>
            <div>
              <strong>Understand every recommendation</strong>
              <p>Clear explanations. Evidence-based connections.</p>
            </div>
          </div>
          <div className="auth-feature">
            <span>
              <Users size={20} />
            </span>
            <div>
              <strong>A community built to build</strong>
              <p>Connect with peers on the same journey.</p>
            </div>
          </div>
        </div>

        <div className="auth-community">
          <div className="avatar-stack">
            <Avatar name="Minh Nguyen" color="teal" />
            <Avatar name="Linh Tran" color="rose" />
            <Avatar name="An Hoang" color="amber" />
          </div>
          <span>Made for the FCAJ student community</span>
        </div>
      </aside>

      {/* Right Form Area */}
      <div className="auth-form-area">
        <Link className="auth-back auth-back-link" to="/">
          Back to Tindy <ArrowUpRight size={14} />
        </Link>

        <section className={`auth-form auth-form-card ${transitionClass}`}>
          <div className="stagger-1">
            <Badge tone="blue">YOUR NEXT CHAPTER</Badge>
          </div>
          <h1 className="stagger-2">
            {forgot
              ? "Reset your password"
              : displayRegister
                ? "Let’s build something great."
                : "Welcome back."}
          </h1>
          <p className="stagger-3">
            {forgot
              ? "Enter your email to request a reset link."
              : displayRegister
                ? "Join your community. Find your next project."
                : "Your next great project is waiting."}
          </p>

          <form
            onSubmit={async (event) => {
              event.preventDefault()
              if (authPending.current) return
              setNotice("")
              setFieldErrors({})

              if (forgot) {
                setNotice("Forgot password is not supported yet by the backend. Please sign in with your credentials.")
                return
              }

              if (displayRegister && password !== confirmPassword) {
                setNotice("Passwords do not match. Please ensure both passwords match.")
                return
              }

              const formData = new FormData(event.currentTarget)
              authPending.current = true
              setLoading(true)

              try {
                if (displayRegister) {
                  const displayName = String(formData.get("name") || "").trim()
                  const university = String(formData.get("university") || "FPT University").trim()
                  const email = String(formData.get("email") || "").trim()
                  const acceptTerms = formData.get("accept_terms") === "on"

                  const session = await registerApi({
                    display_name: displayName,
                    university,
                    email,
                    password,
                    accept_terms: acceptTerms,
                  })

                  setAuthUser(session.user)
                  navigate(session.redirect_to, { replace: true })
                } else {
                  const identifier = String(formData.get("identifier") || "").trim()

                  const session = await loginApi({
                    identifier,
                    password,
                  })

                  setAuthUser(session.user)
                  navigate(session.redirect_to, { replace: true })
                }
              } catch (err: unknown) {
                if (err instanceof ApiError) {
                  if (err.errorCode === "AUTH_INVALID_CREDENTIALS") {
                    setNotice("Invalid email/username or password. Please verify your credentials.")
                  } else if (err.errorCode === "AUTH_EMAIL_ALREADY_EXISTS") {
                    setNotice("This email address is already in use. Please sign in or use another email.")
                  } else if (err.errorCode === "AUTH_TOO_MANY_ATTEMPTS") {
                    setNotice("Too many login attempts. Please wait a minute before trying again.")
                  } else if (err.errorCode === "VALIDATION_FAILED" && err.validationErrors) {
                    setFieldErrors(err.validationErrors)
                    const firstMsg = Object.values(err.validationErrors)[0]?.[0]
                    setNotice(firstMsg || "Input data is invalid. Please check fields.")
                  } else {
                    setNotice(authErrorMessage(err))
                  }
                } else {
                  setNotice(authErrorMessage(err))
                }
              } finally {
                authPending.current = false
                setLoading(false)
              }
            }}
          >
            {displayRegister && (
              <label className="field auth-field stagger-4">
                <span className="field-label">Full name</span>
                <input
                  required
                  name="name"
                  placeholder="Your full name"
                  autoComplete="name"
                />
                {fieldErrors.display_name && (
                  <span className="text-[11px] text-rose-600 mt-1 block">
                    {fieldErrors.display_name[0]}
                  </span>
                )}
                <input
                  name="university"
                  style={{ display: "none" }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </label>
            )}

            {/* Email or Identifier input with subtle focus glow & micro-interaction */}
            <label className="field auth-field stagger-4">
              <span className="field-label">
                {displayRegister ? "Institutional email address" : "Email or Username"}
              </span>
              <input
                required
                name={displayRegister ? "email" : "identifier"}
                type={displayRegister ? "email" : "text"}
                placeholder={displayRegister ? "you@university.edu" : "email or username"}
                autoComplete={displayRegister ? "email" : "username"}
              />
              {(fieldErrors.email || fieldErrors.identifier) && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {(fieldErrors.email || fieldErrors.identifier)?.[0]}
                </span>
              )}
            </label>

            {!forgot && (
              <>
                <label className="field auth-field stagger-5">
                  <span className="field-label">Password</span>
                  <div className="auth-password-wrapper">
                    <input
                      required
                      minLength={8}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (notice) setNotice("")
                      }}
                      placeholder="At least 8 chars (uppercase, lowercase, number, symbol)"
                      autoComplete={
                        displayRegister ? "new-password" : "current-password"
                      }
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span className="text-[11px] text-rose-600 mt-1 block">
                      {fieldErrors.password[0]}
                    </span>
                  )}
                </label>

                {displayRegister && (
                  <label className="field auth-field stagger-5">
                    <span className="field-label">Confirm password</span>
                    <div className="auth-password-wrapper">
                      <input
                        required
                        minLength={8}
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (notice) setNotice("")
                        }}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <span style={{ fontSize: "10px", color: "#e11d48", fontWeight: 500, marginTop: "2px" }}>
                        Passwords do not match
                      </span>
                    )}
                  </label>
                )}

                {!displayRegister && (
                  <div className="stagger-6">
                    <button
                      type="button"
                      className="text-link forgot-link cursor-pointer"
                      onClick={handleOpenForgot}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {displayRegister && (
                  <label className="terms stagger-6">
                    <input required name="accept_terms" type="checkbox" />I agree to the community
                    guidelines and respectful collaboration.
                  </label>
                )}
              </>
            )}

            {/* Submit button with hover lift, shadow increase, and arrow nudge */}
            <div className="stagger-7">
              <button
                type="submit"
                disabled={loading}
                className="auth-btn-primary"
                style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                <span>
                  {loading
                    ? "Processing..."
                    : forgot
                      ? "Request reset link"
                      : displayRegister
                        ? "Create account"
                        : "Sign in"}
                </span>
                <ArrowRight size={16} className="btn-arrow-icon" />
              </button>
            </div>
          </form>

          {!forgot && (
            <div className="stagger-7">
              <div className="auth-divider">
                <span>or continue with</span>
              </div>
              <div className="auth-social-buttons">
                <button
                  type="button"
                  className="auth-social-btn"
                  disabled={loading}
                  onClick={() => handleOAuth('google')}
                >
                  <GoogleIcon />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  className="auth-social-btn"
                  disabled={loading}
                  onClick={() => handleOAuth('github')}
                >
                  <GithubIcon />
                  <span>GitHub</span>
                </button>
              </div>
            </div>
          )}

          {(notice || sessionError) && <div className="info-banner" role="alert" style={{ color: "#e11d48", borderColor: "#fecdd3", background: "#fff1f2" }}>{notice || sessionError}</div>}

          <div className="stagger-8">
            {forgot ? (
              <button
                type="button"
                className="text-link auth-switch auth-back-signin-btn cursor-pointer"
                onClick={() => {
                  handleBackToLogin();
                  setShowPassword(false)
                }}
              >
                <ArrowLeft size={14} className="back-arrow-icon" />
                <span>Back to sign in</span>
              </button>
            ) : (
              <p className="auth-switch">
                {displayRegister
                  ? "Already have an account?"
                  : "New to Tindy?"}{" "}
                <button
                  type="button"
                  className="text-link font-semibold ml-1 cursor-pointer"
                  onClick={() => {
                    handleSwitchMode(!displayRegister);
                    setShowPassword(false)
                  }}
                >
                  {displayRegister ? "Sign in" : "Create an account"}
                </button>
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
export { AuthScreen as Auth }
export default AuthScreen
