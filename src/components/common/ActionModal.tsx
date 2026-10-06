import React from 'react';
import { X, Check } from 'lucide-react';

interface ActionModalProps {
  modal: string;
  onClose: () => void;
  onAcceptInvitation: () => void;
  onDeclineInvitation: () => void;
  onSubmitForm: (modalType: string) => void;
}

export default function ActionModal({
  modal,
  onClose,
  onAcceptInvitation,
  onDeclineInvitation,
  onSubmitForm,
}: ActionModalProps) {
  if (!modal) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={event => event.stopPropagation()}>
        <button className="close icon-button text-slate-500 hover:text-black" onClick={onClose} aria-label="Close modal">
          <X size={17} />
        </button>
        <h2>
          {modal === 'create'
            ? 'Create New Project'
            : modal === 'filters'
            ? 'Discovery Search Filters'
            : modal === 'invitation'
            ? 'Project Invitation: EcoTrack'
            : modal === 'experience'
            ? 'Add Project Experience'
            : modal === 'position'
            ? 'Create Open Position'
            : 'Invite Teammate'}
        </h2>

        {modal === 'invitation' ? (
          <>
            <p>
              Jamie Le has formally invited you to join EcoTrack as a Frontend Developer. Weekly commitment: 10 hours/week for 8-12 weeks.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                className="button primary text-xs"
                onClick={onAcceptInvitation}
              >
                <span>Accept Invitation</span>
              </button>
              <button
                className="button outline text-xs"
                onClick={onDeclineInvitation}
              >
                Decline
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={event => {
              event.preventDefault();
              onSubmitForm(modal);
            }}
          >
            {(modal === 'create'
              ? [
                  'Project Name',
                  'Project Description',
                  'Target Goals',
                  'Required Tech Stack',
                  'Available Roles',
                  'Weekly Commitment (hours/week)',
                  'Sprint Duration'
                ]
              : modal === 'filters'
              ? ['Target Role', 'Technology Requirement', 'Minimum Match %']
              : modal === 'experience'
              ? ['Project Name', 'Your Role', 'Summary of Work', 'Repository URL']
              : modal === 'position'
              ? ['Position Title', 'Required Skills', 'Weekly Commitment']
              : ['Institutional Email', 'Assigned Role']
            ).map(label => (
              <label key={label}>
                {label}
                <input required={modal !== 'filters'} placeholder={label} />
              </label>
            ))}
            <div className="modal-actions">
              <button type="button" className="button outline text-xs" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button primary text-xs">
                {modal === 'filters' ? 'Apply Filters' : modal === 'create' ? 'Create Project' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
