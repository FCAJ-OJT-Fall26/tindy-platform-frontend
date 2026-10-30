import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { DiscoveryMode } from '../../types/discovery';
import DiscoverySegmentedControl from './DiscoverySegmentedControl';
import MinMatchScoreSlider from './MinMatchScoreSlider';

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
  const idPrefix = React.useId();

  return (
    <aside className="w-full min-w-0 bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 lg:p-5 shadow-xs flex flex-col space-y-3 lg:space-y-5 lg:sticky lg:top-24 h-fit">
      {/* Two-Sided Mode Switcher */}
      <div className="space-y-1 lg:space-y-1.5 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Matching Perspective
        </span>
        <DiscoverySegmentedControl
          value={mode}
          onChange={onModeChange}
          size="compact"
          options={[
            { value: 'student', label: 'Projects', sublabel: 'Find Projects' },
            { value: 'leader', label: 'Teammates', sublabel: 'Find Candidates' },
          ]}
          ariaLabel="Matching Perspective"
          className="w-full grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
        />
      </div>

      {/* Role & Skill Selectors (2-col on mobile >=360px & tablet, 1-col on ultra-narrow <360px & desktop sidebar) */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3 lg:gap-4">
        {/* Target Role Selector */}
        <div className="space-y-1 lg:space-y-1.5 min-w-0 discovery-filter-mode-transition">
          <label
            htmlFor={`${idPrefix}-role`}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block transition-colors"
          >
            {mode === 'student' ? 'Required Role' : 'Preferred Role'}
          </label>
          <select
            id={`${idPrefix}-role`}
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 lg:p-2 min-h-[36px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
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
        <div className="space-y-1 lg:space-y-1.5 min-w-0">
          <label
            htmlFor={`${idPrefix}-skill`}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block"
          >
            Key Technology
          </label>
          <select
            id={`${idPrefix}-skill`}
            value={selectedSkill}
            onChange={(e) => onSkillChange(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 lg:p-2 min-h-[36px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
          >
            <option value="All">All Technologies</option>
            {availableSkills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Minimum Match Score Slider */}
      <MinMatchScoreSlider value={minScore} onChange={onMinScoreChange} />

      {/* Session Discovery Summary */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5 lg:space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Session Summary
        </span>
        <div className="grid grid-cols-2 gap-1.5 lg:gap-2 text-xs">
          <div className="bg-slate-50 px-2.5 py-1.5 lg:p-2 rounded border border-slate-200 flex items-center justify-between gap-1.5 lg:block min-w-0">
            <span className="text-[10px] text-slate-500 truncate lg:block">Reviewed</span>
            <span className="font-mono font-bold text-slate-800 text-xs lg:text-sm shrink-0">
              {sessionStats.reviewed}
            </span>
          </div>
          <div className="bg-slate-50 px-2.5 py-1.5 lg:p-2 rounded border border-slate-200 flex items-center justify-between gap-1.5 lg:block min-w-0 discovery-filter-mode-transition">
            <span className="text-[10px] text-slate-500 truncate lg:block transition-colors">
              {mode === 'student' ? 'Interested' : 'Shortlisted'}
            </span>
            <span className="font-mono font-bold text-slate-900 text-xs lg:text-sm shrink-0">
              {sessionStats.interested}
            </span>
          </div>
          <div className="bg-slate-50 px-2.5 py-1.5 lg:p-2 rounded border border-slate-200 flex items-center justify-between gap-1.5 lg:block min-w-0">
            <span className="text-[10px] text-slate-500 truncate lg:block">Saved</span>
            <span className="font-mono font-bold text-slate-800 text-xs lg:text-sm shrink-0">
              {sessionStats.saved}
            </span>
          </div>
          <div className="bg-slate-50 px-2.5 py-1.5 lg:p-2 rounded border border-slate-200 flex items-center justify-between gap-1.5 lg:block min-w-0">
            <span className="text-[10px] text-slate-500 truncate lg:block">Skipped</span>
            <span className="font-mono font-bold text-slate-800 text-xs lg:text-sm shrink-0">
              {sessionStats.skipped}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Filters Action */}
      <button
        type="button"
        onClick={onResetFilters}
        className="w-full py-2 px-3 min-h-[36px] rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <RotateCcw size={13} className="shrink-0" />
        <span>Reset Filter Criteria</span>
      </button>
    </aside>
  );
}
