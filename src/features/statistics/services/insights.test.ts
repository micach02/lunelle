// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCycleTimeline } from '@/features/cycle/services/cycleCalculator';
import type { SymptomLog } from '@/types/domain';
import { getMoodDistribution, getSymptomTrends } from './insights';

const timeline = buildCycleTimeline(
  [{ startDate: '2026-09-01', endDate: '2026-09-05' }],
  { averageCycleLength: 28, averagePeriodLength: 5 },
  '2026-09-28',
);

const log = (date: string, symptoms: SymptomLog['symptoms'], mood: SymptomLog['mood'] = null): SymptomLog => ({
  id: date,
  date,
  symptoms,
  mood,
  notes: null,
});

describe('symptom trends', () => {
  it('counts symptoms in the window, most frequent first, with their usual phase', () => {
    const trends = getSymptomTrends(
      [
        log('2026-09-01', ['cramps', 'fatigue']),
        log('2026-09-02', ['cramps']),
        log('2026-09-25', ['bloating', 'fatigue']),
        log('2026-05-01', ['headache']), // outside the 90-day window
      ],
      timeline,
      '2026-09-28',
    );
    expect(trends).toEqual([
      { symptom: 'cramps', count: 2, commonPhase: 'menstruation' },
      // Ties keep the first phase seen.
      { symptom: 'fatigue', count: 2, commonPhase: 'menstruation' },
      { symptom: 'bloating', count: 1, commonPhase: 'luteal' },
    ]);
    expect(trends.some((t) => t.symptom === 'headache')).toBe(false);
  });

  it('reports no phase when there is no cycle estimate for the date', () => {
    const [trend] = getSymptomTrends([log('2026-08-20', ['acne'])], timeline, '2026-09-28');
    expect(trend).toEqual({ symptom: 'acne', count: 1, commonPhase: null });
  });
});

describe('mood distribution', () => {
  it('counts moods within the window in a stable order', () => {
    expect(
      getMoodDistribution(
        [log('2026-09-20', [], 'tired'), log('2026-09-21', [], 'happy'), log('2026-09-22', [], 'tired')],
        '2026-09-28',
      ),
    ).toEqual([
      { mood: 'happy', count: 1 },
      { mood: 'tired', count: 2 },
    ]);
  });
});
