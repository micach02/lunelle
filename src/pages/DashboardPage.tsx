import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataBadge, EmptyState, FertilityDisclaimer, MEDICAL_DISCLAIMER, Notice } from '@/components/ui/Feedback';
import { PhaseBadge } from '@/features/cycle/components/PhaseBadge';
import { PhaseGuide } from '@/features/cycle/components/PhaseGuide';
import { greeting, relativeDays } from '@/features/cycle/format';
import { PHASES } from '@/features/cycle/phases';
import { getCycleStatus, getFertileContext, type CycleStatus } from '@/features/cycle/services/cycleCalculator';
import { CycleOverviewCard } from '@/features/dashboard/components/CycleOverviewCard';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { IntimacyRecordItem } from '@/features/intimacy/components/IntimacyRecordItem';
import { PartnerBanner } from '@/features/partner/components/PartnerBanner';
import { SymptomSummary } from '@/features/symptoms/components/SymptomSummary';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { formatDate, formatDateRange, isoDateFromTimestamp, pluralizeDays } from '@/lib/dates';

function CardLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:underline">
      {children}
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}

function FertileWindowCard({ status }: { status: CycleStatus }) {
  const { fertileWindow, fertileWindowStatus, daysUntilFertileWindow } = status;
  const statusText =
    fertileWindowStatus === 'active'
      ? 'You are within the estimated fertile window.'
      : fertileWindowStatus === 'upcoming'
        ? `Estimated to start ${relativeDays(daysUntilFertileWindow)}.`
        : 'The estimated fertile window for this cycle has passed.';
  return (
    <Card>
      <CardHeader
        title="Estimated fertile window"
        icon={<span aria-hidden className="text-xl">🥚</span>}
        action={<DataBadge kind="estimated" />}
      />
      <p className="font-display text-2xl font-medium text-ink">
        {formatDateRange(fertileWindow.start, fertileWindow.end)}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{statusText}</p>
      <FertilityDisclaimer className="mt-4" />
    </Card>
  );
}

export function DashboardPage() {
  const { profile, timeline, today, periods, intimacy, symptoms } = useTracking();
  const dialogs = useRecordDialogs();
  const status = useMemo(() => getCycleStatus(timeline), [timeline]);
  const currentSegment = timeline.segments.find((s) => s.kind === 'current');
  const lastPeriod = periods[0];
  const name = profile?.displayName?.trim();
  const hello = `${greeting(new Date().getHours())}${name ? `, ${name}` : ''}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-ink-muted">{formatDate(today, 'EEEE, MMMM d')}</p>
        <h1 className="mt-1 font-display text-[1.875rem] leading-tight font-medium tracking-tight sm:text-4xl">
          {hello}
        </h1>
      </header>

      <PartnerBanner />

      {!status || !currentSegment ? (
        <Card className="p-6 sm:p-8">
          <EmptyState
            icon={<span aria-hidden>🌙</span>}
            title="Welcome to Lunelle"
            description="Record the first day of your most recent period. Lunelle will estimate your cycle phases, ovulation and next period from there — and get more accurate as you add more."
            action={<Button onClick={() => dialogs.openPeriod()}>+ Record period</Button>}
          />
        </Card>
      ) : (
        <>
          {status.isLate && (
            <Notice tone="warning">
              {status.daysLate === 0
                ? 'Your period is estimated to start today.'
                : `Your period is ${pluralizeDays(status.daysLate)} later than estimated.`}{' '}
              Cycle patterns can vary. Record your period when it starts to update your estimates.
            </Notice>
          )}
          {status.periodEndMissing && lastPeriod && !lastPeriod.endDate && (
            <Notice>
              Has your period ended?{' '}
              <button
                type="button"
                className="font-medium text-accent underline"
                onClick={() => dialogs.openPeriod({ period: lastPeriod })}
              >
                Add an end date
              </button>{' '}
              for more accurate estimates.
            </Notice>
          )}
          <CycleOverviewCard status={status} segment={currentSegment} />
        </>
      )}

      <QuickActions />

      {status && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader
              title="Current phase"
              icon={<span aria-hidden className="text-xl">{PHASES[status.phase].emoji}</span>}
              action={<DataBadge kind={status.phaseIsEstimated ? 'estimated' : 'recorded'} />}
            />
            <PhaseBadge phase={status.phase} />
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{PHASES[status.phase].description}</p>
          </Card>

          <FertileWindowCard status={status} />

          <Card>
            <CardHeader
              title="Last period"
              icon={<span aria-hidden className="text-xl">🩸</span>}
              action={<CardLink to="/periods">All periods</CardLink>}
            />
            {lastPeriod && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl font-medium text-ink">
                    {formatDateRange(lastPeriod.startDate, lastPeriod.endDate)}
                  </p>
                  <DataBadge kind="recorded" />
                </div>
                <p className="text-sm text-ink-muted">
                  {status.isPeriodOngoing
                    ? `Ongoing · day ${status.cycleDay}`
                    : `Started ${relativeDays(-status.daysSinceLastPeriodStart)}`}
                  {lastPeriod.endDate && status.daysSinceLastPeriodEnd !== null && (
                    <> · ended {relativeDays(-status.daysSinceLastPeriodEnd)}</>
                  )}
                </p>
                <Button
                  variant="soft"
                  size="sm"
                  icon={<Pencil className="size-3.5" />}
                  onClick={() => dialogs.openPeriod({ period: lastPeriod })}
                >
                  {lastPeriod.endDate ? 'Edit' : 'Add end date'}
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent intimacy"
              icon={<span aria-hidden className="text-xl">❤️</span>}
              action={<CardLink to="/intimacy">View all</CardLink>}
            />
            {intimacy.length === 0 ? (
              <p className="text-sm text-ink-muted">No intimacy recorded yet.</p>
            ) : (
              <ul className="space-y-4">
                {intimacy.slice(0, 2).map((record) => (
                  <li key={record.id}>
                    <IntimacyRecordItem
                      compact
                      record={record}
                      context={getFertileContext(timeline, isoDateFromTimestamp(record.occurredAt))}
                      onEdit={() => dialogs.openIntimacy({ record })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="md:col-span-2">
            <CardHeader
              title="Recent symptoms"
              icon={<span aria-hidden className="text-xl">📝</span>}
              action={<CardLink to="/symptoms">View all</CardLink>}
            />
            {symptoms.length === 0 ? (
              <p className="text-sm text-ink-muted">No symptoms logged yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-3">
                {symptoms.slice(0, 3).map((log) => (
                  <li key={log.id}>
                    <button
                      type="button"
                      onClick={() => dialogs.openSymptoms({ log })}
                      className="h-full w-full rounded-2xl bg-surface-muted/60 p-3.5 text-left hover:bg-surface-muted"
                    >
                      <p className="mb-2 text-sm font-medium text-ink">{formatDate(log.date, 'EEE, MMM d')}</p>
                      <SymptomSummary log={log} showNotes={false} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <section aria-labelledby="phases-heading" className="pt-2">
        <h2 id="phases-heading" className="mb-3 font-display text-xl font-medium">
          The four phases of your cycle
        </h2>
        <PhaseGuide current={status?.phase} />
      </section>

      <p className="text-xs leading-relaxed text-ink-subtle">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
