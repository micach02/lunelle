import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { Field, FormError, Input } from '@/components/ui/Form';
import { DataBadge } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { useTracking } from '@/features/tracking/TrackingDataProvider';
import { createPeriodSchema, type PeriodFormValues } from '@/features/tracking/schemas';
import { diffInDays, isISODate, pluralizeDays, type ISODate } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import type { Period } from '@/types/domain';

interface PeriodFormDialogProps {
  onClose: () => void;
  period?: Period;
  defaultStartDate?: ISODate;
}

export function PeriodFormDialog({ onClose, period, defaultStartDate }: PeriodFormDialogProps) {
  const { today, periods, savePeriod, deletePeriod } = useTracking();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(period);

  const schema = useMemo(
    () => createPeriodSchema(today, periods.filter((p) => p.id !== period?.id)),
    [today, periods, period?.id],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PeriodFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: period?.startDate ?? defaultStartDate ?? today,
      endDate: period?.endDate ?? '',
    },
  });

  const [startDate, endDate] = useWatch({ control, name: ['startDate', 'endDate'] });
  const duration =
    isISODate(startDate) && isISODate(endDate) && endDate >= startDate ? diffInDays(startDate, endDate) + 1 : null;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await savePeriod({ startDate: values.startDate, endDate: values.endDate || null }, period?.id);
      toast.success(isEdit ? 'Period updated' : 'Period recorded');
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
        title={isEdit ? 'Edit period' : 'Record period'}
        description="Your recorded periods are what Lunelle uses to estimate your cycle."
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
            <Button type="submit" form="period-form" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Save period'}
            </Button>
          </>
        }
      >
        <form id="period-form" onSubmit={onSubmit} noValidate className="space-y-4">
          <Field label="Start date" error={errors.startDate?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="date"
                max={today}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('startDate')}
              />
            )}
          </Field>
          <Field
            label="End date"
            optional
            error={errors.endDate?.message}
            hint="Leave empty while your period is ongoing — you can add the end date later."
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="date"
                min={isISODate(startDate) ? startDate : undefined}
                max={today}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register('endDate')}
              />
            )}
          </Field>
          {duration !== null && (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <DataBadge kind="recorded" /> {pluralizeDays(duration)} period
            </p>
          )}
          <FormError message={submitError} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this period?"
        description="Your cycle estimates will be recalculated without it. This can’t be undone."
        confirmLabel="Delete period"
        destructive
        onConfirm={async () => {
          if (!period) return;
          await deletePeriod(period.id);
          toast.success('Period deleted');
          onClose();
        }}
      />
    </>
  );
}
