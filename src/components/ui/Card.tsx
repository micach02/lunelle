import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-card border border-border bg-surface p-5 shadow-card', className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Heading level for document outline. */
  as?: 'h2' | 'h3';
}

export function CardHeader({ title, description, icon, action, className, as: Heading = 'h2' }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start gap-3', className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <Heading className="text-base font-semibold text-ink">{title}</Heading>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
