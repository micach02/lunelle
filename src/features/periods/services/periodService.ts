import { getSupabase } from '@/lib/supabase';
import type { TableRow } from '@/types/database';
import type { Period, PeriodInput } from '@/types/domain';

const COLUMNS = 'id, start_date, end_date';

export function mapPeriod(row: Pick<TableRow<'periods'>, 'id' | 'start_date' | 'end_date'>): Period {
  return { id: row.id, startDate: row.start_date, endDate: row.end_date };
}

export async function listPeriods(): Promise<Period[]> {
  const { data, error } = await getSupabase()
    .from('periods')
    .select(COLUMNS)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data.map(mapPeriod);
}

export async function createPeriod(userId: string, input: PeriodInput): Promise<Period> {
  const { data, error } = await getSupabase()
    .from('periods')
    .insert({ user_id: userId, start_date: input.startDate, end_date: input.endDate })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapPeriod(data);
}

export async function updatePeriod(id: string, input: PeriodInput): Promise<Period> {
  const { data, error } = await getSupabase()
    .from('periods')
    .update({ start_date: input.startDate, end_date: input.endDate })
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return mapPeriod(data);
}

export async function deletePeriod(id: string): Promise<void> {
  const { error } = await getSupabase().from('periods').delete().eq('id', id);
  if (error) throw error;
}
