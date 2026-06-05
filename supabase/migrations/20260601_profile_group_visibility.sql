/**
 * Profile group visibility
 * - Adds group-level visibility settings for social links and selected "About me" fields.
 * - Values: everyone, contacts, private.
 * - Old *_hidden booleans remain for backwards compatibility while UI moves to group controls.
 */

alter table public.user_profiles
  add column if not exists social_links_visibility text not null default 'contacts',
  add column if not exists profile_age_visibility text not null default 'contacts',
  add column if not exists profile_occupation_visibility text not null default 'contacts',
  add column if not exists profile_education_visibility text not null default 'contacts',
  add column if not exists profile_languages_visibility text not null default 'contacts',
  add column if not exists profile_relationship_visibility text not null default 'contacts',
  add column if not exists profile_motivation_visibility text not null default 'contacts',
  add column if not exists profile_body_visibility text not null default 'contacts';

alter table public.user_profiles
  drop constraint if exists user_profiles_social_links_visibility_check,
  drop constraint if exists user_profiles_profile_age_visibility_check,
  drop constraint if exists user_profiles_profile_occupation_visibility_check,
  drop constraint if exists user_profiles_profile_education_visibility_check,
  drop constraint if exists user_profiles_profile_languages_visibility_check,
  drop constraint if exists user_profiles_profile_relationship_visibility_check,
  drop constraint if exists user_profiles_profile_motivation_visibility_check,
  drop constraint if exists user_profiles_profile_body_visibility_check;

alter table public.user_profiles
  add constraint user_profiles_social_links_visibility_check check (social_links_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_age_visibility_check check (profile_age_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_occupation_visibility_check check (profile_occupation_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_education_visibility_check check (profile_education_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_languages_visibility_check check (profile_languages_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_relationship_visibility_check check (profile_relationship_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_motivation_visibility_check check (profile_motivation_visibility in ('everyone', 'contacts', 'private')),
  add constraint user_profiles_profile_body_visibility_check check (profile_body_visibility in ('everyone', 'contacts', 'private'));
