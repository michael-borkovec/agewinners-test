/**
 * File purpose
 * - Add stored consent fields for profile personalization / ad targeting
 * - Keep timestamp of when the user granted consent
 * - Related to /profile/personal
 */

begin;

alter table public.user_profiles
  add column if not exists personalization_ads_consent boolean not null default false,
  add column if not exists personalization_ads_consent_at timestamptz null;

commit;
