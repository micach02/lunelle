import { cn } from '@/lib/cn';
import { PHASES } from '../phases';
import type { CyclePhase } from '../services/cycleCalculator';

export function PhaseBadge({
  phase,
  estimated,
  size = 'md',
  className,
}: {
  phase: CyclePhase;
  /** Appends "(estimated)" for screen readers and a visible marker. */
  estimated?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = PHASES[phase];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        meta.softBg,
        meta.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
      {estimated && <span className="font-normal opacity-80">· estimated</span>}
    </span>
  );
}
