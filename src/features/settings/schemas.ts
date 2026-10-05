import { z } from 'zod';
import { isISODate, type ISODate } from '@/lib/dates';

export function createProfileSchema(today: ISODate) {
  return z.object({
    displayName: z.string().trim().max(80, 'Use at most 80 characters.'),
    dateOfBirth: z
      .string()
      .refine((v) => v === '' || isISODate(v), 'Enter a valid date.')
      .refine((v) => v === '' || (v >= '1900-01-01' && v <= today), 'Enter a date in the past.'),
  });
}
export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

export const CYCLE_LENGTH_RANGE = { min: 18, max: 60 } as const;
export const PERIOD_LENGTH_RANGE = { min: 1, max: 14 } as const;

export const cycleSettingsSchema = z
  .object({
    averageCycleLength: z
      .number({ error: 'Enter a number of days.' })
      .int('Use whole days.')
      .min(CYCLE_LENGTH_RANGE.min, `Use ${CYCLE_LENGTH_RANGE.min}–${CYCLE_LENGTH_RANGE.max} days.`)
      .max(CYCLE_LENGTH_RANGE.max, `Use ${CYCLE_LENGTH_RANGE.min}–${CYCLE_LENGTH_RANGE.max} days.`),
    averagePeriodLength: z
      .number({ error: 'Enter a number of days.' })
      .int('Use whole days.')
      .min(PERIOD_LENGTH_RANGE.min, `Use ${PERIOD_LENGTH_RANGE.min}–${PERIOD_LENGTH_RANGE.max} days.`)
      .max(PERIOD_LENGTH_RANGE.max, `Use ${PERIOD_LENGTH_RANGE.min}–${PERIOD_LENGTH_RANGE.max} days.`),
  })
  .refine((v) => v.averagePeriodLength < v.averageCycleLength, {
    path: ['averagePeriodLength'],
    message: 'Your period length must be shorter than your cycle length.',
  });
export type CycleSettingsFormValues = z.infer<typeof cycleSettingsSchema>;
