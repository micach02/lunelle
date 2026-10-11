/**
 * Test harness that runs the real Supabase migrations inside PGlite
 * (Postgres compiled to WASM) with a faithful-enough imitation of the
 * Supabase environment:
 *
 *  - `anon`, `authenticated` and `service_role` roles
 *  - Supabase's permissive DEFAULT PRIVILEGES (anon/authenticated get ALL on
 *    new public tables and functions) — so these tests prove that our
 *    explicit REVOKEs and RLS policies are what actually protect the data
 *  - an `auth.users` table and an `auth.uid()` function that reads the JWT
 *    `sub` claim exactly like Supabase does
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const SUPABASE_SHIM = /* sql */ `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    email_confirmed_at timestamptz default now(),
    created_at timestamptz not null default now()
  );

  create function auth.uid() returns uuid
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;

  -- Supabase's defaults: everything in public is granted to the API roles.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  return db;
}

/** Simulates Supabase's auth server creating a user (fires handle_new_user). */
export async function createAuthUser(
  db: PGlite,
  id: string,
  email: string,
  displayName?: string,
  options: { emailConfirmed?: boolean } = {},
): Promise<void> {
  await db.query('reset role');
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
     values ($1, $2, $3, case when $4 then now() end)`,
    [id, email, JSON.stringify(displayName ? { display_name: displayName } : {}), options.emailConfirmed ?? true],
  );
}

/** Run `fn` as an authenticated API request from `userId`. */
export async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await db.query('set role authenticated');
  try {
    return await fn();
  } finally {
    await db.query('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Run `fn` as a server-side call with the service role (e.g. an Edge Function). */
export async function asServiceRole<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await db.query('set role service_role');
  try {
    return await fn();
  } finally {
    await db.query('reset role');
  }
}

/** Run `fn` as an unauthenticated API request (anon key, no session). */
export async function asAnon<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await db.query('set role anon');
  try {
    return await fn();
  } finally {
    await db.query('reset role');
  }
}
