import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DiscoveryMode } from '../../types/discovery';
import MinMatchScoreSlider from './MinMatchScoreSlider';

interface DiscoveryFiltersProps {
  mode: DiscoveryMode;
  onModeChange?: (newMode: DiscoveryMode) => void;
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
  totalLoaded?: number;
}

export default function DiscoveryFilters({
  mode,
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
  totalLoaded = 0,
}: DiscoveryFiltersProps) {
  const idPrefix = React.useId();

  return (
    <aside className="live-discovery__filters" aria-label="Discovery filters">
      <div className="live-discovery__filter-heading">
        <span className="live-discovery__eyebrow">YOUR NEXT OPPORTUNITY</span>
        <h2>{mode === 'student' ? 'Find your fit' : 'Find candidates'}</h2>
        <p>A few filters. A better place to start.</p>
      </div>

      {/* Target Role Selector */}
      <label htmlFor={`${idPrefix}-role`} className="field-group">
        {mode === 'student' ? 'Required role' : 'Preferred role'}
        <select
          id={`${idPrefix}-role`}
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          className="field-select"
        >
          <option value="All">All roles</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      {/* Key Skill Selector */}
      <label htmlFor={`${idPrefix}-skill`} className="field-group">
        Key technology
        <select
          id={`${idPrefix}-skill`}
          value={selectedSkill}
          onChange={(e) => onSkillChange(e.target.value)}
          className="field-select"
        >
          <option value="All">All skills</option>
          {availableSkills.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </select>
      </label>

      {/* Minimum Match Score Slider */}
      <div className="field-group" style={{ textTransform: 'none', marginBottom: 22 }}>
        <MinMatchScoreSlider value={minScore} onChange={onMinScoreChange} />
      </div>

      {/* Reset Filters Action */}
      <button
        type="button"
        onClick={onResetFilters}
        className="live-discovery__reset"
      >
        <RefreshCw size={14} />
        <span>Reset filters</span>
      </button>

      {/* Session Discovery Summary */}
      <div className="live-discovery__session">
        <span className="live-discovery__eyebrow">YOUR OVERVIEW</span>
        <dl>
          <div>
            <dt>Loaded</dt>
            <dd>{totalLoaded}</dd>
          </div>
          <div>
            <dt>Reviewed here</dt>
            <dd>{sessionStats.reviewed}</dd>
          </div>
          <div>
            <dt>{mode === 'student' ? 'Saved total' : 'Shortlisted'}</dt>
            <dd>{mode === 'student' ? sessionStats.saved : sessionStats.interested}</dd>
          </div>
          <div>
            <dt>Skipped here</dt>
            <dd>{sessionStats.skipped}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
