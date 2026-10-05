/**
 * Lunelle cycle calculation engine.
 *
 * Pure, framework-free functions — no React, no Supabase, no `Date.now()`
 * hidden inside. Every function that depends on "today" takes it as an
 * argument so results are deterministic and testable.
 *
 * Terminology
 * -----------
 * - Cycle day 1 is the first day of a period.
 * - Cycle length is the number of days from one period start to the next.
 * - Estimated ovulation ≈ expected next period − 14 days (a typical luteal
 *   phase). This is an ESTIMATE; real ovulation varies between people and
 *   between cycles.
 * - Estimated fertile window = 5 days before estimated ovulation through
 *   1 day after it. Also an ESTIMATE — it can never guarantee anything.
 *
 * Recorded vs estimated
 * ---------------------
 * Only period days the user actually logged are "recorded". Every phase,
 * ovulation date, fertile window and future period is "estimated", and the
 * returned data carries that distinction so the UI can label it.
 */
import { addDaysISO, diffInDays, isBetweenInclusive, type ISODate } from '@/lib/dates';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Days from estimated ovulation to the next period. */
export const LUTEAL_PHASE_DAYS = 14;
export const FERTILE_DAYS_BEFORE_OVULATION = 5;
export const FERTILE_DAYS_AFTER_OVULATION = 1;
/** The "ovulation" phase is shown as estimated ovulation ± this many days. */
export const OVULATION_PHASE_HALF_WIDTH = 1;
/** Recorded cycles outside this range are treated as gaps in tracking. */
export const PLAUSIBLE_CYCLE_MIN = 15;
export const PLAUSIBLE_CYCLE_MAX = 60;
/** How many recent cycles/periods feed the prediction. */
export const PREDICTION_SAMPLE_SIZE = 6;
/** How many future cycles to project for the calendar. */
export const DEFAULT_PROJECTED_CYCLES = 12;

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal';

export interface PeriodInput {
  id?: string;
  startDate: ISODate;
  endDate: ISODate | null;
}

export interface CycleSettingsInput {
  averageCycleLength: number;
  averagePeriodLength: number;
}

export interface DateRange {
  start: ISODate;
  end: ISODate;
}

export interface CyclePrediction {
  /** Cycle length used for estimates (whole days). */
  cycleLength: number;
  /** Period length used for estimates (whole days). */
  periodLength: number;
  /** Whether the cycle length came from recorded history or from settings. */
  cycleLengthSource: 'history' | 'settings';
  periodLengthSource: 'history' | 'settings';
  /** Number of recorded cycles the cycle-length estimate is based on. */
  basedOnCycles: number;
}

export interface RecordedCycle {
  periodId?: string;
  startDate: ISODate;
  /** Last day of the cycle (the day before the next recorded period). */
  endDate: ISODate;
  length: number;
  periodStartDate: ISODate;
  /** Recorded end of the period, if the user logged one. */
  periodEndDate: ISODate | null;
  periodLength: number | null;
  /** False when the gap looks like missing records rather than a real cycle. */
  isPlausible: boolean;
  /** Retrospective estimate (next period start − 14 days). */
  estimatedOvulationDate: ISODate | null;
  estimatedFertileWindow: DateRange | null;
}

export type CycleKind = 'completed' | 'current' | 'projected';

export type PeriodDayStatus = 'recorded' | 'estimated';

export interface CycleSegment {
  kind: CycleKind;
  periodId?: string;
  startDate: ISODate;
  /**
   * Expected length: the actual length for completed cycles, the predicted
   * length for current/projected ones.
   */
  length: number;
  /** Last day covered by this segment (later than expected if a period is late). */
  lastDate: ISODate;
  /** Last day of bleeding (recorded or estimated). */
  periodEndDate: ISODate;
  /** Recorded period days run from startDate through this date (null = none recorded). */
  recordedPeriodThrough: ISODate | null;
  /** The user logged an end date for this segment's period. */
  hasRecordedPeriodEnd: boolean;
  ovulationDate: ISODate | null;
  fertileWindow: DateRange | null;
}

