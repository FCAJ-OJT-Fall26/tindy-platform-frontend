import React, { useState } from 'react';
import {
  X,
  Star,
  Heart,
  MessageCircle,
  FolderKanban,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { ProjectItem } from '../../data/projectsData';

interface WorkspaceProjectDetailModalProps {
  detail: ProjectItem | null;
  isMyProject?: boolean;
  saved: number[];
  interested: number[];
  onClose: () => void;
  onOpenMessages?: (projectName: string) => void;
  onNavigateTeam?: () => void;
  onSkip?: (id: number) => void;
  onToggleSave?: (id: number) => void;
  onMarkInterested?: (id: number) => void;
}

export default function WorkspaceProjectDetailModal({
  detail,
  isMyProject = false,
  saved,
  interested,
  onClose,
  onOpenMessages,
  onNavigateTeam,
  onSkip,
  onToggleSave,
  onMarkInterested,
}: WorkspaceProjectDetailModalProps) {
  const [closing, setClosing] = useState(false);

  if (!detail) return null;

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  };

  const isSaved = saved.includes(detail.id);
  const isInterested = interested.includes(detail.id);

  // If this is one of "My Projects", render the active workspace sprint details
  if (isMyProject) {
    return (
      <div className={`modal-backdrop modal-overlay-animate ${closing ? 'closing' : ''}`} onClick={handleClose}>
        <section
          className={`modal detail-modal max-w-xl w-full modal-content-animate ${closing ? 'closing' : ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <detail.icon size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE SPRINT
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">{detail.type}</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{detail.name}</h2>
              </div>
            </div>
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Project Summary & Mission */}
          <div className="py-4 space-y-4 text-xs text-slate-600">
            <p className="leading-relaxed text-slate-700 text-xs sm:text-sm">
              {detail.desc}
            </p>

            {/* Your Role & Commitment Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Your Role & Status
                </span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  {detail.role} <span className="text-indigo-600 font-semibold">(Alex Le)</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <span className="flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <Clock size={12} className="text-slate-400" />
                  {detail.hours}
                </span>
                <span className="flex items-center gap-1 text-[11px] bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  Sprint 3 of 6
                </span>
              </div>
            </div>

            {/* Active Sprint Milestones */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                Active Sprint Milestones
              </span>
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span className="line-through text-slate-400">Milestone 1: Project kickoff & schema design</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
                  <span>Milestone 2: Frontend telemetry & dashboard integration (In Progress)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                  <span>Milestone 3: End-to-end integration testing & sprint review</span>
                </div>
              </div>
            </div>

            {/* Team Roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block">
                  Team Members ({detail.people.length + 1})
                </span>
                <span className="text-[11px] text-slate-500">First Cloud AI Journey</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    AL
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[11px] truncate">Alex Le (You)</p>
                    <p className="text-[10px] text-slate-500 truncate">{detail.role}</p>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                    JL
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[11px] truncate">Jamie Le</p>
                    <p className="text-[10px] text-slate-500 truncate">Project Lead</p>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                    KT
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[11px] truncate">Kelly Tran</p>
                    <p className="text-[10px] text-slate-500 truncate">UI/UX Design</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Stack Tags & Repository */}
            <div className="pt-2 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {detail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <a
                href={`https://github.com/fcaj-community/${detail.name.toLowerCase().replace(/\s+/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
              >
                <GitBranch size={13} />
                <span>GitHub Repository</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Modal Actions for My Project: Message Team & Open Workspace */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="py-2 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs transition-colors cursor-pointer"
            >
              Close
            </button>

            <div className="flex items-center gap-2.5">
              {onNavigateTeam && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onNavigateTeam();
                  }}
                  className="py-2 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Users size={14} className="text-slate-500" />
                  <span>Team Workspace</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenMessages?.(detail.name);
                }}
                className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle size={14} />
                <span>Message Team</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Otherwise (e.g. from Saved Projects), render the review / bookmark view
  return (
    <div className={`modal-backdrop modal-overlay-animate ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <section className={`modal detail-modal modal-content-animate ${closing ? 'closing' : ''}`} onClick={(event) => event.stopPropagation()}>
        <button
          className="close icon-button text-slate-500 hover:text-black cursor-pointer"
          onClick={handleClose}
          aria-label="Close modal"
        >
          <X size={17} />
        </button>
        <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3">
          <detail.icon size={20} />
        </div>
        <span className="eyebrow">{detail.type} · SAVED SPECIFICATION</span>
        <h2>{detail.name}</h2>
        <p>{detail.desc}</p>
        <div className="tags">
          {detail.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <h3 className="mt-4">Target Role: {detail.role}</h3>
        <p className="text-xs text-slate-600">
          Commitment: {detail.hours} · Duration: {detail.duration}.
        </p>

        <h3>
          Algorithmic Match Breakdown{' '}
          <span className="match bg-slate-100 text-slate-900 border border-slate-200">
            {detail.score}% match
          </span>
        </h3>
        <div className="match-breakdown">
          {[
            ['Technical skills overlap', 40],
            ['Domain interest alignment', 20],
            ['Target position match', 15],
            ['Project portfolio evidence', 15],
            ['Weekly availability', 10],
          ].map(([itemLabel, weight]) => (
            <div key={itemLabel}>
              <span>
                {itemLabel} <small>{weight}% weight</small>
              </span>
              <div className="match-bar">
                <span
                  style={{ width: `${Number(weight) * 2}%`, backgroundColor: '#0f172a' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="modal-actions pt-4 border-t border-slate-150 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {onToggleSave && (
              <button
                className={`text-xs font-semibold py-1.5 px-3 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSaved
                    ? 'border-sky-300 bg-sky-50 text-sky-700 shadow-2xs'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
                onClick={() => onToggleSave(detail.id)}
              >
                <Star
                  size={14}
                  className={isSaved ? 'text-sky-500 fill-sky-500' : 'text-slate-400'}
                />
                <span>{isSaved ? 'Saved' : 'Save for Later'}</span>
              </button>
            )}

            {onMarkInterested && (
              <button
                className="text-xs font-semibold py-1.5 px-3.5 rounded-lg border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                onClick={() => onMarkInterested(detail.id)}
              >
                <Heart size={14} className="text-emerald-600 fill-emerald-600" />
                <span>{isInterested ? 'Interest Confirmed' : 'Confirm Interest'}</span>
              </button>
            )}

            {onOpenMessages && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenMessages(detail.name);
                }}
                className="py-1.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Message Lead</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
