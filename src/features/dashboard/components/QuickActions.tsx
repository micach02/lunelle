import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';

const tile =
  'flex min-h-20 flex-col items-start justify-between gap-2 rounded-2xl border border-border bg-surface p-3.5 text-left text-sm font-medium text-ink shadow-card transition-colors hover:border-border-strong hover:bg-surface-muted';

export function QuickActions() {
  const dialogs = useRecordDialogs();
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button type="button" className={tile} onClick={() => dialogs.openPeriod()}>
        <span aria-hidden className="text-xl">🩸</span>
        <span>+ Record period</span>
      </button>
      <button type="button" className={tile} onClick={() => dialogs.openIntimacy()}>
        <span aria-hidden className="text-xl">❤️</span>
        <span>+ Record intimacy</span>
      </button>
      <button type="button" className={tile} onClick={() => dialogs.openSymptoms()}>
        <span aria-hidden className="text-xl">📝</span>
        <span>+ Log symptoms</span>
      </button>
      <Link to="/calendar" className={tile}>
        <CalendarDays className="size-5 text-accent" aria-hidden />
        <span>View calendar</span>
      </Link>
    </nav>
  );
}
