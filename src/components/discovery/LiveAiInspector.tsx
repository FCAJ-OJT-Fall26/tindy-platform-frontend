import React from 'react';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { DiscoveryProject, DiscoveryCandidate } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';
import { getMatchTier } from '../../utils/matchTier';

interface LiveAiInspectorProps {
  item: DiscoveryProject | DiscoveryCandidate | null;
  mode: 'student' | 'leader';
  onOpenFullDetail: () => void;
  onOpenAiModal: () => void;
}

export default function LiveAiInspector({
  item,
  mode,
  onOpenFullDetail,
  onOpenAiModal,
}: LiveAiInspectorProps) {
  if (!item) {
    return (
      <aside className="w-80 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-xs">
        <h4 className="font-bold text-slate-800 text-sm">No Card Selected</h4>
        <p className="text-xs text-slate-500 mt-1">
          Select or drag a recommendation to inspect its live match breakdown.
        </p>
      </aside>
    );
  }

  const isProject = mode === 'student';
  const project = isProject ? (item as DiscoveryProject) : null;
  const candidate = !isProject ? (item as DiscoveryCandidate) : null;
  const match = item.match;

  return (
    <aside className="w-80 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col h-fit sticky top-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span className="text-[9px] font-extrabold tracking-wider text-slate-900 uppercase block">
            Match Inspector
          </span>
          <h4 className="font-bold text-slate-900 text-xs leading-none">
            Live Algorithmic Evaluation
          </h4>
        </div>
        <button
          onClick={onOpenAiModal}
          className="text-[10px] font-semibold text-slate-900 hover:underline flex items-center gap-0.5"
          title="Open deep breakdown"
        >
          Details
        </button>
      </div>

      {/* Target Item Header */}
      <div className="flex items-center gap-3">
        {candidate && (
          <img
            src={candidate.avatar}
            alt={candidate.name}
            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
          />
        )}
        <div className="min-w-0 flex-1">
          <h5 className="font-bold text-slate-900 text-sm truncate">
            {item.name}
          </h5>
          <p className="text-[11px] text-slate-500 truncate">
            {isProject ? project?.role : candidate?.preferredRole}
          </p>
        </div>
      </div>

      {/* Score Ring Component */}
      <div className="py-1">
        <AiMatchBadge score={match.overall} verdict={match.verdict} size="sm" showVerdict={true} />
      </div>

      {/* Warning Banner if match < 35% */}
      {match.overall < 35 && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <span className="font-bold block">Warning: Low Match (&lt;35%)</span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">
              Significant gaps identified in required skills or availability.
            </span>
          </div>
        </div>
      )}

      {/* Moderate banner if 35-65% */}
      {match.overall >= 35 && match.overall <= 65 && (
        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>Moderate Match (35%–65%) · Growth alignment potential</span>
        </div>
      )}

      {/* Breakdown Weights */}
      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Scoring Dimensions
        </span>

        <div className="space-y-2">
          {(match?.factors || match?.dimensions || []).map((dim) => {
            const dimTier = getMatchTier(dim.score);
            return (
              <div key={dim.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 flex items-center gap-1">
                    {dim.score < 35 && <AlertTriangle size={11} className="text-rose-600" />}
                    <span>{dim.label}</span>
                  </span>
                  <span className={`font-mono font-bold ${dimTier.textColor}`}>
                    {dim.score}% <span className="text-slate-400 font-normal">({dim.weight}% wt)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                  <div
                    className={`h-full ${dimTier.progressBarBg} transition-all duration-300`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Factors */}
      <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Verification Summary
        </span>

        <div className="space-y-1 text-[11px] text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-xs bg-slate-900" />
            <span>Matched: {(match?.strongMatches || match?.strengths || []).slice(0, 2).join(', ') || 'Requirements met'}</span>
          </div>
          {((match?.skillGaps && match.skillGaps.length > 0) || (match?.gaps && match.gaps.length > 0)) && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-1 h-1 rounded-xs bg-slate-400" />
              <span>Growth: {match?.skillGaps?.[0]?.skill || match?.gaps?.[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Full Audit Action */}
      <div className="pt-2">
        <button
          onClick={onOpenFullDetail}
          className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
        >
          <span>Inspect Specifications</span>
          <ArrowUpRight size={13} />
        </button>
      </div>
    </aside>
  );
}
