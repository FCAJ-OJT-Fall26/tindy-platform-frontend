import { useState, useMemo } from "react"
import { Bot, Check, RotateCcw, Info, ArrowRight } from "lucide-react"
import { Modal, Button } from "../ui"

export interface AiWritingDialogProps {
  isOpen: boolean
  projectName: string
  projectType: string
  tagline: string
  currentDescription: string
  onApplyDraft: (draft: string) => void
  onClose: () => void
}

export default function AiWritingDialog({
  isOpen,
  projectName,
  projectType,
  tagline,
  currentDescription,
  onApplyDraft,
  onClose,
}: AiWritingDialogProps) {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)

  // Generate 2 contextual drafts tailored to student developers
  const drafts = useMemo(() => {
    const title = projectName.trim() || "Our Collaborative Project"
    const type = projectType || "Web Application"
    const pitch = tagline.trim() || "building an impactful solution together"

    return [
      `We're building ${title}, a ${type.toLowerCase()} focused on ${pitch}.

Our team aims to solve real everyday challenges by combining modern developer tooling with thoughtful user experience. Students joining this project will gain practical, hands-on experience designing modular components, architecting clean APIs, and collaborating through real pull requests.

Whether you're looking to sharpen your core skills or explore new technologies, we provide a supportive, feedback-driven environment where every contribution directly shapes the product roadmap.`,

      `${title} is an ambitious ${type.toLowerCase()} initiative designed to deliver a complete, production-ready product slice.

As part of our sprint cycles, we'll be tackling ${pitch}, setting up resilient architecture, and practicing agile teamwork. We believe great software comes from diverse perspectives, open discussions, and iterative shipping.

This is a peer-to-peer workspace where you can safely experiment, review code with teammates, and build a standout portfolio piece that demonstrates both engineering rigor and collaboration.`,
    ]
  }, [projectName, projectType, tagline])

  const activeDraft = drafts[selectedTemplateIndex] || drafts[0]

  if (!isOpen) return null

  return (
    <Modal title="AI Writing Assistant — Project Description" onClose={onClose} wide>
      <div className="ai-writing-dialog-body">
        {/* Intro Banner */}
        <div className="ai-writing-banner">
          <div className="banner-icon-wrap">
            <Bot size={18} />
          </div>
          <div className="banner-content">
            <h4>Generate a draft, then make it your own</h4>
            <p>
              AI drafts give you an instant foundation so you don&rsquo;t have to start from a blank
              page. Review the suggestion below and adopt it as your starting brief.
            </p>
          </div>
        </div>

        {/* Template switcher tabs */}
        <div className="ai-draft-tabs">
          <button
            type="button"
            className={`draft-tab-btn ${selectedTemplateIndex === 0 ? "active" : ""}`}
            onClick={() => setSelectedTemplateIndex(0)}
          >
            Draft 1: Balanced & Practical
          </button>
          <button
            type="button"
            className={`draft-tab-btn ${selectedTemplateIndex === 1 ? "active" : ""}`}
            onClick={() => setSelectedTemplateIndex(1)}
          >
            Draft 2: Portfolio & Architecture
          </button>
        </div>

        {/* Draft text display */}
        <div className="ai-draft-preview-card">
          <pre className="draft-text-content">{activeDraft}</pre>
        </div>

        {/* Warning / Notice */}
        <div className="ai-draft-notice">
          <Info size={16} />
          <span>
            Applying this draft will replace your current description. You can continue editing,
            tailoring, and adding your unique touch before publishing.
          </span>
        </div>

        {/* Dialog footer buttons */}
        <div className="ai-dialog-footer">
          <Button variant="ghost" type="button" onClick={onClose}>
            Keep my version
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApplyDraft(activeDraft)
              onClose()
            }}
          >
            <Bot size={14} /> Use this draft
          </Button>
        </div>
      </div>
    </Modal>
  )
}
