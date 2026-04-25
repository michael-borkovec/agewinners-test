/*
 * File purpose
 * - Add challenge sharing support and experimental-photo rule
 * - Prepare durable challenge-image membership for later locking
 * - Allow public read of public challenges
 */

begin;

alter table public.aw_challenges
  add column if not exists include_experimental_images boolean not null default false;

create table if not exists public.aw_challenge_images (
  challenge_id uuid not null references public.aw_challenges(id) on delete cascade,
  image_id bigint not null references public.images(id) on delete cascade,
  source text not null,
  locked_in_at timestamptz not null default now(),
  was_experimental_at_lock boolean not null default false,
  constraint aw_challenge_images_pkey primary key (challenge_id, image_id),
  constraint aw_challenge_images_source_check check (source in ('auto_period', 'challenge_tag', 'reference'))
);

create index if not exists aw_challenge_images_image_idx
  on public.aw_challenge_images (image_id, challenge_id);

alter table public.aw_challenge_images enable row level security;

drop policy if exists "aw_challenge_images_select_owner_or_public" on public.aw_challenge_images;
create policy "aw_challenge_images_select_owner_or_public"
  on public.aw_challenge_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.aw_challenges c
      where c.id = aw_challenge_images.challenge_id
        and (c.owner_user_id = auth.uid() or c.visibility = 'everyone')
    )
  );

drop policy if exists "aw_challenge_images_select_contacts" on public.aw_challenge_images;
create policy "aw_challenge_images_select_contacts"
  on public.aw_challenge_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.aw_challenges c
      where c.id = aw_challenge_images.challenge_id
        and c.visibility = 'contacts'
        and exists (
          select 1
          from public.connections cn
          where cn.status = 'accepted'
            and (
              (cn.user_id_a = auth.uid() and cn.user_id_b = c.owner_user_id)
              or (cn.user_id_b = auth.uid() and cn.user_id_a = c.owner_user_id)
            )
        )
    )
  );

drop policy if exists "aw_challenge_images_insert_owner" on public.aw_challenge_images;
create policy "aw_challenge_images_insert_owner"
  on public.aw_challenge_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.aw_challenges c
      where c.id = aw_challenge_images.challenge_id
        and c.owner_user_id = auth.uid()
    )
  );

drop policy if exists "aw_challenges_select_public" on public.aw_challenges;
create policy "aw_challenges_select_public"
  on public.aw_challenges
  for select
  to authenticated
  using (visibility = 'everyone');

drop policy if exists "aw_challenges_select_contacts" on public.aw_challenges;
create policy "aw_challenges_select_contacts"
  on public.aw_challenges
  for select
  to authenticated
  using (
    visibility = 'contacts'
    and exists (
      select 1
      from public.connections cn
      where cn.status = 'accepted'
        and (
          (cn.user_id_a = auth.uid() and cn.user_id_b = owner_user_id)
          or (cn.user_id_b = auth.uid() and cn.user_id_a = owner_user_id)
        )
    )
  );

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
      or new.public_message is distinct from old.public_message
    then
      raise exception 'aw_challenge_immutable_after_activation';
    end if;

    if new.photo_scope is distinct from old.photo_scope
      and not (
        old.photo_scope = 'auto_period'
        and new.photo_scope = 'challenge_tag'
        and old.challenge_tag is null
        and new.challenge_tag is not null
      )
    then
      raise exception 'aw_challenge_immutable_after_activation';
    end if;

    if new.challenge_tag is distinct from old.challenge_tag
      and not (old.challenge_tag is null and new.challenge_tag is not null)
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

commit;
