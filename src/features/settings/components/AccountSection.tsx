import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { Field, FormError, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import {
  changeEmailSchema,
  changePasswordSchema,
  MIN_PASSWORD_LENGTH,
  type ChangeEmailValues,
  type ChangePasswordValues,
} from '@/features/auth/schemas';
import { getErrorMessage } from '@/lib/errors';

const DELETE_CONFIRMATION = 'DELETE';

function ChangeEmailDialog({ onClose }: { onClose: () => void }) {
  const { user, service } = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: '', currentPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ email, currentPassword }) => {
    setError(null);
    try {
      await service.verifyPassword(user?.email ?? '', currentPassword);
      await service.updateEmail(email);
      toast.success('Check your inbox to confirm your new email address');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!isSubmitting}
      size="sm"
      title="Change email"
      description="We’ll send a confirmation link. Your email changes once it is confirmed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="change-email-form" loading={isSubmitting}>
            Send confirmation
          </Button>
        </>
      }
    >
      <form id="change-email-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="New email" error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} {...register('email')} />
          )}
        </Field>
        <Field label="Current password" error={errors.currentPassword?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="current-password" aria-describedby={describedBy} aria-invalid={invalid} {...register('currentPassword')} />
          )}
        </Field>
        <FormError message={error} />
      </form>
    </Dialog>
  );
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { user, service } = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, password }) => {
    setError(null);
    try {
      await service.verifyPassword(user?.email ?? '', currentPassword);
      await service.updatePassword(password);
      toast.success('Password updated');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!isSubmitting}
      size="sm"
      title="Change password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" loading={isSubmitting}>
            Update password
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Current password" error={errors.currentPassword?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="current-password" aria-describedby={describedBy} aria-invalid={invalid} {...register('currentPassword')} />
          )}
        </Field>
        <Field label="New password" error={errors.password?.message} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} {...register('password')} />
          )}
        </Field>
        <Field label="Confirm new password" error={errors.confirmPassword?.message}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} {...register('confirmPassword')} />
          )}
        </Field>
        <FormError message={error} />
      </form>
    </Dialog>
  );
}

export function AccountSection() {
  const { user, service } = useAuth();
  const toast = useToast();
  const [dialog, setDialog] = useState<'email' | 'password' | 'delete' | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await service.signOut();
    } catch (e) {
      toast.error(getErrorMessage(e));
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4">
        <Mail className="size-5 text-ink-muted" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">Signed in as</p>
          <p className="truncate font-medium text-ink">{user?.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setDialog('email')}>
          Change email
        </Button>
        <Button variant="secondary" onClick={() => setDialog('password')}>
          Change password
        </Button>
        <Button variant="secondary" onClick={signOut} loading={signingOut} icon={<LogOut className="size-4" />}>
          Sign out
        </Button>
      </div>

      <div className="rounded-2xl border border-danger/30 p-4">
        <h3 className="font-medium text-danger">Delete account</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Permanently deletes your account and all of your periods, intimacy records, symptoms and settings. This
          can’t be undone.
        </p>
        <Button
          variant="danger"
          className="mt-3"
          icon={<Trash2 className="size-4" />}
          onClick={() => {
            setConfirmText('');
            setDialog('delete');
          }}
        >
          Delete account
        </Button>
      </div>

      {dialog === 'email' && <ChangeEmailDialog onClose={() => setDialog(null)} />}
      {dialog === 'password' && <ChangePasswordDialog onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        title="Delete your account?"
        description="All of your tracking data will be permanently removed. This can’t be undone."
        confirmLabel="Permanently delete"
        destructive
        confirmDisabled={confirmText !== DELETE_CONFIRMATION}
        onConfirm={async () => {
          await service.deleteAccount();
          toast.success('Your account and data have been deleted');
        }}
      >
        <Field label={<>Type <strong>{DELETE_CONFIRMATION}</strong> to confirm</>}>
          {({ id }) => (
            <Input
              id={id}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          )}
        </Field>
      </ConfirmDialog>
    </div>
  );
}
