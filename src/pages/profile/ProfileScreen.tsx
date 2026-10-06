import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ExternalLink,
  Settings,
  Shield,
  GraduationCap,
  Sparkles,
  Plus,
  ShieldCheck,
  Upload,
  X,
  Check,
  UploadCloud,
  Code
} from 'lucide-react';
import { UserProfile, ProfileProjectExperience } from '../../data/profileData';

interface ProfileScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNotify?: (message: string) => void;
}

export default function ProfileScreen({
  profile,
  onUpdateProfile,
  onNotify,
}: ProfileScreenProps) {
  const navigate = useNavigate();

  // Mode: 'view' or 'edit'
  const [isEditing, setIsEditing] = useState(false);

  // Edit form states
  const [name, setName] = useState(profile.name);
  const [university, setUniversity] = useState(profile.university);
  const [preferredRole, setPreferredRole] = useState(profile.preferredRole);
  const [availabilityHours, setAvailabilityHours] = useState(profile.availabilityHours);
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl);
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl);
  const [summary, setSummary] = useState(profile.summary);
  const [professionalInterestsText, setProfessionalInterestsText] = useState(
    profile.professionalInterests.join(', ')
  );
  const [projectExperienceText, setProjectExperienceText] = useState(profile.projectExperienceText);
  const [learningGoals, setLearningGoals] = useState(profile.learningGoals);
  const [technologiesToLearnText, setTechnologiesToLearnText] = useState(
    profile.technologiesToLearn.join(', ')
  );

  // Technical skills tag management in Edit mode
  const [technicalSkills, setTechnicalSkills] = useState<string[]>(profile.technicalSkills);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Add Project Experience Modal (in View mode)
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpTags, setNewExpTags] = useState('');

  // File upload state feedback
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Add / Remove technical skills
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !technicalSkills.includes(trimmed)) {
      setTechnicalSkills([...technicalSkills, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setTechnicalSkills(technicalSkills.filter((s) => s !== skillToRemove));
  };

  // Save changes from Edit mode
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedInterests = professionalInterestsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedTechToLearn = technologiesToLearnText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onUpdateProfile({
      name,
      university,
      preferredRole,
      availabilityHours,
      githubUrl,
      portfolioUrl,
      summary,
      professionalInterests: parsedInterests,
      projectExperienceText,
      learningGoals,
      technologiesToLearn: parsedTechToLearn,
      technicalSkills,
    });

    setIsEditing(false);
    onNotify?.('Profile updated successfully!');
  };

  // Add new project experience in View mode
  const handleCreateProjectExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim()) return;

    const initials =
      newExpTitle
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || '')
        .join('') || 'PJ';

    const tags = newExpTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newProject: ProfileProjectExperience = {
      id: `proj-${Date.now()}`,
      initials,
      title: newExpTitle,
      desc: newExpDesc || 'Project experience developed in collaborative engineering sprints.',
      tags: tags.length > 0 ? tags : ['General'],
    };

    onUpdateProfile({
      projects: [...profile.projects, newProject],
    });

    setNewExpTitle('');
    setNewExpDesc('');
    setNewExpTags('');
    setIsAddExpOpen(false);
    onNotify?.(`Added "${newProject.title}" to previous projects.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      onNotify?.(`Attached "${file.name}" to verified documents.`);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 pb-20">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-manrope">
            Your professional profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Your skills, your story, and what you want to build next.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNotify?.('Previewing public academic profile.')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            <ExternalLink size={14} className="text-slate-500" />
            <span>Preview profile</span>
          </button>

          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span>Cancel editing</span>
              <Settings size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span>Edit profile</span>
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Profile Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        {/* Subtle decorative cover banner with light blueprint curves */}
        <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-gradient-to-r from-slate-100 via-sky-50/50 to-slate-100 border-b border-slate-200/80 p-5 flex items-start justify-end">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
            viewBox="0 0 900 150"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M450 0 C600 60, 750 140, 900 150 L900 0 Z" fill="#e0f2fe" opacity="0.3" />
            <path
              d="M550 0 C700 80, 800 120, 900 130"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <path
              d="M300 0 C500 50, 700 110, 900 100"
              stroke="#94a3b8"
              strokeWidth="0.8"
              opacity="0.4"
            />
          </svg>
          <span className="relative z-10 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase select-none">
            FCAJ / BUILT TO BUILD
          </span>
        </div>

        {/* Avatar & Identity Info */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative bg-white">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Avatar circle */}
              <div className="relative">
                <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-[#f3e7dc] text-slate-800 border-4 border-white flex items-center justify-center font-bold text-2xl shadow-sm relative z-10 shrink-0">
                  AL
                </div>
                {/* Upload photo trigger ONLY visible in Edit Mode */}
                {isEditing && (
                  <label
                    className="absolute bottom-0 right-0 z-20 w-7 h-7 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-xs transition-colors"
                    title="Upload profile photo"
                  >
                    <Upload size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onNotify?.(`Photo "${file.name}" selected.`);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Name & Credentials */}
              <div className="space-y-1 sm:mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {profile.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield size={10} />
                    <span>FCAJ MEMBER</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                  <GraduationCap size={13} className="text-slate-400" />
                  <span>{profile.university}</span>
                  <span>·</span>
                  <span className="font-semibold text-slate-700">{profile.preferredRole}</span>
                </p>

                {/* External links */}
                <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
                  <a
                    href={`https://${profile.githubUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-black hover:underline"
                  >
                    <Code size={12} className="text-slate-400" />
                    <span>GitHub</span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </a>
                  <span>•</span>
                  <a
                    href={`https://${profile.portfolioUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-black hover:underline"
                  >
                    <span>Portfolio</span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right side status indicator */}
            <div className="text-left sm:text-right space-y-0.5 sm:mb-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Open to projects</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                {profile.availabilityHours} hours/week
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Rendering: Edit Form vs View Mode */}
      {isEditing ? (
        /* ========================================================================= */
        /* MODE 2: EDIT PROFILE MODE ("Make it yours")                                */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-900">
              Make it yours
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your primary credentials, availability, and technical background.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Row 1: Full name & University */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  placeholder="e.g. Alex Le"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  University / community
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  placeholder="e.g. FPT University"
                  required
                />
              </div>
            </div>

            {/* Row 2: Preferred role & Weekly availability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Preferred role
                </label>
                <input
                  type="text"
                  value={preferredRole}
                  onChange={(e) => setPreferredRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  placeholder="e.g. Backend Developer"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Weekly availability (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={availabilityHours}
                  onChange={(e) => setAvailabilityHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  required
                />
              </div>
            </div>

            {/* Row 3: GitHub URL & Portfolio URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  GitHub URL
                </label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  placeholder="github.com/alexle"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Portfolio URL
                </label>
                <input
                  type="text"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  placeholder="alexle.dev"
                />
              </div>
            </div>

            {/* Profile summary */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Profile summary
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white leading-relaxed"
                placeholder="Brief narrative of your engineering interests..."
              />
            </div>

            {/* Professional interests */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Professional interests
              </label>
              <input
                type="text"
                value={professionalInterestsText}
                onChange={(e) => setProfessionalInterestsText(e.target.value)}
                placeholder="Comma separated, e.g. Cloud computing, AI applications, open source"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
              />
            </div>

            {/* Project experience text */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Project experience
              </label>
              <textarea
                rows={3}
                value={projectExperienceText}
                onChange={(e) => setProjectExperienceText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white leading-relaxed"
                placeholder="Overview of your primary completed projects..."
              />
            </div>

            {/* Learning goals */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Learning goals
              </label>
              <textarea
                rows={2}
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white leading-relaxed"
                placeholder="Technologies or patterns you wish to master..."
              />
            </div>

            {/* Technologies to learn */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Technologies I want to learn
              </label>
              <input
                type="text"
                value={technologiesToLearnText}
                onChange={(e) => setTechnologiesToLearnText(e.target.value)}
                placeholder="Comma separated, e.g. Docker, AWS Lambda, EventBridge"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
              />
            </div>

            {/* Interactive Technical skills management */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Technical skills
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {technicalSkills.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold"
                  >
                    <span>{sk}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk)}
                      className="text-slate-400 hover:text-slate-800 cursor-pointer"
                      title="Remove skill"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add skill input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Add a skill"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Action footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="py-2 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>Save profile</span>
                <Check size={14} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE 1: VIEW PROFILE MODE                                                  */
        /* ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (Main Profile) */}
          <div className="lg:col-span-2 space-y-7">
            {/* Card 1: About */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              {/* Header with Title and AI Assisted Badge */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  About
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eef2ff] text-[#4f46e5] border border-[#e0e7ff] text-xs font-semibold tracking-wide shadow-2xs">
                  <Sparkles size={13} className="text-[#4f46e5]" />
                  <span>AI ASSISTED</span>
                </span>
              </div>

              {/* Bio summary paragraph */}
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {profile.summary}
              </p>

              {/* Technical skills */}
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
                  Technical skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.technicalSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-md bg-[#f1f5f9]/80 text-slate-700 border border-slate-200/80 text-xs font-medium shadow-2xs transition-colors hover:bg-slate-100"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Professional interests */}
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
                  Professional interests
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.professionalInterests.map((interest) => (
                    <span
                      key={interest}
                      className="px-2.5 py-1 rounded-md bg-[#f1f5f9]/80 text-slate-700 border border-slate-200/80 text-xs font-medium shadow-2xs transition-colors hover:bg-slate-100"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Previous projects - with generous spacing & clean separation */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Previous projects
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddExpOpen(true)}
                  className="text-xs sm:text-sm font-semibold text-[#4f46e5] hover:text-[#4338ca] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add experience</span>
                </button>
              </div>

              {/* Separated project items with clear dividers and breathing room */}
              <div className="space-y-6">
                {profile.projects.map((proj, idx) => (
                  <div key={proj.id}>
                    {idx > 0 && (
                      <div className="border-t border-slate-100 my-6" />
                    )}
                    <div className="flex items-start gap-4">
                      {/* Initials badge */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          proj.initials === 'TM'
                            ? 'bg-[#ecfdf5] text-[#059669]'
                            : proj.initials === 'RC'
                            ? 'bg-[#eef2ff] text-[#4f46e5]'
                            : 'bg-[#f0f9ff] text-[#0284c7]'
                        }`}
                      >
                        {proj.initials}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-slate-900 leading-snug">
                          {proj.title}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed mt-1 mb-3">
                          {proj.desc}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {proj.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#f1f5f9]/80 text-slate-700 border border-slate-200/80 shadow-2xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Learning goals */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-3">
                Learning goals
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {profile.learningGoals}
              </p>

              <div className="mt-5">
                <h4 className="text-sm font-semibold text-slate-900 mb-2.5">
                  Technologies I want to learn
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.technologiesToLearn.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-md bg-[#f1f5f9]/80 text-slate-700 border border-slate-200/80 text-xs font-medium shadow-2xs"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar Widgets) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Widget 1: At a glance */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 mb-2">
                At a glance
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Preferred role
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.preferredRole}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Weekly availability
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.availabilityHours} hours / week
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Project interests
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.professionalInterests.join(' · ')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Community
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profile.community}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/ai-studio')}
                  className="w-full py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
                >
                  <Sparkles size={13} className="text-indigo-600" />
                  <span>Build with AI</span>
                </button>
              </div>
            </div>

            {/* Widget 2: Certificates & evidence */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 mb-2">
                Certificates & evidence
              </h3>

              {/* Uploaded Certificate Items */}
              <div className="space-y-2">
                {profile.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-3"
                  >
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {cert.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {cert.subtext}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dropzone Upload */}
              <div className="border border-dashed border-slate-200 hover:border-slate-300 rounded-lg p-5 text-center transition-colors bg-white">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 mx-auto mb-2">
                  <UploadCloud size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Upload certificate or CV
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PDF, PNG, JPG
                </p>

                <div className="mt-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-2xs">
                    <span>Choose file</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[11px] text-slate-500 mt-1.5 truncate max-w-xs mx-auto">
                    {uploadedFileName || 'No file chosen'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Project Experience */}
      {isAddExpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Add Project Experience
              </h3>
              <button
                type="button"
                onClick={() => setIsAddExpOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProjectExperience} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Project title
                </label>
                <input
                  type="text"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Scheduler"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  placeholder="What did you build, what was your role, and what were the outcomes?"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tags / Technologies (comma separated)
                </label>
                <input
                  type="text"
                  value={newExpTags}
                  onChange={(e) => setNewExpTags(e.target.value)}
                  placeholder="e.g. Go, Redis, Docker, gRPC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Add Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
