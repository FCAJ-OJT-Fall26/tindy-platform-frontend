import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { getMatchTier } from '../../utils/matchTier';

interface AiMatchBadgeProps {
  score: number;
  verdict?: string;
  size?: 'sm' | 'md' | 'lg';
  showVerdict?: boolean;
}

export default function AiMatchBadge({
  score,
  verdict,
  size = 'md',
  showVerdict = true,
}: AiMatchBadgeProps) {
  const tier = getMatchTier(score);
  const displayVerdict = verdict || tier.label;

  const config = {
    sm: { dimension: 44, stroke: 3, radius: 18, fontSize: 'text-xs', labelSize: 'text-[9px]' },
    md: { dimension: 56, stroke: 4, radius: 23, fontSize: 'text-sm font-bold', labelSize: 'text-[10px]' },
    lg: { dimension: 68, stroke: 5, radius: 28, fontSize: 'text-base font-bold', labelSize: 'text-xs' },
  }[size];

  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

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
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono leading-none tracking-tight font-extrabold ${config.fontSize} ${tier.textColor}`}>
            {score}%
          </span>
          <span className={`text-[7px] tracking-wider uppercase font-semibold ${tier.labelColor}`}>
            MATCH
          </span>
        </div>
      </div>

      {showVerdict && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {tier.isWarning ? (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                <span>{displayVerdict}</span>
              </span>
            ) : (
              <span className={`font-bold text-xs ${tier.verdictColor}`}>
                {displayVerdict}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            {tier.subhead}
          </p>
        </div>
      )}
    </div>
  );
}
