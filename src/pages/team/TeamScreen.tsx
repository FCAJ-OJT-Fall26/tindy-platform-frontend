import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface TeamScreenProps {
  onOpenInviteModal: () => void;
  onOpenPositionModal: () => void;
  onNavigateMessages: () => void;
  onNotify: (text: string) => void;
}

export default function TeamScreen({
  onOpenInviteModal,
  onOpenPositionModal,
  onNavigateMessages,
  onNotify,
}: TeamScreenProps) {
  const [announcements, setAnnouncements] = useState(false);
  const [updateText, setUpdateText] = useState('');

  const members = [
    'Jamie Le · Project Lead',
    'Alex Le · Frontend Developer',
    'An Nguyen · Backend Developer',
    'Kim Tran · UI/UX Designer'
  ];

  const handlePost = () => {
    if (!updateText.trim()) return;
    setAnnouncements(true);
    setUpdateText('');
    onNotify('Announcement published to EcoTrack roster');
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC PROJECT DISCOVERY & COLLABORATION</div>
          <h1>EcoTrack Team Workspace<span className="heading-dot">.</span></h1>
          <p>Collaborative milestones, sprint membership, and recruitment positions.</p>
        </div>
      </div>

      <div className="two-panels">
        <section className="panel">
          <h2>Team Members</h2>
          {members.map(person => (
            <div className="file-row" key={person}>
              <span>{person}</span>
              <span className="soft-badge">ACTIVE</span>
            </div>
          ))}
          <button className="button primary mt-4" onClick={onOpenInviteModal}>
            <Plus size={15} />
            <span>Invite Teammate</span>
          </button>
          <h3 className="spaced">Open Recruitment Roles</h3>
          <div className="file-row">
            <span>Frontend Developer</span>
            <span className="text-xs text-slate-500">1 open position</span>
          </div>
          <button className="button outline text-xs" onClick={onOpenPositionModal}>
            Add Position
          </button>
        </section>

        <section className="panel">
          <h2>Sprint Announcements</h2>
          <p className="text-xs text-slate-600">Sprint kickoff meeting scheduled for Friday at 5:00 PM UTC.</p>
          {announcements && (
            <p className="text-xs text-slate-900 bg-slate-100 p-2 rounded border border-slate-200">
              Announcement successfully published to team members.
            </p>
          )}
          <textarea
            placeholder="Publish sprint update or milestone notes to team..."
            rows={4}
            value={updateText}
            onChange={e => setUpdateText(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <button className="button primary text-xs" onClick={handlePost}>
              Post Announcement
            </button>
            <button className="button outline text-xs" onClick={onNavigateMessages}>
              <span>Open Team Chat</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
