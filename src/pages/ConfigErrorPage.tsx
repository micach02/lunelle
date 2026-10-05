import { Logo } from '@/components/ui/Logo';
import { env } from '@/lib/env';

/** Shown when the build has no usable Supabase URL / public key. Contains no user data. */
export function ConfigErrorPage() {
  if (env.usesSecretKey) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
        <Logo showTagline />
        <div>
          <h1 className="font-display text-2xl font-medium">A secret key was provided</h1>
          <p className="mt-2 text-ink-muted">
            <code className="rounded bg-surface-muted px-1">VITE_SUPABASE_ANON_KEY</code> contains a secret
            (service-role) key, which bypasses Row Level Security and must never be used in a browser. Replace it
            with the <strong>publishable</strong> (or legacy <strong>anon</strong>) key, and consider rotating the
            secret key in your Supabase dashboard.
          </p>
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
      <Logo showTagline />
      <div>
        <h1 className="font-display text-2xl font-medium">Lunelle isn’t configured yet</h1>
        <p className="mt-2 text-ink-muted">
          Set <code className="rounded bg-surface-muted px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-surface-muted px-1">VITE_SUPABASE_ANON_KEY</code> (see{' '}
          <code className="rounded bg-surface-muted px-1">.env.example</code>), then restart the dev server or
          redeploy.
        </p>
      </div>
    </main>
  );
}
