import { getSupabase } from '@/lib/supabase';
import type { Json, TableRow } from '@/types/database';
import {
  MOODS,
  SYMPTOM_KEYS,
  type Mood,
  type SymptomInput,
  type SymptomKey,
  type SymptomLog,
} from '@/types/domain';

const COLUMNS = 'id, symptom_date, symptoms, mood, notes';

type Row = Pick<TableRow<'symptoms'>, 'id' | 'symptom_date' | 'symptoms' | 'mood' | 'notes'>;

function parseSymptoms(value: Json): SymptomKey[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is SymptomKey => typeof v === 'string' && (SYMPTOM_KEYS as readonly string[]).includes(v),
  );
}

export function mapSymptomLog(row: Row): SymptomLog {
  return {
    id: row.id,
    date: row.symptom_date,
    symptoms: parseSymptoms(row.symptoms),
    mood: row.mood && (MOODS as readonly string[]).includes(row.mood) ? (row.mood as Mood) : null,
    notes: row.notes,
  };
}

function toRow(input: SymptomInput) {
  return {
    symptom_date: input.date,
    // Keep a stable order so stored arrays are predictable.
    symptoms: SYMPTOM_KEYS.filter((k) => input.symptoms.includes(k)),
    mood: input.mood,
    notes: input.notes?.trim() || null,
  };
}

export async function listSymptomLogs(): Promise<SymptomLog[]> {
  const { data, error } = await getSupabase()
    .from('symptoms')
    .select(COLUMNS)
    .order('symptom_date', { ascending: false });
  if (error) throw error;
  return data.map(mapSymptomLog);
}

export async function createSymptomLog(userId: string, input: SymptomInput): Promise<SymptomLog> {
  const { data, error } = await getSupabase()
    .from('symptoms')
    .insert({ user_id: userId, ...toRow(input) })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapSymptomLog(data);
}

export async function updateSymptomLog(id: string, input: SymptomInput): Promise<SymptomLog> {
  const { data, error } = await getSupabase()
    .from('symptoms')
    .update(toRow(input))
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapSymptomLog(data);
}

export async function deleteSymptomLog(id: string): Promise<void> {
  const { error } = await getSupabase().from('symptoms').delete().eq('id', id);
  if (error) throw error;
}
