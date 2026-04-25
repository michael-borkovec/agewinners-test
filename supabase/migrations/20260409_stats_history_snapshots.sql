/*
 * File purpose
 * - Store daily snapshots of selected user statistics for historical charts
 * - Keep one row per user and day
 * - Enforce per-user access through RLS
 */

begin;

create table if not exists public.aw_user_stats_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null default current_date,
  aw_age numeric null,
  aw_score_norm_pct numeric null,
  avg_accuracy_pct numeric null,
  power_score numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aw_user_stats_history_pkey primary key (user_id, snapshot_date)
);

create index if not exists aw_user_stats_history_user_date_idx
  on public.aw_user_stats_history (user_id, snapshot_date desc);

alter table public.aw_user_stats_history enable row level security;

drop policy if exists "aw_user_stats_history_select_own" on public.aw_user_stats_history;
create policy "aw_user_stats_history_select_own"
  on public.aw_user_stats_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "aw_user_stats_history_insert_own" on public.aw_user_stats_history;
create policy "aw_user_stats_history_insert_own"
  on public.aw_user_stats_history
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "aw_user_stats_history_update_own" on public.aw_user_stats_history;
create policy "aw_user_stats_history_update_own"
  on public.aw_user_stats_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.aw_user_stats_history_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists aw_user_stats_history_set_updated_at on public.aw_user_stats_history;
create trigger aw_user_stats_history_set_updated_at
before update on public.aw_user_stats_history
for each row
execute function public.aw_user_stats_history_set_updated_at();

commit;
