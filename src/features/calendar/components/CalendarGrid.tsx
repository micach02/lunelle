import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { PHASES } from '@/features/cycle/phases';
import { getDayInfo, type CycleTimeline, type DayInfo } from '@/features/cycle/services/cycleCalculator';
import { addDaysISO, formatDate, type ISODate } from '@/lib/dates';
import { buildMonthGrid, describeDay, isSameMonthISO, weekdayLabels } from '../calendarModel';

interface CalendarGridProps {
  month: ISODate;
  selected: ISODate;
  today: ISODate;
  timeline: CycleTimeline;
  intimacyDates: Map<ISODate, number>;
  symptomDates: Set<ISODate>;
  onSelect: (date: ISODate) => void;
}

const KEY_OFFSETS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

function cellTone(info: DayInfo): string {
  if (info.isPeriod) {
    return info.periodStatus === 'recorded'
      ? 'bg-phase-menstruation-soft border-transparent'
      : 'border-dashed border-phase-menstruation bg-transparent';
  }
  if (info.phase) return cn(PHASES[info.phase].softBg, 'border-transparent');
  return 'border-transparent';
}

export function CalendarGrid({
  month,
  selected,
  today,
  timeline,
  intimacyDates,
  symptomDates,
  onSelect,
}: CalendarGridProps) {
  const titleId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  const weeks = buildMonthGrid(month);
  const weekdays = weekdayLabels();

  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus();
  }, [selected, month]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: ISODate | null = null;
    if (event.key in KEY_OFFSETS) next = addDaysISO(selected, KEY_OFFSETS[event.key]);
    if (event.key === 'PageUp') next = addDaysISO(selected, -28);
    if (event.key === 'PageDown') next = addDaysISO(selected, 28);
    if (event.key === 'Home') next = selected === today ? null : today;
    if (!next) return;
    event.preventDefault();
    focusPending.current = true;
    onSelect(next);
  }

  return (
    <div>
      <h2 id={titleId} className="sr-only">
        {formatDate(month, 'MMMM yyyy')}
      </h2>
      <div ref={gridRef} role="grid" aria-labelledby={titleId} onKeyDown={handleKeyDown} className="select-none">
        <div role="row" className="mb-1 grid grid-cols-7 gap-1">
          {weekdays.map((d) => (
            <div key={d.long} role="columnheader" className="py-1 text-center text-xs font-medium text-ink-subtle">
              <abbr title={d.long} className="no-underline">
                {d.short}
              </abbr>
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div role="row" key={week[0]} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const info = getDayInfo(timeline, date);
              const inMonth = isSameMonthISO(date, month);
              const isToday = date === today;
              const isSelected = date === selected;
              const intimacyCount = intimacyDates.get(date) ?? 0;
              const hasSymptoms = symptomDates.has(date);
              return (
                <div role="gridcell" key={date} aria-selected={isSelected} className="mb-1">
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => onSelect(date)}
                    aria-label={describeDay(info, { isToday, intimacyCount, hasSymptoms })}
                    aria-current={isToday ? 'date' : undefined}
                    className={cn(
                      'relative flex h-14 w-full flex-col justify-between rounded-xl border p-1 text-left transition-shadow sm:h-20 sm:p-1.5',
                      cellTone(info),
                      !inMonth && 'opacity-40',
                      info.isFertile && 'outline-1 -outline-offset-4 outline-phase-ovulation outline-dashed',
                      info.isOvulationDay && 'ring-2 ring-phase-ovulation ring-inset',
                      isSelected && 'shadow-[0_0_0_2px_var(--color-accent)]',
                      'hover:shadow-[0_0_0_2px_var(--color-border-strong)]',
                    )}
                  >
                    <span className="flex items-start justify-between">
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full text-[0.8125rem] sm:text-sm',
                          isToday ? 'bg-ink font-semibold text-bg' : 'text-ink',
                        )}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {info.phase && (
                        <span aria-hidden className="text-[0.625rem] leading-none opacity-80 sm:text-xs">
                          {PHASES[info.phase].emoji}
                        </span>
                      )}
                    </span>
                    <span aria-hidden className="flex gap-0.5 text-[0.625rem] leading-none sm:text-xs">
                      {intimacyCount > 0 && <span>❤️</span>}
                      {hasSymptoms && <span>📝</span>}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
