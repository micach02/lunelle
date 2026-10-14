/**
 * Smoke test: mounts the real route tree for a signed-in user with seeded
 * data (via a fake Supabase client) and visits every screen.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { addDaysISO, todayISO } from '@/lib/dates';
import { setSupabaseClientForTesting, type LunelleSupabaseClient } from '@/lib/supabase';
import { routes } from '@/routes/router';
import { createFakeAuthService, fakeSession } from './fakeAuthService';

const today = todayISO();
const day = (offset: number) => addDaysISO(today, offset);

const TABLES: Record<string, unknown> = {
  profiles: { id: 'u1', display_name: 'Sarah', date_of_birth: null },
  cycle_settings: { id: 'c1', average_cycle_length: 28, average_period_length: 5 },
  periods: [
    { id: 'p3', start_date: day(-11), end_date: day(-7) },
    { id: 'p2', start_date: day(-40), end_date: day(-36) },
    { id: 'p1', start_date: day(-69), end_date: day(-65) },
  ],
  intercourse_records: [
    {
      id: 'i1',
      occurred_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      protection_method: 'condom',
      ejaculation: 'not_applicable',
      emergency_contraception: false,
      notes: null,
    },
  ],
  symptoms: [{ id: 's1', symptom_date: day(-1), symptoms: ['cramps', 'fatigue'], mood: 'tired', notes: null }],
  partner_shares: null,
};

/** Responses for supabase.rpc(name). */
const RPCS: Record<string, unknown> = {
  get_partner_invitations: [
    {
      share_id: 'share-1',
      owner_name: 'Jordan',
      status: 'accepted',
      share_symptoms: true,
      share_intimacy: false,
      share_notes: false,
      invited_at: '2026-09-01T00:00:00Z',
      accepted_at: '2026-09-02T00:00:00Z',
    },
  ],
  get_partner_shared_data: {
    owner_name: 'Jordan',
    share_symptoms: true,
    share_intimacy: false,
    share_notes: false,
    settings: { average_cycle_length: 30, average_period_length: 4 },
    periods: [{ id: 'jp1', start_date: day(-3), end_date: null }],
    symptoms: [{ id: 'js1', symptom_date: day(-2), symptoms: ['headache'], mood: 'sad', notes: null }],
    intimacy: null,
  },
};

/** Every supabase.rpc() call made during a test. */
const rpcCalls: Array<{ name: string; args: unknown }> = [];

function fakeClientByTable(
  tables: Record<string, unknown> = TABLES,
  rpcs: Record<string, unknown> = RPCS,
): LunelleSupabaseClient {
  return {
    from(table: string) {
      const builder: unknown = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => unknown) => resolve({ data: tables[table], error: null });
            }
            return () => builder;
          },
        },
      );
      return builder;
    },
    rpc(name: string, args?: unknown) {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: rpcs[name] ?? null, error: null });
    },
  } as unknown as LunelleSupabaseClient;
}

beforeAll(() => {
  // jsdom lacks ResizeObserver (used by Recharts' ResponsiveContainer).
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  setSupabaseClientForTesting(null);
  rpcCalls.length = 0;
});

function renderAt(path: string, tables: Record<string, unknown> = TABLES, rpcs: Record<string, unknown> = RPCS) {
  setSupabaseClientForTesting(fakeClientByTable(tables, rpcs));
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <ToastProvider>
      <AuthProvider service={createFakeAuthService(fakeSession()).service}>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>,
  );
  return userEvent.setup();
}

