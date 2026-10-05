import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { PHASES } from '@/features/cycle/phases';
import type { DayInfo } from '@/features/cycle/services/cycleCalculator';
import { formatDate, parseISODate, toISODate, type ISODate } from '@/lib/dates';

/** 1 = Monday. Change to 0 for Sunday-first calendars. */
export const WEEK_STARTS_ON = 1 as const;

/** Weeks (rows of 7 ISO dates) covering the month containing `monthDate`. */
export function buildMonthGrid(monthDate: ISODate, weekStartsOn: 0 | 1 = WEEK_STARTS_ON): ISODate[][] {
  const date = parseISODate(monthDate);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn }),
  }).map(toISODate);
  const weeks: ISODate[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function weekdayLabels(weekStartsOn: 0 | 1 = WEEK_STARTS_ON): { short: string; long: string }[] {
  // 2026-10-04 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const day = toISODate(new Date(2026, 9, 4 + weekStartsOn + i));
    return { short: formatDate(day, 'EEEEEE'), long: formatDate(day, 'EEEE') };
  });
}

export function firstOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function isSameMonthISO(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Full spoken description of a calendar day, so nothing relies on colour. */
export function describeDay(
  info: DayInfo,
  extras: { isToday: boolean; intimacyCount: number; hasSymptoms: boolean },
): string {
  const parts = [formatDate(info.date, 'EEEE, MMMM d')];
  if (extras.isToday) parts.push('Today');
  if (info.cycleDay !== null) parts.push(`Cycle day ${info.cycleDay}`);
  if (info.isPeriod) {
    parts.push(info.periodStatus === 'recorded' ? 'Period, recorded' : 'Period, estimated');
  } else if (info.phase) {
    parts.push(`${PHASES[info.phase].label}, estimated`);
  }
  if (info.isOvulationDay) parts.push('Estimated ovulation');
  if (info.isFertile) parts.push('Estimated fertile window');
  if (info.isLate) parts.push('Period later than estimated');
  if (extras.intimacyCount > 0) {
    parts.push(extras.intimacyCount === 1 ? 'Intimacy recorded' : `${extras.intimacyCount} intimacy records`);
  }
  if (extras.hasSymptoms) parts.push('Symptoms logged');
  return parts.join('. ');
}
