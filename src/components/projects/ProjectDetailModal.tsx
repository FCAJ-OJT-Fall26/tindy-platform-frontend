import React, { useState } from 'react';
import { X, Clock, Bookmark, ArrowLeft, Heart, Star } from 'lucide-react';
import { DiscoveryProject } from '../../types/discovery';
import AiMatchBadge from '../common/AiMatchBadge';
import FunnelStatusTracker from '../common/FunnelStatusTracker';

interface ProjectDetailModalProps {
  project: DiscoveryProject | null;
  isOpen: boolean;
  isSaved: boolean;
  isInterested: boolean;
  onClose: () => void;
  onToggleSave: (projectId: string) => void;
  onMarkInterested: (projectId: string) => void;
  onOpenAiBreakdown: () => void;
}

export default function ProjectDetailModal({
  project,
  isOpen,
  isSaved,
  isInterested,
  onClose,
  onToggleSave,
  onMarkInterested,
  onOpenAiBreakdown,
}: ProjectDetailModalProps) {
  const [closing, setClosing] = useState(false);

  if (!isOpen || !project) return null;

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  };

  const match = project.match;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs modal-overlay-animate ${closing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col modal-content-animate ${closing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-black transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Discovery Deck</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(project.id)}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Funnel Tracker */}
          <FunnelStatusTracker
            currentStatus={isInterested ? 'Interested' : isSaved ? 'Recommended' : 'Recommended'}
          />

          {/* Project Title & Category */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {project.category}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">Sprint Duration: {project.duration}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {project.name}
            </h2>
            <p className="text-xs font-semibold text-slate-700">{project.tagline}</p>
          </div>

          {/* AI Match Overview Banner */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <AiMatchBadge score={match.overall} verdict={match.verdict} size="lg" showVerdict={true} />
            <div className="flex flex-col items-start sm:items-end gap-1">
              <button
                type="button"
                onClick={onOpenAiBreakdown}
                className="button primary text-xs py-1.5 px-3"
              >
                Inspect Heuristic Weights
              </button>
            </div>
          </div>

          {/* Project Overview & Goals */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Project Overview & Mission
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {project.desc}
            </p>
          </section>

          {/* Open Role & Commitment */}
          <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Target Recruiting Role
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {project.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-white px-2.5 py-1 rounded border border-slate-200">
                <Clock size={13} />
                <span>{project.hours || project.commitment || '8-10 hrs/week'}</span>
              </div>
            </div>

            {/* Required and Nice-to-have Skills */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  Required Technologies
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(project.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2.5 py-0.5 rounded bg-slate-900 text-white font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {(project.niceToHave || project.niceToHaveSkills) && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Beneficial / Nice-to-Have
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(project.niceToHave || project.niceToHaveSkills || []).map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Current Team Roster */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Current Team Composition
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {project.teamSize} / {project.maxTeamSize} positions filled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(project.teamMembers || project.members || []).map((member) => (
                <div
                  key={member.name}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center gap-3"
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-8 h-8 rounded-md object-cover border border-slate-200"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="button outline text-xs py-2 px-3.5"
          >
            Back to Deck
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(project.id)}
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
                onMarkInterested(project.id);
              }}
              className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors border shadow-2xs cursor-pointer ${
                isInterested
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              <Heart size={14} className={isInterested ? 'text-white fill-white' : 'text-emerald-600 fill-emerald-600'} />
              <span>{isInterested ? 'Interest Confirmed' : 'Confirm Interest'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
