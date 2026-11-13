import React from 'react';
import { Users, Bookmark, ArrowUpRight, Clock, ShieldCheck, CalendarDays, BriefcaseBusiness, Star } from 'lucide-react';
import { DiscoveryProject, DiscoveryCardOpenPosition } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';
import SkillIcon from '../onboarding/SkillIcon';
import MatchScoreRing from '../discovery/MatchScoreRing';
import { formatClosingDate } from '../../services/recruitmentDeadline';

interface ProjectCardContentProps {
  project: DiscoveryProject;
  isActive?: boolean;
  live?: boolean;
  onWhyMatchesClick: (e: React.MouseEvent) => void;
  onViewDetailsClick: (e: React.MouseEvent) => void;
  selectedPositionId?: string;
  onPositionSelect?: (positionId: string) => void;
}

export default function ProjectCardContent({
  project,
  isActive = true,
  live = false,
  onWhyMatchesClick,
  onViewDetailsClick,
  selectedPositionId,
  onPositionSelect,
}: ProjectCardContentProps) {
  if (live && project.ruleMatch) {
    return (
      <LiveProjectCard
        project={project}
        onWhyMatchesClick={onWhyMatchesClick}
        onViewDetailsClick={onViewDetailsClick}
        selectedPositionId={selectedPositionId}
        onPositionSelect={onPositionSelect}
      />
    );
  }

  const match = project.ruleMatch!;
  const openPositions: DiscoveryCardOpenPosition[] = project.open_positions && project.open_positions.length > 0
    ? project.open_positions
    : match?.best_position
    ? [{
        position_id: match.best_position.position_id,
        title: match.best_position.title,
        match_score: match.match_score,
        required_skills: [...(match.matched_skills ?? []), ...(match.missing_skills ?? [])].filter(s => s.is_required).map(s => s.name),
        is_best_match: true,
        remaining_slots: match.best_position.remaining_slots,
        matched_skills: match.matched_skills,
        missing_skills: match.missing_skills,
      }]
    : [];

  const bestPosId = openPositions.find(p => p.is_best_match)?.position_id || openPositions[0]?.position_id;
  const currentPosId = selectedPositionId || project.selected_position_id || bestPosId;
  const currentPos = openPositions.find(p => p.position_id === currentPosId) || openPositions[0];

  const currentScore = currentPos?.match_score ?? project.match.overall;
  const currentRole = currentPos?.title ?? project.role;

  const matchedIds = new Set((currentPos?.matched_skills ?? project.ruleMatch?.matched_skills ?? []).map(skill => skill.skill_id));
  const requiredSkills = currentPos?.matched_skills && currentPos?.missing_skills
    ? [...currentPos.matched_skills, ...currentPos.missing_skills].filter(skill => skill.is_required)
    : project.ruleMatch
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
                currentScore < 35
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : currentScore <= 65
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {currentScore < 35 ? 'LOW MATCH' : currentScore <= 65 ? 'MODERATE' : project.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
          <Users size={13} className="text-slate-500" />
          <span className="font-semibold text-slate-900">{project.teamSize}/{project.maxTeamSize}</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">members</span>
        </div>
      </div>

      {/* Position Selector Bar (when project has >= 2 positions) */}
      {openPositions.length >= 2 && (
        <div
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/90 border-b border-slate-100 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {openPositions.map((pos) => {
            const isSelected = pos.position_id === currentPos?.position_id;
            return (
              <button
                key={pos.position_id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPositionSelect?.(pos.position_id);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
                title={`${pos.title} (${pos.match_score}% match)`}
              >
                {pos.is_best_match && (
                  <Star
                    size={11}
                    fill={isSelected ? 'currentColor' : '#f59e0b'}
                    className={isSelected ? 'text-white' : 'text-amber-500'}
                  />
                )}
                <span>{pos.title}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-blue-700 text-blue-100'
                      : pos.match_score >= 80
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : pos.match_score >= 60
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pos.match_score}%
                </span>
              </button>
            );
          })}
        </div>
      )}

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
        {project.matchAvailable === false ? (
          <div className="px-3.5 py-2 rounded-xl border bg-slate-50 text-xs text-slate-600">
            Match score is not available.
          </div>
        ) : (
          <div
            className={`px-3.5 py-2 sm:py-2.5 rounded-xl border flex items-center justify-between transition-colors ${
              currentScore < 35
                ? 'bg-rose-50/70 border-rose-200'
                : currentScore <= 65
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            {project.ruleMatch ? (
              <div>
                <strong className="text-xl" data-server-match-score>
                  {currentScore}%
                </strong>
                <span className="block text-xs">Rule-based match</span>
              </div>
            ) : (
              <AiMatchBadge score={currentScore} verdict={project.match.verdict} size="md" showVerdict={true} animate={isActive} />
            )}

            <button
              type="button"
              onClick={onWhyMatchesClick}
              className={`text-xs font-semibold hover:underline flex items-center gap-1 bg-white border px-2.5 py-1 rounded-lg shadow-2xs transition-colors ${
                currentScore < 35
                  ? 'border-rose-300 text-rose-700'
                  : currentScore <= 65
                  ? 'border-amber-300 text-amber-800'
                  : 'border-slate-200 text-slate-900'
              }`}
            >
              <span>{project.ruleMatch ? 'Why this matches' : `Why ${currentScore}%?`}</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        )}

        {/* Roles & Key Tech Stack */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Role:
            </span>
            <div className="inline-block text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate">
              {currentRole}
            </div>
          </div>
          {currentPos && (
            <p className="text-xs text-slate-600">
              {currentPos.remaining_slots ?? project.ruleMatch?.best_position.remaining_slots ?? 1} remaining slots · {currentPos.role_name || project.ruleMatch?.best_position.role_name}
            </p>
          )}
          {project.closingDate && (
            <p className="text-xs text-slate-600">Recruitment closing date: {project.closingDate} (Vietnam)</p>
          )}

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Required Stack
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[58px] overflow-hidden">
              {requiredSkills.map(({ skill_id, name: skill }) => {
                const strongList = project.match?.strongMatches || project.match?.strengths || [];
                const isMatched = project.ruleMatch
                  ? matchedIds.has(skill_id)
                  : strongList.some((s) => s.toLowerCase().includes(skill.toLowerCase()));
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

function LiveProjectCard({
  project,
  onWhyMatchesClick,
  onViewDetailsClick,
  selectedPositionId,
  onPositionSelect,
}: Pick<ProjectCardContentProps, 'project' | 'onWhyMatchesClick' | 'onViewDetailsClick' | 'selectedPositionId' | 'onPositionSelect'>) {
  const match = project.ruleMatch!;
  const openPositions: DiscoveryCardOpenPosition[] = project.open_positions && project.open_positions.length > 0
    ? project.open_positions
    : [{
        position_id: match.best_position.position_id,
        title: match.best_position.title,
        match_score: match.match_score,
        required_skills: [...match.matched_skills, ...match.missing_skills].filter(s => s.is_required).map(s => s.name),
        is_best_match: true,
        remaining_slots: match.best_position.remaining_slots,
        matched_skills: match.matched_skills,
        missing_skills: match.missing_skills,
      }];

  const bestPosId = openPositions.find(p => p.is_best_match)?.position_id || openPositions[0]?.position_id;
  const currentPosId = selectedPositionId || project.selected_position_id || bestPosId;
  const currentPos = openPositions.find(p => p.position_id === currentPosId) || openPositions[0];

  const currentScore = currentPos?.match_score ?? match.match_score;
  const currentTitle = currentPos?.title ?? match.best_position.title;

  const matchedSkills = currentPos?.matched_skills ?? match.matched_skills;
  const missingSkills = currentPos?.missing_skills ?? match.missing_skills;
  const matchedIds = new Set(matchedSkills.map(skill => skill.skill_id));
  const skills = [...matchedSkills, ...missingSkills];
  const required = skills.filter(skill => skill.is_required);
  const optional = skills.filter(skill => !skill.is_required);
  const slots = currentPos?.remaining_slots ?? match.best_position.remaining_slots;

  return (
    <article className="live-project-card">
      <div className="live-project-card__top">
        <span className="live-discovery__pill">{project.category}</span>
        <span className="live-project-card__team">
          <Users size={14} />
          <strong>{project.teamSize}/{project.maxTeamSize}</strong> members
        </span>
      </div>

      {/* Position Selector Bar (when project has >= 2 positions) */}
      {openPositions.length >= 2 && (
        <div
          className="live-project-card__positions-bar flex items-center gap-1.5 px-4 py-2 bg-slate-50/90 border-b border-slate-100 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {openPositions.map((pos) => {
            const isSelected = pos.position_id === currentPos?.position_id;
            return (
              <button
                key={pos.position_id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPositionSelect?.(pos.position_id);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
                title={`${pos.title} (${pos.match_score}% match)`}
              >
                {pos.is_best_match && (
                  <Star
                    size={11}
                    fill={isSelected ? 'currentColor' : '#f59e0b'}
                    className={isSelected ? 'text-white' : 'text-amber-500'}
                  />
                )}
                <span>{pos.title}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-blue-700 text-blue-100'
                      : pos.match_score >= 80
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : pos.match_score >= 60
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pos.match_score}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="live-project-card__body">
        <div className="live-project-card__intro">
          <h3>{project.name}</h3>
          <p className="live-project-card__tagline">
            {project.tagline || project.desc}
          </p>
        </div>

        {/* Unified Position & Match Fit Block */}
        <div className="live-project-card__fit-box">
          <div className="live-project-card__fit-header">
            <div className="live-project-card__fit-role">
              <BriefcaseBusiness size={15} />
              <span>{currentTitle}</span>
            </div>
            <span className="live-project-card__slots">
              {slots} {slots === 1 ? 'slot' : 'slots'} open
            </span>
          </div>

          <div className="live-project-card__fit-match">
            <div className="live-project-card__match-label">
              <MatchScoreRing score={currentScore} serverValue compact />
              <div>
                <strong>{currentScore}% Position Match</strong>
                <span>Rule-based compatibility</span>
              </div>
            </div>
            <button
              type="button"
              className="live-project-card__why-btn"
              onClick={onWhyMatchesClick}
            >
              Why this match? <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Skills Section */}
        <div className="live-project-card__skills">
          <span className="live-discovery__eyebrow">REQUIRED SKILLS</span>
          <div className="live-project-card__skills-list">
            {required.length ? (
              required.map((skill) => {
                const isMatched = matchedIds.has(skill.skill_id);
                return (
                  <span
                    className={`live-project-card__skill${isMatched ? ' is-matched' : ''}`}
                    key={skill.skill_id}
                    title={isMatched ? `Skill matched: ${skill.name}` : `Skill required: ${skill.name}`}
                  >
                    <SkillIcon name={skill.name} size={13} />
                    <span>{skill.name}</span>
                    {isMatched && <span className="live-project-card__skill-check">✓</span>}
                  </span>
                );
              })
            ) : currentPos?.required_skills && currentPos.required_skills.length ? (
              currentPos.required_skills.map((skillName) => (
                <span className="live-project-card__skill" key={skillName}>
                  <SkillIcon name={skillName} size={13} />
                  <span>{skillName}</span>
                </span>
              ))
            ) : (
              <span className="live-discovery__muted">No required skills specified</span>
            )}
          </div>
          {optional.length > 0 && (
            <p className="live-project-card__optional">
              <span>Nice to have:</span> {optional.map((skill) => skill.name).join(' · ')}
            </p>
          )}
        </div>

        <div className="live-project-card__bottom">
          <div className="live-project-card__meta">
            <span title="Weekly commitment">
              <Clock size={14} />
              {project.hours}
            </span>
            <span title="Project duration">
              <CalendarDays size={14} />
              {project.duration}
            </span>
            <span title="Recruitment deadline" className="live-project-card__deadline-pill">
              Closes {formatClosingDate(project.closingDate)}
            </span>
          </div>
        </div>
      </div>

      <button className="live-project-card__footer" type="button" onClick={onViewDetailsClick}>
        <span>Explore the project and meet the team</span>
        <strong>Full specs <ArrowUpRight size={14} /></strong>
      </button>
    </article>
  );
}
