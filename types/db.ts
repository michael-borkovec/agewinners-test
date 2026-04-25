/**
 * types/db.ts
 *
 * Purpose:
 * - Shared DB-related TypeScript types used across the UI and API layer.
 * - Includes enums and user_profiles shape (DbUserProfile).
 */

export type ContentVisibility = "everyone" | "contacts" | "private";
export type AgeRevealMode = "never" | "delayed" | "immediate";

/**
 * DB user role (column: public.user_profiles.role, enum: public.user_role).
 */
export type DbUserRole = "user" | "moderator" | "admin";
export type UserAccountStatus = "active" | "suspended";

export type DbAlbum = {
  id: number;
  owner_user_id: string;
  title: string;
  description?: string | null;
  visibility?: ContentVisibility | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Personal profile enums (stored as TEXT in DB, kept as union for UI safety) */
export type EducationLevel =
  | "Základní"
  | "Vyučen / odborné vzdělání"
  | "Střední škola bez maturity"
  | "Střední škola s maturitou"
  | "Vyšší odborná škola (VOŠ)"
  | "Vysokoškolské – bakalářské"
  | "Vysokoškolské – magisterské"
  | "Vysokoškolské – doktorské"
  | "Nechci uvádět";

export type RelationshipStatus =
  | "Single"
  | "Ve vztahu"
  | "Manželství"
  | "Rozvedený/á"
  | "Je to komplikované"
  | "Nechci uvádět";

export type SelfView =
  | "Optimista"
  | "Spíše optimista"
  | "Realista"
  | "Spíše pesimista"
  | "Pesimista"
  | "Nevím / nechci řešit";

export type DietPreference =
  | "Běžná"
  | "Zdravá"
  | "Občasný vegetarián"
  | "Vegetarián"
  | "Vegan"
  | "Pescetarián"
  | "Maso, maso a zase maso"
  | "Nechci uvádět";

export type AlcoholUse =
  | "Abstinent"
  | "Výjimečně"
  | "Občas"
  | "Často"
  | "Každý den"
  | "Závislý"
  | "Nechci uvádět";

export type Smoking =
  | "Nekouřím"
  | "Výjimečně"
  | "Občas"
  | "Denně"
  | "Závislý"
  | "Nechci uvádět";

export type Mindset = "Klid" | "Motivace" | "Růst" | "Radost" | "Rovnováha" | "Nechci uvádět";

export type LifePace = "Pomalé" | "Vyvážené" | "Aktivní" | "Velmi aktivní" | "Nechci uvádět";

export type DbUserProfile = {
  user_id: string;
  registration_number?: number | null;

  display_name: string | null;
  bio: string | null; // short public bio (we keep this existing column)
  avatar_url: string | null;

  // onboarding + identity
  date_of_birth: string | null;
  super_user?: boolean | null;

  /** Role-based access (admin/moderator/user) */
  role?: DbUserRole | null;
  account_status?: UserAccountStatus | null;
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;

  // defaults
  default_post_visibility?: ContentVisibility | null;
  default_album_visibility?: ContentVisibility | null;
  default_image_visibility?: ContentVisibility | null;
comments_visibility?: ContentVisibility | null;

  wellbeing_daily_entry_visibility_default?: ContentVisibility | null;

  default_age_reveal_mode?: AgeRevealMode | null;
  default_age_reveal_delay_days?: number | null;

  allow_age_visible?: boolean | null;
  allow_connection_requests?: boolean | null;
  anonymous_guesses_default?: boolean | null;

  // network privacy
  allow_connections?: boolean | null;
  allow_following?: boolean | null;
  notify_connection_requests?: boolean | null;
  notify_connection_declined?: boolean | null;
  notify_contact_removed?: boolean | null;
  notify_follow_started?: boolean | null;
  notify_follow_stopped?: boolean | null;
  notify_photo_commented?: boolean | null;

  // -----------------------------
  // PERSONAL (/profile/personal)
  // -----------------------------

  // identity & self-expression
  bio_contacts?: string | null;
  bio_contacts_hidden?: boolean | null;

  occupation?: string | null;
  occupation_hidden?: boolean | null;
  is_student?: boolean | null;
  is_student_hidden?: boolean | null;

  education_level?: EducationLevel | string | null;
  education_level_hidden?: boolean | null;

  native_languages?: string[] | null;
  native_languages_hidden?: boolean | null;
  other_languages?: string[] | null;
  other_languages_hidden?: boolean | null;

  relationship_status?: RelationshipStatus | string | null;
  relationship_status_hidden?: boolean | null;

  motivation_text?: string | null;
  motivation_text_hidden?: boolean | null;

  height_cm?: number | null;
  height_cm_hidden?: boolean | null;
  weight_kg?: number | null;
  weight_kg_hidden?: boolean | null;

  // interests
  about_me?: string | null;
  about_me_hidden?: boolean | null;

  primary_interests?: string[] | null;
  primary_interests_hidden?: boolean | null;

  interests?: string[] | null;
  interests_custom?: string[] | null;
  interests_hidden?: boolean | null;

  life_goals?: string[] | null;
  life_goals_custom?: string[] | null;
  life_goals_hidden?: boolean | null;

  self_view?: SelfView | string | null;
  self_view_hidden?: boolean | null;

  improvement_areas?: string[] | null;
  improvement_areas_custom?: string[] | null;
  improvement_areas_hidden?: boolean | null;

  // lifestyle
  activities?: string[] | null;
  activities_custom?: string[] | null;
  activities_hidden?: boolean | null;

  diet_preference?: DietPreference | string | null;
  diet_preference_hidden?: boolean | null;

  alcohol_use?: AlcoholUse | string | null;
  alcohol_use_hidden?: boolean | null;

  smoking?: Smoking | string | null;
  smoking_hidden?: boolean | null;

  drug_light?: boolean | null;
  drug_hard?: boolean | null;
  drugs_hidden?: boolean | null;

  mindset?: Mindset | string | null;
  mindset_hidden?: boolean | null;

  life_pace?: LifePace | string | null;
  life_pace_hidden?: boolean | null;

  personalization_ads_consent?: boolean | null;
  personalization_ads_consent_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};
