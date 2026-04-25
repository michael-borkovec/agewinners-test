create table if not exists public.hidden_images (
  user_id uuid not null references auth.users (id) on delete cascade,
  image_id bigint not null references public.images (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, image_id)
);

create index if not exists hidden_images_image_idx
  on public.hidden_images (image_id, user_id);

alter table public.hidden_images enable row level security;

drop policy if exists "hidden_images_select_own" on public.hidden_images;
create policy "hidden_images_select_own"
  on public.hidden_images
  for select
  using (auth.uid() = user_id);

drop policy if exists "hidden_images_insert_own" on public.hidden_images;
create policy "hidden_images_insert_own"
  on public.hidden_images
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "hidden_images_delete_own" on public.hidden_images;
create policy "hidden_images_delete_own"
  on public.hidden_images
  for delete
  using (auth.uid() = user_id);
