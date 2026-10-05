import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataBadge, FERTILITY_DISCLAIMER, Notice } from '@/components/ui/Feedback';
import { PhaseBadge } from '@/features/cycle/components/PhaseBadge';
import { getDayInfo, getFertileContext } from '@/features/cycle/services/cycleCalculator';
import { IntimacyRecordItem } from '@/features/intimacy/components/IntimacyRecordItem';
import { SymptomSummary } from '@/features/symptoms/components/SymptomSummary';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { formatDate, isoDateFromTimestamp, type ISODate } from '@/lib/dates';

export function DayDetailsPanel({ date }: { date: ISODate }) {
  const { timeline, today, periods, intimacy, symptoms } = useTracking();
  const dialogs = useRecordDialogs();
  const info = getDayInfo(timeline, date);
  const isFuture = date > today;
  const dayIntimacy = intimacy.filter((r) => isoDateFromTimestamp(r.occurredAt) === date);
  const symptomLog = symptoms.find((s) => s.date === date);
  const coveringPeriod = periods.find((p, index) => {
    const end = p.endDate ?? (index === 0 ? today : p.startDate);
    return date >= p.startDate && date <= end;
  });

  return (
    <Card aria-live="polite" className="space-y-4">
      <header>
        <h2 className="font-display text-2xl font-medium text-ink">{formatDate(date, 'MMMM d')}</h2>
        <p className="text-sm text-ink-muted">
          {formatDate(date, 'EEEE, yyyy')}
          {info.cycleDay !== null && <> · Cycle day {info.cycleDay}</>}
        </p>
      </header>

      {info.phase ? (
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <PhaseBadge phase={info.phase} size="sm" />
            <DataBadge kind={info.isEstimated ? 'estimated' : 'recorded'} />
          </li>
          {info.isOvulationDay && (
            <li className="flex items-center gap-2 text-ink">
              <span aria-hidden>🥚</span> Estimated ovulation <DataBadge kind="estimated" />
            </li>
          )}
          {info.isFertile && (
            <li className="flex items-center gap-2 text-ink">
              <span aria-hidden className="inline-block size-3 rounded-sm outline-1 outline-phase-ovulation outline-dashed" />
              Estimated fertile window
            </li>
          )}
          {info.isLate && <li className="text-warning">Period later than estimated</li>}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          {info.cycleDay !== null
            ? 'Not enough cycle data to estimate a phase for this date.'
            : 'No cycle estimate for this date. Estimates start from your first recorded period.'}
        </p>
      )}

      {(info.isFertile || info.isOvulationDay) && <p className="text-xs text-ink-subtle">{FERTILITY_DISCLAIMER}</p>}

      {dayIntimacy.length > 0 && (
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-ink">Intimacy</h3>
          {dayIntimacy.map((record) => (
            <IntimacyRecordItem
              key={record.id}
              compact
              record={record}
              context={getFertileContext(timeline, date)}
              onEdit={() => dialogs.openIntimacy({ record })}
            />
          ))}
        </section>
      )}

      {symptomLog && (
        <section className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink">
              <span aria-hidden>📝</span> Symptoms & mood
            </h3>
            <button
              type="button"
              onClick={() => dialogs.openSymptoms({ log: symptomLog })}
              className="rounded-full p-2 text-ink-subtle hover:bg-surface-muted hover:text-ink"
              aria-label="Edit symptoms"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>
          <SymptomSummary log={symptomLog} />
        </section>
      )}

      {isFuture ? (
        <Notice>This date is in the future, so only estimates are shown.</Notice>
      ) : (
        <div className="grid gap-2 border-t border-border pt-4">
          {coveringPeriod ? (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openPeriod({ period: coveringPeriod })}>
              Edit period
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openPeriod({ defaultDate: date })}>
              + Record period starting this day
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => dialogs.openIntimacy({ defaultDate: date })}>
            + Record intimacy
          </Button>
          {!symptomLog && (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openSymptoms({ defaultDate: date })}>
              + Log symptoms
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
