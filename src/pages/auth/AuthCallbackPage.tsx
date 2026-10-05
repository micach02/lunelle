import { useState } from 'react';
import { Navigate } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { FullPageSpinner, Notice } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

function readUrlError(): string | null {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = search.get('error_description') ?? hash.get('error_description');
  return description ? description.replace(/\+/g, ' ') : null;
}

/** Target of email-verification and email-change links. */
export function AuthCallbackPage() {
  const { status } = useAuth();
  const [urlError] = useState(readUrlError);

  if (status === 'loading') return <FullPageSpinner label="Confirming your email" />;
  if (status === 'authenticated' && !urlError) return <Navigate to="/" replace />;

  return (
    <AuthLayout
      title={urlError ? 'We couldn’t confirm that link' : 'Email confirmed'}
      description={
        urlError
          ? 'The link may have expired or already been used.'
          : 'Thanks for verifying your email. Sign in to continue.'
      }
    >
      <div className="space-y-4">
        {urlError && <Notice tone="warning">{urlError}</Notice>}
        <ButtonLink to="/login" fullWidth size="lg" replace>
          Go to sign in
        </ButtonLink>
      </div>
    </AuthLayout>
  );
}
