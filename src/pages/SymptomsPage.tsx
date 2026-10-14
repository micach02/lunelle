import { useMemo } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { PhaseBadge } from '@/features/cycle/components/PhaseBadge';
import { getDayInfo } from '@/features/cycle/services/cycleCalculator';
import { SymptomSummary } from '@/features/symptoms/components/SymptomSummary';
import { useRecordDialogs } from '@/features/tracking/RecordDialogs';
import { PartnerBadge } from '@/features/partner/components/PartnerBadge';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { formatDate } from '@/lib/dates';
import { groupByMonth } from '@/lib/grouping';

export function SymptomsPage() {
  const { symptoms, timeline } = useTracking();
  const dialogs = useRecordDialogs();
  const groups = useMemo(() => groupByMonth(symptoms, (s) => s.date), [symptoms]);

  return (
    <div>
      <PageHeader
        title="Symptoms & mood"
        description="How you’ve been feeling, alongside your estimated cycle phase."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => dialogs.openSymptoms()}>
            Log symptoms
          </Button>
        }
      />
      {symptoms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<span aria-hidden>📝</span>}
            title="Nothing logged yet"
            description="Log symptoms and mood to discover patterns across your cycle in Insights."
            action={<Button onClick={() => dialogs.openSymptoms()}>+ Log symptoms</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`sym-${group.key}`}>
              <h2 id={`sym-${group.key}`} className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
                {group.label}
              </h2>
              <ul className="space-y-3">
                {group.items.map((log) => {
                  const info = getDayInfo(timeline, log.date);
                  return (
                    <li key={log.id}>
                      <Card className="p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-ink">{formatDate(log.date, 'EEEE, MMM d')}</h3>
                            {info.phase && <PhaseBadge phase={info.phase} size="sm" estimated={info.isEstimated} />}
                            {log.enteredByPartner && <PartnerBadge />}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => dialogs.openSymptoms({ log })}
                            aria-label={`Edit log for ${formatDate(log.date, 'MMMM d')}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        </div>
                        <SymptomSummary log={log} />
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
