/*
 * File purpose
 * - Extend wellbeing daily entries with food, liters, per-stat public flags, and optional values
 * - Add profile defaults for wellbeing public flags
 * - Store long-term plans and habits as owner-only daily plan rows
 */

begin;

alter table public.user_profiles
  add column if not exists wellbeing_daily_entry_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_mood_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_energy_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_sleep_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_movement_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_water_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_food_visibility_default text not null default 'everyone';

alter table public.user_profiles
  drop constraint if exists user_profiles_wellbeing_daily_entry_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_mood_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_energy_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_sleep_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_movement_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_water_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_food_visibility_default_check;

alter table public.user_profiles
  add constraint user_profiles_wellbeing_daily_entry_visibility_default_check check (wellbeing_daily_entry_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_mood_visibility_default_check check (wellbeing_mood_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_energy_visibility_default_check check (wellbeing_energy_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_sleep_visibility_default_check check (wellbeing_sleep_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_movement_visibility_default_check check (wellbeing_movement_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_water_visibility_default_check check (wellbeing_water_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_food_visibility_default_check check (wellbeing_food_visibility_default in ('everyone', 'contacts', 'private'));

alter table public.wellbeing_daily_entries
  add column if not exists water_liters numeric(3,1),
  add column if not exists food_amount text,
  add column if not exists food_type text,
  add column if not exists entry_visibility text not null default 'everyone',
  add column if not exists mood_visibility text not null default 'everyone',
  add column if not exists energy_visibility text not null default 'everyone',
  add column if not exists sleep_visibility text not null default 'everyone',
  add column if not exists movement_visibility text not null default 'everyone',
  add column if not exists water_visibility text not null default 'everyone',
  add column if not exists food_visibility text not null default 'everyone';

update public.wellbeing_daily_entries
set water_liters = round((water_glasses::numeric * 0.25) * 2) / 2
where water_liters is null and water_glasses is not null;

alter table public.wellbeing_daily_entries
  alter column mood drop not null,
  alter column mood_score drop not null,
  alter column energy_score drop not null,
  alter column sleep_hours drop not null,
  alter column movement_minutes drop not null,
  alter column water_glasses drop not null;

alter table public.wellbeing_daily_entries
  drop constraint if exists wellbeing_daily_entries_mood_check,
  drop constraint if exists wellbeing_daily_entries_mood_score_check,
  drop constraint if exists wellbeing_daily_entries_energy_score_check,
  drop constraint if exists wellbeing_daily_entries_sleep_hours_check,
  drop constraint if exists wellbeing_daily_entries_movement_minutes_check,
  drop constraint if exists wellbeing_daily_entries_water_liters_check,
  drop constraint if exists wellbeing_daily_entries_food_amount_check,
  drop constraint if exists wellbeing_daily_entries_food_type_check,
  drop constraint if exists wellbeing_daily_entries_food_none_type_check,
  drop constraint if exists wellbeing_daily_entries_entry_visibility_check,
  drop constraint if exists wellbeing_daily_entries_mood_visibility_check,
  drop constraint if exists wellbeing_daily_entries_energy_visibility_check,
  drop constraint if exists wellbeing_daily_entries_sleep_visibility_check,
  drop constraint if exists wellbeing_daily_entries_movement_visibility_check,
  drop constraint if exists wellbeing_daily_entries_water_visibility_check,
  drop constraint if exists wellbeing_daily_entries_food_visibility_check;

alter table public.wellbeing_daily_entries
  add constraint wellbeing_daily_entries_mood_check check (mood is null or mood in ('lehka', 'klid', 'radost', 'unava', 'napeti')),
  add constraint wellbeing_daily_entries_mood_score_check check (mood_score is null or mood_score between 1 and 10),
  add constraint wellbeing_daily_entries_energy_score_check check (energy_score is null or energy_score between 1 and 10),
  add constraint wellbeing_daily_entries_sleep_hours_check check (sleep_hours is null or sleep_hours between 0 and 24),
  add constraint wellbeing_daily_entries_movement_minutes_check check (movement_minutes is null or movement_minutes between 0 and 1440),
  add constraint wellbeing_daily_entries_water_liters_check check (water_liters is null or (water_liters between 0.5 and 5 and water_liters * 2 = floor(water_liters * 2))),
  add constraint wellbeing_daily_entries_food_amount_check check (food_amount is null or food_amount in ('malo', 'bezne', 'moc', 'bez_jidla')),
  add constraint wellbeing_daily_entries_food_type_check check (food_type is null or food_type in ('dietni', 'vegan', 'vegetarian', 'vyvazena', 'bezna', 'sladke', 'maso', 'nezdrava')),
  add constraint wellbeing_daily_entries_food_none_type_check check (food_amount is distinct from 'bez_jidla' or food_type is null),
  add constraint wellbeing_daily_entries_entry_visibility_check check (entry_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_mood_visibility_check check (mood_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_energy_visibility_check check (energy_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_sleep_visibility_check check (sleep_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_movement_visibility_check check (movement_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_water_visibility_check check (water_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_food_visibility_check check (food_visibility in ('everyone', 'contacts', 'private'));

create table if not exists public.wellbeing_plan_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  sleep_hours numeric(4,1),
  movement_minutes integer,
  water_liters numeric(3,1),
  food_amount text,
  food_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellbeing_plan_entries_pkey primary key (user_id, plan_date),
  constraint wellbeing_plan_entries_sleep_hours_check check (sleep_hours is null or sleep_hours between 0 and 24),
  constraint wellbeing_plan_entries_movement_minutes_check check (movement_minutes is null or movement_minutes between 0 and 1440),
  constraint wellbeing_plan_entries_water_liters_check check (water_liters is null or (water_liters between 0.5 and 5 and water_liters * 2 = floor(water_liters * 2))),
  constraint wellbeing_plan_entries_food_amount_check check (food_amount is null or food_amount in ('malo', 'bezne', 'moc', 'bez_jidla')),
  constraint wellbeing_plan_entries_food_type_check check (food_type is null or food_type in ('dietni', 'vegan', 'vegetarian', 'vyvazena', 'bezna', 'sladke', 'maso', 'nezdrava')),
  constraint wellbeing_plan_entries_food_none_type_check check (food_amount is distinct from 'bez_jidla' or food_type is null)
);

create index if not exists wellbeing_plan_entries_user_date_idx
  on public.wellbeing_plan_entries (user_id, plan_date desc);

alter table public.wellbeing_plan_entries enable row level security;

drop policy if exists "wellbeing_plan_entries_select_own" on public.wellbeing_plan_entries;
create policy "wellbeing_plan_entries_select_own"
  on public.wellbeing_plan_entries
  for select
  using (auth.uid() = user_id);

drop policy if exists "wellbeing_plan_entries_insert_own" on public.wellbeing_plan_entries;
create policy "wellbeing_plan_entries_insert_own"
  on public.wellbeing_plan_entries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_plan_entries_update_own" on public.wellbeing_plan_entries;
create policy "wellbeing_plan_entries_update_own"
  on public.wellbeing_plan_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_plan_entries_delete_own" on public.wellbeing_plan_entries;
create policy "wellbeing_plan_entries_delete_own"
  on public.wellbeing_plan_entries
  for delete
  using (auth.uid() = user_id);

create or replace function public.wellbeing_plan_entries_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wellbeing_plan_entries_set_updated_at on public.wellbeing_plan_entries;
create trigger wellbeing_plan_entries_set_updated_at
before update on public.wellbeing_plan_entries
for each row
execute function public.wellbeing_plan_entries_set_updated_at();

commit;
