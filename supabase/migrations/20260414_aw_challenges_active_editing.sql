/*
 * File purpose
 * - Allow limited editing of active AW challenges
 * - Allow creating a challenge tag once when it does not exist yet
 * - Keep AW score baseline/target and original challenge definition immutable
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
      or new.photo_scope is distinct from old.photo_scope
      or new.public_message is distinct from old.public_message
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
