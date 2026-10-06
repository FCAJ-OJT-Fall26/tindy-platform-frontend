import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Sparkles,
  Zap,
  Check,
  UploadCloud,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  FileText
} from 'lucide-react';
import { UserProfile } from '../../data/profileData';

interface AiStudioScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNotify?: (message: string) => void;
}

export default function AiStudioScreen({
  profile,
  onUpdateProfile,
  onNotify,
}: AiStudioScreenProps) {
  const navigate = useNavigate();

  // Left card: AI profile builder
  const [experienceInput, setExperienceInput] = useState(
    "I've built React applications, worked on Campus Connect, and care about sustainability..."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState(
    profile.summary ||
      'Frontend developer and computer science student passionate about building accessible, purposeful digital experiences. Experienced with React, TypeScript, and collaborative projects.'
  );
  const [isPublished, setIsPublished] = useState(false);

  // Right card: Discover your skills
  const [evidenceSource, setEvidenceSource] = useState('Project description / experience');
  const [readmeInput, setReadmeInput] = useState('');
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [skillsAdded, setSkillsAdded] = useState(false);

  // Handle Generate summary
  const handleGenerateSummary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated =
        'Frontend developer and computer science student passionate about building accessible, purposeful digital experiences. Experienced with React, TypeScript, and collaborative projects.';
      setGeneratedSummary(generated);
      setIsGenerating(false);
      setIsPublished(false);
      onNotify?.('AI generated professional summary from your experience notes.');
    }, 600);
  };

  // Handle Publish to profile
  const handlePublishToProfile = () => {
    onUpdateProfile({ summary: generatedSummary });
    setIsPublished(true);
    onNotify?.('Published summary to your profile!');
  };

  // Handle Extract skills
  const handleExtractSkills = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      const skills = [
        'React',
        'TypeScript',
        'Tailwind CSS',
        'Firebase',
        'REST APIs',
        'System Architecture',
        'UI/UX Design',
      ];
      setExtractedSkills(skills);
      setSkillsAdded(false);
      onNotify?.(`Extracted ${skills.length} technical skills from evidence.`);
    }, 700);
  };

  const handleAddSkillsToProfile = () => {
    setSkillsAdded(true);
    onUpdateProfile({
      technicalSkills: Array.from(new Set([...(profile.technicalSkills || []), ...extractedSkills])),
    });
    onNotify?.('Extracted skills appended to your profile matching matrix!');
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFileName(file.name);
      onNotify?.(`Loaded "${file.name}" for skill extraction.`);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-8 pb-16">
      {/* Top Header Tagline Banner */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          A LITTLE CONNECTION. ENDLESS POSSIBILITY.
        </span>
        <h1 className="font-manrope font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          A little help. A lot of potential..
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
          Turn what you've done into a profile that opens doors.
        </p>
      </div>

      {/* Main Two-Column Side-by-Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: AI profile builder */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles size={19} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  AI profile builder
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tell us about your skills, past projects, and interests.
                </p>
              </div>
            </div>

            {/* Field: Your experience */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Your experience
              </label>
              <textarea
                rows={5}
                value={experienceInput}
                onChange={(e) => setExperienceInput(e.target.value)}
                placeholder="I've built React applications, worked on Campus Connect, and care about sustainability..."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-400 transition-colors bg-white resize-none"
              />
            </div>

            {/* Button: Generate summary */}
            <div>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateSummary}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs disabled:opacity-70"
              >
                {isGenerating ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>{isGenerating ? 'Generating summary...' : 'Generate summary'}</span>
              </button>
            </div>

            {/* Field: Review your summary */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Review your summary
              </label>
              <textarea
                rows={4}
                value={generatedSummary}
                onChange={(e) => setGeneratedSummary(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-400 transition-colors bg-white resize-none"
                placeholder="Your generated summary will appear here..."
              />
            </div>
          </div>

          {/* Action: Publish to profile */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePublishToProfile}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors border shadow-2xs ${
                isPublished
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900'
              }`}
            >
              <Check size={14} className={isPublished ? 'text-emerald-600' : 'text-slate-600'} />
              <span>{isPublished ? 'Published to profile' : 'Publish to profile'}</span>
            </button>

            {isPublished && (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="text-xs font-semibold text-slate-600 hover:text-black flex items-center gap-1 transition-colors"
              >
                <span>View profile</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Discover your skills */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap size={19} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Discover your skills
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start with your README, CV, certificate, or project description.
                </p>
              </div>
            </div>

            {/* Field: Evidence source dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Evidence source
              </label>
              <select
                value={evidenceSource}
                onChange={(e) => setEvidenceSource(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition-colors bg-white"
              >
                <option value="Project description / experience">
                  Project description / experience
                </option>
                <option value="GitHub README">GitHub README</option>
                <option value="Curriculum Vitae / Resume">Curriculum Vitae / Resume</option>
                <option value="Course / Certificate Evidence">Course / Certificate Evidence</option>
              </select>
            </div>

            {/* Textarea: Paste description */}
            <div className="space-y-1.5">
              <textarea
                rows={5}
                value={readmeInput}
                onChange={(e) => setReadmeInput(e.target.value)}
                placeholder="Paste your project description or README here.."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-400 transition-colors bg-white resize-none"
              />
            </div>

            {/* Section: Or upload a document */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-indigo-600 block">
                Or upload a document
              </span>
              <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors">
                  <UploadCloud size={13} className="text-slate-500" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-400 truncate flex-1">
                  {documentFileName || 'No file chosen'}
                </span>
              </div>
            </div>

            {/* Button: Extract skills */}
            <div>
              <button
                type="button"
                disabled={isExtracting}
                onClick={handleExtractSkills}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs disabled:opacity-70"
              >
                {isExtracting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                <span>{isExtracting ? 'Analyzing evidence...' : 'Extract skills'}</span>
              </button>
            </div>

            {/* Extracted skills feedback block */}
            {extractedSkills.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Extracted Competencies
                  </span>
                  <span className="text-[10px] text-slate-500">
                    High AI Confidence
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {extractedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1 shadow-2xs"
                    >
                      <Check size={11} className="text-emerald-600" />
                      <span>{sk}</span>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={skillsAdded}
                  onClick={handleAddSkillsToProfile}
                  className={`text-xs font-bold py-1.5 px-3 rounded-lg border flex items-center gap-1.5 transition-colors ${
                    skillsAdded
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <PlusCircle size={13} />
                  <span>{skillsAdded ? 'Skills added to profile' : 'Add skills to profile'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Automated skills parsing uses heuristic model confidence scores.
          </div>
        </div>
      </div>
    </div>
  );
}
