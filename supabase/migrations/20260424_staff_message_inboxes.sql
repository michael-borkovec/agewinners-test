/*
 * File purpose
 * - Add shared staff messaging inboxes for admins and moderators.
 * - Reuse the existing messages subsystem while separating staff inboxes from regular user DMs.
 * - Thread kinds:
 *   - admin_support: user <-> all admins
 *   - moderator_outreach: user <-> all moderators and admins
 */

begin;

alter table public.message_threads
  drop constraint if exists message_threads_thread_kind_check;

alter table public.message_threads
  add constraint message_threads_thread_kind_check
  check (
    thread_kind in (
      'connected_dm',
      'connection_request_dm',
      'connection_decline_dm',
      'admin_contact',
      'admin_support',
      'moderator_outreach'
    )
  );

alter table public.message_threads
  add column if not exists subject_user_id uuid null references auth.users(id) on delete cascade,
  add column if not exists created_by_user_id uuid null references auth.users(id) on delete set null;

alter table public.message_thread_participants
  add column if not exists thread_folder text not null default 'inbox'
    check (thread_folder in ('inbox', 'blocked')),
  add column if not exists is_starred boolean not null default false;

create index if not exists message_thread_participants_user_folder_idx
  on public.message_thread_participants (user_id, thread_folder, is_starred, thread_id);

create unique index if not exists message_threads_admin_support_subject_unique_idx
  on public.message_threads (subject_user_id)
  where thread_kind = 'admin_support'
    and subject_user_id is not null;

create unique index if not exists message_threads_moderator_outreach_subject_unique_idx
  on public.message_threads (subject_user_id)
  where thread_kind = 'moderator_outreach'
    and subject_user_id is not null;

create index if not exists message_threads_kind_subject_idx
  on public.message_threads (thread_kind, subject_user_id, last_message_at desc nulls last, created_at desc);

create or replace function public.is_staff_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role in ('admin', 'moderator')
  );
$$;

create or replace function public.get_staff_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select up.role
      from public.user_profiles up
      where up.user_id = p_user_id
      limit 1
    ),
    'user'
  )::text;
$$;

