import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldError, Field, FormError, Input } from '@/components/ui/Form';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { MIN_PASSWORD_LENGTH, signupSchema, type SignupValues } from '@/features/auth/schemas';
import { getErrorMessage } from '@/lib/errors';

export function SignupPage() {
  const { service } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '', acknowledge: false },
  });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setError(null);
    try {
      const { needsEmailVerification } = await service.signUp(email, password, displayName.trim());
      // Email travels in router state — never in the URL.
      if (needsEmailVerification) navigate('/verify-email', { replace: true, state: { email } });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      description="Private cycle tracking that respects you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="What should we call you?" error={errors.displayName?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              autoComplete="given-name"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('displayName')}
            />
          )}
        </Field>
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
        <Field
          label="Password"
          error={errors.password?.message}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
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
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
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
        <div className="space-y-1.5">
          <Checkbox
            label="I understand Lunelle provides estimates"
            description="It is not a medical device or a method of contraception. Fertility dates are estimates and cannot guarantee pregnancy prevention."
            aria-invalid={Boolean(errors.acknowledge)}
            {...register('acknowledge')}
          />
          <FieldError message={errors.acknowledge?.message} />
        </div>
        <FormError message={error} />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