describe('signed-in app', () => {
  it('renders the dashboard with the cycle overview', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /, Sarah$/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Day 12/).length).toBeGreaterThan(0);
    // Seeded cycles are 29 days apart: estimates follow recorded history, not the 28-day setting.
    expect(screen.getAllByText('of 29').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Estimated fertile window/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fertility dates are estimates/).length).toBeGreaterThan(0);
  });

  it('opens a record dialog from the quick actions', async () => {
    const user = renderAt('/');
    await user.click(await screen.findByRole('button', { name: '+ Record intimacy' }));
    const dialog = await screen.findByRole('dialog', { name: 'Record intimacy' });
    expect(within(dialog).getByRole('radio', { name: 'Condom' })).toBeInTheDocument();
    expect(within(dialog).getByText(/cannot guarantee pregnancy prevention/)).toBeInTheDocument();
  });

  it('renders the calendar with labelled days and a details panel', async () => {
    renderAt('/calendar');
    expect(await screen.findByRole('grid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Today\. Cycle day 12/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Record intimacy' })).toBeInTheDocument();
  });

  it('renders intimacy records with fertile-window context', async () => {
    renderAt('/intimacy');
    expect(await screen.findByRole('heading', { level: 1, name: 'Intimacy' })).toBeInTheDocument();
    expect(screen.getByText('Condom')).toBeInTheDocument();
    expect(screen.getByText(/the estimated fertile window\./)).toBeInTheDocument();
  });

  it('renders insights and cycle history', { timeout: 90_000 }, async () => {
    renderAt('/insights');
    // Insights is lazy-loaded (Recharts); the first transform in jsdom is slow.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your Cycle Insights' }, { timeout: 60_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Average cycle')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cycle history' })).toBeInTheDocument();
    expect(screen.getAllByText('29-day cycle').length).toBeGreaterThan(0);
  });

  it('renders settings, periods and symptoms pages', async () => {
    renderAt('/settings');
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Partner’s email')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Intimacy records/ })).not.toBeChecked();
  });

  it('renders the periods page', async () => {
    renderAt('/periods');
    expect(await screen.findByRole('heading', { level: 1, name: 'Periods' })).toBeInTheDocument();
    expect(screen.getAllByText('Recorded').length).toBeGreaterThan(0);
  });

  it('renders the symptoms page', async () => {
    renderAt('/symptoms');
    expect(await screen.findByRole('heading', { level: 1, name: 'Symptoms & mood' })).toBeInTheDocument();
    expect(screen.getByText('Cramps')).toBeInTheDocument();
  });

  it('shows a cycle shared by a partner as read-only, with a Shared nav item', async () => {
    renderAt('/partner');
    expect(await screen.findByRole('heading', { level: 2, name: 'Jordan’s cycle' })).toBeInTheDocument();
    expect(await screen.findByText(/View only./)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Shared' }).length).toBeGreaterThan(0);
    // Jordan's own cycle (30-day setting, period started 3 days ago), not the viewer's.
    expect(screen.getAllByText('of 30').length).toBeGreaterThan(0);
    expect(screen.getByText('Headache')).toBeInTheDocument();
    // Intimacy is not shared, and there are no edit controls.
    expect(screen.queryByRole('heading', { name: 'Intimacy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
  });

  it('gives someone who only views a shared cycle a focused viewer mode', async () => {
    // No periods of their own, but a cycle is shared with them.
    renderAt('/', { ...TABLES, periods: [], intercourse_records: [], symptoms: [] });
    expect(await screen.findByRole('heading', { level: 2, name: 'Jordan’s cycle' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Shared' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Calendar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New record' })).not.toBeInTheDocument();
    // Nothing nudges a viewer to record periods.
    expect(screen.queryByRole('button', { name: /Record period|Record your first period/ })).not.toBeInTheDocument();
  });

  it('keeps a viewer’s Settings focused: no cycle settings or invite form', async () => {
    renderAt('/settings', { ...TABLES, periods: [], intercourse_records: [], symptoms: [] });
    expect(await screen.findByRole('button', { name: 'Start tracking my own cycle' })).toBeInTheDocument();
    expect(screen.queryByText('Cycle settings')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Partner’s email')).not.toBeInTheDocument();
  });

  it('lets a partner with edit permission add records on the owner’s behalf — but never delete', async () => {
    const editable = {
      ...RPCS,
      get_partner_invitations: (RPCS.get_partner_invitations as object[]).map((r) => ({ ...r, can_edit: true })),
      get_partner_shared_data: { ...(RPCS.get_partner_shared_data as object), can_edit: true },
    };
    const user = renderAt('/partner', { ...TABLES, periods: [], intercourse_records: [], symptoms: [] }, editable);
    expect(await screen.findByText(/You can add and edit records./)).toBeInTheDocument();

    // Editing the existing (shared) period: no delete option.
    await user.click(screen.getByRole('button', { name: 'Edit period' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit period' });
    expect(within(dialog).getByText(/Adding to Jordan’s records/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/End date/), day(-1));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Period updated');
    expect(rpcCalls.find((c) => c.name === 'partner_save_period')?.args).toEqual({
      p_share_id: 'share-1',
      p_period_id: 'jp1',
      p_start_date: day(-3),
      p_end_date: day(-1),
    });
  });

  it('hides add/edit controls from a view-only partner', async () => {
    renderAt('/partner', { ...TABLES, periods: [], intercourse_records: [], symptoms: [] });
    expect(await screen.findByText(/View only./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit period' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record period' })).not.toBeInTheDocument();
  });
});
