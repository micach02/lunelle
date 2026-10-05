import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
  /** Prevent closing via Esc/backdrop while something is in flight. */
  dismissible?: boolean;
}

/**
 * Modal built on the native <dialog> element: focus trapping, Esc handling,
 * inert background and top-layer rendering come from the browser.
 * Renders as a bottom sheet on small screens.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && dismissible) onClose();
      }}
      className={cn(
        'bg-surface text-ink shadow-raised open:animate-slide-up backdrop:animate-fade-in',
        'w-full max-w-none overflow-hidden p-0',
        // Mobile: bottom sheet
        'mt-auto mb-0 max-h-[92dvh] rounded-t-[1.5rem]',
        // Desktop: centred modal
        'sm:m-auto sm:max-h-[88dvh] sm:rounded-card',
        size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start gap-3 border-b border-border px-5 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-xl font-medium">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              className="-mr-2 -mt-1 rounded-full p-2 text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-40"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
