import { z } from 'zod';
import { diffInDays, formatDateRange, isISODate, type ISODate } from '@/lib/dates';
import {
  EJACULATION_OPTIONS,
  MOODS,
  PROTECTION_METHODS,
  SYMPTOM_KEYS,
  type Period,
  type SymptomLog,
} from '@/types/domain';

export const MAX_PERIOD_SPAN_DAYS = 20; // matches DB constraint periods_max_duration
export const MAX_NOTES_LENGTH = 2000;

// -----------------------------------------------------------------------------
// Period
// -----------------------------------------------------------------------------

export function createPeriodSchema(today: ISODate, otherPeriods: readonly Period[]) {
  return z
    .object({
      startDate: z.string().min(1, 'Choose the day your period started.'),
      /** Empty string = ongoing. */
      endDate: z.string(),
    })
    .superRefine((value, ctx) => {
      if (!isISODate(value.startDate)) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Enter a valid date.' });
        return;
      }
      if (value.startDate > today) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'The start date can’t be in the future.' });
      }
      if (value.endDate) {
        if (!isISODate(value.endDate)) {
          ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Enter a valid date.' });
          return;
        }
        if (value.endDate < value.startDate) {
          ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'The end date must be on or after the start date.' });
          return;
        }
        if (value.endDate > today) {
          ctx.addIssue({
            code: 'custom',
            path: ['endDate'],
            message: 'The end date can’t be in the future. Leave it empty while your period is ongoing.',
          });
        }
        if (diffInDays(value.startDate, value.endDate) > MAX_PERIOD_SPAN_DAYS) {
          ctx.addIssue({
            code: 'custom',
            path: ['endDate'],
            message: `A period can be recorded for up to ${MAX_PERIOD_SPAN_DAYS + 1} days. For prolonged bleeding, consider speaking with a healthcare professional.`,
          });
        }
      }
      const end = value.endDate || value.startDate;
      const overlap = otherPeriods.find(
        (p) => value.startDate <= (p.endDate ?? p.startDate) && p.startDate <= end,
      );
      if (overlap) {
        ctx.addIssue({
          code: 'custom',
          path: ['startDate'],
          message: `This overlaps your period from ${formatDateRange(overlap.startDate, overlap.endDate)}.`,
        });
      }
    });
}

export type PeriodFormValues = z.infer<ReturnType<typeof createPeriodSchema>>;

// -----------------------------------------------------------------------------
// Intimacy
// -----------------------------------------------------------------------------

export function createIntimacySchema(now: Date = new Date()) {
  return z
    .object({
      occurredAt: z.string().min(1, 'Choose a date and time.'),
      protectionMethod: z.enum(PROTECTION_METHODS),
      ejaculation: z.enum(EJACULATION_OPTIONS),
      emergencyContraception: z.boolean(),
      notes: z.string().max(MAX_NOTES_LENGTH, `Notes can be up to ${MAX_NOTES_LENGTH} characters.`),
    })
    .superRefine((value, ctx) => {
      const date = new Date(value.occurredAt);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: 'custom', path: ['occurredAt'], message: 'Enter a valid date and time.' });
      } else if (date.getTime() > now.getTime() + 5 * 60_000) {
        ctx.addIssue({ code: 'custom', path: ['occurredAt'], message: 'The date and time can’t be in the future.' });
      }
    });
}

export type IntimacyFormValues = z.infer<ReturnType<typeof createIntimacySchema>>;

// -----------------------------------------------------------------------------
// Symptoms & mood
// -----------------------------------------------------------------------------

export function createSymptomSchema(today: ISODate, otherLogs: readonly SymptomLog[]) {
  return z
    .object({
      date: z.string().min(1, 'Choose a date.'),
      symptoms: z.array(z.enum(SYMPTOM_KEYS)),
      mood: z.enum(MOODS).nullable(),
      notes: z.string().max(MAX_NOTES_LENGTH, `Notes can be up to ${MAX_NOTES_LENGTH} characters.`),
    })
    .superRefine((value, ctx) => {
      if (!isISODate(value.date)) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'Enter a valid date.' });
      } else if (value.date > today) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'The date can’t be in the future.' });
      } else if (otherLogs.some((log) => log.date === value.date)) {
        ctx.addIssue({
          code: 'custom',
          path: ['date'],
          message: 'You already have a log for this day — open it from the calendar to edit it.',
        });
      }
      if (value.symptoms.length === 0 && !value.mood && !value.notes.trim()) {
        ctx.addIssue({ code: 'custom', path: ['symptoms'], message: 'Add at least one symptom, a mood, or a note.' });
      }
    });
}

export type SymptomFormValues = z.infer<ReturnType<typeof createSymptomSchema>>;
