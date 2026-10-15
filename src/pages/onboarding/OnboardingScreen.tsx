import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { useNavigate, Link } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  FileText,
} from "lucide-react"
import { Brand, Button, Badge } from "../../components/ui"
import { useTindy } from "../../store"
import {
  getOnboardingProgressApi,
  saveOnboardingStep1Api,
  saveOnboardingStep2Api,
  saveOnboardingStep3Api,
  saveOnboardingStep4Api,
  saveOnboardingStep5Api,
  saveOnboardingStep6Api,
  saveOnboardingStep7Api,
  completeOnboardingApi,
  ApiError,
} from "../../services"
import type { SelectedSkill } from "../../types/catalog"
import { getStoredToken } from "../../services/apiClient"
import SkillSelector from "../../components/onboarding/SkillSelector"
import ProfessionalRoleSelector from "../../components/onboarding/ProfessionalRoleSelector"
import { requestErrorMessage } from "../../components/onboarding/catalogFeedback"

export function OnboardingScreen() {
  const { setProfile, setAuthUser } = useTindy()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"forward" | "backward">("forward")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [draftError, setDraftError] = useState("")
  const [draftRetry, setDraftRetry] = useState(0)

  const panelRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevRectRef = useRef<{ width: number; height: number; step: number } | null>(null)
  const morphTimerRef = useRef<number | null>(null)

  // Fluid PowerPoint Morph transition separating container sizing from inner content
  useLayoutEffect(() => {
    const panel = panelRef.current
    const content = contentRef.current
    if (!panel || !content) return

    if (morphTimerRef.current !== null) {
      window.clearTimeout(morphTimerRef.current)
      morphTimerRef.current = null
    }

    const prev = prevRectRef.current
    if (!prev) {
      prevRectRef.current = {
        width: panel.offsetWidth,
        height: panel.offsetHeight,
        step,
      }
      return
    }

    if (prev.step === step) return

    // Calculate destination container and content width before starting the transition
    const isDestCatalog = step === 1
    const windowW = window.innerWidth
    let targetWidth: number

    if (windowW <= 760) {
      targetWidth = panel.offsetWidth
    } else if (windowW <= 1000) {
      const asideW = isDestCatalog ? 200 : 250
      const gap = isDestCatalog ? 25 : 40
      const avail = Math.min(windowW - 60, isDestCatalog ? 1200 : 1050)
      targetWidth = Math.max(300, avail - asideW - gap)
    } else {
      const asideW = isDestCatalog ? 250 : 290
      const gap = isDestCatalog ? 40 : 65
      const avail = Math.min(windowW - 60, isDestCatalog ? 1200 : 1050)
      targetWidth = Math.max(300, avail - asideW - gap)
    }

    const targetContentWidth = targetWidth - 70 // 35px padding on each side

    // Pre-arrange destination content at its exact destination width to measure natural height
    panel.style.transition = "none"
    panel.style.width = `${targetWidth}px`
    panel.style.height = ""
    content.style.width = `${targetContentWidth}px`

    const targetHeight = panel.offsetHeight
    const prevWidth = prev.width
    const prevHeight = prev.height

    const widthDiff = Math.abs(prevWidth - targetWidth)
    const heightDiff = Math.abs(prevHeight - targetHeight)

    if (widthDiff > 2 || heightDiff > 2) {
      panel.classList.add("is-morphing")
      // Start container from previous dimensions, keeping content locked to destination width
      panel.style.width = `${prevWidth}px`
      panel.style.height = `${prevHeight}px`

      // Force reflow
      void panel.offsetWidth

      // Animate container to destination dimensions without squeezing inner content
      const easing = "cubic-bezier(0.22, 1, 0.36, 1)"
      panel.style.transition = `width 480ms ${easing}, height 480ms ${easing}`
      panel.style.width = `${targetWidth}px`
      panel.style.height = `${targetHeight}px`

      const cleanup = () => {
        panel.classList.remove("is-morphing")
        panel.style.width = ""
        panel.style.height = ""
        panel.style.transition = ""
        content.style.width = ""
        if (morphTimerRef.current !== null) {
          window.clearTimeout(morphTimerRef.current)
          morphTimerRef.current = null
        }
      }

      const onEnd = (e: TransitionEvent) => {
        if (e.target === panel && (e.propertyName === "height" || e.propertyName === "width")) {
          panel.removeEventListener("transitionend", onEnd)
          cleanup()
        }
      }
      panel.addEventListener("transitionend", onEnd)
      morphTimerRef.current = window.setTimeout(cleanup, 500)
    } else {
      panel.style.width = ""
      panel.style.height = ""
      content.style.width = ""
    }

    prevRectRef.current = {
      width: targetWidth,
      height: targetHeight,
      step,
    }
  }, [step])

  useEffect(() => {
    const handleResize = () => {
      const panel = panelRef.current
      if (panel) {
        prevRectRef.current = {
          width: panel.offsetWidth,
          height: panel.offsetHeight,
          step,
        }
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [step])

  // Fluid Morph animation for progress percentage counter
  const targetPercent = Math.round(((step + 1) / 8) * 100)
  const [displayPercent, setDisplayPercent] = useState(targetPercent)
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    setPulseKey((k) => k + 1)
    const startPercent = displayPercent
    const diff = targetPercent - startPercent
    if (diff === 0) return

    const duration = 480
    const startTime = performance.now()
    let rafId: number

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startPercent + diff * ease)
      setDisplayPercent(current)

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setDisplayPercent(targetPercent)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [targetPercent])

  const goToStep = (targetStep: number) => {
    setDirection(targetStep >= step ? "forward" : "backward")
    setStep(targetStep)
    setErrorMessage("")
  }

  // Onboarding form state according to API contract
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [university, setUniversity] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [skillsValid, setSkillsValid] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null)
  const [roleValid, setRoleValid] = useState(false)
  const [professionalInterests, setProfessionalInterests] = useState("")
  const [learningGoals, setLearningGoals] = useState("")
  const [availableHours, setAvailableHours] = useState(10)
  const [previousProjects, setPreviousProjects] = useState("")
  const [technologiesToLearn, setTechnologiesToLearn] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [bio, setBio] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const isOptionalStep = step === 4 || step === 5 || step === 6

  const steps = [
    "Basic information",
    "Technical skills",
    "Preferred role",
    "Availability",
    "Interests & Goals",
    "Projects & experience",
    "GitHub & Links",
    "Review & complete profile",
  ]

  // Restore the server draft before mounting selectors or allowing edits.
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    setInitialLoading(true)
    setDraftError("")
    if (!getStoredToken()) {
      navigate("/login", { replace: true })
      return
    }
    getOnboardingProgressApi(controller.signal)
      .then((data) => {
        if (!isMounted) return
        setCompletedSteps(data.completed_steps || [])

        // Đổ dữ liệu từ server vào form
        if (data.step_data) {
          const s1 = data.step_data["1"]
          if (s1) {
            setUsername(s1.username ?? "")
            setDisplayName(s1.display_name ?? "")
            setUniversity(s1.university ?? "")
          }

          const s2 = data.step_data["2"]
          const names = new Map((s2?.skills ?? []).map(skill => [skill.skill_id, skill.name]))
          setSelectedSkills([...new Set(s2?.skill_ids ?? [])].map(skill_id => ({ skill_id, name: names.get(skill_id) ?? null })))

          const s3 = data.step_data["3"]
          setSelectedRoleId(s3?.preferred_role_id ?? null)
          setSelectedRoleName(s3?.preferred_role ?? null)

          const s4 = data.step_data["4"]
          if (s4) {
            setProfessionalInterests(s4.professional_interests ?? "")
            setLearningGoals(s4.learning_goals ?? "")
          }

          const s5 = data.step_data["5"]
          setAvailableHours(s5?.available_hours_per_week ?? 10)

          const s6 = data.step_data["6"]
          if (s6) {
            setPreviousProjects(s6.previous_projects_and_contribution ?? "")
            setTechnologiesToLearn(s6.technologies_to_learn ?? "")
          }

          const s7 = data.step_data["7"]
          if (s7) {
            setGithubUrl(s7.github_url ?? "")
            setWebsiteUrl(s7.personal_website_url ?? "")
          }

          const s8 = data.step_data["8"]
          setBio(s8?.bio ?? "")
        }

        if (data.is_onboarding_completed) {
          navigate("/discover", { replace: true })
        } else if (data.current_step) {
          setStep(Math.max(0, Math.min(7, data.current_step - 1)))
        }
      })
      .catch((err) => {
        if (!isMounted) return
        if (err instanceof ApiError && err.status === 401) setAuthUser(null)
        setDraftError(requestErrorMessage(err))
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false)
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [draftRetry, navigate, setAuthUser])

  const handleStepSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    setErrorMessage("")
    setLoading(true)

    try {
      if (step === 0) {
        // Step 1
        const res = await saveOnboardingStep1Api({
          username: username.trim(),
          display_name: displayName.trim(),
          university: university.trim(),
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({
          ...prev,
          name: displayName,
          university,
        }))
        setAuthUser(prev => prev ? { ...prev, username: username.trim(), display_name: displayName.trim(), university: university.trim() } : null)
        goToStep(res.next_step ? res.next_step - 1 : 1)
      } else if (step === 1) {
        // Step 2
        const selectedSkillIds = [...new Set(selectedSkills.map(skill => skill.skill_id))]
        if (!skillsValid || selectedSkillIds.length < 1 || selectedSkillIds.length > 30) {
          setErrorMessage("Please select 1–30 available skills from the catalog.")
          return
        }
        const res = await saveOnboardingStep2Api({
          skill_ids: selectedSkillIds,
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({ ...prev, skills: selectedSkills.flatMap(skill => skill.name ? [skill.name] : []) }))
        goToStep(res.next_step ? res.next_step - 1 : 2)
      } else if (step === 2) {
        // Step 3
        if (!selectedRoleId || !roleValid) {
          setErrorMessage("Please select an available professional role.")
          return
        }
        const res = await saveOnboardingStep3Api({
          preferred_role_id: selectedRoleId,
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({ ...prev, role: selectedRoleName ?? "" }))
        goToStep(res.next_step ? res.next_step - 1 : 3)
      } else if (step === 3) {
        // Step 4 in UI: Availability
        const hours = Math.max(1, Math.min(40, Number(availableHours) || 10))
        const res = await saveOnboardingStep5Api({
          available_hours_per_week: hours,
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({ ...prev, hours: String(hours) }))
        goToStep(4)
      } else if (step === 4) {
        // Step 5 in UI: Interests & Goals (optional)
        const res = await saveOnboardingStep4Api({
          professional_interests: professionalInterests.trim() || null,
          learning_goals: learningGoals.trim() || null,
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({
          ...prev,
          interests: professionalInterests,
          goals: learningGoals,
        }))
        goToStep(5)
      } else if (step === 5) {
        // Step 6 in UI: Projects & experience (optional)
        const res = await saveOnboardingStep6Api({
          previous_projects_and_contribution: previousProjects.trim() || null,
          technologies_to_learn: technologiesToLearn.trim() || null,
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({
          ...prev,
          experience: previousProjects,
          technologies: technologiesToLearn,
        }))
        goToStep(6)
      } else if (step === 6) {
        // Step 7 in UI: GitHub & Links (optional)
        const res = await saveOnboardingStep7Api({
          github_url: githubUrl.trim() || null,
          personal_website_url: websiteUrl.trim() || null,
        })
        setCompletedSteps(res.completed_steps)
        setProfile((prev) => ({
          ...prev,
          github: githubUrl,
          portfolio: websiteUrl,
        }))
        goToStep(7)
      } else if (step === 7) {
        // Step 8 Complete
        if (!confirmed) {
          setErrorMessage("Please confirm that you have reviewed your profile information.")
          setLoading(false)
          return
        }

        const res = await completeOnboardingApi({
          confirmed: true,
          bio: bio.trim() || null,
        })

        setCompletedSteps(res.completed_steps)
        if (!res.is_onboarding_completed) {
          setErrorMessage("Your profile has not been completed yet. Please review the required steps and try again.")
          return
        }
        setAuthUser((prev) => prev ? { ...prev, is_onboarding_completed: res.is_onboarding_completed } : null)
        setProfile((prev) => ({ ...prev, summary: bio }))
        navigate(res.redirect_to || "/discover", { replace: true })
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setAuthUser(null)
          setErrorMessage(requestErrorMessage(err))
        } else if (err.errorCode === "USERNAME_ALREADY_EXISTS") {
          setErrorMessage("This username is already taken. Please choose another username.")
        } else if (err.errorCode === "ONBOARDING_INCOMPLETE") {
          const missing = err.missingSteps?.join(", ") || ""
          setErrorMessage(`Please complete all required steps first. Missing steps: ${missing}`)
        } else {
          setErrorMessage(requestErrorMessage(err))
        }
      } else {
        setErrorMessage(requestErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkipStep = async () => {
    if (loading) return
    setErrorMessage("")
    setLoading(true)

    try {
      if (step === 4) {
        // Skip Interests & Goals
        const res = await saveOnboardingStep4Api({
          professional_interests: professionalInterests.trim() || null,
          learning_goals: learningGoals.trim() || null,
        })
        setCompletedSteps(res.completed_steps)
        goToStep(5)
      } else if (step === 5) {
        // Skip Projects & experience
        const res = await saveOnboardingStep6Api({
          previous_projects_and_contribution: previousProjects.trim() || null,
          technologies_to_learn: technologiesToLearn.trim() || null,
        })
        setCompletedSteps(res.completed_steps)
        goToStep(6)
      } else if (step === 6) {
        // Skip GitHub & Links
        const res = await saveOnboardingStep7Api({
          github_url: githubUrl.trim() || null,
          personal_website_url: websiteUrl.trim() || null,
        })
        setCompletedSteps(res.completed_steps)
        goToStep(7)
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setAuthUser(null)
          setErrorMessage(requestErrorMessage(err))
        } else {
          setErrorMessage(requestErrorMessage(err))
        }
      } else {
        setErrorMessage(requestErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="onboarding flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brand />
          <p className="mt-4 text-sm text-slate-500">Loading your profile progress...</p>
        </div>
      </div>
    )
  }

  if (draftError) {
    return (
      <div className="onboarding flex items-center justify-center min-h-screen p-6">
        <div className="onboarding-panel catalog-draft-error">
          <Brand />
          <h1>Unable to load your progress</h1>
          <p role="alert">{draftError}</p>
          <Button type="button" onClick={() => setDraftRetry(value => value + 1)}>Retry</Button>
          <Link className="text-link" to="/login">Sign in again</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      <header>
        <Brand />
        <span>YOUR FCAJ JOURNEY</span>
        <Link className="text-link" to="/">
          Save & finish later <ArrowUpRight size={13} />
        </Link>
      </header>
      <div className={`onboarding-layout ${step === 1 ? "onboarding-catalog-layout" : ""}`}>
        <aside>
          <div className="eyebrow">A STRONG START</div>
          <h2>
            A profile that opens{" "}
            <br />
            the right doors.
          </h2>
          <p>
            Tell us a little about yourself. We’ll help you find where you fit.
          </p>
          <ol>
            {steps.map((name, index) => {
              const backendStepNum = [1, 2, 3, 5, 4, 6, 7, 8][index]
              const isStepDone = completedSteps.includes(backendStepNum)
              return (
                <li
                  className={
                    index === step ? "active" : isStepDone ? "complete" : ""
                  }
                  key={name}
                  onClick={() => {
                    // Cho phép nhảy về các bước đã lưu
                    if (!loading && (isStepDone || index <= step)) {
                      goToStep(index)
                    }
                  }}
                  style={{ cursor: isStepDone || index <= step ? "pointer" : "default" }}
                >
                  <span>{isStepDone ? <Check size={14} /> : index + 1}</span>
                  {name}
                </li>
              )
            })}
          </ol>
        </aside>
        <section ref={panelRef} className={`onboarding-panel ${step === 1 ? "onboarding-skills-panel" : ""}`}>
          <div className="step-caption">
            STEP {step + 1} OF 8{" "}
            <span key={pulseKey} className="step-caption-pulse">{displayPercent}%</span>
          </div>
          <div className="progress">
            <span style={{ width: `${((step + 1) / 8) * 100}%` }} />
          </div>

          <div
            key={step}
            ref={contentRef}
            className={`onboarding-step-content ${
              direction === "forward"
                ? "step-slide-forward"
                : "step-slide-backward"
            }`}
          >
            <h1>{steps[step]}</h1>
          <p className="muted">
            {
              [
                "Choose a unique username and check your basic information.",
                "What tools and technologies do you feel comfortable working with?",
                "What would you like to contribute to a team?",
                "Find a project that fits your schedule.",
                "What kind of work gets you curious and what do you want to learn?",
                "Your experience matters — including course sprints and personal projects.",
                "Link your GitHub and online portfolios for review.",
                "Review your story. Make it sound like you.",
              ][step]
            }
          </p>

          {errorMessage && (
            <div role="alert" className="mb-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-xs">
              {errorMessage}
              {!getStoredToken() && <Link className="text-link" to="/login">Sign in again</Link>}
            </div>
          )}

          <form onSubmit={handleStepSubmit}>
            <fieldset className="onboarding-fields onboarding-form-fields" disabled={loading}>
              {step === 0 && (
                <>
                  <label className="field">
                    Username (unique identifier: letters, numbers, _, .)
                    <input
                      required
                      pattern="^[A-Za-z0-9_.]{3,50}$"
                      placeholder="e.g. nguyenvana"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      3–50 characters, only letters, numbers, dot and underscore.
                    </span>
                  </label>
                  <label className="field">
                    Full name
                    <input
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    University / community
                    <input
                      required
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                    />
                  </label>
                </>
              )}

              {step === 1 && (
                <SkillSelector selected={selectedSkills} onChange={setSelectedSkills} onValidityChange={setSkillsValid} />
              )}

              {step === 2 && (
                <ProfessionalRoleSelector
                  selectedId={selectedRoleId}
                  selectedName={selectedRoleName}
                  onChange={role => { setSelectedRoleId(role.professional_role_id); setSelectedRoleName(role.name) }}
                  onNameResolved={setSelectedRoleName}
                  onValidityChange={setRoleValid}
                />
              )}

              {step === 3 && (
                <>
                  <label className="field">
                    Hours available per week (1 - 40)
                    <input
                      type="number"
                      required
                      min="1"
                      max="40"
                      value={availableHours}
                      onChange={(event) =>
                        setAvailableHours(Math.max(1, Math.min(40, Number(event.target.value))))
                      }
                    />
                  </label>
                  <div className="info-banner">
                    <Clock size={18} />
                    Be realistic. A sustainable schedule makes for a better team experience.
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <label className="field">
                    Professional interests (optional)
                    <textarea
                      rows={4}
                      placeholder="e.g. Cloud-native architecture, Distributed systems, Machine Learning"
                      value={professionalInterests}
                      onChange={(e) => setProfessionalInterests(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Learning goals (optional)
                    <textarea
                      rows={4}
                      placeholder="e.g. Master ASP.NET Core & Kubernetes microservices"
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                    />
                  </label>
                </>
              )}

              {step === 5 && (
                <>
                  <label className="field">
                    Previous projects & your contribution (optional)
                    <textarea
                      rows={4}
                      placeholder="Built a team workspace tool with real-time sockets..."
                      value={previousProjects}
                      onChange={(e) => setPreviousProjects(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Technologies you want to learn (optional)
                    <input
                      placeholder="e.g. AWS Lambda, Kafka, GraphQL"
                      value={technologiesToLearn}
                      onChange={(e) => setTechnologiesToLearn(e.target.value)}
                    />
                  </label>
                </>
              )}

              {step === 6 && (
                <>
                  <label className="field">
                    GitHub profile URL (optional)
                    <input
                      type="url"
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Personal website / portfolio URL (optional)
                    <input
                      type="url"
                      placeholder="https://yourportfolio.dev"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    URLs must start with http:// or https://, or be left empty.
                  </span>
                </>
              )}

              {step === 7 && (
                <>
                  <Badge tone="blue">
                    <FileText size={13} />
                    YOUR PROFILE BIO
                  </Badge>
                  <label className="field">
                    Profile Bio / Summary (optional)
                    <textarea
                      rows={5}
                      maxLength={2000}
                      placeholder="Tell collaborators about your strengths and passions..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </label>
                  <label className="terms">
                    <input
                      required
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I’ve reviewed my profile information and confirm it is accurate.
                  </label>
                </>
              )}
            </fieldset>

            <div className="onboarding-actions">
              <Button
                variant="ghost"
                type="button"
                disabled={step === 0 || loading}
                onClick={() => {
                  goToStep(step - 1)
                }}
              >
                <ArrowLeft size={15} />
                Back
              </Button>
              <div className="onboarding-action-buttons">
                {isOptionalStep && (
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={loading}
                    onClick={handleSkipStep}
                    className="btn-skip"
                  >
                    Skip
                  </Button>
                )}
                <Button disabled={loading || (step === 1 && !skillsValid) || (step === 2 && !roleValid)}>
                  {loading
                    ? "Saving..."
                    : step === 7
                      ? "Confirm & finish"
                      : "Continue"}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </form>
          </div>
        </section>
      </div>
    </div>
  )
}

export { OnboardingScreen as Onboarding }
export default OnboardingScreen
