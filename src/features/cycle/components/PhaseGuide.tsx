import { cn } from '@/lib/cn';
import { PHASE_ORDER, PHASES } from '../phases';
import type { CyclePhase } from '../services/cycleCalculator';

/** Short, plain-language explanation of the four phases. */
export function PhaseGuide({ current, className }: { current?: CyclePhase | null; className?: string }) {
  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {PHASE_ORDER.map((phase) => {
        const meta = PHASES[phase];
        const isCurrent = phase === current;
        return (
          <li
            key={phase}
            className={cn(
              'rounded-2xl border p-4',
              isCurrent ? cn(meta.border, meta.softBg) : 'border-border bg-surface',
            )}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg">
                {meta.emoji}
              </span>
              <h3 className={cn('font-medium', meta.text)}>{meta.label}</h3>
              {isCurrent && (
                <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink">
                  You are here
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{meta.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
