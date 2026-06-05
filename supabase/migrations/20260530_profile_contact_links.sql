/**
 * Profile contact links
 * - Adds optional public/contact social links to user_profiles.
 * - All values are edited only by the profile owner through existing RLS-protected profile update paths.
 */

alter table public.user_profiles
  add column if not exists website_url text,
  add column if not exists website_url_hidden boolean not null default false,
  add column if not exists public_email text,
  add column if not exists public_email_hidden boolean not null default true,
  add column if not exists instagram_url text,
  add column if not exists instagram_url_hidden boolean not null default false,
  add column if not exists facebook_url text,
  add column if not exists facebook_url_hidden boolean not null default false,
  add column if not exists tiktok_url text,
  add column if not exists tiktok_url_hidden boolean not null default false,
  add column if not exists youtube_url text,
  add column if not exists youtube_url_hidden boolean not null default false,
  add column if not exists linkedin_url text,
  add column if not exists linkedin_url_hidden boolean not null default false,
  add column if not exists x_url text,
  add column if not exists x_url_hidden boolean not null default false,
  add column if not exists contact_note text,
  add column if not exists contact_note_hidden boolean not null default false;
