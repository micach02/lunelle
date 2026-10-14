import { Users } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Marks records a partner with edit permission added or changed. */
export function PartnerBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink',
        className,
      )}
    >
      <Users className="size-3" aria-hidden />
      Added by partner
    </span>
  );
}
