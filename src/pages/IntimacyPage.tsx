import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, FertilityDisclaimer } from '@/components/ui/Feedback';
import { getFertileContext } from '@/features/cycle/services/cycleCalculator';
import { IntimacyRecordItem } from '@/features/intimacy/components/IntimacyRecordItem';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { isoDateFromTimestamp } from '@/lib/dates';
import { groupByMonth } from '@/lib/grouping';

export function IntimacyPage() {
  const { intimacy, timeline } = useTracking();
  const dialogs = useRecordDialogs();
  const groups = useMemo(() => groupByMonth(intimacy, (r) => isoDateFromTimestamp(r.occurredAt)), [intimacy]);

  return (
    <div>
      <PageHeader
        title="Intimacy"
        description="A private log. Only you can see these records."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => dialogs.openIntimacy()}>
            Record intimacy
          </Button>
        }
      />
      <FertilityDisclaimer className="mb-6" />

      {intimacy.length === 0 ? (
        <Card>
          <EmptyState
            icon={<span aria-hidden>❤️</span>}
            title="No records yet"
            description="Record intimacy to keep a private history alongside your cycle. Each record shows whether it fell within your estimated fertile window."
            action={<Button onClick={() => dialogs.openIntimacy()}>+ Record intimacy</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`month-${group.key}`}>
              <h2 id={`month-${group.key}`} className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
                {group.label}
                <span className="ml-2 font-normal normal-case">
                  · {group.items.length} {group.items.length === 1 ? 'record' : 'records'}
                </span>
              </h2>
              <ul className="space-y-3">
                {group.items.map((record) => (
                  <li key={record.id}>
                    <IntimacyRecordItem
                      record={record}
                      context={getFertileContext(timeline, isoDateFromTimestamp(record.occurredAt))}
                      onEdit={() => dialogs.openIntimacy({ record })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
