/*
 * File purpose
 * - Add user-controlled notification preferences with safe defaults
 * - Extend in-app notifications to cover follow/remove/comment events
 * - Add simple likes for images
 */

begin;

alter table public.user_profiles
  add column if not exists notify_connection_requests boolean not null default true,
  add column if not exists notify_connection_declined boolean not null default true,
  add column if not exists notify_contact_removed boolean not null default true,
  add column if not exists notify_follow_started boolean not null default true,
  add column if not exists notify_follow_stopped boolean not null default true,
  add column if not exists notify_photo_commented boolean not null default true;

alter table public.notifications
  add column if not exists entity_bigint_id bigint null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'connection_request_received',
      'connection_request_accepted',
      'connection_request_declined',
      'connection_removed',
      'follow_started',
      'follow_stopped',
      'photo_commented'
    )
  );

drop function if exists public.create_app_notification(uuid, text, uuid, bigint);
create or replace function public.create_app_notification(
  p_target_user_id uuid,
  p_notification_type text,
  p_entity_id uuid default null,
  p_entity_bigint_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_notification_id bigint;
  v_should_deliver boolean := true;
begin
  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_target_user_id is null or p_target_user_id = v_actor_user_id then
    raise exception 'invalid_target_user';
  end if;

  if p_notification_type not in (
    'connection_request_received',
    'connection_request_accepted',
    'connection_request_declined',
    'connection_removed',
    'follow_started',
    'follow_stopped',
    'photo_commented'
  ) then
    raise exception 'invalid_notification_type';
  end if;

  select case p_notification_type
    when 'connection_request_received' then coalesce(up.notify_connection_requests, true)
    when 'connection_request_declined' then coalesce(up.notify_connection_declined, true)
    when 'connection_removed' then coalesce(up.notify_contact_removed, true)
    when 'follow_started' then coalesce(up.notify_follow_started, true)
    when 'follow_stopped' then coalesce(up.notify_follow_stopped, true)
    when 'photo_commented' then coalesce(up.notify_photo_commented, true)
    else true
  end
  into v_should_deliver
  from public.user_profiles up
  where up.user_id = p_target_user_id;

  if coalesce(v_should_deliver, true) = false then
    return null;
  end if;

  insert into public.notifications (
    user_id,
    actor_user_id,
    type,
    entity_id,
    entity_bigint_id
  )
  values (
    p_target_user_id,
    v_actor_user_id,
    p_notification_type,
    p_entity_id,
    p_entity_bigint_id
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_app_notification(uuid, text, uuid, bigint) from public;
grant execute on function public.create_app_notification(uuid, text, uuid, bigint) to authenticated;

drop function if exists public.create_network_notification(uuid, text, uuid);
create or replace function public.create_network_notification(
  p_target_user_id uuid,
  p_notification_type text,
  p_entity_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_app_notification(
    p_target_user_id,
    p_notification_type,
    p_entity_id,
    null
  );
end;
$$;

revoke all on function public.create_network_notification(uuid, text, uuid) from public;
grant execute on function public.create_network_notification(uuid, text, uuid) to authenticated;

create table if not exists public.image_likes (
  image_id bigint not null references public.images(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint image_likes_pkey primary key (image_id, user_id)
);

alter table public.image_likes
  add column if not exists reaction text;

update public.image_likes
set reaction = 'like'
where reaction is null;

alter table public.image_likes
  alter column reaction set default 'like',
  alter column reaction set not null;

alter table public.image_likes
  drop constraint if exists image_likes_reaction_check;

alter table public.image_likes
  add constraint image_likes_reaction_check check (
    reaction in ('like', 'clap', 'care', 'love', 'insight', 'fun')
  );

create index if not exists image_likes_user_created_idx
  on public.image_likes (user_id, created_at desc);

create index if not exists image_likes_image_reaction_idx
  on public.image_likes (image_id, reaction, created_at desc);

alter table public.image_likes enable row level security;

drop policy if exists "image_likes_select_authenticated" on public.image_likes;
create policy "image_likes_select_authenticated"
  on public.image_likes
  for select
  to authenticated
  using (true);

drop policy if exists "image_likes_insert_own" on public.image_likes;
create policy "image_likes_insert_own"
  on public.image_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "image_likes_delete_own" on public.image_likes;
create policy "image_likes_delete_own"
  on public.image_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "image_likes_update_own" on public.image_likes;
create policy "image_likes_update_own"
  on public.image_likes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
