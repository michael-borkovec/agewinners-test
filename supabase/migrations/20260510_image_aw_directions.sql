/*
 * File purpose
 * - Add optional multi-direction metadata for images.
 * - Store AW směr selections separately from existing image_tags.
 * - Keep writes limited to the image owner through RLS.
 */

begin;

create table if not exists public.image_aw_directions (
  image_id bigint not null references public.images(id) on delete cascade,
  direction_key text not null,
  created_at timestamptz not null default now(),
  constraint image_aw_directions_pkey primary key (image_id, direction_key),
  constraint image_aw_directions_key_check check (
    direction_key in (
      'sport_movement',
      'cosmetics_style',
      'nutrition_lifestyle',
      'supplements_superfoods',
      'recovery_energy',
      'aesthetic_care'
    )
  )
);

create index if not exists image_aw_directions_direction_idx
  on public.image_aw_directions (direction_key, image_id);

alter table public.image_aw_directions enable row level security;

drop policy if exists "image_aw_directions_select_authenticated" on public.image_aw_directions;
create policy "image_aw_directions_select_authenticated"
  on public.image_aw_directions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.images i
      where i.id = image_aw_directions.image_id
    )
  );

drop policy if exists "image_aw_directions_insert_owner" on public.image_aw_directions;
create policy "image_aw_directions_insert_owner"
  on public.image_aw_directions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.images i
      where i.id = image_aw_directions.image_id
        and i.uploader_user_id = auth.uid()
    )
  );

drop policy if exists "image_aw_directions_delete_owner" on public.image_aw_directions;
create policy "image_aw_directions_delete_owner"
  on public.image_aw_directions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.images i
      where i.id = image_aw_directions.image_id
        and i.uploader_user_id = auth.uid()
    )
  );

commit;
