import React from 'react';
import { Users, Bookmark, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';
import { DiscoveryProject } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';

interface ProjectCardContentProps {
  project: DiscoveryProject;
  onWhyMatchesClick: (e: React.MouseEvent) => void;
  onViewDetailsClick: (e: React.MouseEvent) => void;
}

export default function ProjectCardContent({
  project,
  onWhyMatchesClick,
  onViewDetailsClick,
}: ProjectCardContentProps) {
  const match = project.match;

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Banner / Category */}
      <div className="p-5 pb-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            {project.category}
          </span>
          {project.badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              match.overall < 35
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : match.overall <= 65
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {match.overall < 35 ? 'LOW MATCH (WARNING)' : match.overall <= 65 ? 'MODERATE MATCH' : project.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Users size={13} />
          <span className="font-semibold text-slate-900">{project.teamSize} / {project.maxTeamSize}</span>
          <span className="text-[10px]">members</span>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Title & Tagline */}
        <div>
          <h3 className="font-bold text-2xl text-slate-900 tracking-tight leading-tight">
            {project.name}
          </h3>
          <p className="text-xs font-semibold text-slate-700 mt-1">
            {project.tagline}
          </p>
          <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
            {project.desc}
          </p>
        </div>

        {/* AI Match Score Highlight Block */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
          match.overall < 35
            ? 'bg-rose-50/70 border-rose-200'
            : match.overall <= 65
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <AiMatchBadge score={match.overall} verdict={match.verdict} size="md" showVerdict={true} />

          <button
            type="button"
            onClick={onWhyMatchesClick}
            className={`text-xs font-semibold hover:underline flex items-center gap-1 bg-white border px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors ${
              match.overall < 35
                ? 'border-rose-300 text-rose-700'
                : match.overall <= 65
                ? 'border-amber-300 text-amber-800'
                : 'border-slate-200 text-slate-900'
            }`}
          >
            <span>Why {match.overall}%?</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Roles & Key Tech Stack */}
        <div className="space-y-3 pt-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Looking for Role
            </span>
            <div className="inline-block text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              {project.role}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Required Stack
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(project.skills || []).map((skill) => {
                const strongList = match?.strongMatches || match?.strengths || [];
                const isMatched = strongList.some((s) =>
                  s.toLowerCase().includes(skill.toLowerCase())
                );
                return (
                  <span
                    key={skill}
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                      isMatched
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Commitment, Duration & Meta */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
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
        className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
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
