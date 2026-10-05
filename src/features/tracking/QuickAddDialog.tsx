import { ChevronRight } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { useRecordDialogs } from './RecordDialogs';

const ACTIONS = [
  { key: 'period', emoji: '🩸', title: 'Record period', description: 'Log when your period started or ended' },
  { key: 'intimacy', emoji: '❤️', title: 'Record intimacy', description: 'Private to you — protection and notes' },
  { key: 'symptoms', emoji: '📝', title: 'Log symptoms & mood', description: 'How you’re feeling today' },
] as const;

export function QuickAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogs = useRecordDialogs();

  function choose(key: (typeof ACTIONS)[number]['key']) {
    onClose();
    if (key === 'period') dialogs.openPeriod();
    if (key === 'intimacy') dialogs.openIntimacy();
    if (key === 'symptoms') dialogs.openSymptoms();
  }

  return (
    <Dialog open={open} onClose={onClose} title="New record" size="sm">
      <ul className="-mx-2 space-y-1">
        {ACTIONS.map((action) => (
          <li key={action.key}>
            <button
              type="button"
              onClick={() => choose(action.key)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-surface-muted"
            >
              <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-xl">
                {action.emoji}
              </span>
              <span className="flex-1">
                <span className="block font-medium text-ink">{action.title}</span>
                <span className="block text-sm text-ink-muted">{action.description}</span>
              </span>
              <ChevronRight className="size-5 text-ink-subtle" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
