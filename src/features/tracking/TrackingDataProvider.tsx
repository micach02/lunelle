import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildCycleTimeline, type CycleTimeline } from '@/features/cycle/services/cycleCalculator';
import * as intimacyService from '@/features/intimacy/services/intimacyService';
import * as periodService from '@/features/periods/services/periodService';
import * as settingsService from '@/features/settings/services/settingsService';
import * as symptomService from '@/features/symptoms/services/symptomService';
import { useToday } from '@/hooks/useToday';
import type { ISODate } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { logError } from '@/lib/logger';
import type {
  CycleSettings,
  CycleSettingsUpdate,
  IntimacyInput,
  IntimacyRecord,
  Period,
  PeriodInput,
  Profile,
  ProfileInput,
  SymptomInput,
  SymptomLog,
} from '@/types/domain';

/**
 * Loads all of the signed-in user's tracking data once and keeps it in memory.
 *
 * A personal cycle log is small (a few hundred rows after years of use), so a
 * single in-memory store keeps every screen instant and consistent without a
 * caching library. Every read and write still goes through Supabase with RLS;
 * this provider never sees anyone else's data. Nothing is persisted to
 * localStorage, and the store is discarded on sign-out (it is keyed by user).
 */

type Status = 'loading' | 'error' | 'ready';

interface TrackingActions {
  savePeriod: (input: PeriodInput, id?: string) => Promise<Period>;
  deletePeriod: (id: string) => Promise<void>;
  saveIntimacy: (input: IntimacyInput, id?: string) => Promise<IntimacyRecord>;
  deleteIntimacy: (id: string) => Promise<void>;
  saveSymptoms: (input: SymptomInput, id?: string) => Promise<SymptomLog>;
  deleteSymptoms: (id: string) => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<Profile>;
  updateCycleSettings: (input: CycleSettingsUpdate) => Promise<CycleSettings>;
}

export interface TrackingData extends TrackingActions {
  status: Status;
  error: string | null;
  reload: () => void;
  today: ISODate;
  profile: Profile | null;
  settings: CycleSettings;
  /** Newest first. */
  periods: Period[];
  /** Newest first. */
  intimacy: IntimacyRecord[];
  /** Newest first. */
  symptoms: SymptomLog[];
  timeline: CycleTimeline;
}

const TrackingContext = createContext<TrackingData | null>(null);

const byStartDesc = (a: Period, b: Period) => b.startDate.localeCompare(a.startDate);
const byOccurredDesc = (a: IntimacyRecord, b: IntimacyRecord) => b.occurredAt.localeCompare(a.occurredAt);
const byDateDesc = (a: SymptomLog, b: SymptomLog) => b.date.localeCompare(a.date);

function upsertSorted<T extends { id: string }>(items: T[], item: T, compare: (a: T, b: T) => number): T[] {
  return [...items.filter((x) => x.id !== item.id), item].sort(compare);
}

export function TrackingDataProvider({
  userId,
  fallbackName,
  children,
}: {
  userId: string;
  fallbackName: string | null;
  children: ReactNode;
}) {
  const today = useToday();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<CycleSettings>(settingsService.DEFAULT_CYCLE_SETTINGS);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [intimacy, setIntimacy] = useState<IntimacyRecord[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);

  // Initial status is 'loading' (the provider is keyed by user); reload() resets it.
  useEffect(() => {
    let active = true;
    Promise.all([
      settingsService.getOrCreateProfile(userId, fallbackName),
      settingsService.getCycleSettings(),
      periodService.listPeriods(),
      intimacyService.listIntimacyRecords(),
      symptomService.listSymptomLogs(),
    ])
      .then(([p, s, per, int, sym]) => {
        if (!active) return;
        setProfile(p);
        setSettings(s);
        setPeriods(per);
        setIntimacy(int);
        setSymptoms(sym);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        logError('tracking.load', e);
        if (!active) return;
        setError(getErrorMessage(e, 'We could not load your data.'));
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [userId, fallbackName, reloadKey]);

  const reload = useCallback(() => {
    setStatus('loading');
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const actions = useMemo<TrackingActions>(
    () => ({
      async savePeriod(input, id) {
        const saved = id
          ? await periodService.updatePeriod(id, input)
          : await periodService.createPeriod(userId, input);
        setPeriods((items) => upsertSorted(items, saved, byStartDesc));
        return saved;
      },
      async deletePeriod(id) {
        await periodService.deletePeriod(id);
        setPeriods((items) => items.filter((x) => x.id !== id));
      },
      async saveIntimacy(input, id) {
        const saved = id
          ? await intimacyService.updateIntimacyRecord(id, input)
          : await intimacyService.createIntimacyRecord(userId, input);
        setIntimacy((items) => upsertSorted(items, saved, byOccurredDesc));
        return saved;
      },
      async deleteIntimacy(id) {
        await intimacyService.deleteIntimacyRecord(id);
        setIntimacy((items) => items.filter((x) => x.id !== id));
      },
      async saveSymptoms(input, id) {
        const saved = id
          ? await symptomService.updateSymptomLog(id, input)
          : await symptomService.createSymptomLog(userId, input);
        setSymptoms((items) => upsertSorted(items, saved, byDateDesc));
        return saved;
      },
      async deleteSymptoms(id) {
        await symptomService.deleteSymptomLog(id);
        setSymptoms((items) => items.filter((x) => x.id !== id));
      },
      async updateProfile(input) {
        const saved = await settingsService.updateProfile(userId, input);
        setProfile(saved);
        return saved;
      },
      async updateCycleSettings(input) {
        const saved = await settingsService.saveCycleSettings(userId, input);
        setSettings(saved);
        return saved;
      },
    }),
    [userId],
  );

  const timeline = useMemo(
    () =>
      buildCycleTimeline(
        periods,
        {
          averageCycleLength: settings.averageCycleLength,
          averagePeriodLength: settings.averagePeriodLength,
        },
        today,
      ),
    [periods, settings.averageCycleLength, settings.averagePeriodLength, today],
  );

  const value = useMemo<TrackingData>(
    () => ({
      status,
      error,
      reload,
      today,
      profile,
      settings,
      periods,
      intimacy,
      symptoms,
      timeline,
      ...actions,
    }),
    [status, error, reload, today, profile, settings, periods, intimacy, symptoms, timeline, actions],
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking(): TrackingData {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used inside <TrackingDataProvider>');
  return ctx;
}
