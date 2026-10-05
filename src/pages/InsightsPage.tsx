import { useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataBadge, EmptyState, MEDICAL_DISCLAIMER } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { PHASES } from '@/features/cycle/phases';
import {
  getCycleStatistics,
  getPeriodDuration,
  getRecordedCycles,
  sortPeriods,
} from '@/features/cycle/services/cycleCalculator';
import { CycleHistoryList } from '@/features/statistics/components/CycleHistoryList';
import { DaysBarChart, type DaysDatum } from '@/features/statistics/components/DaysBarChart';
import { StatTile } from '@/features/statistics/components/StatTile';
import {
  getMoodDistribution,
  getSymptomTrends,
  SYMPTOM_TREND_WINDOW_DAYS,
} from '@/features/statistics/services/insights';
import { MOOD_META, SYMPTOM_LABELS } from '@/features/symptoms/constants';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { formatDate, formatDateRange } from '@/lib/dates';

const RECENT_LIMIT = 12;

function fmt(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Horizontal meter list — a plain HTML "chart" for small categorical counts. */
function CountBars({ rows }: { rows: { key: string; label: string; count: number; note?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-ink">{row.label}</span>
            <span className="text-ink-muted tabular-nums">
              {row.count} {row.count === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
          {row.note && <p className="mt-1 text-xs text-ink-subtle">{row.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export function InsightsPage() {
  const { periods, symptoms, timeline, today } = useTracking();
  const dialogs = useRecordDialogs();

  const stats = useMemo(() => getCycleStatistics(periods), [periods]);
  const cycles = useMemo(() => getRecordedCycles(periods), [periods]);
  const currentSegment = timeline.segments.find((s) => s.kind === 'current');

  const cycleData = useMemo<DaysDatum[]>(
    () =>
      cycles
        .filter((c) => c.isPlausible)
        .slice(-RECENT_LIMIT)
        .map((c) => ({
          key: c.startDate,
          label: formatDate(c.startDate, 'MMM'),
          detail: formatDateRange(c.startDate, c.endDate),
          days: c.length,
        })),
    [cycles],
  );

  const periodData = useMemo<DaysDatum[]>(
    () =>
      sortPeriods(periods)
        .filter((p) => p.endDate)
        .slice(-RECENT_LIMIT)
        .map((p) => ({
          key: p.startDate,
          label: formatDate(p.startDate, 'MMM'),
          detail: formatDateRange(p.startDate, p.endDate),
          days: getPeriodDuration(p)!,
        })),
    [periods],
  );

  const symptomTrends = useMemo(() => getSymptomTrends(symptoms, timeline, today), [symptoms, timeline, today]);
  const moods = useMemo(() => getMoodDistribution(symptoms, today), [symptoms, today]);

  if (periods.length === 0) {
    return (
      <div>
        <PageHeader title="Your Cycle Insights" />
        <Card>
          <EmptyState
            icon={<span aria-hidden>📊</span>}
            title="Insights appear as you track"
            description="Record your periods to see your average cycle length, how much it varies, and how symptoms follow your cycle."
            action={<Button onClick={() => dialogs.openPeriod()}>+ Record period</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Cycle Insights"
        description={
          stats.cycleCount > 0
            ? `From ${stats.cycleCount} recorded ${stats.cycleCount === 1 ? 'cycle' : 'cycles'} and ${stats.periodCount} ${stats.periodCount === 1 ? 'period' : 'periods'}.`
            : 'Record your next period to complete your first cycle.'
        }
        actions={
          <Link to="/periods" className="inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:underline">
            Manage periods <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      />

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Average cycle" value={fmt(stats.averageCycleLength)} unit="days" />
          <StatTile label="Shortest cycle" value={fmt(stats.shortestCycle)} unit="days" />
          <StatTile label="Longest cycle" value={fmt(stats.longestCycle)} unit="days" />
          <StatTile label="Average period" value={fmt(stats.averagePeriodLength)} unit="days" />
        </dl>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <DataBadge kind="recorded" /> Calculated from the periods you recorded. Gaps longer than 60 days are left out.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Cycle length" description={`Recorded cycles in days (up to the latest ${RECENT_LIMIT})`} />
          {cycleData.length > 0 ? (
            <DaysBarChart
              data={cycleData}
              average={stats.averageCycleLength}
              colorVar="--color-accent"
              title="Cycle length per recorded cycle"
              tableCaption="Recorded cycle lengths"
            />
          ) : (
            <p className="text-sm text-ink-muted">Record at least two periods to see cycle lengths.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Period duration" description="Recorded periods with an end date, in days" />
          {periodData.length > 0 ? (
            <DaysBarChart
              data={periodData}
              average={stats.averagePeriodLength}
              colorVar="--color-phase-menstruation"
              title="Period duration per recorded period"
              tableCaption="Recorded period durations"
            />
          ) : (
            <p className="text-sm text-ink-muted">Add end dates to your periods to see durations.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Symptom trends" description={`Last ${SYMPTOM_TREND_WINDOW_DAYS} days`} />
          {symptomTrends.length > 0 ? (
            <CountBars
              rows={symptomTrends.map((t) => ({
                key: t.symptom,
                label: SYMPTOM_LABELS[t.symptom],
                count: t.count,
                note: t.commonPhase
                  ? `Most often during: ${PHASES[t.commonPhase].emoji} ${PHASES[t.commonPhase].label} (estimated)`
                  : undefined,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-muted">No symptoms logged in this period.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Mood" description={`Last ${SYMPTOM_TREND_WINDOW_DAYS} days`} />
          {moods.length > 0 ? (
            <CountBars
              rows={moods.map((m) => ({
                key: m.mood,
                label: `${MOOD_META[m.mood].emoji} ${MOOD_META[m.mood].label}`,
                count: m.count,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-muted">No moods logged in this period.</p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Cycle history"
          description="Periods and cycle lengths are recorded; ovulation dates are estimated from when your next period started."
        />
        <CycleHistoryList cycles={cycles} current={currentSegment} today={today} />
      </Card>

      <p className="text-xs leading-relaxed text-ink-subtle">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}

export default InsightsPage;
