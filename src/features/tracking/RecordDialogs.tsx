import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { IntimacyFormDialog } from '@/features/intimacy/components/IntimacyFormDialog';
import { PeriodFormDialog } from '@/features/periods/components/PeriodFormDialog';
import { SymptomFormDialog } from '@/features/symptoms/components/SymptomFormDialog';
import type { ISODate } from '@/lib/dates';
import type { IntimacyRecord, Period, SymptomLog } from '@/types/domain';
import { useTracking } from './TrackingDataProvider';

type DialogState =
  | { type: 'period'; period?: Period; defaultDate?: ISODate }
  | { type: 'intimacy'; record?: IntimacyRecord; defaultDate?: ISODate }
  | { type: 'symptoms'; log?: SymptomLog; defaultDate?: ISODate }
  | null;

interface RecordDialogsApi {
  openPeriod: (options?: { period?: Period; defaultDate?: ISODate }) => void;
  openIntimacy: (options?: { record?: IntimacyRecord; defaultDate?: ISODate }) => void;
  /** Opens the existing log for that date if there is one. */
  openSymptoms: (options?: { log?: SymptomLog; defaultDate?: ISODate }) => void;
}

const RecordDialogsContext = createContext<RecordDialogsApi | null>(null);

/** One place that owns the add/edit dialogs so any screen can open them. */
export function RecordDialogsProvider({ children }: { children: ReactNode }) {
  const { symptoms, today } = useTracking();
  const [state, setState] = useState<DialogState>(null);
  const close = useCallback(() => setState(null), []);

  const api = useMemo<RecordDialogsApi>(
    () => ({
      openPeriod: (options = {}) => setState({ type: 'period', ...options }),
      openIntimacy: (options = {}) => setState({ type: 'intimacy', ...options }),
      openSymptoms: (options = {}) => {
        const date = options.defaultDate ?? today;
        const existing = options.log ?? symptoms.find((s) => s.date === date);
        setState({ type: 'symptoms', log: existing, defaultDate: date });
      },
    }),
    [symptoms, today],
  );

  return (
    <RecordDialogsContext.Provider value={api}>
      {children}
      {state?.type === 'period' && (
        <PeriodFormDialog onClose={close} period={state.period} defaultStartDate={state.defaultDate} />
      )}
      {state?.type === 'intimacy' && (
        <IntimacyFormDialog onClose={close} record={state.record} defaultDate={state.defaultDate} />
      )}
      {state?.type === 'symptoms' && (
        <SymptomFormDialog onClose={close} log={state.log} defaultDate={state.defaultDate} />
      )}
    </RecordDialogsContext.Provider>
  );
}

export function useRecordDialogs(): RecordDialogsApi {
  const ctx = useContext(RecordDialogsContext);
  if (!ctx) throw new Error('useRecordDialogs must be used inside <RecordDialogsProvider>');
  return ctx;
}
