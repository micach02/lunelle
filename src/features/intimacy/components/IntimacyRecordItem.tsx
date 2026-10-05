import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FertileContext } from '@/features/cycle/services/cycleCalculator';
import type { IntimacyRecord } from '@/types/domain';
import { EJACULATION_LABELS, PROTECTION_LABELS } from '../constants';
import { FertileContextNote } from './FertileContextNote';

export function IntimacyRecordItem({
  record,
  context,
  onEdit,
  compact = false,
}: {
  record: IntimacyRecord;
  context: FertileContext;
  onEdit?: () => void;
  compact?: boolean;
}) {
  const when = new Date(record.occurredAt);
  return (
    <article className={cn('flex gap-3', !compact && 'rounded-2xl border border-border bg-surface p-4 shadow-card')}>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-intimacy-soft text-lg"
      >
        ❤️
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-ink">
              <time dateTime={record.occurredAt}>{format(when, compact ? 'MMM d' : 'EEEE, MMMM d')}</time>
              <span className="font-normal text-ink-muted"> · {format(when, 'p')}</span>
            </h3>
            <p className="text-sm text-ink-muted">Intimacy recorded</p>
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="-mr-1 rounded-full p-2 text-ink-subtle hover:bg-surface-muted hover:text-ink"
              aria-label={`Edit record from ${format(when, 'MMMM d')}`}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <div className="flex gap-1">
            <dt className="text-ink-muted">Protection:</dt>
            <dd className="font-medium text-ink">{PROTECTION_LABELS[record.protectionMethod]}</dd>
          </div>
          {!compact && (
            <div className="flex gap-1">
              <dt className="text-ink-muted">Ejaculation:</dt>
              <dd className="font-medium text-ink">{EJACULATION_LABELS[record.ejaculation]}</dd>
            </div>
          )}
          {record.emergencyContraception && (
            <div className="flex gap-1">
              <dt className="text-ink-muted">Emergency contraception:</dt>
              <dd className="font-medium text-ink">Taken</dd>
            </div>
          )}
        </dl>
        {!compact && record.notes && <p className="text-sm whitespace-pre-line text-ink-muted">{record.notes}</p>}
        <FertileContextNote context={context} className="text-xs" />
      </div>
    </article>
  );
}
