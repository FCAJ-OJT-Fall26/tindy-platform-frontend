import React from 'react';
import { Users, Bookmark, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';
import { DiscoveryProject } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';
import SkillIcon from '../onboarding/SkillIcon';

interface ProjectCardContentProps {
  project: DiscoveryProject;
  isActive?: boolean;
  onWhyMatchesClick: (e: React.MouseEvent) => void;
  onViewDetailsClick: (e: React.MouseEvent) => void;
}

export default function ProjectCardContent({
  project,
  isActive = true,
  onWhyMatchesClick,
  onViewDetailsClick,
}: ProjectCardContentProps) {
  const match = project.match;
  const matchedIds = new Set(project.ruleMatch?.matched_skills.map(skill => skill.skill_id));
  const requiredSkills = project.ruleMatch
    ? [...project.ruleMatch.matched_skills, ...project.ruleMatch.missing_skills].filter(skill => skill.is_required)
    : project.skills.map(name => ({ skill_id: name, name }));

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Banner / Category */}
      <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap truncate max-w-[150px] sm:max-w-none"
            title={project.category}
          >
            {project.category}
          </span>
          {project.badge && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap truncate max-w-[140px] sm:max-w-none flex items-center gap-1 ${
                match.overall < 35
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : match.overall <= 65
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {match.overall < 35 ? 'LOW MATCH' : match.overall <= 65 ? 'MODERATE' : project.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
          <Users size={13} className="text-slate-500" />
          <span className="font-semibold text-slate-900">{project.teamSize}/{project.maxTeamSize}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">members</span>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-3.5 min-h-0 overflow-y-auto">
        {/* Title & Tagline */}
        <div>
          <h3 className="font-bold text-xl sm:text-2xl text-slate-900 tracking-tight leading-tight line-clamp-1">
            {project.name}
          </h3>
          <p className="text-xs font-medium text-slate-700 mt-0.5 line-clamp-1">
            {project.tagline}
          </p>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {project.desc}
          </p>
        </div>

        {/* AI Match Score Highlight Block */}
        {project.matchAvailable === false ? <div className="px-3.5 py-2 rounded-xl border bg-slate-50 text-xs text-slate-600">Match score is not available.</div> : <div className={`px-3.5 py-2 sm:py-2.5 rounded-xl border flex items-center justify-between transition-colors ${
          match.overall < 35
            ? 'bg-rose-50/70 border-rose-200'
            : match.overall <= 65
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          {project.ruleMatch ? <div><strong className="text-xl" data-server-match-score>{project.ruleMatch.match_score}%</strong><span className="block text-xs">Rule-based match</span></div> : <AiMatchBadge score={match.overall} verdict={match.verdict} size="md" showVerdict={true} animate={isActive} />}

          <button
            type="button"
            onClick={onWhyMatchesClick}
            className={`text-xs font-semibold hover:underline flex items-center gap-1 bg-white border px-2.5 py-1 rounded-lg shadow-2xs transition-colors ${
              match.overall < 35
                ? 'border-rose-300 text-rose-700'
                : match.overall <= 65
                ? 'border-amber-300 text-amber-800'
                : 'border-slate-200 text-slate-900'
            }`}
          >
            <span>{project.ruleMatch ? 'Why this matches' : `Why ${match.overall}%?`}</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        }
        {/* Roles & Key Tech Stack */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Role:
            </span>
            <div className="inline-block text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
              {project.role}
            </div>
          </div>
          {project.ruleMatch && <p className="text-xs text-slate-600">{project.ruleMatch.best_position.remaining_slots} remaining slots · {project.ruleMatch.best_position.role_name}</p>}
          {project.closingDate && <p className="text-xs text-slate-600">Recruitment closing date: {project.closingDate} (Vietnam)</p>}

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Required Stack
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[58px] overflow-hidden">
              {requiredSkills.map(({ skill_id, name: skill }) => {
                const strongList = match?.strongMatches || match?.strengths || [];
                const isMatched = project.ruleMatch ? matchedIds.has(skill_id) : strongList.some((s) =>
                  s.toLowerCase().includes(skill.toLowerCase())
                );
                return (
                  <span
                    key={skill_id}
                    className={`text-xs px-2 py-0.5 rounded font-medium border inline-flex items-center gap-1.5 ${
                      isMatched
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <SkillIcon name={skill} size={12} />
                    <span>{skill}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Commitment, Duration & Meta */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-slate-500" />
            <span className="font-semibold text-slate-800">{project.hours || project.commitment || '8-10 hrs/week'}</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span>Duration:</span>
            <span className="font-semibold text-slate-800">{project.duration}</span>
          </div>
        </div>
      </div>

      {/* Card Footer / Tap action note */}
      <div
        onClick={onViewDetailsClick}
        className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0"
      >
        <span className="text-[11px] text-slate-600">Tap card to inspect full details</span>
        <span className="flex items-center gap-1 text-slate-900 font-bold">
          Full Specs
          <ArrowUpRight size={13} />
        </span>
      </div>
    </div>
  );
}
