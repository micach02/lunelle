-- =============================================================================
-- Lunelle — optional partner edit access
--
-- The owner may allow an accepted partner to ADD and EDIT records on their
-- behalf (off by default). Rules:
-- * Partners still have no direct table access. All writes go through the
--   partner_save_* SECURITY DEFINER functions below, which require an
--   accepted share with can_edit = true and the relevant category shared.
-- * Partners can never delete records; deleting stays owner-only.
-- * Partners can only write notes when the owner shares notes; otherwise
--   existing notes are left untouched and new records get none.
-- * Rows written by a partner are flagged entered_by_partner so the owner
--   can see who added them.
--
-- New SQLSTATE: LU007 editing not allowed for this share / category.
-- =============================================================================

alter table public.partner_shares add column can_edit boolean not null default false;

alter table public.periods add column entered_by_partner boolean not null default false;
alter table public.intercourse_records add column entered_by_partner boolean not null default false;
alter table public.symptoms add column entered_by_partner boolean not null default false;

-- -----------------------------------------------------------------------------
-- Owner functions gain the can_edit switch (signatures change → drop first).
-- -----------------------------------------------------------------------------
drop function public.create_partner_invite(text, boolean, boolean, boolean);
drop function public.update_partner_share(uuid, boolean, boolean, boolean);
drop function public.get_partner_invitations();

