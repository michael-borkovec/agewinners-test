/*
 * File purpose
 * - Allow switching an active challenge from automatic period scope to challenge-tag scope
 * - Require creating the tag in the same update
 * - Keep all other challenge definition fields immutable
 */

begin;

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
