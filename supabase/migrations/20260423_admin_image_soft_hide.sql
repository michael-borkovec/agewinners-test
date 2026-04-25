/**
 * Admin image soft hide
 *
 * Hidden images remain in public.images so AW age, AW score, power score,
 * and historical guessing accuracy keep the same inputs as before hiding.
 * UI/API list views can exclude hidden images without hard-deleting metrics data.
 */

alter table public.images
  add column if not exists hidden_by_admin boolean not null default false,
  add column if not exists hidden_by_admin_at timestamptz,
  add column if not exists hidden_by_admin_by uuid references auth.users(id) on delete set null;

create index if not exists images_hidden_by_admin_idx
  on public.images (hidden_by_admin, uploader_user_id, created_at);
