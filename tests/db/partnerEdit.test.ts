// @vitest-environment node
/**
 * Optional partner edit access: add/edit only, owner-controlled, never delete,
 * notes protected unless shared, everything flagged as entered by the partner.
 */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, createAuthUser, createTestDatabase } from './harness';

const OWNER = '11111111-1111-4111-8111-111111111111';
const PARTNER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createAuthUser(db, OWNER, 'sarah@example.com', 'Sarah');
  await createAuthUser(db, PARTNER, 'alex@example.com');
  await createAuthUser(db, STRANGER, 'stranger@example.com');
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.query('reset role');
  for (const table of ['partner_shares', 'periods', 'symptoms', 'intercourse_records']) {
    await db.query(`delete from public.${table}`);
  }
});

/** Owner invites the partner with the given settings; partner accepts. */
async function share(opts: { canEdit: boolean; symptoms?: boolean; intimacy?: boolean; notes?: boolean }) {
  const id = await asUser(db, OWNER, async () => {
    const { rows } = await db.query<{ id: string }>(
      `select public.create_partner_invite('alex@example.com', $1, $2, $3, $4) as id`,
      [opts.symptoms ?? false, opts.intimacy ?? false, opts.notes ?? false, opts.canEdit],
    );
    return rows[0].id;
  });
  await asUser(db, PARTNER, () => db.query(`select public.accept_partner_invite($1)`, [id]));
  return id;
}

const asPartner = <T>(sql: string, params: unknown[]) =>
  asUser(db, PARTNER, async () => (await db.query<T>(sql, params)).rows);

const ownerRows = <T>(sql: string) => asUser(db, OWNER, async () => (await db.query<T>(sql)).rows);

describe('without edit permission', () => {
  it('a view-only partner cannot add anything', async () => {
    const id = await share({ canEdit: false, symptoms: true, intimacy: true });
    await expect(
      asPartner(`select public.partner_save_period($1, null, '2026-10-01', null)`, [id]),
    ).rejects.toMatchObject({ code: 'LU007' });
    await expect(
      asPartner(`select public.partner_save_symptoms($1, null, '2026-10-01', '["cramps"]', null, null)`, [id]),
    ).rejects.toMatchObject({ code: 'LU007' });
    expect(await ownerRows(`select id from public.periods`)).toEqual([]);
  });

  it('nobody else can use a share to write', async () => {
    const id = await share({ canEdit: true });
    await expect(
      asUser(db, STRANGER, () => db.query(`select public.partner_save_period($1, null, '2026-10-01', null)`, [id])),
    ).rejects.toMatchObject({ code: 'LU007' });
    await expect(
      asUser(db, OWNER, () => db.query(`select public.partner_save_period($1, null, '2026-10-01', null)`, [id])),
    ).rejects.toMatchObject({ code: 'LU007' });
  });
});

