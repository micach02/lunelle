import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { ChoiceGroup, Field, FormError, Input, Textarea } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useRecordStore } from '@/features/tracking/recordStore';
import { createSymptomSchema, type SymptomFormValues } from '@/features/tracking/schemas';
import type { ISODate } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import type { SymptomLog } from '@/types/domain';
import { MOOD_OPTIONS, SYMPTOM_OPTIONS } from '../constants';

interface SymptomFormDialogProps {
  onClose: () => void;
  log?: SymptomLog;
  defaultDate?: ISODate;
}

export function SymptomFormDialog({ onClose, log, defaultDate }: SymptomFormDialogProps) {
  const { today, symptoms, saveSymptoms, deleteSymptoms, notesEditable, onBehalfOf } = useRecordStore();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(log);

  const schema = useMemo(
    () => createSymptomSchema(today, symptoms.filter((s) => s.id !== log?.id)),
    [today, symptoms, log?.id],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SymptomFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: log?.date ?? defaultDate ?? today,
      symptoms: log?.symptoms ?? [],
      mood: log?.mood ?? null,
      notes: log?.notes ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await saveSymptoms(
        { date: values.date, symptoms: values.symptoms, mood: values.mood, notes: values.notes.trim() || null },
        log?.id,
      );
      toast.success(isEdit ? 'Log updated' : 'Symptoms logged');
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
        title={isEdit ? 'Edit symptoms & mood' : 'Log symptoms & mood'}
        description={
          onBehalfOf
            ? `Adding to ${onBehalfOf}’s records. They’ll see this was added by you.`
            : 'Spotting patterns over time can help you understand your cycle.'
        }
        footer={
          <>
            {isEdit && deleteSymptoms && (
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
            <Button type="submit" form="symptom-form" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Save log'}
            </Button>
          </>
        }
      >
        <form id="symptom-form" onSubmit={onSubmit} noValidate className="space-y-5">
          <Field label="Date" error={errors.date?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="date"
                max={today}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('date')}
              />
            )}
          </Field>

          <Controller
            control={control}
            name="symptoms"
            render={({ field }) => (
              <ChoiceGroup
                multiple
                legend="Symptoms"
                options={SYMPTOM_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                columns={3}
                error={errors.symptoms?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="mood"
            render={({ field }) => (
              <ChoiceGroup
                legend="Mood"
                optional
                options={MOOD_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                allowDeselect
                columns={3}
              />
            )}
          />

          {notesEditable && (
          <Field label="Notes" optional error={errors.notes?.message}>
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={2000}
                placeholder="Anything else you’d like to remember"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('notes')}
              />
            )}
          </Field>
          )}
          <FormError message={submitError} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this log?"
        description="This symptom and mood log will be permanently deleted."
        confirmLabel="Delete log"
        destructive
        onConfirm={async () => {
          if (!log || !deleteSymptoms) return;
          await deleteSymptoms(log.id);
          toast.success('Log deleted');
          onClose();
        }}
      />
    </>
  );
}
