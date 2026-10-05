import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { PHASES } from '../phases';
import { getPhaseSpans, type CycleSegment } from '../services/cycleCalculator';

const SIZE = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2 - 6;
const CENTER = SIZE / 2;
const GAP_DEGREES = 2.2;

function polar(angleDeg: number, r = RADIUS) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = polar(startDeg);
  const end = polar(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Circular overview of the current cycle: one arc per phase and a marker on
 * today. Decorative — the same information is given as text beside it.
 */
export function CycleRing({
  segment,
  cycleDay,
  className,
}: {
  segment: CycleSegment;
  cycleDay: number;
  className?: string;
}) {
  const spans = useMemo(() => getPhaseSpans(segment), [segment]);
  const total = segment.length;
  const degPerDay = 360 / total;
  const markerDay = Math.min(cycleDay, total);
  const marker = polar((markerDay - 0.5) * degPerDay);

  return (
    <div className={cn('relative aspect-square w-full max-w-[13rem]', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" className="stroke-surface-muted" strokeWidth={STROKE} />
        {spans.map((span) => {
          if (!span.phase) return null;
          const start = (span.startDay - 1) * degPerDay + GAP_DEGREES / 2;
          const end = span.endDay * degPerDay - GAP_DEGREES / 2;
          return (
            <path
              key={`${span.phase}-${span.startDay}`}
              d={arcPath(start, Math.max(start + 0.5, end))}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              className={cn(PHASES[span.phase].stroke, 'opacity-85')}
            />
          );
        })}
        <circle cx={marker.x} cy={marker.y} r={STROKE / 2 + 4} className="fill-surface stroke-ink" strokeWidth={3} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">Day</span>
        <span className="font-display text-5xl leading-none font-medium text-ink">{cycleDay}</span>
        <span className="mt-1 text-sm text-ink-muted">of {total}</span>
      </div>
    </div>
  );
}
