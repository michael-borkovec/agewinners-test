/**
 * AW referrals
 *
 * Adds short public invite slugs and referral bonus support.
 * Referral activation = referred user has at least 1 uploaded image and 10 age guesses.
 * Bonus = 10% of referred user's latest Power score, for 30 days after activation, max top 10 active referrals.
 */

create extension if not exists pgcrypto;

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint referral_codes_slug_check check (slug ~ '^[a-z]{6,8}$')
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referral_slug text not null,
  registered_at timestamptz not null default now(),
  activated_at timestamptz null,
  bonus_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint referrals_no_self_check check (referrer_user_id <> referred_user_id),
  constraint referrals_one_referrer_per_user unique (referred_user_id)
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_user_id, activated_at, bonus_expires_at);

create index if not exists referrals_referred_idx
  on public.referrals (referred_user_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

drop policy if exists "referral_codes_select_own" on public.referral_codes;
create policy "referral_codes_select_own"
  on public.referral_codes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "referrals_select_referrer_or_referred" on public.referrals;
create policy "referrals_select_referrer_or_referred"
  on public.referrals
  for select
  to authenticated
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);

create or replace function public.generate_referral_slug()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  syllables text[] := array[
    'ha','ka','la','ma','na','pa','ra','sa','ta','va','za',
    'ko','lo','mo','no','po','ro','so','to','vo','zo',
    'ki','li','mi','ni','ri','si','ti','vi',
    'ku','lu','mu','nu','ru','su','tu','vu'
  ];
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..4 loop
      candidate := candidate || syllables[1 + floor(random() * array_length(syllables, 1))::int];
    end loop;

    if not exists (select 1 from public.referral_codes where slug = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

create or replace function public.ensure_referral_code_for_user(p_user_id uuid default auth.uid())
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  existing_slug text;
  next_slug text;
begin
  if p_user_id is null then
    raise exception 'Missing user id';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Cannot create referral code for another user';
  end if;

  select slug into existing_slug
  from public.referral_codes
  where user_id = p_user_id;

  if existing_slug is not null then
    return existing_slug;
  end if;

  loop
    next_slug := public.generate_referral_slug();
    begin
      insert into public.referral_codes (user_id, slug)
      values (p_user_id, next_slug);
      return next_slug;
    exception when unique_violation then
      -- Try another generated slug.
    end;
  end loop;
end;
$$;

create or replace function public.record_referral_from_slug(p_referred_user_id uuid, p_referral_slug text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  clean_slug text;
  referrer_id uuid;
  auth_created timestamptz;
begin
  clean_slug := lower(regexp_replace(coalesce(p_referral_slug, ''), '[^a-z]', '', 'g'));
  if clean_slug = '' then
    return;
  end if;

  select rc.user_id into referrer_id
  from public.referral_codes rc
  where rc.slug = clean_slug;

  if referrer_id is null or referrer_id = p_referred_user_id then
    return;
  end if;

  select coalesce(u.created_at, now()) into auth_created
  from auth.users u
  where u.id = p_referred_user_id;

  insert into public.referrals (referrer_user_id, referred_user_id, referral_slug, registered_at)
  values (referrer_id, p_referred_user_id, clean_slug, coalesce(auth_created, now()))
  on conflict (referred_user_id) do nothing;
end;
$$;

create or replace function public.handle_auth_user_referral()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.ensure_referral_code_for_user(new.id);
  perform public.record_referral_from_slug(new.id, new.raw_user_meta_data ->> 'referral_slug');
  return new;
end;
$$;

drop trigger if exists trg_auth_user_referral on auth.users;
create trigger trg_auth_user_referral
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_referral();

create or replace function public.refresh_referral_activations()
returns void
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  update public.referrals r
  set
    activated_at = now(),
    bonus_expires_at = now() + interval '30 days'
  where r.activated_at is null
    and (
      select count(*)
      from public.images i
      where i.uploader_user_id = r.referred_user_id
    ) >= 1
    and (
      select count(*)
      from public.age_guesses ag
      where ag.guesser_user_id = r.referred_user_id
    ) >= 10;
$$;

create or replace function public.get_referral_bonus_for_user(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  bonus numeric;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Cannot read referral bonus for another user';
  end if;

  perform public.refresh_referral_activations();

  with active_referrals as (
    select
      r.referred_user_id,
      coalesce(latest.power_score, 0)::numeric as referred_power_score
    from public.referrals r
    left join lateral (
      select h.power_score
      from public.aw_user_stats_history h
      where h.user_id = r.referred_user_id
      order by h.snapshot_date desc
      limit 1
    ) latest on true
    where r.referrer_user_id = p_user_id
      and r.activated_at is not null
      and r.bonus_expires_at > now()
    order by coalesce(latest.power_score, 0) desc
    limit 10
  )
  select coalesce(sum(referred_power_score * 0.10), 0)
    into bonus
  from active_referrals;

  return coalesce(bonus, 0);
end;
$$;

create or replace function public.get_my_referral_summary()
returns table (
  referral_slug text,
  referred_user_id uuid,
  display_name text,
  avatar_url text,
  registered_at timestamptz,
  activated_at timestamptz,
  bonus_expires_at timestamptz,
  status text,
  referred_power_score numeric,
  bonus_score numeric,
  days_remaining int
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_referral_code_for_user(auth.uid());
  perform public.refresh_referral_activations();

  return query
  select
    rc.slug as referral_slug,
    r.referred_user_id,
    up.display_name,
    up.avatar_url,
    r.registered_at,
    r.activated_at,
    r.bonus_expires_at,
    case
      when r.activated_at is null then 'pending'
      when r.bonus_expires_at <= now() then 'expired'
      else 'active'
    end as status,
    coalesce(latest.power_score, 0)::numeric as referred_power_score,
    case
      when r.activated_at is not null and r.bonus_expires_at > now()
        then coalesce(latest.power_score, 0)::numeric * 0.10
      else 0::numeric
    end as bonus_score,
    case
      when r.activated_at is not null and r.bonus_expires_at > now()
        then greatest(0, ceil(extract(epoch from (r.bonus_expires_at - now())) / 86400.0)::int)
      else 0
    end as days_remaining
  from public.referral_codes rc
  left join public.referrals r on r.referrer_user_id = rc.user_id
  left join public.user_profiles up on up.user_id = r.referred_user_id
  left join lateral (
    select h.power_score
    from public.aw_user_stats_history h
    where h.user_id = r.referred_user_id
    order by h.snapshot_date desc
    limit 1
  ) latest on true
  where rc.user_id = auth.uid()
  order by
    case
      when r.activated_at is not null and r.bonus_expires_at > now() then 0
      when r.activated_at is null then 1
      else 2
    end,
    coalesce(latest.power_score, 0) desc,
    r.registered_at desc;
end;
$$;

grant execute on function public.ensure_referral_code_for_user(uuid) to authenticated, service_role;
grant execute on function public.get_referral_bonus_for_user(uuid) to authenticated, service_role;
grant execute on function public.get_my_referral_summary() to authenticated;

do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.ensure_referral_code_for_user(u.id);
  end loop;
end
$$;