export interface CycleTimeline {
  today: ISODate;
  prediction: CyclePrediction;
  /** Ascending, non-overlapping. Empty when no period has been recorded. */
  segments: CycleSegment[];
}

export interface DayInfo {
  date: ISODate;
  cycleDay: number | null;
  cycleLength: number | null;
  cycleKind: CycleKind | null;
  phase: CyclePhase | null;
  /** True for anything not directly logged by the user. */
  isEstimated: boolean;
  isPeriod: boolean;
  periodStatus: PeriodDayStatus | null;
  isOvulationDay: boolean;
  isFertile: boolean;
  /** Day falls after the expected next period of the current cycle. */
  isLate: boolean;
}

export type FertileWindowStatus = 'upcoming' | 'active' | 'passed';

export interface CycleStatus {
  today: ISODate;
  cycleDay: number;
  cycleLength: number;
  phase: CyclePhase;
  phaseIsEstimated: boolean;
  lastPeriodStartDate: ISODate;
  lastPeriodEndDate: ISODate | null;
  /** Period has started and has no recorded end yet, within the expected length. */
  isPeriodOngoing: boolean;
  /** Period was started but no end date was recorded and the expected length has passed. */
  periodEndMissing: boolean;
  daysSinceLastPeriodStart: number;
  daysSinceLastPeriodEnd: number | null;
  nextPeriodDate: ISODate;
  /** Negative when the period is later than estimated. */
  daysUntilNextPeriod: number;
  isLate: boolean;
  daysLate: number;
  estimatedOvulationDate: ISODate;
  /** Negative once estimated ovulation has passed. */
  daysUntilOvulation: number;
  fertileWindow: DateRange;
  fertileWindowStatus: FertileWindowStatus;
  daysUntilFertileWindow: number;
  prediction: CyclePrediction;
}

export interface CycleStatistics {
  periodCount: number;
  cycleCount: number;
  averageCycleLength: number | null;
  shortestCycle: number | null;
  longestCycle: number | null;
  averagePeriodLength: number | null;
  shortestPeriod: number | null;
  longestPeriod: number | null;
  /** Difference between longest and shortest plausible cycle. */
  cycleVariation: number | null;
}

export type FertileContext = 'inside' | 'outside' | 'unknown';

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

export function sortPeriods<T extends PeriodInput>(periods: readonly T[]): T[] {
  return [...periods].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
}

/** Inclusive number of days in a period, or null when no end date is recorded. */
export function getPeriodDuration(period: PeriodInput): number | null {
  if (!period.endDate) return null;
  return diffInDays(period.startDate, period.endDate) + 1;
}

export function isPlausibleCycleLength(length: number): boolean {
  return length >= PLAUSIBLE_CYCLE_MIN && length <= PLAUSIBLE_CYCLE_MAX;
}

/** Estimated ovulation ≈ expected next period − 14 days. */
export function estimateOvulationDate(nextPeriodStart: ISODate): ISODate {
  return addDaysISO(nextPeriodStart, -LUTEAL_PHASE_DAYS);
}

