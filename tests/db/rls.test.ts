// @vitest-environment node
/**
 * Verifies the Supabase migrations: schema constraints, CRUD for the owner,
 * and — most importantly — that Row Level Security isolates every user's
 * reproductive and sexual-health data from everyone else.
 */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, asUser, createAuthUser, createTestDatabase } from './harness';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

const USER_TABLES = ['profiles', 'periods', 'intercourse_records', 'symptoms', 'cycle_settings'] as const;

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
  await createAuthUser(db, ALICE, 'alice@example.com', 'Alice');
  await createAuthUser(db, BOB, 'bob@example.com', 'Bob');
});

afterAll(async () => {
  await db?.close();
});

async function insertAlicesData() {
  return asUser(db, ALICE, async () => {
    const period = await db.query<{ id: string }>(
      `insert into public.periods (start_date, end_date) values ('2026-09-01', '2026-09-05') returning id`,
    );
    const intimacy = await db.query<{ id: string }>(
      `insert into public.intercourse_records (occurred_at, protection_method, ejaculation, emergency_contraception, notes)
       values ('2026-09-14T21:00:00Z', 'condom', 'not_applicable', false, 'private note') returning id`,
    );
    const symptom = await db.query<{ id: string }>(
      `insert into public.symptoms (symptom_date, symptoms, mood) values ('2026-09-02', '["cramps","fatigue"]', 'tired') returning id`,
    );
    return {
      periodId: period.rows[0].id,
      intimacyId: intimacy.rows[0].id,
      symptomId: symptom.rows[0].id,
    };
  });
}

describe('schema & registration', () => {
  it('enables RLS on every user-owned table', async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    );
    for (const table of USER_TABLES) {
      const row = rows.find((r) => r.relname === table);
      expect(row, `table ${table} exists`).toBeDefined();
      expect(row!.relrowsecurity, `RLS enabled on ${table}`).toBe(true);
    }
    // No unexpected tables without RLS.
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it('defines select/insert/update/delete policies on every table', async () => {
    const { rows } = await db.query<{ tablename: string; cmd: string }>(
      `select tablename, cmd from pg_policies where schemaname = 'public'`,
    );
    for (const table of USER_TABLES) {
      const cmds = rows.filter((r) => r.tablename === table).map((r) => r.cmd).sort();
      expect(cmds, `policies for ${table}`).toEqual(['DELETE', 'INSERT', 'SELECT', 'UPDATE']);
    }
  });

  it('creates a profile and default cycle settings on sign-up', async () => {
    const result = await asUser(db, ALICE, async () => {
      const profile = await db.query<{ display_name: string; average_cycle_length: number }>(
        `select display_name, average_cycle_length from public.profiles`,
      );
      const settings = await db.query<{ average_cycle_length: number; average_period_length: number }>(
        `select average_cycle_length, average_period_length from public.cycle_settings`,
      );
      return { profile: profile.rows, settings: settings.rows };
    });
    expect(result.profile).toEqual([{ display_name: 'Alice', average_cycle_length: 28 }]);
    expect(result.settings).toEqual([{ average_cycle_length: 28, average_period_length: 5 }]);
  });
});

