import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Lunelle mark: a crescent moon held inside an open cycle ring. The gap in
 * the ring and the small dot suggest a cycle in motion — not a medical cross.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const maskId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8 text-accent', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="70 11.68"
        transform="rotate(-19.2 16 16)"
        opacity="0.55"
      />
      <circle cx="25.2" cy="6.8" r="1.9" fill="currentColor" />
      <mask id={maskId}>
        <rect width="32" height="32" fill="white" />
        <circle cx="19.6" cy="13.4" r="6.6" fill="black" />
      </mask>
      <circle cx="15.5" cy="16.5" r="7.5" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-none">
        <span className="font-display text-[1.375rem] font-medium tracking-tight text-ink">Lunelle</span>
        {showTagline && <p className="mt-1 text-xs text-ink-muted">Understand Your Cycle.</p>}
      </div>
    </div>
  );
}
