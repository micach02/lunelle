import { Card } from '@/components/ui/Card';
import { DataBadge } from '@/components/ui/Feedback';
import { CycleRing } from '@/features/cycle/components/CycleRing';
import { PhaseBadge } from '@/features/cycle/components/PhaseBadge';
import { nextPeriodPhrase, ovulationPhrase, predictionBasis } from '@/features/cycle/format';
import type { CycleSegment, CycleStatus } from '@/features/cycle/services/cycleCalculator';
import { formatDate } from '@/lib/dates';

export function CycleOverviewCard({ status, segment }: { status: CycleStatus; segment: CycleSegment }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
        <CycleRing segment={segment} cycleDay={status.cycleDay} className="w-52 shrink-0" />
        <div className="w-full min-w-0 flex-1 space-y-5">
          <div>
            <h2 className="text-sm font-medium tracking-wide text-ink-muted uppercase">Your cycle</h2>
            <p className="mt-1 font-display text-3xl font-medium text-ink">
              Day {status.cycleDay} <span className="text-ink-muted">of {status.cycleLength}</span>
            </p>
            <PhaseBadge phase={status.phase} estimated={status.phaseIsEstimated} className="mt-3" />
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-phase-ovulation-soft p-3.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <span aria-hidden>🥚</span> Estimated ovulation
              </dt>
              <dd className="mt-1">
                <span className="block text-lg font-semibold text-ink first-letter:uppercase">
                  {ovulationPhrase(status)}
                </span>
                <span className="text-xs text-ink-muted">{formatDate(status.estimatedOvulationDate, 'EEE, MMM d')}</span>
              </dd>
            </div>
            <div className="rounded-2xl bg-phase-menstruation-soft p-3.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <span aria-hidden>🩸</span> Next period
              </dt>
              <dd className="mt-1">
                <span className="block text-lg font-semibold text-ink first-letter:uppercase">
                  {nextPeriodPhrase(status)}
                </span>
                <span className="text-xs text-ink-muted">{formatDate(status.nextPeriodDate, 'EEE, MMM d')}</span>
              </dd>
            </div>
          </dl>
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <DataBadge kind="estimated" />
            {predictionBasis(status.prediction)}. Cycle patterns can vary.
          </p>
        </div>
      </div>
    </Card>
  );
}