describe('unauthenticated (anon) access', () => {
  it.each(USER_TABLES)('cannot read %s', async (table) => {
    await expect(asAnon(db, () => db.query(`select * from public.${table}`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('cannot insert records', async () => {
    await expect(
      asAnon(db, () =>
        db.query(`insert into public.periods (user_id, start_date) values ($1, '2026-01-01')`, [ALICE]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('cannot call delete_own_account', async () => {
    await expect(asAnon(db, () => db.query(`select public.delete_own_account()`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('owner CRUD', () => {
  it('lets a user create, read, update and delete their own records', async () => {
    const ids = await insertAlicesData();

    await asUser(db, ALICE, async () => {
      const periods = await db.query<{ user_id: string }>(`select user_id from public.periods`);
      expect(periods.rows).toEqual([{ user_id: ALICE }]); // user_id defaulted to auth.uid()

      const updated = await db.query(
        `update public.periods set end_date = '2026-09-06' where id = $1`,
        [ids.periodId],
      );
      expect(updated.affectedRows).toBe(1);

      const updatedIntimacy = await db.query(
        `update public.intercourse_records set protection_method = 'none' where id = $1`,
        [ids.intimacyId],
      );
      expect(updatedIntimacy.affectedRows).toBe(1);

      const symptomUpsert = await db.query(
        `insert into public.symptoms (symptom_date, symptoms) values ('2026-09-02', '["headache"]')
         on conflict (user_id, symptom_date) do update set symptoms = excluded.symptoms`,
      );
      expect(symptomUpsert.affectedRows).toBe(1);
      const symptoms = await db.query<{ symptoms: string[] }>(`select symptoms from public.symptoms`);
      expect(symptoms.rows).toEqual([{ symptoms: ['headache'] }]);

      for (const [table, id] of [
        ['periods', ids.periodId],
        ['intercourse_records', ids.intimacyId],
        ['symptoms', ids.symptomId],
      ] as const) {
        const deleted = await db.query(`delete from public.${table} where id = $1`, [id]);
        expect(deleted.affectedRows, `delete from ${table}`).toBe(1);
      }
    });
  });

  it('bumps updated_at on update', async () => {
    await asUser(db, ALICE, async () => {
      const inserted = await db.query<{ id: string; updated_at: Date }>(
        `insert into public.periods (start_date) values ('2026-07-01') returning id, updated_at`,
      );
      // Backdate, then update and confirm the trigger refreshed the value.
      await db.query(`select pg_sleep(0.01)`);
      const updated = await db.query<{ updated_at: Date }>(
        `update public.periods set end_date = '2026-07-04' where id = $1 returning updated_at`,
        [inserted.rows[0].id],
      );
      expect(updated.rows[0].updated_at.getTime()).toBeGreaterThan(inserted.rows[0].updated_at.getTime());
      await db.query(`delete from public.periods where id = $1`, [inserted.rows[0].id]);
    });
  });

  it('mirrors cycle settings onto the profile', async () => {
    await asUser(db, ALICE, async () => {
      await db.query(`update public.cycle_settings set average_cycle_length = 31, average_period_length = 6`);
      const { rows } = await db.query(
        `select average_cycle_length, average_period_length from public.profiles`,
      );
      expect(rows).toEqual([{ average_cycle_length: 31, average_period_length: 6 }]);
    });
  });
});

describe('cross-user isolation (RLS)', () => {
  let ids: Awaited<ReturnType<typeof insertAlicesData>>;

  beforeAll(async () => {
    ids = await insertAlicesData();
  });

  it.each(USER_TABLES)("another user cannot SELECT Alice's %s", async (table) => {
    const ownerColumn = table === 'profiles' ? 'id' : 'user_id';
    const { rows } = await asUser(db, BOB, () =>
      db.query(`select * from public.${table} where ${ownerColumn} = $1`, [ALICE]),
    );
    expect(rows).toHaveLength(0);
  });

  it("another user only ever sees their own rows, even without a filter", async () => {
    const { rows } = await asUser(db, BOB, () =>
      db.query<{ id: string }>(`select id from public.profiles`),
    );
    expect(rows).toEqual([{ id: BOB }]);
  });

  it("another user cannot UPDATE Alice's records", async () => {
    await asUser(db, BOB, async () => {
      const a = await db.query(`update public.periods set end_date = '2026-09-10' where id = $1`, [ids.periodId]);
      const b = await db.query(`update public.intercourse_records set notes = 'x' where id = $1`, [ids.intimacyId]);
      const c = await db.query(`update public.symptoms set mood = 'happy' where id = $1`, [ids.symptomId]);
      const d = await db.query(`update public.profiles set display_name = 'hacked' where id = $1`, [ALICE]);
      const e = await db.query(`update public.cycle_settings set average_cycle_length = 40 where user_id = $1`, [ALICE]);
      expect([a, b, c, d, e].map((r) => r.affectedRows)).toEqual([0, 0, 0, 0, 0]);
    });
    const { rows } = await asUser(db, ALICE, () =>
      db.query<{ end_date: Date }>(`select end_date from public.periods where id = $1`, [ids.periodId]),
    );
    expect(rows).toHaveLength(1);
  });

  it("another user cannot DELETE Alice's records", async () => {
    await asUser(db, BOB, async () => {
      for (const [table, id] of [
        ['periods', ids.periodId],
        ['intercourse_records', ids.intimacyId],
        ['symptoms', ids.symptomId],
      ] as const) {
        const result = await db.query(`delete from public.${table} where id = $1`, [id]);
        expect(result.affectedRows, `delete from ${table}`).toBe(0);
      }
      const profile = await db.query(`delete from public.profiles where id = $1`, [ALICE]);
      expect(profile.affectedRows).toBe(0);
    });
    const { rows } = await asUser(db, ALICE, () => db.query(`select id from public.intercourse_records`));
    expect(rows).toHaveLength(1);
  });

  it('a user cannot INSERT records on behalf of someone else', async () => {
    await expect(
      asUser(db, BOB, () =>
        db.query(`insert into public.intercourse_records (user_id, occurred_at) values ($1, now())`, [ALICE]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, BOB, () =>
        db.query(`insert into public.periods (user_id, start_date) values ($1, '2025-01-01')`, [ALICE]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('a user cannot move their own row to another user', async () => {
    await expect(
      asUser(db, BOB, async () => {
        const { rows } = await db.query<{ id: string }>(
          `insert into public.symptoms (symptom_date, symptoms) values ('2026-09-03', '[]') returning id`,
        );
        await db.query(`update public.symptoms set user_id = $1 where id = $2`, [ALICE, rows[0].id]);
      }),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('data integrity constraints', () => {
  const expectRejected = (sql: string) =>
    expect(asUser(db, BOB, () => db.query(sql))).rejects.toThrow();

  it('rejects unknown protection methods and ejaculation values', async () => {
    await expectRejected(`insert into public.intercourse_records (occurred_at, protection_method) values (now(), 'rhythm')`);
    await expectRejected(`insert into public.intercourse_records (occurred_at, ejaculation) values (now(), 'maybe')`);
  });

  it('rejects a period that ends before it starts', async () => {
    await expectRejected(`insert into public.periods (start_date, end_date) values ('2026-05-10', '2026-05-01')`);
  });

  it('rejects overlapping periods for the same user only', async () => {
    await asUser(db, BOB, () =>
      db.query(`insert into public.periods (start_date, end_date) values ('2026-09-01', '2026-09-05')`),
    );
    await expect(
      asUser(db, BOB, () =>
        db.query(`insert into public.periods (start_date, end_date) values ('2026-09-04', '2026-09-08')`),
      ),
    ).rejects.toThrow(/overlaps/);
  });

  it('rejects unknown symptoms and moods', async () => {
    await expectRejected(`insert into public.symptoms (symptom_date, symptoms) values ('2026-01-01', '["sneezing"]')`);
    await expectRejected(`insert into public.symptoms (symptom_date, symptoms) values ('2026-01-02', '{"a":1}')`);
    await expectRejected(`insert into public.symptoms (symptom_date, mood) values ('2026-01-03', 'ecstatic')`);
  });

  it('allows only one symptom log per day', async () => {
    await asUser(db, BOB, () => db.query(`insert into public.symptoms (symptom_date) values ('2026-02-01')`));
    await expectRejected(`insert into public.symptoms (symptom_date) values ('2026-02-01')`);
  });

  it('rejects out-of-range cycle settings', async () => {
    await expectRejected(`update public.cycle_settings set average_cycle_length = 5`);
    await expectRejected(`update public.cycle_settings set average_period_length = 30`);
  });
});

describe('account deletion', () => {
  it('permanently removes the caller and all of their tracking data — and nobody else', async () => {
    await asUser(db, ALICE, () => db.query(`select public.delete_own_account()`));

    await db.query('reset role');
    const counts = await db.query<{ table_name: string; n: number }>(`
      select 'auth.users' as table_name, count(*)::int as n from auth.users where id = '${ALICE}'
      union all select 'profiles', count(*)::int from public.profiles where id = '${ALICE}'
      union all select 'periods', count(*)::int from public.periods where user_id = '${ALICE}'
      union all select 'intercourse_records', count(*)::int from public.intercourse_records where user_id = '${ALICE}'
      union all select 'symptoms', count(*)::int from public.symptoms where user_id = '${ALICE}'
      union all select 'cycle_settings', count(*)::int from public.cycle_settings where user_id = '${ALICE}'
    `);
    for (const row of counts.rows) expect(row.n, row.table_name).toBe(0);

    const bob = await db.query<{ n: number }>(
      `select count(*)::int as n from public.periods where user_id = '${BOB}'`,
    );
    expect(bob.rows[0].n).toBeGreaterThan(0);
    const bobUser = await db.query(`select id from auth.users where id = '${BOB}'`);
    expect(bobUser.rows).toHaveLength(1);
  });
});
