import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  Users,
  Compass,
  ArrowRight,
  FolderKanban,
  MessageCircle,
  SlidersHorizontal,
  Search,
  Bookmark,
  Check,
  ArrowUpRight,
  Clock,
  Plus
} from 'lucide-react';
import { projects } from '../../data/projectsData';

interface OverviewScreenProps {
  saved: number[];
  interested: number[];
  skipped: number[];
  onToggleSave: (id: number) => void;
  onSelectDetail: (project: typeof projects[number]) => void;
  onCreateProject: () => void;
  onOpenFilters: () => void;
}

export default function OverviewScreen({
  saved,
  interested,
  skipped,
  onToggleSave,
  onSelectDetail,
  onCreateProject,
  onOpenFilters,
}: OverviewScreenProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All projects');
  const [query, setQuery] = useState('');

  const card = (project: typeof projects[number]) => (
    <article className="project-card" key={project.id}>
      <div className="card-top">
        <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center">
          <project.icon size={18} />
        </div>
        <span className={`match border font-bold ${
          project.score < 35
            ? 'bg-rose-50 text-rose-700 border-rose-300'
            : project.score <= 65
            ? 'bg-amber-50 text-amber-800 border-amber-300'
            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        }`}>
          {project.score < 35 ? '⚠ ' : ''}{project.score}% match
        </span>
        <button
          className={`icon-button save ${saved.includes(project.id) ? 'text-slate-900' : 'text-slate-400'}`}
          aria-label={saved.includes(project.id) ? 'Remove saved project' : 'Save project'}
          onClick={() => onToggleSave(project.id)}
        >
          <Bookmark size={17} fill={saved.includes(project.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="project-category">{project.type}</div>
      <button className="title-button text-left" onClick={() => onSelectDetail(project)}>
        <span>{project.name}</span>
        <ArrowUpRight size={16} />
      </button>
      <p>{project.desc}</p>
      <div className="tags">
        {project.tags.map(tag => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="project-meta">
        <span><Clock size={13} />{project.hours}</span>
        <span>Duration: {project.duration}</span>
      </div>
      <div className="card-footer">
        <div className="avatars">
          {project.people.map((person, index) => (
            <span className="avatar" key={person}>{person}</span>
          ))}
          <small>+2 team</small>
        </div>
        <button onClick={() => onSelectDetail(project)}>
          View project <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC PROJECT DISCOVERY & COLLABORATION</div>
          <h1>
            Project Overview & Active Sprints<span className="heading-dot">.</span>
          </h1>
          <p>
            Find university software projects and teammates with transparent, explainable skill matching.
          </p>
        </div>
        <button className="button primary" onClick={onCreateProject}>
          <Plus size={15} />
          <span>Create Project</span>
        </button>
      </div>

      {/* Hero section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 mb-6 shadow-xs">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 text-slate-900 text-[11px] font-bold uppercase tracking-wider mb-3 border border-slate-200">
            <span>Explainable Team Formation</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Match with Student Projects and Teammates Based on Verified Skills
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Replace opaque recruitment with an interactive discovery stack. Swipe right to express interest, save candidates to your roster, and audit the exact mathematical weight behind every recommendation.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button className="button primary" onClick={() => navigate('/discover')}>
              <span>Discover Projects</span>
              <ArrowRight size={14} />
            </button>
            <button className="button outline" onClick={() => navigate('/candidates')}>
              <span>Review Candidates</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="stats">
        {[
          { icon: FolderKanban, label: 'Verified Project Matches', value: '12', change: 'Updated from catalog' },
          { icon: Users, label: 'Applications Under Review', value: String(interested.length + 3), change: 'Pending project lead review' },
          { icon: FolderKanban, label: 'Active Sprints', value: '2', change: 'Milestones on schedule' },
          { icon: MessageCircle, label: 'Recruitment Inquiries', value: '3', change: 'Direct candidate chats' },
        ].map(stat => (
          <div className="stat" key={stat.label}>
            <span className="stat-icon bg-slate-900 text-white">
              <stat.icon size={16} />
            </span>
            <div>
              <span className="stat-label">{stat.label}</span>
              <div className="stat-value">
                {stat.value}
                <small>{stat.change}</small>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Interactive Stack Callout */}
      <div className="mb-6 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                INTERACTIVE STACK
              </span>
              <span className="text-xs font-bold text-slate-800">Card Discovery Workflow</span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Drag left to skip, right for interest, or tap to examine transparent algorithmic scoring weights.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button className="button outline text-xs py-2 px-3 flex-1 sm:flex-initial" onClick={() => navigate('/candidates')}>
            Review Candidates
          </button>
          <button className="button primary text-xs py-2 px-3 flex-1 sm:flex-initial" onClick={() => navigate('/discover')}>
            <span>Discover Projects</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Projects Grid + Profile verification */}
      <div className="content-columns">
        <section className="project-section">
          <div className="section-heading">
            <div>
              <h2>
                Recommended Projects
                <span className="soft-badge">VERIFIED</span>
              </h2>
              <p>
                Algorithmic recommendations matched against your verified skills and availability.
              </p>
            </div>
            <NavLink to="/discover" className="font-semibold text-slate-900 hover:text-black">
              Open in Full Stack <ArrowRight size={14} />
            </NavLink>
          </div>

          <div className="filter-bar">
            <div className="filter-tabs">
              {['All projects', 'Best matches', 'Recently added'].map(item => (
                <button
                  key={item}
                  className={filter === item ? 'active' : ''}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <button className="filter-button" onClick={onOpenFilters}>
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>
          </div>

          <label className="search-field">
            <Search size={15} />
            <input
              placeholder="Search projects, technical stacks, or roles..."
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>

          <div className="project-grid">
            {projects
              .filter(
                project =>
                  !skipped.includes(project.id) &&
                  `${project.name} ${project.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()) &&
                  (filter !== 'Best matches' || project.score >= 90)
              )
              .sort((first, second) =>
                filter === 'Recently added' ? second.id - first.id : second.score - first.score
              )
              .map(card)}
          </div>
        </section>

        <aside className="right-column">
          <section className="profile-panel">
            <div className="section-heading">
              <h3>Profile Verification</h3>
              <Check size={15} className="text-slate-900" />
            </div>
            <p>Complete academic profiles receive higher discovery priority.</p>
            <div className="completion">
              <strong>75<span>%</span></strong>
              <div>
                <b>Alex Le</b>
                <small>Computer Science Senior</small>
              </div>
            </div>
            <div className="progress">
              <span style={{ width: '75%', backgroundColor: '#0f172a' }} />
            </div>
            <div className="checklist">
              <span><Check size={13} className="text-slate-900" /> Academic credentials verified</span>
              <span><Check size={13} className="text-slate-900" /> Technical competencies verified</span>
              <button onClick={() => navigate('/profile')}>
                <Plus size={13} /> Add project GitHub link
              </button>
              <button onClick={() => navigate('/profile')}>
                <Plus size={13} /> Update weekly availability
              </button>
            </div>
            <button className="button outline full" onClick={() => navigate('/profile')}>
              <span>Manage Profile</span>
              <ArrowRight size={13} />
            </button>
          </section>

          <section className="activity-panel">
            <h3>Recent Activity <span className="live-dot" /></h3>
            <div className="activity">
              <span className="avatar">JL</span>
              <div>
                <p><strong>Jamie Le</strong> invited you to EcoTrack</p>
                <small>Frontend Developer · 2 hours ago</small>
                <button onClick={() => navigate('/messages')}>
                  <span>Reply to message</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
            <div className="activity">
              <span className="activity-icon bg-slate-100 text-slate-900">
                <FolderKanban size={15} />
              </span>
              <div>
                <p><strong>4 verified projects</strong> match your tech stack</p>
                <small>Python, FastAPI, and React</small>
                <button onClick={() => navigate('/discover')}>
                  <span>Review matches</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
              <p className="font-semibold text-slate-900">Academic Verification Standards</p>
              <p className="text-[11px] mt-0.5">All student projects require authenticated academic leads and transparent technical goals.</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
