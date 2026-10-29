import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Sparkles,
  Bookmark,
  ArrowUpRight,
  Clock,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Plus,
  FolderKanban
} from 'lucide-react';
import type { ProjectItem } from '../../data/projectsData';
import ProjectSaveButton from '../../components/common/ProjectSaveButton';
import { getProjectsApi, getProjectByIdApi, isGuid } from '../../services/projects.service';
import { ApiError } from '../../services/apiClient';

import { projectErrorMessage } from '../../services/projectEditor.service';

interface WorkspaceProjectsScreenProps {
  mode: 'projects' | 'saved';
  saved: string[];
  onToggleSave: (id: string) => void;
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
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [version, setVersion] = useState(0);
  const savedKey = saved.join(',');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const load = async () => {
      if (mode !== 'saved') return getProjectsApi({ q: query || undefined, page, page_size: 12 }, controller.signal);
      const details = await Promise.all(savedKey.split(',').filter(isGuid).map(async id => {
        try { return await getProjectByIdApi(id, controller.signal); }
        catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
      }));
      return { items: details.filter(detail => detail !== null).map(detail => ({ ...detail,
        open_positions: detail.positions.filter(position => position.status === 'open').map(position => ({
          position_id: position.position_id, title: position.title, role_name: position.title, required_count: position.required_count,
          required_skills: position.skills.filter(skill => skill.is_required).map(skill => skill.name),
          nice_to_have_skills: position.skills.filter(skill => !skill.is_required).map(skill => skill.name),
        })),
      })), pagination: { has_next: false } };
    };
    load()
      .then(res => {
        if (controller.signal.aborted) return;
        setHasNext(res.pagination.has_next);
        setProjectList(res.items.map(dto => ({
          id: dto.project_id, name: dto.name, sub: dto.tagline || dto.category,
          type: dto.category, desc: dto.description, tags: dto.open_positions.flatMap(position => position.required_skills),
          role: dto.open_positions[0]?.title || 'No open positions', color: dto.color_theme || 'default',
          hours: dto.expected_commitment_hours + ' hrs/week', duration: dto.duration,
          people: [dto.leader.initials || 'PL'], team: dto.current_team_size, capacity: dto.max_team_capacity,
          score: 0, icon: FolderKanban,
        })));
      })
      .catch(error => { if (!controller.signal.aborted) { setProjectList([]); setError(projectErrorMessage(error)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, version, mode, savedKey]);

  const selectProject = (project: ProjectItem) => {
    onSelectDetail(project);
    navigate('/project/' + project.id);
  };

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
        ) : <span className="match border font-bold">Saved locally</span>}
        {mode === 'saved' && (
          <ProjectSaveButton
            saved={saved.includes(project.id)}
            onToggle={() => onToggleSave(project.id)}
            variant="icon"
            size={17}
            className={`save ${saved.includes(project.id) ? 'text-slate-900' : 'text-slate-400'}`}
            projectName={project.name}
          />
        )}
      </div>
      <div className="project-category">{project.type}</div>
      <button className="title-button text-left" onClick={() => selectProject(project)}>
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
          <small>{project.team} / {project.capacity} members</small>
        </div>
        <button onClick={() => selectProject(project)}>
          View project <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );

  const displayedProjects = projectList.filter(project => {
    if (mode === 'saved' && !saved.includes(project.id)) return false;
    const matchQuery = `${project.name} ${project.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    if (!matchQuery) return false;
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
          onChange={event => { setQuery(event.target.value); setPage(1); }}
        />
      </label>

      {loading && <div className="info-banner" role="status">Loading projects…</div>}
      {error && <div className="info-banner" role="alert">{error} <button onClick={() => setVersion(value => value + 1)}>Retry</button></div>}
      <div className="project-grid">
        {!loading && !error && displayedProjects.map(card)}
      </div>

      {!loading && !error && <div className="leader-pagination-controls"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button disabled={!hasNext} onClick={() => setPage(value => value + 1)}>Next</button></div>}
      {!loading && !error && displayedProjects.length === 0 && (
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
