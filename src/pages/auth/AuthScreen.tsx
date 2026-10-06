import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';

function LogoImg() {
  return (
    <img
      src="/logo.png"
      alt="Platform logo"
      className="w-10 h-10 object-contain mx-auto mb-2"
    />
  );
}

export default function AuthScreen() {
  const navigate = useNavigate();
  const [register, setRegister] = useState(false);

  return (
    <div className="auth-page">
      <div className="auth-art">
        <NavLink to="/" className="brand" aria-label="Tindy Home">
          <LogoImg />
          <span>tindy.</span>
        </NavLink>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-4">
          Academic Project Discovery & Teammate Matching
        </h1>
        <p className="text-xs text-slate-600 mt-2">
          Connect with university project leads and collaborate on verified software sprints.
        </p>
      </div>

      <section className="panel auth-form">
        <h1 className="text-xl font-bold text-slate-900">
          {register ? 'Create Academic Account' : 'Institutional Sign-In'}
        </h1>
        <p className="text-xs text-slate-500 mb-4">
          {register
            ? 'Join the verified student and researcher project directory.'
            : 'Access your active project workspaces and candidate applications.'}
        </p>
        <form
          onSubmit={event => {
            event.preventDefault();
            navigate('/');
          }}
          className="space-y-3"
        >
          {register && (
            <label>
              Full Name
              <input required placeholder="Your full name" />
            </label>
          )}
          <label>
            Institutional Email Address
            <input required type="email" placeholder="student@university.edu" />
          </label>
          <label>
            Password
            <input required type="password" minLength={8} placeholder="Minimum 8 characters" />
          </label>
          {register && (
            <label>
              Primary Platform Role
              <select>
                <option>Student</option>
                <option>Project Leader</option>
              </select>
            </label>
          )}
          <button className="button primary full mt-2">
            <span>{register ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <button className="text-link mt-4" onClick={() => setRegister(!register)}>
          {register
            ? 'Already have an academic account? Sign In'
            : 'New student or researcher? Create an Account'}
        </button>

        <div className="mt-4 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-400">
          Protected by TLS 1.3 · Enterprise Academic Directory
        </div>
      </section>
    </div>
  );
}
