import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { getMatchTier } from '../../utils/matchTier';

interface AiMatchBadgeProps {
  score: number;
  verdict?: string;
  size?: 'sm' | 'md' | 'lg';
  showVerdict?: boolean;
  animate?: boolean;
}

export default function AiMatchBadge({
  score,
  verdict,
  size = 'md',
  showVerdict = true,
  animate = true,
}: AiMatchBadgeProps) {
  const finalTier = getMatchTier(score);
  const displayVerdict = verdict || finalTier.label;
  const clamped = Math.max(0, Math.min(100, score));

  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    if (!animate) {
      setAnimatedPct(0);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedPct(clamped);
      return;
    }

    setAnimatedPct(0);
    let countRaf = 0;
    const duration = 900;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 2.4);
      setAnimatedPct(eased * clamped);
      if (progress < 1) {
        countRaf = requestAnimationFrame(step);
      } else {
        setAnimatedPct(clamped);
      }
    };
    countRaf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(countRaf);
    };
  }, [clamped, animate]);

  const displayScore = Math.round(animatedPct);
  const tier = getMatchTier(displayScore);

  const config = {
    sm: { dimension: 44, stroke: 3, radius: 18, fontSize: 'text-xs', labelSize: 'text-[9px]' },
    md: { dimension: 56, stroke: 4, radius: 23, fontSize: 'text-sm font-bold', labelSize: 'text-[10px]' },
    lg: { dimension: 68, stroke: 5, radius: 28, fontSize: 'text-base font-bold', labelSize: 'text-xs' },
  }[size];

  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative inline-flex items-center justify-center flex-shrink-0"
        style={{ width: config.dimension, height: config.dimension }}
      >
        <svg width={config.dimension} height={config.dimension} className="-rotate-90">
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={config.radius}
            fill="#ffffff"
            stroke={tier.trackStroke}
            strokeWidth={config.stroke}
          />
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={config.radius}
            fill="transparent"
            stroke={tier.stroke}
            strokeWidth={config.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-colors duration-150"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`font-mono leading-none tracking-tight font-extrabold transition-colors duration-150 ${config.fontSize} ${tier.textColor}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {displayScore}%
          </span>
          <span className={`text-[7px] tracking-wider uppercase font-semibold ${tier.labelColor}`}>
            MATCH
          </span>
        </div>
      </div>

      {showVerdict && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {finalTier.isWarning ? (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                <span>{displayVerdict}</span>
              </span>
            ) : (
              <span className={`font-bold text-xs ${finalTier.verdictColor}`}>
                {displayVerdict}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            {finalTier.subhead}
          </p>
        </div>
      )}
    </div>
  );
}
