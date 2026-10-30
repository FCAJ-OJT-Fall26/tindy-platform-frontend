import React, { useId } from "react"

interface MinMatchScoreSliderProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export default function MinMatchScoreSlider({
  value,
  onChange,
  className = "",
}: MinMatchScoreSliderProps) {
  const idPrefix = useId()

  return (
    <div className={`space-y-1.5 lg:space-y-2 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <label
          htmlFor={`${idPrefix}-score-slider`}
          className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate"
        >
          Min Match Score
        </label>
        <div
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded border shrink-0 transition-colors ${
            value < 35
              ? "bg-rose-50 border-rose-300 text-rose-700"
              : value <= 65
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-emerald-50 border-emerald-300 text-emerald-800"
          }`}
        >
          <input
            id={`${idPrefix}-score-input`}
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") {
                onChange(0)
                return
              }
              const val = Math.round(Number(raw))
              if (!Number.isNaN(val)) {
                onChange(Math.max(0, Math.min(100, val)))
              }
            }}
            className="w-8 text-right font-mono font-bold text-xs bg-transparent focus:outline-none p-0 border-0 m-0"
            title="Type any number to filter minimum match score"
            aria-label="Minimum match score percentage"
          />
          <span className="font-mono font-bold text-xs opacity-75">%</span>
        </div>
      </div>

      {/* Dynamic Tiered Range Slider */}
      <div className="space-y-1 lg:space-y-1.5 pt-0.5 lg:pt-1 min-w-0">
        <input
          id={`${idPrefix}-score-slider`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Minimum match score slider"
          className="custom-range-slider block w-full"
          style={{
            background:
              value === 0
                ? "#e2e8f0"
                : `linear-gradient(to right, ${
                    value < 35
                      ? "#f43f5e"
                      : value <= 65
                      ? "#f59e0b"
                      : "#10b981"
                  } 0%, ${
                    value < 35
                      ? "#f43f5e"
                      : value <= 65
                      ? "#f59e0b"
                      : "#10b981"
                  } ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`,
          }}
        />

        {/* Exact threshold tick markers */}
        <div className="relative h-4 text-[10px] font-mono select-none w-full">
          <button
            type="button"
            onClick={() => onChange(0)}
            className="absolute left-0 text-rose-600 hover:font-bold transition-all cursor-pointer"
            title="Set to 0%"
          >
            0%
          </button>
          <button
            type="button"
            onClick={() => onChange(35)}
            className="absolute left-[35%] -translate-x-1/2 text-amber-600 hover:font-bold transition-all cursor-pointer"
            title="Set to 35%"
          >
            35%
          </button>
          <button
            type="button"
            onClick={() => onChange(65)}
            className="absolute left-[65%] -translate-x-1/2 text-emerald-600 hover:font-bold transition-all cursor-pointer"
            title="Set to 65%"
          >
            65%
          </button>
          <button
            type="button"
            onClick={() => onChange(100)}
            className="absolute right-0 text-emerald-700 hover:font-bold transition-all cursor-pointer"
            title="Set to 100%"
          >
            100%
          </button>
        </div>
      </div>
    </div>
  )
}
