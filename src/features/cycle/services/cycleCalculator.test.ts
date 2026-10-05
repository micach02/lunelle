// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { addDaysISO } from '@/lib/dates';
import {
  buildCycleTimeline,
  estimateFertileWindow,
  estimateOvulationDate,
  getCyclePrediction,
  getCycleStatistics,
  getCycleStatus,
  getDayInfo,
  getFertileContext,
  getPeriodDuration,
  getPhaseSpans,
  getRecordedCycles,
  type CycleSettingsInput,
  type PeriodInput,
} from './cycleCalculator';

const settings = (averageCycleLength = 28, averagePeriodLength = 5): CycleSettingsInput => ({
  averageCycleLength,
  averagePeriodLength,
});

/** Periods starting at `firstStart`, separated by the given cycle lengths. */
function periodsWithCycles(firstStart: string, cycleLengths: number[], periodLength = 5): PeriodInput[] {
  const periods: PeriodInput[] = [];
  let start = firstStart;
  for (let i = 0; i <= cycleLengths.length; i++) {
    periods.push({ id: `p${i}`, startDate: start, endDate: addDaysISO(start, periodLength - 1) });
    if (i < cycleLengths.length) start = addDaysISO(start, cycleLengths[i]);
  }
  return periods;
}

describe('estimation formulas', () => {
  it('estimates ovulation as expected next period − 14 days', () => {
    expect(estimateOvulationDate('2026-10-31')).toBe('2026-10-17');
  });

  it('estimates the fertile window as 5 days before through 1 day after ovulation', () => {
    expect(estimateFertileWindow('2026-10-17')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });

  it('computes inclusive period durations', () => {
    expect(getPeriodDuration({ startDate: '2026-10-02', endDate: '2026-10-06' })).toBe(5);
    expect(getPeriodDuration({ startDate: '2026-10-02', endDate: '2026-10-02' })).toBe(1);
    expect(getPeriodDuration({ startDate: '2026-10-02', endDate: null })).toBeNull();
  });
});

describe.each([21, 28, 29, 30, 35])('a %i-day cycle', (cycleLength) => {
  const start = '2026-03-02';
  const periods: PeriodInput[] = [{ id: 'p1', startDate: start, endDate: '2026-03-06' }];
  const ovulationDay = cycleLength - 13; // cycle day of (next period − 14)
  const ovulationDate = addDaysISO(start, ovulationDay - 1);
  const timelineOn = (today: string) => buildCycleTimeline(periods, settings(cycleLength, 5), today);
  const day = (n: number) => addDaysISO(start, n - 1); // date of cycle day n

  it('day 1 is a recorded menstruation day', () => {
    const status = getCycleStatus(timelineOn(start))!;
    expect(status.cycleDay).toBe(1);
    expect(status.phase).toBe('menstruation');
    expect(status.phaseIsEstimated).toBe(false);
    expect(status.daysUntilNextPeriod).toBe(cycleLength);
    expect(status.daysSinceLastPeriodStart).toBe(0);
  });

  it('the last recorded period day is menstruation, the next day is follicular', () => {
    const t = timelineOn(day(10));
    expect(getDayInfo(t, day(5))).toMatchObject({ phase: 'menstruation', periodStatus: 'recorded' });
    expect(getDayInfo(t, day(6))).toMatchObject({ phase: 'follicular', isPeriod: false, isEstimated: true });
  });

  it(`estimates ovulation on cycle day ${cycleLength - 13}`, () => {
    const t = timelineOn(start);
    const info = getDayInfo(t, ovulationDate);
    expect(info.cycleDay).toBe(ovulationDay);
    expect(info.phase).toBe('ovulation');
    expect(info.isOvulationDay).toBe(true);
    expect(info.isEstimated).toBe(true);
    expect(getCycleStatus(t)!.estimatedOvulationDate).toBe(ovulationDate);
    expect(getCycleStatus(t)!.daysUntilOvulation).toBe(ovulationDay - 1);
  });

  it('places the fertile window from ovulation −5 to ovulation +1', () => {
    const t = timelineOn(start);
    expect(getDayInfo(t, addDaysISO(ovulationDate, -6)).isFertile).toBe(false);
    expect(getDayInfo(t, addDaysISO(ovulationDate, -5)).isFertile).toBe(true);
    expect(getDayInfo(t, ovulationDate).isFertile).toBe(true);
    expect(getDayInfo(t, addDaysISO(ovulationDate, 1)).isFertile).toBe(true);
    expect(getDayInfo(t, addDaysISO(ovulationDate, 2)).isFertile).toBe(false);
  });

  it('is in the luteal phase two days after estimated ovulation until the cycle ends', () => {
    const t = timelineOn(start);
    expect(getDayInfo(t, addDaysISO(ovulationDate, 2)).phase).toBe('luteal');
    expect(getDayInfo(t, day(cycleLength))).toMatchObject({ phase: 'luteal', cycleDay: cycleLength });
  });

  it('expects the next period after exactly one cycle length', () => {
    const lastDay = getCycleStatus(timelineOn(day(cycleLength)))!;
    expect(lastDay.nextPeriodDate).toBe(day(cycleLength + 1));
    expect(lastDay.daysUntilNextPeriod).toBe(1);
    expect(lastDay.isLate).toBe(false);

    const next = getDayInfo(timelineOn(start), day(cycleLength + 1));
    expect(next).toMatchObject({
      cycleDay: 1,
      cycleKind: 'projected',
      phase: 'menstruation',
      periodStatus: 'estimated',
    });
  });

  it('derives the same estimates from recorded history', () => {
    const history = periodsWithCycles('2025-10-01', [cycleLength, cycleLength, cycleLength]);
    const prediction = getCyclePrediction(history, settings(28, 5));
    expect(prediction).toMatchObject({ cycleLength, cycleLengthSource: 'history', basedOnCycles: 3 });
  });
});

describe('phase ordering', () => {
  it('walks menstruation → follicular → ovulation → luteal across a 30-day cycle', () => {
    const t = buildCycleTimeline([{ startDate: '2026-05-01', endDate: '2026-05-05' }], settings(30), '2026-05-01');
    const phases = Array.from({ length: 30 }, (_, i) => getDayInfo(t, addDaysISO('2026-05-01', i)).phase);
    const collapsed = phases.filter((p, i) => p !== phases[i - 1]);
    expect(collapsed).toEqual(['menstruation', 'follicular', 'ovulation', 'luteal']);
    // ovulation phase is estimated ovulation ± 1 day
    expect(phases.filter((p) => p === 'ovulation')).toHaveLength(3);
  });
});

describe('phase spans', () => {
  it('splits a 28-day cycle into contiguous phase runs', () => {
    const t = buildCycleTimeline([{ startDate: '2026-05-01', endDate: '2026-05-05' }], settings(28), '2026-05-01');
    const current = t.segments.find((s) => s.kind === 'current')!;
    expect(getPhaseSpans(current)).toEqual([
      { phase: 'menstruation', startDay: 1, endDay: 5 },
      { phase: 'follicular', startDay: 6, endDay: 13 },
      { phase: 'ovulation', startDay: 14, endDay: 16 },
      { phase: 'luteal', startDay: 17, endDay: 28 },
    ]);
  });
});

describe('prediction from recorded history', () => {
  it('uses the average of recorded cycles instead of assuming 28 days', () => {
    const periods = periodsWithCycles('2026-01-01', [29, 31, 30]);
    expect(getCyclePrediction(periods, settings(28, 5))).toMatchObject({
      cycleLength: 30,
      cycleLengthSource: 'history',
    });
  });

  it('falls back to settings when there is no completed cycle yet', () => {
    const periods = [{ startDate: '2026-01-01', endDate: null }];
    expect(getCyclePrediction(periods, settings(33, 6))).toEqual({
      cycleLength: 33,
      periodLength: 6,
      cycleLengthSource: 'settings',
      periodLengthSource: 'settings',
      basedOnCycles: 0,
    });
  });

  it('ignores implausible gaps that indicate missing records', () => {
    const periods = periodsWithCycles('2026-01-01', [28, 90, 30]);
    const prediction = getCyclePrediction(periods, settings());
    expect(prediction.cycleLength).toBe(29);
    expect(prediction.basedOnCycles).toBe(2);
  });

  it('uses only the most recent six cycles', () => {
    const periods = periodsWithCycles('2025-01-01', [40, 40, 40, 30, 30, 30, 30, 30, 30]);
    expect(getCyclePrediction(periods, settings()).cycleLength).toBe(30);
  });

  it('uses recorded period durations for the period length', () => {
    const periods = periodsWithCycles('2026-01-01', [28, 28], 4);
    expect(getCyclePrediction(periods, settings(28, 7))).toMatchObject({
      periodLength: 4,
      periodLengthSource: 'history',
    });
  });
});

describe('cycle history & statistics', () => {
  it('builds completed cycles with retrospective ovulation estimates', () => {
    const cycles = getRecordedCycles([
      { startDate: '2026-10-02', endDate: '2026-10-06' },
      { startDate: '2026-09-04', endDate: '2026-09-08' },
      { startDate: '2026-10-31', endDate: null },
    ]);
    expect(cycles).toHaveLength(2);
    expect(cycles[0]).toMatchObject({ startDate: '2026-09-04', length: 28, periodLength: 5, endDate: '2026-10-01' });
    expect(cycles[0].estimatedOvulationDate).toBe('2026-09-18');
    expect(cycles[1]).toMatchObject({ startDate: '2026-10-02', length: 29 });
    expect(cycles[1].estimatedOvulationDate).toBe('2026-10-17');
  });

  it('computes average, shortest and longest cycles and period durations', () => {
    const stats = getCycleStatistics([
      { startDate: '2026-01-01', endDate: '2026-01-05' }, // 5 days, cycle 26
      { startDate: '2026-01-27', endDate: '2026-01-30' }, // 4 days, cycle 33
      { startDate: '2026-03-01', endDate: '2026-03-06' }, // 6 days, cycle 29
      { startDate: '2026-03-30', endDate: null },
    ]);
    expect(stats).toEqual({
      periodCount: 4,
      cycleCount: 3,
      averageCycleLength: 29.333333333333332,
      shortestCycle: 26,
      longestCycle: 33,
      averagePeriodLength: 5,
      shortestPeriod: 4,
      longestPeriod: 6,
      cycleVariation: 7,
    });
  });

  it('returns empty statistics with no data', () => {
    expect(getCycleStatistics([])).toMatchObject({
      cycleCount: 0,
      averageCycleLength: null,
      shortestCycle: null,
      averagePeriodLength: null,
    });
  });

  it('marks implausible gaps and gives them no ovulation estimate', () => {
    const [cycle] = getRecordedCycles([
      { startDate: '2026-01-01', endDate: null },
      { startDate: '2026-04-15', endDate: null },
    ]);
    expect(cycle.isPlausible).toBe(false);
    expect(cycle.estimatedOvulationDate).toBeNull();
  });
});

describe('month and year boundaries', () => {
  it('handles a cycle crossing a month boundary', () => {
    const t = buildCycleTimeline([{ startDate: '2026-01-25', endDate: '2026-01-29' }], settings(30), '2026-01-31');
    const status = getCycleStatus(t)!;
    expect(status.cycleDay).toBe(7);
    expect(status.nextPeriodDate).toBe('2026-02-24');
    expect(status.estimatedOvulationDate).toBe('2026-02-10');
    expect(getDayInfo(t, '2026-02-01').cycleDay).toBe(8);
  });

  it('handles a cycle crossing a year boundary', () => {
    const t = buildCycleTimeline([{ startDate: '2026-12-20', endDate: '2026-12-24' }], settings(28), '2027-01-02');
    const status = getCycleStatus(t)!;
    expect(status.cycleDay).toBe(14);
    expect(status.nextPeriodDate).toBe('2027-01-17');
    expect(status.estimatedOvulationDate).toBe('2027-01-03');
  });

  it('measures recorded cycle lengths across months of different lengths', () => {
    const cycles = getRecordedCycles([
      { startDate: '2026-01-31', endDate: null },
      { startDate: '2026-03-01', endDate: null },
      { startDate: '2026-03-31', endDate: null },
    ]);
    expect(cycles.map((c) => c.length)).toEqual([29, 30]);
  });
});

describe('leap years', () => {
  it('counts 29 February in a leap year', () => {
    const t = buildCycleTimeline([{ startDate: '2028-02-15', endDate: '2028-02-19' }], settings(28), '2028-02-15');
    expect(getCycleStatus(t)!.nextPeriodDate).toBe('2028-03-14');
    expect(getDayInfo(t, '2028-02-29').cycleDay).toBe(15);
  });

  it('does not invent 29 February in a common year', () => {
    const t = buildCycleTimeline([{ startDate: '2027-02-15', endDate: '2027-02-19' }], settings(28), '2027-02-15');
    expect(getCycleStatus(t)!.nextPeriodDate).toBe('2027-03-15');
  });

  it('accepts a period starting on 29 February', () => {
    const t = buildCycleTimeline([{ startDate: '2028-02-29', endDate: null }], settings(28), '2028-03-02');
    const status = getCycleStatus(t)!;
    expect(status.cycleDay).toBe(3);
    expect(status.nextPeriodDate).toBe('2028-03-28');
  });

  it('measures a recorded cycle spanning 29 February', () => {
    const [cycle] = getRecordedCycles([
      { startDate: '2028-02-10', endDate: null },
      { startDate: '2028-03-10', endDate: null },
    ]);
    expect(cycle.length).toBe(29);
  });
});

describe('ongoing, late and missing data', () => {
  it('treats an open period as ongoing: recorded through today, estimated afterwards', () => {
    const t = buildCycleTimeline([{ startDate: '2026-10-01', endDate: null }], settings(28, 5), '2026-10-03');
    const status = getCycleStatus(t)!;
    expect(status.isPeriodOngoing).toBe(true);
    expect(status.periodEndMissing).toBe(false);
    expect(status.lastPeriodEndDate).toBeNull();
    expect(getDayInfo(t, '2026-10-03').periodStatus).toBe('recorded');
    expect(getDayInfo(t, '2026-10-04').periodStatus).toBe('estimated');
    expect(getDayInfo(t, '2026-10-06').isPeriod).toBe(false);
  });

  it('flags a period whose end date was never recorded', () => {
    const t = buildCycleTimeline([{ startDate: '2026-10-01', endDate: null }], settings(28, 5), '2026-10-12');
    expect(getCycleStatus(t)).toMatchObject({ isPeriodOngoing: false, periodEndMissing: true });
  });

  it('reports a late period and stops projecting future cycles', () => {
    const t = buildCycleTimeline([{ startDate: '2026-09-01', endDate: '2026-09-05' }], settings(28), '2026-10-02');
    const status = getCycleStatus(t)!;
    expect(status.nextPeriodDate).toBe('2026-09-29');
    expect(status).toMatchObject({ isLate: true, daysLate: 3, daysUntilNextPeriod: -3, cycleDay: 32 });
    expect(status.fertileWindowStatus).toBe('passed');
    expect(t.segments.some((s) => s.kind === 'projected')).toBe(false);
    expect(getDayInfo(t, '2026-10-02')).toMatchObject({ isLate: true, isFertile: false });
    expect(getFertileContext(t, '2026-10-02')).toBe('unknown');
    expect(getDayInfo(t, '2026-10-10').cycleDay).toBeNull();
  });

  it('has no status and no estimates without any recorded period', () => {
    const t = buildCycleTimeline([], settings(), '2026-10-04');
    expect(getCycleStatus(t)).toBeNull();
    expect(getDayInfo(t, '2026-10-04')).toMatchObject({ phase: null, cycleDay: null, isFertile: false });
    expect(getFertileContext(t, '2026-10-04')).toBe('unknown');
  });

  it('ignores periods dated in the future', () => {
    const t = buildCycleTimeline(
      [
        { startDate: '2026-09-20', endDate: '2026-09-24' },
        { startDate: '2026-11-01', endDate: null },
      ],
      settings(28),
      '2026-10-04',
    );
    expect(getCycleStatus(t)!.lastPeriodStartDate).toBe('2026-09-20');
  });

  it('reports days since the last period ended', () => {
    const t = buildCycleTimeline([{ startDate: '2026-09-20', endDate: '2026-09-24' }], settings(28), '2026-10-04');
    expect(getCycleStatus(t)).toMatchObject({ lastPeriodEndDate: '2026-09-24', daysSinceLastPeriodEnd: 10 });
  });
});

describe('fertile window status & context', () => {
  const periods = [{ startDate: '2026-10-01', endDate: '2026-10-05' }];
  // 28-day cycle → next period Oct 29 → ovulation Oct 15 → window Oct 10–16

  it.each([
    ['2026-10-04', 'upcoming', 6],
    ['2026-10-10', 'active', 0],
    ['2026-10-16', 'active', -6],
    ['2026-10-17', 'passed', -7],
  ] as const)('on %s the window is %s', (today, statusValue, daysUntil) => {
    const status = getCycleStatus(buildCycleTimeline(periods, settings(28), today))!;
    expect(status.fertileWindow).toEqual({ start: '2026-10-10', end: '2026-10-16' });
    expect(status.fertileWindowStatus).toBe(statusValue);
    expect(status.daysUntilFertileWindow).toBe(daysUntil);
  });

  it('classifies dates inside and outside the estimated window', () => {
    const t = buildCycleTimeline(periods, settings(28), '2026-10-20');
    expect(getFertileContext(t, '2026-10-12')).toBe('inside');
    expect(getFertileContext(t, '2026-10-20')).toBe('outside');
    expect(getFertileContext(t, '2026-09-01')).toBe('unknown'); // before any record
  });

  it('uses retrospective estimates for past cycles', () => {
    const t = buildCycleTimeline(
      [
        { startDate: '2026-09-01', endDate: '2026-09-05' },
        { startDate: '2026-10-01', endDate: '2026-10-05' }, // 30-day cycle → ovulation Sep 17
      ],
      settings(28),
      '2026-10-04',
    );
    expect(getDayInfo(t, '2026-09-17')).toMatchObject({ isOvulationDay: true, cycleKind: 'completed' });
    expect(getFertileContext(t, '2026-09-12')).toBe('inside');
    expect(getFertileContext(t, '2026-09-11')).toBe('outside');
  });
});
