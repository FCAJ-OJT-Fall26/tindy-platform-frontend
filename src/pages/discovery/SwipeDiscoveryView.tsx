import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DiscoveryProject, DiscoveryCandidate, DiscoveryMode, SwipeDirection, SwipeHistoryEntry } from '../../types/discovery';
import { INITIAL_PROJECTS, INITIAL_CANDIDATES } from '../../data/mockData';
import SwipeCardStack from '../../components/discovery/SwipeCardStack';
import DiscoveryFilters from '../../components/discovery/DiscoveryFilters';
import LiveAiInspector from '../../components/discovery/LiveAiInspector';
import ProjectDetailModal from '../../components/projects/ProjectDetailModal';
import CandidateDetailModal from '../../components/candidates/CandidateDetailModal';
import CandidateShortlistModal from '../../components/candidates/CandidateShortlistModal';
import AiExplanationModal from '../../components/common/AiExplanationModal';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useTindy } from '../../store';

interface SwipeDiscoveryViewProps {
  initialMode?: DiscoveryMode;
  onNavigateToMessages?: (recipientName?: string) => void;
  onNotify?: (message: string) => void;
}

export default function SwipeDiscoveryView({
  initialMode = 'student',
  onNavigateToMessages,
  onNotify,
}: SwipeDiscoveryViewProps) {
  const navigate = useNavigate();
  let tindyNotify: ((msg: string) => void) | undefined;
  try {
    const tindy = useTindy();
    tindyNotify = tindy.notify;
  } catch {}
  // Discovery Perspective Mode
  const [mode, setMode] = useState<DiscoveryMode>(initialMode);

  // Data collections
  const [projects, setProjects] = useState<DiscoveryProject[]>(INITIAL_PROJECTS);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>(INITIAL_CANDIDATES);

  // User decision collections
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(['proj-2']);
  const [interestedProjectIds, setInterestedProjectIds] = useState<string[]>([]);
  const [savedCandidateIds, setSavedCandidateIds] = useState<string[]>([]);
  const [shortlistedCandidateIds, setShortlistedCandidateIds] = useState<string[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [stackResetKey, setStackResetKey] = useState<number>(0);

  // Undo history
  const [history, setHistory] = useState<SwipeHistoryEntry[]>([]);

  // Filter states
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [minScore, setMinScore] = useState<number>(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Currently active card in stack for Live AI Inspector
  const [activeItem, setActiveItem] = useState<DiscoveryProject | DiscoveryCandidate | null>(null);

  // Modals state
  const [projectDetailModalItem, setProjectDetailModalItem] = useState<DiscoveryProject | null>(null);
  const [candidateDetailModalItem, setCandidateDetailModalItem] = useState<DiscoveryCandidate | null>(null);
  const [shortlistModalCandidate, setShortlistModalCandidate] = useState<DiscoveryCandidate | null>(null);
  const [aiModalItem, setAiModalItem] = useState<DiscoveryProject | DiscoveryCandidate | null>(null);

  const showToast = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    } else if (tindyNotify) {
      tindyNotify(msg);
    }
  };

  // Filter lists based on mode and filters
  const availableRoles = useMemo(() => {
    if (mode === 'student') {
      return Array.from(new Set(projects.map((p) => p.role)));
    }
    return Array.from(new Set(candidates.map((c) => c.preferredRole)));
  }, [mode, projects, candidates]);

  const availableSkills = useMemo(() => {
    if (mode === 'student') {
      const skills = new Set<string>();
      projects.forEach((p) => p.skills.forEach((s) => skills.add(s)));
      return Array.from(skills);
    }
    const skills = new Set<string>();
    candidates.forEach((c) => c.skills.forEach((s) => skills.add(s)));
    return Array.from(skills);
  }, [mode, projects, candidates]);

  // Filter items (note: swipe progress is stepped via stack index, avoiding double-skip)
  const filteredItems = useMemo(() => {
    if (mode === 'student') {
      return projects.filter((p) => {
        if (p.match.overall < minScore) return false;
        if (selectedRole !== 'All' && p.role !== selectedRole) return false;
        if (selectedSkill !== 'All' && !p.skills.includes(selectedSkill)) return false;
        return true;
      });
    } else {
      return candidates.filter((c) => {
        if (c.match.overall < minScore) return false;
        if (selectedRole !== 'All' && c.preferredRole !== selectedRole) return false;
        if (selectedSkill !== 'All' && !c.skills.includes(selectedSkill)) return false;
        return true;
      });
    }
  }, [mode, projects, candidates, minScore, selectedRole, selectedSkill]);

  // Session Statistics
  const sessionStats = {
    reviewed: history.length,
    interested: mode === 'student' ? interestedProjectIds.length : shortlistedCandidateIds.length,
    saved: mode === 'student' ? savedProjectIds.length : savedCandidateIds.length,
    skipped: history.filter((h) => h.direction === 'left').length,
  };

  // Handle Swipe logic
  const handleSwipe = (item: DiscoveryProject | DiscoveryCandidate, direction: SwipeDirection) => {
    setHistory((prev) => [{ id: item.id, direction, item, timestamp: Date.now() }, ...prev]);

    if (direction === 'left') {
      setSkippedIds((prev) => [...prev, item.id]);
      showToast(`Skipped "${item.name}".`);
    } else if (direction === 'up') {
      if (mode === 'student') {
        setSavedProjectIds((prev) => [...new Set([...prev, item.id])]);
        showToast(`Saved "${item.name}" for later.`);
      } else {
        setSavedCandidateIds((prev) => [...new Set([...prev, item.id])]);
        showToast(`Saved candidate ${item.name} for later.`);
      }
    } else if (direction === 'right') {
      if (mode === 'student') {
        setInterestedProjectIds((prev) => [...new Set([...prev, item.id])]);
        showToast(`Marked interest in "${item.name}". Project lead notified!`);
      } else {
        setShortlistModalCandidate(item as DiscoveryCandidate);
      }
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0) return;
    const [lastAction, ...remaining] = history;
    setHistory(remaining);

    if (lastAction.direction === 'left') {
      setSkippedIds((prev) => prev.filter((id) => id !== lastAction.id));
      showToast(`Restored "${lastAction.item.name}" to stack.`);
    } else if (lastAction.direction === 'up') {
      if (mode === 'student') {
        setSavedProjectIds((prev) => prev.filter((id) => id !== lastAction.id));
      } else {
        setSavedCandidateIds((prev) => prev.filter((id) => id !== lastAction.id));
      }
      showToast(`Removed "${lastAction.item.name}" from saved.`);
    } else if (lastAction.direction === 'right') {
      if (mode === 'student') {
        setInterestedProjectIds((prev) => prev.filter((id) => id !== lastAction.id));
      } else {
        setShortlistedCandidateIds((prev) => prev.filter((id) => id !== lastAction.id));
      }
      showToast(`Removed "${lastAction.item.name}" from shortlist.`);
    }
  };

  // Reset current stack
  const handleResetStack = () => {
    setSkippedIds([]);
    setHistory([]);
    setStackResetKey((prev) => prev + 1);
    showToast('Reset current discovery stack.');
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedRole('All');
    setSelectedSkill('All');
    setMinScore(0);
    setStackResetKey((prev) => prev + 1);
    showToast('Reset all filters to default.');
  };

  // Save / Bookmark toggle
  const handleToggleSave = (id: string) => {
    if (mode === 'student') {
      setSavedProjectIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
      showToast(savedProjectIds.includes(id) ? 'Removed from saved' : 'Saved project');
    } else {
      setSavedCandidateIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
      showToast(savedCandidateIds.includes(id) ? 'Removed candidate' : 'Saved candidate');
    }
  };

  // Handle tap card to view full detail
  const handleCardTap = (item: DiscoveryProject | DiscoveryCandidate) => {
    if (mode === 'student') {
      setProjectDetailModalItem(item as DiscoveryProject);
    } else {
      setCandidateDetailModalItem(item as DiscoveryCandidate);
    }
  };

  // Handle why matches click
  const handleWhyMatches = (item: DiscoveryProject | DiscoveryCandidate) => {
    setAiModalItem(item);
  };

  return (
    <div className="w-full flex flex-col space-y-6 pb-16">
      {/* Page Title & Two-Sided Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Interactive Matching Stack
            </span>
          </div>
          <h1 className="font-manrope font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight mt-1.5">
            {mode === 'student' ? 'Discover Projects That Fit You' : 'Discover Candidates for Your Team'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            {mode === 'student'
              ? 'Swipe right on projects you want to contribute to, left to pass, or up to save for later.'
              : 'Review verified student candidates tailored to your project requirements with explainable AI fit scores.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('student')}
            className={`py-2 px-3.5 rounded-md text-xs font-bold transition-all ${
              mode === 'student'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-black'
            }`}
          >
            Student Mode
          </button>

          <button
            type="button"
            onClick={() => setMode('leader')}
            className={`py-2 px-3.5 rounded-md text-xs font-bold transition-all ${
              mode === 'leader'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-black'
            }`}
          >
            Leader Mode
          </button>
        </div>
      </div>

      {/* Mobile Filters Accordion Button */}
      <div className="lg:hidden w-full">
        <button
          type="button"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer transition-colors hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-500" />
            <span>Filters & Score Threshold</span>
            {minScore > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold">
                ≥{minScore}%
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${
              mobileFilterOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {mobileFilterOpen && (
          <div className="mt-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <DiscoveryFilters
              mode={mode}
              onModeChange={setMode}
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              selectedSkill={selectedSkill}
              onSkillChange={setSelectedSkill}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              sessionStats={sessionStats}
              onResetFilters={handleResetFilters}
              availableRoles={availableRoles}
              availableSkills={availableSkills}
            />
          </div>
        )}
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filters */}
        <div className="hidden lg:block lg:col-span-3">
          <DiscoveryFilters
            mode={mode}
            onModeChange={setMode}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
            selectedSkill={selectedSkill}
            onSkillChange={setSelectedSkill}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            sessionStats={sessionStats}
            onResetFilters={handleResetFilters}
            availableRoles={availableRoles}
            availableSkills={availableSkills}
          />
        </div>

        {/* Center Column: Interactive Card Stack */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <SwipeCardStack
            key={`${mode}-${selectedRole}-${selectedSkill}-${minScore}-${stackResetKey}`}
            items={filteredItems}
            mode={mode}
            onSwipe={handleSwipe}
            onCardTap={handleCardTap}
            onWhyMatchesClick={handleWhyMatches}
            onUndo={handleUndo}
            canUndo={history.length > 0}
            onResetStack={handleResetStack}
            activeItemChanged={setActiveItem}
            onCandidateChatClick={(candidate) => {
              setShortlistModalCandidate(candidate);
            }}
          />
        </div>

        {/* Right Column: Live AI Heuristic Inspector */}
        <div className="hidden lg:block lg:col-span-3">
          <LiveAiInspector
            item={activeItem || filteredItems[0] || null}
            mode={mode}
            onOpenFullDetail={() => {
              const current = activeItem || filteredItems[0];
              if (current) handleCardTap(current);
            }}
            onOpenAiModal={() => {
              const current = activeItem || filteredItems[0];
              if (current) handleWhyMatches(current);
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <ProjectDetailModal
        project={projectDetailModalItem}
        isOpen={Boolean(projectDetailModalItem)}
        isSaved={Boolean(projectDetailModalItem && savedProjectIds.includes(projectDetailModalItem.id))}
        isInterested={Boolean(projectDetailModalItem && interestedProjectIds.includes(projectDetailModalItem.id))}
        onClose={() => setProjectDetailModalItem(null)}
        onToggleSave={handleToggleSave}
        onMarkInterested={(id) => {
          setInterestedProjectIds((prev) => [...new Set([...prev, id])]);
          showToast('Interest recorded! Lead has been notified.');
        }}
        onOpenAiBreakdown={() => {
          if (projectDetailModalItem) {
            setAiModalItem(projectDetailModalItem);
          }
        }}
      />

      <CandidateDetailModal
        candidate={candidateDetailModalItem}
        isOpen={Boolean(candidateDetailModalItem)}
        isSaved={Boolean(candidateDetailModalItem && savedCandidateIds.includes(candidateDetailModalItem.id))}
        isShortlisted={Boolean(candidateDetailModalItem && shortlistedCandidateIds.includes(candidateDetailModalItem.id))}
        onClose={() => setCandidateDetailModalItem(null)}
        onToggleSave={handleToggleSave}
        onShortlistCandidate={(cand) => {
          setShortlistModalCandidate(cand);
        }}
        onOpenAiBreakdown={() => {
          if (candidateDetailModalItem) {
            setAiModalItem(candidateDetailModalItem);
          }
        }}
      />

      <CandidateShortlistModal
        isOpen={Boolean(shortlistModalCandidate)}
        candidate={shortlistModalCandidate}
        projectName="EcoTrack"
        onClose={() => setShortlistModalCandidate(null)}
        onConfirmShortlist={() => {
          if (shortlistModalCandidate) {
            setShortlistedCandidateIds((prev) => [...new Set([...prev, shortlistModalCandidate.id])]);
            showToast(`Candidate ${shortlistModalCandidate.name} added to shortlist.`);
          }
        }}
        onInviteToChat={(msg) => {
          if (shortlistModalCandidate) {
            setShortlistedCandidateIds((prev) => [...new Set([...prev, shortlistModalCandidate.id])]);
            showToast(`Direct invite dispatched to ${shortlistModalCandidate.name}!`);
            if (onNavigateToMessages) {
              onNavigateToMessages(shortlistModalCandidate.name);
            } else {
              navigate('/messages');
            }
          }
        }}
      />

      <AiExplanationModal
        isOpen={Boolean(aiModalItem)}
        onClose={() => setAiModalItem(null)}
        title={aiModalItem?.name || ''}
        subtitle={
          aiModalItem
            ? 'role' in aiModalItem
              ? (aiModalItem as DiscoveryProject).category
              : (aiModalItem as DiscoveryCandidate).university
            : ''
        }
        match={
          aiModalItem?.match || {
            overall: 80,
            verdict: 'Good Match',
            factors: [],
            strongMatches: [],
            skillGaps: [],
            explanationSummary: '',
            strengths: [],
            gaps: [],
            dimensions: [],
          }
        }
        role={
          aiModalItem
            ? 'role' in aiModalItem
              ? (aiModalItem as DiscoveryProject).role
              : (aiModalItem as DiscoveryCandidate).preferredRole
            : ''
        }
      />
    </div>
  );
}
