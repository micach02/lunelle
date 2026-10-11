import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { Lock, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { NAV_ITEMS, type NavItem } from './navigation';

interface AppShellProps {
  children: ReactNode;
  /** Omit to hide the "New record" buttons (viewer mode). */
  onQuickAdd?: () => void;
  /** Defaults to the five main sections. */
  navItems?: NavItem[];
}

/**
 * Responsive app frame: sidebar on desktop, top bar + bottom tab bar on
 * mobile so the web app feels like a native one.
 */
export function AppShell({ children, onQuickAdd, navItems = NAV_ITEMS }: AppShellProps) {
  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface/70 px-4 py-6 backdrop-blur lg:flex">
        <Logo showTagline className="px-2" />
        {onQuickAdd && (
          <Button className="mt-8" fullWidth icon={<Plus className="size-4" />} onClick={onQuickAdd}>
            New record
          </Button>
        )}
        <nav aria-label="Main" className="mt-6 flex-1">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent-ink'
                        : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                    )
                  }
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="flex items-center gap-2 px-3 text-xs text-ink-subtle">
          <Lock className="size-3.5" aria-hidden />
          Private to you
        </p>
      </aside>

      {/* Mobile top bar */}
      <header className="pt-safe sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          {onQuickAdd && (
            <Button size="icon" variant="soft" onClick={onQuickAdd} aria-label="New record" className="rounded-full">
              <Plus className="size-5" aria-hidden />
            </Button>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
      >
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-ink-subtle hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-accent-soft',
                      )}
                    >
                      <Icon className="size-5" aria-hidden strokeWidth={isActive ? 2.25 : 1.75} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
