// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describeScopes } from '../scopes';
import { parseSharedData } from './partnerService';

describe('parseSharedData', () => {
  it('maps shared JSON into domain objects and keeps unshared categories null', () => {
    const data = parseSharedData({
      owner_name: 'Sarah',
      share_symptoms: true,
      share_intimacy: false,
      share_notes: false,
      settings: { average_cycle_length: 31, average_period_length: 6 },
      periods: [{ id: 'p1', start_date: '2026-09-29', end_date: null }],
      symptoms: [{ id: 's1', symptom_date: '2026-09-30', symptoms: ['cramps', 'bogus'], mood: 'tired', notes: null }],
      intimacy: null,
    });
    expect(data).toEqual({
      ownerName: 'Sarah',
      scopes: { symptoms: true, intimacy: false, notes: false, canEdit: false },
      settings: { averageCycleLength: 31, averagePeriodLength: 6 },
      periods: [{ id: 'p1', startDate: '2026-09-29', endDate: null, enteredByPartner: false }],
      symptoms: [{ id: 's1', date: '2026-09-30', symptoms: ['cramps'], mood: 'tired', notes: null, enteredByPartner: false }],
      intimacy: null,
    });
  });

  it('falls back safely on missing fields', () => {
    expect(parseSharedData(null)).toMatchObject({
      ownerName: 'Your partner',
      settings: { averageCycleLength: 28, averagePeriodLength: 5 },
      periods: [],
      symptoms: null,
      intimacy: null,
    });
  });
});

describe('describeScopes', () => {
  it('always includes cycle data and lists extra categories', () => {
    expect(describeScopes({ symptoms: false, intimacy: false, notes: false, canEdit: false })).toBe('Cycle phases & periods.');
    expect(describeScopes({ symptoms: true, intimacy: true, notes: true, canEdit: false })).toBe(
      'Cycle phases & periods, symptoms & mood and intimacy records, including notes.',
    );
    expect(describeScopes({ symptoms: false, intimacy: false, notes: false, canEdit: true })).toBe(
      'Cycle phases & periods. Can add and edit (not delete) records.',
    );
  });

  it('ignores the notes flag when nothing with notes is shared', () => {
    expect(describeScopes({ symptoms: false, intimacy: false, notes: true, canEdit: false })).toBe('Cycle phases & periods.');
  });
});
