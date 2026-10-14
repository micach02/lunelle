import { getSupabase } from '@/lib/supabase';
import type { TableRow } from '@/types/database';
import {
  EJACULATION_OPTIONS,
  PROTECTION_METHODS,
  type Ejaculation,
  type IntimacyInput,
  type IntimacyRecord,
  type ProtectionMethod,
} from '@/types/domain';

const COLUMNS = 'id, occurred_at, protection_method, ejaculation, emergency_contraception, notes, entered_by_partner';

type Row = Pick<
  TableRow<'intercourse_records'>,
  'id' | 'occurred_at' | 'protection_method' | 'ejaculation' | 'emergency_contraception' | 'notes'
> & { entered_by_partner?: boolean };

function oneOf<T extends string>(options: readonly T[], value: string, fallback: T): T {
  return (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function mapIntimacyRecord(row: Row): IntimacyRecord {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    protectionMethod: oneOf<ProtectionMethod>(PROTECTION_METHODS, row.protection_method, 'unknown'),
    ejaculation: oneOf<Ejaculation>(EJACULATION_OPTIONS, row.ejaculation, 'unknown'),
    emergencyContraception: row.emergency_contraception,
    notes: row.notes,
    enteredByPartner: row.entered_by_partner === true,
  };
}

function toRow(input: IntimacyInput) {
  return {
    occurred_at: input.occurredAt,
    protection_method: input.protectionMethod,
    ejaculation: input.ejaculation,
    emergency_contraception: input.emergencyContraception,
    notes: input.notes?.trim() || null,
  };
}

export async function listIntimacyRecords(): Promise<IntimacyRecord[]> {
  const { data, error } = await getSupabase()
    .from('intercourse_records')
    .select(COLUMNS)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return data.map(mapIntimacyRecord);
}

export async function createIntimacyRecord(userId: string, input: IntimacyInput): Promise<IntimacyRecord> {
  const { data, error } = await getSupabase()
    .from('intercourse_records')
    .insert({ user_id: userId, ...toRow(input) })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapIntimacyRecord(data);
}

export async function updateIntimacyRecord(id: string, input: IntimacyInput): Promise<IntimacyRecord> {
  const { data, error } = await getSupabase()
    .from('intercourse_records')
    .update(toRow(input))
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapIntimacyRecord(data);
}

export async function deleteIntimacyRecord(id: string): Promise<void> {
  const { error } = await getSupabase().from('intercourse_records').delete().eq('id', id);
  if (error) throw error;
}
