import { CircleDashed, CircleDot, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FertileContext } from '@/features/cycle/services/cycleCalculator';

const COPY: Record<FertileContext, string> = {
  inside: 'Recorded during the estimated fertile window.',
  outside: 'Recorded outside the estimated fertile window.',
  unknown: 'Not enough cycle data to estimate the fertile window for this date.',
};

/**
 * Compares a record's date with the ESTIMATED fertile window. Uses an icon
 * and words, not colour alone, and never states a pregnancy probability.
 */
export function FertileContextNote({ context, className }: { context: FertileContext; className?: string }) {
  const Icon = context === 'inside' ? CircleDot : context === 'outside' ? CircleDashed : CircleHelp;
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-sm',
        context === 'inside' ? 'text-phase-ovulation' : 'text-ink-muted',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {context !== 'unknown' && <span className="font-medium">Estimated fertile window · </span>}
        {COPY[context]}
      </span>
    </p>
  );
}
