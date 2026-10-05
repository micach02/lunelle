// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createIntimacySchema, createPeriodSchema, createSymptomSchema } from './schemas';

const TODAY = '2026-10-04';
const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : result.error!.issues.map((i) => i.message);

describe('period form validation', () => {
  const schema = createPeriodSchema(TODAY, [{ id: 'x', startDate: '2026-09-05', endDate: '2026-09-09' }]);

  it('accepts an ongoing period', () => {
    expect(schema.safeParse({ startDate: '2026-10-02', endDate: '' }).success).toBe(true);
  });

  it('rejects future dates, reversed ranges and very long periods', () => {
    expect(messages(schema.safeParse({ startDate: '2026-10-05', endDate: '' }))).toContain(
      'The start date can’t be in the future.',
    );
    expect(messages(schema.safeParse({ startDate: '2026-10-02', endDate: '2026-10-01' }))).toContain(
      'The end date must be on or after the start date.',
    );
    expect(messages(schema.safeParse({ startDate: '2026-08-01', endDate: '2026-08-25' }))[0]).toMatch(/up to 21 days/);
  });

  it('rejects overlap with an existing period', () => {
    expect(messages(schema.safeParse({ startDate: '2026-09-08', endDate: '2026-09-12' }))[0]).toMatch(/overlaps/);
  });
});

describe('intimacy form validation', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  const base = { protectionMethod: 'condom', ejaculation: 'unknown', emergencyContraception: false, notes: '' };

  it('rejects future timestamps and unknown options', () => {
    const schema = createIntimacySchema(now);
    expect(schema.safeParse({ ...base, occurredAt: '2026-10-04T10:00:00Z' }).success).toBe(true);
    expect(messages(schema.safeParse({ ...base, occurredAt: '2026-10-05T10:00:00Z' }))).toContain(
      'The date and time can’t be in the future.',
    );
    expect(schema.safeParse({ ...base, occurredAt: '2026-10-04T10:00:00Z', protectionMethod: 'rhythm' }).success).toBe(false);
  });
});

describe('symptom form validation', () => {
  const schema = createSymptomSchema(TODAY, [{ id: 'a', date: '2026-10-01', symptoms: [], mood: 'happy', notes: null }]);

  it('requires at least one symptom, mood or note', () => {
    expect(messages(schema.safeParse({ date: '2026-10-03', symptoms: [], mood: null, notes: ' ' }))).toContain(
      'Add at least one symptom, a mood, or a note.',
    );
    expect(schema.safeParse({ date: '2026-10-03', symptoms: [], mood: 'sad', notes: '' }).success).toBe(true);
  });

  it('prevents a second log for the same day', () => {
    expect(messages(schema.safeParse({ date: '2026-10-01', symptoms: ['acne'], mood: null, notes: '' }))[0]).toMatch(
      /already have a log/,
    );
  });
});
