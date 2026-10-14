// @vitest-environment node
/**
 * Partner sharing: owner-controlled, read-only, revocable access.
 * Runs the real migrations in PGlite (see harness.ts).
 */
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { asAnon, asUser, createAuthUser, createTestDatabase } from './harness';

const OWNER = '11111111-1111-4111-8111-111111111111';
const PARTNER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const UNVERIFIED = '44444444-4444-4444-8444-444444444444';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createAuthUser(db, OWNER, 'sarah@example.com', 'Sarah');
  await createAuthUser(db, PARTNER, 'alex@example.com', 'Alex');
  await createAuthUser(db, STRANGER, 'stranger@example.com');
  await createAuthUser(db, UNVERIFIED, 'pending@example.com', undefined, { emailConfirmed: false });

  await asUser(db, OWNER, async () => {
    await db.query(`insert into public.periods (start_date, end_date) values ('2026-09-01', '2026-09-05'), ('2026-09-29', null)`);
    await db.query(`insert into public.symptoms (symptom_date, symptoms, mood, notes) values ('2026-09-02', '["cramps"]', 'tired', 'private symptom note')`);
    await db.query(
      `insert into public.intercourse_records (occurred_at, protection_method, notes) values ('2026-09-14T21:00:00Z', 'condom', 'private intimacy note')`,
    );
  });
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.query('reset role');
  await db.query('delete from public.partner_shares');
});

const invite = (email: string, symptoms = false, intimacy = false, notes = false) =>
  asUser(db, OWNER, async () => {
    const { rows } = await db.query<{ id: string }>(
      `select public.create_partner_invite($1, $2, $3, $4) as id`,
      [email, symptoms, intimacy, notes],
    );
    return rows[0].id;
  });

const accept = (userId: string, shareId: string) =>
  asUser(db, userId, () => db.query(`select public.accept_partner_invite($1)`, [shareId]));

const sharedData = (userId: string, shareId: string) =>
  asUser(db, userId, async () => {
    const { rows } = await db.query<{ data: Record<string, unknown> }>(
      `select public.get_partner_shared_data($1) as data`,
      [shareId],
    );
    return rows[0].data;
  });

const invitations = (userId: string) =>
  asUser(db, userId, async () => (await db.query<{ share_id: string; owner_name: string; status: string }>(
    `select * from public.get_partner_invitations()`,
  )).rows);

