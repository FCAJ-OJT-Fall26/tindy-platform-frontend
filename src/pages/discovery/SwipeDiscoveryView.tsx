import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DiscoveryProject, DiscoveryCandidate, DiscoveryMode, SwipeDirection, SwipeHistoryEntry } from '../../types/discovery';
import { INITIAL_PROJECTS, INITIAL_CANDIDATES } from '../../data/mockData';
import SwipeCardStack from '../../components/discovery/SwipeCardStack';
import DiscoveryFilters from '../../components/discovery/DiscoveryFilters';
import DiscoverySegmentedControl from '../../components/discovery/DiscoverySegmentedControl';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const tindy = useTindy();
  const tindyNotify = tindy.notify;

  // Determine starting mode based on URL search query if provided, or fallback to initialMode
  const getInitialMode = (): DiscoveryMode => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'teammates' || modeParam === 'candidates' || modeParam === 'leader') {
      return 'leader';
    }
    if (modeParam === 'projects' || modeParam === 'student') {
      return 'student';
    }
    return initialMode;
  };

  // mode: Active selection for segmented controls (switches immediately)
  // displayMode: Content currently mounted in cards, filters, and inspector
  const [mode, setMode] = useState<DiscoveryMode>(getInitialMode);
  const [displayMode, setDisplayMode] = useState<DiscoveryMode>(getInitialMode);

  // Transition coordinator state
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionDirection, setTransitionDirection] = useState<'to-leader' | 'to-student'>('to-leader');

  const modeRef = useRef<DiscoveryMode>(mode);
  modeRef.current = mode;

  const displayModeRef = useRef<DiscoveryMode>(displayMode);
  displayModeRef.current = displayMode;

  const transitionStateRef = useRef<'idle' | 'exiting' | 'entering'>(transitionState);
  transitionStateRef.current = transitionState;

  const lastUrlModeRef = useRef<string | null>(searchParams.get('mode'));

  const exitTimerRef = useRef<number | null>(null);
  const enterRafRef = useRef<number | null>(null);

  const clearTransitionTimers = useCallback(() => {
    if (exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (enterRafRef.current !== null) {
      cancelAnimationFrame(enterRafRef.current);
      enterRafRef.current = null;
    }
  }, []);

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

  // Filter states - preserved per perspective mode
  const [studentRole, setStudentRole] = useState<string>('All');
  const [studentSkill, setStudentSkill] = useState<string>('All');
  const [leaderRole, setLeaderRole] = useState<string>('All');
  const [leaderSkill, setLeaderSkill] = useState<string>('All');

  const selectedRole = displayMode === 'student' ? studentRole : leaderRole;
  const selectedSkill = displayMode === 'student' ? studentSkill : leaderSkill;

  const handleRoleChange = (role: string) => {
    if (displayMode === 'student') {
      setStudentRole(role);
    } else {
      setLeaderRole(role);
    }
  };

  const handleSkillChange = (skill: string) => {
    if (displayMode === 'student') {
      setStudentSkill(skill);
    } else {
      setLeaderSkill(skill);
    }
  };

  const [minScore, setMinScore] = useState<number>(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState<boolean>(false);

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

  // Coordinated mode transition handler
  const handleModeSwitch = useCallback((targetMode: DiscoveryMode, updateUrl = true) => {
    // 1. Ignore any click on the already-selected mode, even while a transition is in progress
    if (targetMode === modeRef.current) return;

    // Clear active timers/rAF to avoid overlapping transitions on rapid clicks
    clearTransitionTimers();

    // Update segmented control selection immediately
    setMode(targetMode);
    modeRef.current = targetMode;

    // Synchronize URL search params safely
    if (updateUrl) {
      const urlValue = targetMode === 'student' ? 'projects' : 'teammates';
      lastUrlModeRef.current = urlValue;
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set('mode', urlValue);
        return updated;
      }, { replace: true });
    }

    // 2. Changed mind while exiting: if targetMode matches the currently mounted displayMode,
    // smoothly transition back to idle from the current intermediate opacity/transform
    // without swapping content or remounting SwipeCardStack.
    if (targetMode === displayModeRef.current) {
      setTransitionState('idle');
      transitionStateRef.current = 'idle';
      return;
    }

    const dir: 'to-leader' | 'to-student' = targetMode === 'leader' ? 'to-leader' : 'to-student';
    setTransitionDirection(dir);
    setTransitionState('exiting');
    transitionStateRef.current = 'exiting';

    // 3. Outgoing content fades and shifts out (170ms) from current visual state
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      const finalMode = modeRef.current;

      // 4. Only swap content and remount card stack if mode actually differs after fade-out
      if (finalMode === displayModeRef.current) {
        setTransitionState('idle');
        transitionStateRef.current = 'idle';
        return;
      }

      const finalDir: 'to-leader' | 'to-student' = finalMode === 'leader' ? 'to-leader' : 'to-student';
      displayModeRef.current = finalMode;
      setDisplayMode(finalMode);
      setActiveItem(null);
      setTransitionDirection(finalDir);
      setTransitionState('entering');
      transitionStateRef.current = 'entering';

      // Place incoming content at pre-enter offset for 1 painted frame, then transition to idle
      enterRafRef.current = window.requestAnimationFrame(() => {
        enterRafRef.current = window.requestAnimationFrame(() => {
          enterRafRef.current = null;
          setTransitionState('idle');
          transitionStateRef.current = 'idle';
        });
      });
    }, 170);
  }, [clearTransitionTimers, setSearchParams]);

  // Synchronize browser back/forward navigation safely without feedback loops
  useEffect(() => {
    const currentParam = searchParams.get('mode');
    if (currentParam !== lastUrlModeRef.current) {
      lastUrlModeRef.current = currentParam;
      if (currentParam) {
        const parsedMode: DiscoveryMode =
          currentParam === 'teammates' || currentParam === 'candidates' || currentParam === 'leader'
            ? 'leader'
            : 'student';
        if (parsedMode !== modeRef.current) {
          handleModeSwitch(parsedMode, false);
        }
      } else {
        // If query param removed (e.g. back to /discover), default to student
        if (modeRef.current !== 'student') {
          handleModeSwitch('student', false);
        }
      }
    }
  }, [searchParams, handleModeSwitch]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, [clearTransitionTimers]);

  // Compute transition CSS class for coordinated center and inspector zones
  const getTransitionClass = () => {
    if (transitionState === 'exiting') {
      return transitionDirection === 'to-leader'
        ? 'discovery-sync-exit-left'
        : 'discovery-sync-exit-right';
    }
    if (transitionState === 'entering') {
      return transitionDirection === 'to-leader'
        ? 'discovery-sync-enter-right'
        : 'discovery-sync-enter-left';
    }
    return 'discovery-sync-idle';
  };

  // Filter lists based on display mode
  const availableRoles = useMemo(() => {
    if (displayMode === 'student') {
      return Array.from(new Set(projects.map((p) => p.role)));
    }
    return Array.from(new Set(candidates.map((c) => c.preferredRole)));
  }, [displayMode, projects, candidates]);

  const availableSkills = useMemo(() => {
    if (displayMode === 'student') {
      const skills = new Set<string>();
      projects.forEach((p) => p.skills.forEach((s) => skills.add(s)));
      return Array.from(skills);
    }
    const skills = new Set<string>();
    candidates.forEach((c) => c.skills.forEach((s) => skills.add(s)));
    return Array.from(skills);
  }, [displayMode, projects, candidates]);

  // Filter items based on active displayMode and filters
  const filteredItems = useMemo(() => {
    if (displayMode === 'student') {
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
  }, [displayMode, projects, candidates, minScore, selectedRole, selectedSkill]);

  const firstFilteredItemRef = useRef<DiscoveryProject | DiscoveryCandidate | null>(null);
  firstFilteredItemRef.current = filteredItems[0] || null;

  const handleActiveItemChanged = useCallback((item: DiscoveryProject | DiscoveryCandidate | null) => {
    setActiveItem((prev) => {
      if (prev === null && item === firstFilteredItemRef.current) return prev;
      return prev === item ? prev : item;
    });
  }, []);

  // Session Statistics
  const sessionStats = {
    reviewed: history.length,
    interested: displayMode === 'student' ? interestedProjectIds.length : shortlistedCandidateIds.length,
    saved: displayMode === 'student' ? savedProjectIds.length : savedCandidateIds.length,
    skipped: history.filter((h) => h.direction === 'left').length,
  };

  // Handle Swipe logic
  const handleSwipe = (item: DiscoveryProject | DiscoveryCandidate, direction: SwipeDirection) => {
    setHistory((prev) => [{ id: item.id, direction, item, timestamp: Date.now() }, ...prev]);

    if (direction === 'left') {
      setSkippedIds((prev) => [...prev, item.id]);
      tindy.setSkipped((prev) => [...new Set([...prev, item.id])]);
      showToast(`Skipped "${item.name}".`);
    } else if (direction === 'up') {
      if (displayMode === 'student') {
        setSavedProjectIds((prev) => [...new Set([...prev, item.id])]);
        tindy.setSaved((prev) => [...new Set([...prev, item.id])]);
        showToast(`Saved "${item.name}" for later.`);
      } else {
        setSavedCandidateIds((prev) => [...new Set([...prev, item.id])]);
        tindy.setCandidateShortlisted((prev) => [...new Set([...prev, item.name])]);
        showToast(`Saved candidate ${item.name} for later.`);
      }
    } else if (direction === 'right') {
      if (displayMode === 'student') {
        setInterestedProjectIds((prev) => [...new Set([...prev, item.id])]);
        tindy.setInterested((prev) => [...new Set([...prev, item.id])]);
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
      tindy.setSkipped((prev) => prev.filter((id) => id !== lastAction.id));
      showToast(`Restored "${lastAction.item.name}" to stack.`);
    } else if (lastAction.direction === 'up') {
      if (displayMode === 'student') {
        setSavedProjectIds((prev) => prev.filter((id) => id !== lastAction.id));
        tindy.setSaved((prev) => prev.filter((id) => id !== lastAction.id));
      } else {
        setSavedCandidateIds((prev) => prev.filter((id) => id !== lastAction.id));
        tindy.setCandidateShortlisted((prev) => prev.filter((name) => name !== lastAction.item.name));
      }
      showToast(`Removed "${lastAction.item.name}" from saved.`);
    } else if (lastAction.direction === 'right') {
      if (displayMode === 'student') {
        setInterestedProjectIds((prev) => prev.filter((id) => id !== lastAction.id));
        tindy.setInterested((prev) => prev.filter((id) => id !== lastAction.id));
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
    if (displayMode === 'student') {
      setStudentRole('All');
      setStudentSkill('All');
    } else {
      setLeaderRole('All');
      setLeaderSkill('All');
    }
    setMinScore(0);
    showToast('Reset all filters to default.');
  };

  // Save / Bookmark toggle
  const handleToggleSave = (id: string) => {
    if (displayMode === 'student') {
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
    if (displayMode === 'student') {
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
    <div className="w-full min-w-0 flex flex-col space-y-6 pb-16">
      {/* Page Title & Two-Sided Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs min-w-0">
        <div className={`min-w-0 discovery-header-fade ${transitionState === 'exiting' ? 'opacity-40' : 'opacity-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Interactive Matching Stack
            </span>
          </div>
          <h1 className="font-manrope font-extrabold text-xl sm:text-2xl lg:text-3xl text-slate-900 tracking-tight mt-1.5 transition-colors break-words">
            {displayMode === 'student' ? 'Discover Projects That Fit You' : 'Discover Candidates for Your Team'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            {displayMode === 'student'
              ? 'Swipe right on projects you want to contribute to, left to pass, or up to save for later.'
              : 'Review verified candidate profiles tailored to your project requirements with explainable AI fit scores.'}
          </p>
        </div>

        {/* Coordinated Mode Switcher Segmented Control */}
        <DiscoverySegmentedControl
          value={mode}
          onChange={handleModeSwitch}
          size="default"
          options={[
            { value: 'student', label: 'Find Projects' },
            { value: 'leader', label: 'Find Teammates' },
          ]}
          ariaLabel="Discovery Mode Switcher"
          className="self-start md:self-auto shrink-0 max-w-full"
        />
      </div>

      {/* Mobile Collapsible Matching Perspective & Filters Panel (< 1024px) */}
      <div className="lg:hidden w-full min-w-0">
        <button
          type="button"
          onClick={() => setMobileFilterOpen((prev) => !prev)}
          aria-expanded={mobileFilterOpen}
          aria-controls="mobile-matching-perspective-panel"
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer transition-colors hover:bg-slate-50"
        >
          <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <SlidersHorizontal size={14} className="text-slate-500 shrink-0" />
            <span className="truncate font-bold text-slate-900">Matching Perspective & Filters</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-800 border border-slate-200 font-bold shrink-0">
              {mode === 'student' ? 'Projects' : 'Teammates'}
            </span>
            {selectedRole !== 'All' && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium truncate max-w-[120px]">
                {selectedRole}
              </span>
            )}
            {selectedSkill !== 'All' && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium truncate max-w-[110px]">
                {selectedSkill}
              </span>
            )}
            {minScore > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold shrink-0">
                ≥{minScore}%
              </span>
            )}
            {(selectedRole !== 'All' || selectedSkill !== 'All') && (
              <span className="sm:hidden px-1.5 py-0.5 rounded-full text-[10px] bg-slate-900 text-white font-mono font-bold shrink-0">
                {(selectedRole !== 'All' ? 1 : 0) + (selectedSkill !== 'All' ? 1 : 0)}
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 shrink-0 transition-transform duration-200 ${
              mobileFilterOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div
          id="mobile-matching-perspective-panel"
          aria-hidden={!mobileFilterOpen}
          className={`discovery-collapsible-grid ${mobileFilterOpen ? 'is-open' : ''}`}
        >
          <div className="discovery-collapsible-inner" inert={!mobileFilterOpen ? true : undefined}>
            <DiscoveryFilters
              mode={mode}
              onModeChange={handleModeSwitch}
              selectedRole={selectedRole}
              onRoleChange={handleRoleChange}
              selectedSkill={selectedSkill}
              onSkillChange={handleSkillChange}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              sessionStats={sessionStats}
              onResetFilters={handleResetFilters}
              availableRoles={availableRoles}
              availableSkills={availableSkills}
            />
          </div>
        </div>
      </div>

      {/* Main Responsive Discovery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* Left Column: Stable Filters Panel */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 min-w-0">
          <DiscoveryFilters
            mode={mode}
            onModeChange={handleModeSwitch}
            selectedRole={selectedRole}
            onRoleChange={handleRoleChange}
            selectedSkill={selectedSkill}
            onSkillChange={handleSkillChange}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            sessionStats={sessionStats}
            onResetFilters={handleResetFilters}
            availableRoles={availableRoles}
            availableSkills={availableSkills}
          />
        </div>

        {/* Center Column: Interactive Discovery Card Stack */}
        <div className="lg:col-span-8 xl:col-span-6 flex flex-col items-center min-w-0 w-full">
          <div className={`w-full flex flex-col items-center min-w-0 ${getTransitionClass()}`}>
            <SwipeCardStack
              key={`${displayMode}-${stackResetKey}`}
              items={filteredItems}
              mode={displayMode}
              onSwipe={handleSwipe}
              onCardTap={handleCardTap}
              onWhyMatchesClick={handleWhyMatches}
              onUndo={handleUndo}
              canUndo={history.length > 0}
              onResetStack={handleResetStack}
              activeItemChanged={handleActiveItemChanged}
              onCandidateChatClick={(candidate) => {
                setShortlistModalCandidate(candidate);
              }}
            />
          </div>
        </div>

        {/* Mobile / Tablet Portrait Collapsible Match Inspector (< 1024px) */}
        <div className="lg:hidden w-full min-w-0">
          <button
            type="button"
            onClick={() => setMobileInspectorOpen((prev) => !prev)}
            aria-expanded={mobileInspectorOpen}
            aria-controls="mobile-match-inspector-panel"
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                Match Inspector
              </span>
              <span className="truncate text-slate-600">
                {(activeItem || filteredItems[0])
                  ? `${(activeItem || filteredItems[0]).name} · ${(activeItem || filteredItems[0]).match.overall}% Fit`
                  : 'Live Algorithmic Evaluation'}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                mobileInspectorOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            id="mobile-match-inspector-panel"
            aria-hidden={!mobileInspectorOpen}
            className={`discovery-collapsible-grid ${mobileInspectorOpen ? 'is-open' : ''}`}
          >
            <div
              className={`discovery-collapsible-inner w-full min-w-0 ${getTransitionClass()}`}
              inert={!mobileInspectorOpen ? true : undefined}
            >
              <LiveAiInspector
                item={activeItem || filteredItems[0] || null}
                mode={displayMode}
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
        </div>

        {/* Right / Bottom Column: Live AI Algorithmic Inspector (lg: docked full-width below 2-col row, xl: 3-col right rail) */}
        <div className="hidden lg:block lg:col-span-12 xl:col-span-3 min-w-0 w-full">
          <div className={`w-full min-w-0 ${getTransitionClass()}`}>
            <LiveAiInspector
              item={activeItem || filteredItems[0] || null}
              mode={displayMode}
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
