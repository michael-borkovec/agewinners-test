/*
 * File purpose
 * - Convert wellbeing public booleans to standard visibility modes
 * - Keep defaults aligned with post/album visibility: everyone, contacts, private
 * - Backfill from earlier boolean columns when they exist
 */

begin;

alter table public.user_profiles
  add column if not exists wellbeing_mood_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_energy_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_sleep_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_movement_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_water_visibility_default text not null default 'everyone',
  add column if not exists wellbeing_food_visibility_default text not null default 'everyone';

alter table public.wellbeing_daily_entries
  add column if not exists mood_visibility text not null default 'everyone',
  add column if not exists energy_visibility text not null default 'everyone',
  add column if not exists sleep_visibility text not null default 'everyone',
  add column if not exists movement_visibility text not null default 'everyone',
  add column if not exists water_visibility text not null default 'everyone',
  add column if not exists food_visibility text not null default 'everyone';

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_profiles' and column_name = 'wellbeing_mood_public_default') then
    update public.user_profiles
    set
      wellbeing_mood_visibility_default = case when wellbeing_mood_public_default then 'everyone' else 'private' end,
      wellbeing_energy_visibility_default = case when wellbeing_energy_public_default then 'everyone' else 'private' end,
      wellbeing_sleep_visibility_default = case when wellbeing_sleep_public_default then 'everyone' else 'private' end,
      wellbeing_movement_visibility_default = case when wellbeing_movement_public_default then 'everyone' else 'private' end,
      wellbeing_water_visibility_default = case when wellbeing_water_public_default then 'everyone' else 'private' end,
      wellbeing_food_visibility_default = case when wellbeing_food_public_default then 'everyone' else 'private' end;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wellbeing_daily_entries' and column_name = 'mood_public') then
    update public.wellbeing_daily_entries
    set
      mood_visibility = case when mood_public then 'everyone' else 'private' end,
      energy_visibility = case when energy_public then 'everyone' else 'private' end,
      sleep_visibility = case when sleep_public then 'everyone' else 'private' end,
      movement_visibility = case when movement_public then 'everyone' else 'private' end,
      water_visibility = case when water_public then 'everyone' else 'private' end,
      food_visibility = case when food_public then 'everyone' else 'private' end;
  end if;
end $$;

alter table public.user_profiles
  drop constraint if exists user_profiles_wellbeing_mood_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_energy_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_sleep_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_movement_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_water_visibility_default_check,
  drop constraint if exists user_profiles_wellbeing_food_visibility_default_check;

alter table public.user_profiles
  add constraint user_profiles_wellbeing_mood_visibility_default_check check (wellbeing_mood_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_energy_visibility_default_check check (wellbeing_energy_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_sleep_visibility_default_check check (wellbeing_sleep_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_movement_visibility_default_check check (wellbeing_movement_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_water_visibility_default_check check (wellbeing_water_visibility_default in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_wellbeing_food_visibility_default_check check (wellbeing_food_visibility_default in ('everyone', 'contacts', 'private'));

alter table public.wellbeing_daily_entries
  drop constraint if exists wellbeing_daily_entries_mood_visibility_check,
  drop constraint if exists wellbeing_daily_entries_energy_visibility_check,
  drop constraint if exists wellbeing_daily_entries_sleep_visibility_check,
  drop constraint if exists wellbeing_daily_entries_movement_visibility_check,
  drop constraint if exists wellbeing_daily_entries_water_visibility_check,
  drop constraint if exists wellbeing_daily_entries_food_visibility_check;

alter table public.wellbeing_daily_entries
  add constraint wellbeing_daily_entries_mood_visibility_check check (mood_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_energy_visibility_check check (energy_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_sleep_visibility_check check (sleep_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_movement_visibility_check check (movement_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_water_visibility_check check (water_visibility in ('everyone', 'contacts', 'private')),
  add constraint wellbeing_daily_entries_food_visibility_check check (food_visibility in ('everyone', 'contacts', 'private'));

commit;
