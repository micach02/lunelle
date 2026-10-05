-- =============================================================================
-- Lunelle — Row Level Security
--
-- Ownership rule: auth.uid() = user_id   (profiles: auth.uid() = id)
--
-- * RLS is enabled on every table.
-- * The anon role gets NO table privileges at all (Supabase grants them by
--   default, so they are explicitly revoked here). Unauthenticated visitors
--   cannot read or write anything, even before RLS is consulted.
-- * The authenticated role gets CRUD privileges, but every policy restricts
--   rows to the caller's own user id. UPDATE policies also use WITH CHECK so a
--   row can never be re-assigned to another user.
-- * auth.uid() is wrapped in (select ...) so Postgres evaluates it once per
--   statement instead of once per row (Supabase performance guidance).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.periods enable row level security;
alter table public.intercourse_records enable row level security;
alter table public.symptoms enable row level security;
alter table public.cycle_settings enable row level security;

-- -----------------------------------------------------------------------------
-- Table privileges
-- -----------------------------------------------------------------------------
revoke all on table public.profiles from anon, public;
revoke all on table public.periods from anon, public;
revoke all on table public.intercourse_records from anon, public;
revoke all on table public.symptoms from anon, public;
revoke all on table public.cycle_settings from anon, public;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.periods to authenticated;
grant select, insert, update, delete on table public.intercourse_records to authenticated;
grant select, insert, update, delete on table public.symptoms to authenticated;
grant select, insert, update, delete on table public.cycle_settings to authenticated;

-- -----------------------------------------------------------------------------
-- profiles (owner column is id)
-- -----------------------------------------------------------------------------
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles: delete own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- periods
-- -----------------------------------------------------------------------------
create policy "periods: select own" on public.periods
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "periods: insert own" on public.periods
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "periods: update own" on public.periods
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "periods: delete own" on public.periods
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- intercourse_records
-- -----------------------------------------------------------------------------
create policy "intercourse_records: select own" on public.intercourse_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "intercourse_records: insert own" on public.intercourse_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "intercourse_records: update own" on public.intercourse_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "intercourse_records: delete own" on public.intercourse_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- symptoms
-- -----------------------------------------------------------------------------
create policy "symptoms: select own" on public.symptoms
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "symptoms: insert own" on public.symptoms
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "symptoms: update own" on public.symptoms
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "symptoms: delete own" on public.symptoms
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- cycle_settings
-- -----------------------------------------------------------------------------
create policy "cycle_settings: select own" on public.cycle_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "cycle_settings: insert own" on public.cycle_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cycle_settings: update own" on public.cycle_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cycle_settings: delete own" on public.cycle_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);
