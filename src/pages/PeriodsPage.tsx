import { useMemo } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataBadge, EmptyState } from '@/components/ui/Feedback';
import { predictionBasis } from '@/features/cycle/format';
import { getPeriodDuration, getRecordedCycles } from '@/features/cycle/services/cycleCalculator';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
import { PartnerBadge } from '@/features/partner/components/PartnerBadge';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { formatDateRange, pluralizeDays } from '@/lib/dates';

export function PeriodsPage() {
  const { periods, timeline } = useTracking();
  const dialogs = useRecordDialogs();
  const cycleLengthByStart = useMemo(
    () => new Map(getRecordedCycles(periods).map((c) => [c.startDate, c])),
    [periods],
  );
  const { prediction } = timeline;

  return (
    <div>
      <PageHeader
        title="Periods"
        description="Every period you’ve recorded. These drive all of Lunelle’s estimates."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => dialogs.openPeriod()}>
            Record period
          </Button>
        }
      />

      {periods.length > 0 && (
        <Card className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>
            <span className="text-ink-muted">Cycle length used for estimates: </span>
            <strong>{pluralizeDays(prediction.cycleLength)}</strong>
          </span>
          <span>
            <span className="text-ink-muted">Period length: </span>
            <strong>{pluralizeDays(prediction.periodLength)}</strong>
          </span>
          <span className="flex items-center gap-2 text-ink-muted">
            <DataBadge kind="estimated" /> {predictionBasis(prediction)}
          </span>
        </Card>
      )}

      {periods.length === 0 ? (
        <Card>
          <EmptyState
            icon={<span aria-hidden>🩸</span>}
            title="No periods recorded"
            description="Start with the first day of your most recent period."
            action={<Button onClick={() => dialogs.openPeriod()}>+ Record period</Button>}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {periods.map((period) => {
            const duration = getPeriodDuration(period);
            const cycle = cycleLengthByStart.get(period.startDate);
            return (
              <li key={period.id}>
                <Card className="flex items-center gap-4 p-4">
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-phase-menstruation-soft text-lg"
                  >
                    🩸
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-ink">{formatDateRange(period.startDate, period.endDate)}</h2>
                      <DataBadge kind="recorded" />
                      {period.enteredByPartner && <PartnerBadge />}
                    </div>
                    <p className="text-sm text-ink-muted">
                      {duration ? `${pluralizeDays(duration)} period` : 'Ongoing — no end date yet'}
                      {cycle && (
                        <>
                          {' · '}
                          {cycle.isPlausible ? `${cycle.length}-day cycle` : `${cycle.length} days until next (possible gap in records)`}
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dialogs.openPeriod({ period })}
                    aria-label={`Edit period ${formatDateRange(period.startDate, period.endDate)}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