describe('creating invitations', () => {
  it('lets the owner invite a partner by email (normalised)', async () => {
    const id = await invite('  Alex@Example.com ');
    const rows = await asUser(db, OWNER, async () =>
      (await db.query(`select partner_email, status, partner_id from public.partner_shares where id = $1`, [id])).rows,
    );
    expect(rows).toEqual([{ partner_email: 'alex@example.com', status: 'pending', partner_id: null }]);
  });

  it('rejects inviting yourself', async () => {
    await expect(invite('SARAH@example.com')).rejects.toMatchObject({ code: 'LU001' });
  });

  it('allows only one active share at a time', async () => {
    await invite('alex@example.com');
    await expect(invite('other@example.com')).rejects.toMatchObject({ code: 'LU002' });
  });

  it('rate-limits invitations per day', async () => {
    for (let i = 0; i < 5; i++) {
      const id = await invite(`p${i}@example.com`);
      await asUser(db, OWNER, () => db.query(`select public.revoke_partner_share($1)`, [id]));
    }
    await expect(invite('p6@example.com')).rejects.toMatchObject({ code: 'LU003' });
  });

  it('rejects malformed email addresses', async () => {
    await expect(invite('not-an-email')).rejects.toThrow(/partner_shares_email_format/);
  });

  it('cannot be written directly through the API, only via the functions', async () => {
    await expect(
      asUser(db, OWNER, () =>
        db.query(`insert into public.partner_shares (owner_id, partner_email) values ($1, 'x@example.com')`, [OWNER]),
      ),
    ).rejects.toThrow(/permission denied/);
    const id = await invite('alex@example.com');
    await expect(
      asUser(db, OWNER, () => db.query(`update public.partner_shares set status = 'accepted' where id = $1`, [id])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(db, PARTNER, () => db.query(`update public.partner_shares set partner_id = $1`, [PARTNER])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('who can see an invitation', () => {
  it('shows a pending invitation only to the verified invited email', async () => {
    await invite('alex@example.com');
    expect(await invitations(PARTNER)).toEqual([
      expect.objectContaining({ owner_name: 'Sarah', status: 'pending' }),
    ]);
    expect(await invitations(STRANGER)).toEqual([]);
    expect(await invitations(OWNER)).toEqual([]);
  });

  it('hides invitations from accounts whose email is not verified', async () => {
    const id = await invite('pending@example.com');
    expect(await invitations(UNVERIFIED)).toEqual([]);
    await expect(accept(UNVERIFIED, id)).rejects.toMatchObject({ code: 'LU005' });
  });

  it('never exposes the share table to partners or strangers', async () => {
    await invite('alex@example.com');
    for (const user of [PARTNER, STRANGER]) {
      const { rows } = await asUser(db, user, () => db.query(`select * from public.partner_shares`));
      expect(rows).toEqual([]);
    }
  });

  it('denies all partner functions to anonymous visitors', async () => {
    const id = await invite('alex@example.com');
    await expect(asAnon(db, () => db.query(`select * from public.get_partner_invitations()`))).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, () => db.query(`select public.get_partner_shared_data($1)`, [id]))).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, () => db.query(`select * from public.partner_shares`))).rejects.toThrow(/permission denied/);
  });
});

describe('accepting and reading shared data', () => {
  it('only the invited partner can accept', async () => {
    const id = await invite('alex@example.com');
    await expect(accept(STRANGER, id)).rejects.toMatchObject({ code: 'LU004' });
    await accept(PARTNER, id);
    expect(await invitations(PARTNER)).toEqual([expect.objectContaining({ status: 'accepted' })]);
  });

  it('a pending (not yet accepted) invitation grants no data', async () => {
    const id = await invite('alex@example.com');
    await expect(sharedData(PARTNER, id)).rejects.toMatchObject({ code: 'LU004' });
  });

  it('shares cycle data only by default — no symptoms, intimacy or notes', async () => {
    const id = await invite('alex@example.com');
    await accept(PARTNER, id);
    const data = await sharedData(PARTNER, id);
    expect(data.owner_name).toBe('Sarah');
    expect(data.periods).toHaveLength(2);
    expect(data.settings).toEqual({ average_cycle_length: 28, average_period_length: 5 });
    expect(data.symptoms).toBeNull();
    expect(data.intimacy).toBeNull();
  });

  it('includes enabled categories but strips notes unless notes are shared', async () => {
    const id = await invite('alex@example.com', true, true, false);
    await accept(PARTNER, id);
    const data = await sharedData(PARTNER, id);
    expect(data.symptoms).toEqual([expect.objectContaining({ symptoms: ['cramps'], mood: 'tired', notes: null })]);
    expect(data.intimacy).toEqual([expect.objectContaining({ protection_method: 'condom', notes: null })]);

    await asUser(db, OWNER, () => db.query(`select public.update_partner_share($1, true, true, true, false)`, [id]));
    const withNotes = await sharedData(PARTNER, id);
    expect(withNotes.symptoms).toEqual([expect.objectContaining({ notes: 'private symptom note' })]);
    expect(withNotes.intimacy).toEqual([expect.objectContaining({ notes: 'private intimacy note' })]);
  });

  it('never gives the partner direct access to the owner’s tables', async () => {
    const id = await invite('alex@example.com', true, true, true);
    await accept(PARTNER, id);
    await asUser(db, PARTNER, async () => {
      for (const table of ['periods', 'symptoms', 'intercourse_records', 'profiles', 'cycle_settings']) {
        const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
        const { rows } = await db.query(`select * from public.${table} where ${ownerColumn} = $1`, [OWNER]);
        expect(rows, table).toEqual([]);
      }
      const update = await db.query(`update public.periods set end_date = '2026-10-01' where user_id = $1`, [OWNER]);
      expect(update.affectedRows).toBe(0);
    });
  });

  it('a stranger cannot read a share by guessing its id', async () => {
    const id = await invite('alex@example.com');
    await accept(PARTNER, id);
    await expect(sharedData(STRANGER, id)).rejects.toMatchObject({ code: 'LU004' });
    await expect(sharedData(OWNER, id)).rejects.toMatchObject({ code: 'LU004' });
  });

  it('partners cannot change what is shared or revoke on the owner’s behalf', async () => {
    const id = await invite('alex@example.com');
    await accept(PARTNER, id);
    await expect(
      asUser(db, PARTNER, () => db.query(`select public.update_partner_share($1, true, true, true, false)`, [id])),
    ).rejects.toMatchObject({ code: 'LU004' });
    const data = await sharedData(PARTNER, id);
    expect(data.intimacy).toBeNull();
  });
});

describe('ending a share', () => {
  it('owner revocation cuts access immediately', async () => {
    const id = await invite('alex@example.com');
    await accept(PARTNER, id);
    await asUser(db, OWNER, () => db.query(`select public.revoke_partner_share($1)`, [id]));
    await expect(sharedData(PARTNER, id)).rejects.toMatchObject({ code: 'LU004' });
    expect(await invitations(PARTNER)).toEqual([]);
  });

  it('a revoked invitation cannot be accepted later', async () => {
    const id = await invite('alex@example.com');
    await asUser(db, OWNER, () => db.query(`select public.revoke_partner_share($1)`, [id]));
    await expect(accept(PARTNER, id)).rejects.toMatchObject({ code: 'LU004' });
  });

  it('the partner can decline or stop viewing', async () => {
    const declined = await invite('alex@example.com');
    await asUser(db, PARTNER, () => db.query(`select public.leave_partner_share($1)`, [declined]));
    expect(await invitations(PARTNER)).toEqual([]);

    const accepted = await invite('alex@example.com');
    await accept(PARTNER, accepted);
    await asUser(db, PARTNER, () => db.query(`select public.leave_partner_share($1)`, [accepted]));
    await expect(sharedData(PARTNER, accepted)).rejects.toMatchObject({ code: 'LU004' });
  });
});

describe('invitation email bookkeeping', () => {
  it('returns the recipient and inviter name, then enforces a resend cooldown', async () => {
    const id = await invite('alex@example.com');
    const { rows } = await asUser(db, OWNER, () =>
      db.query(`select * from public.record_partner_invite_email($1)`, [id]),
    );
    expect(rows).toEqual([{ partner_email: 'alex@example.com', inviter_name: 'Sarah' }]);
    await expect(
      asUser(db, OWNER, () => db.query(`select * from public.record_partner_invite_email($1)`, [id])),
    ).rejects.toMatchObject({ code: 'LU006' });
  });

  it('cannot be used by anyone but the owner', async () => {
    const id = await invite('alex@example.com');
    await expect(
      asUser(db, PARTNER, () => db.query(`select * from public.record_partner_invite_email($1)`, [id])),
    ).rejects.toMatchObject({ code: 'LU004' });
  });
});

describe('account deletion', () => {
  it('removes shares when the partner deletes their account', async () => {
    const id = await invite('alex@example.com');
    await accept(PARTNER, id);
    await asUser(db, PARTNER, () => db.query(`select public.delete_own_account()`));
    const { rows } = await asUser(db, OWNER, () => db.query(`select id from public.partner_shares`));
    expect(rows).toEqual([]);
  });
});
