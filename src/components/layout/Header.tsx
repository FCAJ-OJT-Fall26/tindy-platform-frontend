import React from 'react';
import { Menu, Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
  onOpenMobileMenu: () => void;
  onNavigateNotifications: () => void;
  onNavigateProfile: () => void;
}

export default function Header({
  title,
  onOpenMobileMenu,
  onNavigateNotifications,
  onNavigateProfile,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-700 hover:text-black rounded-lg border border-slate-200"
          aria-label="Open mobile menu"
        >
          <Menu size={17} />
        </button>
        <div className="breadcrumb">
          Workspace <span>/</span> <strong>{title}</strong>
        </div>
      </div>

      <div className="top-actions">
        <span className="community-status hidden sm:flex text-slate-700 font-medium">
          Verified FCAJ Member
        </span>
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-600">
          <a href="tel:+18005558463" className="hover:text-black font-medium">
            +1 (800) 555-8463
          </a>
          <span className="text-slate-300">|</span>
          <a href="mailto:contact@fcaj.org" className="hover:text-black font-medium">
            contact@fcaj.org
          </a>
        </div>
        <button
          className="icon-button notification text-slate-700 hover:text-black"
          aria-label="Notifications"
          onClick={onNavigateNotifications}
        >
          <Bell size={18} />
        </button>
        <button className="avatar" onClick={onNavigateProfile}>
          AL
        </button>
      </div>
    </header>
  );
}
