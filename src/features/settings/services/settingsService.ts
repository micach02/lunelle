import { getSupabase } from '@/lib/supabase';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '@/features/cycle/services/cycleCalculator';
import type { CycleSettings, CycleSettingsUpdate, Profile, ProfileInput } from '@/types/domain';

const PROFILE_COLUMNS = 'id, display_name, date_of_birth';
const SETTINGS_COLUMNS = 'id, average_cycle_length, average_period_length';

export const DEFAULT_CYCLE_SETTINGS: CycleSettings = {
  id: null,
  averageCycleLength: DEFAULT_CYCLE_LENGTH,
  averagePeriodLength: DEFAULT_PERIOD_LENGTH,
};

function mapProfile(row: { id: string; display_name: string | null; date_of_birth: string | null }): Profile {
  return { id: row.id, displayName: row.display_name, dateOfBirth: row.date_of_birth };
}

function mapSettings(row: {
  id: string;
  average_cycle_length: number;
  average_period_length: number;
}): CycleSettings {
  return {
    id: row.id,
    averageCycleLength: row.average_cycle_length,
    averagePeriodLength: row.average_period_length,
  };
}

/**
 * Load the profile, creating it if the sign-up trigger has not (e.g. a
 * project where the trigger was not installed). RLS only allows inserting a
 * profile whose id equals the caller's auth user id.
 */
export async function getOrCreateProfile(userId: string, fallbackName: string | null): Promise<Profile> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return mapProfile(data);

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: fallbackName }, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();
  if (insertError) throw insertError;
  return mapProfile(created);
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({ display_name: input.displayName?.trim() || null, date_of_birth: input.dateOfBirth })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return mapProfile(data);
}

export async function getCycleSettings(): Promise<CycleSettings> {
  const { data, error } = await getSupabase()
    .from('cycle_settings')
    .select(SETTINGS_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSettings(data) : DEFAULT_CYCLE_SETTINGS;
}

export async function saveCycleSettings(userId: string, input: CycleSettingsUpdate): Promise<CycleSettings> {
  const { data, error } = await getSupabase()
    .from('cycle_settings')
    .upsert(
      {
        user_id: userId,
        average_cycle_length: input.averageCycleLength,
        average_period_length: input.averagePeriodLength,
      },
      { onConflict: 'user_id' },
    )
    .select(SETTINGS_COLUMNS)
    .single();
  if (error) throw error;
  return mapSettings(data);
}
