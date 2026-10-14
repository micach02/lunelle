import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { Mail, Send, UserCheck } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState, Notice, Skeleton } from '@/components/ui/Feedback';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage, UserFacingError } from '@/lib/errors';
import { logError } from '@/lib/logger';
import * as partnerService from '../services/partnerService';
import type { OutgoingShare, ShareScopes } from '../services/partnerService';
import { describeScopes } from '../scopes';
import { ShareScopeFields } from './ShareScopeFields';

const RESEND_COOLDOWN_MS = 60_000; // matches record_partner_invite_email()

const DEFAULT_SCOPES: ShareScopes = { symptoms: false, intimacy: false, notes: false, canEdit: false };

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'Enter your partner’s email address.').email('Enter a valid email address.'),
});
type InviteValues = z.infer<typeof inviteSchema>;

function sameScopes(a: ShareScopes, b: ShareScopes) {
  return a.symptoms === b.symptoms && a.intimacy === b.intimacy && a.notes === b.notes && a.canEdit === b.canEdit;
}

function InviteForm({ onCreated }: { onCreated: (share: OutgoingShare | null) => void }) {
  const toast = useToast();
  const [scopes, setScopes] = useState<ShareScopes>(DEFAULT_SCOPES);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      const shareId = await partnerService.createInvite(email, scopes);
      try {
        await partnerService.sendInviteEmail(shareId);
        toast.success('Invitation sent');
      } catch (e) {
        toast.error(`Invitation created, but the email wasn’t sent: ${getErrorMessage(e)}`);
      }
      onCreated(await partnerService.getOutgoingShare());
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="Partner’s email"
        error={errors.email?.message}
        hint="No account or password needed. They’ll get an email with a link that signs them in."
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="off"
            inputMode="email"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register('email')}
          />
        )}
      </Field>
      <ShareScopeFields value={scopes} onChange={setScopes} disabled={isSubmitting} />
      <Notice>
        Only invite someone you trust. Your partner can view but never change your records, and you can stop sharing
        at any time.
      </Notice>
      <FormError message={error} />
      <Button type="submit" loading={isSubmitting} icon={<Send className="size-4" />}>
        Send invitation
      </Button>
    </form>
  );
}

function ActiveShare({ share, onChanged }: { share: OutgoingShare; onChanged: (share: OutgoingShare | null) => void }) {
  const toast = useToast();
  const [scopes, setScopes] = useState(share.scopes);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(() =>
    share.lastEmailedAt ? Date.parse(share.lastEmailedAt) : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const accepted = share.status === 'accepted';
  const cooldownSeconds = lastSentAt ? Math.max(0, Math.ceil((lastSentAt + RESEND_COOLDOWN_MS - now) / 1000)) : 0;

  // Tick once a second while the resend cooldown is running.
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds, now]);

  async function saveScopes() {
    setSaving(true);
    try {
      await partnerService.updateShareScopes(share.id, scopes);
      onChanged({ ...share, scopes });
      toast.success('Sharing settings saved');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await partnerService.sendInviteEmail(share.id);
      setLastSentAt(Date.now());
      toast.success('Invitation email sent again');
    } catch (e) {
      // The server's one-minute limit was hit (e.g. from another tab): start the countdown.
      if (e instanceof UserFacingError && e.code === 'too_soon') setLastSentAt(Date.now());
      toast.error(getErrorMessage(e));
    } finally {
      setNow(Date.now());
      setResending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-surface-muted p-4">
        {accepted ? (
          <UserCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        ) : (
          <Mail className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
        )}
        <div className="min-w-0 text-sm">
          <p className="font-medium break-words text-ink">{share.partnerEmail}</p>
          <p className="text-ink-muted">
            {accepted
              ? `Can view your cycle · accepted ${formatDistanceToNow(new Date(share.acceptedAt ?? share.invitedAt), { addSuffix: true })}`
              : lastSentAt
                ? `Invitation pending · email sent ${formatDistanceToNow(lastSentAt, { addSuffix: true })}`
                : 'Invitation pending · email not sent yet'}
          </p>
          <p className="mt-1 text-ink-muted">Sharing: {describeScopes(share.scopes)}</p>
        </div>
      </div>

      <ShareScopeFields value={scopes} onChange={setScopes} disabled={saving} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={saveScopes} loading={saving} disabled={sameScopes(scopes, share.scopes)}>
          Save changes
        </Button>
        {!accepted && (
          <Button
            variant="secondary"
            onClick={resend}
            loading={resending}
            disabled={cooldownSeconds > 0}
            icon={<Send className="size-4" />}
          >
            {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : lastSentAt ? 'Resend email' : 'Send email'}
          </Button>
        )}
        <Button variant="secondary" className="text-danger" onClick={() => setConfirmRevoke(true)}>
          {accepted ? 'Stop sharing' : 'Cancel invitation'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title={accepted ? 'Stop sharing with your partner?' : 'Cancel this invitation?'}
        description={
          accepted
            ? `${share.partnerEmail} will immediately lose access to your cycle data.`
            : 'The invitation link will no longer work.'
        }
        confirmLabel={accepted ? 'Stop sharing' : 'Cancel invitation'}
        destructive
        onConfirm={async () => {
          await partnerService.revokeShare(share.id);
          toast.success(accepted ? 'Sharing stopped' : 'Invitation cancelled');
          onChanged(null);
        }}
      />
    </div>
  );
}

/** Settings → Partner sharing (the data owner's side). */
export function PartnerSharingSection() {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; share: OutgoingShare | null }
  >({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    partnerService
      .getOutgoingShare()
      .then((share) => active && setState({ status: 'ready', share }))
      .catch((e: unknown) => {
        logError('partner.getOutgoing', e);
        if (active) setState({ status: 'error', message: getErrorMessage(e) });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (state.status === 'loading') return <Skeleton className="h-32 w-full" />;
  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => {
          setState({ status: 'loading' });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  const setShare = (share: OutgoingShare | null) => setState({ status: 'ready', share });
  return state.share ? (
    <ActiveShare key={state.share.id} share={state.share} onChanged={setShare} />
  ) : (
    <InviteForm onCreated={setShare} />
  );
}
