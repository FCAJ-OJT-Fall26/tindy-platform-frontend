export interface MatchTier {
  tier: 'low' | 'medium' | 'high';
  label: string;
  stroke: string;
  trackStroke: string;
  textColor: string;
  labelColor: string;
  verdictColor: string;
  subhead: string;
  badgeClass: string;
  progressBarBg: string;
  isWarning: boolean;
}

/**
 * Categorizes a match score:
 * - < 35%: Red and warning
 * - 35% - 65%: Yellow
 * - > 65%: Green
 */
export function getMatchTier(score: number): MatchTier {
  if (score < 35) {
    return {
      tier: 'low',
      label: 'Warning: Low Match',
      stroke: '#e11d48', // rose-600 (Red)
      trackStroke: '#ffe4e6', // rose-100
      textColor: 'text-rose-600',
      labelColor: 'text-rose-500',
      verdictColor: 'text-rose-700',
      subhead: 'Warning: Low algorithmic compatibility',
      badgeClass: 'bg-rose-50 border-rose-200 text-rose-700',
      progressBarBg: 'bg-rose-500',
      isWarning: true,
    };
  }
  if (score <= 65) {
    return {
      tier: 'medium',
      label: 'Moderate Match',
      stroke: '#f59e0b', // amber-500 (Yellow)
      trackStroke: '#fef3c7', // amber-100
      textColor: 'text-amber-600',
      labelColor: 'text-amber-600',
      verdictColor: 'text-amber-800',
      subhead: 'Moderate algorithmic alignment',
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-800',
      progressBarBg: 'bg-amber-500',
      isWarning: false,
    };
  }
  return {
    tier: 'high',
    label: 'Strong Match',
    stroke: '#10b981', // emerald-500 (Green)
    trackStroke: '#d1fae5', // emerald-100
    textColor: 'text-emerald-600',
    labelColor: 'text-emerald-600',
    verdictColor: 'text-emerald-800',
    subhead: 'Verified algorithmic match',
    badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    progressBarBg: 'bg-emerald-500',
    isWarning: false,
  };
}