create function public.create_partner_invite(
  p_partner_email text,
  p_share_symptoms boolean default false,
  p_share_intimacy boolean default false,
  p_share_notes boolean default false,
  p_can_edit boolean default false
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

  insert into public.partner_shares (owner_id, partner_email, share_symptoms, share_intimacy, share_notes, can_edit)
  values (v_uid, v_email, p_share_symptoms, p_share_intimacy, p_share_notes, p_can_edit)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.update_partner_share(
  p_share_id uuid,
  p_share_symptoms boolean,
  p_share_intimacy boolean,
  p_share_notes boolean,
  p_can_edit boolean
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
         share_notes = p_share_notes,
         can_edit = p_can_edit
   where id = p_share_id
     and owner_id = auth.uid()
     and status in ('pending', 'accepted');
  if not found then
    raise exception 'Invitation not found.' using errcode = 'LU004';
  end if;
end;
$$;

create function public.get_partner_invitations()
returns table (
  share_id uuid,
  owner_name text,
  status text,
  share_symptoms boolean,
  share_intimacy boolean,
  share_notes boolean,
  can_edit boolean,
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
           s.share_symptoms, s.share_intimacy, s.share_notes, s.can_edit, s.created_at, s.accepted_at
    from public.partner_shares s
    where (s.status = 'accepted' and s.partner_id = v_uid)
       or (s.status = 'pending' and v_email is not null and s.partner_email = v_email and s.owner_id <> v_uid)
    order by s.created_at desc;
end;
$$;

-- Shared data now also tells the partner whether they may edit.
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
    'can_edit', v_share.can_edit,
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
-- Partner write functions (add / edit only — never delete)
-- -----------------------------------------------------------------------------

-- The accepted, editable share for the calling partner, or LU007.
create or replace function public.partner_editable_share(p_share_id uuid)
returns public.partner_shares
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
  where s.id = p_share_id and s.status = 'accepted' and s.partner_id = auth.uid() and s.can_edit;
  if not found then
    raise exception 'Editing is not allowed.' using errcode = 'LU007';
  end if;
  return v_share;
end;
$$;

create or replace function public.partner_save_period(
  p_share_id uuid,
  p_period_id uuid,
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share public.partner_shares := public.partner_editable_share(p_share_id);
  v_id uuid;
begin
  if p_start_date > current_date + 1 or (p_end_date is not null and p_end_date > current_date + 1) then
    raise exception 'Dates can''t be in the future.' using errcode = '23514';
  end if;

  if p_period_id is null then
    insert into public.periods (user_id, start_date, end_date, entered_by_partner)
    values (v_share.owner_id, p_start_date, p_end_date, true)
    returning id into v_id;
  else
    update public.periods
       set start_date = p_start_date, end_date = p_end_date, entered_by_partner = true
     where id = p_period_id and user_id = v_share.owner_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Record not found.' using errcode = 'LU004';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.partner_save_symptoms(
  p_share_id uuid,
  p_log_id uuid,
  p_symptom_date date,
  p_symptoms jsonb,
  p_mood text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share public.partner_shares := public.partner_editable_share(p_share_id);
  v_id uuid;
begin
  if not v_share.share_symptoms then
    raise exception 'Editing is not allowed.' using errcode = 'LU007';
  end if;
  if p_symptom_date > current_date + 1 then
    raise exception 'Dates can''t be in the future.' using errcode = '23514';
  end if;

  if p_log_id is null then
    insert into public.symptoms (user_id, symptom_date, symptoms, mood, notes, entered_by_partner)
    values (v_share.owner_id, p_symptom_date, coalesce(p_symptoms, '[]'::jsonb), p_mood,
            case when v_share.share_notes then p_notes end, true)
    returning id into v_id;
  else
    update public.symptoms
       set symptom_date = p_symptom_date,
           symptoms = coalesce(p_symptoms, '[]'::jsonb),
           mood = p_mood,
           -- Without notes access, existing notes are left exactly as they were.
           notes = case when v_share.share_notes then p_notes else notes end,
           entered_by_partner = true
     where id = p_log_id and user_id = v_share.owner_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Record not found.' using errcode = 'LU004';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.partner_save_intimacy(
  p_share_id uuid,
  p_record_id uuid,
  p_occurred_at timestamptz,
  p_protection_method text,
  p_ejaculation text,
  p_emergency_contraception boolean,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share public.partner_shares := public.partner_editable_share(p_share_id);
  v_id uuid;
begin
  if not v_share.share_intimacy then
    raise exception 'Editing is not allowed.' using errcode = 'LU007';
  end if;
  if p_occurred_at > now() + interval '5 minutes' then
    raise exception 'Dates can''t be in the future.' using errcode = '23514';
  end if;

  if p_record_id is null then
    insert into public.intercourse_records
      (user_id, occurred_at, protection_method, ejaculation, emergency_contraception, notes, entered_by_partner)
    values (v_share.owner_id, p_occurred_at, p_protection_method, p_ejaculation,
            coalesce(p_emergency_contraception, false), case when v_share.share_notes then p_notes end, true)
    returning id into v_id;
  else
    update public.intercourse_records
       set occurred_at = p_occurred_at,
           protection_method = p_protection_method,
           ejaculation = p_ejaculation,
           emergency_contraception = coalesce(p_emergency_contraception, false),
           notes = case when v_share.share_notes then p_notes else notes end,
           entered_by_partner = true
     where id = p_record_id and user_id = v_share.owner_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Record not found.' using errcode = 'LU004';
    end if;
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke execute on function public.partner_editable_share(uuid) from public, anon, authenticated;

revoke execute on function public.create_partner_invite(text, boolean, boolean, boolean, boolean) from public, anon;
revoke execute on function public.update_partner_share(uuid, boolean, boolean, boolean, boolean) from public, anon;
revoke execute on function public.get_partner_invitations() from public, anon;
revoke execute on function public.partner_save_period(uuid, uuid, date, date) from public, anon;
revoke execute on function public.partner_save_symptoms(uuid, uuid, date, jsonb, text, text) from public, anon;
revoke execute on function public.partner_save_intimacy(uuid, uuid, timestamptz, text, text, boolean, text) from public, anon;

grant execute on function public.create_partner_invite(text, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.update_partner_share(uuid, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.get_partner_invitations() to authenticated;
grant execute on function public.partner_save_period(uuid, uuid, date, date) to authenticated;
grant execute on function public.partner_save_symptoms(uuid, uuid, date, jsonb, text, text) to authenticated;
grant execute on function public.partner_save_intimacy(uuid, uuid, timestamptz, text, text, boolean, text) to authenticated;
