import React, { useState } from 'react';
import { useNavigate } from 'react-router';

interface SettingsScreenProps {
  onNotify: (text: string) => void;
}

export default function SettingsScreen({ onNotify }: SettingsScreenProps) {
  const navigate = useNavigate();
  const [role, setRole] = useState('Student');

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC PROJECT DISCOVERY & COLLABORATION</div>
          <h1>System Settings<span className="heading-dot">.</span></h1>
          <p>Manage account identity, academic credentials, and platform communication options.</p>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account Preferences */}
        <section className="panel settings-panel">
          <h2>Account Credentials</h2>
          <label>
            Institutional Email Address
            <input defaultValue="alex.le@fpt.edu.vn" type="email" />
          </label>
          <label>
            Primary Platform Role
            <select value={role} onChange={event => setRole(event.target.value)}>
              <option>Student</option>
              <option>Project Leader</option>
              <option>Administrator</option>
            </select>
          </label>

          <h3 className="spaced">Notification Preferences</h3>
          {[
            'Email notifications for team invites',
            'Direct chat message alerts',
            'Weekly explainable match digest',
            'Sprint milestone publication alerts'
          ].map(text => (
            <label className="setting-toggle" key={text}>
              {text}
              <input type="checkbox" defaultChecked />
            </label>
          ))}

          <div className="flex gap-3 mt-6">
            <button className="button primary text-xs" onClick={() => onNotify('Account preferences updated')}>
              Save Preferences
            </button>
            <button className="button outline text-xs" onClick={() => navigate('/login')}>
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
