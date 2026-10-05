-- =============================================================================
-- Lunelle — partner sharing (read-only, owner-controlled)
--
-- Design
-- ------
-- * The owner's tracking tables keep their strict owner-only RLS. Partners are
--   NEVER granted direct access to periods / symptoms / intercourse_records.
-- * A partner reads shared data only through get_partner_shared_data(), a
--   SECURITY DEFINER function that verifies an ACCEPTED share, returns only
--   the categories the owner enabled, and strips notes unless allowed.
--   Nothing in this migration lets a partner write anything.
-- * Every change to a share goes through a function with explicit checks.
--   The table itself is read-only (SELECT for the owner) through the API.
-- * Only the owner can create a share; a partner cannot request access.
-- * Invitations are matched to the partner's CONFIRMED account email.
--
-- Custom SQLSTATEs (mapped to friendly messages in src/lib/errors.ts):
--   LU001 cannot invite yourself         LU004 invitation not found / no longer active
--   LU002 an active share already exists LU005 email not verified or does not match
--   LU003 too many invitations today     LU006 invitation email sent too recently
-- =============================================================================

create table public.partner_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  partner_email text not null,
  partner_id uuid references auth.users (id) on delete cascade,
  status text not null default 'pending',
  -- Cycle phases, period history and estimates are always part of a share.
  share_symptoms boolean not null default false,
  share_intimacy boolean not null default false,
  share_notes boolean not null default false,
  last_emailed_at timestamptz,
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_shares_status_valid check (status in ('pending', 'accepted', 'declined', 'revoked')),
  constraint partner_shares_email_format check (
    partner_email = lower(partner_email)
    and char_length(partner_email) <= 254
    and partner_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint partner_shares_accepted_has_partner check (status <> 'accepted' or partner_id is not null),
  constraint partner_shares_not_self check (partner_id is null or partner_id <> owner_id)
);

-- One active (pending or accepted) share per owner.
create unique index partner_shares_one_active_per_owner
  on public.partner_shares (owner_id) where status in ('pending', 'accepted');
create index partner_shares_owner_id_idx on public.partner_shares (owner_id);
create index partner_shares_partner_id_idx on public.partner_shares (partner_id) where status = 'accepted';
create index partner_shares_pending_email_idx on public.partner_shares (partner_email) where status = 'pending';

create trigger partner_shares_set_updated_at
  before update on public.partner_shares
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: the owner may read their own shares. No other access via the API.
-- -----------------------------------------------------------------------------
alter table public.partner_shares enable row level security;

revoke all on table public.partner_shares from anon, authenticated, public;
grant select on table public.partner_shares to authenticated;

create policy "partner_shares: owner can view" on public.partner_shares
  for select to authenticated
  using ((select auth.uid()) = owner_id);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- The caller's email, but only if it has been confirmed.
create or replace function public.current_verified_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null
$$;

-- Name a partner sees for an owner: display name, falling back to their email.
create or replace function public.partner_owner_label(p_owner_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.display_name), ''), u.email, 'A Lunelle user')
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_owner_id
$$;

-- -----------------------------------------------------------------------------
-- Owner functions
-- -----------------------------------------------------------------------------

