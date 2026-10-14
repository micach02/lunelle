// @vitest-environment node
/**
 * CRUD service layer: verifies each operation targets the right table, scopes
 * writes to the signed-in user, maps rows to domain objects, and surfaces
 * errors. Server-side enforcement (RLS) is covered in tests/db/rls.test.ts.
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as intimacyService from '@/features/intimacy/services/intimacyService';
import * as periodService from '@/features/periods/services/periodService';
import * as settingsService from '@/features/settings/services/settingsService';
import * as symptomService from '@/features/symptoms/services/symptomService';
import { setSupabaseClientForTesting } from '@/lib/supabase';
import { createFakeSupabase } from '@/test/fakeSupabase';

const USER = '11111111-1111-4111-8111-111111111111';

function useFake(responses: { data: unknown; error: unknown }[] = []) {
  const fake = createFakeSupabase(responses);
  setSupabaseClientForTesting(fake.client);
  return fake;
}

afterEach(() => setSupabaseClientForTesting(null));

describe('periods', () => {
  it('lists periods newest first and maps rows', async () => {
    const fake = useFake([{ data: [{ id: 'a', start_date: '2026-09-01', end_date: null }], error: null }]);
    await expect(periodService.listPeriods()).resolves.toEqual([
      { id: 'a', startDate: '2026-09-01', endDate: null, enteredByPartner: false },
    ]);
    expect(fake.calls[0].table).toBe('periods');
    expect(fake.argsOf(0, 'order')).toEqual(['start_date', { ascending: false }]);
  });

  it('creates a period owned by the current user', async () => {
    const fake = useFake([{ data: { id: 'p1', start_date: '2026-10-01', end_date: '2026-10-05' }, error: null }]);
    const created = await periodService.createPeriod(USER, { startDate: '2026-10-01', endDate: '2026-10-05' });
    expect(fake.argsOf(0, 'insert')).toEqual([{ user_id: USER, start_date: '2026-10-01', end_date: '2026-10-05' }]);
    expect(created).toEqual({ id: 'p1', startDate: '2026-10-01', endDate: '2026-10-05', enteredByPartner: false });
  });

  it('updates and deletes by id', async () => {
    const fake = useFake([
      { data: { id: 'p1', start_date: '2026-10-01', end_date: '2026-10-04' }, error: null },
      { data: null, error: null },
    ]);
    await periodService.updatePeriod('p1', { startDate: '2026-10-01', endDate: '2026-10-04' });
    await periodService.deletePeriod('p1');
    expect(fake.argsOf(0, 'update')).toEqual([{ start_date: '2026-10-01', end_date: '2026-10-04' }]);
    expect(fake.argsOf(0, 'eq')).toEqual(['id', 'p1']);
    expect(fake.calls[1].ops.map(([m]) => m)).toEqual(['delete', 'eq']);
    expect(fake.argsOf(1, 'eq')).toEqual(['id', 'p1']);
  });

  it('throws database errors so the UI can explain them', async () => {
    useFake([{ data: null, error: { code: '23P01', message: 'overlap' } }]);
    await expect(periodService.createPeriod(USER, { startDate: '2026-10-01', endDate: null })).rejects.toMatchObject({
      code: '23P01',
    });
  });
});

describe('intimacy records', () => {
  const row = {
    id: 'i1',
    occurred_at: '2026-10-01T21:00:00Z',
    protection_method: 'condom',
    ejaculation: 'not_applicable',
    emergency_contraception: false,
    notes: null,
  };

  it('creates records for the current user and stores empty notes as null', async () => {
    const fake = useFake([{ data: row, error: null }]);
    const created = await intimacyService.createIntimacyRecord(USER, {
      occurredAt: '2026-10-01T21:00:00Z',
      protectionMethod: 'condom',
      ejaculation: 'not_applicable',
      emergencyContraception: false,
      notes: '   ',
    });
    expect(fake.calls[0].table).toBe('intercourse_records');
    expect(fake.argsOf(0, 'insert')).toEqual([
      {
        user_id: USER,
        occurred_at: '2026-10-01T21:00:00Z',
        protection_method: 'condom',
        ejaculation: 'not_applicable',
        emergency_contraception: false,
        notes: null,
      },
    ]);
    expect(created).toMatchObject({ id: 'i1', protectionMethod: 'condom', notes: null });
  });

  it('maps unexpected stored values to "unknown" instead of crashing', () => {
    expect(
      intimacyService.mapIntimacyRecord({ ...row, protection_method: 'legacy', ejaculation: '???' }),
    ).toMatchObject({ protectionMethod: 'unknown', ejaculation: 'unknown' });
  });

  it('updates and deletes by id', async () => {
    const fake = useFake([{ data: row, error: null }, { data: null, error: null }]);
    await intimacyService.updateIntimacyRecord('i1', {
      occurredAt: row.occurred_at,
      protectionMethod: 'none',
      ejaculation: 'inside',
      emergencyContraception: true,
      notes: 'note',
    });
    await intimacyService.deleteIntimacyRecord('i1');
    expect(fake.argsOf(0, 'update')?.[0]).toMatchObject({ protection_method: 'none', emergency_contraception: true });
    expect(fake.argsOf(0, 'eq')).toEqual(['id', 'i1']);
    expect(fake.argsOf(1, 'eq')).toEqual(['id', 'i1']);
  });
});

describe('symptom logs', () => {
  it('stores symptoms in a stable order and maps unknown values away', async () => {
    const fake = useFake([
      { data: { id: 's1', symptom_date: '2026-10-02', symptoms: ['fatigue', 'cramps', 'bogus'], mood: 'tired', notes: null }, error: null },
    ]);
    const created = await symptomService.createSymptomLog(USER, {
      date: '2026-10-02',
      symptoms: ['fatigue', 'cramps'],
      mood: 'tired',
      notes: '',
    });
    expect(fake.argsOf(0, 'insert')).toEqual([
      { user_id: USER, symptom_date: '2026-10-02', symptoms: ['cramps', 'fatigue'], mood: 'tired', notes: null },
    ]);
    expect(created.symptoms).toEqual(['fatigue', 'cramps']);
  });
});

describe('profile & cycle settings', () => {
  it('creates the profile if the sign-up trigger did not', async () => {
    const fake = useFake([
      { data: null, error: null },
      { data: { id: USER, display_name: 'Sam', date_of_birth: null }, error: null },
    ]);
    const profile = await settingsService.getOrCreateProfile(USER, 'Sam');
    expect(fake.argsOf(1, 'upsert')).toEqual([{ id: USER, display_name: 'Sam' }, { onConflict: 'id' }]);
    expect(profile).toEqual({ id: USER, displayName: 'Sam', dateOfBirth: null });
  });

  it('falls back to default settings when none are stored', async () => {
    useFake([{ data: null, error: null }]);
    await expect(settingsService.getCycleSettings()).resolves.toEqual(settingsService.DEFAULT_CYCLE_SETTINGS);
  });

  it('upserts settings for the current user', async () => {
    const fake = useFake([{ data: { id: 'c1', average_cycle_length: 31, average_period_length: 6 }, error: null }]);
    const saved = await settingsService.saveCycleSettings(USER, { averageCycleLength: 31, averagePeriodLength: 6 });
    expect(fake.argsOf(0, 'upsert')).toEqual([
      { user_id: USER, average_cycle_length: 31, average_period_length: 6 },
      { onConflict: 'user_id' },
    ]);
    expect(saved).toEqual({ id: 'c1', averageCycleLength: 31, averagePeriodLength: 6 });
  });
});
