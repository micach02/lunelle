import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { FertilityDisclaimer } from '@/components/ui/Feedback';
import { Checkbox, ChoiceGroup, Field, FormError, Input, Textarea } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { getFertileContext } from '@/features/cycle/services/cycleCalculator';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { createIntimacySchema, type IntimacyFormValues } from '@/features/tracking/schemas';
import {
  fromDateTimeLocalValue,
  isoDateFromTimestamp,
  toDateTimeLocalValue,
  type ISODate,
} from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import type { IntimacyRecord } from '@/types/domain';
import { EJACULATION_CHOICES, PROTECTION_OPTIONS } from '../constants';
import { FertileContextNote } from './FertileContextNote';

interface IntimacyFormDialogProps {
  onClose: () => void;
  record?: IntimacyRecord;
  defaultDate?: ISODate;
}

function defaultOccurredAt(defaultDate: ISODate | undefined, today: ISODate): string {
  const now = new Date();
  if (!defaultDate || defaultDate === today) return toDateTimeLocalValue(now);
  // A past day picked from the calendar: default to the evening of that day.
  return `${defaultDate}T21:00`;
}

export function IntimacyFormDialog({ onClose, record, defaultDate }: IntimacyFormDialogProps) {
  const { today, timeline, saveIntimacy, deleteIntimacy } = useTracking();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(record);
  const schema = useMemo(() => createIntimacySchema(), []);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntimacyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: record
      ? {
          occurredAt: toDateTimeLocalValue(record.occurredAt),
          protectionMethod: record.protectionMethod,
          ejaculation: record.ejaculation,
          emergencyContraception: record.emergencyContraception,
          notes: record.notes ?? '',
        }
      : {
          occurredAt: defaultOccurredAt(defaultDate, today),
          protectionMethod: 'unknown',
          ejaculation: 'unknown',
          emergencyContraception: false,
          notes: '',
        },
  });

  const occurredAt = useWatch({ control, name: 'occurredAt' });
  const fertileContext = useMemo(() => {
    const date = new Date(occurredAt);
    if (Number.isNaN(date.getTime())) return null;
    return getFertileContext(timeline, isoDateFromTimestamp(date.toISOString()));
  }, [occurredAt, timeline]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await saveIntimacy(
        {
          occurredAt: fromDateTimeLocalValue(values.occurredAt),
          protectionMethod: values.protectionMethod,
          ejaculation: values.ejaculation,
          emergencyContraception: values.emergencyContraception,
          notes: values.notes.trim() || null,
        },
        record?.id,
      );
      toast.success(isEdit ? 'Record updated' : 'Intimacy recorded');
      onClose();
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    }
  });

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        dismissible={!isSubmitting}
        title={isEdit ? 'Edit intimacy record' : 'Record intimacy'}
        description="Private to you. Only you can see these records."
        footer={
          <>
            {isEdit && (
              <Button
                variant="ghost"
                className="text-danger hover:text-danger sm:mr-auto"
                icon={<Trash2 className="size-4" />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="intimacy-form" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Save record'}
            </Button>
          </>
        }
      >
        <form id="intimacy-form" onSubmit={onSubmit} noValidate className="space-y-5">
          <Field label="Date and time" error={errors.occurredAt?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="datetime-local"
                max={`${today}T23:59`}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('occurredAt')}
              />
            )}
          </Field>

          {fertileContext && <FertileContextNote context={fertileContext} />}

          <Controller
            control={control}
            name="protectionMethod"
            render={({ field }) => (
              <ChoiceGroup
                legend="Protection"
                options={PROTECTION_OPTIONS}
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                error={errors.protectionMethod?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="ejaculation"
            render={({ field }) => (
              <ChoiceGroup
                legend="Ejaculation"
                options={EJACULATION_CHOICES}
                value={field.value}
                onChange={(v) => v && field.onChange(v)}
                error={errors.ejaculation?.message}
              />
            )}
          />

          <Checkbox
            label="Emergency contraception taken"
            description="Record it here if you used emergency contraception after this encounter."
            {...register('emergencyContraception')}
          />

          <Field label="Notes" optional error={errors.notes?.message}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={2000}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('notes')}
              />
            )}
          </Field>

          <FertilityDisclaimer />
          <FormError message={submitError} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this record?"
        description="This intimacy record will be permanently deleted."
        confirmLabel="Delete record"
        destructive
        onConfirm={async () => {
          if (!record) return;
          await deleteIntimacy(record.id);
          toast.success('Record deleted');
          onClose();
        }}
      />
    </>
  );
}
