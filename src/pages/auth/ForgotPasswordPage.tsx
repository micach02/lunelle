import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { getErrorMessage } from '@/lib/errors';

export function ForgotPasswordPage() {
  const { service } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await service.sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your account email and we’ll send you a secure reset link."
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-sm text-accent-ink">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            If an account exists for that email, a reset link is on its way. Open it on this device to choose a new
            password.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field label="Email" error={errors.email?.message}>
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
          <FormError message={error} />
          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
