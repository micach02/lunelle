import { useState, type ReactNode } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { FormError } from './Form';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  destructive = false,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={busy}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {children}
        <FormError message={error} />
      </div>
    </Dialog>
  );
}
