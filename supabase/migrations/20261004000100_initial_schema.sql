-- =============================================================================
-- Lunelle — initial schema
-- Tables: profiles, periods, intercourse_records, symptoms, cycle_settings
-- Every user-owned row references auth.users and is removed when the user is.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users; id IS the auth user id)
-- average_* columns mirror cycle_settings (the source of truth) via trigger.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  date_of_birth date,
  average_cycle_length integer not null default 28,
  average_period_length integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 80),
  constraint profiles_cycle_length_range check (average_cycle_length between 18 and 60),
  constraint profiles_period_length_range check (average_period_length between 1 and 14)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- periods
-- -----------------------------------------------------------------------------
create table public.periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint periods_end_after_start check (end_date is null or end_date >= start_date),
  constraint periods_max_duration check (end_date is null or end_date - start_date <= 20)
);

create index periods_user_id_idx on public.periods (user_id);
create index periods_user_start_date_idx on public.periods (user_id, start_date desc);

create trigger periods_set_updated_at
  before update on public.periods
  for each row execute function public.set_updated_at();

-- Reject overlapping periods for the same user. Runs as the invoking user, so
-- under RLS it can only ever see (and therefore only compare against) that
-- user's own rows — it never reveals anything about other users.
create or replace function public.prevent_period_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.periods p
    where p.user_id = new.user_id
      and p.id <> new.id
      and daterange(p.start_date, coalesce(p.end_date, p.start_date), '[]')
          && daterange(new.start_date, coalesce(new.end_date, new.start_date), '[]')
  ) then
    raise exception 'This period overlaps an existing period.'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger periods_prevent_overlap
  before insert or update on public.periods
  for each row execute function public.prevent_period_overlap();

-- -----------------------------------------------------------------------------
-- intercourse_records
-- -----------------------------------------------------------------------------
create table public.intercourse_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  protection_method text not null default 'unknown',
  ejaculation text not null default 'unknown',
  emergency_contraception boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intercourse_protection_method_valid check (
    protection_method in ('none', 'condom', 'hormonal_contraception', 'withdrawal', 'other', 'unknown')
  ),
  constraint intercourse_ejaculation_valid check (
    ejaculation in ('inside', 'outside', 'unknown', 'not_applicable')
  ),
  constraint intercourse_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index intercourse_records_user_id_idx on public.intercourse_records (user_id);
create index intercourse_records_user_occurred_at_idx on public.intercourse_records (user_id, occurred_at desc);

create trigger intercourse_records_set_updated_at
  before update on public.intercourse_records
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- symptoms (one log per user per day)
-- -----------------------------------------------------------------------------
create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symptom_date date not null,
  symptoms jsonb not null default '[]'::jsonb,
  mood text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint symptoms_one_log_per_day unique (user_id, symptom_date),
  constraint symptoms_is_known_array check (
    jsonb_typeof(symptoms) = 'array'
    and symptoms <@ '["cramps","headache","bloating","breast_tenderness","fatigue","acne","back_pain","nausea","other"]'::jsonb
  ),
  constraint symptoms_mood_valid check (
    mood is null or mood in ('happy', 'normal', 'sad', 'irritated', 'anxious', 'tired')
  ),
  constraint symptoms_notes_length check (notes is null or char_length(notes) <= 2000)
);

-- The unique constraint already indexes (user_id, symptom_date).
create index symptoms_user_id_idx on public.symptoms (user_id);

create trigger symptoms_set_updated_at
  before update on public.symptoms
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- cycle_settings (one row per user; source of truth for cycle defaults)
-- -----------------------------------------------------------------------------
create table public.cycle_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  average_cycle_length integer not null default 28,
  average_period_length integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cycle_settings_one_per_user unique (user_id),
  constraint cycle_settings_cycle_length_range check (average_cycle_length between 18 and 60),
  constraint cycle_settings_period_length_range check (average_period_length between 1 and 14),
  constraint cycle_settings_period_shorter_than_cycle check (average_period_length < average_cycle_length)
);

create trigger cycle_settings_set_updated_at
  before update on public.cycle_settings
  for each row execute function public.set_updated_at();

-- Mirror the averages onto the profile so both stay consistent.
-- Runs as the invoking user (RLS applies: a user can only touch their own profile).
create or replace function public.sync_profile_cycle_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.profiles
     set average_cycle_length = new.average_cycle_length,
         average_period_length = new.average_period_length
   where id = new.user_id;
  return new;
end;
$$;

create trigger cycle_settings_sync_profile
  after insert or update of average_cycle_length, average_period_length on public.cycle_settings
  for each row execute function public.sync_profile_cycle_defaults();
