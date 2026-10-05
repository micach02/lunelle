import { DataBadge } from '@/components/ui/Feedback';
import type { CycleSegment, RecordedCycle } from '@/features/cycle/services/cycleCalculator';
import { diffInDays, formatDate, formatDateRange, type ISODate } from '@/lib/dates';

function Row({ label, value, kind }: { label: string; value: string; kind: 'recorded' | 'estimated' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-sm font-medium text-ink">
        {value}
        <DataBadge kind={kind} />
      </dd>
    </div>
  );
}

/** Newest first: the current cycle, then each completed cycle. */
export function CycleHistoryList({
  cycles,
  current,
  today,
}: {
  cycles: RecordedCycle[];
  current: CycleSegment | undefined;
  today: ISODate;
}) {
  return (
    <ol className="divide-y divide-border">
      {current && (
        <li className="py-4 first:pt-0">
          <h3 className="font-display text-lg font-medium text-ink">
            {formatDate(current.startDate, 'MMMM')} <span className="text-sm font-sans text-ink-muted">· current cycle</span>
          </h3>
          <dl className="mt-1">
            <Row label="Cycle" value={`Day ${diffInDays(current.startDate, today) + 1} of ~${current.length}`} kind="estimated" />
            <Row
              label="Period"
              value={formatDateRange(current.startDate, current.hasRecordedPeriodEnd ? current.periodEndDate : null) +
                (current.hasRecordedPeriodEnd ? '' : ' (ongoing / no end date)')}
              kind="recorded"
            />
            {current.ovulationDate && (
              <Row label="Ovulation" value={formatDate(current.ovulationDate, 'MMM d')} kind="estimated" />
            )}
          </dl>
        </li>
      )}
      {[...cycles].reverse().map((cycle) => (
        <li key={cycle.startDate} className="py-4">
          <h3 className="font-display text-lg font-medium text-ink">{formatDate(cycle.startDate, 'MMMM yyyy')}</h3>
          <dl className="mt-1">
            <Row
              label="Cycle"
              value={cycle.isPlausible ? `${cycle.length}-day cycle` : `${cycle.length} days (possible gap in records)`}
              kind="recorded"
            />
            <Row label="Period" value={formatDateRange(cycle.periodStartDate, cycle.periodEndDate)} kind="recorded" />
            {cycle.estimatedOvulationDate && (
              <Row label="Ovulation" value={formatDate(cycle.estimatedOvulationDate, 'MMM d')} kind="estimated" />
            )}
          </dl>
        </li>
      ))}
    </ol>
  );
}