export function estimateFertileWindow(ovulationDate: ISODate): DateRange {
  return {
    start: addDaysISO(ovulationDate, -FERTILE_DAYS_BEFORE_OVULATION),
    end: addDaysISO(ovulationDate, FERTILE_DAYS_AFTER_OVULATION),
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// -----------------------------------------------------------------------------
// History & statistics
// -----------------------------------------------------------------------------

/**
 * Completed cycles derived from recorded periods (ascending). A cycle is only
 * complete once the following period has been recorded, so N periods give
 * N − 1 cycles.
 */
export function getRecordedCycles(periods: readonly PeriodInput[]): RecordedCycle[] {
  const sorted = sortPeriods(periods);
  const cycles: RecordedCycle[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const length = diffInDays(current.startDate, next.startDate);
    const isPlausible = isPlausibleCycleLength(length);
    const ovulation = isPlausible ? estimateOvulationDate(next.startDate) : null;
    cycles.push({
      periodId: current.id,
      startDate: current.startDate,
      endDate: addDaysISO(next.startDate, -1),
      length,
      periodStartDate: current.startDate,
      periodEndDate: current.endDate,
      periodLength: getPeriodDuration(current),
      isPlausible,
      estimatedOvulationDate: ovulation,
      estimatedFertileWindow: ovulation ? estimateFertileWindow(ovulation) : null,
    });
  }
  return cycles;
}

export function getCycleStatistics(periods: readonly PeriodInput[]): CycleStatistics {
  const cycleLengths = getRecordedCycles(periods)
    .filter((c) => c.isPlausible)
    .map((c) => c.length);
  const periodLengths = periods
    .map(getPeriodDuration)
    .filter((d): d is number => d !== null);

  return {
    periodCount: periods.length,
    cycleCount: cycleLengths.length,
    averageCycleLength: mean(cycleLengths),
    shortestCycle: cycleLengths.length ? Math.min(...cycleLengths) : null,
    longestCycle: cycleLengths.length ? Math.max(...cycleLengths) : null,
    averagePeriodLength: mean(periodLengths),
    shortestPeriod: periodLengths.length ? Math.min(...periodLengths) : null,
    longestPeriod: periodLengths.length ? Math.max(...periodLengths) : null,
    cycleVariation: cycleLengths.length ? Math.max(...cycleLengths) - Math.min(...cycleLengths) : null,
  };
}

/**
 * The cycle and period lengths used for estimates. Recorded history wins
 * whenever it exists (most recent cycles, rounded to whole days); the user's
 * settings are only a fallback. Lunelle never assumes a 28-day cycle unless
 * that is what the user's data or settings say.
 */
export function getCyclePrediction(
  periods: readonly PeriodInput[],
  settings: CycleSettingsInput,
): CyclePrediction {
  const recentCycles = getRecordedCycles(periods)
    .filter((c) => c.isPlausible)
    .slice(-PREDICTION_SAMPLE_SIZE)
    .map((c) => c.length);
  const recentPeriods = sortPeriods(periods)
    .map(getPeriodDuration)
    .filter((d): d is number => d !== null)
    .slice(-PREDICTION_SAMPLE_SIZE);

  const historicalCycle = mean(recentCycles);
  const historicalPeriod = mean(recentPeriods);

  const cycleLength = Math.round(historicalCycle ?? settings.averageCycleLength);
  // A period can never fill the whole cycle; keep at least a few non-bleeding days.
  const periodLength = clamp(
    Math.round(historicalPeriod ?? settings.averagePeriodLength),
    1,
    Math.max(1, cycleLength - LUTEAL_PHASE_DAYS - 1),
  );

  return {
    cycleLength,
    periodLength,
    cycleLengthSource: historicalCycle === null ? 'settings' : 'history',
    periodLengthSource: historicalPeriod === null ? 'settings' : 'history',
    basedOnCycles: recentCycles.length,
  };
}

// -----------------------------------------------------------------------------
// Timeline
// -----------------------------------------------------------------------------

function buildOvulation(nextStart: ISODate, length: number) {
  if (!isPlausibleCycleLength(length)) return { ovulationDate: null, fertileWindow: null };
  const ovulationDate = estimateOvulationDate(nextStart);
  return { ovulationDate, fertileWindow: estimateFertileWindow(ovulationDate) };
}

/**
 * Build the full cycle timeline: completed cycles from recorded history, the
 * current cycle, and projected future cycles. All other queries (day info,
 * dashboard status, calendar, fertile context) read from this structure.
 *
 * Periods that start after `today` are ignored — the future is estimated,
 * never recorded.
 */
export function buildCycleTimeline(
  periods: readonly PeriodInput[],
  settings: CycleSettingsInput,
  today: ISODate,
  options: { projectedCycles?: number } = {},
): CycleTimeline {
  const projectedCycles = options.projectedCycles ?? DEFAULT_PROJECTED_CYCLES;
  const past = sortPeriods(periods.filter((p) => p.startDate <= today));
  const prediction = getCyclePrediction(past, settings);
  const segments: CycleSegment[] = [];

  if (past.length === 0) return { today, prediction, segments };

  // Completed cycles.
  for (let i = 0; i < past.length - 1; i++) {
    const period = past[i];
    const nextStart = past[i + 1].startDate;
    const length = diffInDays(period.startDate, nextStart);
    const lastDate = addDaysISO(nextStart, -1);
    const periodEndDate = period.endDate ?? addDaysISO(period.startDate, prediction.periodLength - 1);
    segments.push({
      kind: 'completed',
      periodId: period.id,
      startDate: period.startDate,
      length,
      lastDate,
      periodEndDate: periodEndDate > lastDate ? lastDate : periodEndDate,
      // Without an end date only the start day is known for certain.
      recordedPeriodThrough: period.endDate ?? period.startDate,
      hasRecordedPeriodEnd: period.endDate !== null,
      ...buildOvulation(nextStart, length),
    });
  }

  // Current cycle.
  const last = past[past.length - 1];
  const { cycleLength, periodLength } = prediction;
  const expectedNextStart = addDaysISO(last.startDate, cycleLength);
  const isLate = today >= expectedNextStart;
  const estimatedPeriodEnd = addDaysISO(last.startDate, periodLength - 1);
  segments.push({
    kind: 'current',
    periodId: last.id,
    startDate: last.startDate,
    length: cycleLength,
    lastDate: isLate ? today : addDaysISO(expectedNextStart, -1),
    periodEndDate: last.endDate ?? estimatedPeriodEnd,
    // An open (ongoing) period counts as recorded up to today.
    recordedPeriodThrough:
      last.endDate ?? (today < estimatedPeriodEnd ? today : estimatedPeriodEnd),
    hasRecordedPeriodEnd: last.endDate !== null,
    ...buildOvulation(expectedNextStart, cycleLength),
  });

  // Projected cycles. When the period is already late we don't stack further
  // guesses on top of a guess that has proven wrong.
  if (!isLate) {
    for (let k = 1; k <= projectedCycles; k++) {
      const start = addDaysISO(last.startDate, cycleLength * k);
      const nextStart = addDaysISO(start, cycleLength);
      segments.push({
        kind: 'projected',
        startDate: start,
        length: cycleLength,
        lastDate: addDaysISO(nextStart, -1),
        periodEndDate: addDaysISO(start, periodLength - 1),
        recordedPeriodThrough: null,
        hasRecordedPeriodEnd: false,
        ...buildOvulation(nextStart, cycleLength),
      });
    }
  }

  return { today, prediction, segments };
}

export function findSegment(timeline: CycleTimeline, date: ISODate): CycleSegment | null {
  const { segments } = timeline;
  // Binary search — segments are ascending and contiguous.
  let lo = 0;
  let hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid];
    if (date < seg.startDate) hi = mid - 1;
    else if (date > seg.lastDate) lo = mid + 1;
    else return seg;
  }
  return null;
}

