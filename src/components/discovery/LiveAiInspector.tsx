import React, { useEffect, useState } from 'react';
import { ArrowUpRight, AlertTriangle, Check, CircleHelp } from 'lucide-react';
import { DiscoveryProject, DiscoveryCandidate } from '../../types/discovery';
import MatchScoreRing from './MatchScoreRing';
import { getMatchTier } from '../../utils/matchTier';
import './rule-match.css';

function AnimatedFactorRow({
  label,
  score,
  weight,
  triggerKey,
}: {
  label: string;
  score: number;
  weight: number;
  triggerKey: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedPct(clamped);
      return;
    }

    setAnimatedPct(0);
    let rafId = 0;
    const duration = 850;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 2.4);
      setAnimatedPct(eased * clamped);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setAnimatedPct(clamped);
      }
    };
    rafId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafId);
  }, [clamped, triggerKey]);

  const displayScore = Math.round(animatedPct);
  const tier = getMatchTier(displayScore);

  return (
    <div className="live-match-inspector__factor">
      <div>
        <span>{label}</span>
        <span>
          <strong style={{ color: tier.stroke }}>{displayScore}%</strong>
          <small> ({Number(weight.toFixed(0))}% weight)</small>
        </span>
      </div>
      <div
        className="live-match-inspector__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayScore}
        style={{ backgroundColor: tier.trackStroke }}
      >
        <span
          style={{
            width: `${animatedPct}%`,
            backgroundColor: tier.stroke,
            transition: 'none',
          }}
        />
      </div>
    </div>
  );
}

interface LiveAiInspectorProps {
  item: DiscoveryProject | DiscoveryCandidate | null;
  mode: 'student' | 'leader';
  onOpenFullDetail: () => void;
  onOpenAiModal: () => void;
}

export default function LiveAiInspector({
  item,
  mode,
  onOpenFullDetail,
  onOpenAiModal,
}: LiveAiInspectorProps) {
  if (!item) {
    return (
      <section className="live-discovery__inspector-empty">
        <h2>No Candidate Selected</h2>
        <p>Select or drag a recommendation to inspect their live match breakdown.</p>
      </section>
    );
  }

  const isProject = mode === 'student';
  const project = isProject ? (item as DiscoveryProject) : null;
  const candidate = !isProject ? (item as DiscoveryCandidate) : null;
  const match = item.match;

  if (project?.matchAvailable === false) {
    return (
      <aside className="live-match-inspector">
        <div className="live-match-inspector__project">
          <h2>{project.name}</h2>
          <p>Match scoring is not available. Review the project requirements and saved details.</p>
        </div>
        <button type="button" className="live-match-inspector__inspect" onClick={onOpenFullDetail}>
          View project <ArrowUpRight size={14} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="live-match-inspector" aria-label="Candidate algorithmic evaluation">
      {/* Header */}
      <header>
        <div>
          <span className="live-discovery__eyebrow">MATCH INSPECTOR</span>
          <strong>Position Match</strong>
        </div>
        <button type="button" onClick={onOpenAiModal}>
          Details <ArrowUpRight size={13} />
        </button>
      </header>

      {/* Target Item Header */}
      <div className="live-match-inspector__project">
        <div className="flex items-center gap-3">
          {candidate?.avatar && (
            <img
              src={candidate.avatar}
              alt={candidate.name}
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2>{item.name}</h2>
            <p>{isProject ? project?.role : candidate?.preferredRole}</p>
          </div>
        </div>
      </div>

      {/* Score Ring Component */}
      <div className="live-match-inspector__score">
        <MatchScoreRing score={match.overall} compact />
        <div>
          <strong>Rule-based match</strong>
          <span>Candidate fit for this position</span>
        </div>
      </div>

      {/* Low Match Warning Banner */}
      {match.overall < 35 && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 mb-3">
          <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <span className="font-bold block">Low Match (&lt;35%)</span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">
              Significant gaps identified in required skills or availability.
            </span>
          </div>
        </div>
      )}

      {/* Breakdown Weights */}
      <div className="live-match-inspector__factors">
        <span className="live-discovery__eyebrow">SCORING FACTORS</span>
        {(match?.factors || match?.dimensions || []).map((dim) => (
          <AnimatedFactorRow
            key={dim.label}
            label={dim.label}
            score={dim.score}
            weight={dim.weight}
            triggerKey={item.id}
          />
        ))}
      </div>

      {/* Key Factors & Skills */}
      <div className="live-match-inspector__summary">
        <span className="live-discovery__eyebrow">SKILL SUMMARY</span>
        <p>
          <Check size={14} />
          <span>
            <strong>Matched: </strong>
            {(match?.strongMatches || match?.strengths || []).slice(0, 3).join(', ') || 'Requirements met'}
          </span>
        </p>
        {((match?.skillGaps && match.skillGaps.length > 0) || (match?.gaps && match.gaps.length > 0)) && (
          <p className="live-match-inspector__gaps">
            <CircleHelp size={14} />
            <span>
              <strong>To grow: </strong>
              {match?.skillGaps?.map((g) => g.skill).join(', ') || match?.gaps?.join(', ')}
            </span>
          </p>
        )}
      </div>

      <p className="live-match-inspector__note">The project leader makes the final decision.</p>

      {/* Full Audit Action */}
      <button
        type="button"
        onClick={onOpenFullDetail}
        className="live-match-inspector__inspect"
      >
        Inspect candidate <ArrowUpRight size={14} />
      </button>
    </aside>
  );
}
