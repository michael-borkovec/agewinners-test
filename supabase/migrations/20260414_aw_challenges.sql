/*
 * File purpose
 * - Add first persistent model for AW challenges
 * - Store baseline and target AW score snapshots without changing AW score calculation
 * - Keep private goal private by default, with explicit later publish support
 */

begin;

create table if not exists public.aw_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  public_message text null,
  private_goal text null,
  private_goal_visibility text not null default 'private',
  visibility text not null default 'private',
  status text not null default 'active',
  start_date date not null default current_date,
  target_date_original date not null,
  target_date_current date not null,
  baseline_aw_score_norm_pct numeric null,
  target_aw_score_norm_pct numeric not null,
  photo_scope text not null,
  challenge_tag text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz not null default now(),
  completed_at timestamptz null,
  extended_at timestamptz null,
  private_goal_published_at timestamptz null,
  constraint aw_challenges_title_len check (char_length(trim(title)) between 1 and 120),
  constraint aw_challenges_visibility_check check (visibility in ('private', 'contacts', 'everyone')),
  constraint aw_challenges_private_goal_visibility_check check (private_goal_visibility in ('private', 'everyone')),
  constraint aw_challenges_status_check check (status in ('draft', 'active', 'completed', 'missed', 'extended', 'cancelled', 'archived')),
  constraint aw_challenges_photo_scope_check check (photo_scope in ('auto_period', 'challenge_tag')),
  constraint aw_challenges_dates_check check (target_date_original >= start_date and target_date_current >= target_date_original),
  constraint aw_challenges_tag_required_check check (
    (photo_scope = 'challenge_tag' and challenge_tag is not null and char_length(trim(challenge_tag)) > 0)
    or (photo_scope <> 'challenge_tag')
  )
);

create index if not exists aw_challenges_owner_status_idx
  on public.aw_challenges (owner_user_id, status, created_at desc);

create index if not exists aw_challenges_owner_dates_idx
  on public.aw_challenges (owner_user_id, start_date, target_date_current);

alter table public.aw_challenges enable row level security;

drop policy if exists "aw_challenges_select_own" on public.aw_challenges;
create policy "aw_challenges_select_own"
  on public.aw_challenges
  for select
  to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists "aw_challenges_insert_own" on public.aw_challenges;
create policy "aw_challenges_insert_own"
  on public.aw_challenges
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "aw_challenges_update_own_limited" on public.aw_challenges;
create policy "aw_challenges_update_own_limited"
  on public.aw_challenges
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "aw_challenges_delete_own_draft" on public.aw_challenges;
create policy "aw_challenges_delete_own_draft"
  on public.aw_challenges
  for delete
  to authenticated
  using (owner_user_id = auth.uid() and status = 'draft');

drop trigger if exists aw_challenges_set_updated_at on public.aw_challenges;
drop function if exists public.aw_challenges_touch_updated_at();

create or replace function public.aw_challenges_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if old.status <> 'draft' then
    if new.start_date is distinct from old.start_date
      or new.target_date_original is distinct from old.target_date_original
      or new.baseline_aw_score_norm_pct is distinct from old.baseline_aw_score_norm_pct
      or new.target_aw_score_norm_pct is distinct from old.target_aw_score_norm_pct
      or new.photo_scope is distinct from old.photo_scope
      or new.challenge_tag is distinct from old.challenge_tag
      or new.public_message is distinct from old.public_message
    then
      raise exception 'aw_challenge_immutable_after_activation';
    end if;
  end if;

  if new.target_date_current < old.target_date_current then
    raise exception 'aw_challenge_target_date_can_only_extend';
  end if;

  if old.private_goal_visibility = 'private'
    and new.private_goal_visibility = 'everyone'
    and new.private_goal_published_at is null
  then
    new.private_goal_published_at := now();
  end if;

  return new;
end;
$$;

create trigger aw_challenges_set_updated_at
  before update on public.aw_challenges
  for each row
  execute function public.aw_challenges_touch_updated_at();

commit;
