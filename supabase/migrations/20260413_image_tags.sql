/*
 * File purpose
 * - Add multi-tag support for images
 * - Backfill existing legacy photo_category values into image_tags
 * - Keep tag writes limited to the image owner through RLS
 */

begin;

create table if not exists public.image_tags (
  image_id bigint not null references public.images(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  constraint image_tags_pkey primary key (image_id, tag),
  constraint image_tags_tag_not_blank check (length(trim(tag)) > 0),
  constraint image_tags_tag_length check (char_length(tag) <= 40)
);

create index if not exists image_tags_tag_idx
  on public.image_tags (tag, image_id);

insert into public.image_tags (image_id, tag)
select i.id, i.photo_category::text
from public.images i
where i.photo_category is not null
  and trim(i.photo_category::text) <> ''
  and i.photo_category::text <> 'bezna'
on conflict (image_id, tag) do nothing;

delete from public.image_tags
where tag = 'bezna';

alter table public.image_tags enable row level security;

drop policy if exists "image_tags_select_authenticated" on public.image_tags;
create policy "image_tags_select_authenticated"
  on public.image_tags
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.images i
      where i.id = image_tags.image_id
    )
  );

drop policy if exists "image_tags_insert_owner" on public.image_tags;
create policy "image_tags_insert_owner"
  on public.image_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.images i
      where i.id = image_tags.image_id
        and i.uploader_user_id = auth.uid()
    )
  );

drop policy if exists "image_tags_delete_owner" on public.image_tags;
create policy "image_tags_delete_owner"
  on public.image_tags
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.images i
      where i.id = image_tags.image_id
        and i.uploader_user_id = auth.uid()
    )
  );

commit;
