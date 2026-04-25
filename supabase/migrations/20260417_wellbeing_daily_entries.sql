/*
 * File purpose
 * - Store voluntary daily wellbeing check-ins for the stats wellbeing section
 * - Keep one entry per user and day
 * - Enforce owner-only access through RLS
 */

begin;

create table if not exists public.wellbeing_daily_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null default current_date,
  mood text not null,
  mood_score smallint not null,
  energy_score smallint not null,
  sleep_hours numeric(4,1) not null,
  movement_minutes integer not null,
  water_glasses smallint not null,
  self_care_done boolean not null default false,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellbeing_daily_entries_pkey primary key (user_id, entry_date),
  constraint wellbeing_daily_entries_mood_check check (mood in ('lehka', 'klid', 'radost', 'unava', 'napeti')),
  constraint wellbeing_daily_entries_mood_score_check check (mood_score between 1 and 10),
  constraint wellbeing_daily_entries_energy_score_check check (energy_score between 1 and 10),
  constraint wellbeing_daily_entries_sleep_hours_check check (sleep_hours between 0 and 24),
  constraint wellbeing_daily_entries_movement_minutes_check check (movement_minutes between 0 and 1440),
  constraint wellbeing_daily_entries_water_glasses_check check (water_glasses between 0 and 30),
  constraint wellbeing_daily_entries_note_length_check check (note is null or char_length(note) <= 1000)
);

create index if not exists wellbeing_daily_entries_user_date_idx
  on public.wellbeing_daily_entries (user_id, entry_date desc);

alter table public.wellbeing_daily_entries enable row level security;

drop policy if exists "wellbeing_daily_entries_select_own" on public.wellbeing_daily_entries;
create policy "wellbeing_daily_entries_select_own"
  on public.wellbeing_daily_entries
  for select
  using (auth.uid() = user_id);

drop policy if exists "wellbeing_daily_entries_insert_own" on public.wellbeing_daily_entries;
create policy "wellbeing_daily_entries_insert_own"
  on public.wellbeing_daily_entries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_daily_entries_update_own" on public.wellbeing_daily_entries;
create policy "wellbeing_daily_entries_update_own"
  on public.wellbeing_daily_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wellbeing_daily_entries_delete_own" on public.wellbeing_daily_entries;
create policy "wellbeing_daily_entries_delete_own"
  on public.wellbeing_daily_entries
  for delete
  using (auth.uid() = user_id);

create or replace function public.wellbeing_daily_entries_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wellbeing_daily_entries_set_updated_at on public.wellbeing_daily_entries;
create trigger wellbeing_daily_entries_set_updated_at
before update on public.wellbeing_daily_entries
for each row
execute function public.wellbeing_daily_entries_set_updated_at();

commit;
