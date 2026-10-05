import { Database, EyeOff, KeyRound, Lock, ShieldCheck, Trash2, Users } from 'lucide-react';

const POINTS = [
  {
    icon: Lock,
    title: 'Only you can access your data',
    body: 'Every record is tied to your account. The database enforces row-level security, so requests can only ever read or change rows that belong to you — even if someone tampered with the app.',
  },
  {
    icon: Users,
    title: 'Sharing is your choice',
    body: 'If you invite a partner, they can only view the categories you choose, can never change anything, and lose access the moment you stop sharing. Notes stay private unless you include them.',
  },
  {
    icon: KeyRound,
    title: 'Secure sign-in',
    body: 'Authentication is handled by Supabase. Passwords are never stored in readable form, and connections are encrypted with HTTPS.',
  },
  {
    icon: Database,
    title: 'Where it’s stored',
    body: 'Your records are stored in a PostgreSQL database hosted by Supabase. Lunelle keeps your data in memory only while you use the app — it is not cached on your device.',
  },
  {
    icon: EyeOff,
    title: 'No tracking or selling',
    body: 'Lunelle has no analytics or advertising trackers and never sells or shares your data. Sensitive details never appear in URLs or logs.',
  },
  {
    icon: Trash2,
    title: 'You stay in control',
    body: 'You can edit or delete any record, and deleting your account permanently removes all of your tracking data.',
  },
] as const;

export function PrivacySection() {
  return (
    <ul className="space-y-4">
      {POINTS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-medium text-ink">{title}</h3>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{body}</p>
          </div>
        </li>
      ))}
      <li className="flex gap-3 rounded-2xl bg-surface-muted p-4 text-sm text-ink-muted">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Lunelle is an informational tracking tool. It is not a medical device or a method of contraception. For
          medical concerns, consult a qualified healthcare professional.
        </p>
      </li>
    </ul>
  );
}
