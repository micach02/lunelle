import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { getErrorMessage } from '@/lib/errors';
import {
  CYCLE_LENGTH_RANGE,
  cycleSettingsSchema,
  PERIOD_LENGTH_RANGE,
  type CycleSettingsFormValues,
} from '../schemas';

export function CycleSettingsForm() {
  const { settings, timeline, updateCycleSettings } = useTracking();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CycleSettingsFormValues>({
    resolver: zodResolver(cycleSettingsSchema),
    defaultValues: {
      averageCycleLength: settings.averageCycleLength,
      averagePeriodLength: settings.averagePeriodLength,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await updateCycleSettings(values);
      reset({ averageCycleLength: saved.averageCycleLength, averagePeriodLength: saved.averagePeriodLength });
      toast.success('Cycle settings saved');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  const usingHistory = timeline.prediction.cycleLengthSource === 'history';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Notice>
        {usingHistory
          ? 'Lunelle is currently using your recorded history for estimates. These values are only a fallback.'
          : 'These values are used until you have recorded a full cycle. After that, Lunelle uses your recorded history.'}
      </Notice>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Average cycle length"
          error={errors.averageCycleLength?.message}
          hint={`Days from one period to the next (${CYCLE_LENGTH_RANGE.min}–${CYCLE_LENGTH_RANGE.max}).`}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={CYCLE_LENGTH_RANGE.min}
              max={CYCLE_LENGTH_RANGE.max}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('averageCycleLength', { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field
          label="Average period length"
          error={errors.averagePeriodLength?.message}
          hint={`Days of bleeding (${PERIOD_LENGTH_RANGE.min}–${PERIOD_LENGTH_RANGE.max}).`}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={PERIOD_LENGTH_RANGE.min}
              max={PERIOD_LENGTH_RANGE.max}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register('averagePeriodLength', { valueAsNumber: true })}
            />
          )}
        </Field>
      </div>
      <FormError message={error} />
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        Save cycle settings
      </Button>
    </form>
  );
}
