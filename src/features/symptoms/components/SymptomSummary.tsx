import type { SymptomLog } from '@/types/domain';
import { MOOD_META, SYMPTOM_LABELS } from '../constants';

/** Compact, readable rendering of one symptom/mood log. */
export function SymptomSummary({ log, showNotes = true }: { log: SymptomLog; showNotes?: boolean }) {
  return (
    <div className="space-y-1.5">
      {log.symptoms.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Symptoms">
          {log.symptoms.map((s) => (
            <li key={s} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink">
              {SYMPTOM_LABELS[s]}
            </li>
          ))}
        </ul>
      )}
      {log.mood && (
        <p className="text-sm text-ink-muted">
          Mood: <span aria-hidden>{MOOD_META[log.mood].emoji}</span> {MOOD_META[log.mood].label}
        </p>
      )}
      {showNotes && log.notes && <p className="text-sm whitespace-pre-line text-ink-muted">{log.notes}</p>}
    </div>
  );
}
