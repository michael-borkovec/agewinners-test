/*
 * File purpose
 * - Add admin contact message threads for the public Help page
 * - Allow a signed-in user to send one message to every admin without being connected
 * - Keep replies inside the existing messages UI
 */

begin;

alter table public.message_threads
  drop constraint if exists message_threads_thread_kind_check;

alter table public.message_threads
  add constraint message_threads_thread_kind_check
  check (thread_kind in ('connected_dm', 'connection_request_dm', 'connection_decline_dm', 'admin_contact'));

create unique index if not exists message_threads_admin_contact_pair_unique_idx
  on public.message_threads (connection_user_id_a, connection_user_id_b)
  where thread_kind = 'admin_contact'
    and connection_user_id_a is not null
    and connection_user_id_b is not null;

create or replace function public.send_admin_contact_message(
  p_body text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_admin record;
  v_thread_id bigint;
  v_sent_count integer := 0;
  v_user_a uuid;
  v_user_b uuid;
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_body is null then
    raise exception 'empty_message';
  end if;

  for v_admin in
    select up.user_id
    from public.user_profiles up
    where up.role = 'admin'
      and up.user_id <> v_auth_user_id
  loop
    v_user_a := least(v_auth_user_id, v_admin.user_id);
    v_user_b := greatest(v_auth_user_id, v_admin.user_id);

    insert into public.message_threads (
      thread_kind,
      connection_user_id_a,
      connection_user_id_b
    )
    values (
      'admin_contact',
      v_user_a,
      v_user_b
    )
    on conflict (connection_user_id_a, connection_user_id_b)
      where thread_kind = 'admin_contact'
    do update
      set updated_at = now()
    returning id into v_thread_id;

    perform public.ensure_message_thread_participants(v_thread_id, v_auth_user_id, v_admin.user_id);

    insert into public.messages (thread_id, sender_user_id, body)
    values (v_thread_id, v_auth_user_id, left(v_body, 4000));

    update public.message_thread_participants
    set
      last_read_message_id = currval(pg_get_serial_sequence('messages', 'id')),
      last_read_at = now(),
      is_archived = false,
      thread_folder = 'inbox'
    where thread_id = v_thread_id
      and user_id = v_auth_user_id;

    v_sent_count := v_sent_count + 1;
  end loop;

  if v_sent_count = 0 then
    raise exception 'admin_not_found';
  end if;

  return v_sent_count;
end;
$$;

revoke all on function public.send_admin_contact_message(text) from public;
grant execute on function public.send_admin_contact_message(text) to authenticated;

create or replace function public.send_thread_message(
  p_thread_id bigint,
  p_body text,
  p_reply_to_message_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_thread record;
  v_message_id bigint;
  v_other_user_id uuid;
  v_body text;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select mt.*
    into v_thread
  from public.message_threads mt
  join public.message_thread_participants mtp
    on mtp.thread_id = mt.id
   and mtp.user_id = v_auth_user_id
  where mt.id = p_thread_id;

  if not found then
    raise exception 'thread_not_found';
  end if;

  v_body := nullif(trim(coalesce(p_body, '')), '');
  if v_body is null then
    raise exception 'empty_message';
  end if;

  if v_thread.thread_kind not in ('connected_dm', 'admin_contact') then
    raise exception 'thread_read_only';
  end if;

  select mtp.user_id
    into v_other_user_id
  from public.message_thread_participants mtp
  where mtp.thread_id = p_thread_id
    and mtp.user_id <> v_auth_user_id
  limit 1;

  if v_other_user_id is null then
    raise exception 'invalid_thread_participants';
  end if;

  if v_thread.thread_kind = 'connected_dm' and not public.are_users_connected(v_auth_user_id, v_other_user_id) then
    raise exception 'not_connected';
  end if;

  if p_reply_to_message_id is not null and not exists (
    select 1
    from public.messages m
    where m.id = p_reply_to_message_id
      and m.thread_id = p_thread_id
      and m.deleted_at is null
  ) then
    raise exception 'invalid_reply_message';
  end if;

  insert into public.messages (thread_id, sender_user_id, body, reply_to_message_id)
  values (p_thread_id, v_auth_user_id, left(v_body, 4000), p_reply_to_message_id)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_thread_message(bigint, text, bigint) from public;
grant execute on function public.send_thread_message(bigint, text, bigint) to authenticated;

commit;
