import { useCallback, useEffect, useMemo, useState } from 'react';
import { addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Eye, PencilLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  DataBadge,
  EmptyState,
  ErrorState,
  FERTILITY_DISCLAIMER,
  FertilityDisclaimer,
  Skeleton,
} from '@/components/ui/Feedback';
import { firstOfMonth, isSameMonthISO } from '@/features/calendar/calendarModel';
import { CalendarGrid } from '@/features/calendar/components/CalendarGrid';
import { CalendarLegend } from '@/features/calendar/components/CalendarLegend';
import { PhaseBadge } from '@/features/cycle/components/PhaseBadge';
import { relativeDays } from '@/features/cycle/format';
import {
  buildCycleTimeline,
  getCycleStatus,
  getDayInfo,
  getFertileContext,
  type CycleTimeline,
} from '@/features/cycle/services/cycleCalculator';
import { CycleOverviewCard } from '@/features/dashboard/components/CycleOverviewCard';
import { IntimacyRecordItem } from '@/features/intimacy/components/IntimacyRecordItem';
import { SymptomSummary } from '@/features/symptoms/components/SymptomSummary';
import { RecordDialogsProvider, useRecordDialogs } from '@/features/tracking/RecordDialogs';
import type { RecordStore } from '@/features/tracking/recordStore';
import { useToday } from '@/hooks/useToday';
import {
  formatDate,
  formatDateRange,
  isoDateFromTimestamp,
  parseISODate,
  toISODate,
  type ISODate,
} from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { logError } from '@/lib/logger';
import { describeScopes } from '../scopes';
import {
  getSharedData,
  partnerSaveIntimacy,
  partnerSavePeriod,
  partnerSaveSymptoms,
  type SharedData,
} from '../services/partnerService';

