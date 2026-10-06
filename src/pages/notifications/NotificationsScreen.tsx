import React from 'react';
import { ArrowRight } from 'lucide-react';

interface NotificationsScreenProps {
  onReviewInvite: () => void;
  onNavigateDiscover: () => void;
  onNavigateTeam: () => void;
}

export default function NotificationsScreen({
  onReviewInvite,
  onNavigateDiscover,
  onNavigateTeam,
}: NotificationsScreenProps) {
  const notifications = [
    { text: 'Jamie Le invited you to join the EcoTrack sprint team', time: '1 hour ago', type: 'invite' },
    { text: '4 new technical projects match your verified profile', time: '2 hours ago', type: 'discover' },
    { text: 'EcoTrack team published Sprint 1 milestone notes', time: '3 hours ago', type: 'team' },
    { text: 'Profile verification audit complete: Score 96%', time: '4 hours ago', type: 'discover' },
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC PROJECT DISCOVERY & COLLABORATION</div>
          <h1>Platform Notifications<span className="heading-dot">.</span></h1>
          <p>Team invitations, verified match updates, and sprint reminders.</p>
        </div>
      </div>

      <section className="panel">
        {notifications.map((item) => (
          <div className="notification-row" key={item.text}>
            <span className="stat-icon bg-slate-900 text-white">
              <span className="w-2 h-2 rounded-xs bg-white" />
            </span>
            <div>
              <h3>{item.text}</h3>
              <p>{item.time} · FCAJ Academic Network</p>
            </div>
            <button
              className="button outline text-xs py-1.5 px-3"
              onClick={() => {
                if (item.type === 'invite') onReviewInvite();
                else if (item.type === 'discover') onNavigateDiscover();
                else onNavigateTeam();
              }}
            >
              <span>{item.type === 'invite' ? 'Review Invitation' : 'View Update'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
