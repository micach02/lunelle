-- =============================================================================
-- Lunelle — auth-related functions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create the profile + default cycle settings when a user registers.
-- SECURITY DEFINER because it runs inside the auth.users insert, before the
-- new user has a session. search_path is pinned to '' to prevent hijacking.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 80)
  )
  on conflict (id) do nothing;

  insert into public.cycle_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Permanently delete the calling user's account and all tracking data.
--
-- The browser only holds the public anon key, so it cannot use the admin API.
-- This SECURITY DEFINER function deletes ONLY the row whose id equals
-- auth.uid() — a caller can never target another account. Tracking data is
-- deleted explicitly and would also be removed by ON DELETE CASCADE.
-- -----------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from public.intercourse_records where user_id = current_user_id;
  delete from public.symptoms where user_id = current_user_id;
  delete from public.periods where user_id = current_user_id;
  delete from public.cycle_settings where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- Internal trigger functions are never callable through the API.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.prevent_period_overlap() from public, anon, authenticated;
revoke execute on function public.sync_profile_cycle_defaults() from public, anon, authenticated;
