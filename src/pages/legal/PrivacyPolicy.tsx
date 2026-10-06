import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { NavLink } from 'react-router';

export default function PrivacyPolicy() {
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
            Legal & Compliance
          </span>
          <span className="text-xs text-slate-400">Effective Date: January 1, 2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          How FCAJ Network (&quot;we&quot;, &quot;our&quot;) collects, protects, and uses verified student and project data across our platform.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-8 text-sm text-slate-700 leading-relaxed shadow-xs">
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            1. Information We Collect
          </h2>
          <p>
            We operate as a professional academic and project collaboration network. We collect only information strictly necessary to provide transparent, explainable project matching:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Account Identity:</strong> Institutional email address, verified full name, academic affiliation (e.g. FPT University, FCAJ Community), and graduation timeline.</li>
            <li><strong>Technical Competency Evidence:</strong> Self-reported skills, verified course projects, public repository URLs (e.g. GitHub), and uploaded credential certificates.</li>
            <li><strong>Availability Parameters:</strong> Weekly commitment bandwidth (hours/week) and project duration preferences.</li>
            <li><strong>Platform Activity:</strong> Discovery swipe preferences (Skip, Interested, Saved), candidate shortlists, and direct in-app team communications.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            2. Explainable Matching & Algorithm Transparency
          </h2>
          <p>
            Unlike automated black-box scoring systems, our system computes fit scores using transparent, rule-based heuristic weights:
          </p>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs space-y-1 text-slate-700">
            <div>Technical Skills Overlap: 40% weight</div>
            <div>Stated Project Domain Interests: 20% weight</div>
            <div>Target Position / Role: 15% weight</div>
            <div>Project Portfolio Experience: 15% weight</div>
            <div>Availability Alignment: 10% weight</div>
          </div>
          <p className="text-xs text-slate-600">
            We do not sell user data, train commercial third-party LLMs on private student communications, or evaluate candidate compatibility based on non-professional traits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            3. Data Storage & Security Controls
          </h2>
          <p>
            All data in transit is encrypted using TLS 1.3, and data at rest is protected with AES-256 encryption. Institutional authentications adhere to OAuth 2.0 standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            4. User Rights & Data Deletion
          </h2>
          <p>
            Students and project leads maintain complete ownership of their profiles. You may export your verified project history or request complete account erasure at any time via your account settings or by contacting our data protection officer.
          </p>
        </section>

        <section className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">5. Contact Privacy Office</h3>
          <p className="text-xs text-slate-600">
            For privacy inquiries, audit requests, or institutional compliance verification:
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 text-xs">
            <a
              href="mailto:privacy@fcaj.org"
              className="text-slate-900 hover:text-black font-semibold"
            >
              privacy@fcaj.org
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
