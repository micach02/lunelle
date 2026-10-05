import { useState } from 'react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePartnerAccess } from '@/features/partner/PartnerAccessProvider';
import { SharedCycleView } from '@/features/partner/components/SharedCycleView';
import { describeScopes } from '@/features/partner/scopes';
import type { IncomingShare } from '@/features/partner/services/partnerService';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';

function InvitationCard({ share }: { share: IncomingShare }) {
  const { accept, leave } = usePartnerAccess();
  const toast = useToast();
  const [accepting, setAccepting] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      await accept(share.id);
      toast.success(`You can now view ${share.ownerName}’s cycle`);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setAccepting(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-medium text-ink">{share.ownerName} invited you to view their cycle</h2>
        <p className="mt-1 text-sm text-ink-muted">You’ll see: {describeScopes(share.scopes).toLowerCase()}</p>
        <p className="mt-1 text-sm text-ink-muted">
          Access is view-only. They can change what’s shared or stop sharing at any time.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleAccept} loading={accepting}>
          Accept
        </Button>
        <Button variant="secondary" onClick={() => setConfirmDecline(true)} disabled={accepting}>
          Decline
        </Button>
      </div>
      <ConfirmDialog
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        title="Decline this invitation?"
        description={`${share.ownerName} would need to invite you again.`}
        confirmLabel="Decline"
        onConfirm={async () => {
          await leave(share.id);
          toast.success('Invitation declined');
        }}
      />
    </Card>
  );
}

export function PartnerPage() {
  const { user } = useAuth();
  const { status, error, incoming, reload, leave } = usePartnerAccess();
  const toast = useToast();
  const pending = incoming.filter((s) => s.status === 'pending');
  const accepted = incoming.filter((s) => s.status === 'accepted');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const active = accepted.find((s) => s.id === selectedId) ?? accepted[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Shared with you" description="Cycles that others have chosen to share with you." />

      {status === 'loading' && <Skeleton className="h-40 w-full rounded-card" />}
      {status === 'error' && <ErrorState message={error ?? ''} onRetry={reload} />}

      {status === 'ready' && incoming.length === 0 && (
        <Card>
          <EmptyState
            icon={<Users className="size-6" aria-hidden />}
            title="Nothing shared with you yet"
            description={
              <>
                When someone invites you, it will appear here. Invitations are matched to your account email
                {user?.email ? (
                  <>
                    {' '}
                    (<strong className="text-ink">{user.email}</strong>)
                  </>
                ) : null}
                .
              </>
            }
          />
        </Card>
      )}

      {pending.map((share) => (
        <InvitationCard key={share.id} share={share} />
      ))}

      {active && (
        <section aria-label={`Shared by ${active.ownerName}`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {accepted.length > 1 ? (
              <div role="tablist" aria-label="Shared cycles" className="flex flex-wrap gap-2">
                {accepted.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={s.id === active.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium',
                      s.id === active.id
                        ? 'border-accent bg-accent-soft text-accent-ink'
                        : 'border-border bg-surface text-ink-muted',
                    )}
                  >
                    {s.ownerName}
                  </button>
                ))}
              </div>
            ) : (
              <h2 className="font-display text-2xl font-medium text-ink">{active.ownerName}’s cycle</h2>
            )}
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
              Stop viewing
            </Button>
          </div>
          <SharedCycleView key={active.id} shareId={active.id} />
          <ConfirmDialog
            open={confirmLeave}
            onClose={() => setConfirmLeave(false)}
            title={`Stop viewing ${active.ownerName}’s cycle?`}
            description="You’ll lose access until they invite you again."
            confirmLabel="Stop viewing"
            destructive
            onConfirm={async () => {
              await leave(active.id);
              setSelectedId(null);
              toast.success('You’ve stopped viewing this shared cycle');
            }}
          />
        </section>
      )}
    </div>
  );
}
