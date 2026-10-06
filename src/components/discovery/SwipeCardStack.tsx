import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Bookmark, RotateCcw, ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import { DiscoveryProject, DiscoveryCandidate, DiscoveryMode, SwipeDirection } from '../../types/discovery';
import ProjectCardContent from '../projects/ProjectCardContent';
import CandidateCardContent from '../candidates/CandidateCardContent';

interface SwipeCardStackProps {
  items: (DiscoveryProject | DiscoveryCandidate)[];
  mode: DiscoveryMode;
  onSwipe: (item: DiscoveryProject | DiscoveryCandidate, direction: SwipeDirection) => void;
  onCardTap: (item: DiscoveryProject | DiscoveryCandidate) => void;
  onWhyMatchesClick: (item: DiscoveryProject | DiscoveryCandidate) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onResetStack?: () => void;
  activeItemChanged?: (item: DiscoveryProject | DiscoveryCandidate | null) => void;
  onCandidateChatClick?: (candidate: DiscoveryCandidate) => void;
}

export default function SwipeCardStack({
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

  const currentItem = currentIndex < items.length ? items[currentIndex] : null;

  useEffect(() => {
    activeItemChanged?.(currentItem);
  }, [currentItem, activeItemChanged]);

  const executeSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!currentItem || flyDirection) return;

      setFlyDirection(direction);

      setTimeout(() => {
        onSwipe(currentItem, direction);
        setCurrentIndex((prev) => prev + 1);
        setFlyDirection(null);
        setDragOffset({ x: 0, y: 0 });
      }, 250);
    },
    [currentItem, flyDirection, onSwipe]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentItem || flyDirection) return;
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
      if (!currentItem || flyDirection) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
          onUndo?.();
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, flyDirection, executeSwipe, onCardTap, canUndo, onUndo]);

  if (currentIndex >= items.length) {
    return (
      <div className="w-full max-w-md mx-auto aspect-3/4 min-h-[480px] bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-4 border border-slate-200">
          <RotateCcw size={20} />
        </div>
        <h3 className="font-bold text-lg text-slate-900">
          {mode === 'student' ? 'All Projects Reviewed' : 'All Candidates Reviewed'}
        </h3>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          {mode === 'student'
            ? 'You have reviewed all available project recommendations. Adjust your filter criteria or reset the stack.'
            : 'You have evaluated all matching candidates. Reset to review the stack again.'}
        </p>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              onResetStack?.();
            }}
            className="button primary text-xs py-2 px-4"
          >
            <RotateCcw size={14} />
            <span>Reset Stack</span>
          </button>
          {canUndo && (
            <button
              type="button"
              onClick={() => {
                onUndo?.();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              className="button outline text-xs py-2 px-3"
            >
              Undo Last Action
            </button>
          )}
        </div>
      </div>
    );
  }

  const visibleItems = items.slice(currentIndex, currentIndex + 3);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center select-none">
      <div className="relative w-full aspect-3/4 min-h-[500px]">
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
              : index === 1
              ? 'translateY(12px) scale(0.97)'
              : 'translateY(22px) scale(0.94)',
            zIndex: 30 - index,
            opacity: index === 2 ? 0.75 : index === 1 ? 0.9 : 1,
            transition: isDragging && isTop ? 'none' : 'transform 260ms ease-out, opacity 260ms ease-out',
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
      <div className="w-full mt-4 flex items-center justify-center gap-3 sm:gap-4 px-2">
        <button
          type="button"
          disabled={!canUndo || currentIndex === 0}
          onClick={() => {
            onUndo?.();
            setCurrentIndex((prev) => Math.max(0, prev - 1));
          }}
          className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
            canUndo && currentIndex > 0
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
          title="Undo last action"
          aria-label="Undo"
        >
          <RotateCcw size={15} />
        </button>

        <button
          type="button"
          onClick={() => executeSwipe('left')}
          className="flex-1 max-w-[120px] py-2.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          title="Skip recommendation"
          aria-label="Skip"
        >
          <X size={15} strokeWidth={2.5} className="text-rose-600" />
          <span>Skip</span>
        </button>

        <button
          type="button"
          onClick={() => executeSwipe('up')}
          className="w-10 h-10 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-colors shadow-2xs"
          title="Save for later"
          aria-label="Save for later"
        >
          <Star size={16} className="text-sky-500 fill-sky-500" />
        </button>

        <button
          type="button"
          onClick={() => executeSwipe('right')}
          className="flex-1 max-w-[140px] py-2.5 rounded-lg border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          title={mode === 'student' ? 'Mark Interested' : 'Shortlist Candidate'}
          aria-label={mode === 'student' ? 'Interested' : 'Shortlist'}
        >
          <Heart size={15} className="text-emerald-600 fill-emerald-600" />
          <span>{mode === 'student' ? 'Interested' : 'Shortlist'}</span>
        </button>
      </div>

      {/* Keyboard Controls Note */}
      <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-3">
        <span className="flex items-center gap-1 text-rose-600 font-semibold">
          <X size={12} strokeWidth={2.5} className="text-rose-600" /> Skip (←)
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-sky-700 font-semibold">
          <Star size={12} className="text-sky-500 fill-sky-500" /> Save (↑)
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <Heart size={12} className="text-emerald-600 fill-emerald-600" /> {mode === 'student' ? 'Interested' : 'Shortlist'} (→)
        </span>
      </div>
    </div>
  );
}