/** Phase for a date within a known segment. Menstruation takes precedence. */
export function getPhaseForDate(segment: CycleSegment, date: ISODate): CyclePhase | null {
  if (date <= segment.periodEndDate) return 'menstruation';
  if (!segment.ovulationDate) return null;
  const offset = diffInDays(segment.ovulationDate, date);
  if (Math.abs(offset) <= OVULATION_PHASE_HALF_WIDTH) return 'ovulation';
  return offset < 0 ? 'follicular' : 'luteal';
}

export interface PhaseSpan {
  phase: CyclePhase | null;
  startDay: number;
  endDay: number;
}

/** Consecutive runs of the same phase across a segment's expected length. */
export function getPhaseSpans(segment: CycleSegment): PhaseSpan[] {
  const spans: PhaseSpan[] = [];
  for (let day = 1; day <= segment.length; day++) {
    const phase = getPhaseForDate(segment, addDaysISO(segment.startDate, day - 1));
    const last = spans[spans.length - 1];
    if (last && last.phase === phase) last.endDay = day;
    else spans.push({ phase, startDay: day, endDay: day });
  }
  return spans;
}

const EMPTY_DAY = {
  cycleDay: null,
  cycleLength: null,
  cycleKind: null,
  phase: null,
  isEstimated: true,
  isPeriod: false,
  periodStatus: null,
  isOvulationDay: false,
  isFertile: false,
  isLate: false,
} as const satisfies Omit<DayInfo, 'date'>;

