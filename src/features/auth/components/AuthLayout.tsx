import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Logo, LogoMark } from '@/components/ui/Logo';
import { PHASE_ORDER, PHASES } from '@/features/cycle/phases';

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-accent-soft p-12 lg:flex lg:flex-col">
        <Logo />
        <div className="my-auto max-w-md">
          <LogoMark className="mb-8 size-20" />
          <p className="font-display text-5xl leading-[1.05] font-medium tracking-tight text-ink">
            Understand Your Cycle.
          </p>
          <p className="mt-4 text-lg text-ink-muted">Your cycle, your insights, your privacy.</p>
          <ul className="mt-10 flex flex-wrap gap-2">
            {PHASE_ORDER.map((phase) => (
              <li
                key={phase}
                className={`inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1.5 text-sm font-medium ${PHASES[phase].text}`}
              >
                <span aria-hidden>{PHASES[phase].emoji}</span>
                {PHASES[phase].shortLabel}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Lock className="size-4" aria-hidden />
          Your data is private, protected by row-level security, and never sold.
        </p>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo showTagline />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-2 text-ink-muted">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-ink-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
