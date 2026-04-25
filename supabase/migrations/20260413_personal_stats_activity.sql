/*
 * File purpose
 * - Update personal stats activity RPC for the Osobni statistics section
 * - Replace album/login activity columns with comments and like activity
 * - Keep comment-like counts safe when comment_likes is not installed yet
 */

begin;

drop function if exists public.aw_user_activity_50_days();

create or replace function public.aw_user_activity_50_days()
returns table (
  day date,
  photos bigint,
  comments bigint,
  posts bigint,
  ratings bigint,
  image_likes_given bigint,
  comment_likes_given bigint,
  image_likes_received bigint,
  comment_likes_received bigint
)
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.aw_user_activity_50_days() from public;
grant execute on function public.aw_user_activity_50_days() to authenticated;

commit;
