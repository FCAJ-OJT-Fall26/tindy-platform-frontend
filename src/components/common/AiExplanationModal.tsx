import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { MatchBreakdown } from '../../types/discovery';
import AiMatchBadge from './AiMatchBadge';
import { getMatchTier } from '../../utils/matchTier';

interface AiExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  match: MatchBreakdown;
  role: string;
}

export default function AiExplanationModal({
  isOpen,
  onClose,
  title,
  subtitle,
  match,
  role,
}: AiExplanationModalProps) {
  const [closing, setClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs modal-overlay-animate ${closing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col modal-content-animate ${closing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              Explainable AI Recommendation
            </span>
            <h3 className="font-bold text-lg text-slate-900 leading-snug mt-1.5">
              Match Score Breakdown: {match.overall}%
            </h3>
            <p className="text-xs text-slate-500 line-clamp-1">{title} · {role}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Top summary card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <AiMatchBadge score={match.overall} verdict={match.verdict} size="lg" showVerdict={true} />
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Target Role
              </span>
              <span className="text-xs font-bold text-slate-800">{role}</span>
            </div>
          </div>

          {/* Dimension score table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Weighted Evaluation Breakdown
            </h4>
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {(match?.factors || match?.dimensions || []).map((dim) => {
                const dimTier = getMatchTier(dim.score);
                return (
                  <div key={dim.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{dim.label}</span>
                      <span className={`font-mono text-xs font-bold ${dimTier.textColor}`}>
                        {dim.score}% <span className="text-slate-400 font-normal">({dim.weight}% weight)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-xs overflow-hidden">
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

          {/* Key Strengths & Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Check size={14} className="text-slate-900" />
                <span>Verified Match Factors</span>
              </span>
              <ul className="text-xs text-slate-700 space-y-1">
                {(match?.strongMatches || match?.strengths || []).map((str) => (
                  <li key={str} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-xs bg-slate-900 mt-1 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Skill Growth Potential</span>
              </span>
              <ul className="text-xs text-slate-700 space-y-1">
                {(match?.skillGaps?.map((g) => g.skill) || match?.gaps || []).map((gap) => (
                  <li key={gap} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-xs bg-slate-400 mt-1 flex-shrink-0" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Heuristic Formula Explanation */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1 font-mono">
            <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider font-sans">
              Algorithmic Heuristic Formula
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 font-sans">
              Overall score is computed deterministically from verified syllabus milestones, public code repositories, and schedule availability parameters.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={handleClose}
            className="button primary text-xs py-2 px-4"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
