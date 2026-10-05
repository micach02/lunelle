import { useMemo, useState } from 'react';
import { addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { firstOfMonth, isSameMonthISO } from '@/features/calendar/calendarModel';
import { CalendarGrid } from '@/features/calendar/components/CalendarGrid';
import { CalendarLegend } from '@/features/calendar/components/CalendarLegend';
import { DayDetailsPanel } from '@/features/calendar/components/DayDetailsPanel';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { formatDate, isoDateFromTimestamp, parseISODate, toISODate, type ISODate } from '@/lib/dates';

export function CalendarPage() {
  const { timeline, today, intimacy, symptoms } = useTracking();
  const [selected, setSelected] = useState<ISODate>(today);
  const [month, setMonth] = useState<ISODate>(firstOfMonth(today));

  const intimacyDates = useMemo(() => {
    const map = new Map<ISODate, number>();
    for (const r of intimacy) {
      const d = isoDateFromTimestamp(r.occurredAt);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [intimacy]);
  const symptomDates = useMemo(() => new Set(symptoms.map((s) => s.date)), [symptoms]);

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
    <div>
      <PageHeader title="Calendar" description="Your recorded days and estimated phases." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Card className="p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <p className="font-display text-xl font-medium text-ink" aria-live="polite">
              {formatDate(month, 'MMMM yyyy')}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => select(today)} disabled={selected === today}>
                Today
              </Button>
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
        <div className="lg:sticky lg:top-8">
          <DayDetailsPanel date={selected} />
        </div>
      </div>
    </div>
  );
}