create or replace function public.create_partner_invite(
  p_partner_email text,
  p_share_symptoms boolean default false,
  p_share_intimacy boolean default false,
  p_share_notes boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_partner_email, '')));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_email = (select lower(email) from auth.users where id = v_uid) then
    raise exception 'You can''t invite yourself.' using errcode = 'LU001';
  end if;
  if exists (
    select 1 from public.partner_shares
    where owner_id = v_uid and status in ('pending', 'accepted')
  ) then
    raise exception 'You already have an active partner share.' using errcode = 'LU002';
  end if;
  if (
    select count(*) from public.partner_shares
    where owner_id = v_uid and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Too many invitations today.' using errcode = 'LU003';
  end if;

  insert into public.partner_shares (owner_id, partner_email, share_symptoms, share_intimacy, share_notes)
  values (v_uid, v_email, p_share_symptoms, p_share_intimacy, p_share_notes)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_partner_share(
  p_share_id uuid,
  p_share_symptoms boolean,
  p_share_intimacy boolean,
  p_share_notes boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.partner_shares
     set share_symptoms = p_share_symptoms,
         share_intimacy = p_share_intimacy,
         share_notes = p_share_notes
   where id = p_share_id
     and owner_id = auth.uid()
     and status in ('pending', 'accepted');
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;
end;
$$;

-- Cancel a pending invitation or stop an accepted share. Takes effect immediately.
create or replace function public.revoke_partner_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.partner_shares
     set status = 'revoked', ended_at = now()
   where id = p_share_id
     and owner_id = auth.uid()
     and status in ('pending', 'accepted');
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;
end;
$$;

-- Used by the send-partner-invite Edge Function (called with the OWNER's JWT).
-- Atomically enforces a resend cooldown and returns what the email needs.
create or replace function public.record_partner_invite_email(p_share_id uuid)
returns table (partner_email text, inviter_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share public.partner_shares%rowtype;
begin
  select * into v_share
  from public.partner_shares s
  where s.id = p_share_id and s.owner_id = auth.uid() and s.status = 'pending'
  for update;
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;
  if v_share.last_emailed_at is not null and v_share.last_emailed_at > now() - interval '60 seconds' then
    raise exception 'Invitation email sent too recently.' using errcode = 'LU006';
  end if;

  update public.partner_shares set last_emailed_at = now() where id = p_share_id;
  return query select v_share.partner_email, public.partner_owner_label(v_share.owner_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Partner functions
-- -----------------------------------------------------------------------------

-- Invitations addressed to the caller's verified email, and shares they accepted.
create or replace function public.get_partner_invitations()
returns table (
  share_id uuid,
  owner_name text,
  status text,
  share_symptoms boolean,
  share_intimacy boolean,
  share_notes boolean,
  invited_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := public.current_verified_email();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  return query
    select s.id, public.partner_owner_label(s.owner_id), s.status,
           s.share_symptoms, s.share_intimacy, s.share_notes, s.created_at, s.accepted_at
    from public.partner_shares s
    where (s.status = 'accepted' and s.partner_id = v_uid)
       or (s.status = 'pending' and v_email is not null and s.partner_email = v_email and s.owner_id <> v_uid)
    order by s.created_at desc;
end;
$$;

create or replace function public.accept_partner_invite(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := public.current_verified_email();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_email is null then
    raise exception 'Please verify your email first.' using errcode = 'LU005';
  end if;
  update public.partner_shares
     set status = 'accepted', partner_id = v_uid, accepted_at = now()
   where id = p_share_id
     and status = 'pending'
     and partner_email = v_email
     and owner_id <> v_uid;
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;
end;
$$;

-- Partner declines a pending invitation or stops viewing an accepted share.
create or replace function public.leave_partner_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := public.current_verified_email();
begin
  update public.partner_shares
     set status = case when status = 'pending' then 'declined' else 'revoked' end,
         ended_at = now()
   where id = p_share_id
     and (
       (status = 'accepted' and partner_id = v_uid)
       or (status = 'pending' and v_email is not null and partner_email = v_email)
     );
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;
end;
$$;

-- The ONLY way a partner can read an owner's data. Read-only by construction.
create or replace function public.get_partner_shared_data(p_share_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_share public.partner_shares%rowtype;
begin
  select * into v_share
  from public.partner_shares s
  where s.id = p_share_id and s.status = 'accepted' and s.partner_id = auth.uid();
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;

  return jsonb_build_object(
    'owner_name', public.partner_owner_label(v_share.owner_id),
    'share_symptoms', v_share.share_symptoms,
    'share_intimacy', v_share.share_intimacy,
    'share_notes', v_share.share_notes,
    'settings', (
      select jsonb_build_object(
        'average_cycle_length', c.average_cycle_length,
        'average_period_length', c.average_period_length)
      from public.cycle_settings c where c.user_id = v_share.owner_id
    ),
    'periods', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'start_date', p.start_date, 'end_date', p.end_date)
                       order by p.start_date desc)
      from public.periods p where p.user_id = v_share.owner_id
    ), '[]'::jsonb),
    'symptoms', case when v_share.share_symptoms then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'symptom_date', s.symptom_date, 'symptoms', s.symptoms, 'mood', s.mood,
               'notes', case when v_share.share_notes then s.notes end)
             order by s.symptom_date desc)
      from public.symptoms s where s.user_id = v_share.owner_id
    ), '[]'::jsonb) end,
    'intimacy', case when v_share.share_intimacy then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'occurred_at', i.occurred_at, 'protection_method', i.protection_method,
               'ejaculation', i.ejaculation, 'emergency_contraception', i.emergency_contraception,
               'notes', case when v_share.share_notes then i.notes end)
             order by i.occurred_at desc)
      from public.intercourse_records i where i.user_id = v_share.owner_id
    ), '[]'::jsonb) end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Account deletion also removes shares in both directions.
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

  delete from public.partner_shares where owner_id = current_user_id or partner_id = current_user_id;
  delete from public.intercourse_records where user_id = current_user_id;
  delete from public.symptoms where user_id = current_user_id;
  delete from public.periods where user_id = current_user_id;
  delete from public.cycle_settings where user_id = current_user_id;
  delete from public.profiles where id = current_user_id;
  delete from auth.users where id = current_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges: authenticated users only; helpers are internal.
-- -----------------------------------------------------------------------------
revoke execute on function public.current_verified_email() from public, anon, authenticated;
revoke execute on function public.partner_owner_label(uuid) from public, anon, authenticated;

revoke execute on function public.create_partner_invite(text, boolean, boolean, boolean) from public, anon;
revoke execute on function public.update_partner_share(uuid, boolean, boolean, boolean) from public, anon;
revoke execute on function public.revoke_partner_share(uuid) from public, anon;
revoke execute on function public.record_partner_invite_email(uuid) from public, anon;
revoke execute on function public.get_partner_invitations() from public, anon;
revoke execute on function public.accept_partner_invite(uuid) from public, anon;
revoke execute on function public.leave_partner_share(uuid) from public, anon;
revoke execute on function public.get_partner_shared_data(uuid) from public, anon;

grant execute on function public.create_partner_invite(text, boolean, boolean, boolean) to authenticated;
grant execute on function public.update_partner_share(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.revoke_partner_share(uuid) to authenticated;
grant execute on function public.record_partner_invite_email(uuid) to authenticated;
grant execute on function public.get_partner_invitations() to authenticated;
grant execute on function public.accept_partner_invite(uuid) to authenticated;
grant execute on function public.leave_partner_share(uuid) to authenticated;
grant execute on function public.get_partner_shared_data(uuid) to authenticated;
