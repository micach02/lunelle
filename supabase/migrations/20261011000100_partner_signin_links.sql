-- =============================================================================
-- Lunelle — password-less sign-in links for partners
--
-- Partners never fill in a sign-up form: the invite email contains a one-time
-- sign-in link, and a returning partner can request a fresh link by email.
-- Behind the scenes they still get a (password-less) account, so access stays
-- tied to their verified email address and remains revocable.
--
-- claim_partner_signin_link() is called ONLY by the send-partner-signin Edge
-- Function (service role). It answers "may we email a sign-in link to this
-- address right now?" — true only for addresses that have an active share,
-- with a 60-second cooldown and a daily cap to prevent email abuse.
-- =============================================================================

create table public.partner_signin_requests (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index partner_signin_requests_email_created_idx
  on public.partner_signin_requests (email, created_at desc);

-- Internal bookkeeping: no API role may read or write it.
alter table public.partner_signin_requests enable row level security;
revoke all on table public.partner_signin_requests from anon, authenticated, public;

create or replace function public.claim_partner_signin_link(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  -- Keep only recent rate-limit rows (they contain email addresses).
  delete from public.partner_signin_requests where created_at < now() - interval '2 days';

  if not exists (
    select 1
    from public.partner_shares s
    left join auth.users u on u.id = s.partner_id
    where s.status in ('pending', 'accepted')
      and (s.partner_email = v_email or lower(u.email) = v_email)
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.partner_signin_requests
    where email = v_email and created_at > now() - interval '60 seconds'
  ) then
    return false;
  end if;

  if (
    select count(*) from public.partner_signin_requests
    where email = v_email and created_at > now() - interval '1 day'
  ) >= 10 then
    return false;
  end if;

  insert into public.partner_signin_requests (email) values (v_email);
  return true;
end;
$$;

revoke execute on function public.claim_partner_signin_link(text) from public, anon, authenticated;
grant execute on function public.claim_partner_signin_link(text) to service_role;
