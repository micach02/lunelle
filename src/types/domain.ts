import type { ISODate } from '@/lib/dates';

export const PROTECTION_METHODS = [
  'none',
  'condom',
  'hormonal_contraception',
  'withdrawal',
  'other',
  'unknown',
] as const;
export type ProtectionMethod = (typeof PROTECTION_METHODS)[number];

export const EJACULATION_OPTIONS = ['inside', 'outside', 'unknown', 'not_applicable'] as const;
export type Ejaculation = (typeof EJACULATION_OPTIONS)[number];

export const SYMPTOM_KEYS = [
  'cramps',
  'headache',
  'bloating',
  'breast_tenderness',
  'fatigue',
  'acne',
  'back_pain',
  'nausea',
  'other',
] as const;
export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

export const MOODS = ['happy', 'normal', 'sad', 'irritated', 'anxious', 'tired'] as const;
export type Mood = (typeof MOODS)[number];

export interface Profile {
  id: string;
  displayName: string | null;
  dateOfBirth: ISODate | null;
}

export interface CycleSettings {
  id: string | null;
  averageCycleLength: number;
  averagePeriodLength: number;
}

export interface Period {
  id: string;
  startDate: ISODate;
  endDate: ISODate | null;
}

export interface IntimacyRecord {
  id: string;
  /** UTC ISO timestamp */
  occurredAt: string;
  protectionMethod: ProtectionMethod;
  ejaculation: Ejaculation;
  emergencyContraception: boolean;
  notes: string | null;
}

export interface SymptomLog {
  id: string;
  date: ISODate;
  symptoms: SymptomKey[];
  mood: Mood | null;
  notes: string | null;
}

export type PeriodInput = Omit<Period, 'id'>;
export type IntimacyInput = Omit<IntimacyRecord, 'id'>;
export type SymptomInput = Omit<SymptomLog, 'id'>;
export type ProfileInput = Omit<Profile, 'id'>;
export type CycleSettingsUpdate = Pick<CycleSettings, 'averageCycleLength' | 'averagePeriodLength'>;
