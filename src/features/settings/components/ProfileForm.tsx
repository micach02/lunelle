import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { getErrorMessage } from '@/lib/errors';
import { createProfileSchema, type ProfileFormValues } from '../schemas';

export function ProfileForm() {
  const { profile, today, updateProfile } = useTracking();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => createProfileSchema(today), [today]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: profile?.displayName ?? '', dateOfBirth: profile?.dateOfBirth ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await updateProfile({
        displayName: values.displayName.trim() || null,
        dateOfBirth: values.dateOfBirth || null,
      });
      reset({ displayName: saved.displayName ?? '', dateOfBirth: saved.dateOfBirth ?? '' });
      toast.success('Profile saved');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Display name" error={errors.displayName?.message} hint="Used for your greeting.">
        {({ id, describedBy, invalid }) => (
          <Input id={id} autoComplete="given-name" aria-describedby={describedBy} aria-invalid={invalid} {...register('displayName')} />
        )}
      </Field>
      <Field label="Date of birth" optional error={errors.dateOfBirth?.message}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="date" max={today} aria-describedby={describedBy} aria-invalid={invalid} {...register('dateOfBirth')} />
        )}
      </Field>
      <FormError message={error} />
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        Save profile
      </Button>
    </form>
  );
}
