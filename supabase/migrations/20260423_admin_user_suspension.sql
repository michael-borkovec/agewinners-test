/**
 * Admin user suspension
 *
 * Adds a reversible account suspension state.
 * Suspension hides profile-owned content and comments without deleting history:
 * - age_guesses, messages, likes, connections and notifications are left intact
 * - hidden_by_suspension keeps moderation/deletion flags separate and restorable
 */

alter table public.user_profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists suspended_at timestamptz null,
  add column if not exists suspended_by uuid null references auth.users(id) on delete set null,
  add column if not exists suspension_reason text null;

alter table public.user_profiles
  drop constraint if exists user_profiles_account_status_check;

alter table public.user_profiles
  add constraint user_profiles_account_status_check
  check (account_status in ('active', 'suspended'));

alter table public.posts
  add column if not exists hidden_by_suspension boolean not null default false;

alter table public.images
  add column if not exists hidden_by_suspension boolean not null default false;

alter table public.comments
  add column if not exists hidden_by_suspension boolean not null default false;

create index if not exists user_profiles_account_status_idx
  on public.user_profiles (account_status, user_id);

create index if not exists posts_hidden_by_suspension_idx
  on public.posts (hidden_by_suspension, author_user_id);

create index if not exists images_hidden_by_suspension_idx
  on public.images (hidden_by_suspension, uploader_user_id);

create index if not exists comments_hidden_by_suspension_idx
  on public.comments (hidden_by_suspension, author_user_id);

create or replace function public.is_user_suspended(p_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.user_id = p_user_id
      and up.account_status = 'suspended'
  );
$$;

create or replace function public.apply_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_admin_user_id uuid default auth.uid(),
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.apply_user_suspension(uuid, boolean, uuid, text) from public;
grant execute on function public.apply_user_suspension(uuid, boolean, uuid, text) to authenticated;
