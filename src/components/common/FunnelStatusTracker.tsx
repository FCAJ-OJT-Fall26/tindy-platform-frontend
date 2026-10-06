import React from 'react';
import { Check } from 'lucide-react';

interface FunnelStatusTrackerProps {
  currentStatus: 'Recommended' | 'Interested' | 'Shortlisted' | 'Invited' | 'Team Member';
}

const STEPS = [
  'Recommended',
  'Interested',
  'Shortlisted',
  'Invited',
  'Team Member',
] as const;

export default function FunnelStatusTracker({ currentStatus }: FunnelStatusTrackerProps) {
  const currentIndex = Math.max(0, STEPS.indexOf(currentStatus));

  return (
    <div className="w-full bg-[#f8fafc]/70 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
      {/* Top Heading & Status Pill */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] sm:text-xs font-extrabold text-[#1e293b] uppercase tracking-wider">
          RECRUITMENT PIPELINE
        </span>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white text-[#1e293b] border border-slate-200 shadow-2xs">
          <span className="w-2 h-2 rounded-[2px] bg-[#0f172a]" />
          <span>Status: {currentStatus}</span>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="relative pt-1 pb-1">
        {/* Horizontal background track line connecting through all steps */}
        <div className="absolute top-[14px] left-5 right-5 h-[2px] bg-[#e2e8f0] -translate-y-1/2 z-0">
          <div
            className="h-full bg-[#0f172a] transition-all duration-300"
            style={{
              width: `${(currentIndex / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* 5 Step Icons & Labels */}
        <div className="relative z-10 flex items-start justify-between">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div key={step} className="flex flex-col items-center text-center flex-1 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent || isDone
                      ? 'bg-[#0f172a] border border-[#0f172a] text-white shadow-2xs'
                      : 'bg-white border border-[#cbd5e1] text-[#64748b] shadow-2xs'
                  }`}
                >
                  {isDone ? <Check size={13} strokeWidth={2.8} /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] sm:text-xs mt-2.5 tracking-tight whitespace-nowrap ${
                    isCurrent
                      ? 'text-[#0f172a] font-bold'
                      : isDone
                      ? 'text-[#334155] font-semibold'
                      : 'text-[#8292a4] font-medium'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