function SharedDayPanel({ date, data, timeline }: { date: ISODate; data: SharedData; timeline: CycleTimeline }) {
  const dialogs = useRecordDialogs();
  const { canEdit, symptoms: symptomsShared, intimacy: intimacyShared } = data.scopes;
  const editable = canEdit && date <= timeline.today;
  const info = getDayInfo(timeline, date);
  const dayIntimacy = (data.intimacy ?? []).filter((r) => isoDateFromTimestamp(r.occurredAt) === date);
  const log = (data.symptoms ?? []).find((s) => s.date === date);
  const coveringPeriod = data.periods.find((p, index) => {
    const end = p.endDate ?? (index === 0 ? timeline.today : p.startDate);
    return date >= p.startDate && date <= end;
  });

  return (
    <Card aria-live="polite" className="space-y-3">
      <header>
        <h3 className="font-display text-xl font-medium text-ink">{formatDate(date, 'MMMM d')}</h3>
        <p className="text-sm text-ink-muted">
          {formatDate(date, 'EEEE')}
          {info.cycleDay !== null && <> · Cycle day {info.cycleDay}</>}
        </p>
      </header>
      {info.phase ? (
        <div className="flex flex-wrap items-center gap-2">
          <PhaseBadge phase={info.phase} size="sm" />
          <DataBadge kind={info.isEstimated ? 'estimated' : 'recorded'} />
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No cycle estimate for this date.</p>
      )}
      {info.isOvulationDay && <p className="text-sm text-ink">🥚 Estimated ovulation</p>}
      {info.isFertile && <p className="text-sm text-ink">Estimated fertile window</p>}
      {(info.isFertile || info.isOvulationDay) && <p className="text-xs text-ink-subtle">{FERTILITY_DISCLAIMER}</p>}
      {dayIntimacy.map((record) => (
        <IntimacyRecordItem
          key={record.id}
          compact
          record={record}
          context={getFertileContext(timeline, date)}
          onEdit={canEdit ? () => dialogs.openIntimacy({ record }) : undefined}
        />
      ))}
      {log && (
        <div className="border-t border-border pt-3">
          <SymptomSummary log={log} />
        </div>
      )}
      {editable && (
        <div className="grid gap-2 border-t border-border pt-3">
          {coveringPeriod ? (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openPeriod({ period: coveringPeriod })}>
              Edit period
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openPeriod({ defaultDate: date })}>
              + Record period starting this day
            </Button>
          )}
          {intimacyShared && (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openIntimacy({ defaultDate: date })}>
              + Record intimacy
            </Button>
          )}
          {symptomsShared && (
            <Button variant="secondary" size="sm" onClick={() => dialogs.openSymptoms({ defaultDate: date })}>
              {log ? 'Edit symptoms' : '+ Log symptoms'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function SharedIntimacyList({ data, timeline }: { data: SharedData; timeline: CycleTimeline }) {
  const dialogs = useRecordDialogs();
  if (!data.intimacy || data.intimacy.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Intimacy" icon={<span aria-hidden className="text-xl">❤️</span>} />
      <ul className="space-y-3">
        {data.intimacy.slice(0, 10).map((record) => (
          <li key={record.id}>
            <IntimacyRecordItem
              record={record}
              context={getFertileContext(timeline, isoDateFromTimestamp(record.occurredAt))}
              onEdit={data.scopes.canEdit ? () => dialogs.openIntimacy({ record }) : undefined}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EditActions({ data }: { data: SharedData }) {
  const dialogs = useRecordDialogs();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => dialogs.openPeriod()}>
        Record period
      </Button>
      {data.scopes.intimacy && (
        <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => dialogs.openIntimacy()}>
          Record intimacy
        </Button>
      )}
      {data.scopes.symptoms && (
        <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => dialogs.openSymptoms()}>
          Log symptoms
        </Button>
      )}
    </div>
  );
}

/** Another person's shared cycle — view only, or add/edit when they allow it. */
export function SharedCycleView({ shareId }: { shareId: string }) {
  const today = useToday();
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: SharedData }
  >({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<ISODate>(today);
  const [month, setMonth] = useState<ISODate>(firstOfMonth(today));

  useEffect(() => {
    let active = true;
    getSharedData(shareId)
      .then((data) => active && setState({ status: 'ready', data }))
      .catch((e: unknown) => {
        logError('partner.getSharedData', e);
        if (active) setState({ status: 'error', message: getErrorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [shareId, reloadKey]);

  /** Re-read after a save without flashing the loading state. */
  const refresh = useCallback(async () => {
    const data = await getSharedData(shareId);
    setState({ status: 'ready', data });
  }, [shareId]);

  const data = state.status === 'ready' ? state.data : null;
  const timeline = useMemo(
    () => (data ? buildCycleTimeline(data.periods, data.settings, today) : null),
    [data, today],
  );
  const intimacyDates = useMemo(() => {
    const map = new Map<ISODate, number>();
    for (const r of data?.intimacy ?? []) {
      const d = isoDateFromTimestamp(r.occurredAt);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [data]);
  const symptomDates = useMemo(() => new Set((data?.symptoms ?? []).map((s) => s.date)), [data]);

  // Saves go through the partner_save_* database functions; there is no delete.
  const store = useMemo<RecordStore | null>(() => {
    if (!data || !timeline) return null;
    return {
      today,
      timeline,
      periods: data.periods,
      symptoms: data.symptoms ?? [],
      savePeriod: async (input, id) => {
        await partnerSavePeriod(shareId, input, id);
        await refresh();
      },
      saveIntimacy: async (input, id) => {
        await partnerSaveIntimacy(shareId, input, id);
        await refresh();
      },
      saveSymptoms: async (input, id) => {
        await partnerSaveSymptoms(shareId, input, id);
        await refresh();
      },
      notesEditable: data.scopes.notes,
      onBehalfOf: data.ownerName,
    };
  }, [data, timeline, today, shareId, refresh]);

  if (state.status === 'loading') return <Skeleton className="h-72 w-full rounded-card" />;
  if (state.status === 'error' || !data || !timeline || !store) {
    return (
      <ErrorState
        message={state.status === 'error' ? state.message : ''}
        onRetry={() => {
          setState({ status: 'loading' });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  const status = getCycleStatus(timeline);
  const current = timeline.segments.find((s) => s.kind === 'current');
  const { canEdit } = data.scopes;

  function select(date: ISODate) {
    setSelected(date);
    if (!isSameMonthISO(date, month)) setMonth(firstOfMonth(date));
  }
  function shiftMonth(delta: number) {
    const next = toISODate(addMonths(parseISODate(month), delta));
    setMonth(next);
    setSelected(isSameMonthISO(today, next) ? today : next);
  }

  return (
    <RecordDialogsProvider store={store}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-sm text-accent-ink">
          {canEdit ? (
            <PencilLine className="mt-0.5 size-5 shrink-0" aria-hidden />
          ) : (
            <Eye className="mt-0.5 size-5 shrink-0" aria-hidden />
          )}
          <p>
            {canEdit ? (
              <>
                <strong>You can add and edit records.</strong> {data.ownerName} sees what you add, controls what is
                shared, and is the only one who can delete records.
              </>
            ) : (
              <>
                <strong>View only.</strong> {data.ownerName} controls what is shared and can stop sharing at any time.
              </>
            )}{' '}
            Shared: {describeScopes({ ...data.scopes, canEdit: false }).toLowerCase()}
          </p>
        </div>

        {canEdit && <EditActions data={data} />}

        {status && current ? (
          <>
            <CycleOverviewCard status={status} segment={current} />
            <Card>
              <CardHeader
                title="Estimated fertile window"
                icon={<span aria-hidden className="text-xl">🥚</span>}
                action={<DataBadge kind="estimated" />}
              />
              <p className="font-display text-2xl font-medium text-ink">
                {formatDateRange(status.fertileWindow.start, status.fertileWindow.end)}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {status.fertileWindowStatus === 'active'
                  ? 'Currently within the estimated fertile window.'
                  : status.fertileWindowStatus === 'upcoming'
                    ? `Estimated to start ${relativeDays(status.daysUntilFertileWindow)}.`
                    : 'The estimated fertile window for this cycle has passed.'}
              </p>
              <FertilityDisclaimer className="mt-4" />
            </Card>
          </>
        ) : (
          <Card>
            <EmptyState
              icon={<span aria-hidden>🌙</span>}
              title="No periods recorded yet"
              description={
                canEdit
                  ? `Record ${data.ownerName}’s most recent period to see estimates.`
                  : `Estimates will appear here once ${data.ownerName} records a period.`
              }
            />
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <Card className="p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="font-display text-xl font-medium text-ink" aria-live="polite">
                {formatDate(month, 'MMMM yyyy')}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <ChevronLeft className="size-5" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
                  <ChevronRight className="size-5" aria-hidden />
                </Button>
              </div>
            </div>
            <CalendarGrid
              month={month}
              selected={selected}
              today={today}
              timeline={timeline}
              intimacyDates={intimacyDates}
              symptomDates={symptomDates}
              onSelect={select}
            />
            <CalendarLegend className="mt-4 border-t border-border px-1 pt-4" />
          </Card>
          <SharedDayPanel date={selected} data={data} timeline={timeline} />
        </div>

        {data.symptoms && data.symptoms.length > 0 && (
          <Card>
            <CardHeader title="Recent symptoms & mood" icon={<span aria-hidden className="text-xl">📝</span>} />
            <ul className="grid gap-3 sm:grid-cols-3">
              {data.symptoms.slice(0, 6).map((log) => (
                <li key={log.id} className="rounded-2xl bg-surface-muted/60 p-3.5">
                  <p className="mb-2 text-sm font-medium text-ink">{formatDate(log.date, 'EEE, MMM d')}</p>
                  <SymptomSummary log={log} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <SharedIntimacyList data={data} timeline={timeline} />
      </div>
    </RecordDialogsProvider>
  );
}
