import { getDayInfo, type CyclePhase, type CycleTimeline } from '@/features/cycle/services/cycleCalculator';
import { addDaysISO, type ISODate } from '@/lib/dates';
import { MOODS, SYMPTOM_KEYS, type Mood, type SymptomKey, type SymptomLog } from '@/types/domain';

export const SYMPTOM_TREND_WINDOW_DAYS = 90;

export interface SymptomTrend {
  symptom: SymptomKey;
  /** Days on which the symptom was logged within the window. */
  count: number;
  /** Estimated phase in which it was most often logged (null if no estimate). */
  commonPhase: CyclePhase | null;
}

/** How often each symptom was logged in the window, most frequent first. */
export function getSymptomTrends(
  logs: readonly SymptomLog[],
  timeline: CycleTimeline,
  today: ISODate,
  windowDays = SYMPTOM_TREND_WINDOW_DAYS,
): SymptomTrend[] {
  const since = addDaysISO(today, -(windowDays - 1));
  const counts = new Map<SymptomKey, { count: number; phases: Map<CyclePhase, number> }>();

  for (const log of logs) {
    if (log.date < since || log.date > today) continue;
    const phase = getDayInfo(timeline, log.date).phase;
    for (const symptom of log.symptoms) {
      const entry = counts.get(symptom) ?? { count: 0, phases: new Map() };
      entry.count += 1;
      if (phase) entry.phases.set(phase, (entry.phases.get(phase) ?? 0) + 1);
      counts.set(symptom, entry);
    }
  }

  return SYMPTOM_KEYS.filter((k) => counts.has(k))
    .map((symptom) => {
      const { count, phases } = counts.get(symptom)!;
      let commonPhase: CyclePhase | null = null;
      let best = 0;
      for (const [phase, n] of phases) {
        if (n > best) {
          best = n;
          commonPhase = phase;
        }
      }
      return { symptom, count, commonPhase };
    })
    .sort((a, b) => b.count - a.count);
}

export interface MoodCount {
  mood: Mood;
  count: number;
}

export function getMoodDistribution(
  logs: readonly SymptomLog[],
  today: ISODate,
  windowDays = SYMPTOM_TREND_WINDOW_DAYS,
): MoodCount[] {
  const since = addDaysISO(today, -(windowDays - 1));
  const counts = new Map<Mood, number>();
  for (const log of logs) {
    if (log.mood && log.date >= since && log.date <= today) {
      counts.set(log.mood, (counts.get(log.mood) ?? 0) + 1);
    }
  }
  return MOODS.filter((m) => counts.has(m)).map((mood) => ({ mood, count: counts.get(mood)! }));
}
