import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { MailCheck } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner, Notice } from '@/components/ui/Feedback';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import {
  isSignInLinkType,
  requestSignInLink,
  verifySignInLink,
} from '@/features/partner/services/partnerService';
import { getErrorMessage } from '@/lib/errors';
import { logError } from '@/lib/logger';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
});
type Values = z.infer<typeof schema>;

function readLink(search: string) {
  const params = new URLSearchParams(search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  return tokenHash && isSignInLinkType(type) ? { tokenHash, type } : null;
}

/**
 * Landing page for partners — no sign-up, no password.
 * - With a link token: signs the partner in and opens the shared view.
 * - Without one (or if it expired): lets them request a fresh link by email.
 */
export function PartnerAccessPage() {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [link] = useState(() => readLink(location.search));
  const [phase, setPhase] = useState<'verifying' | 'form' | 'sent'>(link ? 'verifying' : 'form');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const started = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  useEffect(() => {
    if (!link || started.current) return;
    started.current = true; // tokens are single-use; guard against double effects
    // Remove the one-time token from the address bar and history right away.
    navigate({ search: '' }, { replace: true });
    verifySignInLink(link.tokenHash, link.type)
      .then(() => navigate('/partner', { replace: true }))
      .catch((e: unknown) => {
        logError('partner.verifySignInLink', e);
        setLinkError('This sign-in link has expired or was already used. Enter your email to get a new one.');
        setPhase('form');
      });
  }, [link, navigate]);

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await requestSignInLink(email);
      setPhase('sent');
    } catch (e) {
      setFormError(getErrorMessage(e));
    }
  });

  if (phase === 'verifying') return <FullPageSpinner label="Signing you in" />;
  if (!link && status === 'authenticated') return <Navigate to="/partner" replace />;

  return (
    <AuthLayout
      title="View a shared cycle"
      description="No account or password needed. We’ll email you a link that signs you in."
      footer={
        <>
          Tracking your own cycle?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {phase === 'sent' ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-sm text-accent-ink">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            If this email has access to a shared cycle, a sign-in link is on its way. It works once and expires soon.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {linkError && <Notice tone="warning">{linkError}</Notice>}
          <Field label="Your email" error={errors.email?.message} hint="Use the address the invitation was sent to.">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('email')}
              />
            )}
          </Field>
          <FormError message={formError} />
          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Email me a sign-in link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