export function getDayInfo(timeline: CycleTimeline, date: ISODate): DayInfo {
  const segment = findSegment(timeline, date);
  if (!segment) return { date, ...EMPTY_DAY };

  const cycleDay = diffInDays(segment.startDate, date) + 1;
  const phase = getPhaseForDate(segment, date);
  const isPeriod = phase === 'menstruation';
  const isRecordedPeriod =
    isPeriod && segment.recordedPeriodThrough !== null && date <= segment.recordedPeriodThrough;
  const isLate = segment.kind === 'current' && cycleDay > segment.length;

  return {
    date,
    cycleDay,
    cycleLength: segment.length,
    cycleKind: segment.kind,
    phase,
    isEstimated: !isRecordedPeriod,
    isPeriod,
    periodStatus: isPeriod ? (isRecordedPeriod ? 'recorded' : 'estimated') : null,
    isOvulationDay: segment.ovulationDate === date,
    isFertile:
      !isLate &&
      segment.fertileWindow !== null &&
      isBetweenInclusive(date, segment.fertileWindow.start, segment.fertileWindow.end),
    isLate,
  };
}

/**
 * Whether a date (e.g. of an intimacy record) falls inside the ESTIMATED
 * fertile window. Returns 'unknown' when there is no basis for an estimate:
 * before the first recorded period, beyond the projection horizon, during an
 * implausibly long recorded gap, or after the expected period when it is late.
 */
export function getFertileContext(timeline: CycleTimeline, date: ISODate): FertileContext {
  const segment = findSegment(timeline, date);
  if (!segment || !segment.fertileWindow) return 'unknown';
  const info = getDayInfo(timeline, date);
  if (info.isLate) return 'unknown';
  return info.isFertile ? 'inside' : 'outside';
}

// -----------------------------------------------------------------------------
// Current status (dashboard)
// -----------------------------------------------------------------------------

/** Status of the current cycle, or null when no period has been recorded yet. */
export function getCycleStatus(timeline: CycleTimeline): CycleStatus | null {
  const current = timeline.segments.find((s) => s.kind === 'current');
  if (!current || !current.ovulationDate || !current.fertileWindow) return null;
  const { today, prediction } = timeline;
  const day = getDayInfo(timeline, today);

  const cycleDay = diffInDays(current.startDate, today) + 1;
  const nextPeriodDate = addDaysISO(current.startDate, current.length);
  const daysUntilNextPeriod = diffInDays(today, nextPeriodDate);
  const isLate = daysUntilNextPeriod <= 0;
  const hasRecordedEnd = current.hasRecordedPeriodEnd;
  const fertile = current.fertileWindow;

  let fertileWindowStatus: FertileWindowStatus;
  if (today < fertile.start) fertileWindowStatus = 'upcoming';
  else if (today <= fertile.end && !isLate) fertileWindowStatus = 'active';
  else fertileWindowStatus = 'passed';

  return {
    today,
    cycleDay,
    cycleLength: current.length,
    phase: day.phase ?? 'luteal',
    phaseIsEstimated: day.isEstimated,
    lastPeriodStartDate: current.startDate,
    lastPeriodEndDate: hasRecordedEnd ? current.periodEndDate : null,
    isPeriodOngoing: !hasRecordedEnd && today <= current.periodEndDate,
    periodEndMissing: !hasRecordedEnd && today > current.periodEndDate,
    daysSinceLastPeriodStart: cycleDay - 1,
    daysSinceLastPeriodEnd: hasRecordedEnd ? diffInDays(current.periodEndDate, today) : null,
    nextPeriodDate,
    daysUntilNextPeriod,
    isLate,
    daysLate: isLate ? -daysUntilNextPeriod : 0,
    estimatedOvulationDate: current.ovulationDate,
    daysUntilOvulation: diffInDays(today, current.ovulationDate),
    fertileWindow: fertile,
    fertileWindowStatus,
    daysUntilFertileWindow: diffInDays(today, fertile.start),
    prediction,
  };
}
