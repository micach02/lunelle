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

/** Set on records a partner with edit permission added or changed. */
interface PartnerFlag {
  enteredByPartner?: boolean;
}

export interface Period extends PartnerFlag {
  id: string;
  startDate: ISODate;
  endDate: ISODate | null;
}

export interface IntimacyRecord extends PartnerFlag {
  id: string;
  /** UTC ISO timestamp */
  occurredAt: string;
  protectionMethod: ProtectionMethod;
  ejaculation: Ejaculation;
  emergencyContraception: boolean;
  notes: string | null;
}

export interface SymptomLog extends PartnerFlag {
  id: string;
  date: ISODate;
  symptoms: SymptomKey[];
  mood: Mood | null;
  notes: string | null;
}

export type PeriodInput = Omit<Period, 'id' | 'enteredByPartner'>;
export type IntimacyInput = Omit<IntimacyRecord, 'id' | 'enteredByPartner'>;
export type SymptomInput = Omit<SymptomLog, 'id' | 'enteredByPartner'>;
export type ProfileInput = Omit<Profile, 'id'>;
export type CycleSettingsUpdate = Pick<CycleSettings, 'averageCycleLength' | 'averagePeriodLength'>;
