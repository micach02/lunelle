import { createContext, useContext } from 'react';
import type { CycleTimeline } from '@/features/cycle/services/cycleCalculator';
import type { ISODate } from '@/lib/dates';
import type { IntimacyInput, Period, PeriodInput, SymptomInput, SymptomLog } from '@/types/domain';

/**
 * Where the add/edit dialogs read from and save to. The owner's own data is
 * one store; a partner with edit permission gets a store that saves through
 * the partner_save_* database functions instead.
 */
export interface RecordStore {
  today: ISODate;
  timeline: CycleTimeline;
  /** Existing records, for overlap / one-log-per-day validation. */
  periods: Period[];
  symptoms: SymptomLog[];
  savePeriod: (input: PeriodInput, id?: string) => Promise<unknown>;
  saveIntimacy: (input: IntimacyInput, id?: string) => Promise<unknown>;
  saveSymptoms: (input: SymptomInput, id?: string) => Promise<unknown>;
  /** Omitted when this person may not delete (partners never can). */
  deletePeriod?: (id: string) => Promise<void>;
  deleteIntimacy?: (id: string) => Promise<void>;
  deleteSymptoms?: (id: string) => Promise<void>;
  /** False when recording on someone's behalf without access to their notes. */
  notesEditable: boolean;
  /** Name of the person whose record this is, when it isn't your own. */
  onBehalfOf?: string;
}

export const RecordStoreContext = createContext<RecordStore | null>(null);

export function useRecordStore(): RecordStore {
  const store = useContext(RecordStoreContext);
  if (!store) throw new Error('useRecordStore must be used inside <RecordDialogsProvider>');
  return store;
}
