import React, { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

interface CustomSkillsInputProps {
  customSkills: string[]
  onChange: (skills: string[]) => void
  disabled?: boolean
  maxSkills?: number
}

export function CustomSkillsInput({
  customSkills = [],
  onChange,
  disabled = false,
  maxSkills = 30,
}: CustomSkillsInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const addTag = (text: string) => {
    const trimmed = text.trim().replace(/^,+|,+$/g, "")
    if (!trimmed) return

    if (trimmed.length > 50) {
      setError("Mỗi kỹ năng không quá 50 ký tự.")
      return
    }

    if (customSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Kỹ năng "${trimmed}" đã có trong danh sách.`)
      return
    }

    if (customSkills.length >= maxSkills) {
      setError(`Tối đa ${maxSkills} kỹ năng tự do.`)
      return
    }

    setError(null)
    onChange([...customSkills, trimmed])
    setInputValue("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && customSkills.length > 0) {
      onChange(customSkills.slice(0, -1))
    }
  }

  const handleRemove = (indexToRemove: number) => {
    setError(null)
    onChange(customSkills.filter((_, idx) => idx !== indexToRemove))
  }

  return (
    <div className="custom-skills-container" style={{ marginTop: "16px" }}>
      <label
        htmlFor="custom-skills-input"
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "6px",
        }}
      >
        Thêm kỹ năng khác (Custom skills)
      </label>
      <div
        style={{
          border: "1px dashed #93c5fd",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          padding: "8px 12px",
          minHeight: "44px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px",
          transition: "border-color 0.15s ease",
        }}
      >
        {customSkills.map((skill, index) => (
          <span
            key={index}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              border: "1px dashed #3b82f6",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <span>{skill}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0",
                  marginLeft: "2px",
                  color: "#6b7280",
                  borderRadius: "50%",
                }}
                title={`Xoá ${skill}`}
                aria-label={`Xoá ${skill}`}
              >
                <X size={14} />
              </button>
            )}
          </span>
        ))}

        {!disabled && customSkills.length < maxSkills && (
          <input
            id="custom-skills-input"
            type="text"
            value={inputValue}
            onChange={(e) => {
              setError(null)
              const val = e.target.value
              if (val.includes(",")) {
                const parts = val.split(",")
                for (let i = 0; i < parts.length - 1; i++) {
                  addTag(parts[i])
                }
                setInputValue(parts[parts.length - 1])
              } else {
                setInputValue(val)
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addTag(inputValue)
              }
            }}
            placeholder={
              customSkills.length === 0
                ? "Gõ kỹ năng (ví dụ: LangChain, Next.js 15) rồi nhấn Enter hoặc dấu phẩy"
                : "Thêm kỹ năng khác..."
            }
            style={{
              flex: "1 1 180px",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "13px",
              color: "#1f2937",
              minWidth: "150px",
              padding: "4px 0",
            }}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "4px",
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        <span>
          Nhấn <strong>Enter</strong> hoặc dấu <strong>phẩy (,)</strong> để tạo tag kỹ năng tự do.
        </span>
        <span>
          {customSkills.length}/{maxSkills} tags
        </span>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}

export default CustomSkillsInput
