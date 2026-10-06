import React from 'react';
import { useNavigate } from 'react-router';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-mono font-extrabold text-2xl mb-4 border border-slate-200 shadow-xs">
        404
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        The destination you are trying to access does not exist, has been archived, or was moved to another URL path.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full max-w-sm">
        <button
          onClick={() => navigate('/')}
          className="button primary w-full text-xs py-2.5"
        >
          <span>Return to Overview</span>
        </button>
        <button
          onClick={() => navigate('/discover')}
          className="button outline w-full text-xs py-2.5"
        >
          <span>Discover Projects</span>
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200 w-full text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-4">
        <span>Technical desk:</span>
        <a
          href="mailto:support@fcaj.org"
          className="text-slate-900 hover:text-black font-semibold"
        >
          support@fcaj.org
        </a>
        <a
          href="tel:+18005558463"
          className="text-slate-900 hover:text-black font-semibold"
        >
          +1 (800) 555-8463
        </a>
      </div>
    </div>
  );
}
