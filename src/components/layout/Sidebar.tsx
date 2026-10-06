import React from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Compass,
  FolderKanban,
  Bookmark,
  Users,
  MessageCircle,
  Settings,
  ChevronDown,
  ArrowRight,
  User,
  Sparkles
} from 'lucide-react';

export const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Discover projects', path: '/discover', icon: Compass },
  { label: 'My projects', path: '/projects', icon: FolderKanban },
  { label: 'Saved projects', path: '/saved', icon: Bookmark },
  { label: 'Candidates', path: '/candidates', icon: Users },
  { label: 'Messages', path: '/messages', icon: MessageCircle }
];

function LogoImg() {
  return (
    <img
      src="/logo.png"
      alt="Platform logo"
      className="w-7 h-7 object-contain"
    />
  );
}

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <NavLink className="brand" to="/" aria-label="Tindy Home">
        <LogoImg />
        <span>tindy<span className="brand-dot">.</span></span>
      </NavLink>

      <div className="community">
        <div className="community-symbol">F</div>
        <div>
          <strong>FCAJ Community</strong>
          <small>Build. Connect. Grow.</small>
        </div>
        <ChevronDown size={14} />
      </div>

      <div className="nav-label">WORKSPACE</div>
      <nav>
        {navItems.map(item => (
          <NavLink
            end={item.path === '/'}
            to={item.path}
            key={item.path}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.label === 'Messages' && <b className="count">3</b>}
          </NavLink>
        ))}
      </nav>

      <div className="nav-label tools-label">YOUR GROWTH</div>
      <nav>
        <NavLink
          to="/profile"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <User size={18} />
          <span>My profile</span>
        </NavLink>
        <NavLink
          to="/ai-studio"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Sparkles size={18} />
          <span>AI studio</span>
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            NEW
          </span>
        </NavLink>
      </nav>

      <div className="sidebar-promo bg-indigo-50/40 border border-indigo-100/80 p-3.5 rounded-xl mt-3">
        <div className="flex items-center gap-1.5 text-indigo-700 mb-1">
          <Sparkles size={13} />
          <span className="font-bold text-xs text-slate-900">A little help from AI</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
          Turn your experience into a profile that stands out.
        </p>
        <button
          onClick={() => navigate('/ai-studio')}
          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center justify-between w-full transition-colors"
        >
          <span>Build my profile</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="sidebar-bottom">
        <NavLink to="/settings" className="nav-item">
          <Settings size={17} />
          <span>Settings</span>
        </NavLink>
        <button className="account" onClick={() => navigate('/profile')}>
          <span className="avatar">AL</span>
          <div>
            <strong>Alex Le</strong>
            <small>Student Member</small>
          </div>
          <ChevronDown size={14} />
        </button>
      </div>
    </aside>
  );
}
