import React from 'react';
import { NavLink } from 'react-router';

function LogoImg({ className = "w-5 h-5 object-contain" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Platform logo"
      className={className}
    />
  );
}

export default function Footer() {
  return (
    <footer className="mt-12 pt-5 pb-6 border-t border-slate-200 text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand, Tagline & Copyright */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-slate-500">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <LogoImg />
            <span>tindy<span className="brand-dot">.</span></span>
          </div>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-500 hidden sm:inline">Student Project Matching</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">© 2026 FCAJ Network</span>
        </div>

        {/* Inline Navigation & Contact */}
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
          <NavLink to="/discover" className="hover:text-slate-900 transition-colors">
            Discover
          </NavLink>
          <NavLink to="/candidates" className="hover:text-slate-900 transition-colors">
            Candidates
          </NavLink>
          <NavLink to="/projects" className="hover:text-slate-900 transition-colors">
            Projects
          </NavLink>
          <NavLink to="/privacy" className="hover:text-slate-900 transition-colors">
            Privacy
          </NavLink>
          <NavLink to="/terms" className="hover:text-slate-900 transition-colors">
            Terms
          </NavLink>
          <a
            href="mailto:contact@fcaj.org"
            className="hover:text-slate-900 transition-colors font-medium text-slate-600"
          >
            contact@fcaj.org
          </a>
        </nav>
      </div>
    </footer>
  );
}

