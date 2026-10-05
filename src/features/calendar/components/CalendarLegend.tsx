import { cn } from '@/lib/cn';

const ITEMS = [
  { emoji: '🩸', label: 'Period (recorded)', swatch: 'bg-phase-menstruation-soft' },
  { emoji: '🩸', label: 'Period (estimated)', swatch: 'border border-dashed border-phase-menstruation' },
  { emoji: '🌱', label: 'Follicular', swatch: 'bg-phase-follicular-soft' },
  { emoji: '🥚', label: 'Estimated ovulation', swatch: 'bg-phase-ovulation-soft ring-2 ring-inset ring-phase-ovulation' },
  { emoji: '🌙', label: 'Luteal', swatch: 'bg-phase-luteal-soft' },
  { emoji: '', label: 'Estimated fertile window', swatch: 'outline-1 outline-dashed -outline-offset-2 outline-phase-ovulation' },
  { emoji: '❤️', label: 'Intimacy', swatch: '' },
  { emoji: '📝', label: 'Symptoms', swatch: '' },
] as const;

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h2 className="sr-only">Legend</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.swatch ? (
              <span aria-hidden className={cn('inline-flex size-4 items-center justify-center rounded', item.swatch)} />
            ) : null}
            {item.emoji && <span aria-hidden>{item.emoji}</span>}
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-subtle">
        Phases, ovulation, the fertile window and future periods are estimates based on your recorded cycle.
      </p>
    </div>
  );
}