create or replace function public.sync_staff_thread_participants(
  p_thread_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread record;
begin
  select mt.id, mt.thread_kind, mt.subject_user_id
    into v_thread
  from public.message_threads mt
  where mt.id = p_thread_id;

  if not found then
    raise exception 'thread_not_found';
  end if;

  if v_thread.thread_kind not in ('admin_support', 'moderator_outreach') then
    return;
  end if;

  if v_thread.subject_user_id is not null then
    insert into public.message_thread_participants (thread_id, user_id)
    values (p_thread_id, v_thread.subject_user_id)
    on conflict (thread_id, user_id) do nothing;
  end if;

  insert into public.message_thread_participants (thread_id, user_id)
  select
    p_thread_id,
    up.user_id
  from public.user_profiles up
  where (
    v_thread.thread_kind = 'admin_support'
    and up.role = 'admin'
  ) or (
    v_thread.thread_kind = 'moderator_outreach'
    and up.role in ('admin', 'moderator')
  )
  on conflict (thread_id, user_id) do nothing;
end;
$$;

create or replace function public.get_or_create_moderator_outreach_thread(
  p_target_user_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_thread_id bigint;
  v_role text;
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_target_user_id is null or p_target_user_id = v_auth_user_id then
    raise exception 'invalid_target_user';
  end if;

  v_role := public.get_staff_role(v_auth_user_id);
  if v_role not in ('admin', 'moderator') then
    raise exception 'forbidden';
  end if;

  select mt.id
    into v_thread_id
  from public.message_threads mt
  where mt.thread_kind = 'moderator_outreach'
    and mt.subject_user_id = p_target_user_id
  limit 1;

  if v_thread_id is null then
    insert into public.message_threads (
      thread_kind,
      subject_user_id,
      created_by_user_id,
      connection_user_id_a,
      connection_user_id_b
    )
    values (
      'moderator_outreach',
      p_target_user_id,
      v_auth_user_id,
      least(v_auth_user_id, p_target_user_id),
      greatest(v_auth_user_id, p_target_user_id)
    )
    returning id into v_thread_id;
  else
    update public.message_threads
    set updated_at = now()
    where id = v_thread_id;
  end if;

  perform public.sync_staff_thread_participants(v_thread_id);
  return v_thread_id;
end;
$$;

create or replace function public.get_or_create_admin_support_thread(
  p_target_user_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_thread_id bigint;
  v_role text;
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'invalid_target_user';
  end if;

  v_role := public.get_staff_role(v_auth_user_id);
  if v_role <> 'admin' and p_target_user_id <> v_auth_user_id then
    raise exception 'forbidden';
  end if;

  select mt.id
    into v_thread_id
  from public.message_threads mt
  where mt.thread_kind = 'admin_support'
    and mt.subject_user_id = p_target_user_id
  limit 1;

  if v_thread_id is null then
    insert into public.message_threads (
      thread_kind,
      subject_user_id,
      created_by_user_id,
      connection_user_id_a,
      connection_user_id_b
    )
    values (
      'admin_support',
      p_target_user_id,
      v_auth_user_id,
      v_auth_user_id,
      null
    )
    returning id into v_thread_id;
  else
    update public.message_threads
    set updated_at = now()
    where id = v_thread_id;
  end if;

  perform public.sync_staff_thread_participants(v_thread_id);
  return v_thread_id;
end;
$$;

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
  v_thread_id bigint;
  v_admin_count integer;
  v_last_message_id bigint;
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_body is null then
    raise exception 'empty_message';
  end if;

  select count(*)::int
    into v_admin_count
  from public.user_profiles up
  where up.role = 'admin'
    and up.user_id <> v_auth_user_id;

  if coalesce(v_admin_count, 0) = 0 then
    raise exception 'admin_not_found';
  end if;

  v_thread_id := public.get_or_create_admin_support_thread(v_auth_user_id);

  perform public.sync_staff_thread_participants(v_thread_id);

  insert into public.messages (thread_id, sender_user_id, body)
  values (v_thread_id, v_auth_user_id, left(v_body, 4000))
  returning id into v_last_message_id;

  update public.message_thread_participants
  set
    last_read_message_id = v_last_message_id,
    last_read_at = now(),
    is_archived = false,
    thread_folder = 'inbox'
  where thread_id = v_thread_id
    and user_id = v_auth_user_id;

  update public.message_thread_participants
  set
    is_archived = false,
    thread_folder = 'inbox'
  where thread_id = v_thread_id
    and user_id <> v_auth_user_id;

  return v_admin_count;
end;
$$;

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

  if v_thread.thread_kind in ('admin_support', 'moderator_outreach') then
    perform public.sync_staff_thread_participants(p_thread_id);
  end if;

  v_body := nullif(trim(coalesce(p_body, '')), '');
  if v_body is null then
    raise exception 'empty_message';
  end if;

  if v_thread.thread_kind not in ('connected_dm', 'admin_contact', 'admin_support', 'moderator_outreach') then
    raise exception 'thread_read_only';
  end if;

  select mtp.user_id
    into v_other_user_id
  from public.message_thread_participants mtp
  where mtp.thread_id = p_thread_id
    and mtp.user_id <> v_auth_user_id
  order by mtp.joined_at asc
  limit 1;

  if v_other_user_id is null then
    raise exception 'invalid_thread_participants';
  end if;

  if v_thread.thread_kind = 'connected_dm' and not public.are_users_connected(v_auth_user_id, v_other_user_id) then
    raise exception 'not_connected';
  end if;

  if v_thread.thread_kind = 'connected_dm' and public.is_user_blocked_between(v_auth_user_id, v_other_user_id) then
    raise exception 'thread_blocked';
  end if;

  if p_reply_to_message_id is not null and not exists (
    select 1
    from public.messages m
    where m.id = p_reply_to_message_id
      and m.thread_id = p_thread_id
      and m.deleted_at is null
  ) then
    raise exception 'invalid_reply_target';
  end if;

  insert into public.messages (thread_id, sender_user_id, body, reply_to_message_id)
  values (p_thread_id, v_auth_user_id, left(v_body, 4000), p_reply_to_message_id)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.get_my_unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with my_role as (
    select public.get_staff_role(auth.uid()) as role
  )
  select coalesce(sum(x.unread_count), 0)::int
  from (
    select count(m.id)::int as unread_count
    from public.message_thread_participants mtp
    join public.message_threads mt
      on mt.id = mtp.thread_id
    join public.messages m
      on m.thread_id = mtp.thread_id
    cross join my_role mr
    where mtp.user_id = auth.uid()
      and coalesce(mtp.is_muted, false) = false
      and coalesce(mtp.thread_folder, 'inbox') = 'inbox'
      and m.deleted_at is null
      and m.sender_user_id <> auth.uid()
      and m.id > coalesce(mtp.last_read_message_id, 0)
      and (
        mr.role not in ('admin', 'moderator')
        or mt.thread_kind not in ('admin_support', 'moderator_outreach')
      )
    group by mtp.thread_id
  ) x;
$$;

drop function if exists public.list_my_message_threads();

create or replace function public.list_my_message_threads()
returns table (
  thread_id bigint,
  thread_kind text,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  last_message_id bigint,
  last_message_body text,
  last_message_created_at timestamptz,
  last_message_sender_user_id uuid,
  unread_count integer,
  can_reply boolean,
  thread_folder text,
  is_starred boolean,
  is_muted boolean,
  other_last_read_message_id bigint,
  other_last_read_at timestamptz,
  other_last_seen_at timestamptz,
  other_is_online boolean,
  is_blocked_by_me boolean,
  has_blocking boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with my_role as (
    select public.get_staff_role(auth.uid()) as role
  ),
  my_threads as (
    select
      mt.id,
      mt.thread_kind,
      mt.subject_user_id,
      mtp.thread_folder,
      mtp.is_starred,
      mtp.is_muted
    from public.message_threads mt
    join public.message_thread_participants mtp
      on mtp.thread_id = mt.id
    cross join my_role mr
    where mtp.user_id = auth.uid()
      and coalesce(mtp.is_archived, false) = false
      and (
        mr.role not in ('admin', 'moderator')
        or mt.thread_kind not in ('admin_support', 'moderator_outreach')
      )
  ),
  other_participants as (
    select
      mt.id as thread_id,
      mt.thread_kind,
      mt.subject_user_id,
      mt.thread_folder,
      mt.is_starred,
      mt.is_muted,
      case
        when mt.thread_kind = 'admin_support' then null::uuid
        when mt.thread_kind = 'moderator_outreach' then null::uuid
        else mtp.user_id
      end as other_user_id,
      mtp.last_read_message_id as other_last_read_message_id,
      mtp.last_read_at as other_last_read_at
    from my_threads mt
    left join lateral (
      select mtp.user_id, mtp.last_read_message_id, mtp.last_read_at
      from public.message_thread_participants mtp
      where mtp.thread_id = mt.id
        and mtp.user_id <> auth.uid()
      order by mtp.joined_at asc
      limit 1
    ) mtp on true
  ),
  last_messages as (
    select distinct on (m.thread_id)
      m.thread_id,
      m.id as last_message_id,
      m.body as last_message_body,
      m.created_at as last_message_created_at,
      m.sender_user_id as last_message_sender_user_id
    from public.messages m
    where m.deleted_at is null
    order by m.thread_id, m.created_at desc, m.id desc
  ),
  unread as (
    select
      mtp.thread_id,
      count(m.id)::int as unread_count
    from public.message_thread_participants mtp
    left join public.messages m
      on m.thread_id = mtp.thread_id
     and m.deleted_at is null
     and m.sender_user_id <> auth.uid()
     and m.id > coalesce(mtp.last_read_message_id, 0)
    where mtp.user_id = auth.uid()
    group by mtp.thread_id
  )
  select
    op.thread_id,
    op.thread_kind,
    op.other_user_id,
    case
      when op.thread_kind = 'admin_support' then 'Správce'
      when op.thread_kind = 'moderator_outreach' then 'Moderátor'
      else up.display_name
    end as other_display_name,
    case
      when op.thread_kind in ('admin_support', 'moderator_outreach') then null::text
      else up.avatar_url
    end as other_avatar_url,
    lm.last_message_id,
    lm.last_message_body,
    lm.last_message_created_at,
    lm.last_message_sender_user_id,
    coalesce(u.unread_count, 0) as unread_count,
    (op.thread_kind in ('connected_dm', 'admin_contact', 'admin_support', 'moderator_outreach')) as can_reply,
    coalesce(op.thread_folder, 'inbox') as thread_folder,
    coalesce(op.is_starred, false) as is_starred,
    coalesce(op.is_muted, false) as is_muted,
    op.other_last_read_message_id,
    op.other_last_read_at,
    case
      when op.thread_kind in ('admin_support', 'moderator_outreach') then null::timestamptz
      else upres.last_seen_at
    end as other_last_seen_at,
    case
      when op.thread_kind in ('admin_support', 'moderator_outreach') then false
      else coalesce(upres.last_seen_at >= now() - interval '5 minutes', false)
    end as other_is_online,
    case
      when op.thread_kind in ('admin_support', 'moderator_outreach') then false
      else exists (
        select 1
        from public.blocked_users bu
        where bu.blocker_user_id = auth.uid()
          and bu.blocked_user_id = op.other_user_id
      )
    end as is_blocked_by_me,
    case
      when op.thread_kind in ('admin_support', 'moderator_outreach') then false
      else public.is_user_blocked_between(auth.uid(), op.other_user_id)
    end as has_blocking
  from other_participants op
  left join public.user_profiles up
    on up.user_id = op.other_user_id
  left join public.user_presence upres
    on upres.user_id = op.other_user_id
  left join last_messages lm
    on lm.thread_id = op.thread_id
  left join unread u
    on u.thread_id = op.thread_id
  order by coalesce(lm.last_message_created_at, now()) desc, op.thread_id desc;
$$;

revoke all on function public.is_staff_user(uuid) from public;
grant execute on function public.is_staff_user(uuid) to authenticated;

revoke all on function public.get_staff_role(uuid) from public;
grant execute on function public.get_staff_role(uuid) to authenticated;

revoke all on function public.sync_staff_thread_participants(bigint) from public;
grant execute on function public.sync_staff_thread_participants(bigint) to authenticated;

revoke all on function public.get_or_create_moderator_outreach_thread(uuid) from public;
grant execute on function public.get_or_create_moderator_outreach_thread(uuid) to authenticated;

revoke all on function public.get_or_create_admin_support_thread(uuid) from public;
grant execute on function public.get_or_create_admin_support_thread(uuid) to authenticated;

commit;
