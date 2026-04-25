/*
 * File purpose
 * - Add threaded replies for photo/post comments
 * - Extend notifications with comment reply events
 * - Keep existing photo comment preference as the switch for replies too
 */

begin;

alter table public.comments
  add column if not exists parent_comment_id bigint null references public.comments(id) on delete cascade;

create index if not exists comments_parent_comment_idx
  on public.comments (parent_comment_id, created_at asc, id asc)
  where parent_comment_id is not null;

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
      'photo_commented',
      'comment_replied'
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
    'photo_commented',
    'comment_replied'
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
    when 'comment_replied' then coalesce(up.notify_photo_commented, true)
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

commit;
