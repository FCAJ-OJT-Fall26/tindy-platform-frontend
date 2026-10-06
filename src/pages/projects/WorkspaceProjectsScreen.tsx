import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Sparkles,
  Bookmark,
  ArrowUpRight,
  Clock,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { projects, ProjectItem } from '../../data/projectsData';

interface WorkspaceProjectsScreenProps {
  mode: 'projects' | 'saved';
  saved: number[];
  onToggleSave: (id: number) => void;
  onSelectDetail: (project: ProjectItem) => void;
  onCreateProject: () => void;
  onOpenFilters: () => void;
}

export default function WorkspaceProjectsScreen({
  mode,
  saved,
  onToggleSave,
  onSelectDetail,
  onCreateProject,
  onOpenFilters,
}: WorkspaceProjectsScreenProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All projects');

  const card = (project: ProjectItem) => (
    <article className="project-card" key={project.id}>
      <div className="card-top">
        <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center">
          <project.icon size={18} />
        </div>
        {mode === 'projects' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Sprint
          </span>
        ) : (
          <span className={`match border font-bold ${
            project.score < 35
              ? 'bg-rose-50 text-rose-700 border-rose-300'
              : project.score <= 65
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}>
            {project.score < 35 ? '⚠ ' : ''}{project.score}% match
          </span>
        )}
        {mode === 'saved' && (
          <button
            className={`icon-button save ${saved.includes(project.id) ? 'text-slate-900' : 'text-slate-400'}`}
            aria-label={saved.includes(project.id) ? 'Remove saved project' : 'Save project'}
            onClick={() => onToggleSave(project.id)}
          >
            <Bookmark size={17} fill={saved.includes(project.id) ? 'currentColor' : 'none'} />
          </button>
        )}
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

  const displayedProjects = projects.filter(project => {
    if (mode === 'saved' && !saved.includes(project.id)) return false;
    if (mode === 'projects' && project.id >= 3) return false;
    const matchQuery = `${project.name} ${project.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    if (!matchQuery) return false;
    if (filter === 'Best matches' && project.score < 90) return false;
    return true;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ACADEMIC PROJECT DISCOVERY & COLLABORATION</div>
          <h1>
            {mode === 'projects' ? 'My Projects & Sprints' : 'Saved Project Roster'}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {mode === 'projects'
              ? 'Structured project milestones, open position requirements, and team roster.'
              : 'Archived projects and bookmarked technical specifications for upcoming quarters.'}
          </p>
        </div>
        <button className="button primary" onClick={onCreateProject}>
          <Plus size={15} />
          <span>Create Project</span>
        </button>
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
        {displayedProjects.map(card)}
      </div>

      {mode === 'saved' && saved.length === 0 && (
        <div className="empty text-center py-12 bg-white rounded-xl border border-slate-200">
          <Bookmark size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-slate-700 font-semibold text-sm">No saved projects in your collection.</p>
          <p className="text-slate-500 text-xs mt-1">Browse the discovery deck and tap Save to bookmark specifications.</p>
          <button onClick={() => navigate('/discover')} className="button primary mt-4">
            Discover Projects
          </button>
        </div>
      )}
    </>
  );
}
