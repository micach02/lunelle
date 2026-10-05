import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameYear,
  isValid,
  parseISO,
} from 'date-fns';

/**
 * A calendar date in `yyyy-MM-dd` form. Cycle maths works exclusively on
 * calendar dates (never instants) so it is immune to timezone and DST shifts.
 * ISO dates also sort correctly as plain strings.
 */
export type ISODate = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && ISO_DATE_RE.test(value) && isValid(parseISO(value));
}

/** Local-midnight Date for an ISO calendar date. */
export function parseISODate(value: ISODate): Date {
  const date = parseISO(value);
  if (!ISO_DATE_RE.test(value) || !isValid(date)) {
    throw new RangeError('Invalid ISO calendar date');
  }
  return date;
}

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDaysISO(value: ISODate, amount: number): ISODate {
  return toISODate(addDays(parseISODate(value), amount));
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function diffInDays(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISODate(to), parseISODate(from));
}

export function isBetweenInclusive(value: ISODate, start: ISODate, end: ISODate): boolean {
  return value >= start && value <= end;
}

export function formatDate(value: ISODate, pattern = 'MMM d'): string {
  return format(parseISODate(value), pattern);
}

/** "Oct 2–6", "Sep 29 – Oct 3", "Dec 30, 2025 – Jan 3, 2026" */
export function formatDateRange(start: ISODate, end: ISODate | null): string {
  if (!end || end === start) return formatDate(start);
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (!isSameYear(a, b)) return `${format(a, 'MMM d, yyyy')} – ${format(b, 'MMM d, yyyy')}`;
  if (isSameMonth(a, b)) return `${format(a, 'MMM d')}–${format(b, 'd')}`;
  return `${format(a, 'MMM d')} – ${format(b, 'MMM d')}`;
}

/** Local calendar date of a timestamp (e.g. an intimacy record's occurred_at). */
export function isoDateFromTimestamp(timestamp: string): ISODate {
  return toISODate(new Date(timestamp));
}

/** `<input type="datetime-local">` value for a timestamp, in local time. */
export function toDateTimeLocalValue(timestamp: string | Date): string {
  return format(typeof timestamp === 'string' ? new Date(timestamp) : timestamp, "yyyy-MM-dd'T'HH:mm");
}

/** Convert a `datetime-local` value (local wall time) to a UTC ISO timestamp. */
export function fromDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (!isValid(date)) throw new RangeError('Invalid date/time');
  return date.toISOString();
}

export function pluralizeDays(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'day' : 'days'}`;
}
