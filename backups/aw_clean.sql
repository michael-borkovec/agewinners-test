--
-- PostgreSQL database dump
--

\restrict 1FbjHLIOrZsbaRPRRaelS4U0Rsy2efaBrnPpNOkSClndGGI2sHfstC1C3mvmsDi

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-25 08:50:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 34 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 4960 (class 0 OID 0)
-- Dependencies: 34
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 1442 (class 1247 OID 26734)
-- Name: age_reveal_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.age_reveal_mode AS ENUM (
    'never',
    'delayed',
    'immediate'
);


--
-- TOC entry 1454 (class 1247 OID 71065)
-- Name: aw_image_context; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.aw_image_context AS ENUM (
    'full_body',
    'face',
    'body_no_face',
    'swimwear',
    'clothed',
    'makeup',
    'no_makeup'
);


--
-- TOC entry 1445 (class 1247 OID 26742)
-- Name: contact_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_status AS ENUM (
    'pending',
    'accepted',
    'blocked'
);


--
-- TOC entry 1389 (class 1247 OID 35093)
-- Name: content_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_visibility AS ENUM (
    'everyone',
    'contacts',
    'private'
);


--
-- TOC entry 1474 (class 1247 OID 74533)
-- Name: photo_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.photo_category AS ENUM (
    'bezna',
    'oblicej',
    'cela_postava',
    'postava_bez_obliceje',
    'plavky',
    'makeup',
    'jine',
    'v_plavkach',
    'makeup_stylizace',
    'spolecenske_saty',
    'sport'
);


--
-- TOC entry 1480 (class 1247 OID 96460)
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'super_user',
    'moderator',
    'admin'
);


--
-- TOC entry 571 (class 1255 OID 117751)
-- Name: admin_get_image_report(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_image_report(p_report_id bigint) RETURNS TABLE(report_id bigint, status text, reason text, details text, created_at timestamp with time zone, image_id bigint, image_public_url text, image_taken_at date, image_category text, image_verified_at timestamp with time zone, image_verified_by uuid, image_verified_by_display_name text, reporter_user_id uuid, reporter_display_name text, image_owner_user_id uuid, image_owner_display_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select
    r.id as report_id,
    r.status::text as status,
    r.reason::text as reason,
    r.details::text as details,
    r.created_at,

    i.id as image_id,
    i.public_url as image_public_url,
    i.taken_at as image_taken_at,
    i.photo_category::text as image_category,

    i.verified_at as image_verified_at,
    i.verified_by as image_verified_by,
    vup.display_name as image_verified_by_display_name,

    r.reporter_user_id,
    rup.display_name as reporter_display_name,

    i.uploader_user_id as image_owner_user_id,
    oup.display_name as image_owner_display_name

  from public.image_reports r
  join public.images i on i.id = r.image_id
  left join public.user_profiles rup on rup.user_id = r.reporter_user_id
  left join public.user_profiles oup on oup.user_id = i.uploader_user_id
  left join public.user_profiles vup on vup.user_id = i.verified_by

  where
    public.is_admin_or_moderator(auth.uid())
    and r.id = p_report_id;
$$;


--
-- TOC entry 512 (class 1255 OID 117712)
-- Name: admin_get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_my_role() RETURNS TABLE(user_id uuid, role public.user_role, super_user boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select auth.uid() as user_id, up.role, up.super_user
  from public.user_profiles up
  where up.user_id = auth.uid();
$$;


--
-- TOC entry 578 (class 1255 OID 117750)
-- Name: admin_list_image_reports(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_list_image_reports(p_status text DEFAULT 'open'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(report_id bigint, status text, reason text, details text, created_at timestamp with time zone, image_id bigint, image_public_url text, image_taken_at date, image_category text, image_verified_at timestamp with time zone, image_verified_by uuid, image_verified_by_display_name text, reporter_user_id uuid, reporter_display_name text, image_owner_user_id uuid, image_owner_display_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select
    r.id as report_id,
    r.status::text as status,
    r.reason::text as reason,
    r.details::text as details,
    r.created_at,

    i.id as image_id,
    i.public_url as image_public_url,
    i.taken_at as image_taken_at,
    i.photo_category::text as image_category,

    i.verified_at as image_verified_at,
    i.verified_by as image_verified_by,
    vup.display_name as image_verified_by_display_name,

    r.reporter_user_id,
    rup.display_name as reporter_display_name,

    i.uploader_user_id as image_owner_user_id,
    oup.display_name as image_owner_display_name

  from public.image_reports r
  join public.images i on i.id = r.image_id
  left join public.user_profiles rup on rup.user_id = r.reporter_user_id
  left join public.user_profiles oup on oup.user_id = i.uploader_user_id
  left join public.user_profiles vup on vup.user_id = i.verified_by

  where
    public.is_admin_or_moderator(auth.uid())
    and r.status::text = p_status

  order by r.created_at desc
  limit p_limit
  offset p_offset;
$$;


--
-- TOC entry 576 (class 1255 OID 117716)
-- Name: admin_list_images(integer, integer, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_list_images(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0, p_verified boolean DEFAULT NULL::boolean, p_order_by text DEFAULT 'uploaded_desc'::text) RETURNS TABLE(image_id bigint, uploader_user_id uuid, owner_display_name text, public_url text, public_url_thumb text, taken_at date, created_at timestamp with time zone, verified_at timestamp with time zone, verified_by uuid)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
begin
  if not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'not allowed';
  end if;

  return query
  select
    i.id as image_id,
    i.uploader_user_id,
    up.display_name as owner_display_name,
    i.public_url,
    i.public_url_thumb,
    i.taken_at,
    i.created_at,
    i.verified_at,
    i.verified_by
  from public.images i
  join public.user_profiles up on up.user_id = i.uploader_user_id
  where (p_verified is null or (i.verified_at is not null) = p_verified)
  order by
    case when p_order_by = 'uploaded_asc' then i.created_at end asc,
    case when p_order_by = 'uploaded_desc' then i.created_at end desc,
    case when p_order_by = 'user_asc' then up.display_name end asc,
    case when p_order_by = 'user_desc' then up.display_name end desc,
    i.created_at desc
  limit p_limit offset p_offset;
end;
$$;


--
-- TOC entry 599 (class 1255 OID 97616)
-- Name: admin_resolve_image_report(bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_resolve_image_report(p_report_id bigint, p_decision text, p_admin_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_admin_id uuid := auth.uid();
  v_decision text := lower(trim(p_decision));
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if v_decision not in ('accepted', 'rejected') then
    raise exception 'Decision must be accepted or rejected';
  end if;

  update public.image_reports
  set
    status = v_decision,
    reviewed_at = now(),
    reviewed_by = v_admin_id,
    admin_note = nullif(trim(p_admin_note), '')
  where id = p_report_id
    and status = 'open';

  if not found then
    raise exception 'Report not found or already resolved';
  end if;
end;
$$;


--
-- TOC entry 627 (class 1255 OID 90835)
-- Name: admin_resolve_report(bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_resolve_report(p_report_id bigint, p_action text, p_admin_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_admin uuid := auth.uid();
  v_is_super boolean;

  v_image_id bigint;
  v_uploader uuid;
  v_reason text;
begin
  if v_admin is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(up.super_user, false)
  into v_is_super
  from public.user_profiles up
  where up.user_id = v_admin;

  if not v_is_super then
    raise exception 'Forbidden';
  end if;

  select r.image_id, i.uploader_user_id, r.reason
  into v_image_id, v_uploader, v_reason
  from public.image_reports r
  join public.images i on i.id = r.image_id
  where r.id = p_report_id
    and r.status = 'open';

  if v_image_id is null then
    raise exception 'Report not found or already resolved.';
  end if;

  if p_action = 'reject_and_delete' then
    -- audit event for Trust score
    insert into public.image_moderation_events(
      image_id, uploader_user_id, event_type, report_id, moderator_user_id, reason, note
    )
    values (
      v_image_id, v_uploader, 'rejected_and_deleted', p_report_id, v_admin, v_reason, p_admin_note
    );

    -- resolve report
    update public.image_reports
    set status = 'reviewed',
        reviewed_at = now(),
        reviewed_by = v_admin,
        admin_note = p_admin_note
    where id = p_report_id;

    -- delete image
    delete from public.images where id = v_image_id;

  elsif p_action = 'dismiss' then
    -- optional audit
    insert into public.image_moderation_events(
      image_id, uploader_user_id, event_type, report_id, moderator_user_id, reason, note
    )
    values (
      v_image_id, v_uploader, 'dismissed_report', p_report_id, v_admin, v_reason, p_admin_note
    );

    update public.image_reports
    set status = 'dismissed',
        reviewed_at = now(),
        reviewed_by = v_admin,
        admin_note = p_admin_note
    where id = p_report_id;

  else
    raise exception 'Invalid action';
  end if;
end;
$$;


--
-- TOC entry 628 (class 1255 OID 117717)
-- Name: admin_set_image_verified(bigint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_image_verified(p_image_id bigint, p_verified boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if not public.is_admin_or_moderator(auth.uid()) then
    raise exception 'not allowed';
  end if;

  update public.images
  set
    verified_at = case when p_verified then now() else null end,
    verified_by = case when p_verified then auth.uid() else null end
  where id = p_image_id;
end;
$$;


--
-- TOC entry 528 (class 1255 OID 96474)
-- Name: admin_set_user_role(uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_user_role(p_target_user_id uuid, p_role public.user_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update public.user_profiles
  set role = p_role,
      -- admin a super_user role mají super_user = true kvůli existující logice
      super_user = case
        when p_role in ('super_user'::public.user_role, 'admin'::public.user_role) then true
        else super_user
      end
  where user_id = p_target_user_id;

  if not found then
    raise exception 'Target user profile not found';
  end if;
end;
$$;


--
-- TOC entry 575 (class 1255 OID 164258)
-- Name: app_runtime_settings_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_runtime_settings_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 565 (class 1255 OID 168165)
-- Name: apply_user_profile_registration_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_user_profile_registration_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'pg_temp'
    AS $$
begin
  if new.registration_number is null and new.user_id is not null then
    new.registration_number := public.ensure_user_registration_order_for_user(new.user_id);
  end if;
  return new;
end;
$$;


--
-- TOC entry 669 (class 1255 OID 168187)
-- Name: apply_user_suspension(uuid, boolean, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_user_suspension(p_user_id uuid, p_suspended boolean, p_admin_user_id uuid DEFAULT auth.uid(), p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if p_user_id is null then
    raise exception 'missing_user_id';
  end if;

  update public.user_profiles
  set
    account_status = case when p_suspended then 'suspended' else 'active' end,
    suspended_at = case when p_suspended then now() else null end,
    suspended_by = case when p_suspended then p_admin_user_id else null end,
    suspension_reason = case when p_suspended then nullif(trim(coalesce(p_reason, '')), '') else null end
  where user_id = p_user_id;

  update public.posts
  set hidden_by_suspension = p_suspended
  where author_user_id = p_user_id;

  update public.images
  set hidden_by_suspension = p_suspended
  where uploader_user_id = p_user_id;

  update public.comments
  set hidden_by_suspension = p_suspended
  where author_user_id = p_user_id;
end;
$$;


--
-- TOC entry 621 (class 1255 OID 168391)
-- Name: are_accepted_contacts(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.are_accepted_contacts(p_user_a uuid, p_user_b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select p_user_a is not null
    and p_user_b is not null
    and (
      p_user_a = p_user_b
      or exists (
        select 1
        from public.connections c
        where c.status = 'accepted'
          and (
            (c.user_id_a = p_user_a and c.user_id_b = p_user_b)
            or (c.user_id_a = p_user_b and c.user_id_b = p_user_a)
          )
      )
    );
$$;


--
-- TOC entry 508 (class 1255 OID 157218)
-- Name: are_users_connected(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.are_users_connected(p_user_a uuid, p_user_b uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.connections c
    where c.status = 'accepted'
      and (
        (c.user_id_a = p_user_a and c.user_id_b = p_user_b)
        or
        (c.user_id_a = p_user_b and c.user_id_b = p_user_a)
      )
  );
$$;


--
-- TOC entry 489 (class 1255 OID 165618)
-- Name: aw_challenges_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aw_challenges_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 557 (class 1255 OID 165512)
-- Name: aw_max_err_for_age(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aw_max_err_for_age(p_real_age numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  select greatest(p_real_age - 16, 116 - p_real_age);
$$;


--
-- TOC entry 515 (class 1255 OID 165514)
-- Name: aw_snapshot_all_user_stats(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aw_snapshot_all_user_stats(p_snapshot_date date DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user record;
  v_count integer := 0;
begin
  for v_user in
    select u.id
    from auth.users u
  loop
    perform public.aw_snapshot_user_stats(v_user.id, p_snapshot_date);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;


--
-- TOC entry 584 (class 1255 OID 165513)
-- Name: aw_snapshot_user_stats(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aw_snapshot_user_stats(p_user_id uuid, p_snapshot_date date DEFAULT CURRENT_DATE) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_aw_age numeric;
  v_aw_score_norm_pct numeric;
  v_avg_accuracy_pct numeric;
begin
  /*
   * AW age / AW score are based on current image aggregates.
   * UI displays AW score around 100, where 100 means "exactly real age".
   */
  select
    avg(coalesce(i.aw_age_image, i.avg_guessed_age)),
    avg(
      case
        when i.real_age_years is not null
          and coalesce(i.aw_age_image, i.avg_guessed_age) is not null
          and public.aw_max_err_for_age(i.real_age_years) > 0
        then 100 + ((coalesce(i.aw_age_image, i.avg_guessed_age) - i.real_age_years) / public.aw_max_err_for_age(i.real_age_years)) * 100
        else null
      end
    )
  into v_aw_age, v_aw_score_norm_pct
  from public.images i
  where i.uploader_user_id = p_user_id
    and coalesce(i.include_in_global_aw, true) = true
    and i.real_age_years is not null
    and coalesce(i.aw_age_image, i.avg_guessed_age) is not null;

  /*
   * Average accuracy of guesses made by the user.
   * 100 % = exact guess, lower values mean larger normalized error.
   */
  select
    avg(
      case
        when img.real_age_years is not null
          and g.guessed_age is not null
          and public.aw_max_err_for_age(img.real_age_years) > 0
        then greatest(0, 100 - (abs(g.guessed_age - img.real_age_years) / public.aw_max_err_for_age(img.real_age_years)) * 100)
        else null
      end
    )
  into v_avg_accuracy_pct
  from public.age_guesses g
  join public.images img on img.id = g.image_id
  where g.guesser_user_id = p_user_id;

  insert into public.aw_user_stats_history (
    user_id,
    snapshot_date,
    aw_age,
    aw_score_norm_pct,
    avg_accuracy_pct,
    power_score
  )
  values (
    p_user_id,
    p_snapshot_date,
    v_aw_age,
    v_aw_score_norm_pct,
    v_avg_accuracy_pct,
    null
  )
  on conflict (user_id, snapshot_date)
  do update set
    aw_age = excluded.aw_age,
    aw_score_norm_pct = excluded.aw_score_norm_pct,
    avg_accuracy_pct = excluded.avg_accuracy_pct,
    power_score = coalesce(public.aw_user_stats_history.power_score, excluded.power_score);
end;
$$;


--
-- TOC entry 574 (class 1255 OID 165495)
-- Name: aw_user_activity_50_days(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aw_user_activity_50_days() RETURNS TABLE(day date, photos bigint, comments bigint, posts bigint, ratings bigint, image_likes_given bigint, comment_likes_given bigint, image_likes_received bigint, comment_likes_received bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  v_user_id uuid := auth.uid();
  v_comment_likes_given_sql text;
  v_comment_likes_received_sql text;
  v_sql text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if to_regclass('public.comment_likes') is not null then
    v_comment_likes_given_sql := $q$
      select cl.created_at::date as day, count(*)::bigint as comment_likes_given
      from public.comment_likes cl
      where cl.user_id = $1
        and cl.created_at::date >= current_date - 49
      group by 1
    $q$;

    v_comment_likes_received_sql := $q$
      select cl.created_at::date as day, count(*)::bigint as comment_likes_received
      from public.comment_likes cl
      join public.comments c on c.id = cl.comment_id
      where c.author_user_id = $1
        and cl.created_at::date >= current_date - 49
      group by 1
    $q$;
  else
    v_comment_likes_given_sql := $q$
      select null::date as day, 0::bigint as comment_likes_given
      where false
    $q$;

    v_comment_likes_received_sql := $q$
      select null::date as day, 0::bigint as comment_likes_received
      where false
    $q$;
  end if;

  v_sql := format($q$
    with
    photos_by_day as (
      select i.created_at::date as day, count(*)::bigint as photos
      from public.images i
      where i.uploader_user_id = $1
        and i.created_at::date >= current_date - 49
      group by 1
    ),
    posts_by_day as (
      select p.created_at::date as day, count(*)::bigint as posts
      from public.posts p
      where p.author_user_id = $1
        and p.created_at::date >= current_date - 49
      group by 1
    ),
    comments_by_day as (
      select c.created_at::date as day, count(*)::bigint as comments
      from public.comments c
      where c.author_user_id = $1
        and c.created_at::date >= current_date - 49
        and coalesce(c.is_deleted, false) = false
      group by 1
    ),
    ratings_by_day as (
      select g.created_at::date as day, count(*)::bigint as ratings
      from public.age_guesses g
      where g.guesser_user_id = $1
        and g.created_at::date >= current_date - 49
      group by 1
    ),
    image_likes_given_by_day as (
      select il.created_at::date as day, count(*)::bigint as image_likes_given
      from public.image_likes il
      where il.user_id = $1
        and il.created_at::date >= current_date - 49
      group by 1
    ),
    comment_likes_given_by_day as (
      %s
    ),
    image_likes_received_by_day as (
      select il.created_at::date as day, count(*)::bigint as image_likes_received
      from public.image_likes il
      join public.images i on i.id = il.image_id
      where i.uploader_user_id = $1
        and il.created_at::date >= current_date - 49
      group by 1
    ),
    comment_likes_received_by_day as (
      %s
    ),
    all_activity as (
      select day, photos, 0::bigint as comments, 0::bigint as posts, 0::bigint as ratings, 0::bigint as image_likes_given, 0::bigint as comment_likes_given, 0::bigint as image_likes_received, 0::bigint as comment_likes_received from photos_by_day
      union all
      select day, 0, comments, 0, 0, 0, 0, 0, 0 from comments_by_day
      union all
      select day, 0, 0, posts, 0, 0, 0, 0, 0 from posts_by_day
      union all
      select day, 0, 0, 0, ratings, 0, 0, 0, 0 from ratings_by_day
      union all
      select day, 0, 0, 0, 0, image_likes_given, 0, 0, 0 from image_likes_given_by_day
      union all
      select day, 0, 0, 0, 0, 0, comment_likes_given, 0, 0 from comment_likes_given_by_day
      union all
      select day, 0, 0, 0, 0, 0, 0, image_likes_received, 0 from image_likes_received_by_day
      union all
      select day, 0, 0, 0, 0, 0, 0, 0, comment_likes_received from comment_likes_received_by_day
    )
    select
      a.day,
      coalesce(sum(a.photos), 0)::bigint as photos,
      coalesce(sum(a.comments), 0)::bigint as comments,
      coalesce(sum(a.posts), 0)::bigint as posts,
      coalesce(sum(a.ratings), 0)::bigint as ratings,
      coalesce(sum(a.image_likes_given), 0)::bigint as image_likes_given,
      coalesce(sum(a.comment_likes_given), 0)::bigint as comment_likes_given,
      coalesce(sum(a.image_likes_received), 0)::bigint as image_likes_received,
      coalesce(sum(a.comment_likes_received), 0)::bigint as comment_likes_received
    from all_activity a
    where a.day is not null
    group by a.day
    order by a.day desc
  $q$, v_comment_likes_given_sql, v_comment_likes_received_sql);

  return query execute v_sql using v_user_id;
end;
$_$;


--
-- TOC entry 573 (class 1255 OID 164232)
-- Name: aw_user_stats_history_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aw_user_stats_history_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 488 (class 1255 OID 168392)
-- Name: can_view_post_for_story(bigint, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_post_for_story(p_post_id bigint, p_viewer_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with post_ctx as (
    select
      p.id,
      p.author_user_id,
      coalesce(p.visibility, 'everyone') as post_visibility,
      p.hidden_by_suspension,
      pa.album_id,
      a.owner_user_id as album_owner_user_id,
      coalesce(a.visibility, p.visibility, 'everyone') as effective_visibility
    from public.posts p
    left join lateral (
      select album_id
      from public.post_albums
      where post_id = p.id
      order by sort_order asc, created_at asc
      limit 1
    ) pa on true
    left join public.albums a on a.id = pa.album_id
    where p.id = p_post_id
  )
  select exists (
    select 1
    from post_ctx pc
    where coalesce(pc.hidden_by_suspension, false) = false
      and p_viewer_id is not null
      and (
        public.is_privileged_viewer(p_viewer_id)
        or pc.author_user_id = p_viewer_id
        or pc.album_owner_user_id = p_viewer_id
        or pc.effective_visibility = 'everyone'
        or (
          pc.effective_visibility = 'contacts'
          and public.are_accepted_contacts(p_viewer_id, coalesce(pc.album_owner_user_id, pc.author_user_id))
        )
      )
  );
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 398 (class 1259 OID 35289)
-- Name: albums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.albums (
    id bigint NOT NULL,
    owner_user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    album_taken_at date,
    visibility public.content_visibility DEFAULT 'everyone'::public.content_visibility NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    year integer,
    aw_age numeric
);


--
-- TOC entry 492 (class 1255 OID 58573)
-- Name: create_album_from_post(bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_album_from_post(p_post_id bigint, p_title text DEFAULT NULL::text) RETURNS public.albums
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_owner uuid;
  v_album_id bigint;
  v_year int;
  v_min_year int;
  v_max_year int;
  v_aw_age numeric;
  v_title text;
begin
  -- 1) Find post owner
  select p.author_user_id
    into v_owner
  from public.posts p
  where p.id = p_post_id;

  if v_owner is null then
    raise exception 'Post nebyl nalezen.';
  end if;

  -- 2) Collect year range from images in the post (must exist + must be same year)
  select
    min(extract(year from i.taken_at))::int,
    max(extract(year from i.taken_at))::int
  into v_min_year, v_max_year
  from public.post_images pi
  join public.images i on i.id = pi.image_id
  where pi.post_id = p_post_id;

  if v_min_year is null or v_max_year is null then
    raise exception 'Album nelze vytvořit: post nemá fotky nebo fotkám chybí taken_at.';
  end if;

  if v_min_year <> v_max_year then
    raise exception 'Album nelze vytvořit: fotky v albu musí být v rámci jednoho kalendářního roku.';
  end if;

  v_year := v_min_year;

  -- ✅ Resolve title so it is NEVER NULL (albums.title is NOT NULL)
  v_title := nullif(trim(coalesce(p_title, '')), '');
  if v_title is null then
    v_title := coalesce('Album ' || v_year::text, 'Album');
  end if;

  -- 3) Compute AW age for album from images.aw_age_image (ignore nulls)
  select avg(i.aw_age_image)
    into v_aw_age
  from public.post_images pi
  join public.images i on i.id = pi.image_id
  where pi.post_id = p_post_id
    and i.aw_age_image is not null;

  -- 4) Create album row
  insert into public.albums (
    owner_user_id,
    title,
    aw_age,
    year
  )
  values (
    v_owner,
    v_title,
    v_aw_age,
    v_year
  )
  returning id into v_album_id;

  -- 5) Create album_images from the post order
  insert into public.album_images (album_id, image_id, sort_order)
  select
    v_album_id,
    pi.image_id,
    coalesce(pi.sort_order, row_number() over (order by pi.image_id) - 1)
  from public.post_images pi
  where pi.post_id = p_post_id
  order by coalesce(pi.sort_order, 0), pi.image_id;

  -- 6) Register that this album was posted in this post (post_albums)
  insert into public.post_albums (post_id, album_id, sort_order, created_at)
  values (p_post_id, v_album_id, 0, now());

  -- 7) Return created album
  return (select a from public.albums a where a.id = v_album_id);

exception
  when others then
    raise;
end;
$$;


--
-- TOC entry 623 (class 1255 OID 164292)
-- Name: create_app_notification(uuid, text, uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_app_notification(p_target_user_id uuid, p_notification_type text, p_entity_id uuid DEFAULT NULL::uuid, p_entity_bigint_id bigint DEFAULT NULL::bigint) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 600 (class 1255 OID 157220)
-- Name: create_message_thread_for_connection_request(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_message_thread_for_connection_request(p_request_id uuid, p_initial_body text DEFAULT NULL::text, p_thread_kind text DEFAULT 'connection_request_dm'::text) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_auth_user_id uuid;
  v_request record;
  v_thread_id bigint;
  v_body text;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_thread_kind not in ('connection_request_dm', 'connection_decline_dm') then
    raise exception 'invalid_thread_kind';
  end if;

  select id, requester_id, target_id, status
    into v_request
  from public.connection_requests
  where id = p_request_id;

  if not found then
    raise exception 'request_not_found';
  end if;

  if v_auth_user_id not in (v_request.requester_id, v_request.target_id) then
    raise exception 'forbidden';
  end if;

  insert into public.message_threads (
    thread_kind,
    connection_request_id
  )
  values (
    p_thread_kind,
    p_request_id
  )
  on conflict (connection_request_id) do update
    set thread_kind = excluded.thread_kind,
        updated_at = now()
  returning id into v_thread_id;

  perform public.ensure_message_thread_participants(v_thread_id, v_request.requester_id, v_request.target_id);

  v_body := nullif(trim(coalesce(p_initial_body, '')), '');

  if v_body is not null then
    insert into public.messages (thread_id, sender_user_id, body)
    values (v_thread_id, v_auth_user_id, left(v_body, 4000));
  end if;

  return v_thread_id;
end;
$$;


--
-- TOC entry 474 (class 1255 OID 164293)
-- Name: create_network_notification(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_network_notification(p_target_user_id uuid, p_notification_type text, p_entity_id uuid DEFAULT NULL::uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  return public.create_app_notification(
    p_target_user_id,
    p_notification_type,
    p_entity_id,
    null
  );
end;
$$;


--
-- TOC entry 601 (class 1255 OID 50739)
-- Name: enforce_single_guess_unless_super(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_single_guess_unless_super() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_is_super boolean := false;
begin
  -- Determine superuser flag from user_profiles.super_user (your real column)
  begin
    select coalesce(up.super_user, false)
      into v_is_super
    from public.user_profiles up
    where up.user_id = new.guesser_user_id;
  exception
    when undefined_column then
      v_is_super := false;
    when undefined_table then
      v_is_super := false;
    when others then
      v_is_super := false;
  end;

  -- For normal users: block duplicate guesses on the same image
  if not v_is_super then
    if exists (
      select 1
      from public.age_guesses g
      where g.guesser_user_id = new.guesser_user_id
        and g.image_id = new.image_id
      limit 1
    ) then
      raise exception 'Už jsi tuto fotku tipoval/a.'
        using errcode = '23505';
    end if;
  end if;

  -- Superuser: allow insert always
  return new;
end;
$$;


--
-- TOC entry 480 (class 1255 OID 157219)
-- Name: ensure_message_thread_participants(bigint, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_message_thread_participants(p_thread_id bigint, p_user_a uuid, p_user_b uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.message_thread_participants (thread_id, user_id)
  values
    (p_thread_id, p_user_a),
    (p_thread_id, p_user_b)
  on conflict (thread_id, user_id) do nothing;
end;
$$;


--
-- TOC entry 532 (class 1255 OID 168162)
-- Name: ensure_user_registration_order_for_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_user_registration_order_for_user(p_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  existing_number bigint;
  auth_created timestamptz;
begin
  select uro.registration_number
    into existing_number
  from public.user_registration_orders uro
  where uro.user_id = p_user_id;

  if existing_number is not null then
    return existing_number;
  end if;

  select coalesce(u.created_at, now())
    into auth_created
  from auth.users u
  where u.id = p_user_id;

  if auth_created is null then
    auth_created := now();
  end if;

  insert into public.user_registration_orders (user_id, auth_created_at)
  values (p_user_id, auth_created)
  on conflict (user_id) do nothing;

  select uro.registration_number
    into existing_number
  from public.user_registration_orders uro
  where uro.user_id = p_user_id;

  return existing_number;
end;
$$;


--
-- TOC entry 595 (class 1255 OID 97617)
-- Name: get_feed_posts(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_feed_posts(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_category text DEFAULT NULL::text) RETURNS TABLE(post_id bigint, created_at timestamp with time zone, image_id bigint, image_public_url text, photo_category text, uploader_user_id uuid, uploader_display_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  /*
    This function returns a "flat" feed:
    - one row per (post, image)
    - the frontend can group rows by post_id

    Expected tables (based on your project):
    - posts(id, created_at, user_id?) or author_user_id?
    - post_images(post_id, image_id)
    - images(id, public_url, photo_category, uploader_user_id)
    - user_profiles(user_id, display_name)
  */

  select
    p.id::bigint as post_id,
    p.created_at,
    i.id::bigint as image_id,
    i.public_url as image_public_url,
    i.photo_category::text as photo_category,
    i.uploader_user_id as uploader_user_id,
    up.display_name as uploader_display_name
  from public.posts p
  join public.post_images pi on pi.post_id = p.id
  join public.images i on i.id = pi.image_id
  left join public.user_profiles up on up.user_id = i.uploader_user_id
  where
    (p_category is null or i.photo_category::text = p_category)
  order by p.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;


--
-- TOC entry 494 (class 1255 OID 139276)
-- Name: get_my_aw_age_current(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_aw_age_current() RETURNS TABLE(real_age integer, aw_age numeric, aw_delta_years numeric, aw_delta_pct numeric)
    LANGUAGE sql SECURITY DEFINER
    AS $$
with me as (
  select
    u.user_id,
    u.date_of_birth,
    extract(year from age(current_date, u.date_of_birth))::int as real_age_today
  from public.user_profiles u
  where u.user_id = auth.uid()
),

image_level as (
  select
    i.id as image_id,
    i.taken_at::date as taken_at,
    sum(g.weight_at_guess)::numeric as total_weight,
    sum((g.guessed_age::numeric) * g.weight_at_guess) / nullif(sum(g.weight_at_guess), 0) as aw_age_at_photo
  from public.images i
  join public.age_guesses g
    on g.image_id = i.id
  where i.uploader_user_id = auth.uid()
    and coalesce(i.include_in_global_aw, true) = true
    and i.taken_at is not null
    and i.taken_at::date >= current_date - interval '4 years'
    and i.taken_at::date <= current_date
  group by
    i.id,
    i.taken_at::date
),

image_current as (
  select
    il.image_id,
    il.total_weight,
    (
      il.aw_age_at_photo
      + extract(year from age(current_date, il.taken_at))::numeric
    ) as aw_age_image_today
  from image_level il
),

final_agg as (
  select
    sum(ic.aw_age_image_today * ic.total_weight) / nullif(sum(ic.total_weight), 0) as aw_age
  from image_current ic
)

select
  me.real_age_today as real_age,
  fa.aw_age as aw_age,
  (fa.aw_age - me.real_age_today::numeric) as aw_delta_years,
  (
    (fa.aw_age - me.real_age_today::numeric)
    / nullif(me.real_age_today::numeric, 0)
    * 100
  ) as aw_delta_pct
from me
left join final_agg fa on true;
$$;


--
-- TOC entry 666 (class 1255 OID 139277)
-- Name: get_my_aw_age_trajectory(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_aw_age_trajectory() RETURNS TABLE(image_id bigint, taken_at date, real_age_at_photo integer, age_today integer, aw_score_norm numeric, aw_bias_years numeric, aw_age_image_today numeric, total_weight numeric)
    LANGUAGE sql SECURITY DEFINER
    AS $$
with eligible_images as (
  select
    i.id,
    i.taken_at::date as taken_at,
    i.real_age_years,
    extract(year from age(current_date, i.taken_at::date))::int as years_since_photo
  from public.images i
  where i.uploader_user_id = auth.uid()
    and i.include_in_global_aw = true
    and i.taken_at is not null
    and i.taken_at >= current_date - interval '5 years'
),

image_bias as (
  select
    ei.id,
    ei.taken_at,
    ei.real_age_years,
    (ei.real_age_years + ei.years_since_photo) as age_today,
    sum(g.weight_at_guess) as total_weight,
    sum(
      (
        (
          (g.guessed_age - ei.real_age_years)::numeric
          /
          greatest(
            (ei.real_age_years - 16)::numeric,
            (116 - ei.real_age_years)::numeric
          )
        )
        * g.weight_at_guess
      )
    ) / nullif(sum(g.weight_at_guess), 0) as aw_score_norm
  from eligible_images ei
  join public.age_guesses g
    on g.image_id = ei.id
  group by
    ei.id,
    ei.taken_at,
    ei.real_age_years,
    ei.years_since_photo
)

select
  ib.id as image_id,
  ib.taken_at,
  ib.real_age_years as real_age_at_photo,
  ib.age_today,
  ib.aw_score_norm,
  (
    ib.aw_score_norm
    *
    greatest(
      (ib.age_today - 16)::numeric,
      (116 - ib.age_today)::numeric
    )
  ) as aw_bias_years,
  least(
    116::numeric,
    greatest(
      16::numeric,
      ib.age_today::numeric
      +
      (
        ib.aw_score_norm
        *
        greatest(
          (ib.age_today - 16)::numeric,
          (116 - ib.age_today)::numeric
        )
      )
    )
  ) as aw_age_image_today,
  ib.total_weight
from image_bias ib
order by ib.taken_at asc, ib.id asc;
$$;


--
-- TOC entry 559 (class 1255 OID 148112)
-- Name: get_my_aw_age_trajectory(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_aw_age_trajectory(p_view text DEFAULT '50d'::text) RETURNS TABLE(point_date date, real_age_at_point numeric, aw_age_at_point numeric, images_used integer)
    LANGUAGE sql SECURITY DEFINER
    AS $$
with me as (
  select
    u.user_id,
    u.date_of_birth,
    (u.date_of_birth + interval '16 years')::date as age16_date
  from public.user_profiles u
  where u.user_id = auth.uid()
),

points as (
  select gs::date as point_date
  from generate_series(
    current_date - interval '49 days',
    current_date,
    interval '1 day'
  ) gs
  where p_view = '50d'

  union all

  select gs::date as point_date
  from generate_series(
    date_trunc('week', current_date - interval '364 days')::date,
    current_date,
    interval '7 day'
  ) gs
  where p_view = '1y'

  union all

  select gs::date as point_date
  from generate_series(
    date_trunc('year', current_date - interval '10 years')::date,
    current_date,
    interval '1 month'
  ) gs
  where p_view = '10y'

  union all

  select gs::date as point_date
  from me,
  generate_series(
    me.age16_date,
    current_date,
    interval '1 year'
  ) gs
  where p_view = 'life'
),

image_level as (
  select
    i.id as image_id,
    i.taken_at::date as taken_at,
    sum(g.weight_at_guess)::numeric as total_weight,
    sum((g.guessed_age::numeric) * g.weight_at_guess) / nullif(sum(g.weight_at_guess), 0) as aw_age_at_photo
  from public.images i
  join public.age_guesses g
    on g.image_id = i.id
  where i.uploader_user_id = auth.uid()
    and coalesce(i.include_in_global_aw, true) = true
    and i.taken_at is not null
  group by
    i.id,
    i.taken_at::date
),

point_images as (
  select
    p.point_date,
    il.image_id,
    il.total_weight,
    (
      il.aw_age_at_photo
      + extract(year from age(p.point_date, il.taken_at))::numeric
    ) as aw_age_at_point
  from points p
  join image_level il
    on il.taken_at >= (p.point_date - interval '4 years')::date
   and il.taken_at <= p.point_date
),

point_agg as (
  select
    p.point_date,
    (
      extract(epoch from (p.point_date::timestamp - me.date_of_birth::timestamp))
      / (365.25 * 24 * 60 * 60)
    )::numeric as real_age_at_point,
    sum(pi.aw_age_at_point * pi.total_weight) / nullif(sum(pi.total_weight), 0) as aw_age_at_point,
    count(pi.image_id)::int as images_used
  from points p
  cross join me
  left join point_images pi
    on pi.point_date = p.point_date
  where p.point_date >= me.age16_date
  group by
    p.point_date,
    me.date_of_birth
)

select
  pa.point_date,
  pa.real_age_at_point,
  pa.aw_age_at_point,
  pa.images_used
from point_agg pa
order by pa.point_date asc;
$$;


--
-- TOC entry 589 (class 1255 OID 90750)
-- Name: get_my_personal_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_personal_score() RETURNS TABLE(window_90_start date, window_90_end date, guesses_count_90d integer, avg_acc_90d numeric, active_days_90d integer, strike_days_90d integer, uploaded_photos_90d integer, rejected_photos_360d integer, i_multiplier numeric, y_multiplier numeric, a_score numeric, c_score numeric, t_score numeric, r_score numeric, b_score numeric, p_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_uid uuid := auth.uid();
  v_end date := (now() at time zone 'utc')::date;
  v_start_90 date := (v_end - interval '90 days')::date;
  v_start_360 date := (v_end - interval '360 days')::date;

  v_anonymous_default boolean;
  v_allow_age_visible boolean;

  v_guesses_count int := 0;
  v_avg_acc numeric := 0;

  v_active_days int := 0;
  v_strike_days int := 0;

  v_uploaded_photos int := 0;
  v_rejected_photos int := 0;

  v_i numeric := 1;
  v_y numeric := 1;

  v_a numeric := 0;
  v_c numeric := 0;
  v_t numeric := 0;
  v_r numeric := 0;
  v_b numeric := 0;
  v_p numeric := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- načteme privacy multiplikátory
  select
    up.anonymous_guesses_default,
    up.allow_age_visible
  into
    v_anonymous_default,
    v_allow_age_visible
  from public.user_profiles up
  where up.user_id = v_uid;

  v_i := case when coalesce(v_anonymous_default, false) then 0.5 else 1 end;
  v_y := case when coalesce(v_allow_age_visible, true) then 1 else 0.5 end;

  -- guesses_count_90d
  select count(*)::int
  into v_guesses_count
  from public.age_guesses g
  where g.guesser_user_id = v_uid
    and g.created_at >= (v_start_90::timestamp with time zone)
    and g.created_at <  ((v_end + 1)::timestamp with time zone);

  -- avg_acc_90d (koncept: přesnost z tipů = 100 - abs(guessed - real))
  -- Pozn.: real_age_years je v images snapshot.
  select
    coalesce(avg(greatest(0, 100 - abs(g.guessed_age - i.real_age_years))), 0)
  into v_avg_acc
  from public.age_guesses g
  join public.images i on i.id = g.image_id
  where g.guesser_user_id = v_uid
    and g.created_at >= (v_start_90::timestamp with time zone)
    and g.created_at <  ((v_end + 1)::timestamp with time zone);

  -- active days (distinct dny, kdy dal tip)
  select
    count(*)::int
  into v_active_days
  from (
    select (g.created_at at time zone 'utc')::date as d
    from public.age_guesses g
    where g.guesser_user_id = v_uid
      and g.created_at >= (v_start_90::timestamp with time zone)
      and g.created_at <  ((v_end + 1)::timestamp with time zone)
    group by 1
  ) x;

  v_strike_days := greatest(0, 90 - v_active_days);

  -- uploaded photos 90d
  select count(*)::int
  into v_uploaded_photos
  from public.images im
  where im.uploader_user_id = v_uid
    and im.created_at >= (v_start_90::timestamp with time zone)
    and im.created_at <  ((v_end + 1)::timestamp with time zone);

  -- rejected photos 360d (audit tabulka)
  select count(*)::int
  into v_rejected_photos
  from public.image_moderation_events e
  where e.uploader_user_id = v_uid
    and e.event_type = 'rejected_and_deleted'
    and e.created_at >= (v_start_360::timestamp with time zone)
    and e.created_at <  ((v_end + 1)::timestamp with time zone);

  -- A = I * wA * guesses_count
  v_a := v_i * (v_avg_acc / 100.0) * v_guesses_count;

  -- C = Y * A * (aD / sD)
  v_c := case
    when v_strike_days <= 0 then (v_y * v_a) -- když nemá strike dny, bereme poměr jako 1 (nebo může být "velmi vysoké", ale to by bylo exploitable)
    else (v_y * v_a * (v_active_days::numeric / v_strike_days::numeric))
  end;

  -- T = rejected * (-100)
  v_t := v_rejected_photos * (-100);

  -- R = uploaded * 0.1
  v_r := v_uploaded_photos * 0.1;

  -- B zatím 0
  v_b := 0;

  v_p := v_a + v_c + v_t + v_r + v_b;

  return query
  select
    v_start_90,
    v_end,
    v_guesses_count,
    v_avg_acc,
    v_active_days,
    v_strike_days,
    v_uploaded_photos,
    v_rejected_photos,
    v_i,
    v_y,
    v_a,
    v_c,
    v_t,
    v_r,
    v_b,
    v_p;
end;
$$;


--
-- TOC entry 588 (class 1255 OID 92020)
-- Name: get_my_power_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_power_score() RETURNS TABLE(p_score numeric, a_score numeric, c_score numeric, t_score numeric, r_score numeric, b_score numeric, avg_acc_pct_90d numeric, wa numeric, guesses_public_90d integer, guesses_anonymous_90d integer, guesses_weighted_90d numeric, guesses_count_90d integer, active_days_90d integer, strike_days_90d integer, photos_90d integer, allow_age_visible boolean, y_factor numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();

  v_allow_age_visible boolean := true;
  v_y numeric := 0;

  v_pub int := 0;
  v_anon int := 0;
  v_weighted numeric := 0;

  v_active_days int := 0;
  v_strike_days int := 0;

  v_photos int := 0;

  v_avg_acc_pct numeric := 0;
  v_wA numeric := 0;

  -- agreed coefficients
  I_PUBLIC constant numeric := 0.40;
  I_ANON constant numeric := 0.15;
  Y_ALLOWED constant numeric := 0.70;
  Y_DENIED constant numeric := 0.15;
  R_COEF constant numeric := 3.0;

  v_A numeric := 0;
  v_C numeric := 0;
  v_T numeric := 0; -- TRUST penalty (new)
  v_R numeric := 0;
  v_B numeric := 0;

  v_rejected_weighted_360d numeric := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- allow_age_visible => Y
  select coalesce(up.allow_age_visible, true)
    into v_allow_age_visible
  from public.user_profiles up
  where up.user_id = v_uid;

  v_y := case when v_allow_age_visible then Y_ALLOWED else Y_DENIED end;

  -- guess counts (90d) + weighted by anonymity
  select
    count(*) filter (where ag.is_anonymous = false)::int,
    count(*) filter (where ag.is_anonymous = true)::int,
    coalesce(sum(case when ag.is_anonymous then I_ANON else I_PUBLIC end), 0)::numeric
  into v_pub, v_anon, v_weighted
  from public.age_guesses ag
  where ag.guesser_user_id = v_uid
    and ag.created_at >= now() - interval '90 days';

  -- avg accuracy % (90d)
  select
    coalesce(
      avg(greatest(0, least(100, 100 - abs(ag.guessed_age - img.real_age_years)))),
      0
    )::numeric
  into v_avg_acc_pct
  from public.age_guesses ag
  join public.images img on img.id = ag.image_id
  where ag.guesser_user_id = v_uid
    and ag.created_at >= now() - interval '90 days';

  v_wA := v_avg_acc_pct / 100.0;

  -- active days / strike days (90d)
  select coalesce(count(distinct (ag.created_at::date)), 0)::int
    into v_active_days
  from public.age_guesses ag
  where ag.guesser_user_id = v_uid
    and ag.created_at >= now() - interval '90 days';

  v_strike_days := greatest(1, 90 - v_active_days);

  -- uploads (90d)
  select coalesce(count(*), 0)::int
    into v_photos
  from public.images i
  where i.uploader_user_id = v_uid
    and i.created_at >= now() - interval '90 days';

  -- TRUST penalty (360d): weighted rejected+deleted
  select
    coalesce(sum(coalesce(r.penalty_coef, 1.0)), 0)::numeric
  into v_rejected_weighted_360d
  from public.image_moderation_events e
  left join public.image_reports r on r.id = e.report_id
  where e.uploader_user_id = v_uid
    and e.event_type = 'rejected_and_deleted'
    and e.created_at >= now() - interval '360 days';

  -- scores
  v_A := v_wA * v_weighted;
  v_C := v_y * v_A * (v_active_days::numeric / v_strike_days::numeric);
  v_R := v_photos * R_COEF;

  -- T: each weighted rejection costs -100 * coef
  v_T := v_rejected_weighted_360d * (-100);

  v_B := 0;

  -- assign OUT columns
  p_score := v_A + v_C + v_T + v_R + v_B;
  a_score := v_A;
  c_score := v_C;
  t_score := v_T;
  r_score := v_R;
  b_score := v_B;

  avg_acc_pct_90d := v_avg_acc_pct;
  wA := v_wA;
  guesses_public_90d := v_pub;
  guesses_anonymous_90d := v_anon;
  guesses_weighted_90d := v_weighted;
  guesses_count_90d := v_pub + v_anon;
  active_days_90d := v_active_days;
  strike_days_90d := v_strike_days;
  photos_90d := v_photos;
  allow_age_visible := v_allow_age_visible;
  y_factor := v_y;

  return next;
end;
$$;


--
-- TOC entry 592 (class 1255 OID 96470)
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select coalesce(
    (select up.role from public.user_profiles up where up.user_id = auth.uid()),
    'user'::public.user_role
  );
$$;


--
-- TOC entry 642 (class 1255 OID 60839)
-- Name: get_my_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  uid uuid := auth.uid();

  -- Spec constants
  MIN_AGE constant int := 16;
  MAX_AGE constant int := 116;
  PRIOR_COUNT constant int := 5;
  PRIOR_ACCURACY constant numeric := 60;

  has_weight_at_guess boolean := false;

  -- counts/aggregates
  posts_count int := 0;
  images_count int := 0;
  albums_count int := 0;

  -- NEW: global-eligible image counts (include_in_global_aw)
  images_included_count int := 0;
  images_excluded_count int := 0;

  guesses_made_count int := 0;
  guesses_received_count int := 0;

  -- NEW: guesses received only on global-eligible images
  guesses_received_included_count int := 0;

  avg_aw_age_image numeric := null;
  avg_abs_error_years numeric := null;
  max_guesses_on_single_image int := 0;

  -- NEW: aggregates only for global-eligible images
  avg_aw_age_image_included numeric := null;
  avg_abs_error_years_included numeric := null;
  max_guesses_on_single_image_included int := 0;

  -- meaning
  real_age_user int := null;

  -- IMPORTANT: aw_age_user = "global/profile age" -> only included images
  aw_age_user numeric := null;

  -- IMPORTANT: aw_score_norm_pct = "global score" -> only included images
  aw_score_norm_pct numeric := null;

  avg_accuracy_pct numeric := null;

  -- internal debug helpers (not returned)
  sum_w numeric := 0;

  result json;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- detect optional weight column
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='age_guesses' and column_name='weight_at_guess'
  ) into has_weight_at_guess;

  /* -------------------- posts count (posts with >= 1 image) -------------------- */
  select count(distinct p.id)::int
  into posts_count
  from public.posts p
  join public.post_images pi on pi.post_id = p.id
  where p.author_user_id = uid;

  /* -------------------- albums count (albums with >= 1 image) -------------------- */
  select count(distinct a.id)::int
  into albums_count
  from public.albums a
  join public.album_images ai on ai.album_id = a.id
  where a.owner_user_id = uid;

  /* -------------------- image counts (all vs included/excluded) -------------------- */
  select
    count(*)::int,
    count(*) filter (where i.include_in_global_aw = true)::int,
    count(*) filter (where i.include_in_global_aw = false)::int
  into
    images_count,
    images_included_count,
    images_excluded_count
  from public.images i
  where i.uploader_user_id = uid;

  /* -------------------- cached image aggregates (ALL images) -------------------- */
  select
    coalesce(sum(coalesce(i.guesses_count, 0)), 0)::int,
    round(avg(i.aw_age_image)::numeric, 1),
    round(avg(abs(i.real_age_years - i.aw_age_image))::numeric, 1),
    max(coalesce(i.guesses_count, 0))::int
  into
    guesses_received_count,
    avg_aw_age_image,
    avg_abs_error_years,
    max_guesses_on_single_image
  from public.images i
  where i.uploader_user_id = uid;

  /* -------------------- cached image aggregates (ONLY included images) -------------------- */
  select
    coalesce(sum(coalesce(i.guesses_count, 0)), 0)::int,
    round(avg(i.aw_age_image)::numeric, 1),
    round(avg(abs(i.real_age_years - i.aw_age_image))::numeric, 1),
    max(coalesce(i.guesses_count, 0))::int
  into
    guesses_received_included_count,
    avg_aw_age_image_included,
    avg_abs_error_years_included,
    max_guesses_on_single_image_included
  from public.images i
  where i.uploader_user_id = uid
    and i.include_in_global_aw = true;

  /* -------------------- guesses made -------------------- */
  select count(*)::int
  into guesses_made_count
  from public.age_guesses g
  where g.guesser_user_id = uid;

  /* -------------------- real age user (today) -------------------- */
  select extract(year from age(now(), up.date_of_birth))::int
  into real_age_user
  from public.user_profiles up
  where up.user_id = uid;

  /* -------------------- AW age user (GLOBAL) --------------------
     Weighted by guesses_count and ONLY included images
  */
  select
    round(
      sum(i.aw_age_image * i.guesses_count)::numeric
      / nullif(sum(i.guesses_count), 0)
    , 1)
  into aw_age_user
  from public.images i
  where i.uploader_user_id = uid
    and i.include_in_global_aw = true
    and i.guesses_count > 0
    and i.aw_age_image is not null;

  /* -------------------- avgAcc (%), computed from guesses user MADE -------------------- */
  with my_guesses as (
    select
      g.guessed_age::numeric as guessed_age,
      i.real_age_years::numeric as real_age,
      greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
    from public.age_guesses g
    join public.images i on i.id = g.image_id
    where g.guesser_user_id = uid
      and i.real_age_years is not null
      and g.guessed_age is not null
  ),
  per_guess as (
    select
      greatest(
        0,
        least(
          100,
          100 * (1 - (abs(guessed_age - real_age) / nullif(max_err, 0)))
        )
      )::numeric as aw_accuracy
    from my_guesses
    where max_err > 0
  )
  select
    round(
      (PRIOR_COUNT * PRIOR_ACCURACY + coalesce(sum(aw_accuracy), 0))
      / (PRIOR_COUNT + count(*))
    , 1)
  into avg_accuracy_pct
  from per_guess;

  /* -------------------- AW score norm pct (GLOBAL) --------------------
     For THIS USER = tips ON THEIR images, but ONLY included images.

     Robust rule:
     - If weight_at_guess exists and sum(weights)>0 -> weighted avg
     - Else fallback to unweighted avg (w=1)
     - Never return NULL if any valid rows exist
  */
  if has_weight_at_guess then
    -- compute sum of weights on user's INCLUDED images for valid rows
    with g0 as (
      select
        coalesce(g.weight_at_guess, 0)::numeric as w,
        g.guessed_age::numeric as guessed_age,
        i.real_age_years::numeric as real_age,
        greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
      from public.age_guesses g
      join public.images i on i.id = g.image_id
      where i.uploader_user_id = uid
        and i.include_in_global_aw = true
        and i.real_age_years is not null
        and g.guessed_age is not null
    )
    select coalesce(sum(w), 0) into sum_w
    from g0
    where max_err > 0;

    if sum_w > 0 then
      -- weighted
      with g0 as (
        select
          coalesce(g.weight_at_guess, 0)::numeric as w,
          g.guessed_age::numeric as guessed_age,
          i.real_age_years::numeric as real_age,
          greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
        from public.age_guesses g
        join public.images i on i.id = g.image_id
        where i.uploader_user_id = uid
          and i.include_in_global_aw = true
          and i.real_age_years is not null
          and g.guessed_age is not null
      ),
      g1 as (
        select
          ((guessed_age - real_age) / nullif(max_err, 0))::numeric as delta_norm,
          w
        from g0
        where max_err > 0 and w > 0
      )
      select
        round(100 + (sum(delta_norm * w) / nullif(sum(w), 0)) * 100, 1)
      into aw_score_norm_pct
      from g1;
    else
      -- fallback to unweighted if all weights are zero
      with g0 as (
        select
          g.guessed_age::numeric as guessed_age,
          i.real_age_years::numeric as real_age,
          greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
        from public.age_guesses g
        join public.images i on i.id = g.image_id
        where i.uploader_user_id = uid
          and i.include_in_global_aw = true
          and i.real_age_years is not null
          and g.guessed_age is not null
      ),
      g1 as (
        select ((guessed_age - real_age) / nullif(max_err, 0))::numeric as delta_norm
        from g0
        where max_err > 0
      )
      select
        round(100 + coalesce(avg(delta_norm), 0) * 100, 1)
      into aw_score_norm_pct
      from g1;
    end if;

  else
    -- no weight column -> unweighted
    with g0 as (
      select
        g.guessed_age::numeric as guessed_age,
        i.real_age_years::numeric as real_age,
        greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
      from public.age_guesses g
      join public.images i on i.id = g.image_id
      where i.uploader_user_id = uid
        and i.include_in_global_aw = true
        and i.real_age_years is not null
        and g.guessed_age is not null
    ),
    g1 as (
      select ((guessed_age - real_age) / nullif(max_err, 0))::numeric as delta_norm
      from g0
      where max_err > 0
    )
    select
      round(100 + coalesce(avg(delta_norm), 0) * 100, 1)
    into aw_score_norm_pct
    from g1;
  end if;

  result := json_build_object(
    'realAgeUser', real_age_user,

    -- GLOBAL metrics (respect include_in_global_aw)
    'awAgeUser', aw_age_user,
    'awScoreNormPct', aw_score_norm_pct,

    -- Guesser reputation metric (based on guesses MADE) stays as-is
    'avgAccuracyPct', avg_accuracy_pct,

    -- counts
    'postsCount', posts_count,
    'albumsCount', albums_count,

    -- images counts (all)
    'imagesCount', images_count,
    'guessesReceivedCount', guesses_received_count,

    -- NEW transparency fields
    'imagesIncludedInGlobalCount', images_included_count,
    'imagesExcludedFromGlobalCount', images_excluded_count,
    'guessesReceivedIncludedCount', guesses_received_included_count,

    -- aggregates (all images)
    'avgAwAgeImage', avg_aw_age_image,
    'avgAbsErrorYears', avg_abs_error_years,
    'maxGuessesOnSingleImage', max_guesses_on_single_image,

    -- NEW aggregates (included only)
    'avgAwAgeImageIncluded', avg_aw_age_image_included,
    'avgAbsErrorYearsIncluded', avg_abs_error_years_included,
    'maxGuessesOnSingleImageIncluded', max_guesses_on_single_image_included,

    -- guesses made (as before)
    'guessesMadeCount', guesses_made_count
  );

  return result;
end;
$$;


--
-- TOC entry 570 (class 1255 OID 74659)
-- Name: get_my_stats_filtered(public.photo_category, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_stats_filtered(p_photo_category public.photo_category DEFAULT NULL::public.photo_category, p_include_experimental boolean DEFAULT false) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  uid uuid := auth.uid();

  -- Spec constants
  MIN_AGE constant int := 16;
  MAX_AGE constant int := 116;
  PRIOR_COUNT constant int := 5;
  PRIOR_ACCURACY constant numeric := 60;

  has_weight_at_guess boolean := false;

  -- counts/aggregates
  posts_count int := 0;
  images_count int := 0;
  albums_count int := 0;

  -- transparency counts (still meaningful for the chosen category)
  images_included_count int := 0;
  images_excluded_count int := 0;

  guesses_made_count int := 0;
  guesses_received_count int := 0;

  guesses_received_included_count int := 0;

  avg_aw_age_image numeric := null;
  avg_abs_error_years numeric := null;
  max_guesses_on_single_image int := 0;

  avg_aw_age_image_included numeric := null;
  avg_abs_error_years_included numeric := null;
  max_guesses_on_single_image_included int := 0;

  real_age_user int := null;

  aw_age_user numeric := null;
  aw_score_norm_pct numeric := null;

  avg_accuracy_pct numeric := null;

  sum_w numeric := 0;

  result json;

  -- Helper: when includeExperimental=true -> treat ALL images as eligible for "global metrics"
  -- When includeExperimental=false -> only include_in_global_aw=true are eligible
  -- NOTE: this is used only for awAgeUser/awScoreNormPct and the "...Included..." aggregates.
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- detect optional weight column
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='age_guesses' and column_name='weight_at_guess'
  ) into has_weight_at_guess;

  /* -------------------- posts count (posts with >= 1 image) -------------------- */
  -- Keep same behavior as original (not category-filtered)
  select count(distinct p.id)::int
  into posts_count
  from public.posts p
  join public.post_images pi on pi.post_id = p.id
  where p.author_user_id = uid;

  /* -------------------- albums count (albums with >= 1 image) -------------------- */
  -- Keep same behavior as original (not category-filtered)
  select count(distinct a.id)::int
  into albums_count
  from public.albums a
  join public.album_images ai on ai.album_id = a.id
  where a.owner_user_id = uid;

  /* -------------------- image counts (category-filtered) -------------------- */
  select
    count(*)::int,
    count(*) filter (where i.include_in_global_aw = true)::int,
    count(*) filter (where i.include_in_global_aw = false)::int
  into
    images_count,
    images_included_count,
    images_excluded_count
  from public.images i
  where i.uploader_user_id = uid
    and (p_photo_category is null or i.photo_category = p_photo_category);

  /* -------------------- cached image aggregates (ALL images, category-filtered) -------------------- */
  select
    coalesce(sum(coalesce(i.guesses_count, 0)), 0)::int,
    round(avg(i.aw_age_image)::numeric, 1),
    round(avg(abs(i.real_age_years - i.aw_age_image))::numeric, 1),
    max(coalesce(i.guesses_count, 0))::int
  into
    guesses_received_count,
    avg_aw_age_image,
    avg_abs_error_years,
    max_guesses_on_single_image
  from public.images i
  where i.uploader_user_id = uid
    and (p_photo_category is null or i.photo_category = p_photo_category);

  /* -------------------- cached image aggregates (ELIGIBLE images for AW, category-filtered) -------------------- */
  select
    coalesce(sum(coalesce(i.guesses_count, 0)), 0)::int,
    round(avg(i.aw_age_image)::numeric, 1),
    round(avg(abs(i.real_age_years - i.aw_age_image))::numeric, 1),
    max(coalesce(i.guesses_count, 0))::int
  into
    guesses_received_included_count,
    avg_aw_age_image_included,
    avg_abs_error_years_included,
    max_guesses_on_single_image_included
  from public.images i
  where i.uploader_user_id = uid
    and (p_photo_category is null or i.photo_category = p_photo_category)
    and (p_include_experimental = true or i.include_in_global_aw = true);

  /* -------------------- guesses made (as before, not category-filtered) -------------------- */
  select count(*)::int
  into guesses_made_count
  from public.age_guesses g
  where g.guesser_user_id = uid;

  /* -------------------- real age user (today) -------------------- */
  select extract(year from age(now(), up.date_of_birth))::int
  into real_age_user
  from public.user_profiles up
  where up.user_id = uid;

  /* -------------------- AW age user (filtered like original logic) --------------------
     Weighted by guesses_count and eligible images.
     IMPORTANT: uses aw_age_image, not avg_guessed_age.
  */
  select
    round(
      sum(i.aw_age_image * i.guesses_count)::numeric
      / nullif(sum(i.guesses_count), 0)
    , 1)
  into aw_age_user
  from public.images i
  where i.uploader_user_id = uid
    and (p_photo_category is null or i.photo_category = p_photo_category)
    and (p_include_experimental = true or i.include_in_global_aw = true)
    and i.guesses_count > 0
    and i.aw_age_image is not null;

  /* -------------------- avgAcc (%), computed from guesses user MADE -------------------- */
  -- Leave identical behavior (not category-filtered), because it's "your guessing skill"
  with my_guesses as (
    select
      g.guessed_age::numeric as guessed_age,
      i.real_age_years::numeric as real_age,
      greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
    from public.age_guesses g
    join public.images i on i.id = g.image_id
    where g.guesser_user_id = uid
      and i.real_age_years is not null
      and g.guessed_age is not null
  ),
  per_guess as (
    select
      greatest(
        0,
        least(
          100,
          100 * (1 - (abs(guessed_age - real_age) / nullif(max_err, 0)))
        )
      )::numeric as aw_accuracy
    from my_guesses
    where max_err > 0
  )
  select
    round(
      (PRIOR_COUNT * PRIOR_ACCURACY + coalesce(sum(aw_accuracy), 0))
      / (PRIOR_COUNT + count(*))
    , 1)
  into avg_accuracy_pct
  from per_guess;

  /* -------------------- AW score norm pct (filtered like original logic) --------------------
     This is based on age_guesses on user's images, eligible images, and optional weights.
  */
  if has_weight_at_guess then
    with g0 as (
      select
        coalesce(g.weight_at_guess, 0)::numeric as w,
        g.guessed_age::numeric as guessed_age,
        i.real_age_years::numeric as real_age,
        greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
      from public.age_guesses g
      join public.images i on i.id = g.image_id
      where i.uploader_user_id = uid
        and (p_photo_category is null or i.photo_category = p_photo_category)
        and (p_include_experimental = true or i.include_in_global_aw = true)
        and i.real_age_years is not null
        and g.guessed_age is not null
    )
    select coalesce(sum(w), 0) into sum_w
    from g0
    where max_err > 0;

    if sum_w > 0 then
      with g0 as (
        select
          coalesce(g.weight_at_guess, 0)::numeric as w,
          g.guessed_age::numeric as guessed_age,
          i.real_age_years::numeric as real_age,
          greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
        from public.age_guesses g
        join public.images i on i.id = g.image_id
        where i.uploader_user_id = uid
          and (p_photo_category is null or i.photo_category = p_photo_category)
          and (p_include_experimental = true or i.include_in_global_aw = true)
          and i.real_age_years is not null
          and g.guessed_age is not null
      ),
      g1 as (
        select
          ((guessed_age - real_age) / nullif(max_err, 0))::numeric as delta_norm,
          w
        from g0
        where max_err > 0 and w > 0
      )
      select
        round(100 + (sum(delta_norm * w) / nullif(sum(w), 0)) * 100, 1)
      into aw_score_norm_pct
      from g1;
    else
      with g0 as (
        select
          g.guessed_age::numeric as guessed_age,
          i.real_age_years::numeric as real_age,
          greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
        from public.age_guesses g
        join public.images i on i.id = g.image_id
        where i.uploader_user_id = uid
          and (p_photo_category is null or i.photo_category = p_photo_category)
          and (p_include_experimental = true or i.include_in_global_aw = true)
          and i.real_age_years is not null
          and g.guessed_age is not null
      ),
      g1 as (
        select ((guessed_age - real_age) / nullif(max_err, 0))::numeric as delta_norm
        from g0
        where max_err > 0
      )
      select
        round(100 + coalesce(avg(delta_norm), 0) * 100, 1)
      into aw_score_norm_pct
      from g1;
    end if;

  else
    with g0 as (
      select
        g.guessed_age::numeric as guessed_age,
        i.real_age_years::numeric as real_age,
        greatest(i.real_age_years - MIN_AGE, MAX_AGE - i.real_age_years)::numeric as max_err
      from public.age_guesses g
      join public.images i on i.id = g.image_id
      where i.uploader_user_id = uid
        and (p_photo_category is null or i.photo_category = p_photo_category)
        and (p_include_experimental = true or i.include_in_global_aw = true)
        and i.real_age_years is not null
        and g.guessed_age is not null
    ),
    g1 as (
      select ((guessed_age - real_age) / nullif(max_err, 0))::numeric as delta_norm
      from g0
      where max_err > 0
    )
    select
      round(100 + coalesce(avg(delta_norm), 0) * 100, 1)
    into aw_score_norm_pct
    from g1;
  end if;

  result := json_build_object(
    'realAgeUser', real_age_user,

    -- FILTERED metrics (respect p_photo_category and p_include_experimental)
    'awAgeUser', aw_age_user,
    'awScoreNormPct', aw_score_norm_pct,

    -- Guesser reputation metric stays as in original
    'avgAccuracyPct', avg_accuracy_pct,

    -- counts
    'postsCount', posts_count,
    'albumsCount', albums_count,

    -- images counts (category-filtered)
    'imagesCount', images_count,
    'guessesReceivedCount', guesses_received_count,

    -- transparency fields (category-filtered)
    'imagesIncludedInGlobalCount', images_included_count,
    'imagesExcludedFromGlobalCount', images_excluded_count,
    'guessesReceivedIncludedCount', guesses_received_included_count,

    -- aggregates (category-filtered)
    'avgAwAgeImage', avg_aw_age_image,
    'avgAbsErrorYears', avg_abs_error_years,
    'maxGuessesOnSingleImage', max_guesses_on_single_image,

    -- aggregates (eligible only, category-filtered)
    'avgAwAgeImageIncluded', avg_aw_age_image_included,
    'avgAbsErrorYearsIncluded', avg_abs_error_years_included,
    'maxGuessesOnSingleImageIncluded', max_guesses_on_single_image_included,

    'guessesMadeCount', guesses_made_count
  );

  return result;
end;
$$;


--
-- TOC entry 604 (class 1255 OID 157225)
-- Name: get_my_unread_message_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_unread_message_count() RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 503 (class 1255 OID 168269)
-- Name: get_or_create_admin_support_thread(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_admin_support_thread(p_target_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 560 (class 1255 OID 157222)
-- Name: get_or_create_connected_message_thread(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_connected_message_thread(p_other_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_thread_id bigint;
  v_user_a uuid;
  v_user_b uuid;
begin
  if v_auth_user_id is null then
    raise exception 'Musíš být přihlášen/a.';
  end if;

  if p_other_user_id is null or p_other_user_id = v_auth_user_id then
    raise exception 'Neplatný kontakt pro chat.';
  end if;

  if not public.are_users_connected(v_auth_user_id, p_other_user_id) then
    raise exception 'Chat lze otevřít jen s uživatelem, se kterým jsi ve spojení.';
  end if;

  v_user_a := least(v_auth_user_id, p_other_user_id);
  v_user_b := greatest(v_auth_user_id, p_other_user_id);

  select mt.id
    into v_thread_id
  from public.message_threads mt
  where mt.thread_kind = 'connected_dm'
    and mt.connection_user_id_a = v_user_a
    and mt.connection_user_id_b = v_user_b
  limit 1;

  if v_thread_id is null then
    insert into public.message_threads (
      thread_kind,
      connection_user_id_a,
      connection_user_id_b
    )
    values (
      'connected_dm',
      v_user_a,
      v_user_b
    )
    returning id into v_thread_id;
  else
    update public.message_threads
    set updated_at = now()
    where id = v_thread_id;
  end if;

  perform public.ensure_message_thread_participants(v_thread_id, v_auth_user_id, p_other_user_id);

  return v_thread_id;
end;
$$;


--
-- TOC entry 563 (class 1255 OID 168264)
-- Name: get_or_create_moderator_outreach_thread(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_moderator_outreach_thread(p_target_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 537 (class 1255 OID 168262)
-- Name: get_staff_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_staff_role(p_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 616 (class 1255 OID 168163)
-- Name: handle_auth_user_registration_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_auth_user_registration_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth', 'pg_temp'
    AS $$
begin
  perform public.ensure_user_registration_order_for_user(new.id);
  return new;
end;
$$;


--
-- TOC entry 510 (class 1255 OID 42382)
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  dob_text text;
begin
  dob_text := new.raw_user_meta_data ->> 'date_of_birth';

  insert into public.user_profiles (
    user_id,
    display_name,
    date_of_birth,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'AgeWinners uživatel'),
    case
      when dob_text is null or dob_text = '' then null
      else (dob_text)::date
    end,
    now(),
    now()
  )
  on conflict (user_id) do update set
    display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
    -- IMPORTANT: do not overwrite DOB if already set
    date_of_birth = coalesce(public.user_profiles.date_of_birth, excluded.date_of_birth),
    updated_at = now();

  return new;
end;
$$;


--
-- TOC entry 509 (class 1255 OID 96473)
-- Name: has_super_powers(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_super_powers(p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and (up.super_user = true or up.role in ('super_user'::public.user_role, 'admin'::public.user_role))
  );
$$;


--
-- TOC entry 656 (class 1255 OID 96485)
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.role = 'admin'::public.user_role
  );
$$;


--
-- TOC entry 608 (class 1255 OID 96486)
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role = 'admin'
  );
$$;


--
-- TOC entry 615 (class 1255 OID 117749)
-- Name: is_admin_or_moderator(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_moderator(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role in ('admin', 'moderator')
  );
$$;


--
-- TOC entry 479 (class 1255 OID 117754)
-- Name: is_admin_or_moderator_current(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_or_moderator_current() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select public.is_admin_or_moderator(auth.uid());
$$;


--
-- TOC entry 635 (class 1255 OID 96472)
-- Name: is_moderator_or_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_moderator_or_admin(p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role in ('moderator'::public.user_role, 'admin'::public.user_role)
  );
$$;


--
-- TOC entry 468 (class 1255 OID 168390)
-- Name: is_privileged_viewer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_privileged_viewer(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and (coalesce(up.super_user, false) = true or up.role in ('moderator', 'admin'))
  );
$$;


--
-- TOC entry 482 (class 1255 OID 168261)
-- Name: is_staff_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff_user(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.role in ('admin', 'moderator')
  );
$$;


--
-- TOC entry 555 (class 1255 OID 158570)
-- Name: is_user_blocked_between(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_blocked_between(p_user_a uuid, p_user_b uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.blocked_users bu
    where (bu.blocker_user_id = p_user_a and bu.blocked_user_id = p_user_b)
       or (bu.blocker_user_id = p_user_b and bu.blocked_user_id = p_user_a)
  );
$$;


--
-- TOC entry 514 (class 1255 OID 168186)
-- Name: is_user_suspended(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_suspended(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.account_status = 'suspended'
  );
$$;


--
-- TOC entry 564 (class 1255 OID 168270)
-- Name: list_my_message_threads(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_my_message_threads() RETURNS TABLE(thread_id bigint, thread_kind text, other_user_id uuid, other_display_name text, other_avatar_url text, last_message_id bigint, last_message_body text, last_message_created_at timestamp with time zone, last_message_sender_user_id uuid, unread_count integer, can_reply boolean, thread_folder text, is_starred boolean, is_muted boolean, other_last_read_message_id bigint, other_last_read_at timestamp with time zone, other_last_seen_at timestamp with time zone, other_is_online boolean, is_blocked_by_me boolean, has_blocking boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 521 (class 1255 OID 157227)
-- Name: list_thread_messages(bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_thread_messages(p_thread_id bigint, p_limit integer DEFAULT 100) RETURNS TABLE(id bigint, thread_id bigint, sender_user_id uuid, body text, created_at timestamp with time zone, sender_display_name text, sender_avatar_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    m.id,
    m.thread_id,
    m.sender_user_id,
    m.body,
    m.created_at,
    up.display_name as sender_display_name,
    up.avatar_url as sender_avatar_url
  from public.messages m
  left join public.user_profiles up
    on up.user_id = m.sender_user_id
  where m.thread_id = p_thread_id
    and m.deleted_at is null
    and exists (
      select 1
      from public.message_thread_participants mtp
      where mtp.thread_id = p_thread_id
        and mtp.user_id = auth.uid()
    )
  order by m.created_at asc, m.id asc
  limit greatest(coalesce(p_limit, 100), 1);
$$;


--
-- TOC entry 531 (class 1255 OID 157224)
-- Name: mark_thread_read(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_thread_read(p_thread_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_auth_user_id uuid;
  v_last_message_id bigint;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.message_thread_participants mtp
    where mtp.thread_id = p_thread_id
      and mtp.user_id = v_auth_user_id
  ) then
    raise exception 'thread_not_found';
  end if;

  select max(m.id)
    into v_last_message_id
  from public.messages m
  where m.thread_id = p_thread_id
    and m.deleted_at is null;

  update public.message_thread_participants
  set
    last_read_message_id = v_last_message_id,
    last_read_at = now()
  where thread_id = p_thread_id
    and user_id = v_auth_user_id;
end;
$$;


--
-- TOC entry 661 (class 1255 OID 42484)
-- Name: prevent_dob_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_dob_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  -- Pokud už DOB existuje a někdo se ji snaží změnit -> zakázat
  if old.date_of_birth is not null and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'date_of_birth nelze po prvním nastavení měnit.';
  end if;

  return new;
end;
$$;


--
-- TOC entry 556 (class 1255 OID 50752)
-- Name: prevent_dob_change_unless_superuser(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_dob_change_unless_superuser() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- Only allow if RPC explicitly enabled override
  if coalesce(current_setting('app.superuser_dob_override', true), '') = '1' then
    return new;
  end if;

  -- If DOB already set, block any change
  if old.date_of_birth is not null
     and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'date_of_birth nelze po prvním nastavení měnit.';
  end if;

  return new;
end;
$$;


--
-- TOC entry 607 (class 1255 OID 50747)
-- Name: recompute_image_guess_aggregates(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recompute_image_guess_aggregates(p_image_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_count integer;
  v_avg_unweighted numeric(6,2);

  v_real_age integer;
  v_max_err numeric;

  v_wsum numeric;
  v_norm_sum numeric;
  v_aw_score_norm numeric;
  v_aw_age numeric(6,2);
begin
  /*
    Image aggregates:
    - avg_guessed_age: UNWEIGHTED average guessed age (informational)
    - aw_age_image: AW result computed via deltaNorm weighted by weight_at_guess snapshot

    Definitions:
    - MIN_AGE = 16, MAX_AGE = 116
    - maxErr(real) = max(real - 16, 116 - real)
    - deltaNorm = (guess - real) / maxErr(real)
    - aw_score_norm = sum(deltaNorm * w) / sum(w)
    - aw_age_image = clamp(real + aw_score_norm * maxErr(real), 16..116)
  */

  -- 0) real age (snapshot on image)
  select i.real_age_years
  into v_real_age
  from public.images i
  where i.id = p_image_id;

  if v_real_age is null then
    -- image missing => nothing to do
    return;
  end if;

  v_max_err := greatest((v_real_age - 16)::numeric, (116 - v_real_age)::numeric);

  -- 1) base aggregates: count + unweighted avg
  select
    count(*)::int,
    round(avg(g.guessed_age)::numeric, 2)
  into
    v_count,
    v_avg_unweighted
  from public.age_guesses g
  where g.image_id = p_image_id;

  -- 2) AW via deltaNorm (weighted by snapshot weight_at_guess)
  select
    coalesce(sum(coalesce(g.weight_at_guess, 0.8)), 0),
    coalesce(
      sum(
        (
          (least(greatest(g.guessed_age, 16), 116) - v_real_age)::numeric
          / nullif(v_max_err, 0)
        ) * coalesce(g.weight_at_guess, 0.8)
      ),
      0
    )
  into
    v_wsum,
    v_norm_sum
  from public.age_guesses g
  where g.image_id = p_image_id;

  if v_wsum > 0 and v_max_err > 0 then
    v_aw_score_norm := v_norm_sum / v_wsum; -- in [-1..+1] ideally
    v_aw_age := (v_real_age::numeric + (v_aw_score_norm * v_max_err));

    -- clamp AW age to [16..116]
    v_aw_age := least(116::numeric, greatest(16::numeric, v_aw_age));
  else
    v_aw_age := null;
  end if;

  -- 3) write back to images
  update public.images
  set
    guesses_count   = coalesce(v_count, 0),
    avg_guessed_age = v_avg_unweighted, -- informational (unweighted)
    aw_age_image    = v_aw_age,         -- AW result via deltaNorm + weights
    updated_at      = now()
  where id = p_image_id;
end;
$$;


--
-- TOC entry 671 (class 1255 OID 139275)
-- Name: record_my_daily_login(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_my_daily_login() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.user_daily_logins (
    user_id,
    login_day
  )
  values (
    auth.uid(),
    current_date
  )
  on conflict (user_id, login_day) do nothing;
end;
$$;


--
-- TOC entry 609 (class 1255 OID 61986)
-- Name: recount_post_images_count(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recount_post_images_count(_post_id bigint) RETURNS void
    LANGUAGE sql
    AS $$
  update public.posts p
  set images_count = (
    select count(*) from public.post_images pi where pi.post_id = _post_id
  )
  where p.id = _post_id;
$$;


--
-- TOC entry 517 (class 1255 OID 90834)
-- Name: report_image(bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.report_image(p_image_id bigint, p_reason text, p_details text DEFAULT NULL::text) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_uid uuid := auth.uid();
  v_report_id bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- prevent spam: max 1 open report per user per image
  if exists (
    select 1
    from public.image_reports r
    where r.image_id = p_image_id
      and r.reporter_user_id = v_uid
      and r.status = 'open'
  ) then
    raise exception 'Report already exists for this image.';
  end if;

  insert into public.image_reports(image_id, reporter_user_id, reason, details)
  values (p_image_id, v_uid, p_reason, p_details)
  returning id into v_report_id;

  return v_report_id;
end;
$$;


--
-- TOC entry 403 (class 1259 OID 35480)
-- Name: post_albums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_albums (
    post_id bigint NOT NULL,
    album_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.post_albums FORCE ROW LEVEL SECURITY;


--
-- TOC entry 507 (class 1255 OID 59712)
-- Name: repost_album(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.repost_album(p_album_id bigint, p_post_id bigint) RETURNS public.post_albums
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_owner uuid;
  v_post_owner uuid;
  v_sort int;
  v_row public.post_albums;
begin
  -- album owner
  select a.owner_user_id into v_owner
  from public.albums a
  where a.id = p_album_id;

  if v_owner is null then
    raise exception 'Album nebylo nalezeno.';
  end if;

  -- post owner (must match album owner)
  select p.author_user_id into v_post_owner
  from public.posts p
  where p.id = p_post_id;

  if v_post_owner is null then
    raise exception 'Post nebyl nalezen.';
  end if;

  if v_post_owner <> v_owner then
    raise exception 'Album může postovat pouze jeho vlastník.';
  end if;

  -- choose next sort_order (optional, but handy)
  select coalesce(max(pa.sort_order), -1) + 1
    into v_sort
  from public.post_albums pa
  where pa.album_id = p_album_id;

  insert into public.post_albums (post_id, album_id, sort_order, created_at)
  values (p_post_id, p_album_id, v_sort, now())
  returning * into v_row;

  return v_row;
end;
$$;


--
-- TOC entry 645 (class 1255 OID 82765)
-- Name: reveal_my_guesses(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reveal_my_guesses() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user uuid;
  v_count integer;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.age_guesses
  set is_anonymous = false
  where guesser_user_id = v_user
    and is_anonymous = true;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


--
-- TOC entry 498 (class 1255 OID 168265)
-- Name: send_admin_contact_message(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_admin_contact_message(p_body text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 631 (class 1255 OID 157223)
-- Name: send_thread_message(bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_thread_message(p_thread_id bigint, p_body text) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

  if v_thread.thread_kind <> 'connected_dm' then
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

  if not public.are_users_connected(v_auth_user_id, v_other_user_id) then
    raise exception 'not_connected';
  end if;

  insert into public.messages (thread_id, sender_user_id, body)
  values (p_thread_id, v_auth_user_id, left(v_body, 4000))
  returning id into v_message_id;

  return v_message_id;
end;
$$;


--
-- TOC entry 626 (class 1255 OID 168266)
-- Name: send_thread_message(bigint, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_thread_message(p_thread_id bigint, p_body text, p_reply_to_message_id bigint DEFAULT NULL::bigint) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 513 (class 1255 OID 63174)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 620 (class 1255 OID 83961)
-- Name: submit_age_guess(bigint, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_age_guess(p_image_id bigint, p_guessed_age integer, p_is_anonymous boolean DEFAULT NULL::boolean) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id uuid;

  v_guess_age integer;
  v_real_age integer;
  v_max_err numeric;

  v_super boolean;

  v_aw_guesses_count integer;
  v_aw_accuracy_sum numeric;

  v_prior_count numeric := 5;
  v_prior_accuracy numeric := 60;

  v_avg_acc numeric;
  v_weight_at_guess numeric;

  v_error_years numeric;
  v_aw_accuracy numeric;

  v_is_anonymous boolean;

  v_new_guess_id bigint;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Musíš být přihlášen.';
  end if;

  if p_image_id is null or p_image_id <= 0 then
    raise exception 'Neplatné image_id.';
  end if;

  -- Clamp guessed age 16..116
  v_guess_age := greatest(16, least(116, coalesce(p_guessed_age, 0)));

  -- load image real age
  select i.real_age_years
  into v_real_age
  from public.images i
  where i.id = p_image_id;

  if v_real_age is null then
    raise exception 'Fotka nenalezena.';
  end if;

  v_max_err := greatest((v_real_age - 16)::numeric, (116 - v_real_age)::numeric);
  if v_max_err <= 0 then
    raise exception 'Neplatný real_age_years (maxErr <= 0).';
  end if;

  -- read user aggregates (self-heal not needed, defaults ok)
  select
    coalesce(up.super_user, false),
    coalesce(up.aw_guesses_count, 0),
    coalesce(up.aw_accuracy_sum, 0),
    coalesce(up.anonymous_guesses_default, false)
  into
    v_super,
    v_aw_guesses_count,
    v_aw_accuracy_sum,
    v_is_anonymous
  from public.user_profiles up
  where up.user_id = v_user_id;

  -- if caller passes explicit p_is_anonymous, it overrides default
  if p_is_anonymous is not null then
    v_is_anonymous := p_is_anonymous;
  end if;

  -- Bayes weight BEFORE counting this guess (spec)
  v_avg_acc :=
    (v_prior_count * v_prior_accuracy + v_aw_accuracy_sum)
    / nullif((v_prior_count + v_aw_guesses_count), 0);

  v_weight_at_guess := v_avg_acc / 100;
  v_weight_at_guess := least(1::numeric, greatest(0::numeric, v_weight_at_guess));

  -- Accuracy of THIS guess (0..100) (spec)
  v_error_years := abs(v_guess_age - v_real_age);
  v_aw_accuracy := 100 * (1 - (v_error_years / v_max_err));
  v_aw_accuracy := least(100::numeric, greatest(0::numeric, v_aw_accuracy));

  -- insert guess (your enforce_single_guess_unless_super trigger will still apply)
  insert into public.age_guesses (
    image_id,
    guesser_user_id,
    guessed_age,
    created_at,
    weight_at_guess,
    is_anonymous
  )
  values (
    p_image_id,
    v_user_id,
    v_guess_age,
    now(),
    v_weight_at_guess,
    v_is_anonymous
  )
  returning id into v_new_guess_id;

  -- update user aggregates AFTER insert (spec)
  update public.user_profiles
  set
    aw_guesses_count = coalesce(aw_guesses_count, 0) + 1,
    aw_accuracy_sum  = coalesce(aw_accuracy_sum, 0) + v_aw_accuracy,
    updated_at       = now()
  where user_id = v_user_id;

  -- recompute image aggregates
  perform public.recompute_image_guess_aggregates(p_image_id);

  return v_new_guess_id;
end;
$$;


--
-- TOC entry 603 (class 1255 OID 107698)
-- Name: submit_album_guess(bigint, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_album_guess(p_album_id bigint, p_guessed_age integer, p_is_anonymous boolean DEFAULT NULL::boolean) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_user_id uuid;
  v_super boolean;

  v_count integer;
  v_distinct_years integer;

  r record;

  v_inserted integer := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Musíš být přihlášen.';
  end if;

  if p_album_id is null or p_album_id <= 0 then
    raise exception 'Neplatné album_id.';
  end if;

  -- zjistit superuser
  select coalesce(up.super_user, false)
    into v_super
  from public.user_profiles up
  where up.user_id = v_user_id;

  -- 1) počet fotek v albu (2..6)
  select count(*)
    into v_count
  from public.album_images ai
  where ai.album_id = p_album_id;

  if v_count < 2 then
    raise exception 'Album musí mít alespoň 2 fotky.';
  end if;

  if v_count > 6 then
    raise exception 'Album může mít maximálně 6 fotek.';
  end if;

  -- 2) stejný kalendářní rok pro všechny fotky v albu
  select count(distinct extract(year from i.taken_at))
    into v_distinct_years
  from public.album_images ai
  join public.images i on i.id = ai.image_id
  where ai.album_id = p_album_id;

  if v_distinct_years <> 1 then
    raise exception 'Fotky v albu musí být ze stejného kalendářního roku.';
  end if;

  -- 3) non-superuser: nesmí už mít tip na žádnou fotku v albu (aby se to nedělo napůl)
  if not v_super then
    if exists (
      select 1
      from public.album_images ai
      join public.age_guesses g
        on g.image_id = ai.image_id
       and g.guesser_user_id = v_user_id
      where ai.album_id = p_album_id
      limit 1
    ) then
      raise exception 'Toto album už máš odtipované (alespoň jednu fotku).';
    end if;
  end if;

  -- 4) vložit tip na všechny fotky (přes existující logiku)
  for r in
    select ai.image_id
    from public.album_images ai
    where ai.album_id = p_album_id
    order by ai.sort_order asc, ai.image_id asc
  loop
    perform public.submit_age_guess(
      r.image_id,
      p_guessed_age,
      p_is_anonymous
    );

    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;


--
-- TOC entry 638 (class 1255 OID 97613)
-- Name: submit_image_report(bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_image_report(p_image_id bigint, p_reason text, p_details text DEFAULT NULL::text) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_report_id bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Reason is required';
  end if;

  insert into public.image_reports (image_id, reporter_user_id, reason, details, status)
  values (p_image_id, v_user_id, trim(p_reason), nullif(trim(p_details), ''), 'open')
  returning id into v_report_id;

  return v_report_id;
end;
$$;


--
-- TOC entry 529 (class 1255 OID 168263)
-- Name: sync_staff_thread_participants(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_staff_thread_participants(p_thread_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 533 (class 1255 OID 81649)
-- Name: tg_age_guesses_recompute_image(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_age_guesses_recompute_image() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (tg_op = 'INSERT') then
    perform public.recompute_image_guess_aggregates(new.image_id);
    return new;

  elsif (tg_op = 'UPDATE') then
    -- If image_id changed, recompute both
    if (old.image_id is distinct from new.image_id) then
      perform public.recompute_image_guess_aggregates(old.image_id);
    end if;

    perform public.recompute_image_guess_aggregates(new.image_id);
    return new;

  elsif (tg_op = 'DELETE') then
    perform public.recompute_image_guess_aggregates(old.image_id);
    return old;
  end if;

  return null;
end;
$$;


--
-- TOC entry 585 (class 1255 OID 157402)
-- Name: toggle_message_reaction(bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.toggle_message_reaction(p_message_id bigint, p_emoji text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_emoji text := nullif(trim(coalesce(p_emoji, '')), '');
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_emoji is null then
    raise exception 'empty_emoji';
  end if;

  if exists (
    select 1
    from public.message_reactions mr
    where mr.message_id = p_message_id
      and mr.user_id = v_auth_user_id
      and mr.emoji = v_emoji
  ) then
    delete from public.message_reactions
    where message_id = p_message_id
      and user_id = v_auth_user_id
      and emoji = v_emoji;
  else
    insert into public.message_reactions (message_id, user_id, emoji)
    values (p_message_id, v_auth_user_id, v_emoji);
  end if;
end;
$$;


--
-- TOC entry 639 (class 1255 OID 157216)
-- Name: touch_message_thread_from_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_message_thread_from_message() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  update public.message_threads
  set
    updated_at = now(),
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 160)
  where id = new.thread_id;

  return new;
end;
$$;


--
-- TOC entry 476 (class 1255 OID 158571)
-- Name: touch_my_presence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_my_presence() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_presence (user_id, last_seen_at)
  values (v_auth_user_id, now())
  on conflict (user_id) do update
    set last_seen_at = excluded.last_seen_at;
end;
$$;


--
-- TOC entry 632 (class 1255 OID 50748)
-- Name: trg_age_guesses_recompute(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_age_guesses_recompute() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if (tg_op = 'INSERT') then
    perform public.recompute_image_guess_aggregates(new.image_id);
  elsif (tg_op = 'DELETE') then
    perform public.recompute_image_guess_aggregates(old.image_id);
  end if;

  return null;
end;
$$;


--
-- TOC entry 477 (class 1255 OID 61987)
-- Name: trg_post_images_recount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_post_images_recount() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (tg_op = 'INSERT') then
    perform public.recount_post_images_count(new.post_id);
    return new;
  elsif (tg_op = 'DELETE') then
    perform public.recount_post_images_count(old.post_id);
    return old;
  else
    perform public.recount_post_images_count(old.post_id);
    perform public.recount_post_images_count(new.post_id);
    return new;
  end if;
end;
$$;


--
-- TOC entry 500 (class 1255 OID 59678)
-- Name: trg_recompute_image_guess_aggregates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_recompute_image_guess_aggregates() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  -- On INSERT/UPDATE: use NEW.image_id
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    perform public.recompute_image_guess_aggregates(new.image_id);
    return new;
  end if;

  -- On DELETE: use OLD.image_id
  if (tg_op = 'DELETE') then
    perform public.recompute_image_guess_aggregates(old.image_id);
    return old;
  end if;

  return null;
end;
$$;


--
-- TOC entry 579 (class 1255 OID 98723)
-- Name: update_my_date_of_birth_super_user(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_my_date_of_birth_super_user(p_date_of_birth date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_is_super boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select up.super_user
    into v_is_super
  from public.user_profiles up
  where up.user_id = v_user_id;

  if coalesce(v_is_super, false) = false then
    raise exception 'Forbidden: super_user only';
  end if;

  -- ✅ THIS IS THE CORRECT PLACE
  perform set_config('app.superuser_dob_override', '1', true);

  if p_date_of_birth is null then
    raise exception 'date_of_birth cannot be null';
  end if;

  if p_date_of_birth > current_date then
    raise exception 'date_of_birth cannot be in the future';
  end if;

  update public.user_profiles
     set date_of_birth = p_date_of_birth,
         updated_at = now()
   where user_id = v_user_id;

end;
$$;


--
-- TOC entry 668 (class 1255 OID 157221)
-- Name: upgrade_request_message_thread_to_connected(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upgrade_request_message_thread_to_connected(p_request_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_request record;
  v_thread_id bigint;
  v_user_a uuid;
  v_user_b uuid;
begin
  select id, requester_id, target_id, status
    into v_request
  from public.connection_requests
  where id = p_request_id;

  if not found then
    raise exception 'request_not_found';
  end if;

  v_user_a := least(v_request.requester_id, v_request.target_id);
  v_user_b := greatest(v_request.requester_id, v_request.target_id);

  select id
    into v_thread_id
  from public.message_threads
  where connection_request_id = p_request_id
  limit 1;

  if v_thread_id is null then
    insert into public.message_threads (
      thread_kind,
      connection_request_id,
      connection_user_id_a,
      connection_user_id_b
    )
    values (
      'connected_dm',
      p_request_id,
      v_user_a,
      v_user_b
    )
    on conflict (connection_user_id_a, connection_user_id_b)
      where thread_kind = 'connected_dm'
    do update
      set updated_at = now()
    returning id into v_thread_id;
  else
    update public.message_threads
    set
      thread_kind = 'connected_dm',
      connection_user_id_a = v_user_a,
      connection_user_id_b = v_user_b,
      updated_at = now()
    where id = v_thread_id;
  end if;

  perform public.ensure_message_thread_participants(v_thread_id, v_request.requester_id, v_request.target_id);

  return v_thread_id;
end;
$$;


--
-- TOC entry 524 (class 1255 OID 167958)
-- Name: wellbeing_daily_entries_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wellbeing_daily_entries_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 540 (class 1255 OID 168030)
-- Name: wellbeing_plan_entries_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wellbeing_plan_entries_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 405 (class 1259 OID 35563)
-- Name: age_guesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.age_guesses (
    id bigint NOT NULL,
    image_id bigint NOT NULL,
    guesser_user_id uuid DEFAULT auth.uid() NOT NULL,
    guessed_age integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    weight_at_guess numeric DEFAULT 0.8,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT age_guesses_weight_check CHECK (((weight_at_guess >= (0)::numeric) AND (weight_at_guess <= (1)::numeric)))
);

ALTER TABLE ONLY public.age_guesses FORCE ROW LEVEL SECURITY;


--
-- TOC entry 404 (class 1259 OID 35562)
-- Name: age_guesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.age_guesses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4961 (class 0 OID 0)
-- Dependencies: 404
-- Name: age_guesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.age_guesses_id_seq OWNED BY public.age_guesses.id;


--
-- TOC entry 399 (class 1259 OID 35326)
-- Name: album_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.album_images (
    album_id bigint NOT NULL,
    image_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 397 (class 1259 OID 35288)
-- Name: albums_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.albums_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4962 (class 0 OID 0)
-- Dependencies: 397
-- Name: albums_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.albums_id_seq OWNED BY public.albums.id;


--
-- TOC entry 441 (class 1259 OID 164245)
-- Name: app_runtime_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_runtime_settings (
    setting_key text NOT NULL,
    int_value integer,
    text_value text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- TOC entry 454 (class 1259 OID 166785)
-- Name: article_ai_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_ai_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    summary_cs text NOT NULL,
    category text NOT NULL,
    geography text NOT NULL,
    keywords_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    topic_label text NOT NULL,
    confidence_note text,
    model_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    geography_path_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT article_ai_results_category_check CHECK ((category = ANY (ARRAY['Politika'::text, 'Ekonomika'::text, 'Sport'::text, 'Technologie'::text, 'Svět'::text])))
);


--
-- TOC entry 453 (class 1259 OID 166769)
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    url text NOT NULL,
    title text NOT NULL,
    published_at timestamp with time zone,
    raw_excerpt text,
    raw_content text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 451 (class 1259 OID 166725)
-- Name: aw_challenge_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aw_challenge_images (
    challenge_id uuid NOT NULL,
    image_id bigint NOT NULL,
    source text NOT NULL,
    locked_in_at timestamp with time zone DEFAULT now() NOT NULL,
    was_experimental_at_lock boolean DEFAULT false NOT NULL,
    CONSTRAINT aw_challenge_images_source_check CHECK ((source = ANY (ARRAY['auto_period'::text, 'challenge_tag'::text, 'reference'::text])))
);


--
-- TOC entry 450 (class 1259 OID 165585)
-- Name: aw_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aw_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    title text NOT NULL,
    public_message text,
    private_goal text,
    private_goal_visibility text DEFAULT 'private'::text NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    target_date_original date NOT NULL,
    target_date_current date NOT NULL,
    baseline_aw_score_norm_pct numeric,
    target_aw_score_norm_pct numeric NOT NULL,
    photo_scope text NOT NULL,
    challenge_tag text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    extended_at timestamp with time zone,
    private_goal_published_at timestamp with time zone,
    include_experimental_images boolean DEFAULT false NOT NULL,
    CONSTRAINT aw_challenges_dates_check CHECK (((target_date_original >= start_date) AND (target_date_current >= target_date_original))),
    CONSTRAINT aw_challenges_photo_scope_check CHECK ((photo_scope = ANY (ARRAY['auto_period'::text, 'challenge_tag'::text]))),
    CONSTRAINT aw_challenges_private_goal_visibility_check CHECK ((private_goal_visibility = ANY (ARRAY['private'::text, 'everyone'::text]))),
    CONSTRAINT aw_challenges_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text, 'missed'::text, 'extended'::text, 'cancelled'::text, 'archived'::text]))),
    CONSTRAINT aw_challenges_tag_required_check CHECK ((((photo_scope = 'challenge_tag'::text) AND (challenge_tag IS NOT NULL) AND (char_length(TRIM(BOTH FROM challenge_tag)) > 0)) OR (photo_scope <> 'challenge_tag'::text))),
    CONSTRAINT aw_challenges_title_len CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 120))),
    CONSTRAINT aw_challenges_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'contacts'::text, 'everyone'::text])))
);


--
-- TOC entry 440 (class 1259 OID 164213)
-- Name: aw_user_stats_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aw_user_stats_history (
    user_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    aw_age numeric,
    aw_score_norm_pct numeric,
    avg_accuracy_pct numeric,
    power_score numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 434 (class 1259 OID 158533)
-- Name: blocked_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_users (
    blocker_user_id uuid NOT NULL,
    blocked_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text,
    CONSTRAINT blocked_users_not_self CHECK ((blocker_user_id <> blocked_user_id))
);


--
-- TOC entry 444 (class 1259 OID 164303)
-- Name: comment_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_reports (
    id bigint NOT NULL,
    comment_id bigint NOT NULL,
    reporter_user_id uuid DEFAULT auth.uid() NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'open'::text NOT NULL,
    admin_note text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT comment_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- TOC entry 443 (class 1259 OID 164302)
-- Name: comment_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.comment_reports ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.comment_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 423 (class 1259 OID 150364)
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id bigint NOT NULL,
    author_user_id uuid NOT NULL,
    post_id bigint NOT NULL,
    image_id bigint,
    parent_comment_id bigint,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL,
    is_hidden_by_moderation boolean DEFAULT false NOT NULL,
    target_type text NOT NULL,
    author_snapshot_display_name text,
    author_snapshot_avatar_url text,
    hidden_by_suspension boolean DEFAULT false NOT NULL,
    story_id bigint,
    CONSTRAINT comments_check CHECK ((((target_type = 'post'::text) AND (image_id IS NULL)) OR ((target_type = 'image'::text) AND (image_id IS NOT NULL)))),
    CONSTRAINT comments_target_consistency_check CHECK ((((target_type = 'post'::text) AND (post_id IS NOT NULL) AND (image_id IS NULL) AND (story_id IS NULL)) OR ((target_type = 'image'::text) AND (post_id IS NOT NULL) AND (image_id IS NOT NULL) AND (story_id IS NULL)) OR ((target_type = 'story'::text) AND (story_id IS NOT NULL) AND (image_id IS NULL)))),
    CONSTRAINT comments_target_type_check CHECK ((target_type = ANY (ARRAY['post'::text, 'image'::text, 'story'::text])))
);


--
-- TOC entry 422 (class 1259 OID 150363)
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.comments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 411 (class 1259 OID 63271)
-- Name: connection_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    target_id uuid NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    CONSTRAINT connection_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text])))
);


--
-- TOC entry 409 (class 1259 OID 63125)
-- Name: connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id_a uuid NOT NULL,
    user_id_b uuid NOT NULL,
    requested_by uuid NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connections_no_self CHECK ((user_id_a <> user_id_b)),
    CONSTRAINT connections_pair_check CHECK ((user_id_a <> user_id_b)),
    CONSTRAINT connections_sorted CHECK ((user_id_a < user_id_b)),
    CONSTRAINT connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'blocked'::text])))
);


--
-- TOC entry 410 (class 1259 OID 63156)
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_not_self CHECK ((follower_id <> following_id))
);


--
-- TOC entry 439 (class 1259 OID 164173)
-- Name: hidden_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hidden_images (
    user_id uuid NOT NULL,
    image_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 436 (class 1259 OID 158581)
-- Name: hidden_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hidden_posts (
    user_id uuid NOT NULL,
    post_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 442 (class 1259 OID 164271)
-- Name: image_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_likes (
    image_id bigint NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reaction text DEFAULT 'like'::text NOT NULL,
    CONSTRAINT image_likes_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'clap'::text, 'care'::text, 'love'::text, 'insight'::text, 'fun'::text])))
);


--
-- TOC entry 415 (class 1259 OID 90805)
-- Name: image_moderation_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_moderation_events (
    id bigint NOT NULL,
    image_id bigint,
    uploader_user_id uuid NOT NULL,
    event_type text NOT NULL,
    report_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    moderator_user_id uuid NOT NULL,
    reason text,
    note text
);


--
-- TOC entry 414 (class 1259 OID 90804)
-- Name: image_moderation_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_moderation_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4963 (class 0 OID 0)
-- Dependencies: 414
-- Name: image_moderation_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_moderation_events_id_seq OWNED BY public.image_moderation_events.id;


--
-- TOC entry 413 (class 1259 OID 90775)
-- Name: image_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_reports (
    id bigint NOT NULL,
    image_id bigint NOT NULL,
    reporter_user_id uuid DEFAULT auth.uid() NOT NULL,
    reason text NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    admin_note text,
    penalty_coef numeric,
    CONSTRAINT image_reports_penalty_coef_range CHECK (((penalty_coef IS NULL) OR ((penalty_coef >= 0.0) AND (penalty_coef <= 1.0))))
);


--
-- TOC entry 412 (class 1259 OID 90774)
-- Name: image_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4964 (class 0 OID 0)
-- Dependencies: 412
-- Name: image_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_reports_id_seq OWNED BY public.image_reports.id;


--
-- TOC entry 416 (class 1259 OID 118864)
-- Name: image_reports_latest_open; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.image_reports_latest_open AS
 SELECT DISTINCT ON (image_id) image_id,
    id AS report_id,
    created_at AS reported_at,
    reason,
    details,
    reporter_user_id
   FROM public.image_reports r
  WHERE (status = 'open'::text)
  ORDER BY image_id, created_at DESC;


--
-- TOC entry 449 (class 1259 OID 165566)
-- Name: image_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_tags (
    image_id bigint NOT NULL,
    tag text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT image_tags_tag_length CHECK ((char_length(tag) <= 40)),
    CONSTRAINT image_tags_tag_not_blank CHECK ((length(TRIM(BOTH FROM tag)) > 0))
);


--
-- TOC entry 396 (class 1259 OID 35205)
-- Name: images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.images (
    id bigint NOT NULL,
    uploader_user_id uuid DEFAULT auth.uid() NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    taken_at date NOT NULL,
    real_age_years integer NOT NULL,
    visibility public.content_visibility DEFAULT 'everyone'::public.content_visibility NOT NULL,
    age_reveal_mode public.age_reveal_mode DEFAULT 'delayed'::public.age_reveal_mode NOT NULL,
    age_reveal_delay_days integer DEFAULT 3 NOT NULL,
    guesses_count integer DEFAULT 0 NOT NULL,
    avg_guessed_age numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    aw_age_image numeric,
    aw_context public.aw_image_context DEFAULT 'full_body'::public.aw_image_context NOT NULL,
    include_in_global_aw boolean DEFAULT true NOT NULL,
    photo_category public.photo_category DEFAULT 'bezna'::public.photo_category NOT NULL,
    comment character varying(50),
    storage_path_thumb text,
    public_url_thumb text,
    verified_at timestamp with time zone,
    verified_by uuid,
    storage_path_medium text,
    public_url_medium text,
    hidden_by_suspension boolean DEFAULT false NOT NULL,
    hidden_by_admin boolean DEFAULT false NOT NULL,
    hidden_by_admin_at timestamp with time zone,
    hidden_by_admin_by uuid,
    CONSTRAINT images_comment_len_chk CHECK (((comment IS NULL) OR (char_length((comment)::text) <= 50))),
    CONSTRAINT images_real_age_min_16_chk CHECK ((real_age_years >= 16)),
    CONSTRAINT images_real_age_years_positive_check CHECK ((real_age_years > 0))
);


--
-- TOC entry 395 (class 1259 OID 35204)
-- Name: images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4965 (class 0 OID 0)
-- Dependencies: 395
-- Name: images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.images_id_seq OWNED BY public.images.id;


--
-- TOC entry 433 (class 1259 OID 157379)
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    message_id bigint NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_emoji_check CHECK (((char_length(TRIM(BOTH FROM emoji)) >= 1) AND (char_length(TRIM(BOTH FROM emoji)) <= 16)))
);


--
-- TOC entry 428 (class 1259 OID 157172)
-- Name: message_thread_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_thread_participants (
    thread_id bigint NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_read_message_id bigint,
    last_read_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    thread_folder text DEFAULT 'inbox'::text NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    CONSTRAINT message_thread_participants_thread_folder_check CHECK ((thread_folder = ANY (ARRAY['inbox'::text, 'blocked'::text])))
);


--
-- TOC entry 432 (class 1259 OID 157349)
-- Name: message_thread_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_thread_reports (
    id bigint NOT NULL,
    thread_id bigint NOT NULL,
    reporter_user_id uuid DEFAULT auth.uid() NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'open'::text NOT NULL,
    admin_note text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_thread_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- TOC entry 431 (class 1259 OID 157348)
-- Name: message_thread_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.message_thread_reports ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.message_thread_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 427 (class 1259 OID 157144)
-- Name: message_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_threads (
    id bigint NOT NULL,
    thread_kind text NOT NULL,
    connection_request_id uuid,
    connection_user_id_a uuid,
    connection_user_id_b uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone,
    last_message_preview text,
    subject_user_id uuid,
    created_by_user_id uuid,
    CONSTRAINT message_threads_thread_kind_check CHECK ((thread_kind = ANY (ARRAY['connected_dm'::text, 'connection_request_dm'::text, 'connection_decline_dm'::text, 'admin_contact'::text, 'admin_support'::text, 'moderator_outreach'::text])))
);


--
-- TOC entry 426 (class 1259 OID 157143)
-- Name: message_threads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.message_threads ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.message_threads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 430 (class 1259 OID 157192)
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    thread_id bigint NOT NULL,
    sender_user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    reply_to_message_id bigint,
    CONSTRAINT messages_body_check CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 4000)))
);


--
-- TOC entry 429 (class 1259 OID 157191)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.messages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 425 (class 1259 OID 157118)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    actor_user_id uuid,
    type text NOT NULL,
    entity_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_bigint_id bigint,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['connection_request_received'::text, 'connection_request_accepted'::text, 'connection_request_declined'::text, 'connection_removed'::text, 'follow_started'::text, 'follow_stopped'::text, 'photo_commented'::text])))
);


--
-- TOC entry 424 (class 1259 OID 157117)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 402 (class 1259 OID 35442)
-- Name: post_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_images (
    post_id bigint NOT NULL,
    image_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    "position" integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.post_images FORCE ROW LEVEL SECURITY;


--
-- TOC entry 438 (class 1259 OID 158599)
-- Name: post_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_reports (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    reporter_user_id uuid DEFAULT auth.uid() NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'open'::text NOT NULL,
    admin_note text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- TOC entry 437 (class 1259 OID 158598)
-- Name: post_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.post_reports ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 462 (class 1259 OID 168276)
-- Name: post_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_stories (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    author_user_id uuid NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    hidden_by_moderation boolean DEFAULT false NOT NULL,
    hidden_by_moderation_at timestamp with time zone,
    hidden_by_moderation_by uuid,
    hidden_by_suspension boolean DEFAULT false NOT NULL,
    CONSTRAINT post_stories_body_length_check CHECK ((char_length(body) <= 3000))
);


--
-- TOC entry 461 (class 1259 OID 168275)
-- Name: post_stories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.post_stories ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_stories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 464 (class 1259 OID 168306)
-- Name: post_story_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_story_images (
    id bigint NOT NULL,
    story_id bigint NOT NULL,
    uploader_user_id uuid NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    storage_path_medium text,
    public_url_medium text,
    storage_path_thumb text,
    public_url_thumb text,
    sort_order integer DEFAULT 0 NOT NULL,
    alt_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    hidden_by_moderation boolean DEFAULT false NOT NULL,
    hidden_by_suspension boolean DEFAULT false NOT NULL,
    CONSTRAINT post_story_images_alt_length_check CHECK (((alt_text IS NULL) OR (char_length(alt_text) <= 200)))
);


--
-- TOC entry 463 (class 1259 OID 168305)
-- Name: post_story_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.post_story_images ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_story_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 465 (class 1259 OID 168328)
-- Name: post_story_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_story_likes (
    story_id bigint NOT NULL,
    user_id uuid NOT NULL,
    reaction text DEFAULT 'like'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_story_likes_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'clap'::text, 'care'::text, 'love'::text, 'insight'::text, 'fun'::text])))
);


--
-- TOC entry 467 (class 1259 OID 168349)
-- Name: post_story_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_story_reports (
    id bigint NOT NULL,
    story_id bigint NOT NULL,
    reporter_user_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    admin_note text,
    CONSTRAINT post_story_reports_details_length_check CHECK (((details IS NULL) OR (char_length(details) <= 1000))),
    CONSTRAINT post_story_reports_reason_length_check CHECK (((char_length(reason) >= 2) AND (char_length(reason) <= 80))),
    CONSTRAINT post_story_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- TOC entry 466 (class 1259 OID 168348)
-- Name: post_story_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.post_story_reports ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.post_story_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 407 (class 1259 OID 35665)
-- Name: post_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_views (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    viewer_user_id uuid,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.post_views FORCE ROW LEVEL SECURITY;


--
-- TOC entry 406 (class 1259 OID 35664)
-- Name: post_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_views_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 406
-- Name: post_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_views_id_seq OWNED BY public.post_views.id;


--
-- TOC entry 401 (class 1259 OID 35405)
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id bigint NOT NULL,
    author_user_id uuid NOT NULL,
    text text NOT NULL,
    subtitle text,
    time_label text,
    visibility public.content_visibility DEFAULT 'everyone'::public.content_visibility NOT NULL,
    views_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pending_album boolean DEFAULT false NOT NULL,
    pending_album_title text,
    images_count integer DEFAULT 0 NOT NULL,
    albums_count integer DEFAULT 0 NOT NULL,
    cover_image_id bigint,
    title text,
    body text,
    album_id bigint,
    hidden_by_suspension boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.posts FORCE ROW LEVEL SECURITY;


--
-- TOC entry 400 (class 1259 OID 35404)
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 400
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- TOC entry 457 (class 1259 OID 167963)
-- Name: profile_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_visits (
    id bigint NOT NULL,
    viewed_user_id uuid NOT NULL,
    viewer_user_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profile_visits_no_self_visit_check CHECK ((viewed_user_id <> viewer_user_id))
);


--
-- TOC entry 456 (class 1259 OID 167962)
-- Name: profile_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.profile_visits ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.profile_visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 452 (class 1259 OID 166757)
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    base_url text NOT NULL,
    rss_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 393 (class 1259 OID 26811)
-- Name: user_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_contacts (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    contact_user_id uuid NOT NULL,
    status public.contact_status DEFAULT 'pending'::public.contact_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.user_contacts FORCE ROW LEVEL SECURITY;


--
-- TOC entry 392 (class 1259 OID 26810)
-- Name: user_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4968 (class 0 OID 0)
-- Dependencies: 392
-- Name: user_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_contacts_id_seq OWNED BY public.user_contacts.id;


--
-- TOC entry 419 (class 1259 OID 139263)
-- Name: user_daily_logins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_logins (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    login_day date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 418 (class 1259 OID 139262)
-- Name: user_daily_logins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_logins ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_daily_logins_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 435 (class 1259 OID 158553)
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    user_id uuid NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 394 (class 1259 OID 35140)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    user_id uuid NOT NULL,
    display_name text DEFAULT 'AgeWinners uživatel'::text NOT NULL,
    avatar_url text,
    bio text,
    date_of_birth date,
    gender text,
    city text,
    country text,
    default_post_visibility public.content_visibility DEFAULT 'everyone'::public.content_visibility NOT NULL,
    default_album_visibility public.content_visibility DEFAULT 'everyone'::public.content_visibility NOT NULL,
    default_image_visibility public.content_visibility DEFAULT 'everyone'::public.content_visibility NOT NULL,
    default_age_reveal_mode public.age_reveal_mode DEFAULT 'delayed'::public.age_reveal_mode NOT NULL,
    default_age_reveal_delay_days integer DEFAULT 3 NOT NULL,
    profile_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    super_user boolean DEFAULT false NOT NULL,
    allow_connection_requests boolean DEFAULT true NOT NULL,
    allow_following boolean DEFAULT true NOT NULL,
    allow_connections boolean DEFAULT true NOT NULL,
    bio_contacts text,
    bio_contacts_hidden boolean DEFAULT false NOT NULL,
    occupation text,
    occupation_hidden boolean DEFAULT false NOT NULL,
    is_student boolean DEFAULT false NOT NULL,
    is_student_hidden boolean DEFAULT false NOT NULL,
    education_level text,
    education_level_hidden boolean DEFAULT false NOT NULL,
    native_languages text[],
    native_languages_hidden boolean DEFAULT false NOT NULL,
    other_languages text[],
    other_languages_hidden boolean DEFAULT false NOT NULL,
    relationship_status text,
    relationship_status_hidden boolean DEFAULT false NOT NULL,
    motivation_text text,
    motivation_text_hidden boolean DEFAULT false NOT NULL,
    height_cm integer,
    height_cm_hidden boolean DEFAULT false NOT NULL,
    weight_kg integer,
    weight_kg_hidden boolean DEFAULT false NOT NULL,
    about_me text,
    about_me_hidden boolean DEFAULT false NOT NULL,
    primary_interests text[],
    primary_interests_hidden boolean DEFAULT false NOT NULL,
    interests text[],
    interests_custom text[],
    interests_hidden boolean DEFAULT false NOT NULL,
    life_goals text[],
    life_goals_custom text[],
    life_goals_hidden boolean DEFAULT false NOT NULL,
    self_view text,
    self_view_hidden boolean DEFAULT false NOT NULL,
    improvement_areas text[],
    improvement_areas_custom text[],
    improvement_areas_hidden boolean DEFAULT false NOT NULL,
    activities text[],
    activities_custom text[],
    activities_hidden boolean DEFAULT false NOT NULL,
    diet_preference text,
    diet_preference_hidden boolean DEFAULT false NOT NULL,
    alcohol_use text,
    alcohol_use_hidden boolean DEFAULT false NOT NULL,
    smoking text,
    smoking_hidden boolean DEFAULT false NOT NULL,
    drug_light boolean,
    drug_hard boolean,
    drugs_hidden boolean DEFAULT false NOT NULL,
    mindset text,
    mindset_hidden boolean DEFAULT false NOT NULL,
    life_pace text,
    life_pace_hidden boolean DEFAULT false NOT NULL,
    anonymous_guesses_default boolean DEFAULT false NOT NULL,
    aw_guesses_count integer DEFAULT 0 NOT NULL,
    aw_accuracy_sum numeric DEFAULT 0 NOT NULL,
    allow_age_visible boolean DEFAULT true NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    age_reveal_mode public.age_reveal_mode DEFAULT 'never'::public.age_reveal_mode NOT NULL,
    age_reveal_delay_days integer DEFAULT 0 NOT NULL,
    comments_visibility text DEFAULT 'everyone'::text NOT NULL,
    personalization_ads_consent boolean DEFAULT false NOT NULL,
    personalization_ads_consent_at timestamp with time zone,
    notify_connection_requests boolean DEFAULT true NOT NULL,
    notify_connection_declined boolean DEFAULT true NOT NULL,
    notify_contact_removed boolean DEFAULT true NOT NULL,
    notify_follow_started boolean DEFAULT true NOT NULL,
    notify_follow_stopped boolean DEFAULT true NOT NULL,
    notify_photo_commented boolean DEFAULT true NOT NULL,
    wellbeing_mood_public_default boolean DEFAULT false NOT NULL,
    wellbeing_energy_public_default boolean DEFAULT false NOT NULL,
    wellbeing_sleep_public_default boolean DEFAULT false NOT NULL,
    wellbeing_movement_public_default boolean DEFAULT false NOT NULL,
    wellbeing_water_public_default boolean DEFAULT false NOT NULL,
    wellbeing_food_public_default boolean DEFAULT false NOT NULL,
    wellbeing_mood_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    wellbeing_energy_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    wellbeing_sleep_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    wellbeing_movement_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    wellbeing_water_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    wellbeing_food_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    wellbeing_daily_entry_visibility_default text DEFAULT 'everyone'::text NOT NULL,
    registration_number bigint,
    account_status text DEFAULT 'active'::text NOT NULL,
    suspended_at timestamp with time zone,
    suspended_by uuid,
    suspension_reason text,
    CONSTRAINT user_profiles_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text]))),
    CONSTRAINT user_profiles_activities_max5 CHECK (((activities IS NULL) OR (COALESCE(array_length(activities, 1), 0) <= 5))),
    CONSTRAINT user_profiles_comments_visibility_check CHECK ((comments_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_improvement_areas_max3 CHECK (((improvement_areas IS NULL) OR (COALESCE(array_length(improvement_areas, 1), 0) <= 3))),
    CONSTRAINT user_profiles_interests_max5 CHECK (((interests IS NULL) OR (COALESCE(array_length(interests, 1), 0) <= 5))),
    CONSTRAINT user_profiles_life_goals_max5 CHECK (((life_goals IS NULL) OR (COALESCE(array_length(life_goals, 1), 0) <= 5))),
    CONSTRAINT user_profiles_primary_interests_max3 CHECK (((primary_interests IS NULL) OR (COALESCE(array_length(primary_interests, 1), 0) <= 3))),
    CONSTRAINT user_profiles_wellbeing_daily_entry_visibility_default_check CHECK ((wellbeing_daily_entry_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_wellbeing_energy_visibility_default_check CHECK ((wellbeing_energy_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_wellbeing_food_visibility_default_check CHECK ((wellbeing_food_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_wellbeing_mood_visibility_default_check CHECK ((wellbeing_mood_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_wellbeing_movement_visibility_default_check CHECK ((wellbeing_movement_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_wellbeing_sleep_visibility_default_check CHECK ((wellbeing_sleep_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT user_profiles_wellbeing_water_visibility_default_check CHECK ((wellbeing_water_visibility_default = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text])))
);


--
-- TOC entry 459 (class 1259 OID 168146)
-- Name: user_registration_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_registration_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 460 (class 1259 OID 168147)
-- Name: user_registration_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_registration_orders (
    user_id uuid NOT NULL,
    registration_number bigint DEFAULT nextval('public.user_registration_number_seq'::regclass) NOT NULL,
    auth_created_at timestamp with time zone NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 455 (class 1259 OID 167930)
-- Name: wellbeing_daily_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellbeing_daily_entries (
    user_id uuid NOT NULL,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    mood text,
    mood_score smallint,
    energy_score smallint,
    sleep_hours numeric(4,1),
    movement_minutes integer,
    water_glasses smallint,
    self_care_done boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    water_liters numeric(3,1),
    food_amount text,
    food_type text,
    mood_public boolean DEFAULT false NOT NULL,
    energy_public boolean DEFAULT false NOT NULL,
    sleep_public boolean DEFAULT false NOT NULL,
    movement_public boolean DEFAULT false NOT NULL,
    water_public boolean DEFAULT false NOT NULL,
    food_public boolean DEFAULT false NOT NULL,
    mood_visibility text DEFAULT 'everyone'::text NOT NULL,
    energy_visibility text DEFAULT 'everyone'::text NOT NULL,
    sleep_visibility text DEFAULT 'everyone'::text NOT NULL,
    movement_visibility text DEFAULT 'everyone'::text NOT NULL,
    water_visibility text DEFAULT 'everyone'::text NOT NULL,
    food_visibility text DEFAULT 'everyone'::text NOT NULL,
    entry_visibility text DEFAULT 'everyone'::text NOT NULL,
    CONSTRAINT wellbeing_daily_entries_energy_score_check CHECK (((energy_score IS NULL) OR ((energy_score >= 1) AND (energy_score <= 10)))),
    CONSTRAINT wellbeing_daily_entries_energy_visibility_check CHECK ((energy_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT wellbeing_daily_entries_entry_visibility_check CHECK ((entry_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT wellbeing_daily_entries_food_amount_check CHECK (((food_amount IS NULL) OR (food_amount = ANY (ARRAY['malo'::text, 'bezne'::text, 'moc'::text, 'bez_jidla'::text])))),
    CONSTRAINT wellbeing_daily_entries_food_none_type_check CHECK (((food_amount IS DISTINCT FROM 'bez_jidla'::text) OR (food_type IS NULL))),
    CONSTRAINT wellbeing_daily_entries_food_type_check CHECK (((food_type IS NULL) OR (food_type = ANY (ARRAY['dietni'::text, 'vegan'::text, 'vegetarian'::text, 'vyvazena'::text, 'bezna'::text, 'sladke'::text, 'maso'::text, 'nezdrava'::text])))),
    CONSTRAINT wellbeing_daily_entries_food_visibility_check CHECK ((food_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT wellbeing_daily_entries_mood_check CHECK (((mood IS NULL) OR (mood = ANY (ARRAY['lehka'::text, 'klid'::text, 'radost'::text, 'unava'::text, 'napeti'::text])))),
    CONSTRAINT wellbeing_daily_entries_mood_score_check CHECK (((mood_score IS NULL) OR ((mood_score >= 1) AND (mood_score <= 10)))),
    CONSTRAINT wellbeing_daily_entries_mood_visibility_check CHECK ((mood_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT wellbeing_daily_entries_movement_minutes_check CHECK (((movement_minutes IS NULL) OR ((movement_minutes >= 0) AND (movement_minutes <= 1440)))),
    CONSTRAINT wellbeing_daily_entries_movement_visibility_check CHECK ((movement_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT wellbeing_daily_entries_note_length_check CHECK (((note IS NULL) OR (char_length(note) <= 1000))),
    CONSTRAINT wellbeing_daily_entries_sleep_hours_check CHECK (((sleep_hours IS NULL) OR ((sleep_hours >= (0)::numeric) AND (sleep_hours <= (24)::numeric)))),
    CONSTRAINT wellbeing_daily_entries_sleep_visibility_check CHECK ((sleep_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text]))),
    CONSTRAINT wellbeing_daily_entries_water_glasses_check CHECK (((water_glasses >= 0) AND (water_glasses <= 30))),
    CONSTRAINT wellbeing_daily_entries_water_liters_check CHECK (((water_liters IS NULL) OR (((water_liters >= 0.5) AND (water_liters <= (5)::numeric)) AND ((water_liters * (2)::numeric) = floor((water_liters * (2)::numeric)))))),
    CONSTRAINT wellbeing_daily_entries_water_visibility_check CHECK ((water_visibility = ANY (ARRAY['everyone'::text, 'contacts'::text, 'private'::text])))
);


--
-- TOC entry 458 (class 1259 OID 168005)
-- Name: wellbeing_plan_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellbeing_plan_entries (
    user_id uuid NOT NULL,
    plan_date date NOT NULL,
    sleep_hours numeric(4,1),
    movement_minutes integer,
    water_liters numeric(3,1),
    food_amount text,
    food_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wellbeing_plan_entries_food_amount_check CHECK (((food_amount IS NULL) OR (food_amount = ANY (ARRAY['malo'::text, 'bezne'::text, 'moc'::text, 'bez_jidla'::text])))),
    CONSTRAINT wellbeing_plan_entries_food_none_type_check CHECK (((food_amount IS DISTINCT FROM 'bez_jidla'::text) OR (food_type IS NULL))),
    CONSTRAINT wellbeing_plan_entries_food_type_check CHECK (((food_type IS NULL) OR (food_type = ANY (ARRAY['dietni'::text, 'vegan'::text, 'vegetarian'::text, 'vyvazena'::text, 'bezna'::text, 'sladke'::text, 'maso'::text, 'nezdrava'::text])))),
    CONSTRAINT wellbeing_plan_entries_movement_minutes_check CHECK (((movement_minutes IS NULL) OR ((movement_minutes >= 0) AND (movement_minutes <= 1440)))),
    CONSTRAINT wellbeing_plan_entries_sleep_hours_check CHECK (((sleep_hours IS NULL) OR ((sleep_hours >= (0)::numeric) AND (sleep_hours <= (24)::numeric)))),
    CONSTRAINT wellbeing_plan_entries_water_liters_check CHECK (((water_liters IS NULL) OR (((water_liters >= 0.5) AND (water_liters <= (5)::numeric)) AND ((water_liters * (2)::numeric) = floor((water_liters * (2)::numeric))))))
);


--
-- TOC entry 4056 (class 2604 OID 35566)
-- Name: age_guesses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.age_guesses ALTER COLUMN id SET DEFAULT nextval('public.age_guesses_id_seq'::regclass);


--
-- TOC entry 4038 (class 2604 OID 35292)
-- Name: albums id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.albums ALTER COLUMN id SET DEFAULT nextval('public.albums_id_seq'::regclass);


--
-- TOC entry 4073 (class 2604 OID 90808)
-- Name: image_moderation_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_moderation_events ALTER COLUMN id SET DEFAULT nextval('public.image_moderation_events_id_seq'::regclass);


--
-- TOC entry 4069 (class 2604 OID 90778)
-- Name: image_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_reports ALTER COLUMN id SET DEFAULT nextval('public.image_reports_id_seq'::regclass);


--
-- TOC entry 4025 (class 2604 OID 35208)
-- Name: images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images ALTER COLUMN id SET DEFAULT nextval('public.images_id_seq'::regclass);


--
-- TOC entry 4061 (class 2604 OID 35668)
-- Name: post_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views ALTER COLUMN id SET DEFAULT nextval('public.post_views_id_seq'::regclass);


--
-- TOC entry 4043 (class 2604 OID 35408)
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- TOC entry 3957 (class 2604 OID 26814)
-- Name: user_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contacts ALTER COLUMN id SET DEFAULT nextval('public.user_contacts_id_seq'::regclass);


--
-- TOC entry 4901 (class 0 OID 35563)
-- Dependencies: 405
-- Data for Name: age_guesses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.age_guesses (id, image_id, guesser_user_id, guessed_age, created_at, weight_at_guess, is_anonymous) FROM stdin;
416	160	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	17	2026-04-08 07:29:17.05705+00	0.74800390981220188950	f
417	158	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	25	2026-04-08 07:29:25.653612+00	0.75228867895084572621	f
418	166	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	33	2026-04-08 07:33:11.683303+00	0.83336074636429211595	f
419	167	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	25	2026-04-08 07:33:24.250723+00	0.83607029253419542072	f
420	191	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	23	2026-04-08 07:33:35.992431+00	0.83700432029117523054	f
421	170	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	61	2026-04-08 07:33:44.875857+00	0.83976695893030785375	f
422	171	f769233e-5132-4313-8ff6-5505b86791ed	43	2026-04-08 07:37:02.943206+00	0.83428387298096451061	f
423	167	f769233e-5132-4313-8ff6-5505b86791ed	28	2026-04-08 07:37:09.476539+00	0.83172863681725496788	f
424	143	f769233e-5132-4313-8ff6-5505b86791ed	24	2026-04-08 07:37:16.123338+00	0.83379604184932948873	f
425	195	f769233e-5132-4313-8ff6-5505b86791ed	31	2026-04-08 07:37:27.351992+00	0.83602964755900506626	f
426	169	f769233e-5132-4313-8ff6-5505b86791ed	42	2026-04-08 07:37:36.31723+00	0.83920344850617695684	f
427	173	f769233e-5132-4313-8ff6-5505b86791ed	55	2026-04-08 07:37:48.271072+00	0.83639836559717155528	f
428	141	f769233e-5132-4313-8ff6-5505b86791ed	28	2026-04-08 07:37:54.898207+00	0.83826688951329829962	f
429	170	f769233e-5132-4313-8ff6-5505b86791ed	58	2026-04-08 07:51:06.447379+00	0.83943732665369381115	f
430	183	f769233e-5132-4313-8ff6-5505b86791ed	35	2026-04-08 07:51:21.663327+00	0.84218768845556272234	f
431	198	f769233e-5132-4313-8ff6-5505b86791ed	24	2026-04-08 07:51:33.805467+00	0.84449142479198067636	f
432	185	f769233e-5132-4313-8ff6-5505b86791ed	41	2026-04-08 07:51:50.690958+00	0.84716771301825860849	f
433	159	f769233e-5132-4313-8ff6-5505b86791ed	27	2026-04-08 07:53:08.154365+00	0.84746714302949688172	f
434	160	f769233e-5132-4313-8ff6-5505b86791ed	19	2026-04-08 07:54:43.010098+00	0.84871818999675365684	f
435	175	f769233e-5132-4313-8ff6-5505b86791ed	49	2026-04-08 07:54:52.132619+00	0.85137225683891587339	f
436	162	f769233e-5132-4313-8ff6-5505b86791ed	32	2026-04-08 07:55:04.651028+00	0.85091000074701683988	f
437	178	f769233e-5132-4313-8ff6-5505b86791ed	31	2026-04-08 07:55:18.225486+00	0.85116541397915721495	f
438	166	f769233e-5132-4313-8ff6-5505b86791ed	30	2026-04-08 08:14:31.693901+00	0.85344757771442522962	f
439	181	f769233e-5132-4313-8ff6-5505b86791ed	34	2026-04-08 08:14:37.552203+00	0.85505039631246943817	f
440	142	f769233e-5132-4313-8ff6-5505b86791ed	20	2026-04-08 08:14:45.436243+00	0.85700426856856632128	f
441	186	f769233e-5132-4313-8ff6-5505b86791ed	43	2026-04-08 08:16:55.535618+00	0.85895010298390167931	f
442	157	f769233e-5132-4313-8ff6-5505b86791ed	32	2026-04-08 08:52:18.154098+00	0.85949681065508124588	f
443	165	f769233e-5132-4313-8ff6-5505b86791ed	32	2026-04-08 08:52:30.274906+00	0.85959654251336151854	f
444	176	f769233e-5132-4313-8ff6-5505b86791ed	54	2026-04-08 08:54:31.889668+00	0.86135431847675848001	f
445	193	f769233e-5132-4313-8ff6-5505b86791ed	27	2026-04-08 08:54:37.606913+00	0.86211441374955889023	f
446	190	f769233e-5132-4313-8ff6-5505b86791ed	61	2026-04-08 08:54:43.837819+00	0.86350963189018049416	f
447	192	f769233e-5132-4313-8ff6-5505b86791ed	27	2026-04-08 08:55:16.533129+00	0.86522895399529174993	f
448	191	f769233e-5132-4313-8ff6-5505b86791ed	21	2026-04-08 08:55:25.825393+00	0.86699191699016420546	f
449	164	f769233e-5132-4313-8ff6-5505b86791ed	32	2026-04-08 08:56:02.797896+00	0.86856237764742828677	f
450	172	a8efc3b0-538d-4293-9af6-7d535991faea	56	2026-04-08 09:06:24.174541+00	0.85997614306652453522	t
451	157	a8efc3b0-538d-4293-9af6-7d535991faea	32	2026-04-08 09:16:34.14152+00	0.86085889334921248516	t
452	161	a8efc3b0-538d-4293-9af6-7d535991faea	30	2026-04-08 09:16:42.501982+00	0.86091009823015335000	t
453	176	a8efc3b0-538d-4293-9af6-7d535991faea	59	2026-04-08 09:16:49.948887+00	0.86116443327880856334	t
454	162	a8efc3b0-538d-4293-9af6-7d535991faea	32	2026-04-08 09:16:59.618307+00	0.86252556628587906762	t
455	159	a8efc3b0-538d-4293-9af6-7d535991faea	25	2026-04-08 09:17:05.555644+00	0.86255909847187343559	t
456	164	a8efc3b0-538d-4293-9af6-7d535991faea	32	2026-04-08 09:17:12.581717+00	0.86328587954326799118	t
457	177	a8efc3b0-538d-4293-9af6-7d535991faea	24	2026-04-08 09:17:20.030279+00	0.86435563074854697198	t
458	193	a5b9777a-748c-4dbf-8c94-ea42abff4636	21	2026-04-08 12:33:19.169009+00	0.75245442529027117660	f
459	144	a5b9777a-748c-4dbf-8c94-ea42abff4636	19	2026-04-08 12:33:23.763078+00	0.75736834264604602012	f
460	183	a5b9777a-748c-4dbf-8c94-ea42abff4636	31	2026-04-08 12:33:28.679639+00	0.76231361021458433754	f
461	187	a5b9777a-748c-4dbf-8c94-ea42abff4636	47	2026-04-08 12:33:35.690365+00	0.76701739412876462416	f
462	184	a5b9777a-748c-4dbf-8c94-ea42abff4636	52	2026-04-08 12:33:40.593527+00	0.76703453185791520034	f
463	185	a5b9777a-748c-4dbf-8c94-ea42abff4636	36	2026-04-08 12:33:46.045921+00	0.77108778061469629027	f
464	200	a5b9777a-748c-4dbf-8c94-ea42abff4636	26	2026-04-08 12:33:52.633681+00	0.77141701605124710573	f
465	191	a5b9777a-748c-4dbf-8c94-ea42abff4636	21	2026-04-08 12:33:56.735859+00	0.77559676660687351187	f
466	196	a5b9777a-748c-4dbf-8c94-ea42abff4636	23	2026-04-08 18:35:02.164794+00	0.77942502806062899237	f
467	141	a5b9777a-748c-4dbf-8c94-ea42abff4636	23	2026-04-08 18:35:08.526261+00	0.78330846151844343132	f
468	197	a5b9777a-748c-4dbf-8c94-ea42abff4636	25	2026-04-08 18:35:14.760679+00	0.78632066388786690882	f
469	179	a5b9777a-748c-4dbf-8c94-ea42abff4636	19	2026-04-08 18:35:19.851988+00	0.79013636631844071402	f
470	147	a5b9777a-748c-4dbf-8c94-ea42abff4636	27	2026-04-08 18:35:28.919662+00	0.79110306331703114427	f
471	190	a5b9777a-748c-4dbf-8c94-ea42abff4636	61	2026-04-08 18:35:35.092671+00	0.79312134266167064952	f
472	194	a5b9777a-748c-4dbf-8c94-ea42abff4636	30	2026-04-08 18:35:41.24526+00	0.79632509714440262399	f
473	198	a5b9777a-748c-4dbf-8c94-ea42abff4636	26	2026-04-08 18:35:54.024878+00	0.79971967885866258025	f
474	143	a5b9777a-748c-4dbf-8c94-ea42abff4636	21	2026-04-08 18:35:59.869848+00	0.80282281509066793158	f
475	181	a5b9777a-748c-4dbf-8c94-ea42abff4636	34	2026-04-08 18:36:05.859439+00	0.80550934638117394585	f
476	186	a5b9777a-748c-4dbf-8c94-ea42abff4636	44	2026-04-08 18:36:11.152264+00	0.80821857066386128306	f
477	145	a5b9777a-748c-4dbf-8c94-ea42abff4636	36	2026-04-08 18:36:16.188536+00	0.80979470095178390506	f
478	192	a5b9777a-748c-4dbf-8c94-ea42abff4636	28	2026-04-08 18:36:21.829825+00	0.80989519063886792034	f
479	201	a5b9777a-748c-4dbf-8c94-ea42abff4636	21	2026-04-08 18:36:27.040182+00	0.81277556653827901245	f
480	177	a5b9777a-748c-4dbf-8c94-ea42abff4636	34	2026-04-09 09:48:07.774103+00	0.81541448843074250978	f
481	178	a5b9777a-748c-4dbf-8c94-ea42abff4636	39	2026-04-09 09:48:36.971286+00	0.81777884119191506391	f
482	142	a5b9777a-748c-4dbf-8c94-ea42abff4636	24	2026-04-09 09:48:45.53699+00	0.81921199808285349293	f
483	195	a5b9777a-748c-4dbf-8c94-ea42abff4636	25	2026-04-09 09:49:06.318239+00	0.82092004825601389493	f
484	146	a5b9777a-748c-4dbf-8c94-ea42abff4636	19	2026-04-09 09:49:12.548135+00	0.82262343440897537626	f
485	182	a5b9777a-748c-4dbf-8c94-ea42abff4636	38	2026-04-09 09:49:17.94873+00	0.82494527446395275908	f
486	199	a5b9777a-748c-4dbf-8c94-ea42abff4636	25	2026-04-09 09:49:25.504992+00	0.82636481082158941404	f
487	180	a5b9777a-748c-4dbf-8c94-ea42abff4636	24	2026-04-09 09:49:35.702572+00	0.82840755783599550911	f
488	189	a5b9777a-748c-4dbf-8c94-ea42abff4636	56	2026-04-09 09:49:46.848333+00	0.82942561579500763248	f
489	188	a5b9777a-748c-4dbf-8c94-ea42abff4636	58	2026-04-09 09:49:57.006396+00	0.83073016596311843431	f
490	171	a8efc3b0-538d-4293-9af6-7d535991faea	46	2026-04-09 09:53:41.417939+00	0.86473682201282393226	t
491	163	a8efc3b0-538d-4293-9af6-7d535991faea	34	2026-04-09 09:53:48.343692+00	0.86386946689645551709	t
492	186	a8efc3b0-538d-4293-9af6-7d535991faea	46	2026-04-09 09:54:04.864235+00	0.86512993479556241045	t
493	168	a8efc3b0-538d-4293-9af6-7d535991faea	29	2026-04-09 09:54:12.072118+00	0.86581125593866678645	t
494	182	a8efc3b0-538d-4293-9af6-7d535991faea	28	2026-04-09 09:54:24.528261+00	0.86635775293855096044	t
495	188	a8efc3b0-538d-4293-9af6-7d535991faea	61	2026-04-09 09:54:33.125858+00	0.86713273671731133360	t
496	181	a8efc3b0-538d-4293-9af6-7d535991faea	28	2026-04-09 09:54:40.209382+00	0.86815961279253942118	t
497	184	a8efc3b0-538d-4293-9af6-7d535991faea	56	2026-04-09 09:54:48.199333+00	0.86890493438181741198	t
498	166	a8efc3b0-538d-4293-9af6-7d535991faea	30	2026-04-09 09:54:55.924363+00	0.86925744293189716355	t
499	160	a8efc3b0-538d-4293-9af6-7d535991faea	19	2026-04-09 09:55:00.595028+00	0.86997015657766433561	t
500	179	a8efc3b0-538d-4293-9af6-7d535991faea	20	2026-04-09 09:55:04.700193+00	0.87109110350371895341	t
501	178	a8efc3b0-538d-4293-9af6-7d535991faea	33	2026-04-09 09:55:14.889771+00	0.87097188772285688665	t
502	158	a8efc3b0-538d-4293-9af6-7d535991faea	30	2026-04-09 09:55:20.063898+00	0.87196445848872452401	t
503	185	a8efc3b0-538d-4293-9af6-7d535991faea	46	2026-04-09 09:55:24.795887+00	0.87208742890599851874	t
504	201	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	21	2026-04-09 10:12:35.011999+00	0.75566787260441048058	f
505	176	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	62	2026-04-09 10:12:43.952729+00	0.75984493440314124581	f
506	193	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	22	2026-04-09 10:12:48.419995+00	0.76313482013383405867	f
507	165	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	27	2026-04-09 10:12:52.7239+00	0.76703331136993962644	f
508	172	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	49	2026-04-09 10:12:58.189225+00	0.76953502043725358895	f
509	162	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	32	2026-04-09 10:13:02.816963+00	0.77045212682177889463	f
510	174	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	48	2026-04-09 10:13:09.160874+00	0.77201814738934479749	f
511	198	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	25	2026-04-09 10:13:16.059914+00	0.77258265378402712532	f
512	191	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	22	2026-04-09 10:30:51.79571+00	0.77619245293031240905	f
513	200	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	28	2026-04-09 10:46:24.877953+00	0.77952143510058810561	f
514	197	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	23	2026-04-09 10:46:30.069871+00	0.78274055217509936898	f
515	157	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	32	2026-04-09 10:46:33.65668+00	0.78569936165762783342	f
516	168	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	33	2026-04-09 10:46:48.691739+00	0.78689757090816023843	f
517	170	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	60	2026-04-09 10:46:52.99439+00	0.78966832195326536201	f
518	194	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	30	2026-04-09 10:46:59.139774+00	0.79246234830685393927	f
519	192	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	25	2026-04-09 10:47:18.872579+00	0.79542717190247031157	f
520	199	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	23	2026-04-09 10:47:21.734897+00	0.79782832569129595379	f
521	195	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	32	2026-04-09 10:47:29.704631+00	0.80001204588690685580	f
522	196	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	21	2026-04-09 11:02:18.549396+00	0.80243303410827130474	f
523	167	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	25	2026-04-09 11:02:24.117498+00	0.80466219992231934233	f
524	164	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	32	2026-04-09 11:02:28.64859+00	0.80580328928920874297	f
525	161	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	28	2026-04-09 11:02:38.16369+00	0.80803758490510811445	f
526	169	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	49	2026-04-09 11:02:46.441228+00	0.80932562269653996783	f
527	173	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	48	2026-04-09 11:02:55.543097+00	0.80952095321977371094	f
528	171	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	48	2026-04-09 11:03:01.315428+00	0.80948926449369618451	f
529	159	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	30	2026-04-09 12:05:38.75461+00	0.80945836798577059623	f
530	163	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	41	2026-04-09 12:05:47.523127+00	0.81041070835809848883	f
531	166	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	36	2026-04-09 12:05:51.623431+00	0.81168172589448098793	f
532	175	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	52	2026-04-09 12:05:56.992072+00	0.81365676240295183116	f
533	180	a8efc3b0-538d-4293-9af6-7d535991faea	28	2026-04-10 08:31:20.480661+00	0.87264831649339802604	t
534	174	a8efc3b0-538d-4293-9af6-7d535991faea	48	2026-04-10 08:31:26.614858+00	0.87330726389742740087	t
535	169	a8efc3b0-538d-4293-9af6-7d535991faea	49	2026-04-10 08:31:33.033028+00	0.87276390553646200515	t
536	187	a8efc3b0-538d-4293-9af6-7d535991faea	55	2026-04-10 08:31:38.297491+00	0.87237201527607428096	t
537	189	a8efc3b0-538d-4293-9af6-7d535991faea	64	2026-04-10 08:31:45.232315+00	0.87268122713444695381	t
538	173	a8efc3b0-538d-4293-9af6-7d535991faea	55	2026-04-10 08:31:49.23411+00	0.87312834874594280675	t
539	190	a8efc3b0-538d-4293-9af6-7d535991faea	71	2026-04-10 08:31:54.072731+00	0.87357831868766952076	t
540	175	a8efc3b0-538d-4293-9af6-7d535991faea	44	2026-04-10 08:32:01.026922+00	0.87302708333242352903	t
541	165	a8efc3b0-538d-4293-9af6-7d535991faea	30	2026-04-10 08:32:06.723442+00	0.87196313819125739126	t
542	183	a8efc3b0-538d-4293-9af6-7d535991faea	30	2026-04-10 08:32:14.352817+00	0.87257752868741138010	t
543	208	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	39	2026-04-10 08:42:16.891659+00	0.81441314597501359925	f
544	203	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	38	2026-04-10 08:42:23.225186+00	0.81595187931003761331	f
545	205	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	39	2026-04-10 08:42:28.233232+00	0.81809197373666508292	f
546	204	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	41	2026-04-10 08:42:33.637134+00	0.81987635718030494787	f
547	207	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	41	2026-04-10 08:42:38.299371+00	0.82162805737173300557	f
548	206	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	38	2026-04-10 08:42:43.604119+00	0.82332440211728687514	f
549	172	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	41	2026-04-10 16:45:00.337327+00	0.84185271429316529595	f
550	206	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	39	2026-04-10 16:56:10.02348+00	0.83926841612960175788	f
551	193	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	23	2026-04-10 16:56:17.348765+00	0.84143075350385549297	f
552	168	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	35	2026-04-10 16:57:00.55215+00	0.84394772567046096133	f
553	198	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	22	2026-04-10 16:57:08.203826+00	0.84638604245686000881	f
554	143	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	21	2026-04-10 16:57:13.780396+00	0.84824214898880011688	f
555	169	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	49	2026-04-10 16:57:24.027638+00	0.85007768847536436990	f
556	146	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	26	2026-04-10 16:57:29.801528+00	0.84969684840123612452	f
557	188	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	62	2026-04-10 16:57:45.254008+00	0.85070670867384699784	f
558	160	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	18	2026-04-10 16:57:51.499113+00	0.85235278121894652375	f
559	170	a8efc3b0-538d-4293-9af6-7d535991faea	51	2026-04-12 06:44:51.254544+00	0.87337455136051187864	t
560	141	a8efc3b0-538d-4293-9af6-7d535991faea	27	2026-04-12 06:44:57.337824+00	0.87326977709674474632	t
561	167	a8efc3b0-538d-4293-9af6-7d535991faea	30	2026-04-12 06:45:13.935059+00	0.87353412170439154709	t
562	144	e0554f1c-b98d-4031-86f3-0965ed1f45e0	19	2026-04-13 07:32:36.572928+00	0.60000000000000000000	f
563	163	e0554f1c-b98d-4031-86f3-0965ed1f45e0	32	2026-04-13 07:32:42.391647+00	0.66496598639455782313	f
564	199	e0554f1c-b98d-4031-86f3-0965ed1f45e0	24	2026-04-13 07:32:48.339479+00	0.70934366778070113063	f
565	143	e0554f1c-b98d-4031-86f3-0965ed1f45e0	25	2026-04-13 07:32:52.307582+00	0.74146222616204607357	f
566	171	e0554f1c-b98d-4031-86f3-0965ed1f45e0	49	2026-04-13 07:32:58.065056+00	0.76225213754086635111	f
567	188	e0554f1c-b98d-4031-86f3-0965ed1f45e0	63	2026-04-13 07:33:02.908683+00	0.76848306413765690898	f
568	200	e0554f1c-b98d-4031-86f3-0965ed1f45e0	28	2026-04-13 07:33:14.171811+00	0.78465992843683095622	f
569	142	e0554f1c-b98d-4031-86f3-0965ed1f45e0	28	2026-04-13 07:33:23.865619+00	0.80166860481241339526	f
570	169	e0554f1c-b98d-4031-86f3-0965ed1f45e0	47	2026-04-13 07:33:30.465828+00	0.80907557241711001007	f
571	181	e0554f1c-b98d-4031-86f3-0965ed1f45e0	35	2026-04-13 07:33:35.009017+00	0.80767543754521117476	f
572	164	e0554f1c-b98d-4031-86f3-0965ed1f45e0	31	2026-04-13 07:33:39.675639+00	0.81811612266124471549	f
573	193	e0554f1c-b98d-4031-86f3-0965ed1f45e0	23	2026-04-13 07:33:43.014813+00	0.82719727962906326224	f
574	189	e0554f1c-b98d-4031-86f3-0965ed1f45e0	63	2026-04-13 07:33:48.801856+00	0.83736214553323601152	f
575	162	e0554f1c-b98d-4031-86f3-0965ed1f45e0	26	2026-04-13 07:33:57.737824+00	0.84342139141631020135	f
576	182	e0554f1c-b98d-4031-86f3-0965ed1f45e0	34	2026-04-13 07:34:05.430888+00	0.84786421563368291457	f
577	146	e0554f1c-b98d-4031-86f3-0965ed1f45e0	20	2026-04-13 07:34:12.958654+00	0.85428052866152257837	f
578	192	e0554f1c-b98d-4031-86f3-0965ed1f45e0	26	2026-04-13 07:34:18.550803+00	0.86024773380786406881	f
579	195	e0554f1c-b98d-4031-86f3-0965ed1f45e0	30	2026-04-13 07:34:28.968862+00	0.86556705169263057808	f
580	205	e0554f1c-b98d-4031-86f3-0965ed1f45e0	36	2026-04-13 07:34:34.149415+00	0.87141196248860316164	f
581	207	e0554f1c-b98d-4031-86f3-0965ed1f45e0	42	2026-04-13 07:34:38.725222+00	0.87399201960713358546	f
582	197	e0554f1c-b98d-4031-86f3-0965ed1f45e0	23	2026-04-13 07:34:42.918394+00	0.87848439361736878999	f
583	194	e0554f1c-b98d-4031-86f3-0965ed1f45e0	29	2026-04-13 08:02:50.01157+00	0.88231276224831529891	f
584	161	e0554f1c-b98d-4031-86f3-0965ed1f45e0	25	2026-04-13 08:02:55.742571+00	0.88624088561035013280	f
587	170	e0554f1c-b98d-4031-86f3-0965ed1f45e0	45	2026-04-13 08:03:13.847128+00	0.88809458004915574293	f
588	157	e0554f1c-b98d-4031-86f3-0965ed1f45e0	32	2026-04-13 08:03:21.420906+00	0.88348393814788418979	f
590	185	e0554f1c-b98d-4031-86f3-0965ed1f45e0	41	2026-04-13 08:03:55.747593+00	0.88290045292439801576	f
591	196	e0554f1c-b98d-4031-86f3-0965ed1f45e0	25	2026-04-13 08:03:59.181566+00	0.88227903068930013256	f
593	216	a8efc3b0-538d-4293-9af6-7d535991faea	21	2026-04-13 08:37:13.987182+00	0.87411822238477297870	t
594	218	a8efc3b0-538d-4293-9af6-7d535991faea	41	2026-04-13 08:37:25.848541+00	0.87490376880950578537	t
595	214	a8efc3b0-538d-4293-9af6-7d535991faea	20	2026-04-13 08:37:34.007962+00	0.87562746489036890842	t
596	213	a8efc3b0-538d-4293-9af6-7d535991faea	19	2026-04-13 08:37:53.003857+00	0.87646616530771534686	t
597	212	a8efc3b0-538d-4293-9af6-7d535991faea	21	2026-04-13 08:38:03.660537+00	0.87736787213028676769	t
598	215	a8efc3b0-538d-4293-9af6-7d535991faea	16	2026-04-13 08:38:35.428513+00	0.87810710090687142207	t
599	210	a8efc3b0-538d-4293-9af6-7d535991faea	23	2026-04-15 11:04:45.258835+00	0.87876152582803388384	t
601	229	f769233e-5132-4313-8ff6-5505b86791ed	40	2026-04-16 20:46:51.287366+00	0.87004914679256901855	f
602	218	f769233e-5132-4313-8ff6-5505b86791ed	47	2026-04-16 20:46:56.632261+00	0.87114436395979410049	f
603	214	f769233e-5132-4313-8ff6-5505b86791ed	16	2026-04-16 20:47:02.564463+00	0.87214518984482465041	f
604	213	f769233e-5132-4313-8ff6-5505b86791ed	17	2026-04-16 20:47:08.994653+00	0.87343754951287303652	f
605	161	f769233e-5132-4313-8ff6-5505b86791ed	26	2026-04-16 20:47:18.000936+00	0.87483154811532166856	f
606	208	f769233e-5132-4313-8ff6-5505b86791ed	42	2026-04-16 20:47:28.424755+00	0.87551990530273816316	f
607	229	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	40	2026-04-17 09:17:38.615447+00	0.82665453307789029037	f
608	227	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	40	2026-04-17 09:17:55.445344+00	0.82799524467486974374	f
609	218	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	44	2026-04-17 09:18:00.514403+00	0.82918101198952997880	f
610	216	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	16	2026-04-17 09:18:04.151318+00	0.83085250515839682689	f
611	214	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	16	2026-04-17 09:18:09.885709+00	0.83230744894566058248	f
612	222	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	40	2026-04-17 09:18:16.998782+00	0.83373208140402300983	f
613	210	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	19	2026-04-17 09:18:20.274533+00	0.83502251468428092825	f
614	225	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	35	2026-04-17 09:18:27.555459+00	0.83670595841199234735	f
615	224	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	42	2026-04-17 09:18:33.032135+00	0.83811199534174829662	f
616	226	a8efc3b0-538d-4293-9af6-7d535991faea	35	2026-04-17 10:06:40.712746+00	0.87933296411924748570	t
617	223	a8efc3b0-538d-4293-9af6-7d535991faea	37	2026-04-17 10:06:46.886194+00	0.88010226847335764883	t
618	217	a8efc3b0-538d-4293-9af6-7d535991faea	38	2026-04-17 10:06:50.888783+00	0.88036780333747542731	t
619	220	a8efc3b0-538d-4293-9af6-7d535991faea	29	2026-04-17 10:06:54.688139+00	0.88072541904361244175	t
620	220	a8efc3b0-538d-4293-9af6-7d535991faea	27	2026-04-17 10:07:03.021924+00	0.88022190348138035383	t
621	225	a8efc3b0-538d-4293-9af6-7d535991faea	39	2026-04-17 10:07:10.045585+00	0.87953638633880682848	t
622	228	a8efc3b0-538d-4293-9af6-7d535991faea	39	2026-04-17 10:07:17.989431+00	0.87986634837329098702	t
623	209	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	21	2026-04-20 10:51:59.253558+00	0.83854039919785462318	f
624	227	a8efc3b0-538d-4293-9af6-7d535991faea	43	2026-04-21 06:54:37.676835+00	0.88042848205782642249	t
625	222	a8efc3b0-538d-4293-9af6-7d535991faea	41	2026-04-21 07:50:26.230206+00	0.88056906371893053158	t
626	229	a8efc3b0-538d-4293-9af6-7d535991faea	41	2026-04-21 08:42:12.622587+00	0.88118673939683051054	t
627	219	a5b9777a-748c-4dbf-8c94-ea42abff4636	18	2026-04-22 06:27:15.19385+00	0.83246465360367162719	f
628	203	a5b9777a-748c-4dbf-8c94-ea42abff4636	41	2026-04-22 06:27:25.511854+00	0.83022195607766740717	f
629	224	a5b9777a-748c-4dbf-8c94-ea42abff4636	40	2026-04-22 06:27:55.060382+00	0.83188419032400657339	f
630	229	a5b9777a-748c-4dbf-8c94-ea42abff4636	43	2026-04-22 06:28:00.984296+00	0.83279516175448030074	f
631	215	a5b9777a-748c-4dbf-8c94-ea42abff4636	17	2026-04-22 06:28:05.328116+00	0.83377917210319042049	f
\.


--
-- TOC entry 4895 (class 0 OID 35326)
-- Dependencies: 399
-- Data for Name: album_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.album_images (album_id, image_id, sort_order) FROM stdin;
2	21	0
2	22	1
3	26	0
3	27	1
3	28	2
3	29	3
16	88	0
24	104	0
24	105	1
24	106	2
25	111	0
25	112	1
25	113	2
26	111	0
26	112	0
26	113	0
33	128	0
33	129	0
\.


--
-- TOC entry 4894 (class 0 OID 35289)
-- Dependencies: 398
-- Data for Name: albums; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.albums (id, owner_user_id, title, description, album_taken_at, visibility, created_at, updated_at, year, aw_age) FROM stdin;
2	a8efc3b0-538d-4293-9af6-7d535991faea	album-2	\N	\N	everyone	2025-12-28 20:06:27.517416+00	2025-12-28 20:06:27.517416+00	2025	\N
3	a8efc3b0-538d-4293-9af6-7d535991faea	album-Letadla-4	\N	\N	everyone	2025-12-28 20:19:36.758317+00	2025-12-28 20:19:36.758317+00	2025	\N
9	f769233e-5132-4313-8ff6-5505b86791ed	Z Album	\N	\N	everyone	2026-01-04 09:18:36.566245+00	2026-01-04 09:18:36.566245+00	2025	\N
16	f769233e-5132-4313-8ff6-5505b86791ed	album-Z	\N	\N	everyone	2026-02-01 16:52:27.144049+00	2026-02-01 16:52:27.144049+00	2017	\N
23	f769233e-5132-4313-8ff6-5505b86791ed	Rok 2019	\N	2019-01-01	everyone	2026-02-02 19:07:16.786837+00	2026-02-02 19:07:16.786837+00	\N	\N
24	f769233e-5132-4313-8ff6-5505b86791ed	Rok 2019	\N	2019-01-01	everyone	2026-02-16 12:20:20.610773+00	2026-02-16 12:20:20.610773+00	\N	\N
25	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	Rok 2019	\N	2019-01-01	everyone	2026-02-21 15:02:27.17907+00	2026-02-21 15:02:27.17907+00	\N	\N
26	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	Album-až potom	\N	\N	everyone	2026-02-21 15:03:47.153023+00	2026-02-21 15:03:47.153023+00	2019	\N
33	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	Rok 2019	\N	\N	everyone	2026-02-25 11:40:49.61216+00	2026-02-25 11:40:49.61216+00	2019	\N
\.


--
-- TOC entry 4932 (class 0 OID 164245)
-- Dependencies: 441
-- Data for Name: app_runtime_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_runtime_settings (setting_key, int_value, text_value, updated_at, updated_by) FROM stdin;
post_reveal_delay_days	1	\N	2026-04-10 08:54:15.521919+00	a8efc3b0-538d-4293-9af6-7d535991faea
\.


--
-- TOC entry 4941 (class 0 OID 166785)
-- Dependencies: 454
-- Data for Name: article_ai_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.article_ai_results (id, article_id, summary_cs, category, geography, keywords_json, topic_label, confidence_note, model_name, created_at, geography_path_json) FROM stdin;
\.


--
-- TOC entry 4940 (class 0 OID 166769)
-- Dependencies: 453
-- Data for Name: articles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles (id, source_id, url, title, published_at, raw_excerpt, raw_content, image_url, created_at) FROM stdin;
\.


--
-- TOC entry 4938 (class 0 OID 166725)
-- Dependencies: 451
-- Data for Name: aw_challenge_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aw_challenge_images (challenge_id, image_id, source, locked_in_at, was_experimental_at_lock) FROM stdin;
\.


--
-- TOC entry 4937 (class 0 OID 165585)
-- Dependencies: 450
-- Data for Name: aw_challenges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aw_challenges (id, owner_user_id, title, public_message, private_goal, private_goal_visibility, visibility, status, start_date, target_date_original, target_date_current, baseline_aw_score_norm_pct, target_aw_score_norm_pct, photo_scope, challenge_tag, created_at, updated_at, activated_at, completed_at, extended_at, private_goal_published_at, include_experimental_images) FROM stdin;
07f6012c-61e4-419c-b4ce-ca77766c2838	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	Moje AW výzva	Moje první AW výzva, zatím si dávám termín do Mikuláše :-)	chci zhubnout, nemít kruhy pod očima, mladší pleť. Zlepšit styl oblékání, spravit si vlasy a nehrbit se :-)	private	private	active	2026-04-14	2026-12-05	2026-12-05	100.1	97	challenge_tag	vyzva-moje-aw-vyzva	2026-04-14 10:25:11.77279+00	2026-04-14 14:59:59.852912+00	2026-04-14 10:25:11.77279+00	\N	\N	\N	f
\.


--
-- TOC entry 4931 (class 0 OID 164213)
-- Dependencies: 440
-- Data for Name: aw_user_stats_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aw_user_stats_history (user_id, snapshot_date, aw_age, aw_score_norm_pct, avg_accuracy_pct, power_score, created_at, updated_at) FROM stdin;
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-09	57.49004572452766	98.6	82.8	79.2465	2026-04-09 10:45:12.303102+00	2026-04-09 10:45:12.303102+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-21	\N	\N	93.21424607944533469132	\N	2026-04-21 02:20:00.190548+00	2026-04-21 02:20:00.190548+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-21	38.8416666666666667	105.48777194639097535250	93.81307735254597272943	\N	2026-04-21 02:20:00.190548+00	2026-04-21 02:20:00.190548+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-10	59.51273326940588	99	89.5	89.42805517241379	2026-04-10 08:34:54.026422+00	2026-04-10 09:08:09.291453+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-21	37.8090000000000000	95.60294872498673741785	94.49790371693910108234	\N	2026-04-21 02:20:00.190548+00	2026-04-21 02:20:00.190548+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10	\N	100	84.9	44.44933636363636	2026-04-10 16:58:11.801238+00	2026-04-10 17:12:41.907055+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-21	26.1515384615384615	97.12644889357218124354	93.85103846722560298104	\N	2026-04-21 02:20:00.190548+00	2026-04-21 02:20:00.190548+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-21	36.2066666666666667	100.52044497452660717962	94.14419613132860676323	\N	2026-04-21 02:20:00.190548+00	2026-04-21 02:20:00.190548+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-21	30.0570588235294118	98.82949979340642635624	92.13331600404301970084	\N	2026-04-21 02:20:00.190548+00	2026-04-21 02:20:00.190548+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-10	40.66472599521176	98.9	87.2	87.61476551724138	2026-04-10 08:33:41.998521+00	2026-04-10 18:57:14.199361+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-22	\N	\N	93.21424607944533469132	\N	2026-04-22 02:20:00.166822+00	2026-04-22 02:20:00.166822+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-22	39.1566666666666667	105.87753532087657206033	93.81307735254597272943	\N	2026-04-22 02:20:00.166822+00	2026-04-22 02:20:00.166822+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-22	37.8090000000000000	95.60294872498673741785	94.49790371693910108234	\N	2026-04-22 02:20:00.166822+00	2026-04-22 02:20:00.166822+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-22	26.1907692307692308	97.18018967334035827200	93.85103846722560298104	\N	2026-04-22 02:20:00.166822+00	2026-04-22 02:20:00.166822+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-22	36.2066666666666667	100.52044497452660717962	94.14419613132860676323	\N	2026-04-22 02:20:00.166822+00	2026-04-22 02:20:00.166822+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-22	30.0570588235294118	98.82949979340642635624	92.22435028770834926648	\N	2026-04-22 02:20:00.166822+00	2026-04-22 02:20:00.166822+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-23	\N	\N	93.21424607944533469132	\N	2026-04-23 02:20:00.150533+00	2026-04-23 02:20:00.150533+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-23	39.0983333333333333	105.81453928913054031433	93.81307735254597272943	\N	2026-04-23 02:20:00.150533+00	2026-04-23 02:20:00.150533+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-23	25.6407142857142857	94.97150321786672584593	93.85103846722560298104	\N	2026-04-23 02:20:00.150533+00	2026-04-23 02:20:00.150533+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-23	36.2066666666666667	100.52044497452660717962	94.14419613132860676323	\N	2026-04-23 02:20:00.150533+00	2026-04-23 02:20:00.150533+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-12	40.66472599521176	98.9	87.5	88.08483255813954	2026-04-12 06:45:38.639218+00	2026-04-12 19:50:09.265458+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-13	\N	\N	93.81307735254597272943	\N	2026-04-13 08:46:17.40144+00	2026-04-13 08:46:17.40144+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-13	\N	\N	92.62517199250903881754	\N	2026-04-13 08:46:17.40144+00	2026-04-13 08:46:17.40144+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-13	23.0000000000000000	99.88702160711763875183	93.85103846722560298104	\N	2026-04-13 08:46:17.40144+00	2026-04-13 08:46:17.40144+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-13	29.9658823529411765	98.70460051862802184376	92.36631724287147658915	\N	2026-04-13 08:46:17.40144+00	2026-04-13 08:46:17.40144+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-13	37.8295000000000000	95.62408274560529411890	94.49790371693910108234	\N	2026-04-13 08:46:17.40144+00	2026-04-13 08:46:17.40144+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-13	36.2066666666666667	100.52044497452660717962	93.49098531997792363370	\N	2026-04-13 08:46:17.40144+00	2026-04-13 08:46:17.40144+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-14	\N	\N	93.81307735254597272943	\N	2026-04-14 02:20:00.224893+00	2026-04-14 02:20:00.224893+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-14	\N	\N	92.62517199250903881754	\N	2026-04-14 02:20:00.224893+00	2026-04-14 02:20:00.224893+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-14	29.9658823529411765	98.70460051862802184376	92.36631724287147658915	\N	2026-04-14 02:20:00.224893+00	2026-04-14 02:20:00.224893+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-14	23.0000000000000000	99.88702160711763875183	93.85103846722560298104	\N	2026-04-14 02:20:00.224893+00	2026-04-14 02:20:00.224893+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-14	37.8295000000000000	95.62408274560529411890	94.49790371693910108234	\N	2026-04-14 02:20:00.224893+00	2026-04-14 02:20:00.224893+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-14	36.2066666666666667	100.52044497452660717962	93.49098531997792363370	\N	2026-04-14 02:20:00.224893+00	2026-04-14 02:20:00.224893+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-15	\N	\N	93.81307735254597272943	\N	2026-04-15 02:20:00.175993+00	2026-04-15 02:20:00.175993+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-15	\N	\N	92.62517199250903881754	\N	2026-04-15 02:20:00.175993+00	2026-04-15 02:20:00.175993+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-15	23.0000000000000000	99.88702160711763875183	93.85103846722560298104	\N	2026-04-15 02:20:00.175993+00	2026-04-15 02:20:00.175993+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-15	29.9658823529411765	98.70460051862802184376	92.36631724287147658915	\N	2026-04-15 02:20:00.175993+00	2026-04-15 02:20:00.175993+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-15	36.2066666666666667	100.52044497452660717962	93.49098531997792363370	\N	2026-04-15 02:20:00.175993+00	2026-04-15 02:20:00.175993+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-15	37.8295000000000000	95.62408274560529411890	94.49790371693910108234	\N	2026-04-15 02:20:00.175993+00	2026-04-15 02:20:00.175993+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-16	\N	\N	93.81307735254597272943	\N	2026-04-16 02:20:00.135825+00	2026-04-16 02:20:00.135825+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-16	\N	\N	92.62517199250903881754	\N	2026-04-16 02:20:00.135825+00	2026-04-16 02:20:00.135825+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-16	23.0000000000000000	100.49226299755885972543	93.85103846722560298104	\N	2026-04-16 02:20:00.135825+00	2026-04-16 02:20:00.135825+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-16	36.2066666666666667	100.52044497452660717962	93.49098531997792363370	\N	2026-04-16 02:20:00.135825+00	2026-04-16 02:20:00.135825+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-16	37.8295000000000000	95.62408274560529411890	94.49790371693910108234	\N	2026-04-16 02:20:00.135825+00	2026-04-16 02:20:00.135825+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-16	29.9658823529411765	98.70460051862802184376	92.44988799089343701400	\N	2026-04-16 02:20:00.135825+00	2026-04-16 02:20:00.135825+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-17	36.2066666666666667	100.52044497452660717962	93.63514550010872705408	\N	2026-04-17 02:20:00.168362+00	2026-04-17 02:20:00.168362+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-17	30.0570588235294118	98.82949979340642635624	92.44988799089343701400	\N	2026-04-17 02:20:00.168362+00	2026-04-17 02:20:00.168362+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-17	22.6237500000000000	100.68498446547097867550	93.85103846722560298104	\N	2026-04-17 02:20:00.168362+00	2026-04-17 02:20:00.168362+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-17	40.0000000000000000	105.00000000000000000000	93.81307735254597272943	\N	2026-04-17 02:20:00.168362+00	2026-04-17 02:20:00.168362+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-17	\N	\N	93.21424607944533469132	\N	2026-04-17 02:20:00.168362+00	2026-04-17 02:20:00.168362+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-17	37.8090000000000000	95.60294872498673741785	94.49790371693910108234	\N	2026-04-17 02:20:00.168362+00	2026-04-17 02:20:00.168362+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-18	\N	\N	93.21424607944533469132	\N	2026-04-18 02:20:00.150389+00	2026-04-18 02:20:00.150389+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-18	38.8416666666666667	105.48777194639097535250	93.81307735254597272943	\N	2026-04-18 02:20:00.150389+00	2026-04-18 02:20:00.150389+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-18	37.8090000000000000	95.60294872498673741785	94.49790371693910108234	\N	2026-04-18 02:20:00.150389+00	2026-04-18 02:20:00.150389+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-18	26.5808333333333333	96.71516499552793861517	93.85103846722560298104	\N	2026-04-18 02:20:00.150389+00	2026-04-18 02:20:00.150389+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-18	30.0570588235294118	98.82949979340642635624	92.13331600404301970084	\N	2026-04-18 02:20:00.150389+00	2026-04-18 02:20:00.150389+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-18	36.2066666666666667	100.52044497452660717962	94.06347382923140888126	\N	2026-04-18 02:20:00.150389+00	2026-04-18 02:20:00.150389+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-19	\N	\N	93.21424607944533469132	\N	2026-04-19 02:20:00.138925+00	2026-04-19 02:20:00.138925+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-19	38.8416666666666667	105.48777194639097535250	93.81307735254597272943	\N	2026-04-19 02:20:00.138925+00	2026-04-19 02:20:00.138925+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-19	37.8090000000000000	95.60294872498673741785	94.49790371693910108234	\N	2026-04-19 02:20:00.138925+00	2026-04-19 02:20:00.138925+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-19	26.5808333333333333	96.71516499552793861517	93.85103846722560298104	\N	2026-04-19 02:20:00.138925+00	2026-04-19 02:20:00.138925+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-19	30.0570588235294118	98.82949979340642635624	92.13331600404301970084	\N	2026-04-19 02:20:00.138925+00	2026-04-19 02:20:00.138925+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-19	36.2066666666666667	100.52044497452660717962	94.06347382923140888126	\N	2026-04-19 02:20:00.138925+00	2026-04-19 02:20:00.138925+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-20	\N	\N	93.21424607944533469132	\N	2026-04-20 02:20:00.173834+00	2026-04-20 02:20:00.173834+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-20	36.2066666666666667	100.52044497452660717962	94.06347382923140888126	\N	2026-04-20 02:20:00.173834+00	2026-04-20 02:20:00.173834+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-20	38.8416666666666667	105.48777194639097535250	93.81307735254597272943	\N	2026-04-20 02:20:00.173834+00	2026-04-20 02:20:00.173834+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-20	37.8090000000000000	95.60294872498673741785	94.49790371693910108234	\N	2026-04-20 02:20:00.173834+00	2026-04-20 02:20:00.173834+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-20	26.5808333333333333	96.71516499552793861517	93.85103846722560298104	\N	2026-04-20 02:20:00.173834+00	2026-04-20 02:20:00.173834+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-20	30.0570588235294118	98.82949979340642635624	92.13331600404301970084	\N	2026-04-20 02:20:00.173834+00	2026-04-20 02:20:00.173834+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-23	37.8090000000000000	95.60294872498673741785	93.66228444755456806654	\N	2026-04-23 02:20:00.150533+00	2026-04-23 02:20:00.150533+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-23	30.1458823529411765	98.94337611316509905606	92.22435028770834926648	\N	2026-04-23 02:20:00.150533+00	2026-04-23 02:20:00.150533+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-24	\N	\N	93.21424607944533469132	\N	2026-04-24 02:20:00.160234+00	2026-04-24 02:20:00.160234+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-24	39.0983333333333333	105.81453928913054031433	93.81307735254597272943	\N	2026-04-24 02:20:00.160234+00	2026-04-24 02:20:00.160234+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24	30.1458823529411765	98.94337611316509905606	92.22435028770834926648	\N	2026-04-24 02:20:00.160234+00	2026-04-24 02:20:00.160234+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-24	25.6407142857142857	94.97150321786672584593	93.85103846722560298104	\N	2026-04-24 02:20:00.160234+00	2026-04-24 02:20:00.160234+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-24	36.2066666666666667	100.52044497452660717962	94.14419613132860676323	\N	2026-04-24 02:20:00.160234+00	2026-04-24 02:20:00.160234+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-24	37.8090000000000000	95.60294872498673741785	93.66228444755456806654	\N	2026-04-24 02:20:00.160234+00	2026-04-24 02:20:00.160234+00
f769233e-5132-4313-8ff6-5505b86791ed	2026-04-25	\N	\N	93.21424607944533469132	\N	2026-04-25 02:20:00.177605+00	2026-04-25 02:20:00.177605+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-25	39.0983333333333333	105.81453928913054031433	93.81307735254597272943	\N	2026-04-25 02:20:00.177605+00	2026-04-25 02:20:00.177605+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	2026-04-25	26.0746153846153846	94.50539363192943195777	93.85103846722560298104	\N	2026-04-25 02:20:00.177605+00	2026-04-25 02:20:00.177605+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-25	36.2066666666666667	100.52044497452660717962	94.04153919444307810696	\N	2026-04-25 02:20:00.177605+00	2026-04-25 02:20:00.177605+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-25	37.8090000000000000	95.60294872498673741785	93.66228444755456806654	\N	2026-04-25 02:20:00.177605+00	2026-04-25 02:20:00.177605+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-25	30.1458823529411765	98.94337611316509905606	92.22435028770834926648	\N	2026-04-25 02:20:00.177605+00	2026-04-25 02:20:00.177605+00
\.


--
-- TOC entry 4925 (class 0 OID 158533)
-- Dependencies: 434
-- Data for Name: blocked_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blocked_users (blocker_user_id, blocked_user_id, created_at, reason) FROM stdin;
\.


--
-- TOC entry 4935 (class 0 OID 164303)
-- Dependencies: 444
-- Data for Name: comment_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment_reports (id, comment_id, reporter_user_id, reason, details, status, admin_note, reviewed_at, reviewed_by, created_at) FROM stdin;
\.


--
-- TOC entry 4914 (class 0 OID 150364)
-- Dependencies: 423
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, author_user_id, post_id, image_id, parent_comment_id, body, created_at, updated_at, is_deleted, is_hidden_by_moderation, target_type, author_snapshot_display_name, author_snapshot_avatar_url, hidden_by_suspension, story_id) FROM stdin;
4	a8efc3b0-538d-4293-9af6-7d535991faea	62	144	\N	nice photo! :-)	2026-03-25 11:46:48.844341+00	\N	f	f	image	Master Blaster2 :-)	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
5	a8efc3b0-538d-4293-9af6-7d535991faea	62	144	\N	test 2	2026-03-25 12:16:28.033043+00	\N	f	f	image	Master Blaster2 :-)	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
13	a8efc3b0-538d-4293-9af6-7d535991faea	62	144	\N	test	2026-03-28 19:31:47.061286+00	\N	f	f	image	Master Blaster2 :-)	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
14	a8efc3b0-538d-4293-9af6-7d535991faea	62	147	\N	test	2026-03-28 19:31:56.631755+00	\N	f	f	image	Master Blaster2 :-)	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
15	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	72	198	\N	Bylo to focené na TV vysílači?	2026-04-10 10:20:26.160664+00	\N	f	f	image	AI Andrea	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/avatar.jpg	f	\N
16	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	68	172	\N	to je ten tvůj nový dům?	2026-04-10 16:52:27.374258+00	\N	f	f	image	Michael-Seznam-	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/dbabbf33-a30d-4d09-b102-e4988e2fc79b.png	f	\N
17	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	72	191	\N	co to máš s krkem? 😉	2026-04-10 17:37:57.506112+00	\N	f	f	image	Michael-Seznam-	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/dbabbf33-a30d-4d09-b102-e4988e2fc79b.png	f	\N
18	a8efc3b0-538d-4293-9af6-7d535991faea	72	198	15	ano, na Fernsehturm	2026-04-10 19:29:04.576623+00	\N	f	f	image	Michael Borkovec	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
19	a5b9777a-748c-4dbf-8c94-ea42abff4636	72	198	\N	z tama musel být krásný výhled!	2026-04-12 06:53:12.530539+00	\N	f	f	image	AgeWinners uživatel	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a5b9777a-748c-4dbf-8c94-ea42abff4636/avatar.jpg	f	\N
20	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	72	198	18	díky - až pojedu v létě do Berína, tak to nesmím vynechat!🙂	2026-04-12 07:06:52.875907+00	\N	f	f	image	AI Andrea	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/avatar.jpg	f	\N
21	a8efc3b0-538d-4293-9af6-7d535991faea	72	198	20	určitě, fakt to stojí za to - jak vidíš, byl jsem tam před mnoha lety, ale vzpomínky zůstaly :-)	2026-04-15 10:37:56.148791+00	\N	f	f	image	Michael Borkovec	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
22	a8efc3b0-538d-4293-9af6-7d535991faea	72	198	19	To tedy byl!	2026-04-15 10:38:43.654428+00	\N	f	f	image	Michael Borkovec	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
23	a8efc3b0-538d-4293-9af6-7d535991faea	67	163	\N	👍	2026-04-21 08:58:50.571629+00	\N	f	f	image	Michael Borkovec	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	f	\N
\.


--
-- TOC entry 4906 (class 0 OID 63271)
-- Dependencies: 411
-- Data for Name: connection_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.connection_requests (id, requester_id, target_id, status, created_at, responded_at) FROM stdin;
73fcd35d-518a-480d-a62b-7e1d60bc2a19	a8efc3b0-538d-4293-9af6-7d535991faea	f769233e-5132-4313-8ff6-5505b86791ed	accepted	2026-01-01 09:56:37.550642+00	2026-01-01 09:57:26.9+00
8fbb38f1-77b3-49c2-9e9c-b34dda590b87	a8efc3b0-538d-4293-9af6-7d535991faea	f769233e-5132-4313-8ff6-5505b86791ed	accepted	2026-01-01 10:20:25.380229+00	2026-01-01 10:20:42.294+00
66683c90-d96b-44cd-b7c1-8c1df330fce7	a8efc3b0-538d-4293-9af6-7d535991faea	f769233e-5132-4313-8ff6-5505b86791ed	accepted	2026-01-01 10:46:03.163769+00	2026-01-01 10:46:30.5+00
abe45f82-d646-4d31-a839-7c4c247c5f61	a8efc3b0-538d-4293-9af6-7d535991faea	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	accepted	2026-03-29 13:46:32.776195+00	2026-03-29 18:21:15.796+00
1f1c7f65-c1d1-4fc5-ae92-a4930b69359b	a5b9777a-748c-4dbf-8c94-ea42abff4636	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	accepted	2026-04-01 09:22:24.017799+00	2026-04-01 09:22:52.655+00
743739e5-52a8-4deb-b032-7c5647f735ac	a8efc3b0-538d-4293-9af6-7d535991faea	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	pending	2026-04-07 09:04:25.326391+00	\N
efbf2fad-241c-4759-914c-db655dd32e96	a5b9777a-748c-4dbf-8c94-ea42abff4636	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	pending	2026-04-22 06:29:19.745202+00	\N
3386a016-d791-4502-8310-999863ce0936	a5b9777a-748c-4dbf-8c94-ea42abff4636	a8efc3b0-538d-4293-9af6-7d535991faea	accepted	2026-04-08 12:34:20.761236+00	2026-04-24 09:02:15.079+00
\.


--
-- TOC entry 4904 (class 0 OID 63125)
-- Dependencies: 409
-- Data for Name: connections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.connections (id, user_id_a, user_id_b, requested_by, status, created_at, updated_at) FROM stdin;
1c2642e3-7de5-4c7e-b22f-7057a6c03efc	a8efc3b0-538d-4293-9af6-7d535991faea	f769233e-5132-4313-8ff6-5505b86791ed	a8efc3b0-538d-4293-9af6-7d535991faea	accepted	2026-01-01 10:46:30.945285+00	2026-01-01 10:46:30.945285+00
e2299cbb-8d93-4298-96ea-d9713b1cd94f	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea	accepted	2026-03-29 18:21:17.404145+00	2026-03-29 18:21:17.404145+00
e47567c0-ebfe-4d5d-9140-8bb9d5c534c8	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636	accepted	2026-04-01 09:22:51.656227+00	2026-04-01 09:22:51.656227+00
70607d5f-d31c-4254-a7d4-fa94189b1e2f	a5b9777a-748c-4dbf-8c94-ea42abff4636	a8efc3b0-538d-4293-9af6-7d535991faea	a5b9777a-748c-4dbf-8c94-ea42abff4636	accepted	2026-04-24 09:02:16.088928+00	2026-04-24 09:02:16.088928+00
\.


--
-- TOC entry 4905 (class 0 OID 63156)
-- Dependencies: 410
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follows (follower_id, following_id, created_at) FROM stdin;
f769233e-5132-4313-8ff6-5505b86791ed	a8efc3b0-538d-4293-9af6-7d535991faea	2026-01-03 19:00:49.11081+00
a8efc3b0-538d-4293-9af6-7d535991faea	f769233e-5132-4313-8ff6-5505b86791ed	2026-03-30 09:07:33.499394+00
a8efc3b0-538d-4293-9af6-7d535991faea	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-16 20:43:59.639866+00
\.


--
-- TOC entry 4930 (class 0 OID 164173)
-- Dependencies: 439
-- Data for Name: hidden_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hidden_images (user_id, image_id, created_at) FROM stdin;
a5b9777a-748c-4dbf-8c94-ea42abff4636	122	2026-04-07 19:32:46.540809+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	226	2026-04-17 09:18:41.964527+00
a8efc3b0-538d-4293-9af6-7d535991faea	225	2026-04-23 08:37:36.554562+00
\.


--
-- TOC entry 4927 (class 0 OID 158581)
-- Dependencies: 436
-- Data for Name: hidden_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hidden_posts (user_id, post_id, created_at) FROM stdin;
a8efc3b0-538d-4293-9af6-7d535991faea	62	2026-03-31 12:35:11.094062+00
\.


--
-- TOC entry 4933 (class 0 OID 164271)
-- Dependencies: 442
-- Data for Name: image_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_likes (image_id, user_id, created_at, reaction) FROM stdin;
201	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-10 11:28:07.327215+00	like
198	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-10 11:31:17.731483+00	like
170	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-10 12:56:13.53019+00	like
167	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 16:47:47.767931+00	like
172	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 16:53:35.589782+00	like
188	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 16:59:47.636852+00	clap
191	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 17:37:35.487579+00	like
169	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 17:54:34.48015+00	like
198	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 18:15:08.760914+00	insight
160	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-10 18:23:42.380667+00	like
141	a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-12 06:51:35.2631+00	clap
141	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-21 08:59:02.402213+00	care
188	a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-21 12:51:02.191293+00	insight
172	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-23 06:22:11.615712+00	like
180	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-23 06:22:17.512328+00	like
183	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-23 06:22:23.671982+00	clap
182	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-23 06:22:27.026761+00	love
\.


--
-- TOC entry 4910 (class 0 OID 90805)
-- Dependencies: 415
-- Data for Name: image_moderation_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_moderation_events (id, image_id, uploader_user_id, event_type, report_id, created_at, moderator_user_id, reason, note) FROM stdin;
1	33	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:32.975226+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
2	34	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:34.644239+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
3	35	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:35.453508+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
4	36	f769233e-5132-4313-8ff6-5505b86791ed	deleted_by_admin	\N	2026-02-19 12:47:36.206575+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
5	37	f769233e-5132-4313-8ff6-5505b86791ed	deleted_by_admin	\N	2026-02-19 12:47:36.976656+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
6	38	f769233e-5132-4313-8ff6-5505b86791ed	deleted_by_admin	\N	2026-02-19 12:47:38.021848+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
7	40	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:38.899896+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
8	41	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:39.69548+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
9	42	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:40.443149+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
10	44	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:41.205908+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
11	45	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:42.044517+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
12	46	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:42.796112+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
13	47	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:43.595705+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
14	48	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:44.356809+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
15	49	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:45.187721+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
16	51	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:45.977399+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
17	52	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:46.687359+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
18	53	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:47.436717+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
19	54	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:48.204757+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
20	59	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-02-19 12:47:48.99769+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
21	102	f769233e-5132-4313-8ff6-5505b86791ed	rejected_and_deleted	\N	2026-02-20 10:41:07.002682+00	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	Nelze tipovat věk - více osob	test
22	100	a8efc3b0-538d-4293-9af6-7d535991faea	rejected_and_deleted	\N	2026-02-20 19:38:52.792796+00	a8efc3b0-538d-4293-9af6-7d535991faea	Ostatní - uveďte v komentáři	test
23	247	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:50:09.710681+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
24	231	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:08.482891+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
25	232	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:10.532557+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
26	233	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:11.713633+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
27	234	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:12.989891+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
28	235	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:14.136622+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
29	236	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:14.997722+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
30	237	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:15.805104+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
31	238	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:16.610617+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
32	239	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:17.423267+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
33	240	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:18.275798+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
34	241	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:19.091401+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
35	242	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:19.912639+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
36	243	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:21.153532+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
37	244	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:22.179893+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
38	245	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:23.383557+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
39	246	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:24.228897+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
40	248	a8efc3b0-538d-4293-9af6-7d535991faea	deleted_by_admin	\N	2026-04-23 19:51:25.307436+00	a8efc3b0-538d-4293-9af6-7d535991faea	admin_delete	\N
41	211	e0554f1c-b98d-4031-86f3-0965ed1f45e0	rejected_and_deleted	\N	2026-04-24 06:56:37.420281+00	a8efc3b0-538d-4293-9af6-7d535991faea	Rasismus/projev nenávisti	test | test
\.


--
-- TOC entry 4908 (class 0 OID 90775)
-- Dependencies: 413
-- Data for Name: image_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_reports (id, image_id, reporter_user_id, reason, details, created_at, status, reviewed_at, reviewed_by, admin_note, penalty_coef) FROM stdin;
5	221	a8efc3b0-538d-4293-9af6-7d535991faea	Nelze tipovat věk - více osob	test	2026-04-24 06:42:59.082341+00	open	\N	\N	\N	\N
\.


--
-- TOC entry 4936 (class 0 OID 165566)
-- Dependencies: 449
-- Data for Name: image_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.image_tags (image_id, tag, created_at) FROM stdin;
191	oblicej	2026-04-13 08:47:44.125246+00
202	oblicej	2026-04-13 08:47:44.125246+00
198	bezna	2026-04-13 08:47:44.125246+00
199	bezna	2026-04-13 08:47:44.125246+00
192	bezna	2026-04-13 08:47:44.125246+00
203	bezna	2026-04-13 08:47:44.125246+00
206	bezna	2026-04-13 08:47:44.125246+00
200	cela_postava	2026-04-13 08:47:44.125246+00
204	bezna	2026-04-13 08:47:44.125246+00
193	oblicej	2026-04-13 08:47:44.125246+00
194	oblicej	2026-04-13 08:47:44.125246+00
201	oblicej	2026-04-13 08:47:44.125246+00
207	bezna	2026-04-13 08:47:44.125246+00
208	bezna	2026-04-13 08:47:44.125246+00
195	bezna	2026-04-13 08:47:44.125246+00
196	oblicej	2026-04-13 08:47:44.125246+00
209	bezna	2026-04-13 08:47:44.125246+00
210	bezna	2026-04-13 08:47:44.125246+00
197	cela_postava	2026-04-13 08:47:44.125246+00
160	oblicej	2026-04-13 08:47:44.125246+00
158	spolecenske_saty	2026-04-13 08:47:44.125246+00
212	bezna	2026-04-13 08:47:44.125246+00
167	oblicej	2026-04-13 08:47:44.125246+00
213	sport	2026-04-13 08:47:44.125246+00
166	sport	2026-04-13 08:47:44.125246+00
170	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
214	oblicej	2026-04-13 08:47:44.125246+00
182	v_plavkach	2026-04-13 08:47:44.125246+00
215	oblicej	2026-04-13 08:47:44.125246+00
171	spolecenske_saty	2026-04-13 08:47:44.125246+00
216	makeup_stylizace	2026-04-13 08:47:44.125246+00
143	spolecenske_saty	2026-04-13 08:47:44.125246+00
141	bezna	2026-04-13 08:47:44.125246+00
217	bezna	2026-04-13 08:47:44.125246+00
218	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
183	bezna	2026-04-13 08:47:44.125246+00
185	v_plavkach	2026-04-13 08:47:44.125246+00
219	spolecenske_saty	2026-04-13 08:47:44.125246+00
178	spolecenske_saty	2026-04-13 08:47:44.125246+00
220	bezna	2026-04-13 08:47:44.125246+00
190	oblicej	2026-04-13 08:47:44.125246+00
221	sport	2026-04-13 08:47:44.125246+00
172	bezna	2026-04-13 08:47:44.125246+00
222	oblicej	2026-04-13 08:47:44.125246+00
63	oblicej	2026-04-13 08:47:44.125246+00
223	oblicej	2026-04-13 08:47:44.125246+00
144	sport	2026-04-13 08:47:44.125246+00
30	bezna	2026-04-13 08:47:44.125246+00
80	bezna	2026-04-13 08:47:44.125246+00
65	oblicej	2026-04-13 08:47:44.125246+00
69	oblicej	2026-04-13 08:47:44.125246+00
107	bezna	2026-04-13 08:47:44.125246+00
66	cela_postava	2026-04-13 08:47:44.125246+00
70	oblicej	2026-04-13 08:47:44.125246+00
105	oblicej	2026-04-13 08:47:44.125246+00
75	bezna	2026-04-13 08:47:44.125246+00
81	bezna	2026-04-13 08:47:44.125246+00
76	bezna	2026-04-13 08:47:44.125246+00
82	bezna	2026-04-13 08:47:44.125246+00
68	cela_postava	2026-04-13 08:47:44.125246+00
18	bezna	2026-04-13 08:47:44.125246+00
19	bezna	2026-04-13 08:47:44.125246+00
20	bezna	2026-04-13 08:47:44.125246+00
77	spolecenske_saty	2026-04-13 08:47:44.125246+00
83	bezna	2026-04-13 08:47:44.125246+00
79	bezna	2026-04-13 08:47:44.125246+00
64	cela_postava	2026-04-13 08:47:44.125246+00
137	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
138	spolecenske_saty	2026-04-13 08:47:44.125246+00
139	sport	2026-04-13 08:47:44.125246+00
140	makeup_stylizace	2026-04-13 08:47:44.125246+00
24	bezna	2026-04-13 08:47:44.125246+00
119	bezna	2026-04-13 08:47:44.125246+00
120	bezna	2026-04-13 08:47:44.125246+00
67	oblicej	2026-04-13 08:47:44.125246+00
84	bezna	2026-04-13 08:47:44.125246+00
88	v_plavkach	2026-04-13 08:47:44.125246+00
104	cela_postava	2026-04-13 08:47:44.125246+00
152	bezna	2026-04-13 08:47:44.125246+00
87	bezna	2026-04-13 08:47:44.125246+00
21	bezna	2026-04-13 08:47:44.125246+00
22	bezna	2026-04-13 08:47:44.125246+00
131	bezna	2026-04-13 08:47:44.125246+00
15	bezna	2026-04-13 08:47:44.125246+00
16	bezna	2026-04-13 08:47:44.125246+00
17	bezna	2026-04-13 08:47:44.125246+00
14	bezna	2026-04-13 08:47:44.125246+00
13	bezna	2026-04-13 08:47:44.125246+00
12	bezna	2026-04-13 08:47:44.125246+00
127	bezna	2026-04-13 08:47:44.125246+00
31	bezna	2026-04-13 08:47:44.125246+00
32	bezna	2026-04-13 08:47:44.125246+00
27	bezna	2026-04-13 08:47:44.125246+00
26	bezna	2026-04-13 08:47:44.125246+00
29	bezna	2026-04-13 08:47:44.125246+00
28	bezna	2026-04-13 08:47:44.125246+00
23	bezna	2026-04-13 08:47:44.125246+00
25	bezna	2026-04-13 08:47:44.125246+00
128	bezna	2026-04-13 08:47:44.125246+00
126	bezna	2026-04-13 08:47:44.125246+00
109	bezna	2026-04-13 08:47:44.125246+00
11	bezna	2026-04-13 08:47:44.125246+00
135	v_plavkach	2026-04-13 08:47:44.125246+00
86	bezna	2026-04-13 08:47:44.125246+00
154	bezna	2026-04-13 08:47:44.125246+00
153	bezna	2026-04-13 08:47:44.125246+00
61	bezna	2026-04-13 08:47:44.125246+00
148	bezna	2026-04-13 08:47:44.125246+00
123	bezna	2026-04-13 08:47:44.125246+00
124	bezna	2026-04-13 08:47:44.125246+00
115	bezna	2026-04-13 08:47:44.125246+00
114	bezna	2026-04-13 08:47:44.125246+00
122	bezna	2026-04-13 08:47:44.125246+00
156	bezna	2026-04-13 08:47:44.125246+00
173	sport	2026-04-13 08:47:44.125246+00
146	oblicej	2026-04-13 08:47:44.125246+00
174	oblicej	2026-04-13 08:47:44.125246+00
142	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
169	v_plavkach	2026-04-13 08:47:44.125246+00
147	bezna	2026-04-13 08:47:44.125246+00
145	makeup_stylizace	2026-04-13 08:47:44.125246+00
175	makeup_stylizace	2026-04-13 08:47:44.125246+00
165	bezna	2026-04-13 08:47:44.125246+00
189	makeup_stylizace	2026-04-13 08:47:44.125246+00
159	sport	2026-04-13 08:47:44.125246+00
162	cela_postava	2026-04-13 08:47:44.125246+00
164	spolecenske_saty	2026-04-13 08:47:44.125246+00
168	v_plavkach	2026-04-13 08:47:44.125246+00
157	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
176	makeup_stylizace	2026-04-13 08:47:44.125246+00
163	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
184	spolecenske_saty	2026-04-13 08:47:44.125246+00
161	v_plavkach	2026-04-13 08:47:44.125246+00
150	bezna	2026-04-13 08:47:44.125246+00
116	bezna	2026-04-13 08:47:44.125246+00
149	bezna	2026-04-13 08:47:44.125246+00
186	bezna	2026-04-13 08:47:44.125246+00
188	sport	2026-04-13 08:47:44.125246+00
179	sport	2026-04-13 08:47:44.125246+00
177	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
180	makeup_stylizace	2026-04-13 08:47:44.125246+00
187	postava_bez_obliceje	2026-04-13 08:47:44.125246+00
181	oblicej	2026-04-13 08:47:44.125246+00
108	bezna	2026-04-13 08:47:44.125246+00
132	bezna	2026-04-13 08:47:44.125246+00
133	bezna	2026-04-13 08:47:44.125246+00
125	bezna	2026-04-13 08:47:44.125246+00
74	bezna	2026-04-13 08:47:44.125246+00
136	bezna	2026-04-13 08:47:44.125246+00
106	sport	2026-04-13 08:47:44.125246+00
112	bezna	2026-04-13 08:47:44.125246+00
151	bezna	2026-04-13 08:47:44.125246+00
155	bezna	2026-04-13 08:47:44.125246+00
110	bezna	2026-04-13 08:47:44.125246+00
129	bezna	2026-04-13 08:47:44.125246+00
117	bezna	2026-04-13 08:47:44.125246+00
134	bezna	2026-04-13 08:47:44.125246+00
130	bezna	2026-04-13 08:47:44.125246+00
118	bezna	2026-04-13 08:47:44.125246+00
121	bezna	2026-04-13 08:47:44.125246+00
113	bezna	2026-04-13 08:47:44.125246+00
111	bezna	2026-04-13 08:47:44.125246+00
71	v_plavkach	2026-04-13 08:47:44.125246+00
224	oblicej	2026-04-16 20:46:00.940639+00
230	sport	2026-04-23 09:04:42.939149+00
230	testuju	2026-04-23 09:04:42.939149+00
\.


--
-- TOC entry 4892 (class 0 OID 35205)
-- Dependencies: 396
-- Data for Name: images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.images (id, uploader_user_id, storage_path, public_url, taken_at, real_age_years, visibility, age_reveal_mode, age_reveal_delay_days, guesses_count, avg_guessed_age, created_at, updated_at, aw_age_image, aw_context, include_in_global_aw, photo_category, comment, storage_path_thumb, public_url_thumb, verified_at, verified_by, storage_path_medium, public_url_medium, hidden_by_suspension, hidden_by_admin, hidden_by_admin_at, hidden_by_admin_by) FROM stdin;
191	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633148362-10b603540ed69.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633148362-10b603540ed69.jpg	2005-08-08	23	everyone	delayed	3	4	21.75	2026-04-08 07:25:49.360471+00	2026-04-09 10:30:51.79571+00	21.75	full_body	t	oblicej	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775633148362-10b603540ed69.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633148362-10b603540ed69.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
202	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809532488-2c042f430c7da8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809532488-2c042f430c7da8.jpg	2015-03-07	32	everyone	delayed	3	0	\N	2026-04-10 08:25:34.078481+00	2026-04-10 08:25:34.078481+00	\N	full_body	t	oblicej	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809532488-2c042f430c7da8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809532488-2c042f430c7da8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
198	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633158784-a63119e31eca88.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633158784-a63119e31eca88.jpg	2008-06-08	25	everyone	delayed	3	4	24.25	2026-04-08 07:26:00.229318+00	2026-04-10 16:57:08.203826+00	24.21	full_body	t	bezna	Berlín	a8efc3b0-538d-4293-9af6-7d535991faea/1775633158784-a63119e31eca88.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633158784-a63119e31eca88.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
224	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372359048-73c4f9e978d798.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372359048-73c4f9e978d798.jpg	2021-05-14	32	everyone	delayed	3	2	41.00	2026-04-16 20:46:00.680177+00	2026-04-22 06:27:55.060382+00	41.00	full_body	t	oblicej	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372359048-73c4f9e978d798.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372359048-73c4f9e978d798.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
199	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633160933-50200bde4faf3.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633160933-50200bde4faf3.jpg	2009-08-23	27	everyone	delayed	3	3	24.00	2026-04-08 07:26:01.412354+00	2026-04-13 07:32:48.339479+00	24.01	full_body	t	bezna	Baťův kanál	a8efc3b0-538d-4293-9af6-7d535991faea/1775633160933-50200bde4faf3.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633160933-50200bde4faf3.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
192	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633150195-176438fff7008.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633150195-176438fff7008.jpg	2010-08-11	28	everyone	delayed	3	4	26.50	2026-04-08 07:25:50.899329+00	2026-04-13 07:34:18.550803+00	26.51	full_body	t	bezna	Jeseníky s mojí budoucí ženou :-)	a8efc3b0-538d-4293-9af6-7d535991faea/1775633150195-176438fff7008.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633150195-176438fff7008.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
225	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372361018-f8708adeb45cd.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372361018-f8708adeb45cd.jpg	2022-05-01	33	everyone	delayed	3	2	37.00	2026-04-16 20:46:02.670446+00	2026-04-17 10:07:10.045585+00	37.05	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372361018-f8708adeb45cd.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372361018-f8708adeb45cd.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
203	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809804888-ea35cb55882a8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809804888-ea35cb55882a8.jpg	2021-05-14	38	everyone	delayed	3	2	39.50	2026-04-10 08:30:06.496193+00	2026-04-22 06:27:25.511854+00	39.51	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809804888-ea35cb55882a8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809804888-ea35cb55882a8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
205	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809808406-afb26b037b6df8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809808406-afb26b037b6df8.jpg	2023-08-29	41	everyone	delayed	3	2	37.50	2026-04-10 08:30:12.689991+00	2026-04-13 07:34:34.149415+00	37.45	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809808406-afb26b037b6df8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809808406-afb26b037b6df8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
206	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809812579-e9e6e05241353.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809812579-e9e6e05241353.jpg	2024-06-10	41	everyone	delayed	3	2	38.50	2026-04-10 08:30:15.418274+00	2026-04-10 16:56:10.02348+00	38.50	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809812579-e9e6e05241353.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809812579-e9e6e05241353.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
226	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372362764-530e6c63b9102.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372362764-530e6c63b9102.jpg	2023-08-29	34	everyone	delayed	3	1	35.00	2026-04-16 20:46:05.547071+00	2026-04-17 10:06:40.712746+00	35.00	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372362764-530e6c63b9102.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372362764-530e6c63b9102.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
200	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633162114-e5b6cb77f0651.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633162114-e5b6cb77f0651.jpg	2010-03-22	27	everyone	delayed	3	3	27.33	2026-04-08 07:26:02.295129+00	2026-04-13 07:33:14.171811+00	27.34	full_body	t	cela_postava	Jáva	a8efc3b0-538d-4293-9af6-7d535991faea/1775633162114-e5b6cb77f0651.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633162114-e5b6cb77f0651.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
204	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809806625-1c2a0631bb196.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809806625-1c2a0631bb196.jpg	2022-05-01	39	everyone	delayed	3	1	41.00	2026-04-10 08:30:08.541715+00	2026-04-10 08:42:33.637134+00	41.00	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809806625-1c2a0631bb196.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809806625-1c2a0631bb196.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
193	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633151629-00c0cbac650b98.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633151629-00c0cbac650b98.jpg	2005-12-24	23	everyone	delayed	3	5	23.20	2026-04-08 07:25:52.336939+00	2026-04-13 07:33:43.014813+00	23.29	full_body	t	oblicej	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775633151629-00c0cbac650b98.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633151629-00c0cbac650b98.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
194	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633153063-9d36989853e52.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633153063-9d36989853e52.jpg	2012-08-18	30	everyone	delayed	3	3	29.67	2026-04-08 07:25:53.331162+00	2026-04-13 08:02:50.01157+00	29.64	full_body	t	oblicej	Svatba	a8efc3b0-538d-4293-9af6-7d535991faea/1775633153063-9d36989853e52.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633153063-9d36989853e52.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
201	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633162986-45c3ba76a586.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633162986-45c3ba76a586.jpg	2002-07-20	20	everyone	delayed	3	2	21.00	2026-04-08 07:26:03.761276+00	2026-04-09 10:12:35.011999+00	21.00	full_body	t	oblicej	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775633162986-45c3ba76a586.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633162986-45c3ba76a586.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
227	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372365613-5e2be7fd1b32a.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372365613-5e2be7fd1b32a.jpg	2024-06-10	35	everyone	delayed	3	2	41.50	2026-04-16 20:46:07.605983+00	2026-04-21 06:54:37.676835+00	41.55	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372365613-5e2be7fd1b32a.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372365613-5e2be7fd1b32a.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
207	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809815304-2722f9f623287.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809815304-2722f9f623287.jpg	2025-07-31	43	everyone	delayed	3	2	41.50	2026-04-10 08:30:18.973047+00	2026-04-13 07:34:38.725222+00	41.52	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809815304-2722f9f623287.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809815304-2722f9f623287.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
208	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775809818849-2f16e5f4b59b48.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809818849-2f16e5f4b59b48.jpg	2025-10-03	43	everyone	delayed	3	2	40.50	2026-04-10 08:30:22.660588+00	2026-04-16 20:47:28.424755+00	40.55	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775809818849-2f16e5f4b59b48.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775809818849-2f16e5f4b59b48.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
228	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372367748-2b2910402912e8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372367748-2b2910402912e8.jpg	2025-07-31	36	everyone	delayed	3	1	39.00	2026-04-16 20:46:10.084752+00	2026-04-17 10:07:17.989431+00	39.00	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372367748-2b2910402912e8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372367748-2b2910402912e8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
195	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633154049-3e13564dba586.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633154049-3e13564dba586.jpg	2012-09-17	30	everyone	delayed	3	4	29.50	2026-04-08 07:25:54.569984+00	2026-04-13 07:34:28.968862+00	29.50	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1775633154049-3e13564dba586.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633154049-3e13564dba586.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
196	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633155271-5f0a958c6c132.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633155271-5f0a958c6c132.jpg	2006-12-25	24	everyone	delayed	3	3	23.00	2026-04-08 07:25:55.649249+00	2026-04-13 08:03:59.181566+00	23.06	full_body	t	oblicej	Výlet na Vlčkové	a8efc3b0-538d-4293-9af6-7d535991faea/1775633155271-5f0a958c6c132.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633155271-5f0a958c6c132.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
229	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372370113-323a9f9981a61.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372370113-323a9f9981a61.jpg	2025-10-03	36	everyone	delayed	3	4	41.00	2026-04-16 20:46:12.558562+00	2026-04-22 06:28:00.984296+00	40.99	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372370113-323a9f9981a61.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1776372370113-323a9f9981a61.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
209	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065336580-78fecb80ad6678.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065336580-78fecb80ad6678.png	2000-07-08	19	everyone	delayed	3	1	21.00	2026-04-13 07:29:00.306662+00	2026-04-20 10:51:59.253558+00	21.00	full_body	t	bezna	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065336580-78fecb80ad6678.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065336580-78fecb80ad6678.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
210	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065339480-8a81d1378e4a3.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065339480-8a81d1378e4a3.png	2000-07-08	19	everyone	delayed	3	2	21.00	2026-04-13 07:29:02.862909+00	2026-04-17 09:18:20.274533+00	21.05	full_body	t	bezna	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065339480-8a81d1378e4a3.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065339480-8a81d1378e4a3.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
197	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1775633156376-04e912b7e3361.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633156376-04e912b7e3361.jpg	2007-08-26	25	everyone	delayed	3	3	23.67	2026-04-08 07:25:58.057773+00	2026-04-13 07:34:42.918394+00	23.64	full_body	t	cela_postava	Zlín	a8efc3b0-538d-4293-9af6-7d535991faea/1775633156376-04e912b7e3361.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1775633156376-04e912b7e3361.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
230	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1776935079441-9ad41c0be2ed18.webp	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1776935079441-9ad41c0be2ed18.webp	2020-08-21	38	everyone	delayed	3	0	\N	2026-04-19 17:46:10.699192+00	2026-04-19 17:46:10.699192+00	\N	full_body	f	sport	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1776935079441-9ad41c0be2ed18.thumb.webp	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1776935079441-9ad41c0be2ed18.thumb.webp	\N	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1776935079441-9ad41c0be2ed18.feed.webp	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1776935079441-9ad41c0be2ed18.feed.webp	f	t	2026-04-23 19:50:32.218+00	a8efc3b0-538d-4293-9af6-7d535991faea
160	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033795518-0ed23ead434058.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033795518-0ed23ead434058.png	1986-02-25	19	everyone	delayed	3	4	18.25	2026-04-01 08:56:35.979327+00	2026-04-10 16:57:51.499113+00	18.29	full_body	t	oblicej	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033795518-0ed23ead434058.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033795518-0ed23ead434058.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
158	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033791917-5c90cf689e87d.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033791917-5c90cf689e87d.png	1986-05-07	19	everyone	delayed	3	2	27.50	2026-04-01 08:56:32.237871+00	2026-04-09 09:55:20.063898+00	27.68	full_body	t	spolecenske_saty	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033791917-5c90cf689e87d.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033791917-5c90cf689e87d.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
212	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065343517-296b6a82ef0d.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065343517-296b6a82ef0d.png	2000-07-08	19	everyone	delayed	3	1	21.00	2026-04-13 07:29:06.767225+00	2026-04-13 08:38:03.660537+00	21.00	full_body	t	bezna	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065343517-296b6a82ef0d.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065343517-296b6a82ef0d.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
167	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034116118-5999c973a9f678.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034116118-5999c973a9f678.png	2001-11-12	34	everyone	delayed	3	4	27.00	2026-04-01 09:01:56.873212+00	2026-04-12 06:45:13.935059+00	27.05	full_body	t	oblicej	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034116118-5999c973a9f678.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034116118-5999c973a9f678.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
213	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065345456-0fe0399da28298.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065345456-0fe0399da28298.png	2000-07-08	19	everyone	delayed	3	2	18.00	2026-04-13 07:29:08.679216+00	2026-04-16 20:47:08.994653+00	18.00	full_body	t	sport	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065345456-0fe0399da28298.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065345456-0fe0399da28298.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
166	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034114263-f16406ce02c928.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034114263-f16406ce02c928.png	2001-08-08	34	everyone	delayed	3	4	32.25	2026-04-01 09:01:54.587462+00	2026-04-09 12:05:51.623431+00	32.19	full_body	t	sport	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034114263-f16406ce02c928.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034114263-f16406ce02c928.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
170	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068166860-adad05cd033.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068166860-adad05cd033.png	2026-05-02	59	everyone	delayed	3	5	55.00	2026-04-01 18:29:29.836484+00	2026-04-13 08:03:13.847128+00	54.79	full_body	t	postava_bez_obliceje	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068166860-adad05cd033.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068166860-adad05cd033.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
214	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065347385-3d35cf527dd528.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065347385-3d35cf527dd528.png	2000-07-08	19	everyone	delayed	3	3	17.33	2026-04-13 07:29:10.775097+00	2026-04-17 09:18:09.885709+00	17.36	full_body	t	oblicej	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065347385-3d35cf527dd528.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065347385-3d35cf527dd528.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
182	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069093180-0f1089f826da08.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069093180-0f1089f826da08.png	1998-07-07	32	everyone	delayed	3	3	33.33	2026-04-01 18:44:55.749195+00	2026-04-13 07:34:05.430888+00	33.25	full_body	t	v_plavkach	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069093180-0f1089f826da08.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069093180-0f1089f826da08.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
215	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065349471-7408907da2398.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065349471-7408907da2398.png	2000-07-08	19	everyone	delayed	3	2	16.50	2026-04-13 07:29:12.87741+00	2026-04-22 06:28:05.328116+00	16.49	full_body	t	oblicej	prohrál jsem sázku ;-)	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065349471-7408907da2398.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065349471-7408907da2398.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
171	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068169429-279fe7f84ae028.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068169429-279fe7f84ae028.png	2026-05-02	59	everyone	delayed	3	4	46.50	2026-04-01 18:29:32.163053+00	2026-04-13 07:32:58.065056+00	46.43	full_body	t	spolecenske_saty	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068169429-279fe7f84ae028.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068169429-279fe7f84ae028.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
216	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065351578-75dcb981abb948.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065351578-75dcb981abb948.png	2000-07-08	19	everyone	delayed	3	2	18.50	2026-04-13 07:29:14.803217+00	2026-04-17 09:18:04.151318+00	18.56	full_body	t	makeup_stylizace	brýle jen na zkoušku, jak mi to slušelo?	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065351578-75dcb981abb948.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065351578-75dcb981abb948.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
143	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307170564-3ebec16302a5b8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307170564-3ebec16302a5b8.png	1984-08-05	18	everyone	delayed	3	4	22.75	2026-02-28 19:32:52.848617+00	2026-04-13 07:32:52.307582+00	22.69	full_body	t	spolecenske_saty	před divadlem	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307170564-3ebec16302a5b8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307170564-3ebec16302a5b8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
217	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065498536-c78f4405af7b28.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065498536-c78f4405af7b28.png	2025-03-23	43	everyone	delayed	3	1	38.00	2026-04-13 07:31:42.202222+00	2026-04-17 10:06:50.888783+00	38.00	full_body	t	bezna	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065498536-c78f4405af7b28.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065498536-c78f4405af7b28.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
141	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306890390-f05bb7601cadd8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306890390-f05bb7601cadd8.png	1984-06-05	18	everyone	delayed	3	3	26.00	2026-02-28 19:28:13.294052+00	2026-04-12 06:44:57.337824+00	26.08	full_body	t	bezna	náš nový dům	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306890390-f05bb7601cadd8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306890390-f05bb7601cadd8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
183	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069095199-d2beb265c369e.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069095199-d2beb265c369e.png	1998-07-07	32	everyone	delayed	3	3	32.00	2026-04-01 18:44:58.007671+00	2026-04-10 08:32:14.352817+00	32.01	full_body	t	bezna	náš nový dům	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069095199-d2beb265c369e.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069095199-d2beb265c369e.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
218	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065500923-db786416cda708.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065500923-db786416cda708.png	2025-03-23	43	everyone	delayed	3	3	44.00	2026-04-13 07:31:44.475853+00	2026-04-17 09:18:00.514403+00	44.00	full_body	t	postava_bez_obliceje	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065500923-db786416cda708.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065500923-db786416cda708.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
185	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069604617-86bd8073d138.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069604617-86bd8073d138.png	2016-08-08	50	everyone	delayed	3	4	41.00	2026-04-01 18:53:27.240819+00	2026-04-13 08:03:55.747593+00	41.15	full_body	t	v_plavkach	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069604617-86bd8073d138.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069604617-86bd8073d138.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
219	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065503155-c66713ad1c10a.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065503155-c66713ad1c10a.png	2025-03-23	43	everyone	delayed	3	1	18.00	2026-04-13 07:31:46.473921+00	2026-04-22 06:27:15.19385+00	18.00	full_body	t	spolecenske_saty	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065503155-c66713ad1c10a.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065503155-c66713ad1c10a.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
178	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069084662-20ab37c78836f.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069084662-20ab37c78836f.png	1998-07-07	32	everyone	delayed	3	3	34.33	2026-04-01 18:44:47.165944+00	2026-04-09 09:55:14.889771+00	34.26	full_body	t	spolecenske_saty	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069084662-20ab37c78836f.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069084662-20ab37c78836f.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
220	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065505169-2f6ca659040b88.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065505169-2f6ca659040b88.png	2025-03-23	43	everyone	delayed	3	2	28.00	2026-04-13 07:31:48.618561+00	2026-04-17 10:07:03.021924+00	28.00	full_body	t	bezna	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065505169-2f6ca659040b88.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065505169-2f6ca659040b88.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
190	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069713644-aa1a33d86f108.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069713644-aa1a33d86f108.png	2026-03-03	60	everyone	delayed	3	3	64.33	2026-04-01 18:55:16.064013+00	2026-04-10 08:31:54.072731+00	64.45	full_body	t	oblicej	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069713644-aa1a33d86f108.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069713644-aa1a33d86f108.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
221	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065507305-b7d58e9e1fa2a8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065507305-b7d58e9e1fa2a8.png	2025-03-23	43	everyone	delayed	3	0	\N	2026-04-13 07:31:50.899253+00	2026-04-13 07:31:50.899253+00	\N	full_body	t	sport	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065507305-b7d58e9e1fa2a8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065507305-b7d58e9e1fa2a8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
222	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065509564-9ee51af3193258.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065509564-9ee51af3193258.png	2025-03-23	43	everyone	delayed	3	2	40.50	2026-04-13 07:31:53.092658+00	2026-04-21 07:50:26.230206+00	40.51	full_body	t	oblicej	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065509564-9ee51af3193258.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065509564-9ee51af3193258.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
172	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068171723-acab7a658fac38.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068171723-acab7a658fac38.png	2026-05-02	59	everyone	delayed	3	3	48.67	2026-04-01 18:29:34.308257+00	2026-04-10 16:45:00.337327+00	48.71	full_body	t	bezna	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068171723-acab7a658fac38.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068171723-acab7a658fac38.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
63	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192028090-a5383b28138a5.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192028090-a5383b28138a5.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:13:50.008867+00	2026-01-23 18:13:50.008867+00	\N	full_body	t	oblicej	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
144	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307172112-901de543eded18.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307172112-901de543eded18.png	1984-08-07	18	everyone	delayed	3	2	19.00	2026-02-28 19:32:55.157694+00	2026-04-13 07:32:36.572928+00	19.00	full_body	t	sport	ve fitku	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307172112-901de543eded18.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307172112-901de543eded18.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
223	e0554f1c-b98d-4031-86f3-0965ed1f45e0	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065511756-61fa7f0e3e2d98.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065511756-61fa7f0e3e2d98.png	2025-03-23	43	everyone	delayed	3	1	37.00	2026-04-13 07:31:55.291734+00	2026-04-17 10:06:46.886194+00	37.00	full_body	t	oblicej	\N	e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065511756-61fa7f0e3e2d98.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/e0554f1c-b98d-4031-86f3-0965ed1f45e0/1776065511756-61fa7f0e3e2d98.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
30	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/5298d8f5-961a-44f7-954a-5b70716c2170-20200712_155217(0).jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/5298d8f5-961a-44f7-954a-5b70716c2170-20200712_155217(0).jpg	2025-12-11	43	everyone	delayed	3	0	\N	2025-12-28 20:35:18.103037+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
80	a8efc3b0-538d-4293-9af6-7d535991faea	fab7d58d-9b1e-4145-afa5-ecdcca8b8a6a.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/fab7d58d-9b1e-4145-afa5-ecdcca8b8a6a.png	2026-01-07	43	everyone	delayed	3	0	\N	2026-01-31 16:21:16.321304+00	2026-01-31 16:21:16.321304+00	\N	full_body	t	bezna	kom	\N	\N	\N	\N	\N	\N	f	f	\N	\N
65	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192159365-b1bf72ef02b6c.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192159365-b1bf72ef02b6c.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:16:01.104008+00	2026-01-23 18:16:01.104008+00	\N	full_body	t	oblicej	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
69	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192176509-b448d6da5b2da.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192176509-b448d6da5b2da.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:16:18.133825+00	2026-01-23 18:16:18.133825+00	\N	full_body	t	oblicej	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
107	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771409160887-155034c20f8ab-full.webp	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771409160887-155034c20f8ab-full.webp	2018-04-28	35	everyone	delayed	3	0	\N	2026-02-18 10:06:02.366597+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	ttt	a8efc3b0-538d-4293-9af6-7d535991faea/1771409160887-180712f39ff29-thumb.webp	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771409160887-180712f39ff29-thumb.webp	2026-02-19 11:30:05.176+00	a8efc3b0-538d-4293-9af6-7d535991faea	\N	\N	f	f	\N	\N
66	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192161015-2947e2a58ec2c.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192161015-2947e2a58ec2c.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:16:02.742226+00	2026-01-23 18:16:02.742226+00	\N	full_body	t	cela_postava	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
70	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192178029-16ed71b391a22.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192178029-16ed71b391a22.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:16:19.743606+00	2026-01-23 18:16:19.743606+00	\N	full_body	t	oblicej	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
105	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1771244416260-77415e188aa9a8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1771244416260-77415e188aa9a8.jpg	2019-09-15	33	everyone	delayed	3	0	\N	2026-02-16 12:20:18.270801+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	oblicej	\N	\N	\N	2026-02-19 12:47:30.394+00	a8efc3b0-538d-4293-9af6-7d535991faea	\N	\N	f	f	\N	\N
75	a8efc3b0-538d-4293-9af6-7d535991faea	1769804168664-6a30d416edf4b8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/1769804168664-6a30d416edf4b8.png	2025-12-30	43	everyone	delayed	3	0	\N	2026-01-30 20:16:10.459469+00	2026-01-30 20:16:10.459469+00	\N	full_body	t	bezna	test	\N	\N	\N	\N	\N	\N	f	f	\N	\N
81	a8efc3b0-538d-4293-9af6-7d535991faea	cfa0e534-18fa-4843-83e5-5191dc7b2533.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/cfa0e534-18fa-4843-83e5-5191dc7b2533.png	2026-01-26	43	everyone	delayed	3	0	\N	2026-01-31 16:21:17.797612+00	2026-01-31 16:21:17.797612+00	\N	full_body	f	bezna	bazén	\N	\N	\N	\N	\N	\N	f	f	\N	\N
76	a8efc3b0-538d-4293-9af6-7d535991faea	1769804212767-b22b236ea1641.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/1769804212767-b22b236ea1641.png	2026-01-08	43	everyone	delayed	3	0	\N	2026-01-30 20:16:54.446+00	2026-01-30 20:16:54.446+00	\N	full_body	t	bezna	test	\N	\N	\N	\N	\N	\N	f	f	\N	\N
82	a8efc3b0-538d-4293-9af6-7d535991faea	4aacfe7c-41a1-44b4-a24f-d3ca528ca9e3.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/4aacfe7c-41a1-44b4-a24f-d3ca528ca9e3.png	2026-01-07	43	everyone	delayed	3	0	\N	2026-01-31 16:21:27.323495+00	2026-01-31 16:21:27.323495+00	\N	full_body	t	bezna	kom	\N	\N	\N	\N	\N	\N	f	f	\N	\N
68	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192174709-7b6d11c566ea48.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192174709-7b6d11c566ea48.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:16:16.591611+00	2026-01-23 18:16:16.591611+00	\N	full_body	t	cela_postava	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
18	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/84852b1c-9c20-46b4-9646-738cff4d239c-.trashed-1752531145-20250612_083646.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/84852b1c-9c20-46b4-9646-738cff4d239c-.trashed-1752531145-20250612_083646.jpg	2025-06-12	42	everyone	delayed	3	0	\N	2025-12-28 16:37:20.97898+00	2025-12-28 16:37:20.97898+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
19	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/54ab460f-f999-422f-8203-8f3905930739-.trashed-1752531152-20250612_083645.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/54ab460f-f999-422f-8203-8f3905930739-.trashed-1752531152-20250612_083645.jpg	2025-06-12	42	everyone	delayed	3	0	\N	2025-12-28 16:37:23.364151+00	2025-12-28 16:37:23.364151+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
20	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/0fc90f5a-ab58-4849-94b7-4a91872fd54e-.trashed-1752531158-20250612_083759.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/0fc90f5a-ab58-4849-94b7-4a91872fd54e-.trashed-1752531158-20250612_083759.jpg	2025-06-12	42	everyone	delayed	3	0	\N	2025-12-28 16:37:25.965963+00	2025-12-28 16:37:25.965963+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
77	a8efc3b0-538d-4293-9af6-7d535991faea	1769804214407-437064b32894a8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/1769804214407-437064b32894a8.png	2026-01-14	43	everyone	delayed	3	0	\N	2026-01-30 20:16:55.84862+00	2026-01-30 20:16:55.84862+00	\N	full_body	f	spolecenske_saty	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
83	a8efc3b0-538d-4293-9af6-7d535991faea	4f194329-946b-4873-a4d9-601f626f1a84.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/4f194329-946b-4873-a4d9-601f626f1a84.png	2026-01-26	43	everyone	delayed	3	0	\N	2026-01-31 16:21:28.767443+00	2026-01-31 16:21:28.767443+00	\N	full_body	f	bezna	bazén	\N	\N	\N	\N	\N	\N	f	f	\N	\N
79	f769233e-5132-4313-8ff6-5505b86791ed	d234e81c-5dbc-4a3e-b8c0-b4416fb639e2.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/d234e81c-5dbc-4a3e-b8c0-b4416fb639e2.jpg	2017-01-01	30	everyone	delayed	3	0	\N	2026-01-31 12:54:47.084595+00	2026-01-31 12:54:47.084595+00	\N	full_body	t	bezna	test-k	\N	\N	\N	\N	\N	\N	f	f	\N	\N
64	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192030139-0c01866680c95.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192030139-0c01866680c95.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:13:52.033525+00	2026-01-23 18:13:52.033525+00	\N	full_body	t	cela_postava	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
137	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306743037-24b9ae721652b.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306743037-24b9ae721652b.png	1984-06-28	18	everyone	delayed	3	0	\N	2026-02-28 19:25:46.059332+00	2026-02-28 19:25:46.059332+00	\N	full_body	t	postava_bez_obliceje	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306743037-24b9ae721652b.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306743037-24b9ae721652b.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
138	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306745525-69cf9db36712b8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306745525-69cf9db36712b8.png	1984-07-28	18	everyone	delayed	3	0	\N	2026-02-28 19:25:47.987242+00	2026-02-28 19:25:47.987242+00	\N	full_body	t	spolecenske_saty	opět před divadlem	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306745525-69cf9db36712b8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306745525-69cf9db36712b8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
139	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306747330-bbaba5731ba9a.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306747330-bbaba5731ba9a.png	1984-07-25	18	everyone	delayed	3	0	\N	2026-02-28 19:25:50.189919+00	2026-02-28 19:25:50.189919+00	\N	full_body	t	sport	ve fitku	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306747330-bbaba5731ba9a.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306747330-bbaba5731ba9a.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
140	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306749453-f3bbfdbbc02a28.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306749453-f3bbfdbbc02a28.png	1984-09-21	18	everyone	delayed	3	0	\N	2026-02-28 19:25:51.246231+00	2026-02-28 19:25:51.246231+00	\N	full_body	t	makeup_stylizace	já, make-up, před divadlem	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306749453-f3bbfdbbc02a28.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772306749453-f3bbfdbbc02a28.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
24	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/6f1dbe13-8f88-4142-a370-68dfd4167127-20200712_153304.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/6f1dbe13-8f88-4142-a370-68dfd4167127-20200712_153304.jpg	2022-07-12	40	everyone	delayed	3	0	\N	2025-12-28 20:05:31.365796+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
119	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771760109796-d31f9d35c00528.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771760109796-d31f9d35c00528.jpg	2018-11-06	36	everyone	delayed	3	0	\N	2026-02-22 11:35:12.411751+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771760109796-d31f9d35c00528.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771760109796-d31f9d35c00528.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
120	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771760113082-9e1af499a125b.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771760113082-9e1af499a125b.jpg	2018-11-06	36	everyone	delayed	3	0	\N	2026-02-22 11:35:14.788227+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771760113082-9e1af499a125b.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771760113082-9e1af499a125b.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
67	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192172677-a2083d61338788.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192172677-a2083d61338788.jpg	2023-05-06	40	everyone	delayed	3	0	\N	2026-01-23 18:16:14.789427+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	oblicej	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
84	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1769883333983-82b289e4ff5438.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1769883333983-82b289e4ff5438.jpg	2026-01-22	39	everyone	delayed	3	0	\N	2026-01-31 18:15:39.544653+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	test	\N	\N	\N	\N	\N	\N	f	f	\N	\N
88	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1769964726818-94a5492c831968.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1769964726818-94a5492c831968.jpg	2017-01-01	30	everyone	delayed	3	0	\N	2026-02-01 16:52:09.401331+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	v_plavkach	test-k	\N	\N	2026-02-20 08:36:07.92+00	a8efc3b0-538d-4293-9af6-7d535991faea	\N	\N	f	f	\N	\N
104	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1771244413481-924edbfdcb94a.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1771244413481-924edbfdcb94a.jpg	2019-09-15	33	everyone	delayed	3	0	\N	2026-02-16 12:20:15.991039+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	cela_postava	\N	\N	\N	2026-02-20 08:36:08.791+00	a8efc3b0-538d-4293-9af6-7d535991faea	\N	\N	f	f	\N	\N
152	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772920940654-c847c427d04a2.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920940654-c847c427d04a2.jpg	2018-03-04	35	everyone	delayed	3	0	\N	2026-03-07 22:02:25.216+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772920940654-c847c427d04a2.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920940654-c847c427d04a2.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
87	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769952141951-ff965df742e968.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769952141951-ff965df742e968.jpg	2022-10-12	40	everyone	delayed	3	0	\N	2026-02-01 13:22:25.642658+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	test	\N	\N	2026-02-20 08:36:07.542+00	a8efc3b0-538d-4293-9af6-7d535991faea	\N	\N	f	f	\N	\N
21	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/917991fd-730c-4b60-9605-b0ab78851c39-.trashed-1752531145-20250612_083646.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/917991fd-730c-4b60-9605-b0ab78851c39-.trashed-1752531145-20250612_083646.jpg	2025-06-12	42	everyone	delayed	3	0	\N	2025-12-28 20:04:13.432548+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
22	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/d2620bbf-9ff5-43dd-8c9e-ef7fed22dc7d-.trashed-1752531152-20250612_083645.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/d2620bbf-9ff5-43dd-8c9e-ef7fed22dc7d-.trashed-1752531152-20250612_083645.jpg	2025-06-12	42	everyone	delayed	3	0	\N	2025-12-28 20:04:16.010288+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
131	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019858742-79f8423845a27.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019858742-79f8423845a27.jpg	2019-09-21	19	everyone	delayed	3	0	\N	2026-02-25 11:44:22.433145+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	aa	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019858742-79f8423845a27.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019858742-79f8423845a27.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
15	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/28ab61ea-6ad3-4160-bcdf-1f3ed88487db-20200706_170053.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/28ab61ea-6ad3-4160-bcdf-1f3ed88487db-20200706_170053.jpg	2022-07-06	40	everyone	delayed	3	0	\N	2025-12-27 19:25:58.308472+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
16	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/c3a3b131-608a-4bd8-8ead-bfed096b2ca7-20200709_174334_001.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/c3a3b131-608a-4bd8-8ead-bfed096b2ca7-20200709_174334_001.jpg	2022-07-09	40	everyone	delayed	3	0	\N	2025-12-27 19:25:59.637801+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
17	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/79cc9928-c229-4995-9a2f-c7988860534e-20200709_174334_002.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/79cc9928-c229-4995-9a2f-c7988860534e-20200709_174334_002.jpg	2022-07-09	40	everyone	delayed	3	0	\N	2025-12-27 19:26:00.903175+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
14	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/7a545b45-a043-4af1-a768-d2867da9237e-20200704_175557.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/7a545b45-a043-4af1-a768-d2867da9237e-20200704_175557.jpg	2024-07-04	42	everyone	delayed	3	0	\N	2025-12-27 17:57:18.325926+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
13	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/df8df937-402c-4aa2-810d-54affc8412f3-20200704_131638.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/df8df937-402c-4aa2-810d-54affc8412f3-20200704_131638.jpg	2024-07-04	42	everyone	delayed	3	0	\N	2025-12-27 17:57:15.402642+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
12	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/2570ce16-aa94-43cc-b775-183c5254c91a-20200704_131606.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/2570ce16-aa94-43cc-b775-183c5254c91a-20200704_131606.jpg	2024-07-04	42	everyone	delayed	3	0	\N	2025-12-27 17:57:10.936572+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
127	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019595491-4fc7ac650ee488.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019595491-4fc7ac650ee488.jpg	2019-09-21	19	everyone	delayed	3	0	\N	2026-02-25 11:40:01.083165+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019595491-4fc7ac650ee488.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019595491-4fc7ac650ee488.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
31	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/0a316c17-9e3c-4f94-b19c-022236fed812-20200712_155217(1).jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/0a316c17-9e3c-4f94-b19c-022236fed812-20200712_155217(1).jpg	2025-12-23	43	everyone	delayed	3	0	\N	2025-12-28 20:35:21.248765+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
32	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/eddf1a17-f5b5-4c13-b7e1-8333cb541294-.trashed-1752531172-20250612_083535.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/eddf1a17-f5b5-4c13-b7e1-8333cb541294-.trashed-1752531172-20250612_083535.jpg	2025-12-03	43	everyone	delayed	3	0	\N	2025-12-28 20:35:48.547746+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
27	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/da199ebf-c8a4-46ec-b5b8-f90830a2e8d9-20200725_112112.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/da199ebf-c8a4-46ec-b5b8-f90830a2e8d9-20200725_112112.jpg	2025-07-02	43	everyone	delayed	3	0	\N	2025-12-28 20:19:30.469228+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
26	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/fc6c021f-6b9e-417f-afc1-68c7ec15cb97-20200725_111808.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/fc6c021f-6b9e-417f-afc1-68c7ec15cb97-20200725_111808.jpg	2025-12-10	43	everyone	delayed	3	0	\N	2025-12-28 20:19:27.788627+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
29	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/fa657b8a-f2b3-4607-8129-5f550a3b79b9-20200725_112211.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/fa657b8a-f2b3-4607-8129-5f550a3b79b9-20200725_112211.jpg	2025-12-01	43	everyone	delayed	3	0	\N	2025-12-28 20:19:36.250776+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
28	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/79420ed0-1b79-4a0f-8b09-8ed360754f0c-20200725_112131.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/79420ed0-1b79-4a0f-8b09-8ed360754f0c-20200725_112131.jpg	2025-12-16	43	everyone	delayed	3	0	\N	2025-12-28 20:19:32.791468+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
23	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/965fcbda-8deb-45cf-9d40-4849ed04cd1a-20200712_095920.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/965fcbda-8deb-45cf-9d40-4849ed04cd1a-20200712_095920.jpg	2022-07-12	40	everyone	delayed	3	0	\N	2025-12-28 20:05:28.400255+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
25	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/3429b43d-ce4a-4a4d-a581-b2230bfc8c4a-20200712_154544.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/3429b43d-ce4a-4a4d-a581-b2230bfc8c4a-20200712_154544.jpg	2022-07-12	40	everyone	delayed	3	0	\N	2025-12-28 20:05:35.829987+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
128	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019642899-2c8ac454a4549.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019642899-2c8ac454a4549.jpg	2019-09-29	19	everyone	delayed	3	0	\N	2026-02-25 11:40:46.905795+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019642899-2c8ac454a4549.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019642899-2c8ac454a4549.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
126	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772017721602-42cf70b60f3738.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772017721602-42cf70b60f3738.jpg	2018-10-14	36	everyone	delayed	3	0	\N	2026-02-25 11:08:48.122136+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772017721602-42cf70b60f3738.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772017721602-42cf70b60f3738.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
109	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771684999042-dc80ddc8e65698.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771684999042-dc80ddc8e65698.jpg	2019-09-29	19	everyone	delayed	3	0	\N	2026-02-21 14:43:21.171469+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771684999042-dc80ddc8e65698.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771684999042-dc80ddc8e65698.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
11	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/cb5b297e-77ed-48a5-b96f-8e8d9c34d850-20200705_143851.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/cb5b297e-77ed-48a5-b96f-8e8d9c34d850-20200705_143851.jpg	2022-07-05	40	everyone	delayed	3	0	\N	2025-12-27 17:28:31.821222+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
135	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1772098776368-c47875b036289.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1772098776368-c47875b036289.jpg	2019-09-09	33	everyone	delayed	3	0	\N	2026-02-26 09:39:41.664557+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	v_plavkach	abc	f769233e-5132-4313-8ff6-5505b86791ed/1772098776368-c47875b036289.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1772098776368-c47875b036289.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
86	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769895738898-6eda010a4b71f8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769895738898-6eda010a4b71f8.jpg	2026-01-15	43	everyone	delayed	3	0	\N	2026-01-31 21:42:23.822035+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	test	\N	\N	\N	\N	\N	\N	f	f	\N	\N
154	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772920948243-67729f3c1af27.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920948243-67729f3c1af27.jpg	2018-04-02	35	everyone	delayed	3	0	\N	2026-03-07 22:02:31.920192+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772920948243-67729f3c1af27.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920948243-67729f3c1af27.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
153	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772920942908-91ad0718772aa8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920942908-91ad0718772aa8.jpg	2018-03-29	35	everyone	delayed	3	0	\N	2026-03-07 22:02:30.538763+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772920942908-91ad0718772aa8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920942908-91ad0718772aa8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
61	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769101249665-b2ac9d9e585c7.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769101249665-b2ac9d9e585c7.png	2026-01-14	43	everyone	delayed	3	0	\N	2026-01-22 17:00:50.635612+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N
148	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772908316991-69b3d48225e6d8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772908316991-69b3d48225e6d8.jpg	2021-08-04	39	everyone	delayed	3	0	\N	2026-03-07 18:32:03.84657+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772908316991-69b3d48225e6d8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772908316991-69b3d48225e6d8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
123	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772015870850-15655a48b8edc.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015870850-15655a48b8edc.jpg	2018-04-14	35	everyone	delayed	3	0	\N	2026-02-25 10:37:55.103865+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772015870850-15655a48b8edc.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015870850-15655a48b8edc.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
124	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772015873589-8b269c367c37b.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015873589-8b269c367c37b.jpg	2018-04-16	35	everyone	delayed	3	0	\N	2026-02-25 10:38:00.76154+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772015873589-8b269c367c37b.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015873589-8b269c367c37b.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
115	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771751555983-fb645726cfcbe8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771751555983-fb645726cfcbe8.jpg	2018-09-01	36	everyone	delayed	3	0	\N	2026-02-22 09:12:39.362587+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771751555983-fb645726cfcbe8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771751555983-fb645726cfcbe8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
114	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771751549684-ff4b794d21bda.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771751549684-ff4b794d21bda.jpg	2018-06-23	35	everyone	delayed	3	0	\N	2026-02-22 09:12:35.238656+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771751549684-ff4b794d21bda.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771751549684-ff4b794d21bda.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
122	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772015817161-a441c95d6ea698.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015817161-a441c95d6ea698.jpg	2018-03-04	35	everyone	delayed	3	0	\N	2026-02-25 10:37:01.138469+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	test	a8efc3b0-538d-4293-9af6-7d535991faea/1772015817161-a441c95d6ea698.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015817161-a441c95d6ea698.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
156	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1774952169781-018b9e946d5fc.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1774952169781-018b9e946d5fc.jpg	2018-11-06	36	everyone	delayed	3	0	\N	2026-03-31 10:16:10.668522+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1774952169781-018b9e946d5fc.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1774952169781-018b9e946d5fc.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
173	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068173795-4d67cd9157ead.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068173795-4d67cd9157ead.png	2026-05-02	59	everyone	delayed	3	3	52.67	2026-04-01 18:29:36.368484+00	2026-04-10 08:31:49.23411+00	52.75	full_body	t	sport	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068173795-4d67cd9157ead.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068173795-4d67cd9157ead.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
146	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307175344-d6c6a2e7668eb8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307175344-d6c6a2e7668eb8.png	1984-05-06	18	everyone	delayed	3	3	21.67	2026-02-28 19:32:57.715906+00	2026-04-13 07:34:12.958654+00	21.69	full_body	t	oblicej	bez makeupu	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307175344-d6c6a2e7668eb8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307175344-d6c6a2e7668eb8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
174	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068175812-c66b5cca61702.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068175812-c66b5cca61702.png	2026-05-02	59	everyone	delayed	3	2	48.00	2026-04-01 18:29:38.400669+00	2026-04-10 08:31:26.614858+00	48.00	full_body	t	oblicej	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068175812-c66b5cca61702.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068175812-c66b5cca61702.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
142	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307168689-0ca7bc5ead5f1.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307168689-0ca7bc5ead5f1.png	1984-08-05	18	everyone	delayed	3	3	24.00	2026-02-28 19:32:51.313386+00	2026-04-13 07:33:23.865619+00	23.91	full_body	t	postava_bez_obliceje	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307168689-0ca7bc5ead5f1.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307168689-0ca7bc5ead5f1.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
169	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068164505-7235f005bccdf.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068164505-7235f005bccdf.png	2026-05-02	59	everyone	delayed	3	5	47.20	2026-04-01 18:29:27.23228+00	2026-04-13 07:33:30.465828+00	47.21	full_body	t	v_plavkach	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068164505-7235f005bccdf.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068164505-7235f005bccdf.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
147	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307176943-2fb398668a5a9.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307176943-2fb398668a5a9.png	1984-07-07	18	everyone	delayed	3	1	27.00	2026-02-28 19:32:59.271428+00	2026-04-08 18:35:28.919662+00	27.00	full_body	t	bezna	u nás doma u bazénu :-)	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307176943-2fb398668a5a9.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307176943-2fb398668a5a9.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
145	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307174366-e357a71c0fc78.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307174366-e357a71c0fc78.png	1984-08-08	18	everyone	delayed	3	1	36.00	2026-02-28 19:32:56.12776+00	2026-04-08 18:36:16.188536+00	36.00	full_body	t	makeup_stylizace	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307174366-e357a71c0fc78.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1772307174366-e357a71c0fc78.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
175	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068177849-d4c3795a7f6558.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068177849-d4c3795a7f6558.png	2026-05-02	59	everyone	delayed	3	3	48.33	2026-04-01 18:29:40.351273+00	2026-04-10 08:32:01.026922+00	48.24	full_body	t	makeup_stylizace	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068177849-d4c3795a7f6558.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068177849-d4c3795a7f6558.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
165	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034112388-c1ad6f77416d68.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034112388-c1ad6f77416d68.png	2001-06-05	34	everyone	delayed	3	3	29.67	2026-04-01 09:01:52.719401+00	2026-04-10 08:32:06.723442+00	29.77	full_body	t	bezna	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034112388-c1ad6f77416d68.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034112388-c1ad6f77416d68.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
189	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069711655-9ebd601a6694.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069711655-9ebd601a6694.png	2026-03-03	60	everyone	delayed	3	3	61.00	2026-04-01 18:55:14.143958+00	2026-04-13 07:33:48.801856+00	61.06	full_body	t	makeup_stylizace	make-up	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069711655-9ebd601a6694.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069711655-9ebd601a6694.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
159	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033793725-3601598f2ca0e8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033793725-3601598f2ca0e8.png	1986-07-05	19	everyone	delayed	3	3	27.33	2026-04-01 08:56:34.020383+00	2026-04-09 12:05:38.75461+00	27.28	full_body	t	sport	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033793725-3601598f2ca0e8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033793725-3601598f2ca0e8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
162	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033799688-2c52160f171968.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033799688-2c52160f171968.png	1986-05-07	19	everyone	delayed	3	4	30.50	2026-04-01 08:56:39.903+00	2026-04-13 07:33:57.737824+00	30.48	full_body	t	cela_postava	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033799688-2c52160f171968.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033799688-2c52160f171968.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
164	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034110653-e94adfcfbf6db.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034110653-e94adfcfbf6db.png	2001-04-05	34	everyone	delayed	3	4	31.75	2026-04-01 09:01:50.902574+00	2026-04-13 07:33:39.675639+00	31.76	full_body	t	spolecenske_saty	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034110653-e94adfcfbf6db.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034110653-e94adfcfbf6db.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
168	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034118371-93a39b579c4708.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034118371-93a39b579c4708.png	2001-12-08	35	everyone	delayed	3	3	32.33	2026-04-01 09:02:00.268673+00	2026-04-10 16:57:00.55215+00	32.29	full_body	t	v_plavkach	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034118371-93a39b579c4708.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034118371-93a39b579c4708.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
157	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033788634-5df8c62f7b1098.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033788634-5df8c62f7b1098.png	1986-03-05	19	everyone	delayed	3	4	32.00	2026-04-01 08:56:30.34103+00	2026-04-13 08:03:21.420906+00	32.00	full_body	t	postava_bez_obliceje	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033788634-5df8c62f7b1098.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033788634-5df8c62f7b1098.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
176	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068179793-567a2fb0bb983.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068179793-567a2fb0bb983.png	2026-05-02	59	everyone	delayed	3	3	58.33	2026-04-01 18:29:42.30283+00	2026-04-09 10:12:43.952729+00	58.18	full_body	t	makeup_stylizace	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068179793-567a2fb0bb983.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775068179793-567a2fb0bb983.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
163	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034107336-6b7a96e127e8b.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034107336-6b7a96e127e8b.png	2001-04-03	34	everyone	delayed	3	3	35.67	2026-04-01 09:01:48.87796+00	2026-04-13 07:32:42.391647+00	35.86	full_body	t	postava_bez_obliceje	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034107336-6b7a96e127e8b.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775034107336-6b7a96e127e8b.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
184	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069601417-7d4e7debb749c8.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069601417-7d4e7debb749c8.png	2016-08-08	50	everyone	delayed	3	2	54.00	2026-04-01 18:53:24.987619+00	2026-04-09 09:54:48.199333+00	54.12	full_body	t	spolecenske_saty	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069601417-7d4e7debb749c8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069601417-7d4e7debb749c8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
150	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772908326847-fa86ab3ce31b18.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772908326847-fa86ab3ce31b18.jpg	2021-08-04	39	everyone	delayed	3	0	\N	2026-03-07 18:32:11.648754+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772908326847-fa86ab3ce31b18.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772908326847-fa86ab3ce31b18.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
116	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771751560078-c9df52769310c.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771751560078-c9df52769310c.jpg	2018-09-14	36	everyone	delayed	3	0	\N	2026-02-22 09:12:43.398381+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771751560078-c9df52769310c.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771751560078-c9df52769310c.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
149	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772908321735-02aae3e29b5518.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772908321735-02aae3e29b5518.jpg	2021-08-04	39	everyone	delayed	3	0	\N	2026-03-07 18:32:09.061037+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772908321735-02aae3e29b5518.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772908321735-02aae3e29b5518.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
186	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069606821-95722ce7f5608.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069606821-95722ce7f5608.png	2016-08-08	50	everyone	delayed	3	3	44.33	2026-04-01 18:53:29.378899+00	2026-04-09 09:54:04.864235+00	44.34	full_body	t	bezna	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069606821-95722ce7f5608.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069606821-95722ce7f5608.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
188	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069709444-07db517de06978.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069709444-07db517de06978.png	2026-03-03	60	everyone	delayed	3	4	61.00	2026-04-01 18:55:12.173884+00	2026-04-13 07:33:02.908683+00	60.97	full_body	t	sport	venku na procházce	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069709444-07db517de06978.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069709444-07db517de06978.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
179	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069086626-7e983a138edd6.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069086626-7e983a138edd6.png	1998-07-07	32	everyone	delayed	3	2	19.50	2026-04-01 18:44:49.668845+00	2026-04-09 09:55:04.700193+00	19.52	full_body	t	sport	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069086626-7e983a138edd6.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069086626-7e983a138edd6.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
177	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069081940-93ce54b05fd018.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069081940-93ce54b05fd018.png	1998-07-07	32	everyone	delayed	3	2	29.00	2026-04-01 18:44:45.145357+00	2026-04-09 09:48:07.774103+00	28.85	full_body	t	postava_bez_obliceje	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069081940-93ce54b05fd018.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069081940-93ce54b05fd018.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
180	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069089105-246bf26d023d88.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069089105-246bf26d023d88.png	1998-07-07	32	everyone	delayed	3	2	26.00	2026-04-01 18:44:51.758507+00	2026-04-10 08:31:20.480661+00	26.05	full_body	t	makeup_stylizace	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069089105-246bf26d023d88.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069089105-246bf26d023d88.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
187	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069706959-5b5280e9c0ade.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069706959-5b5280e9c0ade.png	2026-03-03	60	everyone	delayed	3	2	51.00	2026-04-01 18:55:09.837779+00	2026-04-10 08:31:38.297491+00	51.26	full_body	t	postava_bez_obliceje	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069706959-5b5280e9c0ade.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069706959-5b5280e9c0ade.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
181	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069091179-2f700ad3372b28.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069091179-2f700ad3372b28.png	1998-07-07	32	everyone	delayed	3	4	32.75	2026-04-01 18:44:53.731525+00	2026-04-13 07:33:35.009017+00	32.68	full_body	t	oblicej	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069091179-2f700ad3372b28.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/1775069091179-2f700ad3372b28.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
161	a5b9777a-748c-4dbf-8c94-ea42abff4636	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033797562-429110f480af28.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033797562-429110f480af28.png	1986-07-07	19	everyone	delayed	3	4	27.25	2026-04-01 08:56:38.243234+00	2026-04-16 20:47:18.000936+00	27.22	full_body	t	v_plavkach	\N	a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033797562-429110f480af28.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a5b9777a-748c-4dbf-8c94-ea42abff4636/1775033797562-429110f480af28.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
108	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771620140026-edaf4030deb7b.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771620140026-edaf4030deb7b.jpg	2018-02-18	17	everyone	delayed	3	0	\N	2026-02-20 20:42:23.191919+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771620140026-edaf4030deb7b.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771620140026-edaf4030deb7b.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
132	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019881390-9c941b93700a48.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019881390-9c941b93700a48.jpg	2019-09-14	19	everyone	delayed	3	0	\N	2026-02-25 11:44:47.638369+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019881390-9c941b93700a48.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019881390-9c941b93700a48.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
133	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019886371-afa86060c6fca8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019886371-afa86060c6fca8.jpg	2019-09-14	19	everyone	delayed	3	0	\N	2026-02-25 11:44:52.157189+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019886371-afa86060c6fca8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019886371-afa86060c6fca8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
125	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772017716742-9283a23f359e2.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772017716742-9283a23f359e2.jpg	2018-10-13	36	everyone	delayed	3	0	\N	2026-02-25 11:08:43.234741+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772017716742-9283a23f359e2.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772017716742-9283a23f359e2.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
74	a8efc3b0-538d-4293-9af6-7d535991faea	1769796254542-cedfa72be5217.png	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/1769796254542-cedfa72be5217.png	2025-12-31	43	everyone	delayed	3	0	\N	2026-01-30 18:04:18.569869+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	test-koment	\N	\N	\N	\N	\N	\N	f	f	\N	\N
136	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1772099609193-a2d57e1dbda37.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1772099609193-a2d57e1dbda37.jpg	2019-10-12	33	everyone	delayed	3	0	\N	2026-02-26 09:53:33.499153+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f769233e-5132-4313-8ff6-5505b86791ed/1772099609193-a2d57e1dbda37.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1772099609193-a2d57e1dbda37.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
106	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1771244418530-0d333251817008.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1771244418530-0d333251817008.jpg	2019-09-15	33	everyone	delayed	3	0	\N	2026-02-16 12:20:20.465893+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	sport	\N	\N	\N	2026-02-20 08:36:09.096+00	a8efc3b0-538d-4293-9af6-7d535991faea	\N	\N	f	f	\N	\N
112	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686139074-08950cb788b44.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686139074-08950cb788b44.jpg	2019-09-14	19	everyone	delayed	3	0	\N	2026-02-21 15:02:22.765878+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686139074-08950cb788b44.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686139074-08950cb788b44.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
151	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772920937617-badeeb26238718.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920937617-badeeb26238718.jpg	2018-02-18	35	everyone	delayed	3	0	\N	2026-03-07 22:02:22.945319+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1772920937617-badeeb26238718.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772920937617-badeeb26238718.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
155	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1774952168146-0ab99a78b2305.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1774952168146-0ab99a78b2305.jpg	2025-01-27	42	everyone	delayed	3	0	\N	2026-03-31 10:16:08.632194+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1774952168146-0ab99a78b2305.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1774952168146-0ab99a78b2305.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
110	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771685001730-da4b478fef3a18.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771685001730-da4b478fef3a18.jpg	2019-09-29	19	everyone	delayed	3	0	\N	2026-02-21 14:43:23.355124+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771685001730-da4b478fef3a18.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771685001730-da4b478fef3a18.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
129	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019645224-8d601f2fd87918.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019645224-8d601f2fd87918.jpg	2019-09-29	19	everyone	delayed	3	0	\N	2026-02-25 11:40:49.220244+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019645224-8d601f2fd87918.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019645224-8d601f2fd87918.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
117	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771753680741-dbb8782c2ac278.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771753680741-dbb8782c2ac278.jpg	2018-10-13	36	everyone	delayed	3	0	\N	2026-02-22 09:48:04.348348+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771753680741-dbb8782c2ac278.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771753680741-dbb8782c2ac278.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
134	f769233e-5132-4313-8ff6-5505b86791ed	f769233e-5132-4313-8ff6-5505b86791ed/1772090534409-0d7d6bbac6ba8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1772090534409-0d7d6bbac6ba8.jpg	2019-09-15	33	everyone	delayed	3	0	\N	2026-02-26 07:22:18.087466+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f769233e-5132-4313-8ff6-5505b86791ed/1772090534409-0d7d6bbac6ba8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f769233e-5132-4313-8ff6-5505b86791ed/1772090534409-0d7d6bbac6ba8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
130	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019855485-98488029c3d89.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019855485-98488029c3d89.jpg	2019-09-21	19	everyone	delayed	3	0	\N	2026-02-25 11:44:20.394854+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	xx	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019855485-98488029c3d89.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1772019855485-98488029c3d89.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
118	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1771753685008-3f8d21646e32a8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771753685008-3f8d21646e32a8.jpg	2018-10-14	36	everyone	delayed	3	0	\N	2026-02-22 09:48:08.678459+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	a8efc3b0-538d-4293-9af6-7d535991faea/1771753685008-3f8d21646e32a8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1771753685008-3f8d21646e32a8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
121	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1772015813943-d6301c833abae8.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015813943-d6301c833abae8.jpg	2018-02-18	35	everyone	delayed	3	0	\N	2026-02-25 10:36:58.528028+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	test	a8efc3b0-538d-4293-9af6-7d535991faea/1772015813943-d6301c833abae8.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1772015813943-d6301c833abae8.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
113	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686143341-8a9e30e772e78.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686143341-8a9e30e772e78.jpg	2019-09-14	19	everyone	delayed	3	0	\N	2026-02-21 15:02:26.968435+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686143341-8a9e30e772e78.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686143341-8a9e30e772e78.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
111	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686133344-0a3ff2dc3dc478.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686133344-0a3ff2dc3dc478.jpg	2019-09-14	19	everyone	delayed	3	0	\N	2026-02-21 15:02:18.384242+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	bezna	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686133344-0a3ff2dc3dc478.thumb.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/1771686133344-0a3ff2dc3dc478.thumb.jpg	\N	\N	\N	\N	f	f	\N	\N
71	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea/1769192488186-d96f5587620878.jpg	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/post-images/a8efc3b0-538d-4293-9af6-7d535991faea/1769192488186-d96f5587620878.jpg	2021-10-09	39	everyone	delayed	3	0	\N	2026-01-23 18:21:30.561575+00	2026-04-08 06:53:24.244419+00	\N	full_body	t	v_plavkach	pohled ven z balkonu	\N	\N	\N	\N	\N	\N	f	f	\N	\N
\.


--
-- TOC entry 4924 (class 0 OID 157379)
-- Dependencies: 433
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_reactions (message_id, user_id, emoji, created_at) FROM stdin;
17	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	👍	2026-03-30 19:33:43.608474+00
20	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	👍	2026-03-30 19:35:12.749189+00
12	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	👍	2026-03-30 19:35:18.273328+00
14	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	😉	2026-03-30 19:35:23.864404+00
20	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	😉	2026-03-30 19:35:35.990721+00
20	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	🙂	2026-03-30 19:35:40.800932+00
1	a8efc3b0-538d-4293-9af6-7d535991faea	👍	2026-03-30 19:41:27.89212+00
2	a8efc3b0-538d-4293-9af6-7d535991faea	👍	2026-03-30 19:41:55.067556+00
2	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	👍	2026-03-30 20:04:06.308695+00
1	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	😉	2026-03-30 20:04:09.859644+00
1	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	🙂	2026-03-30 20:04:20.107685+00
23	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	👍	2026-04-01 18:51:31.302365+00
\.


--
-- TOC entry 4919 (class 0 OID 157172)
-- Dependencies: 428
-- Data for Name: message_thread_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_thread_participants (thread_id, user_id, joined_at, last_read_message_id, last_read_at, is_archived, is_muted, thread_folder, is_starred) FROM stdin;
7	f769233e-5132-4313-8ff6-5505b86791ed	2026-03-30 09:50:36.799049+00	8	2026-03-30 11:07:30.039715+00	f	f	inbox	f
7	a8efc3b0-538d-4293-9af6-7d535991faea	2026-03-30 09:50:36.799049+00	10	2026-03-30 11:08:06.396686+00	f	f	inbox	f
15	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-24 08:58:05.827373+00	\N	\N	f	f	inbox	f
14	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24 08:57:29.47263+00	28	2026-04-24 12:32:02.623478+00	f	f	inbox	f
18	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-24 12:32:53.989082+00	\N	\N	f	f	inbox	f
18	f769233e-5132-4313-8ff6-5505b86791ed	2026-04-24 12:32:53.989082+00	\N	\N	f	f	inbox	f
15	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-24 08:58:05.827373+00	34	2026-04-24 12:38:40.402624+00	f	f	inbox	f
10	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-01 09:45:36.15299+00	24	2026-04-01 18:51:14.784+00	f	f	inbox	f
10	a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-01 09:45:36.15299+00	24	2026-04-07 07:31:20.824361+00	f	f	inbox	f
6	a8efc3b0-538d-4293-9af6-7d535991faea	2026-03-30 09:45:48.15596+00	25	2026-04-21 06:26:05.451+00	f	f	inbox	f
14	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-24 08:57:29.47263+00	\N	\N	f	f	inbox	f
14	f769233e-5132-4313-8ff6-5505b86791ed	2026-04-24 08:57:29.47263+00	\N	\N	f	f	inbox	f
18	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24 12:32:53.989082+00	\N	2026-04-24 13:06:51.36614+00	f	f	inbox	f
15	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24 08:58:05.827373+00	34	2026-04-24 13:06:52.26564+00	f	f	inbox	f
14	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-24 08:57:29.47263+00	26	2026-04-24 08:59:37.380758+00	f	f	inbox	f
17	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-24 09:05:20.311951+00	\N	\N	f	f	inbox	f
6	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-03-30 09:45:48.15596+00	25	2026-04-24 09:11:34.190826+00	f	f	inbox	f
17	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24 09:05:20.311951+00	31	2026-04-24 09:19:28.443783+00	f	f	inbox	f
\.


--
-- TOC entry 4923 (class 0 OID 157349)
-- Dependencies: 432
-- Data for Name: message_thread_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_thread_reports (id, thread_id, reporter_user_id, reason, details, status, admin_note, reviewed_at, reviewed_by, created_at) FROM stdin;
\.


--
-- TOC entry 4918 (class 0 OID 157144)
-- Dependencies: 427
-- Data for Name: message_threads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_threads (id, thread_kind, connection_request_id, connection_user_id_a, connection_user_id_b, created_at, updated_at, last_message_at, last_message_preview, subject_user_id, created_by_user_id) FROM stdin;
18	moderator_outreach	\N	a8efc3b0-538d-4293-9af6-7d535991faea	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2026-04-24 12:32:53.989082+00	2026-04-24 13:01:23.598875+00	\N	\N	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	a8efc3b0-538d-4293-9af6-7d535991faea
7	connected_dm	\N	a8efc3b0-538d-4293-9af6-7d535991faea	f769233e-5132-4313-8ff6-5505b86791ed	2026-03-30 09:50:36.799049+00	2026-03-30 16:07:59.543662+00	2026-03-30 11:07:54.779694+00	jo, děkuji za zprávu, Mastře Blastře!😎	\N	\N
14	moderator_outreach	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24 08:57:29.47263+00	2026-04-24 08:59:51.582837+00	2026-04-24 08:59:51.582837+00	ahoj moderátore 🙂	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a8efc3b0-538d-4293-9af6-7d535991faea
10	connected_dm	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-01 09:45:36.15299+00	2026-04-01 18:51:14.784+00	2026-04-01 18:51:14.784+00	Ahoj Dominiku, promiň za pozdní reakci. Mám teď hodně práce. Díky ale za optání, mám se výborně, jako vždy. A ty jak?	\N	\N
6	connected_dm	\N	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a8efc3b0-538d-4293-9af6-7d535991faea	2026-03-30 09:45:48.15596+00	2026-04-21 06:26:05.451+00	2026-04-21 06:26:05.451+00	jo 👍	\N	\N
17	admin_support	\N	a8efc3b0-538d-4293-9af6-7d535991faea	\N	2026-04-24 09:05:20.311951+00	2026-04-24 09:17:54.074873+00	2026-04-24 09:17:54.074873+00	reakce na test zprávy z helpu	a8efc3b0-538d-4293-9af6-7d535991faea	a8efc3b0-538d-4293-9af6-7d535991faea
15	admin_support	\N	a8efc3b0-538d-4293-9af6-7d535991faea	\N	2026-04-24 08:58:05.827373+00	2026-04-24 12:38:33.756849+00	2026-04-24 12:38:33.756849+00	reakce od správce	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a8efc3b0-538d-4293-9af6-7d535991faea
\.


--
-- TOC entry 4921 (class 0 OID 157192)
-- Dependencies: 430
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, thread_id, sender_user_id, body, created_at, edited_at, deleted_at, reply_to_message_id) FROM stdin;
1	6	a8efc3b0-538d-4293-9af6-7d535991faea	ahoj, zkouška spojení :-)	2026-03-30 09:46:05.14746+00	\N	\N	\N
2	6	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	super, zpráva mi došla ;-)	2026-03-30 09:47:16.326273+00	\N	\N	\N
3	6	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2. test	2026-03-30 09:47:33.895215+00	\N	\N	\N
4	6	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	nová konverzace?	2026-03-30 09:48:00.593638+00	\N	\N	\N
5	7	a8efc3b0-538d-4293-9af6-7d535991faea	test	2026-03-30 09:50:55.067685+00	\N	\N	\N
6	6	a8efc3b0-538d-4293-9af6-7d535991faea	tak to je přímo skvělé! :-)	2026-03-30 09:53:05.529151+00	\N	\N	\N
7	6	a8efc3b0-538d-4293-9af6-7d535991faea	😢🔥	2026-03-30 09:54:35.84681+00	\N	\N	\N
8	7	a8efc3b0-538d-4293-9af6-7d535991faea	paráda, funguje to ❤️😎🙏	2026-03-30 09:54:57.823684+00	\N	\N	\N
9	6	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	test	2026-03-30 10:51:18.648529+00	\N	\N	\N
10	7	f769233e-5132-4313-8ff6-5505b86791ed	jo, děkuji za zprávu, Mastře Blastře!😎	2026-03-30 11:07:54.779694+00	\N	\N	\N
11	6	a8efc3b0-538d-4293-9af6-7d535991faea	test odpovědi🎉	2026-03-30 19:16:07.050535+00	\N	\N	1
12	6	a8efc3b0-538d-4293-9af6-7d535991faea	test odpovědi na moji zprávu😍	2026-03-30 19:18:43.72474+00	\N	\N	11
13	6	a8efc3b0-538d-4293-9af6-7d535991faea	> test odpovědi🎉.... testuji odpověď	2026-03-30 19:19:37.420476+00	\N	\N	11
14	6	a8efc3b0-538d-4293-9af6-7d535991faea	> test\nodpověď na zprávu\n\n👍	2026-03-30 19:19:54.87172+00	\N	\N	9
15	6	a8efc3b0-538d-4293-9af6-7d535991faea	moje reakce	2026-03-30 19:23:14.397721+00	\N	\N	6
16	6	a8efc3b0-538d-4293-9af6-7d535991faea	odpověď na zprávui\n\n😉	2026-03-30 19:23:54.310806+00	\N	\N	2
17	6	a8efc3b0-538d-4293-9af6-7d535991faea	test odpovědi	2026-03-30 19:26:46.061764+00	\N	\N	2
18	6	a8efc3b0-538d-4293-9af6-7d535991faea	xs	2026-03-30 19:28:42.944115+00	\N	\N	2
19	6	a8efc3b0-538d-4293-9af6-7d535991faea	test znovu 👍	2026-03-30 19:29:06.238494+00	\N	\N	4
20	6	a8efc3b0-538d-4293-9af6-7d535991faea	krása!!!!!!!!!!!!!!!!👍	2026-03-30 19:30:40.30148+00	\N	\N	2
21	6	a8efc3b0-538d-4293-9af6-7d535991faea	x	2026-03-30 19:32:47.498626+00	\N	\N	\N
22	6	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	já vím ;-)😉	2026-03-30 19:34:00.153885+00	\N	\N	20
23	10	a5b9777a-748c-4dbf-8c94-ea42abff4636	Ahoj Andreo, jak se máš?	2026-04-01 11:08:49.49713+00	\N	\N	\N
24	10	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	Ahoj Dominiku, promiň za pozdní reakci. Mám teď hodně práce. Díky ale za optání, mám se výborně, jako vždy. A ty jak?	2026-04-01 18:51:15.697027+00	\N	\N	\N
25	6	a8efc3b0-538d-4293-9af6-7d535991faea	jo 👍	2026-04-21 06:26:05.799932+00	\N	\N	4
26	14	a8efc3b0-538d-4293-9af6-7d535991faea	test zprávy od moderátora	2026-04-24 08:57:44.833262+00	\N	\N	\N
27	15	a8efc3b0-538d-4293-9af6-7d535991faea	test zprávy od admina	2026-04-24 08:58:15.395654+00	\N	\N	\N
28	14	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	ahoj moderátore 🙂	2026-04-24 08:59:51.582837+00	\N	\N	\N
29	15	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	ahoj admine 😉	2026-04-24 09:01:16.939108+00	\N	\N	\N
30	17	a8efc3b0-538d-4293-9af6-7d535991faea	test zprávy z helpu	2026-04-24 09:05:20.311951+00	\N	\N	\N
31	17	a8efc3b0-538d-4293-9af6-7d535991faea	reakce na test zprávy z helpu	2026-04-24 09:17:54.074873+00	\N	\N	\N
32	15	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	test zprávy z helpu - od AI. Andrea	2026-04-24 09:25:45.38917+00	\N	\N	\N
33	15	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	test č.2 na správce	2026-04-24 12:15:30.482398+00	\N	\N	\N
34	15	a8efc3b0-538d-4293-9af6-7d535991faea	reakce od správce	2026-04-24 12:38:33.756849+00	\N	\N	\N
\.


--
-- TOC entry 4916 (class 0 OID 157118)
-- Dependencies: 425
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, actor_user_id, type, entity_id, is_read, read_at, created_at, entity_bigint_id) FROM stdin;
1	a8efc3b0-538d-4293-9af6-7d535991faea	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	connection_request_accepted	abe45f82-d646-4d31-a839-7c4c247c5f61	t	2026-03-29 18:23:20.438+00	2026-03-29 18:21:17.566393+00	\N
2	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a5b9777a-748c-4dbf-8c94-ea42abff4636	connection_request_received	1f1c7f65-c1d1-4fc5-ae92-a4930b69359b	t	2026-04-01 09:22:47.516+00	2026-04-01 09:22:25.53831+00	\N
3	a5b9777a-748c-4dbf-8c94-ea42abff4636	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	connection_request_accepted	1f1c7f65-c1d1-4fc5-ae92-a4930b69359b	t	2026-04-01 09:23:13.976+00	2026-04-01 09:22:52.695506+00	\N
4	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	a8efc3b0-538d-4293-9af6-7d535991faea	connection_request_received	743739e5-52a8-4deb-b032-7c5647f735ac	t	2026-04-07 11:03:30.759+00	2026-04-07 09:04:26.852324+00	\N
5	a8efc3b0-538d-4293-9af6-7d535991faea	a5b9777a-748c-4dbf-8c94-ea42abff4636	connection_request_received	3386a016-d791-4502-8310-999863ce0936	t	2026-04-08 12:40:53.226+00	2026-04-08 12:34:21.47201+00	\N
7	a8efc3b0-538d-4293-9af6-7d535991faea	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	photo_commented	\N	t	2026-04-10 19:00:02.39+00	2026-04-10 17:37:58.017831+00	191
8	a8efc3b0-538d-4293-9af6-7d535991faea	a5b9777a-748c-4dbf-8c94-ea42abff4636	photo_commented	\N	t	2026-04-12 07:07:37.752+00	2026-04-12 06:53:13.092748+00	198
9	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	a8efc3b0-538d-4293-9af6-7d535991faea	follow_started	\N	t	2026-04-16 20:44:54.521+00	2026-04-16 20:43:59.820442+00	\N
10	a5b9777a-748c-4dbf-8c94-ea42abff4636	a8efc3b0-538d-4293-9af6-7d535991faea	photo_commented	\N	t	2026-04-21 12:43:07.175+00	2026-04-21 08:58:51.20135+00	163
6	a5b9777a-748c-4dbf-8c94-ea42abff4636	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	photo_commented	\N	t	2026-04-21 12:43:07.175+00	2026-04-10 16:52:39.66569+00	172
11	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	a5b9777a-748c-4dbf-8c94-ea42abff4636	connection_request_received	efbf2fad-241c-4759-914c-db655dd32e96	f	\N	2026-04-22 06:29:20.90961+00	\N
12	a5b9777a-748c-4dbf-8c94-ea42abff4636	a8efc3b0-538d-4293-9af6-7d535991faea	connection_request_accepted	3386a016-d791-4502-8310-999863ce0936	f	\N	2026-04-24 09:02:17.480017+00	\N
\.


--
-- TOC entry 4899 (class 0 OID 35480)
-- Dependencies: 403
-- Data for Name: post_albums; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_albums (post_id, album_id, sort_order, created_at) FROM stdin;
\.


--
-- TOC entry 4898 (class 0 OID 35442)
-- Dependencies: 402
-- Data for Name: post_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_images (post_id, image_id, sort_order, "position", created_at) FROM stdin;
61	141	0	\N	2026-02-28 19:28:13.673393+00
62	142	0	\N	2026-02-28 19:32:59.458876+00
62	143	0	\N	2026-02-28 19:32:59.458876+00
62	144	0	\N	2026-02-28 19:32:59.458876+00
62	145	0	\N	2026-02-28 19:32:59.458876+00
62	146	0	\N	2026-02-28 19:32:59.458876+00
62	147	0	\N	2026-02-28 19:32:59.458876+00
66	157	0	\N	2026-04-01 08:56:40.185772+00
66	158	0	\N	2026-04-01 08:56:40.185772+00
66	159	0	\N	2026-04-01 08:56:40.185772+00
66	160	0	\N	2026-04-01 08:56:40.185772+00
66	161	0	\N	2026-04-01 08:56:40.185772+00
66	162	0	\N	2026-04-01 08:56:40.185772+00
67	163	0	\N	2026-04-01 09:02:00.501906+00
67	164	0	\N	2026-04-01 09:02:00.501906+00
67	165	0	\N	2026-04-01 09:02:00.501906+00
67	166	0	\N	2026-04-01 09:02:00.501906+00
67	167	0	\N	2026-04-01 09:02:00.501906+00
67	168	0	\N	2026-04-01 09:02:00.501906+00
68	169	0	\N	2026-04-01 18:29:42.630491+00
68	170	0	\N	2026-04-01 18:29:42.630491+00
68	171	0	\N	2026-04-01 18:29:42.630491+00
68	172	0	\N	2026-04-01 18:29:42.630491+00
68	173	0	\N	2026-04-01 18:29:42.630491+00
68	174	0	\N	2026-04-01 18:29:42.630491+00
68	175	0	\N	2026-04-01 18:29:42.630491+00
68	176	0	\N	2026-04-01 18:29:42.630491+00
69	177	0	\N	2026-04-01 18:44:58.22234+00
69	178	0	\N	2026-04-01 18:44:58.22234+00
69	179	0	\N	2026-04-01 18:44:58.22234+00
69	180	0	\N	2026-04-01 18:44:58.22234+00
69	181	0	\N	2026-04-01 18:44:58.22234+00
69	182	0	\N	2026-04-01 18:44:58.22234+00
69	183	0	\N	2026-04-01 18:44:58.22234+00
70	184	0	\N	2026-04-01 18:53:29.756877+00
70	185	0	\N	2026-04-01 18:53:29.756877+00
70	186	0	\N	2026-04-01 18:53:29.756877+00
71	187	0	\N	2026-04-01 18:55:16.29106+00
71	188	0	\N	2026-04-01 18:55:16.29106+00
71	189	0	\N	2026-04-01 18:55:16.29106+00
71	190	0	\N	2026-04-01 18:55:16.29106+00
72	191	0	\N	2026-04-08 07:26:04.056618+00
72	192	0	\N	2026-04-08 07:26:04.056618+00
72	193	0	\N	2026-04-08 07:26:04.056618+00
72	194	0	\N	2026-04-08 07:26:04.056618+00
72	195	0	\N	2026-04-08 07:26:04.056618+00
72	196	0	\N	2026-04-08 07:26:04.056618+00
72	197	0	\N	2026-04-08 07:26:04.056618+00
72	198	0	\N	2026-04-08 07:26:04.056618+00
72	199	0	\N	2026-04-08 07:26:04.056618+00
72	200	0	\N	2026-04-08 07:26:04.056618+00
72	201	0	\N	2026-04-08 07:26:04.056618+00
73	203	0	\N	2026-04-10 08:30:22.973172+00
73	204	0	\N	2026-04-10 08:30:22.973172+00
73	205	0	\N	2026-04-10 08:30:22.973172+00
73	206	0	\N	2026-04-10 08:30:22.973172+00
73	207	0	\N	2026-04-10 08:30:22.973172+00
73	208	0	\N	2026-04-10 08:30:22.973172+00
74	209	0	\N	2026-04-13 07:29:15.17873+00
74	210	0	\N	2026-04-13 07:29:15.17873+00
74	212	0	\N	2026-04-13 07:29:15.17873+00
74	213	0	\N	2026-04-13 07:29:15.17873+00
74	214	0	\N	2026-04-13 07:29:15.17873+00
74	215	0	\N	2026-04-13 07:29:15.17873+00
74	216	0	\N	2026-04-13 07:29:15.17873+00
75	217	0	\N	2026-04-13 07:31:55.541076+00
75	218	0	\N	2026-04-13 07:31:55.541076+00
75	219	0	\N	2026-04-13 07:31:55.541076+00
75	220	0	\N	2026-04-13 07:31:55.541076+00
75	221	0	\N	2026-04-13 07:31:55.541076+00
75	222	0	\N	2026-04-13 07:31:55.541076+00
75	223	0	\N	2026-04-13 07:31:55.541076+00
76	224	0	\N	2026-04-16 20:46:12.904891+00
76	225	0	\N	2026-04-16 20:46:12.904891+00
76	226	0	\N	2026-04-16 20:46:12.904891+00
76	227	0	\N	2026-04-16 20:46:12.904891+00
76	228	0	\N	2026-04-16 20:46:12.904891+00
76	229	0	\N	2026-04-16 20:46:12.904891+00
77	230	0	\N	2026-04-19 17:46:11.400729+00
\.


--
-- TOC entry 4929 (class 0 OID 158599)
-- Dependencies: 438
-- Data for Name: post_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_reports (id, post_id, reporter_user_id, reason, details, status, admin_note, reviewed_at, reviewed_by, created_at) FROM stdin;
\.


--
-- TOC entry 4949 (class 0 OID 168276)
-- Dependencies: 462
-- Data for Name: post_stories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_stories (id, post_id, author_user_id, body, created_at, updated_at, hidden_by_moderation, hidden_by_moderation_at, hidden_by_moderation_by, hidden_by_suspension) FROM stdin;
\.


--
-- TOC entry 4951 (class 0 OID 168306)
-- Dependencies: 464
-- Data for Name: post_story_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_story_images (id, story_id, uploader_user_id, storage_path, public_url, storage_path_medium, public_url_medium, storage_path_thumb, public_url_thumb, sort_order, alt_text, created_at, hidden_by_moderation, hidden_by_suspension) FROM stdin;
\.


--
-- TOC entry 4952 (class 0 OID 168328)
-- Dependencies: 465
-- Data for Name: post_story_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_story_likes (story_id, user_id, reaction, created_at) FROM stdin;
\.


--
-- TOC entry 4954 (class 0 OID 168349)
-- Dependencies: 467
-- Data for Name: post_story_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_story_reports (id, story_id, reporter_user_id, reason, details, status, created_at, reviewed_at, reviewed_by, admin_note) FROM stdin;
\.


--
-- TOC entry 4903 (class 0 OID 35665)
-- Dependencies: 407
-- Data for Name: post_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_views (id, post_id, viewer_user_id, viewed_at) FROM stdin;
\.


--
-- TOC entry 4897 (class 0 OID 35405)
-- Dependencies: 401
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, author_user_id, text, subtitle, time_label, visibility, views_count, created_at, updated_at, pending_album, pending_album_title, images_count, albums_count, cover_image_id, title, body, album_id, hidden_by_suspension) FROM stdin;
71	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a		\N	\N	everyone	0	2026-04-01 18:55:16.179551+00	2026-04-01 18:55:16.179551+00	f	\N	4	0	\N	Pár mých fotek	\N	\N	f
73	a8efc3b0-538d-4293-9af6-7d535991faea	... méně vlasů jsem občas nahradil méně častým holením 👀	\N	\N	everyone	0	2026-04-10 08:30:22.823733+00	2026-04-10 08:30:22.823733+00	f	\N	6	0	\N	čtvrtý křížek na krku	\N	\N	f
72	a8efc3b0-538d-4293-9af6-7d535991faea	jde o směs fotek z předfotříkovské doby 🙂	\N	\N	everyone	0	2026-04-08 07:26:03.914623+00	2026-04-08 07:26:03.914623+00	f	\N	11	0	\N	Fotky z archivu	\N	\N	f
68	a5b9777a-748c-4dbf-8c94-ea42abff4636	tak různě posbírané...	\N	\N	everyone	0	2026-04-01 18:29:42.447852+00	2026-04-01 18:29:42.447852+00	f	\N	8	0	\N	Fotky z doby nedávno minulé...	\N	\N	f
75	e0554f1c-b98d-4031-86f3-0965ed1f45e0	znovu jsem začal po delší době sportovat	\N	\N	everyone	0	2026-04-13 07:31:55.432555+00	2026-04-13 07:31:55.432555+00	f	\N	7	0	\N	Výběr posledních fotek	\N	\N	f
76	f4c293c0-31c7-4278-8ebd-7fb53d21a6c4		\N	\N	everyone	0	2026-04-16 20:46:12.742251+00	2026-04-16 20:46:12.742251+00	f	\N	6	0	\N	Několik poslední fotek	\N	\N	f
77	a8efc3b0-538d-4293-9af6-7d535991faea		\N	\N	everyone	0	2026-04-19 17:46:11.18515+00	2026-04-19 17:46:11.18515+00	f	\N	1	0	\N	test rozmazání	\N	\N	f
61	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	fotky z mládí	\N	\N	everyone	0	2026-02-28 19:28:13.508924+00	2026-02-28 19:28:13.508924+00	f	\N	1	0	\N	Můj první post	\N	\N	f
62	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	trochu vzpomínek...	\N	\N	everyone	0	2026-02-28 19:32:59.360743+00	2026-02-28 19:32:59.360743+00	f	\N	6	0	\N	Fotky z mládí	\N	\N	f
74	e0554f1c-b98d-4031-86f3-0965ed1f45e0	z prváku na vysoké...🙂	\N	\N	everyone	0	2026-04-13 07:29:14.99436+00	2026-04-13 07:29:14.99436+00	f	\N	7	0	\N	Přelom tisíciletí	\N	\N	f
66	a5b9777a-748c-4dbf-8c94-ea42abff4636	... středověk ;-)	\N	\N	everyone	0	2026-04-01 08:56:40.058203+00	2026-04-01 08:56:40.058203+00	f	\N	6	0	\N	Fotky z mládí	\N	\N	f
69	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	🙂	\N	\N	everyone	0	2026-04-01 18:44:58.109084+00	2026-04-01 18:44:58.109084+00	f	\N	7	0	\N	Delší historie	\N	\N	f
67	a5b9777a-748c-4dbf-8c94-ea42abff4636	Tehdy jsem ale vypadal :-)	\N	\N	everyone	0	2026-04-01 09:02:00.389192+00	2026-04-01 09:02:00.389192+00	f	\N	6	0	\N	Fotřík	\N	\N	f
70	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	🙂	\N	\N	everyone	0	2026-04-01 18:53:29.585174+00	2026-04-01 18:53:29.585174+00	f	\N	3	0	\N	Už dávno mamina!	\N	\N	f
\.


--
-- TOC entry 4944 (class 0 OID 167963)
-- Dependencies: 457
-- Data for Name: profile_visits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profile_visits (id, viewed_user_id, viewer_user_id, viewed_at) FROM stdin;
1	498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-20 06:19:43.707019+00
2	a8efc3b0-538d-4293-9af6-7d535991faea	a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-21 12:50:50.224305+00
\.


--
-- TOC entry 4939 (class 0 OID 166757)
-- Dependencies: 452
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sources (id, name, base_url, rss_url, is_active, created_at) FROM stdin;
7c673c44-fdf7-4543-8727-6f5200b269c0	iROZHLAS	https://www.irozhlas.cz	https://www.irozhlas.cz/rss/irozhlas	t	2026-04-15 06:46:00.987834+00
c43fad3c-b51d-4f1d-a37a-e7f91c5931f7	Seznam Zprávy	https://www.seznamzpravy.cz	https://www.seznamzpravy.cz/rss	t	2026-04-15 06:46:00.987834+00
70b4b219-51d3-45ad-82d8-da149a91308b	E15	https://www.e15.cz	https://www.e15.cz/rss	t	2026-04-15 06:46:00.987834+00
cee6f99e-74bb-44a5-a496-86f9322b129b	Novinky.cz	https://www.novinky.cz	https://www.novinky.cz/rss	t	2026-04-15 06:46:00.987834+00
2d961c92-4323-4de2-a4dd-5dc73ad54adf	ČT24	https://ct24.ceskatelevize.cz	https://ct24.ceskatelevize.cz/rss/hlavni-zpravy	t	2026-04-15 06:46:00.987834+00
\.


--
-- TOC entry 4889 (class 0 OID 26811)
-- Dependencies: 393
-- Data for Name: user_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_contacts (id, user_id, contact_user_id, status, created_at) FROM stdin;
\.


--
-- TOC entry 4912 (class 0 OID 139263)
-- Dependencies: 419
-- Data for Name: user_daily_logins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_daily_logins (id, user_id, login_day, created_at) FROM stdin;
\.


--
-- TOC entry 4926 (class 0 OID 158553)
-- Dependencies: 435
-- Data for Name: user_presence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_presence (user_id, last_seen_at) FROM stdin;
a5b9777a-748c-4dbf-8c94-ea42abff4636	2026-04-09 09:53:07.090512+00
a8efc3b0-538d-4293-9af6-7d535991faea	2026-04-24 12:56:28.929027+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-24 13:38:49.052506+00
\.


--
-- TOC entry 4890 (class 0 OID 35140)
-- Dependencies: 394
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (user_id, display_name, avatar_url, bio, date_of_birth, gender, city, country, default_post_visibility, default_album_visibility, default_image_visibility, default_age_reveal_mode, default_age_reveal_delay_days, profile_data, created_at, updated_at, super_user, allow_connection_requests, allow_following, allow_connections, bio_contacts, bio_contacts_hidden, occupation, occupation_hidden, is_student, is_student_hidden, education_level, education_level_hidden, native_languages, native_languages_hidden, other_languages, other_languages_hidden, relationship_status, relationship_status_hidden, motivation_text, motivation_text_hidden, height_cm, height_cm_hidden, weight_kg, weight_kg_hidden, about_me, about_me_hidden, primary_interests, primary_interests_hidden, interests, interests_custom, interests_hidden, life_goals, life_goals_custom, life_goals_hidden, self_view, self_view_hidden, improvement_areas, improvement_areas_custom, improvement_areas_hidden, activities, activities_custom, activities_hidden, diet_preference, diet_preference_hidden, alcohol_use, alcohol_use_hidden, smoking, smoking_hidden, drug_light, drug_hard, drugs_hidden, mindset, mindset_hidden, life_pace, life_pace_hidden, anonymous_guesses_default, aw_guesses_count, aw_accuracy_sum, allow_age_visible, role, age_reveal_mode, age_reveal_delay_days, comments_visibility, personalization_ads_consent, personalization_ads_consent_at, notify_connection_requests, notify_connection_declined, notify_contact_removed, notify_follow_started, notify_follow_stopped, notify_photo_commented, wellbeing_mood_public_default, wellbeing_energy_public_default, wellbeing_sleep_public_default, wellbeing_movement_public_default, wellbeing_water_public_default, wellbeing_food_public_default, wellbeing_mood_visibility_default, wellbeing_energy_visibility_default, wellbeing_sleep_visibility_default, wellbeing_movement_visibility_default, wellbeing_water_visibility_default, wellbeing_food_visibility_default, wellbeing_daily_entry_visibility_default, registration_number, account_status, suspended_at, suspended_by, suspension_reason) FROM stdin;
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	Michael-Seznam-	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/f4c293c0-31c7-4278-8ebd-7fb53d21a6c4/dbabbf33-a30d-4d09-b102-e4988e2fc79b.png		1989-01-08	\N	\N	\N	private	private	private	delayed	3	\N	1999-12-14 18:25:01+00	2026-04-10 16:57:51.499113+00	f	t	t	t	\N	f	\N	f	t	f	Střední škola s maturitou	f	{Čeština}	f	\N	f	Single	f	\N	f	\N	f	\N	f	\N	f	{"Relax & mindfulness"}	f	{Audioknihy,Knihy}	\N	f	\N	\N	f	\N	f	\N	\N	f	\N	\N	f	Běžná	f	\N	f	Nekouřím	f	\N	\N	f	Klid	f	Aktivní	f	f	65	5680.20326257567946751100	t	admin	never	0	everyone	f	\N	t	t	t	t	t	t	f	f	f	f	f	f	private	private	private	private	private	private	private	2	active	\N	\N	\N
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	AI Andrea	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a/avatar.jpg		1966-02-28	\N	\N	\N	everyone	everyone	everyone	delayed	3	\N	2026-02-28 19:18:21.056607+00	2026-04-20 10:51:59.253558+00	f	t	t	t	\N	f	\N	f	f	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	f	\N	f	f	96	8183.34213630844313897100	t	user	never	0	everyone	f	\N	t	t	t	t	t	t	f	f	f	f	f	f	private	private	private	private	private	private	contacts	4	active	\N	\N	\N
a5b9777a-748c-4dbf-8c94-ea42abff4636	AgeWinners uživatel	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a5b9777a-748c-4dbf-8c94-ea42abff4636/avatar.jpg	spisovatel, překladatel a šachista v jedné osobě👀	1966-12-02	\N	\N	\N	everyone	everyone	everyone	delayed	3	\N	2026-04-01 08:44:17.371066+00	2026-04-22 06:28:05.328116+00	f	t	t	t	\N	f	\N	f	f	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	f	\N	f	f	77	6551.54943836573931316800	t	user	never	0	everyone	f	\N	t	t	t	t	t	t	f	f	f	f	f	f	private	private	private	private	private	private	private	5	active	\N	\N	\N
a8efc3b0-538d-4293-9af6-7d535991faea	Michael Borkovec	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/a8efc3b0-538d-4293-9af6-7d535991faea/avatar.png	Hlavně se z toho nezbláznit 😉	1982-07-02	\N	\N	\N	everyone	everyone	everyone	immediate	2	\N	2025-12-14 18:17:55+00	2026-04-21 08:42:12.622587+00	t	t	t	t	... ti, co mne znají, si udělají obrázek o mne sami 😎	f	\N	f	f	f	\N	f	\N	f	\N	f	\N	f	Never give up!	f	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	f	\N	f	t	145	12923.43241701277460705300	t	admin	never	0	everyone	t	2026-04-08 12:10:34.215+00	t	t	t	t	t	t	f	f	f	f	f	f	private	private	private	private	private	private	private	1	active	\N	\N	\N
f769233e-5132-4313-8ff6-5505b86791ed	Borkovec-Z	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/f769233e-5132-4313-8ff6-5505b86791ed/avatar.jpg	...........	1986-07-02	\N	\N	\N	contacts	contacts	contacts	delayed	5	\N	2025-12-20 20:08:40.937476+00	2026-04-16 20:47:28.424755+00	f	t	t	t	\N	f	\N	f	f	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	f	\N	f	f	73	6540.13340781738522620900	t	moderator	never	0	everyone	f	\N	t	t	t	t	t	t	f	f	f	f	f	f	private	private	private	private	private	private	private	3	active	\N	\N	\N
e0554f1c-b98d-4031-86f3-0965ed1f45e0	AI Petr	https://ugfhcnzyfikbwexaitod.supabase.co/storage/v1/object/public/avatars/e0554f1c-b98d-4031-86f3-0965ed1f45e0/avatar.jpg	Jsem AI, stvořily mne nuly a jedničky	1981-05-05	\N	\N	\N	everyone	everyone	everyone	delayed	3	\N	2026-04-13 07:14:33.83645+00	2026-04-13 08:03:59.181566+00	f	t	t	t	Jsem AI, stvořily mne nuly a jedničky	f	\N	f	f	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	\N	f	\N	\N	f	\N	f	\N	f	\N	f	\N	\N	f	\N	f	\N	f	f	27	2533.97803861509128048800	t	user	never	0	everyone	f	\N	t	t	t	t	t	t	f	f	f	f	f	f	private	private	private	private	private	private	private	6	active	\N	\N	\N
\.


--
-- TOC entry 4947 (class 0 OID 168147)
-- Dependencies: 460
-- Data for Name: user_registration_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_registration_orders (user_id, registration_number, auth_created_at, assigned_at) FROM stdin;
a8efc3b0-538d-4293-9af6-7d535991faea	1	2025-12-13 13:35:01.843504+00	2026-04-23 08:52:36.068742+00
f4c293c0-31c7-4278-8ebd-7fb53d21a6c4	2	2025-12-14 09:39:23.012425+00	2026-04-23 08:52:36.068742+00
f769233e-5132-4313-8ff6-5505b86791ed	3	2025-12-20 20:08:40.937816+00	2026-04-23 08:52:36.068742+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	4	2026-02-28 19:18:21.056942+00	2026-04-23 08:52:36.068742+00
a5b9777a-748c-4dbf-8c94-ea42abff4636	5	2026-04-01 08:44:17.371424+00	2026-04-23 08:52:36.068742+00
e0554f1c-b98d-4031-86f3-0965ed1f45e0	6	2026-04-13 07:14:33.838124+00	2026-04-23 08:52:36.068742+00
\.


--
-- TOC entry 4942 (class 0 OID 167930)
-- Dependencies: 455
-- Data for Name: wellbeing_daily_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wellbeing_daily_entries (user_id, entry_date, mood, mood_score, energy_score, sleep_hours, movement_minutes, water_glasses, self_care_done, note, created_at, updated_at, water_liters, food_amount, food_type, mood_public, energy_public, sleep_public, movement_public, water_public, food_public, mood_visibility, energy_visibility, sleep_visibility, movement_visibility, water_visibility, food_visibility, entry_visibility) FROM stdin;
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-01	radost	9	4	8.0	60	\N	f	\N	2026-04-20 07:52:47.001462+00	2026-04-20 08:05:55.906942+00	4.0	\N	\N	f	f	f	f	f	f	private	private	private	private	private	everyone	contacts
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-10	klid	7	6	7.0	30	\N	f	\N	2026-04-20 08:06:59.259265+00	2026-04-20 08:06:59.259265+00	4.5	bezne	bezna	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-08	klid	7	6	7.0	30	\N	f	\N	2026-04-20 08:06:59.259923+00	2026-04-20 08:06:59.259923+00	4.5	bezne	bezna	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-12	klid	7	6	7.0	30	\N	f	\N	2026-04-20 08:06:59.260637+00	2026-04-20 08:06:59.260637+00	4.5	bezne	bezna	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-09	klid	7	6	7.0	30	\N	f	\N	2026-04-20 08:06:59.257961+00	2026-04-20 08:06:59.257961+00	4.5	bezne	bezna	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-11	klid	7	6	7.0	30	\N	f	\N	2026-04-20 08:06:59.27436+00	2026-04-20 08:06:59.27436+00	4.5	bezne	bezna	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-03	radost	9	8	9.0	60	\N	f	\N	2026-04-20 08:13:56.749395+00	2026-04-20 08:13:56.749395+00	4.0	moc	maso	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-05	radost	9	8	9.0	60	\N	f	\N	2026-04-20 08:13:56.761238+00	2026-04-20 08:13:56.761238+00	4.0	moc	maso	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-04	radost	9	8	9.0	60	\N	f	\N	2026-04-20 08:13:56.765814+00	2026-04-20 08:13:56.765814+00	4.0	moc	maso	f	f	f	f	f	f	everyone	everyone	everyone	everyone	everyone	everyone	everyone
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-20	klid	7	7	7.0	30	6	f	\N	2026-04-20 06:37:31.728718+00	2026-04-20 09:04:11.517515+00	3.5	bezne	vyvazena	f	f	f	f	f	f	private	private	private	private	private	everyone	contacts
\.


--
-- TOC entry 4945 (class 0 OID 168005)
-- Dependencies: 458
-- Data for Name: wellbeing_plan_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wellbeing_plan_entries (user_id, plan_date, sleep_hours, movement_minutes, water_liters, food_amount, food_type, created_at, updated_at) FROM stdin;
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-05-09	6.0	20	4.0	bezne	vegetarian	2026-04-20 08:16:33.545964+00	2026-04-20 08:16:53.586881+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-05-10	\N	\N	\N	malo	\N	2026-04-20 08:18:47.488686+00	2026-04-20 08:18:47.488686+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-02	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.780533+00	2026-04-20 09:02:42.780533+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-01	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.790884+00	2026-04-20 09:02:42.790884+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-03	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.791618+00	2026-04-20 09:02:42.791618+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-04	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.863776+00	2026-04-20 09:02:42.863776+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-07	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.868441+00	2026-04-20 09:02:42.868441+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-05	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.879599+00	2026-04-20 09:02:42.879599+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-06	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.891933+00	2026-04-20 09:02:42.891933+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-17	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.890553+00	2026-04-20 09:02:42.890553+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-10	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.892985+00	2026-04-20 09:02:42.892985+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-08	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.902032+00	2026-04-20 09:02:42.902032+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-16	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.900704+00	2026-04-20 09:02:42.900704+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-18	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.898622+00	2026-04-20 09:02:42.898622+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-09	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.903909+00	2026-04-20 09:02:42.903909+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-11	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.909682+00	2026-04-20 09:02:42.909682+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-20	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.964342+00	2026-04-20 09:02:42.964342+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-19	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.97078+00	2026-04-20 09:02:42.97078+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-21	8.0	45	3.5	malo	vyvazena	2026-04-20 09:02:42.97744+00	2026-04-20 09:02:42.97744+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-24	8.0	45	3.5	malo	maso	2026-04-20 09:02:42.995118+00	2026-04-20 09:03:53.053568+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-15	8.0	45	3.5	malo	vegetarian	2026-04-20 09:02:42.918931+00	2026-04-20 09:03:53.053486+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-23	8.0	45	3.5	malo	maso	2026-04-20 09:02:42.991288+00	2026-04-20 09:03:52.992174+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-22	8.0	45	3.5	malo	maso	2026-04-20 09:02:42.984223+00	2026-04-20 09:03:52.993522+00
498ad4d4-c3f7-4f7e-a731-136d8cb5ae7a	2026-04-14	4.0	45	3.5	malo	vegan	2026-04-20 09:02:42.912961+00	2026-04-20 09:21:49.124833+00
\.


--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 404
-- Name: age_guesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.age_guesses_id_seq', 631, true);


--
-- TOC entry 4970 (class 0 OID 0)
-- Dependencies: 397
-- Name: albums_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.albums_id_seq', 34, true);


--
-- TOC entry 4971 (class 0 OID 0)
-- Dependencies: 443
-- Name: comment_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comment_reports_id_seq', 1, false);


--
-- TOC entry 4972 (class 0 OID 0)
-- Dependencies: 422
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comments_id_seq', 23, true);


--
-- TOC entry 4973 (class 0 OID 0)
-- Dependencies: 414
-- Name: image_moderation_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.image_moderation_events_id_seq', 41, true);


--
-- TOC entry 4974 (class 0 OID 0)
-- Dependencies: 412
-- Name: image_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.image_reports_id_seq', 6, true);


--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 395
-- Name: images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.images_id_seq', 248, true);


--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 431
-- Name: message_thread_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_thread_reports_id_seq', 1, false);


--
-- TOC entry 4977 (class 0 OID 0)
-- Dependencies: 426
-- Name: message_threads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_threads_id_seq', 18, true);


--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 429
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 34, true);


--
-- TOC entry 4979 (class 0 OID 0)
-- Dependencies: 424
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 12, true);


--
-- TOC entry 4980 (class 0 OID 0)
-- Dependencies: 437
-- Name: post_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_reports_id_seq', 1, false);


--
-- TOC entry 4981 (class 0 OID 0)
-- Dependencies: 461
-- Name: post_stories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_stories_id_seq', 1, false);


--
-- TOC entry 4982 (class 0 OID 0)
-- Dependencies: 463
-- Name: post_story_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_story_images_id_seq', 1, false);


--
-- TOC entry 4983 (class 0 OID 0)
-- Dependencies: 466
-- Name: post_story_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_story_reports_id_seq', 1, false);


--
-- TOC entry 4984 (class 0 OID 0)
-- Dependencies: 406
-- Name: post_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_views_id_seq', 1, false);


--
-- TOC entry 4985 (class 0 OID 0)
-- Dependencies: 400
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 79, true);


--
-- TOC entry 4986 (class 0 OID 0)
-- Dependencies: 456
-- Name: profile_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.profile_visits_id_seq', 2, true);


--
-- TOC entry 4987 (class 0 OID 0)
-- Dependencies: 392
-- Name: user_contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_contacts_id_seq', 1, false);


--
-- TOC entry 4988 (class 0 OID 0)
-- Dependencies: 418
-- Name: user_daily_logins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_daily_logins_id_seq', 1, false);


--
-- TOC entry 4989 (class 0 OID 0)
-- Dependencies: 459
-- Name: user_registration_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_registration_number_seq', 6, true);


--
-- TOC entry 4286 (class 2606 OID 35569)
-- Name: age_guesses age_guesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.age_guesses
    ADD CONSTRAINT age_guesses_pkey PRIMARY KEY (id);


--
-- TOC entry 4269 (class 2606 OID 35331)
-- Name: album_images album_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_images
    ADD CONSTRAINT album_images_pkey PRIMARY KEY (album_id, image_id);


--
-- TOC entry 4267 (class 2606 OID 35299)
-- Name: albums albums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_pkey PRIMARY KEY (id);


--
-- TOC entry 4373 (class 2606 OID 164252)
-- Name: app_runtime_settings app_runtime_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_runtime_settings
    ADD CONSTRAINT app_runtime_settings_pkey PRIMARY KEY (setting_key);


--
-- TOC entry 4405 (class 2606 OID 166798)
-- Name: article_ai_results article_ai_results_article_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_ai_results
    ADD CONSTRAINT article_ai_results_article_id_key UNIQUE (article_id);


--
-- TOC entry 4407 (class 2606 OID 166796)
-- Name: article_ai_results article_ai_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_ai_results
    ADD CONSTRAINT article_ai_results_pkey PRIMARY KEY (id);


--
-- TOC entry 4398 (class 2606 OID 166777)
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- TOC entry 4402 (class 2606 OID 166779)
-- Name: articles articles_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_url_key UNIQUE (url);


--
-- TOC entry 4392 (class 2606 OID 166734)
-- Name: aw_challenge_images aw_challenge_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_challenge_images
    ADD CONSTRAINT aw_challenge_images_pkey PRIMARY KEY (challenge_id, image_id);


--
-- TOC entry 4389 (class 2606 OID 165606)
-- Name: aw_challenges aw_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_challenges
    ADD CONSTRAINT aw_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4370 (class 2606 OID 164222)
-- Name: aw_user_stats_history aw_user_stats_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_user_stats_history
    ADD CONSTRAINT aw_user_stats_history_pkey PRIMARY KEY (user_id, snapshot_date);


--
-- TOC entry 4356 (class 2606 OID 158541)
-- Name: blocked_users blocked_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (blocker_user_id, blocked_user_id);


--
-- TOC entry 4380 (class 2606 OID 164313)
-- Name: comment_reports comment_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4323 (class 2606 OID 150375)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 4301 (class 2606 OID 63280)
-- Name: connection_requests connection_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_requests
    ADD CONSTRAINT connection_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4292 (class 2606 OID 63136)
-- Name: connections connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_pkey PRIMARY KEY (id);


--
-- TOC entry 4368 (class 2606 OID 164178)
-- Name: hidden_images hidden_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_images
    ADD CONSTRAINT hidden_images_pkey PRIMARY KEY (user_id, image_id);


--
-- TOC entry 4360 (class 2606 OID 158586)
-- Name: hidden_posts hidden_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_posts
    ADD CONSTRAINT hidden_posts_pkey PRIMARY KEY (user_id, post_id);


--
-- TOC entry 4376 (class 2606 OID 164276)
-- Name: image_likes image_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_likes
    ADD CONSTRAINT image_likes_pkey PRIMARY KEY (image_id, user_id);


--
-- TOC entry 4311 (class 2606 OID 90813)
-- Name: image_moderation_events image_moderation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_moderation_events
    ADD CONSTRAINT image_moderation_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4307 (class 2606 OID 90785)
-- Name: image_reports image_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_reports
    ADD CONSTRAINT image_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4383 (class 2606 OID 165575)
-- Name: image_tags image_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_tags
    ADD CONSTRAINT image_tags_pkey PRIMARY KEY (image_id, tag);


--
-- TOC entry 4261 (class 2606 OID 35218)
-- Name: images images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);


--
-- TOC entry 4353 (class 2606 OID 157387)
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id, emoji);


--
-- TOC entry 4339 (class 2606 OID 157179)
-- Name: message_thread_participants message_thread_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_participants
    ADD CONSTRAINT message_thread_participants_pkey PRIMARY KEY (thread_id, user_id);


--
-- TOC entry 4348 (class 2606 OID 157359)
-- Name: message_thread_reports message_thread_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_reports
    ADD CONSTRAINT message_thread_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4336 (class 2606 OID 157153)
-- Name: message_threads message_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_pkey PRIMARY KEY (id);


--
-- TOC entry 4343 (class 2606 OID 157200)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4327 (class 2606 OID 157127)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4283 (class 2606 OID 35485)
-- Name: post_albums post_albums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_albums
    ADD CONSTRAINT post_albums_pkey PRIMARY KEY (post_id, album_id);


--
-- TOC entry 4278 (class 2606 OID 35447)
-- Name: post_images post_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_pkey PRIMARY KEY (post_id, image_id);


--
-- TOC entry 4363 (class 2606 OID 158609)
-- Name: post_reports post_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4425 (class 2606 OID 168289)
-- Name: post_stories post_stories_one_per_post; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_stories
    ADD CONSTRAINT post_stories_one_per_post UNIQUE (post_id);


--
-- TOC entry 4427 (class 2606 OID 168287)
-- Name: post_stories post_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_stories
    ADD CONSTRAINT post_stories_pkey PRIMARY KEY (id);


--
-- TOC entry 4430 (class 2606 OID 168317)
-- Name: post_story_images post_story_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_images
    ADD CONSTRAINT post_story_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4433 (class 2606 OID 168337)
-- Name: post_story_likes post_story_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_likes
    ADD CONSTRAINT post_story_likes_pkey PRIMARY KEY (story_id, user_id);


--
-- TOC entry 4436 (class 2606 OID 168360)
-- Name: post_story_reports post_story_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_reports
    ADD CONSTRAINT post_story_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4290 (class 2606 OID 35671)
-- Name: post_views post_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_pkey PRIMARY KEY (id);


--
-- TOC entry 4275 (class 2606 OID 35416)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4413 (class 2606 OID 167969)
-- Name: profile_visits profile_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_visits
    ADD CONSTRAINT profile_visits_pkey PRIMARY KEY (id);


--
-- TOC entry 4394 (class 2606 OID 166768)
-- Name: sources sources_base_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_base_url_key UNIQUE (base_url);


--
-- TOC entry 4396 (class 2606 OID 166766)
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- TOC entry 4246 (class 2606 OID 26818)
-- Name: user_contacts user_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contacts
    ADD CONSTRAINT user_contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 4248 (class 2606 OID 26820)
-- Name: user_contacts user_contacts_user_id_contact_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contacts
    ADD CONSTRAINT user_contacts_user_id_contact_user_id_key UNIQUE (user_id, contact_user_id);


--
-- TOC entry 4315 (class 2606 OID 139268)
-- Name: user_daily_logins user_daily_logins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_logins
    ADD CONSTRAINT user_daily_logins_pkey PRIMARY KEY (id);


--
-- TOC entry 4317 (class 2606 OID 139270)
-- Name: user_daily_logins user_daily_logins_user_id_login_day_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_logins
    ADD CONSTRAINT user_daily_logins_user_id_login_day_key UNIQUE (user_id, login_day);


--
-- TOC entry 4358 (class 2606 OID 158558)
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4251 (class 2606 OID 35153)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4420 (class 2606 OID 168153)
-- Name: user_registration_orders user_registration_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_registration_orders
    ADD CONSTRAINT user_registration_orders_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4422 (class 2606 OID 168155)
-- Name: user_registration_orders user_registration_orders_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_registration_orders
    ADD CONSTRAINT user_registration_orders_registration_number_key UNIQUE (registration_number);


--
-- TOC entry 4410 (class 2606 OID 167947)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_daily_entries
    ADD CONSTRAINT wellbeing_daily_entries_pkey PRIMARY KEY (user_id, entry_date);


--
-- TOC entry 4417 (class 2606 OID 168019)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_plan_entries
    ADD CONSTRAINT wellbeing_plan_entries_pkey PRIMARY KEY (user_id, plan_date);


--
-- TOC entry 4403 (class 1259 OID 166806)
-- Name: article_ai_results_article_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX article_ai_results_article_id_idx ON public.article_ai_results USING btree (article_id);


--
-- TOC entry 4408 (class 1259 OID 166807)
-- Name: article_ai_results_topic_label_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX article_ai_results_topic_label_idx ON public.article_ai_results USING btree (topic_label);


--
-- TOC entry 4399 (class 1259 OID 166805)
-- Name: articles_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_published_at_idx ON public.articles USING btree (published_at DESC);


--
-- TOC entry 4400 (class 1259 OID 166804)
-- Name: articles_source_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_source_id_idx ON public.articles USING btree (source_id);


--
-- TOC entry 4390 (class 1259 OID 166745)
-- Name: aw_challenge_images_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aw_challenge_images_image_idx ON public.aw_challenge_images USING btree (image_id, challenge_id);


--
-- TOC entry 4385 (class 1259 OID 166756)
-- Name: aw_challenges_owner_challenge_tag_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX aw_challenges_owner_challenge_tag_unique_idx ON public.aw_challenges USING btree (owner_user_id, lower(challenge_tag)) WHERE (challenge_tag IS NOT NULL);


--
-- TOC entry 4386 (class 1259 OID 165613)
-- Name: aw_challenges_owner_dates_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aw_challenges_owner_dates_idx ON public.aw_challenges USING btree (owner_user_id, start_date, target_date_current);


--
-- TOC entry 4387 (class 1259 OID 165612)
-- Name: aw_challenges_owner_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aw_challenges_owner_status_idx ON public.aw_challenges USING btree (owner_user_id, status, created_at DESC);


--
-- TOC entry 4371 (class 1259 OID 164228)
-- Name: aw_user_stats_history_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aw_user_stats_history_user_date_idx ON public.aw_user_stats_history USING btree (user_id, snapshot_date DESC);


--
-- TOC entry 4354 (class 1259 OID 158552)
-- Name: blocked_users_blocked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blocked_users_blocked_idx ON public.blocked_users USING btree (blocked_user_id, blocker_user_id);


--
-- TOC entry 4378 (class 1259 OID 164329)
-- Name: comment_reports_comment_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_reports_comment_status_idx ON public.comment_reports USING btree (comment_id, status, created_at DESC);


--
-- TOC entry 4381 (class 1259 OID 164330)
-- Name: comment_reports_reporter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comment_reports_reporter_idx ON public.comment_reports USING btree (reporter_user_id, created_at DESC);


--
-- TOC entry 4318 (class 1259 OID 150398)
-- Name: comments_author_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_author_user_id_idx ON public.comments USING btree (author_user_id);


--
-- TOC entry 4319 (class 1259 OID 168185)
-- Name: comments_hidden_by_suspension_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_hidden_by_suspension_idx ON public.comments USING btree (hidden_by_suspension, author_user_id);


--
-- TOC entry 4320 (class 1259 OID 150397)
-- Name: comments_image_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_image_id_created_at_idx ON public.comments USING btree (image_id, created_at DESC) WHERE ((target_type = 'image'::text) AND (is_deleted = false) AND (is_hidden_by_moderation = false));


--
-- TOC entry 4321 (class 1259 OID 150399)
-- Name: comments_parent_comment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_parent_comment_id_idx ON public.comments USING btree (parent_comment_id);


--
-- TOC entry 4324 (class 1259 OID 150396)
-- Name: comments_post_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_post_id_created_at_idx ON public.comments USING btree (post_id, created_at DESC) WHERE ((target_type = 'post'::text) AND (is_deleted = false) AND (is_hidden_by_moderation = false));


--
-- TOC entry 4325 (class 1259 OID 168387)
-- Name: comments_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comments_story_idx ON public.comments USING btree (story_id, created_at, id) WHERE ((story_id IS NOT NULL) AND (target_type = 'story'::text));


--
-- TOC entry 4302 (class 1259 OID 63291)
-- Name: connection_requests_unique_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX connection_requests_unique_pending ON public.connection_requests USING btree (requester_id, target_id) WHERE (status = 'pending'::text);


--
-- TOC entry 4293 (class 1259 OID 63155)
-- Name: connections_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX connections_status_idx ON public.connections USING btree (status);


--
-- TOC entry 4294 (class 1259 OID 63152)
-- Name: connections_unique_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX connections_unique_pair ON public.connections USING btree (user_id_a, user_id_b);


--
-- TOC entry 4295 (class 1259 OID 63154)
-- Name: connections_user_high_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX connections_user_high_idx ON public.connections USING btree (user_id_b);


--
-- TOC entry 4296 (class 1259 OID 63153)
-- Name: connections_user_low_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX connections_user_low_idx ON public.connections USING btree (user_id_a);


--
-- TOC entry 4297 (class 1259 OID 63172)
-- Name: follows_follower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX follows_follower_idx ON public.follows USING btree (follower_id);


--
-- TOC entry 4298 (class 1259 OID 63173)
-- Name: follows_following_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX follows_following_idx ON public.follows USING btree (following_id);


--
-- TOC entry 4299 (class 1259 OID 63171)
-- Name: follows_unique_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX follows_unique_pair ON public.follows USING btree (follower_id, following_id);


--
-- TOC entry 4366 (class 1259 OID 164189)
-- Name: hidden_images_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hidden_images_image_idx ON public.hidden_images USING btree (image_id, user_id);


--
-- TOC entry 4361 (class 1259 OID 158597)
-- Name: hidden_posts_post_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hidden_posts_post_idx ON public.hidden_posts USING btree (post_id, user_id);


--
-- TOC entry 4287 (class 1259 OID 82760)
-- Name: idx_age_guesses_guesser_anonymous; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_age_guesses_guesser_anonymous ON public.age_guesses USING btree (guesser_user_id, is_anonymous);


--
-- TOC entry 4288 (class 1259 OID 82759)
-- Name: idx_age_guesses_image_anonymous; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_age_guesses_image_anonymous ON public.age_guesses USING btree (image_id, is_anonymous);


--
-- TOC entry 4270 (class 1259 OID 58567)
-- Name: idx_album_images_album_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_album_images_album_id ON public.album_images USING btree (album_id);


--
-- TOC entry 4271 (class 1259 OID 58568)
-- Name: idx_album_images_image_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_album_images_image_id ON public.album_images USING btree (image_id);


--
-- TOC entry 4308 (class 1259 OID 90830)
-- Name: idx_image_moderation_events_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_moderation_events_type_time ON public.image_moderation_events USING btree (event_type, created_at DESC);


--
-- TOC entry 4309 (class 1259 OID 90829)
-- Name: idx_image_moderation_events_uploader_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_moderation_events_uploader_time ON public.image_moderation_events USING btree (uploader_user_id, created_at DESC);


--
-- TOC entry 4303 (class 1259 OID 90801)
-- Name: idx_image_reports_image_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_reports_image_id ON public.image_reports USING btree (image_id);


--
-- TOC entry 4304 (class 1259 OID 90802)
-- Name: idx_image_reports_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_reports_reporter ON public.image_reports USING btree (reporter_user_id, created_at DESC);


--
-- TOC entry 4305 (class 1259 OID 90803)
-- Name: idx_image_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_reports_status ON public.image_reports USING btree (status, created_at DESC);


--
-- TOC entry 4253 (class 1259 OID 117667)
-- Name: idx_images_public_url_thumb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_public_url_thumb ON public.images USING btree (public_url_thumb);


--
-- TOC entry 4254 (class 1259 OID 71082)
-- Name: idx_images_uploader_context_real_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_uploader_context_real_age ON public.images USING btree (uploader_user_id, aw_context, real_age_years);


--
-- TOC entry 4255 (class 1259 OID 71083)
-- Name: idx_images_uploader_include_real_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_uploader_include_real_age ON public.images USING btree (uploader_user_id, include_in_global_aw, real_age_years);


--
-- TOC entry 4256 (class 1259 OID 71081)
-- Name: idx_images_uploader_real_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_uploader_real_age ON public.images USING btree (uploader_user_id, real_age_years);


--
-- TOC entry 4272 (class 1259 OID 99857)
-- Name: idx_posts_album_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_album_id ON public.posts USING btree (album_id);


--
-- TOC entry 4312 (class 1259 OID 139272)
-- Name: idx_user_daily_logins_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_daily_logins_created_at ON public.user_daily_logins USING btree (created_at);


--
-- TOC entry 4313 (class 1259 OID 139271)
-- Name: idx_user_daily_logins_user_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_daily_logins_user_day ON public.user_daily_logins USING btree (user_id, login_day);


--
-- TOC entry 4374 (class 1259 OID 164298)
-- Name: image_likes_image_reaction_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX image_likes_image_reaction_idx ON public.image_likes USING btree (image_id, reaction, created_at DESC);


--
-- TOC entry 4377 (class 1259 OID 164287)
-- Name: image_likes_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX image_likes_user_created_idx ON public.image_likes USING btree (user_id, created_at DESC);


--
-- TOC entry 4384 (class 1259 OID 165581)
-- Name: image_tags_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX image_tags_tag_idx ON public.image_tags USING btree (tag, image_id);


--
-- TOC entry 4257 (class 1259 OID 117715)
-- Name: images_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_created_at_idx ON public.images USING btree (created_at);


--
-- TOC entry 4258 (class 1259 OID 168194)
-- Name: images_hidden_by_admin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_hidden_by_admin_idx ON public.images USING btree (hidden_by_admin, uploader_user_id, created_at);


--
-- TOC entry 4259 (class 1259 OID 168184)
-- Name: images_hidden_by_suspension_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_hidden_by_suspension_idx ON public.images USING btree (hidden_by_suspension, uploader_user_id);


--
-- TOC entry 4262 (class 1259 OID 74531)
-- Name: images_uploader_global_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_uploader_global_taken_at_idx ON public.images USING btree (uploader_user_id, include_in_global_aw, taken_at DESC);


--
-- TOC entry 4263 (class 1259 OID 74530)
-- Name: images_uploader_taken_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_uploader_taken_at_idx ON public.images USING btree (uploader_user_id, taken_at DESC);


--
-- TOC entry 4264 (class 1259 OID 117714)
-- Name: images_uploader_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_uploader_user_id_idx ON public.images USING btree (uploader_user_id);


--
-- TOC entry 4265 (class 1259 OID 117713)
-- Name: images_verified_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_verified_at_idx ON public.images USING btree (verified_at);


--
-- TOC entry 4351 (class 1259 OID 157398)
-- Name: message_reactions_message_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_reactions_message_idx ON public.message_reactions USING btree (message_id, created_at DESC);


--
-- TOC entry 4340 (class 1259 OID 168257)
-- Name: message_thread_participants_user_folder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_thread_participants_user_folder_idx ON public.message_thread_participants USING btree (user_id, thread_folder, is_starred, thread_id);


--
-- TOC entry 4341 (class 1259 OID 157190)
-- Name: message_thread_participants_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_thread_participants_user_idx ON public.message_thread_participants USING btree (user_id, thread_id);


--
-- TOC entry 4349 (class 1259 OID 157376)
-- Name: message_thread_reports_reporter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_thread_reports_reporter_idx ON public.message_thread_reports USING btree (reporter_user_id, created_at DESC);


--
-- TOC entry 4350 (class 1259 OID 157375)
-- Name: message_thread_reports_thread_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_thread_reports_thread_status_idx ON public.message_thread_reports USING btree (thread_id, status, created_at DESC);


--
-- TOC entry 4330 (class 1259 OID 168258)
-- Name: message_threads_admin_support_subject_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_threads_admin_support_subject_unique_idx ON public.message_threads USING btree (subject_user_id) WHERE ((thread_kind = 'admin_support'::text) AND (subject_user_id IS NOT NULL));


--
-- TOC entry 4331 (class 1259 OID 157170)
-- Name: message_threads_connected_pair_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_threads_connected_pair_unique_idx ON public.message_threads USING btree (connection_user_id_a, connection_user_id_b) WHERE ((thread_kind = 'connected_dm'::text) AND (connection_user_id_a IS NOT NULL) AND (connection_user_id_b IS NOT NULL));


--
-- TOC entry 4332 (class 1259 OID 168260)
-- Name: message_threads_kind_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_threads_kind_subject_idx ON public.message_threads USING btree (thread_kind, subject_user_id, last_message_at DESC NULLS LAST, created_at DESC);


--
-- TOC entry 4333 (class 1259 OID 157171)
-- Name: message_threads_last_message_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_threads_last_message_idx ON public.message_threads USING btree (last_message_at DESC NULLS LAST, created_at DESC);


--
-- TOC entry 4334 (class 1259 OID 168259)
-- Name: message_threads_moderator_outreach_subject_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_threads_moderator_outreach_subject_unique_idx ON public.message_threads USING btree (subject_user_id) WHERE ((thread_kind = 'moderator_outreach'::text) AND (subject_user_id IS NOT NULL));


--
-- TOC entry 4337 (class 1259 OID 157169)
-- Name: message_threads_request_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_threads_request_unique_idx ON public.message_threads USING btree (connection_request_id) WHERE (connection_request_id IS NOT NULL);


--
-- TOC entry 4344 (class 1259 OID 158578)
-- Name: messages_reply_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_reply_to_idx ON public.messages USING btree (reply_to_message_id) WHERE (reply_to_message_id IS NOT NULL);


--
-- TOC entry 4345 (class 1259 OID 157212)
-- Name: messages_sender_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_sender_created_idx ON public.messages USING btree (sender_user_id, created_at DESC);


--
-- TOC entry 4346 (class 1259 OID 157211)
-- Name: messages_thread_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_thread_created_idx ON public.messages USING btree (thread_id, created_at, id);


--
-- TOC entry 4328 (class 1259 OID 157138)
-- Name: notifications_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- TOC entry 4329 (class 1259 OID 157139)
-- Name: notifications_user_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- TOC entry 4281 (class 1259 OID 61983)
-- Name: post_albums_album_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_albums_album_id_idx ON public.post_albums USING btree (album_id);


--
-- TOC entry 4284 (class 1259 OID 61982)
-- Name: post_albums_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_albums_post_id_idx ON public.post_albums USING btree (post_id);


--
-- TOC entry 4276 (class 1259 OID 61961)
-- Name: post_images_image_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_images_image_id_idx ON public.post_images USING btree (image_id);


--
-- TOC entry 4279 (class 1259 OID 61960)
-- Name: post_images_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_images_post_id_idx ON public.post_images USING btree (post_id);


--
-- TOC entry 4280 (class 1259 OID 61959)
-- Name: post_images_unique_post_image; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX post_images_unique_post_image ON public.post_images USING btree (post_id, image_id);


--
-- TOC entry 4364 (class 1259 OID 158625)
-- Name: post_reports_post_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_reports_post_status_idx ON public.post_reports USING btree (post_id, status, created_at DESC);


--
-- TOC entry 4365 (class 1259 OID 158626)
-- Name: post_reports_reporter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_reports_reporter_idx ON public.post_reports USING btree (reporter_user_id, created_at DESC);


--
-- TOC entry 4423 (class 1259 OID 168377)
-- Name: post_stories_author_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_stories_author_created_idx ON public.post_stories USING btree (author_user_id, created_at DESC);


--
-- TOC entry 4428 (class 1259 OID 168376)
-- Name: post_stories_post_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_stories_post_idx ON public.post_stories USING btree (post_id);


--
-- TOC entry 4431 (class 1259 OID 168378)
-- Name: post_story_images_story_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_story_images_story_sort_idx ON public.post_story_images USING btree (story_id, sort_order, id);


--
-- TOC entry 4434 (class 1259 OID 168379)
-- Name: post_story_likes_story_reaction_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_story_likes_story_reaction_idx ON public.post_story_likes USING btree (story_id, reaction, created_at DESC);


--
-- TOC entry 4437 (class 1259 OID 168381)
-- Name: post_story_reports_reporter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_story_reports_reporter_idx ON public.post_story_reports USING btree (reporter_user_id, created_at DESC);


--
-- TOC entry 4438 (class 1259 OID 168380)
-- Name: post_story_reports_story_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_story_reports_story_status_idx ON public.post_story_reports USING btree (story_id, status, created_at DESC);


--
-- TOC entry 4273 (class 1259 OID 168183)
-- Name: posts_hidden_by_suspension_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_hidden_by_suspension_idx ON public.posts USING btree (hidden_by_suspension, author_user_id);


--
-- TOC entry 4414 (class 1259 OID 167980)
-- Name: profile_visits_viewed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_visits_viewed_at_idx ON public.profile_visits USING btree (viewed_user_id, viewed_at DESC);


--
-- TOC entry 4415 (class 1259 OID 167981)
-- Name: profile_visits_viewer_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profile_visits_viewer_at_idx ON public.profile_visits USING btree (viewer_user_id, viewed_at DESC);


--
-- TOC entry 4249 (class 1259 OID 168182)
-- Name: user_profiles_account_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_profiles_account_status_idx ON public.user_profiles USING btree (account_status, user_id);


--
-- TOC entry 4252 (class 1259 OID 168167)
-- Name: user_profiles_registration_number_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_registration_number_uidx ON public.user_profiles USING btree (registration_number) WHERE (registration_number IS NOT NULL);


--
-- TOC entry 4411 (class 1259 OID 167953)
-- Name: wellbeing_daily_entries_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wellbeing_daily_entries_user_date_idx ON public.wellbeing_daily_entries USING btree (user_id, entry_date DESC);


--
-- TOC entry 4418 (class 1259 OID 168025)
-- Name: wellbeing_plan_entries_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wellbeing_plan_entries_user_date_idx ON public.wellbeing_plan_entries USING btree (user_id, plan_date DESC);


--
-- TOC entry 4543 (class 2620 OID 164259)
-- Name: app_runtime_settings app_runtime_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER app_runtime_settings_set_updated_at BEFORE UPDATE ON public.app_runtime_settings FOR EACH ROW EXECUTE FUNCTION public.app_runtime_settings_set_updated_at();


--
-- TOC entry 4544 (class 2620 OID 165619)
-- Name: aw_challenges aw_challenges_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER aw_challenges_set_updated_at BEFORE UPDATE ON public.aw_challenges FOR EACH ROW EXECUTE FUNCTION public.aw_challenges_touch_updated_at();


--
-- TOC entry 4542 (class 2620 OID 164233)
-- Name: aw_user_stats_history aw_user_stats_history_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER aw_user_stats_history_set_updated_at BEFORE UPDATE ON public.aw_user_stats_history FOR EACH ROW EXECUTE FUNCTION public.aw_user_stats_history_set_updated_at();


--
-- TOC entry 4537 (class 2620 OID 61988)
-- Name: post_images post_images_recount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER post_images_recount AFTER INSERT OR DELETE OR UPDATE OF post_id ON public.post_images FOR EACH ROW EXECUTE FUNCTION public.trg_post_images_recount();


--
-- TOC entry 4538 (class 2620 OID 82755)
-- Name: age_guesses trg_age_guesses_recompute_image; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_age_guesses_recompute_image AFTER INSERT OR DELETE OR UPDATE ON public.age_guesses FOR EACH ROW EXECUTE FUNCTION public.tg_age_guesses_recompute_image();


--
-- TOC entry 4540 (class 2620 OID 63175)
-- Name: connections trg_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4539 (class 2620 OID 115459)
-- Name: age_guesses trg_enforce_single_guess_unless_super; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_single_guess_unless_super BEFORE INSERT ON public.age_guesses FOR EACH ROW EXECUTE FUNCTION public.enforce_single_guess_unless_super();


--
-- TOC entry 4535 (class 2620 OID 98727)
-- Name: user_profiles trg_prevent_dob_change_unless_superuser; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_dob_change_unless_superuser BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_dob_change_unless_superuser();


--
-- TOC entry 4541 (class 2620 OID 157217)
-- Name: messages trg_touch_message_thread_from_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_message_thread_from_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.touch_message_thread_from_message();


--
-- TOC entry 4536 (class 2620 OID 168166)
-- Name: user_profiles trg_user_profiles_registration_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_profiles_registration_number BEFORE INSERT OR UPDATE OF user_id, registration_number ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.apply_user_profile_registration_number();


--
-- TOC entry 4545 (class 2620 OID 167959)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wellbeing_daily_entries_set_updated_at BEFORE UPDATE ON public.wellbeing_daily_entries FOR EACH ROW EXECUTE FUNCTION public.wellbeing_daily_entries_set_updated_at();


--
-- TOC entry 4546 (class 2620 OID 168115)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wellbeing_plan_entries_set_updated_at BEFORE UPDATE ON public.wellbeing_plan_entries FOR EACH ROW EXECUTE FUNCTION public.wellbeing_plan_entries_set_updated_at();


--
-- TOC entry 4458 (class 2606 OID 35575)
-- Name: age_guesses age_guesses_guesser_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.age_guesses
    ADD CONSTRAINT age_guesses_guesser_user_id_fkey FOREIGN KEY (guesser_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4459 (class 2606 OID 35570)
-- Name: age_guesses age_guesses_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.age_guesses
    ADD CONSTRAINT age_guesses_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4446 (class 2606 OID 35332)
-- Name: album_images album_images_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_images
    ADD CONSTRAINT album_images_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;


--
-- TOC entry 4447 (class 2606 OID 35337)
-- Name: album_images album_images_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_images
    ADD CONSTRAINT album_images_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4445 (class 2606 OID 35300)
-- Name: albums albums_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.albums
    ADD CONSTRAINT albums_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4508 (class 2606 OID 164253)
-- Name: app_runtime_settings app_runtime_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_runtime_settings
    ADD CONSTRAINT app_runtime_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4519 (class 2606 OID 166799)
-- Name: article_ai_results article_ai_results_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_ai_results
    ADD CONSTRAINT article_ai_results_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- TOC entry 4518 (class 2606 OID 166780)
-- Name: articles articles_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- TOC entry 4516 (class 2606 OID 166735)
-- Name: aw_challenge_images aw_challenge_images_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_challenge_images
    ADD CONSTRAINT aw_challenge_images_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.aw_challenges(id) ON DELETE CASCADE;


--
-- TOC entry 4517 (class 2606 OID 166740)
-- Name: aw_challenge_images aw_challenge_images_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_challenge_images
    ADD CONSTRAINT aw_challenge_images_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4515 (class 2606 OID 165607)
-- Name: aw_challenges aw_challenges_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_challenges
    ADD CONSTRAINT aw_challenges_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4507 (class 2606 OID 164223)
-- Name: aw_user_stats_history aw_user_stats_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aw_user_stats_history
    ADD CONSTRAINT aw_user_stats_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4497 (class 2606 OID 158547)
-- Name: blocked_users blocked_users_blocked_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4498 (class 2606 OID 158542)
-- Name: blocked_users blocked_users_blocker_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocker_user_id_fkey FOREIGN KEY (blocker_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4511 (class 2606 OID 164314)
-- Name: comment_reports comment_reports_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- TOC entry 4512 (class 2606 OID 164319)
-- Name: comment_reports comment_reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4513 (class 2606 OID 164324)
-- Name: comment_reports comment_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_reports
    ADD CONSTRAINT comment_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4475 (class 2606 OID 150376)
-- Name: comments comments_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.user_profiles(user_id) ON DELETE CASCADE;


--
-- TOC entry 4476 (class 2606 OID 150386)
-- Name: comments comments_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4477 (class 2606 OID 150391)
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- TOC entry 4478 (class 2606 OID 150381)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4479 (class 2606 OID 168382)
-- Name: comments comments_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.post_stories(id) ON DELETE CASCADE;


--
-- TOC entry 4467 (class 2606 OID 63281)
-- Name: connection_requests connection_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_requests
    ADD CONSTRAINT connection_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4468 (class 2606 OID 63286)
-- Name: connection_requests connection_requests_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_requests
    ADD CONSTRAINT connection_requests_target_id_fkey FOREIGN KEY (target_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4462 (class 2606 OID 63147)
-- Name: connections connections_requested_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_requested_by_fk FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4463 (class 2606 OID 63142)
-- Name: connections connections_user_high_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_user_high_fk FOREIGN KEY (user_id_b) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4464 (class 2606 OID 63137)
-- Name: connections connections_user_low_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_user_low_fk FOREIGN KEY (user_id_a) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4465 (class 2606 OID 63161)
-- Name: follows follows_follower_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_fk FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4466 (class 2606 OID 63166)
-- Name: follows follows_following_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_fk FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4505 (class 2606 OID 164184)
-- Name: hidden_images hidden_images_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_images
    ADD CONSTRAINT hidden_images_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4506 (class 2606 OID 164179)
-- Name: hidden_images hidden_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_images
    ADD CONSTRAINT hidden_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4500 (class 2606 OID 158592)
-- Name: hidden_posts hidden_posts_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_posts
    ADD CONSTRAINT hidden_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4501 (class 2606 OID 158587)
-- Name: hidden_posts hidden_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_posts
    ADD CONSTRAINT hidden_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4509 (class 2606 OID 164277)
-- Name: image_likes image_likes_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_likes
    ADD CONSTRAINT image_likes_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4510 (class 2606 OID 164282)
-- Name: image_likes image_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_likes
    ADD CONSTRAINT image_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4472 (class 2606 OID 90824)
-- Name: image_moderation_events image_moderation_events_moderator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_moderation_events
    ADD CONSTRAINT image_moderation_events_moderator_user_id_fkey FOREIGN KEY (moderator_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4473 (class 2606 OID 90819)
-- Name: image_moderation_events image_moderation_events_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_moderation_events
    ADD CONSTRAINT image_moderation_events_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.image_reports(id) ON DELETE SET NULL;


--
-- TOC entry 4474 (class 2606 OID 90814)
-- Name: image_moderation_events image_moderation_events_uploader_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_moderation_events
    ADD CONSTRAINT image_moderation_events_uploader_user_id_fkey FOREIGN KEY (uploader_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4469 (class 2606 OID 90786)
-- Name: image_reports image_reports_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_reports
    ADD CONSTRAINT image_reports_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4470 (class 2606 OID 90791)
-- Name: image_reports image_reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_reports
    ADD CONSTRAINT image_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4471 (class 2606 OID 90796)
-- Name: image_reports image_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_reports
    ADD CONSTRAINT image_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4514 (class 2606 OID 165576)
-- Name: image_tags image_tags_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_tags
    ADD CONSTRAINT image_tags_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4443 (class 2606 OID 168189)
-- Name: images images_hidden_by_admin_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_hidden_by_admin_by_fkey FOREIGN KEY (hidden_by_admin_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4444 (class 2606 OID 35219)
-- Name: images images_uploader_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_uploader_user_id_fkey FOREIGN KEY (uploader_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4495 (class 2606 OID 157388)
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- TOC entry 4496 (class 2606 OID 157393)
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4487 (class 2606 OID 157180)
-- Name: message_thread_participants message_thread_participants_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_participants
    ADD CONSTRAINT message_thread_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON DELETE CASCADE;


--
-- TOC entry 4488 (class 2606 OID 157185)
-- Name: message_thread_participants message_thread_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_participants
    ADD CONSTRAINT message_thread_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4492 (class 2606 OID 157365)
-- Name: message_thread_reports message_thread_reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_reports
    ADD CONSTRAINT message_thread_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4493 (class 2606 OID 157370)
-- Name: message_thread_reports message_thread_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_reports
    ADD CONSTRAINT message_thread_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4494 (class 2606 OID 157360)
-- Name: message_thread_reports message_thread_reports_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_thread_reports
    ADD CONSTRAINT message_thread_reports_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON DELETE CASCADE;


--
-- TOC entry 4482 (class 2606 OID 157154)
-- Name: message_threads message_threads_connection_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_connection_request_id_fkey FOREIGN KEY (connection_request_id) REFERENCES public.connection_requests(id) ON DELETE SET NULL;


--
-- TOC entry 4483 (class 2606 OID 157159)
-- Name: message_threads message_threads_connection_user_id_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_connection_user_id_a_fkey FOREIGN KEY (connection_user_id_a) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4484 (class 2606 OID 157164)
-- Name: message_threads message_threads_connection_user_id_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_connection_user_id_b_fkey FOREIGN KEY (connection_user_id_b) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4485 (class 2606 OID 168247)
-- Name: message_threads message_threads_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4486 (class 2606 OID 168242)
-- Name: message_threads message_threads_subject_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_subject_user_id_fkey FOREIGN KEY (subject_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4489 (class 2606 OID 158573)
-- Name: messages messages_reply_to_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- TOC entry 4490 (class 2606 OID 157206)
-- Name: messages messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4491 (class 2606 OID 157201)
-- Name: messages messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON DELETE CASCADE;


--
-- TOC entry 4480 (class 2606 OID 157133)
-- Name: notifications notifications_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4481 (class 2606 OID 157128)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4454 (class 2606 OID 61977)
-- Name: post_albums post_albums_album_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_albums
    ADD CONSTRAINT post_albums_album_fk FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;


--
-- TOC entry 4455 (class 2606 OID 35491)
-- Name: post_albums post_albums_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_albums
    ADD CONSTRAINT post_albums_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE;


--
-- TOC entry 4456 (class 2606 OID 61972)
-- Name: post_albums post_albums_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_albums
    ADD CONSTRAINT post_albums_post_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4457 (class 2606 OID 35486)
-- Name: post_albums post_albums_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_albums
    ADD CONSTRAINT post_albums_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4450 (class 2606 OID 61967)
-- Name: post_images post_images_image_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_image_fk FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4451 (class 2606 OID 35453)
-- Name: post_images post_images_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- TOC entry 4452 (class 2606 OID 61962)
-- Name: post_images post_images_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_post_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4453 (class 2606 OID 35448)
-- Name: post_images post_images_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4502 (class 2606 OID 158610)
-- Name: post_reports post_reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4503 (class 2606 OID 158615)
-- Name: post_reports post_reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4504 (class 2606 OID 158620)
-- Name: post_reports post_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4525 (class 2606 OID 168295)
-- Name: post_stories post_stories_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_stories
    ADD CONSTRAINT post_stories_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4526 (class 2606 OID 168300)
-- Name: post_stories post_stories_hidden_by_moderation_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_stories
    ADD CONSTRAINT post_stories_hidden_by_moderation_by_fkey FOREIGN KEY (hidden_by_moderation_by) REFERENCES auth.users(id);


--
-- TOC entry 4527 (class 2606 OID 168290)
-- Name: post_stories post_stories_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_stories
    ADD CONSTRAINT post_stories_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4528 (class 2606 OID 168318)
-- Name: post_story_images post_story_images_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_images
    ADD CONSTRAINT post_story_images_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.post_stories(id) ON DELETE CASCADE;


--
-- TOC entry 4529 (class 2606 OID 168323)
-- Name: post_story_images post_story_images_uploader_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_images
    ADD CONSTRAINT post_story_images_uploader_user_id_fkey FOREIGN KEY (uploader_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4530 (class 2606 OID 168338)
-- Name: post_story_likes post_story_likes_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_likes
    ADD CONSTRAINT post_story_likes_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.post_stories(id) ON DELETE CASCADE;


--
-- TOC entry 4531 (class 2606 OID 168343)
-- Name: post_story_likes post_story_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_likes
    ADD CONSTRAINT post_story_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4532 (class 2606 OID 168366)
-- Name: post_story_reports post_story_reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_reports
    ADD CONSTRAINT post_story_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4533 (class 2606 OID 168371)
-- Name: post_story_reports post_story_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_reports
    ADD CONSTRAINT post_story_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- TOC entry 4534 (class 2606 OID 168361)
-- Name: post_story_reports post_story_reports_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_story_reports
    ADD CONSTRAINT post_story_reports_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.post_stories(id) ON DELETE CASCADE;


--
-- TOC entry 4460 (class 2606 OID 35672)
-- Name: post_views post_views_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4461 (class 2606 OID 35677)
-- Name: post_views post_views_viewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_views
    ADD CONSTRAINT post_views_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4448 (class 2606 OID 99852)
-- Name: posts posts_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE SET NULL;


--
-- TOC entry 4449 (class 2606 OID 35417)
-- Name: posts posts_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4521 (class 2606 OID 167970)
-- Name: profile_visits profile_visits_viewed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_visits
    ADD CONSTRAINT profile_visits_viewed_user_id_fkey FOREIGN KEY (viewed_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4522 (class 2606 OID 167975)
-- Name: profile_visits profile_visits_viewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_visits
    ADD CONSTRAINT profile_visits_viewer_user_id_fkey FOREIGN KEY (viewer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4439 (class 2606 OID 26826)
-- Name: user_contacts user_contacts_contact_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contacts
    ADD CONSTRAINT user_contacts_contact_user_id_fkey FOREIGN KEY (contact_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4440 (class 2606 OID 26821)
-- Name: user_contacts user_contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contacts
    ADD CONSTRAINT user_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4499 (class 2606 OID 158559)
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4441 (class 2606 OID 168173)
-- Name: user_profiles user_profiles_suspended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4442 (class 2606 OID 35154)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4524 (class 2606 OID 168156)
-- Name: user_registration_orders user_registration_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_registration_orders
    ADD CONSTRAINT user_registration_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4520 (class 2606 OID 167948)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_daily_entries
    ADD CONSTRAINT wellbeing_daily_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4523 (class 2606 OID 168020)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellbeing_plan_entries
    ADD CONSTRAINT wellbeing_plan_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4867 (class 3256 OID 166815)
-- Name: article_ai_results Prototype can insert AI results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can insert AI results" ON public.article_ai_results FOR INSERT TO anon WITH CHECK (true);


--
-- TOC entry 4864 (class 3256 OID 166812)
-- Name: articles Prototype can insert articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can insert articles" ON public.articles FOR INSERT TO anon WITH CHECK (true);


--
-- TOC entry 4866 (class 3256 OID 166814)
-- Name: article_ai_results Prototype can read AI results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can read AI results" ON public.article_ai_results FOR SELECT TO authenticated, anon USING (true);


--
-- TOC entry 4863 (class 3256 OID 166811)
-- Name: articles Prototype can read articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can read articles" ON public.articles FOR SELECT TO authenticated, anon USING (true);


--
-- TOC entry 4860 (class 3256 OID 166808)
-- Name: sources Prototype can read sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can read sources" ON public.sources FOR SELECT TO authenticated, anon USING (true);


--
-- TOC entry 4861 (class 3256 OID 166809)
-- Name: sources Prototype can seed sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can seed sources" ON public.sources FOR INSERT TO anon WITH CHECK (true);


--
-- TOC entry 4868 (class 3256 OID 166820)
-- Name: article_ai_results Prototype can update AI results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can update AI results" ON public.article_ai_results FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- TOC entry 4865 (class 3256 OID 166813)
-- Name: articles Prototype can update articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can update articles" ON public.articles FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- TOC entry 4862 (class 3256 OID 166810)
-- Name: sources Prototype can update sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prototype can update sources" ON public.sources FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- TOC entry 4704 (class 0 OID 35563)
-- Dependencies: 405
-- Name: age_guesses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.age_guesses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4800 (class 3256 OID 120048)
-- Name: age_guesses age_guesses_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY age_guesses_insert_own ON public.age_guesses FOR INSERT TO authenticated WITH CHECK ((guesser_user_id = auth.uid()));


--
-- TOC entry 4780 (class 3256 OID 84010)
-- Name: age_guesses age_guesses_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY age_guesses_select_all ON public.age_guesses FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4764 (class 3256 OID 57458)
-- Name: age_guesses age_guesses_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY age_guesses_select_auth ON public.age_guesses FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4747 (class 3256 OID 50730)
-- Name: age_guesses age_guesses_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY age_guesses_select_own ON public.age_guesses FOR SELECT TO authenticated USING ((guesser_user_id = auth.uid()));


--
-- TOC entry 4779 (class 3256 OID 82764)
-- Name: age_guesses age_guesses_update_own_reveal_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY age_guesses_update_own_reveal_only ON public.age_guesses FOR UPDATE TO authenticated USING ((guesser_user_id = auth.uid())) WITH CHECK (((guesser_user_id = auth.uid()) AND (is_anonymous = false)));


--
-- TOC entry 4700 (class 0 OID 35326)
-- Dependencies: 399
-- Name: album_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.album_images ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4745 (class 3256 OID 45046)
-- Name: album_images album_images_delete_if_own_album; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY album_images_delete_if_own_album ON public.album_images FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.albums a
  WHERE ((a.id = album_images.album_id) AND (a.owner_user_id = auth.uid())))));


--
-- TOC entry 4797 (class 3256 OID 99871)
-- Name: album_images album_images_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY album_images_delete_owner ON public.album_images FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.albums a
  WHERE ((a.id = album_images.album_id) AND (a.owner_user_id = auth.uid())))));


--
-- TOC entry 4796 (class 3256 OID 99870)
-- Name: album_images album_images_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY album_images_insert_owner ON public.album_images FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.albums a
  WHERE ((a.id = album_images.album_id) AND (a.owner_user_id = auth.uid())))));


--
-- TOC entry 4766 (class 3256 OID 58570)
-- Name: album_images album_images_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY album_images_select_all ON public.album_images FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4795 (class 3256 OID 99869)
-- Name: album_images album_images_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY album_images_select_owner ON public.album_images FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.albums a
  WHERE ((a.id = album_images.album_id) AND (a.owner_user_id = auth.uid())))));


--
-- TOC entry 4699 (class 0 OID 35289)
-- Dependencies: 398
-- Name: albums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4744 (class 3256 OID 45024)
-- Name: albums albums_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_delete_own ON public.albums FOR DELETE TO authenticated USING ((owner_user_id = auth.uid()));


--
-- TOC entry 4794 (class 3256 OID 99868)
-- Name: albums albums_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_delete_owner ON public.albums FOR DELETE TO authenticated USING ((owner_user_id = auth.uid()));


--
-- TOC entry 4792 (class 3256 OID 99866)
-- Name: albums albums_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_insert_owner ON public.albums FOR INSERT TO authenticated WITH CHECK ((owner_user_id = auth.uid()));


--
-- TOC entry 4768 (class 3256 OID 58572)
-- Name: albums albums_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_owner_delete ON public.albums FOR DELETE TO authenticated USING ((owner_user_id = auth.uid()));


--
-- TOC entry 4767 (class 3256 OID 58571)
-- Name: albums albums_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_owner_update ON public.albums FOR UPDATE TO authenticated USING ((owner_user_id = auth.uid())) WITH CHECK ((owner_user_id = auth.uid()));


--
-- TOC entry 4765 (class 3256 OID 58569)
-- Name: albums albums_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_select_all ON public.albums FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4791 (class 3256 OID 99865)
-- Name: albums albums_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_select_owner ON public.albums FOR SELECT TO authenticated USING ((owner_user_id = auth.uid()));


--
-- TOC entry 4793 (class 3256 OID 99867)
-- Name: albums albums_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY albums_update_owner ON public.albums FOR UPDATE TO authenticated USING ((owner_user_id = auth.uid())) WITH CHECK ((owner_user_id = auth.uid()));


--
-- TOC entry 4724 (class 0 OID 164245)
-- Dependencies: 441
-- Name: app_runtime_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_runtime_settings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4836 (class 3256 OID 164260)
-- Name: app_runtime_settings app_runtime_settings_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_runtime_settings_select_public ON public.app_runtime_settings FOR SELECT USING (true);


--
-- TOC entry 4732 (class 0 OID 166785)
-- Dependencies: 454
-- Name: article_ai_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_ai_results ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4731 (class 0 OID 166769)
-- Dependencies: 453
-- Name: articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4729 (class 0 OID 166725)
-- Dependencies: 451
-- Name: aw_challenge_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aw_challenge_images ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4857 (class 3256 OID 166753)
-- Name: aw_challenge_images aw_challenge_images_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenge_images_insert_owner ON public.aw_challenge_images FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.aw_challenges c
  WHERE ((c.id = aw_challenge_images.challenge_id) AND (c.owner_user_id = auth.uid())))));


--
-- TOC entry 4856 (class 3256 OID 166752)
-- Name: aw_challenge_images aw_challenge_images_select_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenge_images_select_contacts ON public.aw_challenge_images FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.aw_challenges c
  WHERE ((c.id = aw_challenge_images.challenge_id) AND (c.visibility = 'contacts'::text) AND (EXISTS ( SELECT 1
           FROM public.connections cn
          WHERE ((cn.status = 'accepted'::text) AND (((cn.user_id_a = auth.uid()) AND (cn.user_id_b = c.owner_user_id)) OR ((cn.user_id_b = auth.uid()) AND (cn.user_id_a = c.owner_user_id))))))))));


--
-- TOC entry 4855 (class 3256 OID 166751)
-- Name: aw_challenge_images aw_challenge_images_select_owner_or_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenge_images_select_owner_or_public ON public.aw_challenge_images FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.aw_challenges c
  WHERE ((c.id = aw_challenge_images.challenge_id) AND ((c.owner_user_id = auth.uid()) OR (c.visibility = 'everyone'::text))))));


--
-- TOC entry 4728 (class 0 OID 165585)
-- Dependencies: 450
-- Name: aw_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aw_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4849 (class 3256 OID 165617)
-- Name: aw_challenges aw_challenges_delete_own_draft; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenges_delete_own_draft ON public.aw_challenges FOR DELETE TO authenticated USING (((owner_user_id = auth.uid()) AND (status = 'draft'::text)));


--
-- TOC entry 4842 (class 3256 OID 165615)
-- Name: aw_challenges aw_challenges_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenges_insert_own ON public.aw_challenges FOR INSERT TO authenticated WITH CHECK ((owner_user_id = auth.uid()));


--
-- TOC entry 4859 (class 3256 OID 166755)
-- Name: aw_challenges aw_challenges_select_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenges_select_contacts ON public.aw_challenges FOR SELECT TO authenticated USING (((visibility = 'contacts'::text) AND (EXISTS ( SELECT 1
   FROM public.connections cn
  WHERE ((cn.status = 'accepted'::text) AND (((cn.user_id_a = auth.uid()) AND (cn.user_id_b = aw_challenges.owner_user_id)) OR ((cn.user_id_b = auth.uid()) AND (cn.user_id_a = aw_challenges.owner_user_id))))))));


--
-- TOC entry 4841 (class 3256 OID 165614)
-- Name: aw_challenges aw_challenges_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenges_select_own ON public.aw_challenges FOR SELECT TO authenticated USING ((owner_user_id = auth.uid()));


--
-- TOC entry 4858 (class 3256 OID 166754)
-- Name: aw_challenges aw_challenges_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenges_select_public ON public.aw_challenges FOR SELECT TO authenticated USING ((visibility = 'everyone'::text));


--
-- TOC entry 4843 (class 3256 OID 165616)
-- Name: aw_challenges aw_challenges_update_own_limited; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_challenges_update_own_limited ON public.aw_challenges FOR UPDATE TO authenticated USING ((owner_user_id = auth.uid())) WITH CHECK ((owner_user_id = auth.uid()));


--
-- TOC entry 4723 (class 0 OID 164213)
-- Dependencies: 440
-- Name: aw_user_stats_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aw_user_stats_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4834 (class 3256 OID 164230)
-- Name: aw_user_stats_history aw_user_stats_history_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_user_stats_history_insert_own ON public.aw_user_stats_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4833 (class 3256 OID 164229)
-- Name: aw_user_stats_history aw_user_stats_history_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_user_stats_history_select_own ON public.aw_user_stats_history FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4835 (class 3256 OID 164231)
-- Name: aw_user_stats_history aw_user_stats_history_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aw_user_stats_history_update_own ON public.aw_user_stats_history FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4718 (class 0 OID 158533)
-- Dependencies: 434
-- Name: blocked_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4825 (class 3256 OID 158566)
-- Name: blocked_users blocked_users_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocked_users_delete_own ON public.blocked_users FOR DELETE TO authenticated USING ((blocker_user_id = auth.uid()));


--
-- TOC entry 4824 (class 3256 OID 158565)
-- Name: blocked_users blocked_users_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocked_users_insert_own ON public.blocked_users FOR INSERT TO authenticated WITH CHECK ((blocker_user_id = auth.uid()));


--
-- TOC entry 4823 (class 3256 OID 158564)
-- Name: blocked_users blocked_users_select_involving_me; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocked_users_select_involving_me ON public.blocked_users FOR SELECT TO authenticated USING (((auth.uid() = blocker_user_id) OR (auth.uid() = blocked_user_id)));


--
-- TOC entry 4775 (class 3256 OID 63297)
-- Name: connections c_delete_involved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY c_delete_involved ON public.connections FOR DELETE TO authenticated USING (((user_id_a = auth.uid()) OR (user_id_b = auth.uid())));


--
-- TOC entry 4774 (class 3256 OID 63296)
-- Name: connections c_insert_involved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY c_insert_involved ON public.connections FOR INSERT TO authenticated WITH CHECK (((user_id_a = auth.uid()) OR (user_id_b = auth.uid())));


--
-- TOC entry 4773 (class 3256 OID 63295)
-- Name: connections c_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY c_select_own ON public.connections FOR SELECT TO authenticated USING (((user_id_a = auth.uid()) OR (user_id_b = auth.uid())));


--
-- TOC entry 4726 (class 0 OID 164303)
-- Dependencies: 444
-- Name: comment_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4845 (class 3256 OID 164332)
-- Name: comment_reports comment_reports_insert_viewer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comment_reports_insert_viewer ON public.comment_reports FOR INSERT TO authenticated WITH CHECK (((reporter_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.comments c
  WHERE (c.id = comment_reports.comment_id)))));


--
-- TOC entry 4840 (class 3256 OID 164331)
-- Name: comment_reports comment_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comment_reports_select_own ON public.comment_reports FOR SELECT TO authenticated USING ((reporter_user_id = auth.uid()));


--
-- TOC entry 4708 (class 0 OID 63271)
-- Dependencies: 411
-- Name: connection_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4706 (class 0 OID 63125)
-- Dependencies: 409
-- Name: connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4771 (class 3256 OID 63293)
-- Name: connection_requests cr_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cr_insert_self ON public.connection_requests FOR INSERT TO authenticated WITH CHECK ((requester_id = auth.uid()));


--
-- TOC entry 4770 (class 3256 OID 63292)
-- Name: connection_requests cr_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cr_select_own ON public.connection_requests FOR SELECT TO authenticated USING (((requester_id = auth.uid()) OR (target_id = auth.uid())));


--
-- TOC entry 4772 (class 3256 OID 63294)
-- Name: connection_requests cr_update_involved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cr_update_involved ON public.connection_requests FOR UPDATE TO authenticated USING (((requester_id = auth.uid()) OR (target_id = auth.uid()))) WITH CHECK (((requester_id = auth.uid()) OR (target_id = auth.uid())));


--
-- TOC entry 4778 (class 3256 OID 63300)
-- Name: follows f_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY f_delete_self ON public.follows FOR DELETE TO authenticated USING ((follower_id = auth.uid()));


--
-- TOC entry 4777 (class 3256 OID 63299)
-- Name: follows f_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY f_insert_self ON public.follows FOR INSERT TO authenticated WITH CHECK ((follower_id = auth.uid()));


--
-- TOC entry 4776 (class 3256 OID 63298)
-- Name: follows f_select_involved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY f_select_involved ON public.follows FOR SELECT TO authenticated USING (((follower_id = auth.uid()) OR (following_id = auth.uid())));


--
-- TOC entry 4707 (class 0 OID 63156)
-- Dependencies: 410
-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4722 (class 0 OID 164173)
-- Dependencies: 439
-- Name: hidden_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hidden_images ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4832 (class 3256 OID 164192)
-- Name: hidden_images hidden_images_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hidden_images_delete_own ON public.hidden_images FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4831 (class 3256 OID 164191)
-- Name: hidden_images hidden_images_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hidden_images_insert_own ON public.hidden_images FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4814 (class 3256 OID 164190)
-- Name: hidden_images hidden_images_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hidden_images_select_own ON public.hidden_images FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4720 (class 0 OID 158581)
-- Dependencies: 436
-- Name: hidden_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4811 (class 3256 OID 158629)
-- Name: hidden_posts hidden_posts_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hidden_posts_delete_own ON public.hidden_posts FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4830 (class 3256 OID 158628)
-- Name: hidden_posts hidden_posts_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hidden_posts_insert_own ON public.hidden_posts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4829 (class 3256 OID 158627)
-- Name: hidden_posts hidden_posts_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hidden_posts_select_own ON public.hidden_posts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4725 (class 0 OID 164271)
-- Dependencies: 442
-- Name: image_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.image_likes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4839 (class 3256 OID 164301)
-- Name: image_likes image_likes_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_likes_delete_own ON public.image_likes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4838 (class 3256 OID 164300)
-- Name: image_likes image_likes_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_likes_insert_own ON public.image_likes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4837 (class 3256 OID 164299)
-- Name: image_likes image_likes_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_likes_select_authenticated ON public.image_likes FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4710 (class 0 OID 90805)
-- Dependencies: 415
-- Name: image_moderation_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.image_moderation_events ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4782 (class 3256 OID 90833)
-- Name: image_moderation_events image_moderation_events_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_moderation_events_select_own ON public.image_moderation_events FOR SELECT TO authenticated USING ((auth.uid() = uploader_user_id));


--
-- TOC entry 4709 (class 0 OID 90775)
-- Dependencies: 413
-- Name: image_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.image_reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4790 (class 3256 OID 97612)
-- Name: image_reports image_reports_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_reports_delete_admin ON public.image_reports FOR DELETE TO authenticated USING (public.is_admin());


--
-- TOC entry 4781 (class 3256 OID 90831)
-- Name: image_reports image_reports_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_reports_insert_authenticated ON public.image_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reporter_user_id));


--
-- TOC entry 4798 (class 3256 OID 118920)
-- Name: image_reports image_reports_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_reports_insert_own ON public.image_reports FOR INSERT TO authenticated WITH CHECK ((reporter_user_id = auth.uid()));


--
-- TOC entry 4788 (class 3256 OID 97610)
-- Name: image_reports image_reports_select_admin_or_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_reports_select_admin_or_own ON public.image_reports FOR SELECT TO authenticated USING ((public.is_admin() OR (reporter_user_id = auth.uid())));


--
-- TOC entry 4799 (class 3256 OID 118921)
-- Name: image_reports image_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_reports_select_own ON public.image_reports FOR SELECT TO authenticated USING ((reporter_user_id = auth.uid()));


--
-- TOC entry 4789 (class 3256 OID 97611)
-- Name: image_reports image_reports_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_reports_update_admin ON public.image_reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- TOC entry 4727 (class 0 OID 165566)
-- Dependencies: 449
-- Name: image_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.image_tags ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4848 (class 3256 OID 165584)
-- Name: image_tags image_tags_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_tags_delete_owner ON public.image_tags FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.images i
  WHERE ((i.id = image_tags.image_id) AND (i.uploader_user_id = auth.uid())))));


--
-- TOC entry 4847 (class 3256 OID 165583)
-- Name: image_tags image_tags_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_tags_insert_owner ON public.image_tags FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.images i
  WHERE ((i.id = image_tags.image_id) AND (i.uploader_user_id = auth.uid())))));


--
-- TOC entry 4846 (class 3256 OID 165582)
-- Name: image_tags image_tags_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY image_tags_select_authenticated ON public.image_tags FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.images i
  WHERE (i.id = image_tags.image_id))));


--
-- TOC entry 4698 (class 0 OID 35205)
-- Dependencies: 396
-- Name: images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4787 (class 3256 OID 94247)
-- Name: images images_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY images_delete_own ON public.images FOR DELETE TO authenticated USING ((uploader_user_id = auth.uid()));


--
-- TOC entry 4784 (class 3256 OID 94230)
-- Name: images images_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY images_insert_own ON public.images FOR INSERT TO authenticated WITH CHECK ((uploader_user_id = auth.uid()));


--
-- TOC entry 4785 (class 3256 OID 94245)
-- Name: images images_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY images_select_own ON public.images FOR SELECT TO authenticated USING ((uploader_user_id = auth.uid()));


--
-- TOC entry 4783 (class 3256 OID 94229)
-- Name: images images_select_public_or_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY images_select_public_or_own ON public.images FOR SELECT TO authenticated USING (((visibility = 'everyone'::public.content_visibility) OR (uploader_user_id = auth.uid())));


--
-- TOC entry 4746 (class 3256 OID 45184)
-- Name: images images_select_visible; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY images_select_visible ON public.images FOR SELECT TO authenticated USING (((uploader_user_id = auth.uid()) OR (visibility = 'everyone'::public.content_visibility)));


--
-- TOC entry 4786 (class 3256 OID 94246)
-- Name: images images_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY images_update_own ON public.images FOR UPDATE TO authenticated USING ((uploader_user_id = auth.uid())) WITH CHECK ((uploader_user_id = auth.uid()));


--
-- TOC entry 4717 (class 0 OID 157379)
-- Dependencies: 433
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4819 (class 3256 OID 157401)
-- Name: message_reactions message_reactions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_reactions_delete_own ON public.message_reactions FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4818 (class 3256 OID 157400)
-- Name: message_reactions message_reactions_insert_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_reactions_insert_participant ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.messages m
     JOIN public.message_thread_participants mtp ON ((mtp.thread_id = m.thread_id)))
  WHERE ((m.id = message_reactions.message_id) AND (mtp.user_id = auth.uid()))))));


--
-- TOC entry 4817 (class 3256 OID 157399)
-- Name: message_reactions message_reactions_select_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_reactions_select_participant ON public.message_reactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.messages m
     JOIN public.message_thread_participants mtp ON ((mtp.thread_id = m.thread_id)))
  WHERE ((m.id = message_reactions.message_id) AND (mtp.user_id = auth.uid())))));


--
-- TOC entry 4714 (class 0 OID 157172)
-- Dependencies: 428
-- Name: message_thread_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_thread_participants ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4808 (class 3256 OID 157231)
-- Name: message_thread_participants message_thread_participants_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_thread_participants_insert_self ON public.message_thread_participants FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4820 (class 3256 OID 158530)
-- Name: message_thread_participants message_thread_participants_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_thread_participants_select_own ON public.message_thread_participants FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4809 (class 3256 OID 157232)
-- Name: message_thread_participants message_thread_participants_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_thread_participants_update_self ON public.message_thread_participants FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4716 (class 0 OID 157349)
-- Dependencies: 432
-- Name: message_thread_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_thread_reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4816 (class 3256 OID 157378)
-- Name: message_thread_reports message_thread_reports_insert_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_thread_reports_insert_participant ON public.message_thread_reports FOR INSERT TO authenticated WITH CHECK (((reporter_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.message_thread_participants mtp
  WHERE ((mtp.thread_id = message_thread_reports.thread_id) AND (mtp.user_id = auth.uid()))))));


--
-- TOC entry 4815 (class 3256 OID 157377)
-- Name: message_thread_reports message_thread_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_thread_reports_select_own ON public.message_thread_reports FOR SELECT TO authenticated USING ((reporter_user_id = auth.uid()));


--
-- TOC entry 4713 (class 0 OID 157144)
-- Dependencies: 427
-- Name: message_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4806 (class 3256 OID 157228)
-- Name: message_threads message_threads_insert_connected; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_threads_insert_connected ON public.message_threads FOR INSERT TO authenticated WITH CHECK (((thread_kind = 'connected_dm'::text) AND (auth.uid() IS NOT NULL) AND ((auth.uid() = connection_user_id_a) OR (auth.uid() = connection_user_id_b)) AND public.are_users_connected(connection_user_id_a, connection_user_id_b)));


--
-- TOC entry 4805 (class 3256 OID 157213)
-- Name: message_threads message_threads_select_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_threads_select_participant ON public.message_threads FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.message_thread_participants mtp
  WHERE ((mtp.thread_id = message_threads.id) AND (mtp.user_id = auth.uid())))));


--
-- TOC entry 4807 (class 3256 OID 157229)
-- Name: message_threads message_threads_update_connected_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_threads_update_connected_participant ON public.message_threads FOR UPDATE TO authenticated USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.message_thread_participants mtp
  WHERE ((mtp.thread_id = message_threads.id) AND (mtp.user_id = auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.message_thread_participants mtp
  WHERE ((mtp.thread_id = message_threads.id) AND (mtp.user_id = auth.uid()))))));


--
-- TOC entry 4715 (class 0 OID 157192)
-- Dependencies: 430
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4810 (class 3256 OID 157233)
-- Name: messages messages_insert_connected_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert_connected_participant ON public.messages FOR INSERT TO authenticated WITH CHECK (((sender_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.message_threads mt
     JOIN public.message_thread_participants mtp ON ((mtp.thread_id = mt.id)))
  WHERE ((mt.id = messages.thread_id) AND (mt.thread_kind = 'connected_dm'::text) AND (mtp.user_id = auth.uid()))))));


--
-- TOC entry 4822 (class 3256 OID 158532)
-- Name: messages messages_insert_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert_participant ON public.messages FOR INSERT TO authenticated WITH CHECK (((sender_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.message_thread_participants mtp
  WHERE ((mtp.thread_id = messages.thread_id) AND (mtp.user_id = auth.uid()))))));


--
-- TOC entry 4821 (class 3256 OID 158531)
-- Name: messages messages_select_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select_participant ON public.messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.message_thread_participants mtp
  WHERE ((mtp.thread_id = messages.thread_id) AND (mtp.user_id = auth.uid())))));


--
-- TOC entry 4712 (class 0 OID 157118)
-- Dependencies: 425
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4803 (class 3256 OID 157140)
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4804 (class 3256 OID 157141)
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4703 (class 0 OID 35480)
-- Dependencies: 403
-- Name: post_albums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_albums ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4758 (class 3256 OID 56339)
-- Name: post_albums post_albums_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_albums_delete_own ON public.post_albums FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_albums.post_id) AND (p.author_user_id = auth.uid())))));


--
-- TOC entry 4757 (class 3256 OID 56338)
-- Name: post_albums post_albums_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_albums_insert_own ON public.post_albums FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_albums.post_id) AND (p.author_user_id = auth.uid())))));


--
-- TOC entry 4756 (class 3256 OID 56337)
-- Name: post_albums post_albums_select_via_post; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_albums_select_via_post ON public.post_albums FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_albums.post_id) AND ((p.author_user_id = auth.uid()) OR (p.visibility = 'everyone'::public.content_visibility))))));


--
-- TOC entry 4702 (class 0 OID 35442)
-- Dependencies: 402
-- Name: post_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4755 (class 3256 OID 56336)
-- Name: post_images post_images_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_images_delete_own ON public.post_images FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_images.post_id) AND (p.author_user_id = auth.uid())))));


--
-- TOC entry 4754 (class 3256 OID 56335)
-- Name: post_images post_images_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_images_insert_own ON public.post_images FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_images.post_id) AND (p.author_user_id = auth.uid())))));


--
-- TOC entry 4753 (class 3256 OID 56334)
-- Name: post_images post_images_select_via_post; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_images_select_via_post ON public.post_images FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_images.post_id) AND ((p.author_user_id = auth.uid()) OR (p.visibility = 'everyone'::public.content_visibility))))));


--
-- TOC entry 4721 (class 0 OID 158599)
-- Dependencies: 438
-- Name: post_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4813 (class 3256 OID 158631)
-- Name: post_reports post_reports_insert_viewer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reports_insert_viewer ON public.post_reports FOR INSERT TO authenticated WITH CHECK (((reporter_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE (p.id = post_reports.post_id)))));


--
-- TOC entry 4812 (class 3256 OID 158630)
-- Name: post_reports post_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reports_select_own ON public.post_reports FOR SELECT TO authenticated USING ((reporter_user_id = auth.uid()));


--
-- TOC entry 4737 (class 0 OID 168276)
-- Dependencies: 462
-- Name: post_stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_stories ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4877 (class 3256 OID 168396)
-- Name: post_stories post_stories_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_stories_delete_own ON public.post_stories FOR DELETE TO authenticated USING ((auth.uid() = author_user_id));


--
-- TOC entry 4875 (class 3256 OID 168394)
-- Name: post_stories post_stories_insert_own_post; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_stories_insert_own_post ON public.post_stories FOR INSERT TO authenticated WITH CHECK (((auth.uid() = author_user_id) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_stories.post_id) AND (p.author_user_id = auth.uid()) AND (COALESCE(p.hidden_by_suspension, false) = false))))));


--
-- TOC entry 4874 (class 3256 OID 168393)
-- Name: post_stories post_stories_select_visible; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_stories_select_visible ON public.post_stories FOR SELECT TO authenticated USING (((hidden_by_moderation = false) AND (hidden_by_suspension = false) AND public.can_view_post_for_story(post_id, auth.uid())));


--
-- TOC entry 4876 (class 3256 OID 168395)
-- Name: post_stories post_stories_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_stories_update_own ON public.post_stories FOR UPDATE TO authenticated USING ((auth.uid() = author_user_id)) WITH CHECK ((auth.uid() = author_user_id));


--
-- TOC entry 4738 (class 0 OID 168306)
-- Dependencies: 464
-- Name: post_story_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_story_images ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4880 (class 3256 OID 168399)
-- Name: post_story_images post_story_images_delete_own_story; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_images_delete_own_story ON public.post_story_images FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.post_stories ps
  WHERE ((ps.id = post_story_images.story_id) AND (ps.author_user_id = auth.uid())))));


--
-- TOC entry 4879 (class 3256 OID 168398)
-- Name: post_story_images post_story_images_insert_own_story; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_images_insert_own_story ON public.post_story_images FOR INSERT TO authenticated WITH CHECK (((auth.uid() = uploader_user_id) AND (EXISTS ( SELECT 1
   FROM public.post_stories ps
  WHERE ((ps.id = post_story_images.story_id) AND (ps.author_user_id = auth.uid()))))));


--
-- TOC entry 4878 (class 3256 OID 168397)
-- Name: post_story_images post_story_images_select_visible; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_images_select_visible ON public.post_story_images FOR SELECT TO authenticated USING (((hidden_by_moderation = false) AND (hidden_by_suspension = false) AND (EXISTS ( SELECT 1
   FROM public.post_stories ps
  WHERE ((ps.id = post_story_images.story_id) AND public.can_view_post_for_story(ps.post_id, auth.uid()))))));


--
-- TOC entry 4739 (class 0 OID 168328)
-- Dependencies: 465
-- Name: post_story_likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_story_likes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4884 (class 3256 OID 168403)
-- Name: post_story_likes post_story_likes_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_likes_delete_own ON public.post_story_likes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4882 (class 3256 OID 168401)
-- Name: post_story_likes post_story_likes_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_likes_insert_own ON public.post_story_likes FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.post_stories ps
  WHERE ((ps.id = post_story_likes.story_id) AND public.can_view_post_for_story(ps.post_id, auth.uid()))))));


--
-- TOC entry 4881 (class 3256 OID 168400)
-- Name: post_story_likes post_story_likes_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_likes_select_authenticated ON public.post_story_likes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.post_stories ps
  WHERE ((ps.id = post_story_likes.story_id) AND public.can_view_post_for_story(ps.post_id, auth.uid())))));


--
-- TOC entry 4883 (class 3256 OID 168402)
-- Name: post_story_likes post_story_likes_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_likes_update_own ON public.post_story_likes FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4740 (class 0 OID 168349)
-- Dependencies: 467
-- Name: post_story_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_story_reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4886 (class 3256 OID 168405)
-- Name: post_story_reports post_story_reports_insert_viewer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_reports_insert_viewer ON public.post_story_reports FOR INSERT TO authenticated WITH CHECK (((auth.uid() = reporter_user_id) AND (EXISTS ( SELECT 1
   FROM public.post_stories ps
  WHERE ((ps.id = post_story_reports.story_id) AND public.can_view_post_for_story(ps.post_id, auth.uid()))))));


--
-- TOC entry 4885 (class 3256 OID 168404)
-- Name: post_story_reports post_story_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_story_reports_select_own ON public.post_story_reports FOR SELECT TO authenticated USING ((auth.uid() = reporter_user_id));


--
-- TOC entry 4705 (class 0 OID 35665)
-- Dependencies: 407
-- Name: post_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4762 (class 3256 OID 56343)
-- Name: post_views post_views_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_views_insert_own ON public.post_views FOR INSERT TO authenticated WITH CHECK ((viewer_user_id = auth.uid()));


--
-- TOC entry 4763 (class 3256 OID 56344)
-- Name: post_views post_views_select_author; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_views_select_author ON public.post_views FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_views.post_id) AND (p.author_user_id = auth.uid())))));


--
-- TOC entry 4701 (class 0 OID 35405)
-- Dependencies: 401
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4752 (class 3256 OID 56333)
-- Name: posts posts_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_delete_own ON public.posts FOR DELETE TO authenticated USING ((author_user_id = auth.uid()));


--
-- TOC entry 4750 (class 3256 OID 56331)
-- Name: posts posts_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_insert_own ON public.posts FOR INSERT TO authenticated WITH CHECK ((author_user_id = auth.uid()));


--
-- TOC entry 4748 (class 3256 OID 56317)
-- Name: posts posts_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_select_authenticated ON public.posts FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4749 (class 3256 OID 56330)
-- Name: posts posts_select_visibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_select_visibility ON public.posts FOR SELECT TO authenticated USING (((author_user_id = auth.uid()) OR (visibility = 'everyone'::public.content_visibility)));


--
-- TOC entry 4751 (class 3256 OID 56332)
-- Name: posts posts_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_update_own ON public.posts FOR UPDATE TO authenticated USING ((author_user_id = auth.uid())) WITH CHECK ((author_user_id = auth.uid()));


--
-- TOC entry 4734 (class 0 OID 167963)
-- Dependencies: 457
-- Name: profile_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4850 (class 3256 OID 167983)
-- Name: profile_visits profile_visits_insert_as_viewer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_visits_insert_as_viewer ON public.profile_visits FOR INSERT WITH CHECK (((auth.uid() = viewer_user_id) AND (viewed_user_id <> viewer_user_id)));


--
-- TOC entry 4873 (class 3256 OID 167982)
-- Name: profile_visits profile_visits_select_viewed_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profile_visits_select_viewed_owner ON public.profile_visits FOR SELECT USING ((auth.uid() = viewed_user_id));


--
-- TOC entry 4730 (class 0 OID 166757)
-- Dependencies: 452
-- Name: sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4696 (class 0 OID 26811)
-- Dependencies: 393
-- Name: user_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4761 (class 3256 OID 56342)
-- Name: user_contacts user_contacts_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_contacts_delete_own ON public.user_contacts FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4760 (class 3256 OID 56341)
-- Name: user_contacts user_contacts_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_contacts_insert_own ON public.user_contacts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4759 (class 3256 OID 56340)
-- Name: user_contacts user_contacts_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_contacts_select_own ON public.user_contacts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4711 (class 0 OID 139263)
-- Dependencies: 419
-- Name: user_daily_logins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_logins ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4802 (class 3256 OID 139274)
-- Name: user_daily_logins user_daily_logins_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_daily_logins_insert_own ON public.user_daily_logins FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4801 (class 3256 OID 139273)
-- Name: user_daily_logins user_daily_logins_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_daily_logins_select_own ON public.user_daily_logins FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4719 (class 0 OID 158553)
-- Dependencies: 435
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4826 (class 3256 OID 158567)
-- Name: user_presence user_presence_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_presence_select_authenticated ON public.user_presence FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4828 (class 3256 OID 158569)
-- Name: user_presence user_presence_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_presence_update_self ON public.user_presence FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4827 (class 3256 OID 158568)
-- Name: user_presence user_presence_upsert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_presence_upsert_self ON public.user_presence FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4697 (class 0 OID 35140)
-- Dependencies: 394
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4742 (class 3256 OID 43806)
-- Name: user_profiles user_profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_insert_own ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4769 (class 3256 OID 63270)
-- Name: user_profiles user_profiles_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_select_authenticated ON public.user_profiles FOR SELECT TO authenticated USING (true);


--
-- TOC entry 4741 (class 3256 OID 43805)
-- Name: user_profiles user_profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_select_own ON public.user_profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- TOC entry 4743 (class 3256 OID 43807)
-- Name: user_profiles user_profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_update_own ON public.user_profiles FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4736 (class 0 OID 168147)
-- Dependencies: 460
-- Name: user_registration_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_registration_orders ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4854 (class 3256 OID 168161)
-- Name: user_registration_orders user_registration_orders_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_registration_orders_select_own ON public.user_registration_orders FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4733 (class 0 OID 167930)
-- Dependencies: 455
-- Name: wellbeing_daily_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wellbeing_daily_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4872 (class 3256 OID 167957)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_daily_entries_delete_own ON public.wellbeing_daily_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4870 (class 3256 OID 167955)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_daily_entries_insert_own ON public.wellbeing_daily_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4869 (class 3256 OID 167954)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_daily_entries_select_own ON public.wellbeing_daily_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4871 (class 3256 OID 167956)
-- Name: wellbeing_daily_entries wellbeing_daily_entries_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_daily_entries_update_own ON public.wellbeing_daily_entries FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4735 (class 0 OID 168005)
-- Dependencies: 458
-- Name: wellbeing_plan_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wellbeing_plan_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4853 (class 3256 OID 168114)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_plan_entries_delete_own ON public.wellbeing_plan_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4851 (class 3256 OID 168112)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_plan_entries_insert_own ON public.wellbeing_plan_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4844 (class 3256 OID 168111)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_plan_entries_select_own ON public.wellbeing_plan_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4852 (class 3256 OID 168113)
-- Name: wellbeing_plan_entries wellbeing_plan_entries_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wellbeing_plan_entries_update_own ON public.wellbeing_plan_entries FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


-- Completed on 2026-04-25 08:50:51

--
-- PostgreSQL database dump complete
--

\unrestrict 1FbjHLIOrZsbaRPRRaelS4U0Rsy2efaBrnPpNOkSClndGGI2sHfstC1C3mvmsDi

