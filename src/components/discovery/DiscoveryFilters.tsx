import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { DiscoveryMode } from '../../types/discovery';

interface DiscoveryFiltersProps {
  mode: DiscoveryMode;
  onModeChange: (newMode: DiscoveryMode) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  selectedSkill: string;
  onSkillChange: (skill: string) => void;
  minScore: number;
  onMinScoreChange: (score: number) => void;
  sessionStats: {
    reviewed: number;
    interested: number;
    saved: number;
    skipped: number;
  };
  onResetFilters: () => void;
  availableRoles: string[];
  availableSkills: string[];
}

export default function DiscoveryFilters({
  mode,
  onModeChange,
  selectedRole,
  onRoleChange,
  selectedSkill,
  onSkillChange,
  minScore,
  onMinScoreChange,
  sessionStats,
  onResetFilters,
  availableRoles,
  availableSkills,
}: DiscoveryFiltersProps) {
  return (
    <aside className="w-68 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col space-y-5 sticky top-24 h-fit">
      {/* Two-Sided Mode Switcher */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Matching Perspective
        </span>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onModeChange('student')}
            className={`py-2 px-2.5 rounded-md text-xs font-bold flex flex-col items-center gap-0.5 transition-colors ${mode === 'student'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:text-black'
              }`}
          >
            <span>Projects</span>
            <span className={`text-[9px] font-medium ${mode === 'student' ? 'text-slate-300' : 'text-slate-500'}`}>
              Find Projects
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('leader')}
            className={`py-2 px-2.5 rounded-md text-xs font-bold flex flex-col items-center gap-0.5 transition-colors ${mode === 'leader'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:text-black'
              }`}
          >
            <span>Teammates</span>
            <span className={`text-[9px] font-medium ${mode === 'leader' ? 'text-slate-300' : 'text-slate-500'}`}>
              Find Candidates
            </span>
          </button>
        </div>
      </div>

      {/* Target Role Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
          {mode === 'student' ? 'Required Role' : 'Preferred Role'}
        </label>
        <select
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
        >
          <option value="All">All Roles</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Key Skill Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
          Key Technology
        </label>
        <select
          value={selectedSkill}
          onChange={(e) => onSkillChange(e.target.value)}
          className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
        >
          <option value="All">All Technologies</option>
          {availableSkills.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </select>
      </div>

      {/* Minimum Match Score Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Min Match Score
          </label>
          <div
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded border transition-colors ${
              minScore < 35
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : minScore <= 65
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            <input
              type="number"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Number(e.target.value);
                if (!isNaN(val)) {
                  onMinScoreChange(Math.max(0, Math.min(100, val)));
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
        <div className="space-y-1.5 pt-1">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
            className="custom-range-slider"
            style={{
              background:
                minScore === 0
                  ? '#e2e8f0'
                  : `linear-gradient(to right, ${
                      minScore < 35
                        ? '#f43f5e'
                        : minScore <= 65
                        ? '#f59e0b'
                        : '#10b981'
                    } 0%, ${
                      minScore < 35
                        ? '#f43f5e'
                        : minScore <= 65
                        ? '#f59e0b'
                        : '#10b981'
                    } ${minScore}%, #e2e8f0 ${minScore}%, #e2e8f0 100%)`,
            }}
          />

          {/* Exact threshold tick markers */}
          <div className="relative h-4 text-[10px] font-mono select-none">
            <button
              type="button"
              onClick={() => onMinScoreChange(0)}
              className="absolute left-0 text-rose-600 hover:font-bold transition-all cursor-pointer"
              title="Set to 0%"
            >
              0%
            </button>
            <button
              type="button"
              onClick={() => onMinScoreChange(35)}
              className="absolute -translate-x-1/2 text-amber-600 hover:font-bold transition-all cursor-pointer"
              style={{ left: '35%' }}
              title="Set to 35% threshold"
            >
              35%
            </button>
            <button
              type="button"
              onClick={() => onMinScoreChange(65)}
              className="absolute -translate-x-1/2 text-emerald-600 hover:font-bold transition-all cursor-pointer"
              style={{ left: '65%' }}
              title="Set to 65% threshold"
            >
              65%
            </button>
            <button
              type="button"
              onClick={() => onMinScoreChange(100)}
              className="absolute right-0 text-slate-500 hover:font-bold transition-all cursor-pointer"
              title="Set to 100%"
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* Session Discovery Summary */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Session Summary
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Reviewed</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {sessionStats.reviewed}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">
              {mode === 'student' ? 'Interested' : 'Shortlisted'}
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {sessionStats.interested}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Saved</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {sessionStats.saved}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block">Skipped</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {sessionStats.skipped}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Filters Action */}
      <button
        type="button"
        onClick={onResetFilters}
        className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <RotateCcw size={13} />
        <span>Reset Filter Criteria</span>
      </button>
    </aside>
  );
}
