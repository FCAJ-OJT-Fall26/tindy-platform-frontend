import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DiscoveryCandidate } from '../../types/discovery';

interface CandidateShortlistModalProps {
  isOpen: boolean;
  candidate: DiscoveryCandidate | null;
  projectName?: string;
  onClose: () => void;
  onConfirmShortlist: () => void;
  onInviteToChat: (message: string) => void;
}

export default function CandidateShortlistModal({
  isOpen,
  candidate,
  projectName = 'EcoTrack',
  onClose,
  onConfirmShortlist,
  onInviteToChat,
}: CandidateShortlistModalProps) {
  const [step, setStep] = useState<'confirm' | 'chat'>('confirm');
  const [invitationNote, setInvitationNote] = useState('');

  if (!isOpen || !candidate) return null;

  const handleConfirm = () => {
    onConfirmShortlist();
    setStep('chat');
  };

  const handleSendInvite = () => {
    onInviteToChat(
      invitationNote ||
        `Hi ${candidate.name}, I reviewed your verified profile and would like to invite you to discuss our ${candidate.preferredRole} role for ${projectName}.`
    );
    setStep('confirm');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              Recruitment Step
            </span>
            <h3 className="font-bold text-base text-slate-900 mt-1">
              {step === 'confirm' ? 'Shortlist Candidate Confirmation' : 'Direct Conversation Invitation'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          {step === 'confirm' ? (
            <>
              {/* Candidate Quick Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <img
                  src={candidate.avatar}
                  alt={candidate.name}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm">{candidate.name}</h4>
                  <p className="text-slate-500">{candidate.preferredRole} · {candidate.university}</p>
                  <p className="font-mono text-slate-800 font-bold mt-0.5">
                    Match Score: {candidate.match.overall}%
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  Shortlist {candidate.name} for {projectName}?
                </p>
                <p>
                  Swiping right records this candidate to your active talent roster. In accordance with professional protocols, this does not automatically send a binding offer.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-1">
                <div>Candidate Availability: <strong>{candidate.hours}</strong></div>
                <div>Top Competency: <strong>{candidate.skills.slice(0, 3).join(', ')}</strong></div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-slate-700">
                  Candidate added to your shortlist. Send a direct invitation to begin sprint discussions:
                </p>
                <textarea
                  rows={4}
                  value={invitationNote}
                  onChange={(e) => setInvitationNote(e.target.value)}
                  placeholder={`Hi ${candidate.name}, I reviewed your profile and would like to discuss joining ${projectName}...`}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="button outline text-xs py-2 px-3.5"
          >
            Cancel
          </button>

          {step === 'confirm' ? (
            <button
              type="button"
              onClick={handleConfirm}
              className="button primary text-xs py-2 px-4"
            >
              Confirm Shortlist
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendInvite}
              className="button primary text-xs py-2 px-4"
            >
              Send Chat Invitation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
