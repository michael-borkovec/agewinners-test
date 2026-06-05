/*
 * Gamified feed batch selection
 * - Returns eligible feed images for the authenticated viewer.
 * - Computes feed_score from contribution, author power score, under-tipped, recency and diversity signals.
 * - Keeps active album logic on post_albums and never uses legacy posts.album_id.
 */

create or replace function public.get_gamified_feed_image_batch(
  p_limit integer default 10,
  p_tags text[] default array[]::text[],
  p_hidden_mode text default 'exclude'
)
returns table (
  image_id bigint,
  post_id bigint,
  author_user_id uuid,
  feed_score numeric,
  contribution_score numeric,
  power_score numeric,
  power_score_norm numeric,
  under_tipped_score numeric,
  recency_score numeric,
  diversity_score numeric,
  selection_bucket text
)
language sql
security definer
set search_path = public
as $$
with viewer as (
  select
    auth.uid() as user_id,
    coalesce(up.super_user, false) or up.role in ('moderator', 'admin') as is_privileged
  from public.user_profiles up
  where up.user_id = auth.uid()
),
params as (
  select
    greatest(1, least(coalesce(p_limit, 10), 50))::integer as batch_limit,
    greatest(0, least(7, greatest(1, least(coalesce(p_limit, 10), 50))))::integer as preferred_limit,
    case when p_hidden_mode in ('exclude', 'include', 'only') then p_hidden_mode else 'exclude' end as hidden_mode,
    coalesce(p_tags, array[]::text[]) as tags
),
post_album_context as (
  select distinct on (pa.post_id)
    pa.post_id,
    pa.album_id
  from public.post_albums pa
  order by pa.post_id, pa.sort_order asc nulls last, pa.created_at asc
),
base_candidates as (
  select
    i.id as image_id,
    p.id as post_id,
    i.uploader_user_id as author_user_id,
    i.visibility as image_visibility,
    coalesce(a.visibility, p.visibility, 'everyone'::public.content_visibility) as effective_post_visibility,
    i.guesses_count,
    i.created_at as image_created_at,
    up.created_at as author_created_at,
    coalesce(hp.post_id is not null, false) as hidden_post_by_viewer,
    coalesce(hi.image_id is not null, false) as hidden_image_by_viewer
  from viewer v
  cross join params prm
  join public.post_images pi on true
  join public.posts p on p.id = pi.post_id
  join public.images i on i.id = pi.image_id
  join public.user_profiles up on up.user_id = i.uploader_user_id
  left join post_album_context pac on pac.post_id = p.id
  left join public.albums a on a.id = pac.album_id
  left join public.hidden_posts hp on hp.user_id = v.user_id and hp.post_id = p.id
  left join public.hidden_images hi on hi.user_id = v.user_id and hi.image_id = i.id
  where v.user_id is not null
    and i.uploader_user_id <> v.user_id
    and p.author_user_id <> v.user_id
    and coalesce(i.hidden_by_suspension, false) = false
    and coalesce(i.hidden_by_admin, false) = false
    and coalesce(p.hidden_by_suspension, false) = false
    and coalesce(up.account_status, 'active') <> 'suspended'
    and not exists (
      select 1
      from public.age_guesses ag
      where ag.image_id = i.id
        and ag.guesser_user_id = v.user_id
    )
    and (
      cardinality(prm.tags) = 0
      or i.photo_category::text = any(prm.tags)
      or exists (
        select 1
        from public.image_tags it
        where it.image_id = i.id
          and it.tag = any(prm.tags)
      )
    )
    and (
      prm.hidden_mode = 'include'
      or (prm.hidden_mode = 'exclude' and hp.post_id is null and hi.image_id is null)
      or (prm.hidden_mode = 'only' and (hp.post_id is not null or hi.image_id is not null))
    )
    and (
      v.is_privileged
      or (
        (
          i.visibility = 'everyone'
          or (
            i.visibility = 'contacts'
            and exists (
              select 1
              from public.connections c
              where c.status = 'accepted'
                and (
                  (c.user_id_a = v.user_id and c.user_id_b = i.uploader_user_id)
                  or (c.user_id_b = v.user_id and c.user_id_a = i.uploader_user_id)
                )
            )
          )
        )
        and (
          coalesce(a.visibility, p.visibility, 'everyone'::public.content_visibility) = 'everyone'
          or (
            coalesce(a.visibility, p.visibility, 'everyone'::public.content_visibility) = 'contacts'
            and exists (
              select 1
              from public.connections c
              where c.status = 'accepted'
                and (
                  (c.user_id_a = v.user_id and c.user_id_b = i.uploader_user_id)
                  or (c.user_id_b = v.user_id and c.user_id_a = i.uploader_user_id)
                )
            )
          )
        )
      )
    )
),
authors as (
  select distinct author_user_id
  from base_candidates
),
author_activity as (
  select
    au.author_user_id,
    coalesce(given.given_tips_30d, 0)::numeric as given_tips_30d,
    coalesce(received.received_tips_30d, 0)::numeric as received_tips_30d,
    coalesce(pwr_guesses.guesses_public_90d, 0)::numeric as guesses_public_90d,
    coalesce(pwr_guesses.guesses_anonymous_90d, 0)::numeric as guesses_anonymous_90d,
    coalesce(pwr_guesses.avg_acc_pct_90d, 0)::numeric as avg_acc_pct_90d,
    coalesce(pwr_guesses.active_days_90d, 0)::numeric as active_days_90d,
    coalesce(uploads.uploads_90d, 0)::numeric as uploads_90d,
    coalesce(rejected.rejected_photos_360d, 0)::numeric as rejected_photos_360d,
    coalesce(up.allow_age_visible, true) as allow_age_visible
  from authors au
  join public.user_profiles up on up.user_id = au.author_user_id
  left join lateral (
    select count(*) as given_tips_30d
    from public.age_guesses ag
    join public.images target_i on target_i.id = ag.image_id
    where ag.guesser_user_id = au.author_user_id
      and target_i.uploader_user_id <> au.author_user_id
      and ag.created_at >= now() - interval '30 days'
  ) given on true
  left join lateral (
    select count(*) as received_tips_30d
    from public.age_guesses ag
    join public.images owned_i on owned_i.id = ag.image_id
    where owned_i.uploader_user_id = au.author_user_id
      and ag.created_at >= now() - interval '30 days'
  ) received on true
  left join lateral (
    select
      count(*) filter (where coalesce(ag.is_anonymous, false) = false)::integer as guesses_public_90d,
      count(*) filter (where coalesce(ag.is_anonymous, false) = true)::integer as guesses_anonymous_90d,
      coalesce(avg(greatest(0, least(100, 100 - abs(ag.guessed_age - img.real_age_years)))), 0)::numeric as avg_acc_pct_90d,
      count(distinct ag.created_at::date)::integer as active_days_90d
    from public.age_guesses ag
    join public.images img on img.id = ag.image_id
    where ag.guesser_user_id = au.author_user_id
      and ag.created_at >= now() - interval '90 days'
  ) pwr_guesses on true
  left join lateral (
    select count(*)::integer as uploads_90d
    from public.images uploaded
    where uploaded.uploader_user_id = au.author_user_id
      and uploaded.created_at >= now() - interval '90 days'
  ) uploads on true
  left join lateral (
    select count(*)::integer as rejected_photos_360d
    from public.image_moderation_events e
    where e.uploader_user_id = au.author_user_id
      and e.event_type = 'rejected_and_deleted'
      and e.created_at >= now() - interval '360 days'
  ) rejected on true
),
scored as (
  select
    bc.image_id,
    bc.post_id,
    bc.author_user_id,
    greatest(
      case
        when bc.author_created_at >= now() - interval '7 days'
          then greatest(((aa.given_tips_30d - aa.received_tips_30d + 20.0) / 40.0), 0.50)
        else ((aa.given_tips_30d - aa.received_tips_30d + 20.0) / 40.0)
      end,
      0
    )::numeric as raw_contribution_score,
    (
      (aa.avg_acc_pct_90d / 100.0)
      * (0.40 * aa.guesses_public_90d + 0.15 * aa.guesses_anonymous_90d)
      + (
        case when aa.allow_age_visible then 0.70 else 0.15 end
        * (aa.avg_acc_pct_90d / 100.0)
        * (0.40 * aa.guesses_public_90d + 0.15 * aa.guesses_anonymous_90d)
        * (aa.active_days_90d / greatest(1, 90 - aa.active_days_90d))
      )
      + (aa.uploads_90d * 3.0)
      + (aa.rejected_photos_360d * -100.0)
    )::numeric as power_score,
    (1 - greatest(0, least(1, coalesce(bc.guesses_count, 0)::numeric / 30.0)))::numeric as under_tipped_score,
    greatest(0, least(1, 1 - (extract(epoch from (now() - bc.image_created_at)) / 86400.0) / 14.0))::numeric as recency_score
  from base_candidates bc
  join author_activity aa on aa.author_user_id = bc.author_user_id
),
scored_clamped as (
  select
    s.*,
    greatest(0, least(1, s.raw_contribution_score))::numeric as contribution_score,
    greatest(0, least(1, s.power_score / 500.0))::numeric as power_score_norm
  from scored s
),
ranked_preferred as (
  select
    s.*,
    row_number() over (partition by s.author_user_id order by s.feed_score desc, random()) as author_rank,
    row_number() over (order by s.feed_score desc, random()) as global_rank
  from (
    select
      sc.*,
      (
        0.40 * sc.contribution_score
        + 0.20 * sc.power_score_norm
        + 0.20 * sc.under_tipped_score
        + 0.10 * sc.recency_score
        + 0.10 * 1.0
      )::numeric as feed_score
    from scored_clamped sc
  ) s
),
preferred as (
  select
    rp.image_id,
    rp.post_id,
    rp.author_user_id,
    rp.feed_score,
    rp.contribution_score,
    rp.power_score,
    rp.power_score_norm,
    rp.under_tipped_score,
    rp.recency_score,
    1.0::numeric as diversity_score,
    'preferred'::text as selection_bucket
  from ranked_preferred rp
  cross join params prm
  where rp.author_rank <= 2
  order by rp.feed_score desc, random()
  limit (select preferred_limit from params)
),
preferred_author_counts as (
  select author_user_id, count(*)::integer as selected_count
  from preferred
  group by author_user_id
),
random_ranked as (
  select
    sc.*,
    row_number() over (partition by sc.author_user_id order by random()) as author_random_rank,
    coalesce(pac.selected_count, 0) as already_selected_count
  from scored_clamped sc
  left join preferred_author_counts pac on pac.author_user_id = sc.author_user_id
  where not exists (
    select 1
    from preferred p
    where p.image_id = sc.image_id
  )
),
random_pick as (
  select
    rr.image_id,
    rr.post_id,
    rr.author_user_id,
    (
      0.40 * rr.contribution_score
      + 0.20 * rr.power_score_norm
      + 0.20 * rr.under_tipped_score
      + 0.10 * rr.recency_score
      + 0.10 * (
        case
          when rr.already_selected_count = 0 then 1.0
          when rr.already_selected_count = 1 then 0.5
          else 0.0
        end
      )
    )::numeric as feed_score,
    rr.contribution_score,
    rr.power_score,
    rr.power_score_norm,
    rr.under_tipped_score,
    rr.recency_score,
    (
      case
        when rr.already_selected_count = 0 then 1.0
        when rr.already_selected_count = 1 then 0.5
        else 0.0
      end
    )::numeric as diversity_score,
    'random'::text as selection_bucket
  from random_ranked rr
  cross join params prm
  where rr.author_random_rank <= greatest(0, 2 - rr.already_selected_count)
  order by random()
  limit (
    select greatest(0, batch_limit - (select count(*) from preferred))
    from params
  )
),
final_batch as (
  select * from preferred
  union all
  select * from random_pick
)
select
  fb.image_id,
  fb.post_id,
  fb.author_user_id,
  fb.feed_score,
  fb.contribution_score,
  fb.power_score,
  fb.power_score_norm,
  fb.under_tipped_score,
  fb.recency_score,
  fb.diversity_score,
  fb.selection_bucket
from final_batch fb
order by random()
limit (select batch_limit from params);
$$;

revoke all on function public.get_gamified_feed_image_batch(integer, text[], text) from public;
grant execute on function public.get_gamified_feed_image_batch(integer, text[], text) to authenticated;
