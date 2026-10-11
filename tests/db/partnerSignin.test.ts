// @vitest-environment node
/** Rate-limited, service-only "email me a sign-in link" checks for partners. */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asAnon, asServiceRole, asUser, createAuthUser, createTestDatabase } from './harness';

const OWNER = '11111111-1111-4111-8111-111111111111';
const PARTNER = '22222222-2222-4222-8222-222222222222';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createAuthUser(db, OWNER, 'sarah@example.com', 'Sarah');
  await createAuthUser(db, PARTNER, 'alex@example.com');
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.query('reset role');
  await db.query('delete from public.partner_shares');
  await db.query('delete from public.partner_signin_requests');
});

const invite = (email: string) =>
  asUser(db, OWNER, async () => {
    const { rows } = await db.query<{ id: string }>(`select public.create_partner_invite($1) as id`, [email]);
    return rows[0].id;
  });

const claim = (email: string) =>
  asServiceRole(db, async () => {
    const { rows } = await db.query<{ ok: boolean }>(`select public.claim_partner_signin_link($1) as ok`, [email]);
    return rows[0].ok;
  });

describe('claim_partner_signin_link', () => {
  it('refuses addresses without an active share', async () => {
    expect(await claim('nobody@example.com')).toBe(false);
  });

  it('allows an invited address (case-insensitive), then enforces a cooldown', async () => {
    await invite('alex@example.com');
    expect(await claim(' ALEX@example.com ')).toBe(true);
    expect(await claim('alex@example.com')).toBe(false);
  });

  it('stops working once the share is revoked', async () => {
    const id = await invite('alex@example.com');
    await asUser(db, OWNER, () => db.query(`select public.revoke_partner_share($1)`, [id]));
    expect(await claim('alex@example.com')).toBe(false);
  });

  it('caps sign-in emails per day', async () => {
    await invite('alex@example.com');
    await db.query('reset role');
    await db.query(
      `insert into public.partner_signin_requests (email, created_at)
       select 'alex@example.com', now() - (n || ' minutes')::interval from generate_series(2, 11) n`,
    );
    expect(await claim('alex@example.com')).toBe(false);
  });

  it('cannot be called by browsers (anon or signed-in users)', async () => {
    await invite('alex@example.com');
    await expect(asAnon(db, () => db.query(`select public.claim_partner_signin_link('alex@example.com')`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(db, PARTNER, () => db.query(`select public.claim_partner_signin_link('alex@example.com')`)),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(db, PARTNER, () => db.query(`select * from public.partner_signin_requests`))).rejects.toThrow(
      /permission denied/,
    );
  });
});
