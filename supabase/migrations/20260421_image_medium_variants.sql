/**
 * Image medium variants
 *
 * Adds a 1024px feed/display variant between thumbnail and detail image.
 * Existing rows remain valid; the app falls back to public_url when medium is missing.
 */

alter table public.images
  add column if not exists storage_path_medium text,
  add column if not exists public_url_medium text;
