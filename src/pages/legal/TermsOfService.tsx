import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { NavLink } from 'react-router';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <NavLink
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-black transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          <span>Back to Overview</span>
        </NavLink>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            Legal Agreement
          </span>
          <span className="text-xs text-slate-400">Last Revised: January 1, 2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Terms & Conditions of Service
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Please review the binding agreement governing your access to the platform&apos;s project discovery, candidate recruitment, and team collaboration services.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-8 text-sm text-slate-700 leading-relaxed shadow-xs">
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            1. Acceptance & Professional Scope
          </h2>
          <p>
            By creating an account or accessing the platform (&quot;the Service&quot;), you agree to these Terms. The platform is dedicated exclusively to academic and professional project collaboration and software team formation. Personal or romantic solicitation is strictly prohibited and subject to immediate account termination.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            2. Academic Integrity & Accurate Credentials
          </h2>
          <p>
            Users warrant that all reported credentials, academic enrollments, project contributions, and technical skills reflect authentic experience. Submitting fraudulent GitHub repositories, falsified certificates, or misrepresenting availability bandwidth compromises team matching and violates these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            3. Two-Sided Recruitment Protocols
          </h2>
          <p>
            Project matching interactions on the platform follow strict professional steps:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Mutual Consent:</strong> Swiping right or expressing interest does not constitute an automatic team commitment. A formal invite and student acceptance are required.</li>
            <li><strong>Respectful Communication:</strong> All direct messages and chat channels must adhere to community conduct standards. Harassment or spam is zero-tolerance.</li>
            <li><strong>Project Commitment:</strong> Once a student joins a project team, they agree to fulfill agreed sprint deliverables in good faith.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            4. Intellectual Property & Code Ownership
          </h2>
          <p>
            Unless explicitly governed by a separate project sponsor agreement or open-source license (such as MIT, Apache 2.0), students retain ownership of the original code and creative assets they produce during team projects. The platform claims no ownership over user intellectual property.
          </p>
        </section>

        <section className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">5. Legal Inquiries</h3>
          <p className="text-xs text-slate-600">
            For contractual questions, institutional agreements, or terms notices:
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 text-xs">
            <a
              href="mailto:legal@fcaj.org"
              className="text-slate-900 hover:text-black font-semibold"
            >
              legal@fcaj.org
            </a>
            <span className="hidden sm:inline text-slate-300">•</span>
            <a
              href="tel:+18005558463"
              className="text-slate-900 hover:text-black font-semibold"
            >
              +1 (800) 555-8463
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
