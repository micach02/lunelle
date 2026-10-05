import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { FullPageSpinner, Notice } from '@/components/ui/Feedback';
import { Field, FormError } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { MIN_PASSWORD_LENGTH, resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';
import { getErrorMessage } from '@/lib/errors';

/**
 * Landing page for the password-reset email. Supabase exchanges the one-time
 * PKCE code on load and emits PASSWORD_RECOVERY; only then is the form shown.
 */
export function ResetPasswordPage() {
  const { status, isPasswordRecovery, clearPasswordRecovery, service } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (status === 'loading') return <FullPageSpinner label="Verifying your reset link" />;

  // Signed in normally (not via a reset link): change the password in Settings instead.
  if (status === 'authenticated' && !isPasswordRecovery && !completed) return <Navigate to="/settings" replace />;

  if (status === 'unauthenticated') {
    return (
      <AuthLayout title="Link expired" description="This password reset link is invalid or has expired.">
        <div className="space-y-4">
          <Notice>Reset links work once, for a limited time, and must be opened on the device that requested them.</Notice>
          <ButtonLink to="/forgot-password" fullWidth size="lg">
            Request a new link
          </ButtonLink>
          <p className="text-center text-sm">
            <Link to="/login" className="font-medium text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await service.updatePassword(password);
      setCompleted(true);
      clearPasswordRecovery();
      toast.success('Your password has been updated');
      navigate('/', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout title="Choose a new password" description="You’ll stay signed in on this device.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="New password" error={errors.password?.message} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('password')}
            />
          )}
        </Field>
        <Field label="Confirm new password" error={errors.confirmPassword?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('confirmPassword')}
            />
          )}
        </Field>
        <FormError message={error} />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
