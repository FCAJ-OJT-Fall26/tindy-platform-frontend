import React, { useState } from 'react';
import { X, Clock, Bookmark, ArrowLeft, Star, Check } from 'lucide-react';
import { DiscoveryCandidate } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';
import FunnelStatusTracker from '../common/FunnelStatusTracker';

interface CandidateDetailModalProps {
  candidate: DiscoveryCandidate | null;
  isOpen: boolean;
  isSaved: boolean;
  isShortlisted: boolean;
  onClose: () => void;
  onToggleSave: (candidateId: string) => void;
  onShortlistCandidate: (candidate: DiscoveryCandidate) => void;
  onOpenAiBreakdown: () => void;
}

export default function CandidateDetailModal({
  candidate,
  isOpen,
  isSaved,
  isShortlisted,
  onClose,
  onToggleSave,
  onShortlistCandidate,
  onOpenAiBreakdown,
}: CandidateDetailModalProps) {
  const [closing, setClosing] = useState(false);

  if (!isOpen || !candidate) return null;

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  };

  const match = candidate.match;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs modal-overlay-animate ${closing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col modal-content-animate ${closing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-black transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Candidate Stack</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(candidate.id)}
              className={`py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isSaved
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Star size={13} className={isSaved ? 'text-sky-500 fill-sky-500' : 'text-slate-400'} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Funnel pipeline tracker */}
          <FunnelStatusTracker
            currentStatus={isShortlisted ? 'Shortlisted' : 'Recommended'}
          />

          {/* Candidate Primary Profile Block */}
          <div className="flex items-start gap-4">
            <img
              src={candidate.avatar}
              alt={candidate.name}
              className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                  {candidate.university}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-medium">Graduation: {candidate.graduationYear}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                {candidate.name}
              </h2>
              <div className="inline-block mt-0.5 text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {candidate.preferredRole}
              </div>
            </div>
          </div>

          {/* Match Score Banner */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <AiMatchBadge score={match.overall} verdict={match.verdict} size="lg" showVerdict={true} />
            <button
              type="button"
              onClick={onOpenAiBreakdown}
              className="button primary text-xs py-1.5 px-3 self-start sm:self-auto"
            >
              Inspect Heuristic Breakdown
            </button>
          </div>

          {/* Summary Statement */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Profile Summary
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {candidate.summary}
            </p>
          </section>

          {/* Technical Skills & Certifications */}
          <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Technical Skills & Frameworks
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2.5 py-1 rounded bg-slate-900 text-white font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Verified Academic Credentials
              </span>
              <ul className="space-y-1.5 pt-1">
                {candidate.certificates.map((cert) => (
                  <li key={cert} className="text-xs text-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-xs bg-slate-900" />
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Relevant Production Projects */}
          <section className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Prior Project Experience
            </h3>
            <div className="space-y-2">
              {candidate.relevantProjects.map((p) => (
                <div
                  key={p.name}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs">{p.name}</h4>
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {p.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {p.tech.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Availability */}
          <section className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">Weekly Commitment Bandwidth:</span>
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <Clock size={13} />
              <span>{candidate.hours}</span>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="button outline text-xs py-2 px-3.5"
          >
            Back to Stack
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(candidate.id)}
              className={`text-xs py-2 px-3.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSaved
                  ? 'border-sky-300 bg-sky-50 text-sky-700 shadow-2xs'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Star size={14} className={isSaved ? 'text-sky-500 fill-sky-500' : 'text-slate-500'} />
              <span>{isSaved ? 'Saved' : 'Save for Later'}</span>
            </button>
            <button
              onClick={() => {
                onShortlistCandidate(candidate);
              }}
              className={`text-xs py-2 px-4 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                isShortlisted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700'
                  : 'bg-slate-900 hover:bg-black text-white'
              }`}
            >
              {isShortlisted && <Check size={14} strokeWidth={2.5} />}
              <span>{isShortlisted ? 'Candidate Shortlisted' : 'Shortlist Candidate'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
