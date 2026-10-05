import type { ReactNode } from 'react';

export function StatTile({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1.5">
        <span className="font-display text-3xl font-medium text-ink tabular-nums">{value}</span>
        {unit && <span className="ml-1 text-sm text-ink-muted">{unit}</span>}
        {hint && <span className="mt-0.5 block text-xs text-ink-subtle">{hint}</span>}
      </dd>
    </div>
  );
}
