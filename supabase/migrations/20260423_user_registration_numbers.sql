/**
 * User registration numbers
 *
 * Assigns each auth user a permanent unique registration order starting at 1.
 * Source of truth is auth.users insert order; public.user_profiles mirrors the value.
 */

create sequence if not exists public.user_registration_number_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create table if not exists public.user_registration_orders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration_number bigint not null unique default nextval('public.user_registration_number_seq'),
  auth_created_at timestamptz not null,
  assigned_at timestamptz not null default now()
);

alter table public.user_registration_orders enable row level security;

drop policy if exists "user_registration_orders_select_own" on public.user_registration_orders;
create policy "user_registration_orders_select_own"
  on public.user_registration_orders
  for select
  to authenticated
  using (auth.uid() = user_id);

with existing_max as (
  select coalesce(max(registration_number), 0) as max_num
  from public.user_registration_orders
),
missing_users as (
  select
    u.id as user_id,
    coalesce(u.created_at, now()) as auth_created_at,
    row_number() over (order by coalesce(u.created_at, now()), u.id) as rn
  from auth.users u
  left join public.user_registration_orders uro on uro.user_id = u.id
  where uro.user_id is null
)
insert into public.user_registration_orders (user_id, registration_number, auth_created_at, assigned_at)
select
  mu.user_id,
  em.max_num + mu.rn,
  mu.auth_created_at,
  now()
from missing_users mu
cross join existing_max em;

do $$
declare
  max_registration_number bigint;
begin
  select max(registration_number)
    into max_registration_number
  from public.user_registration_orders;

  if max_registration_number is null then
    perform setval('public.user_registration_number_seq', 1, false);
  else
    perform setval('public.user_registration_number_seq', max_registration_number, true);
  end if;
end
$$;

create or replace function public.ensure_user_registration_order_for_user(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  existing_number bigint;
  auth_created timestamptz;
begin
  select uro.registration_number
    into existing_number
  from public.user_registration_orders uro
  where uro.user_id = p_user_id;

  if existing_number is not null then
    return existing_number;
  end if;

  select coalesce(u.created_at, now())
    into auth_created
  from auth.users u
  where u.id = p_user_id;

  if auth_created is null then
    auth_created := now();
  end if;

  insert into public.user_registration_orders (user_id, auth_created_at)
  values (p_user_id, auth_created)
  on conflict (user_id) do nothing;

  select uro.registration_number
    into existing_number
  from public.user_registration_orders uro
  where uro.user_id = p_user_id;

  return existing_number;
end;
$$;

create or replace function public.handle_auth_user_registration_order()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.ensure_user_registration_order_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists trg_auth_user_registration_order on auth.users;
create trigger trg_auth_user_registration_order
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_registration_order();

alter table public.user_profiles
  add column if not exists registration_number bigint;

create or replace function public.apply_user_profile_registration_number()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if new.registration_number is null and new.user_id is not null then
    new.registration_number := public.ensure_user_registration_order_for_user(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_registration_number on public.user_profiles;
create trigger trg_user_profiles_registration_number
  before insert or update of user_id, registration_number on public.user_profiles
  for each row
  execute function public.apply_user_profile_registration_number();

update public.user_profiles up
set registration_number = uro.registration_number
from public.user_registration_orders uro
where up.user_id = uro.user_id
  and up.registration_number is distinct from uro.registration_number;

create unique index if not exists user_profiles_registration_number_uidx
  on public.user_profiles (registration_number)
  where registration_number is not null;