describe('with edit permission', () => {
  it('lets the partner record and correct a period, flagged as entered by the partner', async () => {
    const id = await share({ canEdit: true });
    const [{ pid }] = await asPartner<{ pid: string }>(
      `select public.partner_save_period($1, null, '2026-10-01', null) as pid`,
      [id],
    );
    await asPartner(`select public.partner_save_period($1, $2, '2026-10-01', '2026-10-05')`, [id, pid]);
    expect(await ownerRows(`select start_date::text, end_date::text, entered_by_partner from public.periods`)).toEqual([
      { start_date: '2026-10-01', end_date: '2026-10-05', entered_by_partner: true },
    ]);
  });

  it('still rejects future dates and overlapping periods', async () => {
    const id = await share({ canEdit: true });
    await expect(
      asPartner(`select public.partner_save_period($1, null, current_date + 10, null)`, [id]),
    ).rejects.toThrow(/future/);
    await asPartner(`select public.partner_save_period($1, null, '2026-09-01', '2026-09-05')`, [id]);
    await expect(
      asPartner(`select public.partner_save_period($1, null, '2026-09-03', '2026-09-06')`, [id]),
    ).rejects.toThrow(/overlaps/);
  });

  it('only writes categories the owner shares', async () => {
    const id = await share({ canEdit: true, symptoms: false, intimacy: false });
    await expect(
      asPartner(`select public.partner_save_symptoms($1, null, '2026-10-01', '["cramps"]', 'tired', null)`, [id]),
    ).rejects.toMatchObject({ code: 'LU007' });
    await expect(
      asPartner(`select public.partner_save_intimacy($1, null, '2026-10-01T21:00:00Z', 'condom', 'unknown', false, null)`, [id]),
    ).rejects.toMatchObject({ code: 'LU007' });
  });

  it('cannot read or overwrite notes unless notes are shared', async () => {
    await asUser(db, OWNER, () =>
      db.query(`insert into public.intercourse_records (occurred_at, protection_method, notes) values ('2026-09-14T21:00:00Z', 'condom', 'private')`),
    );
    const [{ id: recordId }] = await ownerRows<{ id: string }>(`select id from public.intercourse_records`);
    const id = await share({ canEdit: true, intimacy: true, notes: false });

    await asPartner(
      `select public.partner_save_intimacy($1, $2, '2026-09-14T21:00:00Z', 'none', 'inside', true, 'partner note')`,
      [id, recordId],
    );
    await asPartner(
      `select public.partner_save_intimacy($1, null, '2026-09-20T21:00:00Z', 'condom', 'unknown', false, 'sneaky')`,
      [id],
    );
    expect(
      await ownerRows(`select protection_method, notes, entered_by_partner from public.intercourse_records order by occurred_at`),
    ).toEqual([
      { protection_method: 'none', notes: 'private', entered_by_partner: true },
      { protection_method: 'condom', notes: null, entered_by_partner: true },
    ]);
  });

  it('can write notes when the owner shares notes', async () => {
    const id = await share({ canEdit: true, symptoms: true, notes: true });
    await asPartner(`select public.partner_save_symptoms($1, null, '2026-10-02', '["headache"]', 'sad', 'from partner')`, [id]);
    expect(await ownerRows(`select notes, mood from public.symptoms`)).toEqual([{ notes: 'from partner', mood: 'sad' }]);
  });

  it('cannot edit records belonging to someone else', async () => {
    await asUser(db, STRANGER, () => db.query(`insert into public.periods (start_date) values ('2026-08-01')`));
    const [{ id: strangersPeriod }] = await asUser(db, STRANGER, async () =>
      (await db.query<{ id: string }>(`select id from public.periods`)).rows,
    );
    const id = await share({ canEdit: true });
    await expect(
      asPartner(`select public.partner_save_period($1, $2, '2026-08-02', null)`, [id, strangersPeriod]),
    ).rejects.toMatchObject({ code: 'LU004' });
  });

  it('can never delete — there is no function for it and the tables stay closed', async () => {
    const id = await share({ canEdit: true });
    await asPartner(`select public.partner_save_period($1, null, '2026-10-01', null)`, [id]);
    const result = await asUser(db, PARTNER, () => db.query(`delete from public.periods where user_id = $1`, [OWNER]));
    expect(result.affectedRows).toBe(0);
    expect(await ownerRows(`select id from public.periods`)).toHaveLength(1);
  });

  it('stops immediately when the owner turns editing off or stops sharing', async () => {
    const id = await share({ canEdit: true });
    await asUser(db, OWNER, () => db.query(`select public.update_partner_share($1, false, false, false, false)`, [id]));
    await expect(
      asPartner(`select public.partner_save_period($1, null, '2026-10-01', null)`, [id]),
    ).rejects.toMatchObject({ code: 'LU007' });

    await asUser(db, OWNER, () => db.query(`select public.update_partner_share($1, false, false, false, true)`, [id]));
    await asPartner(`select public.partner_save_period($1, null, '2026-10-01', null)`, [id]);
    await asUser(db, OWNER, () => db.query(`select public.revoke_partner_share($1)`, [id]));
    await expect(
      asPartner(`select public.partner_save_period($1, null, '2026-09-01', null)`, [id]),
    ).rejects.toMatchObject({ code: 'LU007' });
  });

  it('tells the partner whether they may edit', async () => {
    const id = await share({ canEdit: true });
    const [{ data }] = await asPartner<{ data: { can_edit: boolean } }>(
      `select public.get_partner_shared_data($1) as data`,
      [id],
    );
    expect(data.can_edit).toBe(true);
    const [invite] = await asPartner<{ can_edit: boolean }>(`select * from public.get_partner_invitations()`, []);
    expect(invite.can_edit).toBe(true);
  });
});
