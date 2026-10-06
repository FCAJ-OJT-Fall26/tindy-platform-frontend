import React from 'react';
import { X, Check } from 'lucide-react';

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
  const currentIndex = STEPS.indexOf(currentStatus);

  return (
    <div className="w-full bg-slate-50 rounded-xl p-3.5 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Recruitment Pipeline
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-900 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-xs bg-slate-900" />
          Status: {currentStatus}
        </span>
      </div>

      <div className="relative flex items-center justify-between pt-2">
        {/* Progress track */}
        <div className="absolute left-4 right-4 top-5 h-0.5 bg-slate-200 -z-0">
          <div
            className="h-full bg-slate-900 transition-all duration-300"
            style={{ width: `${(Math.max(0, currentIndex) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step} className="flex flex-col items-center z-10">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all ${
                  isDone
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : isCurrent
                    ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-300'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                  isCurrent
                    ? 'text-slate-900 font-bold'
                    : isDone
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
