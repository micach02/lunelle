// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCycleTimeline, getDayInfo } from '@/features/cycle/services/cycleCalculator';
import { buildMonthGrid, describeDay, firstOfMonth, weekdayLabels } from './calendarModel';

describe('month grid', () => {
  it('pads October 2026 to full Monday-first weeks', () => {
    const weeks = buildMonthGrid('2026-10-01');
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe('2026-09-28');
    expect(weeks.at(-1)!.at(-1)).toBe('2026-11-01');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('handles February in common and leap years', () => {
    expect(buildMonthGrid('2027-02-01').flat()).not.toContain('2027-02-29');
    expect(buildMonthGrid('2028-02-01').flat()).toContain('2028-02-29');
  });

  it('supports Sunday-first weeks', () => {
    expect(buildMonthGrid('2026-10-01', 0)[0][0]).toBe('2026-09-27');
    expect(weekdayLabels(0)[0].long).toBe('Sunday');
    expect(weekdayLabels(1)[0].long).toBe('Monday');
  });

  it('normalises any date to the first of its month', () => {
    expect(firstOfMonth('2026-12-31')).toBe('2026-12-01');
  });
});

describe('accessible day descriptions', () => {
  const timeline = buildCycleTimeline(
    [{ startDate: '2026-10-01', endDate: '2026-10-05' }],
    { averageCycleLength: 28, averagePeriodLength: 5 },
    '2026-10-04',
  );

  it('describes phase, recorded/estimated status and records in words', () => {
    expect(describeDay(getDayInfo(timeline, '2026-10-02'), { isToday: false, intimacyCount: 0, hasSymptoms: true })).toBe(
      'Friday, October 2. Cycle day 2. Period, recorded. Symptoms logged',
    );
    expect(describeDay(getDayInfo(timeline, '2026-10-15'), { isToday: false, intimacyCount: 1, hasSymptoms: false })).toBe(
      'Thursday, October 15. Cycle day 15. Ovulation, estimated. Estimated ovulation. Estimated fertile window. Intimacy recorded',
    );
    expect(describeDay(getDayInfo(timeline, '2026-10-29'), { isToday: false, intimacyCount: 0, hasSymptoms: false })).toBe(
      'Thursday, October 29. Cycle day 1. Period, estimated',
    );
  });
});
