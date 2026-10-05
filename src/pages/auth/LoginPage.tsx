import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { getErrorMessage } from '@/lib/errors';

export function LoginPage() {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    setUnverifiedEmail(null);
    try {
      await service.signIn(email, password);
      // The PublicOnlyRoute guard redirects once the session is established.
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      if (/verify your email/i.test(message)) setUnverifiedEmail(email);
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue understanding your cycle."
      footer={
        <>
          New to Lunelle?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
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
        <Field label="Password" error={errors.password?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('password')}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <FormError message={error} />
        {unverifiedEmail && (
          <Button
            variant="soft"
            fullWidth
            onClick={() => navigate('/verify-email', { state: { email: unverifiedEmail } })}
          >
            Resend verification email
          </Button>
        )}
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
