/*
 * File purpose
 * - Use one standard visibility value for the whole wellbeing daily entry
 * - Keep default aligned with profile content visibility values
 * - Preserve compatibility with earlier per-field visibility columns if present
 */

begin;

alter table public.user_profiles
  add column if not exists wellbeing_daily_entry_visibility_default text not null default 'everyone';

alter table public.user_profiles
  drop constraint if exists user_profiles_wellbeing_daily_entry_visibility_default_check;

alter table public.user_profiles
  add constraint user_profiles_wellbeing_daily_entry_visibility_default_check
  check (wellbeing_daily_entry_visibility_default in ('everyone', 'contacts', 'private'));

alter table public.wellbeing_daily_entries
  add column if not exists entry_visibility text not null default 'everyone';

alter table public.wellbeing_daily_entries
  drop constraint if exists wellbeing_daily_entries_entry_visibility_check;

alter table public.wellbeing_daily_entries
  add constraint wellbeing_daily_entries_entry_visibility_check
  check (entry_visibility in ('everyone', 'contacts', 'private'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'wellbeing_mood_visibility_default'
  ) then
    update public.user_profiles
    set wellbeing_daily_entry_visibility_default = coalesce(wellbeing_mood_visibility_default, 'everyone');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wellbeing_daily_entries'
      and column_name = 'mood_visibility'
  ) then
    update public.wellbeing_daily_entries
    set entry_visibility = coalesce(mood_visibility, 'everyone');
  end if;
end $$;

commit;
