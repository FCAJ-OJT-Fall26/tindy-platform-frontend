import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Bookmark, RotateCcw, ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import { DiscoveryProject, DiscoveryCandidate, DiscoveryMode, SwipeDirection } from '../../types/discovery';
import ProjectCardContent from '../projects/ProjectCardContent';
import CandidateCardContent from '../candidates/CandidateCardContent';
import { SkipActionButton, StarActionButton, InterestedActionButton } from '../common/DiscoveryActionButtons';

interface SwipeCardStackProps {
  items: (DiscoveryProject | DiscoveryCandidate)[];
  mode: DiscoveryMode;
  onSwipe: (item: DiscoveryProject | DiscoveryCandidate, direction: SwipeDirection) => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  live?: boolean;
  onCardTap: (item: DiscoveryProject | DiscoveryCandidate) => void;
  onWhyMatchesClick: (item: DiscoveryProject | DiscoveryCandidate) => void;
  onUndo?: () => void | boolean | Promise<void | boolean>;
  canUndo?: boolean;
  onResetStack?: () => void;
  activeItemChanged?: (item: DiscoveryProject | DiscoveryCandidate | null) => void;
  onCandidateChatClick?: (candidate: DiscoveryCandidate) => void;
}

export default function SwipeCardStack({
  disabled = false,
  live = false,
  items,
  mode,
  onSwipe,
  onCardTap,
  onWhyMatchesClick,
  onUndo,
  canUndo = false,
  onResetStack,
  activeItemChanged,
}: SwipeCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flyDirection, setFlyDirection] = useState<SwipeDirection | null>(null);

  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const swipedOrderRef = useRef<string[]>([]);
  const prevItemsRef = useRef(items);
  const latestItems = useRef(items); latestItems.current = items;
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; } }, []);

  // When filters update `items`, jump to the first unswiped card in the filtered list
  useEffect(() => {
    if (prevItemsRef.current === items) return;
    prevItemsRef.current = items;
    const firstUnswipedIdx = items.findIndex((item) => !swipedIdsRef.current.has(item.id));
    setCurrentIndex(firstUnswipedIdx !== -1 ? firstUnswipedIdx : items.length);
  }, [items]);

  const currentItem = currentIndex < items.length ? items[currentIndex] : null;

  useEffect(() => {
    activeItemChanged?.(currentItem);
  }, [currentItem, activeItemChanged]);

  const executeSwipe = useCallback(
    async (direction: SwipeDirection) => {
      if (!currentItem || flyDirection || disabled || busy.current) return;
      busy.current = true; setPending(true);
      try {
        const accepted = await onSwipe(currentItem, direction);
        if (!mounted.current || accepted === false) return;
        setFlyDirection(direction);
        await new Promise(resolve => setTimeout(resolve, 250));
        if (!mounted.current) return;
        swipedIdsRef.current.add(currentItem.id);
        swipedOrderRef.current.push(currentItem.id);
        const next = latestItems.current.findIndex(item => !swipedIdsRef.current.has(item.id));
        setCurrentIndex(next === -1 ? latestItems.current.length : next);
        setFlyDirection(null);
        setDragOffset({ x: 0, y: 0 });
      } finally {
        busy.current = false;
        if (mounted.current) { setPending(false); setDragOffset({ x: 0, y: 0 }); }
      }
    },
    [currentItem, flyDirection, onSwipe, disabled]
  );

  const undo = useCallback(async () => {
    if (!canUndo || disabled || busy.current) return;
    busy.current = true; setPending(true);
    try {
      if (await onUndo?.() === false || !mounted.current) return;
      const id = swipedOrderRef.current.pop();
      if (id) swipedIdsRef.current.delete(id);
      const index = latestItems.current.findIndex(item => !swipedIdsRef.current.has(item.id));
      setCurrentIndex(index < 0 ? latestItems.current.length : index);
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  }, [canUndo, disabled, onUndo]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentItem || flyDirection || disabled || busy.current || (e.target as HTMLElement).closest('button,a,input,select')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);

    const dx = dragOffset.x;
    const dy = dragOffset.y;
    const totalDist = Math.hypot(dx, dy);

    if (totalDist < 8) {
      onCardTap(currentItem!);
      setDragOffset({ x: 0, y: 0 });
      dragStartRef.current = null;
      return;
    }

    const threshold = 110;
    if (dx > threshold) {
      executeSwipe('right');
    } else if (dx < -threshold) {
      executeSwipe('left');
    } else if (dy < -threshold) {
      executeSwipe('up');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }

    dragStartRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentItem || flyDirection || disabled || busy.current || document.querySelector('[role="dialog"]')) return;
      if ((e.target as HTMLElement)?.closest('input,textarea,select,button,a')) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        executeSwipe('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        executeSwipe('right');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        executeSwipe('up');
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onCardTap(currentItem);
      } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        if (canUndo) {
          e.preventDefault();
          void undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, flyDirection, executeSwipe, onCardTap, canUndo, undo, disabled]);

  if (currentIndex >= items.length) {
    return (
      <div className="w-full max-w-md mx-auto min-h-[420px] sm:min-h-[480px] bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-4 border border-slate-200">
          <RotateCcw size={20} />
        </div>
        <h3 className="font-bold text-lg text-slate-900">
          {mode === 'student' ? 'All Projects Reviewed' : 'All Candidates Reviewed'}
        </h3>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          {mode === 'student'
            ? 'You have reached the end of this feed. Refresh or adjust your filters for more projects.'
            : 'You have evaluated all matching candidates. Reset to review the stack again.'}
        </p>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={() => {
              swipedIdsRef.current.clear();
              swipedOrderRef.current = [];
              setCurrentIndex(0);
              onResetStack?.();
            }}
            className="button primary text-xs py-2 px-4"
          >
            <RotateCcw size={14} />
            <span>{live ? 'Refresh feed' : 'Reset Stack'}</span>
          </button>
          {canUndo && (
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => { void undo(); }}
              className="button outline text-xs py-2 px-3"
            >
              Undo Last Action
            </button>
          )}
        </div>
      </div>
    );
  }

  const visibleItems = items.slice(currentIndex, currentIndex + 2);

  return (
    <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto flex flex-col items-center select-none min-w-0">
      <div className="relative w-full h-[530px] sm:h-[570px] min-h-[500px]">
        {visibleItems.map((item, index) => {
          const isTop = index === 0;
          const offsetStyle = {
            transform: isTop
              ? flyDirection === 'left'
                ? 'translateX(-120%) rotate(-12deg)'
                : flyDirection === 'right'
                ? 'translateX(120%) rotate(12deg)'
                : flyDirection === 'up'
                ? 'translateY(-120%)'
                : isDragging
                ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`
                : 'translate(0px, 0px)'
              : 'translateY(10px) scale(0.98)',
            zIndex: 30 - index,
            opacity: 1,
            transition: isDragging && isTop ? 'none' : 'transform 260ms ease-out',
          };

          return (
            <div
              key={item.id}
              ref={isTop ? cardRef : null}
              style={offsetStyle}
              onPointerDown={isTop ? handlePointerDown : undefined}
              onPointerMove={isTop ? handlePointerMove : undefined}
              onPointerUp={isTop ? handlePointerUp : undefined}
              onPointerCancel={isTop ? handlePointerUp : undefined}
              className={`absolute inset-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md ${
                isTop ? 'cursor-grab active:cursor-grabbing touch-none' : 'pointer-events-none'
              }`}
            >
              {/* Drag feedback banners */}
              {isTop && isDragging && (
                <>
                  {dragOffset.x > 30 && (
                    <div
                      className="absolute top-6 left-6 z-40 bg-emerald-600 text-white font-mono font-extrabold text-sm px-3.5 py-1.5 rounded-lg border border-emerald-700 shadow-md uppercase tracking-wider flex items-center gap-1.5"
                      style={{ opacity: Math.min(1, (dragOffset.x - 30) / 70) }}
                    >
                      <Heart size={16} fill="currentColor" />
                      <span>{mode === 'student' ? 'INTERESTED' : 'SHORTLIST'}</span>
                    </div>
                  )}

                  {dragOffset.x < -30 && (
                    <div
                      className="absolute top-6 right-6 z-40 bg-rose-600 text-white font-mono font-extrabold text-sm px-3.5 py-1.5 rounded-lg border border-rose-700 shadow-md uppercase tracking-wider flex items-center gap-1.5"
                      style={{ opacity: Math.min(1, (-dragOffset.x - 30) / 70) }}
                    >
                      <X size={16} strokeWidth={2.5} />
                      <span>SKIP</span>
                    </div>
                  )}

                  {dragOffset.y < -30 && Math.abs(dragOffset.x) < 40 && (
                    <div
                      className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-sky-600 text-white font-mono font-extrabold text-sm px-3.5 py-1.5 rounded-lg border border-sky-700 shadow-md uppercase tracking-wider flex items-center gap-1.5"
                      style={{ opacity: Math.min(1, (-dragOffset.y - 30) / 60) }}
                    >
                      <Star size={16} fill="currentColor" />
                      <span>SAVE</span>
                    </div>
                  )}
                </>
              )}

              {/* Card content */}
              {mode === 'student' ? (
                <ProjectCardContent
                  project={item as DiscoveryProject}
                  isActive={isTop}
                  onWhyMatchesClick={(e) => {
                    e.stopPropagation();
                    onWhyMatchesClick(item);
                  }}
                  onViewDetailsClick={(e) => {
                    e.stopPropagation();
                    onCardTap(item);
                  }}
                />
              ) : (
                <CandidateCardContent
                  candidate={item as DiscoveryCandidate}
                  isActive={isTop}
                  onWhyMatchesClick={(e) => {
                    e.stopPropagation();
                    onWhyMatchesClick(item);
                  }}
                  onViewDetailsClick={(e) => {
                    e.stopPropagation();
                    onCardTap(item);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Accessible Action Buttons */}
      <div className="w-full mt-4 flex items-center justify-center gap-2 px-1 sm:px-2 min-w-0">
        <button
          type="button"
          disabled={!canUndo || disabled || pending}
          onClick={() => { void undo(); }}
          className={`w-10 h-10 min-h-[40px] shrink-0 rounded-lg border flex items-center justify-center transition-all ${
            canUndo && currentIndex > 0
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
          title="Undo last action"
          aria-label="Undo"
        >
          <RotateCcw size={15} />
        </button>

        <SkipActionButton
          disabled={disabled || pending}
          onClick={() => executeSwipe('left')}
          className="flex-1 min-w-0 max-w-[120px] min-h-[40px] py-2.5 px-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          title="Skip recommendation"
          ariaLabel="Skip"
          iconSize={15}
          strokeWidth={2.5}
        >
          <span className="truncate">Skip</span>
        </SkipActionButton>

        <StarActionButton
          disabled={disabled || pending}
          isActionTrigger
          onToggle={() => executeSwipe('up')}
          className="w-10 h-10 min-h-[40px] shrink-0 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-colors shadow-2xs"
          title="Save for later"
          ariaLabel="Save for later"
          iconSize={16}
        />

        <InterestedActionButton
          disabled={disabled || pending}
          isActionTrigger
          onClick={() => executeSwipe('right')}
          className="flex-1 min-w-[88px] max-w-[140px] min-h-[40px] py-2.5 px-2 rounded-lg border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          title={live ? 'Apply to a position' : mode === 'student' ? 'Mark Interested' : 'Shortlist Candidate'}
          ariaLabel={live ? 'Apply' : mode === 'student' ? 'Interested' : 'Shortlist'}
          iconSize={15}
        >
          <span className="truncate">{live ? 'Apply' : mode === 'student' ? 'Interested' : 'Shortlist'}</span>
        </InterestedActionButton>
      </div>

      {/* Keyboard Controls Note */}
      <div className="mt-3 text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1 text-rose-600 font-semibold">
          <X size={12} strokeWidth={2.5} className="text-rose-600" /> Skip (←)
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-sky-700 font-semibold">
          <Star size={12} className="text-sky-500 fill-sky-500" /> Save (↑)
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <Heart size={12} className="text-emerald-600 fill-emerald-600" /> {live ? 'Apply' : mode === 'student' ? 'Interested' : 'Shortlist'} (→)
        </span>
      </div>
    </div>
  );
}
