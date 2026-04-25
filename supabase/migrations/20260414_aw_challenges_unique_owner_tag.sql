/*
 * File purpose
 * - Ensure AW challenge tags are unique per owner
 * - Keep tags reusable across different users
 */

begin;

create unique index if not exists aw_challenges_owner_challenge_tag_unique_idx
  on public.aw_challenges (owner_user_id, lower(challenge_tag))
  where challenge_tag is not null;

commit;
