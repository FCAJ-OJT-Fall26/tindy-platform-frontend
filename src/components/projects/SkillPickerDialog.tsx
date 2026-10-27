import { useState, useEffect } from "react"
import { Modal, Button } from "../ui"
import type { CatalogSkill, SelectedSkill } from "../../types/catalog"
import { getCachedSkills } from "../../services/catalog.service"
import SkillSelector from "../onboarding/SkillSelector"

export interface SkillPickerDialogProps {
  isOpen: boolean
  roleTitle: string
  groupMode: "required" | "nice"
  initialSelected: SelectedSkill[]
  oppositeGroupSkills: SelectedSkill[]
  availableSkills?: CatalogSkill[]
  onApply: (newSelected: SelectedSkill[], removedFromOpposite: string[]) => void
  onClose: () => void
}

export default function SkillPickerDialog({
  isOpen,
  roleTitle,
  groupMode,
  initialSelected,
  oppositeGroupSkills,
  availableSkills,
  onApply,
  onClose,
}: SkillPickerDialogProps) {
  const [selectedList, setSelectedList] = useState<SelectedSkill[]>([])

  // Resolve skill IDs against catalog so none are marked (unavailable)
  useEffect(() => {
    if (isOpen) {
      const cached = getCachedSkills() || availableSkills || []
      const resolved = initialSelected.map((s) => {
        const sName = (s.name || s.skill_id).toLowerCase().trim()
        const matched = cached.find(
          (cs) =>
            cs.name.toLowerCase().trim() === sName ||
            cs.skill_id === s.skill_id ||
            cs.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") ===
              s.skill_id.replace(/^skill_/, ""),
        )
        return matched ? { skill_id: matched.skill_id, name: matched.name } : s
      })
      setSelectedList(resolved)
    }
  }, [isOpen, initialSelected, availableSkills])

  if (!isOpen) return null

  const isRequired = groupMode === "required"

  const handleApplyClick = () => {
    // Deduplicate: identify any skill in selectedList that was in the opposite group
    const newSelectedNames = new Set(
      selectedList.map((s) => (s.name || s.skill_id).toLowerCase()),
    )
    const removedFromOpposite = oppositeGroupSkills
      .filter((s) => newSelectedNames.has((s.name || s.skill_id).toLowerCase()))
      .map((s) => s.name || s.skill_id)

    onApply(selectedList, removedFromOpposite)
    onClose()
  }

  return (
    <Modal
      title={`Select Skills — ${roleTitle || "Role"}`}
      onClose={onClose}
      wide
    >
      <div className="project-skill-selector-modal-wrapper">
        <SkillSelector
          selected={selectedList}
          onChange={setSelectedList}
          min={0}
          max={15}
          savedSkills={getCachedSkills() || availableSkills || []}
          allowInactiveSaved={true}
          selectedHeading={`${isRequired ? "Required" : "Nice-to-have"} skills (${selectedList.length}/15)`}
          subtitle={
            isRequired
              ? "Skills teammates should already have before joining."
              : "A bonus, not a barrier to joining the team."
          }
        />
      </div>

      <div className="project-skill-selector-modal-footer">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleApplyClick}>
          Apply {selectedList.length} skill{selectedList.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </Modal>
  )
}
