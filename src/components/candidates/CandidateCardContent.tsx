import React from 'react';
import { Clock, ArrowUpRight } from 'lucide-react';
import { DiscoveryCandidate } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';

interface CandidateCardContentProps {
  candidate: DiscoveryCandidate;
  onWhyMatchesClick: (e: React.MouseEvent) => void;
  onViewDetailsClick: (e: React.MouseEvent) => void;
}

export default function CandidateCardContent({
  candidate,
  onWhyMatchesClick,
  onViewDetailsClick,
}: CandidateCardContentProps) {
  const match = candidate.match;

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Banner / University */}
      <div className="p-5 pb-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            {candidate.university}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
          Active Candidate
        </span>
      </div>

      {/* Main Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Candidate Header with Avatar & Role */}
        <div className="flex items-start gap-4">
          <img
            src={candidate.avatar}
            alt={candidate.name}
            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-2xl text-slate-900 tracking-tight leading-tight truncate">
              {candidate.name}
            </h3>
            <div className="inline-block mt-0.5 text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {candidate.preferredRole}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-500" />
                <span className="font-semibold text-slate-700">{candidate.hours}</span>
              </span>
              <span>•</span>
              <span>{candidate.relevantProjects.length} projects</span>
            </div>
          </div>
        </div>

        {/* Short Summary */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {candidate.summary}
        </p>

        {/* AI Match Score Block */}
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

        {/* Skills & Match Breakdown */}
        <div className="space-y-2.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Top Skills
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(candidate.skills || []).map((skill) => {
                const strongList = match?.strongMatches || match?.strengths || [];
                const isStrong = strongList.some((s) =>
                  s.toLowerCase().includes(skill.toLowerCase())
                );
                return (
                  <span
                    key={skill}
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                      isStrong
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

          {/* Quick Match Indicators */}
          <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">
                Strengths
              </span>
              <p className="text-[11px] text-slate-800 font-medium truncate">
                {(match?.strongMatches || match?.strengths || []).slice(0, 2).join(', ') || 'Core Skills'}
              </p>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">
                Growth Area
              </span>
              <p className="text-[11px] text-slate-800 font-medium truncate">
                {match?.skillGaps?.[0]?.skill || match?.gaps?.[0] || 'Full stack'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div
        onClick={onViewDetailsClick}
        className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
      >
        <span className="text-[11px] text-slate-600">Tap to inspect candidate credentials</span>
        <span className="flex items-center gap-1 text-slate-900 font-bold">
          View Profile
          <ArrowUpRight size={13} />
        </span>
      </div>
    </div>
  );
}
