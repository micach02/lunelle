import type { ComponentProps, ReactNode } from 'react';
import { CircleCheck, Info, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-surface-sunken/70', className)} {...props} />;
}

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-ink-muted', className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading Lunelle' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent-ink">
          {icon}
        </div>
      )}
      <h3 className="font-medium text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h3 className="font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry} icon={<RefreshCw className="size-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Explicit label for recorded vs estimated information. Never colour-only. */
export function DataBadge({ kind, className }: { kind: 'recorded' | 'estimated'; className?: string }) {
  return kind === 'recorded' ? (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success',
        className,
      )}
    >
      <CircleCheck className="size-3" aria-hidden />
      Recorded
    </span>
  ) : (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2 py-0.5 text-xs font-medium text-ink-muted',
        className,
      )}
    >
      <span aria-hidden>≈</span>
      Estimated
    </span>
  );
}

export function Notice({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode;
  tone?: 'info' | 'warning';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm',
        tone === 'info' ? 'bg-surface-muted text-ink-muted' : 'bg-warning-soft text-warning',
        className,
      )}
    >
      {tone === 'info' ? (
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <div>{children}</div>
    </div>
  );
}

export const FERTILITY_DISCLAIMER =
  'Fertility dates are estimates. Cycle tracking cannot guarantee pregnancy prevention.';

export const MEDICAL_DISCLAIMER =
  'Lunelle is an informational tracking tool, not a medical device. For medical concerns, consult a qualified healthcare professional.';

export function FertilityDisclaimer({ className }: { className?: string }) {
  return <Notice className={className}>{FERTILITY_DISCLAIMER}</Notice>;
}
