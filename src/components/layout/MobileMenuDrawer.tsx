import React from 'react';
import { NavLink } from 'react-router';
import { X, User, Sparkles } from 'lucide-react';
import { navItems } from './Sidebar';

function LogoImg() {
  return (
    <img
      src="/logo.png"
      alt="Platform logo"
      className="w-7 h-7 object-contain"
    />
  );
}

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex">
      <div className="w-72 bg-white h-full p-5 flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <NavLink to="/" className="brand m-0" onClick={onClose}>
            <LogoImg />
            <span>tindy<span className="brand-dot">.</span></span>
          </NavLink>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            aria-label="Close mobile menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-1 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 mb-2">
            Discovery & Workspace
          </span>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 mb-1">
              Your Growth
            </span>
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <User size={17} />
              <span>My profile</span>
            </NavLink>
            <NavLink
              to="/ai-studio"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <Sparkles size={17} />
              <span>AI studio</span>
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                NEW
              </span>
            </NavLink>
          </div>
        </div>

        <div className="py-4 space-y-1.5 border-b border-slate-100 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 mb-1">
            Legal & Support
          </span>
          <NavLink
            to="/privacy"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900"
          >
            <span>Privacy Policy</span>
          </NavLink>
          <NavLink
            to="/terms"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900"
          >
            <span>Terms & Conditions</span>
          </NavLink>
        </div>

        <div className="mt-auto pt-4 text-xs space-y-2">
          <div className="text-[11px] text-slate-500">Contact verified desk:</div>
          <a href="tel:+18005558463" className="block text-slate-900 font-semibold">
            +1 (800) 555-8463
          </a>
          <a href="mailto:contact@fcaj.org" className="block text-slate-900 font-semibold">
            contact@fcaj.org
          </a>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
