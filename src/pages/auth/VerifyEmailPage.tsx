import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { getErrorMessage } from '@/lib/errors';

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailPage() {
  const { service } = useAuth();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? null;
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!email) return;
    setSending(true);
    setError(null);
    try {
      await service.resendVerification(email);
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Check your inbox"
      description={
        email ? (
          <>
            We sent a verification link to <strong className="text-ink">{email}</strong>.
          </>
        ) : (
          'We sent you a verification link.'
        )
      }
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-sm text-accent-ink">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            Open the link on this device to verify your email and start using Lunelle. If you don’t see it, check
            your spam folder.
          </p>
        </div>
        {sent && (
          <p role="status" className="text-sm text-success">
            Verification email sent again.
          </p>
        )}
        <FormError message={error} />
        {email && (
          <Button variant="secondary" fullWidth onClick={resend} loading={sending} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}
