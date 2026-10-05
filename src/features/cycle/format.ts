import { pluralizeDays } from '@/lib/dates';
import type { CyclePrediction, CycleStatus } from './services/cycleCalculator';

/** "today", "tomorrow", "in 3 days", "yesterday", "4 days ago" */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${pluralizeDays(days)}` : `${pluralizeDays(-days)} ago`;
}

export function nextPeriodPhrase(status: CycleStatus): string {
  if (status.isLate) {
    return status.daysLate === 0 ? 'expected today' : `${pluralizeDays(status.daysLate)} later than estimated`;
  }
  return relativeDays(status.daysUntilNextPeriod);
}

export function ovulationPhrase(status: CycleStatus): string {
  return relativeDays(status.daysUntilOvulation);
}

export function predictionBasis(prediction: CyclePrediction): string {
  if (prediction.cycleLengthSource === 'history') {
    return prediction.basedOnCycles === 1
      ? 'Based on your recorded cycle'
      : `Based on your last ${prediction.basedOnCycles} recorded cycles`;
  }
  return 'Based on your cycle settings — estimates improve as you record periods';
}

export function greeting(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
