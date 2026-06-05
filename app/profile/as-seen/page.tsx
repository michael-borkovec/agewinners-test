/**
 * Profile visibility preview
 * - Lets the owner compare how their profile looks to contacts and users without a connection
 * - Mirrors current profile visibility rules from app/users/[userId]
 * - Followers only see contact details after an accepted connection
 */

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import HelpIconButton from "@/components/HelpIconButton";
import { ProfileHero } from "@/app/profile/components/ProfileSurface";
import { supabase } from "@/lib/supabaseClient";

type PreviewMode = "connected" | "disconnected";

type MyProfilePreview = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  bio: string | null;
  created_at: string | null;
  allow_age_visible: boolean | null;
  social_links_visibility: "everyone" | "contacts" | "private" | null;
  profile_age_visibility: "everyone" | "contacts" | "private" | null;
  profile_occupation_visibility: "everyone" | "contacts" | "private" | null;
  profile_education_visibility: "everyone" | "contacts" | "private" | null;
  profile_languages_visibility: "everyone" | "contacts" | "private" | null;
  profile_relationship_visibility: "everyone" | "contacts" | "private" | null;
  profile_motivation_visibility: "everyone" | "contacts" | "private" | null;
  profile_body_visibility: "everyone" | "contacts" | "private" | null;
  bio_contacts: string | null;
  bio_contacts_hidden: boolean | null;
  occupation: string | null;
  occupation_hidden: boolean | null;
  is_student: boolean | null;
  is_student_hidden: boolean | null;
  education_level: string | null;
  education_level_hidden: boolean | null;
  native_languages: string[] | null;
  native_languages_hidden: boolean | null;
  other_languages: string[] | null;
  other_languages_hidden: boolean | null;
  relationship_status: string | null;
  relationship_status_hidden: boolean | null;
  motivation_text: string | null;
  motivation_text_hidden: boolean | null;
  height_cm: number | null;
  height_cm_hidden: boolean | null;
  weight_kg: number | null;
  weight_kg_hidden: boolean | null;
  about_me: string | null;
  about_me_hidden: boolean | null;
  primary_interests: string[] | null;
  primary_interests_hidden: boolean | null;
  interests: string[] | null;
  interests_custom: string[] | null;
  interests_hidden: boolean | null;
  life_goals: string[] | null;
  life_goals_custom: string[] | null;
  life_goals_hidden: boolean | null;
  self_view: string | null;
  self_view_hidden: boolean | null;
  improvement_areas: string[] | null;
  improvement_areas_custom: string[] | null;
  improvement_areas_hidden: boolean | null;
  activities: string[] | null;
  activities_custom: string[] | null;
  activities_hidden: boolean | null;
  diet_preference: string | null;
  diet_preference_hidden: boolean | null;
  alcohol_use: string | null;
  alcohol_use_hidden: boolean | null;
  smoking: string | null;
  smoking_hidden: boolean | null;
  drug_light: boolean | null;
  drug_hard: boolean | null;
  drugs_hidden: boolean | null;
  mindset: string | null;
  mindset_hidden: boolean | null;
  life_pace: string | null;
  life_pace_hidden: boolean | null;
  website_url: string | null;
  website_url_hidden: boolean | null;
  public_email: string | null;
  public_email_hidden: boolean | null;
  instagram_url: string | null;
  instagram_url_hidden: boolean | null;
  facebook_url: string | null;
  facebook_url_hidden: boolean | null;
  tiktok_url: string | null;
  tiktok_url_hidden: boolean | null;
  youtube_url: string | null;
  youtube_url_hidden: boolean | null;
  linkedin_url: string | null;
  linkedin_url_hidden: boolean | null;
  x_url: string | null;
  x_url_hidden: boolean | null;
  contact_note: string | null;
  contact_note_hidden: boolean | null;
};

type StatsSummary = {
  awAge: number | null;
  awScoreNormPct: number | null;
};

type IntroIconName = "activity" | "briefcase" | "cake" | "calendar" | "chart" | "globe" | "heart" | "link" | "mail" | "ruler" | "school" | "spark" | "star" | "target" | "text";

type IntroItemData = {
  icon: IntroIconName;
  text: ReactNode;
};

const CURRENT_AW_WINDOW_YEARS = 5;
const BASE_PROFILE_COLUMNS = `
  user_id, display_name, avatar_url, date_of_birth, bio, created_at,
  allow_age_visible,
  social_links_visibility,
  profile_age_visibility,
  profile_occupation_visibility, profile_education_visibility, profile_languages_visibility,
  profile_relationship_visibility, profile_motivation_visibility, profile_body_visibility,
  bio_contacts, bio_contacts_hidden,
  occupation, occupation_hidden,
  is_student, is_student_hidden,
  education_level, education_level_hidden,
  native_languages, native_languages_hidden,
  other_languages, other_languages_hidden,
  relationship_status, relationship_status_hidden,
  motivation_text, motivation_text_hidden,
  height_cm, height_cm_hidden,
  weight_kg, weight_kg_hidden,
  about_me, about_me_hidden,
  primary_interests, primary_interests_hidden,
  interests, interests_custom, interests_hidden,
  life_goals, life_goals_custom, life_goals_hidden,
  self_view, self_view_hidden,
  improvement_areas, improvement_areas_custom, improvement_areas_hidden,
  activities, activities_custom, activities_hidden,
  diet_preference, diet_preference_hidden,
  alcohol_use, alcohol_use_hidden,
  smoking, smoking_hidden,
  drug_light, drug_hard, drugs_hidden,
  mindset, mindset_hidden,
  life_pace, life_pace_hidden
`;
const CONTACT_PROFILE_COLUMNS = `
  website_url, website_url_hidden,
  public_email, public_email_hidden,
  instagram_url, instagram_url_hidden,
  facebook_url, facebook_url_hidden,
  tiktok_url, tiktok_url_hidden,
  youtube_url, youtube_url_hidden,
  linkedin_url, linkedin_url_hidden,
  x_url, x_url_hidden,
  contact_note, contact_note_hidden
`;
const CONTACT_PROFILE_KEYS = [
  "website_url",
  "public_email",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "youtube_url",
  "linkedin_url",
  "x_url",
  "contact_note",
];
const EMPTY_CONTACT_PROFILE_FIELDS = {
  website_url: null,
  website_url_hidden: null,
  public_email: null,
  public_email_hidden: null,
  instagram_url: null,
  instagram_url_hidden: null,
  facebook_url: null,
  facebook_url_hidden: null,
  tiktok_url: null,
  tiktok_url_hidden: null,
  youtube_url: null,
  youtube_url_hidden: null,
  linkedin_url: null,
  linkedin_url_hidden: null,
  x_url: null,
  x_url_hidden: null,
  contact_note: null,
  contact_note_hidden: null,
};

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function joinList(a?: string[] | null, b?: string[] | null) {
  return [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter((value) => safeText(value));
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeAwScoreNormPct(realAge: unknown, awAge: unknown) {
  const real = Number(realAge);
  const aw = Number(awAge);
  if (!Number.isFinite(real) || real <= 0 || !Number.isFinite(aw)) return null;
  return ((aw - real) / real) * 100 + 100;
}

function formatDateCZ(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("cs-CZ");
}

function formatAwScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 100) return "0.0 %";
  if (value > 100) return `+${(value - 100).toFixed(1)} %`;
  return `-${(100 - value).toFixed(1)} %`;
}

function isMissingOptionalContactColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  const text = `${err?.code ?? ""} ${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`.toLowerCase();
  return err?.code === "PGRST204" || err?.code === "42703" || CONTACT_PROFILE_KEYS.some((key) => text.includes(key));
}

function compactIntroItems(items: Array<IntroItemData | null>) {
  return items.filter((item): item is IntroItemData => Boolean(item));
}

export default function ProfileAsSeenPage() {
  const { userId } = useAuth();
  const [mode, setMode] = useState<PreviewMode>("connected");
  const [profile, setProfile] = useState<MyProfilePreview | null>(null);
  const [stats, setStats] = useState<StatsSummary>({ awAge: null, awScoreNormPct: null });
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setProfile(null);
        setStats({ awAge: null, awScoreNormPct: null });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: p, error: profileError } = await supabase
          .from("user_profiles")
          .select(BASE_PROFILE_COLUMNS)
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;

        const { data: contactData, error: contactError } = await supabase
          .from("user_profiles")
          .select(CONTACT_PROFILE_COLUMNS)
          .eq("user_id", userId)
          .single();

        if (contactError && !isMissingOptionalContactColumn(contactError)) throw contactError;

        const currentWindowStart = new Date();
        currentWindowStart.setFullYear(currentWindowStart.getFullYear() - CURRENT_AW_WINDOW_YEARS);

        const { data: images, error: imagesError } = await supabase
          .from("images")
          .select("taken_at, real_age_years, aw_age_image, include_in_global_aw")
          .eq("uploader_user_id", userId)
          .eq("include_in_global_aw", true)
          .not("aw_age_image", "is", null);

        if (imagesError) throw imagesError;

        const { data: coverRows } = await supabase
          .from("images")
          .select("public_url_thumb, public_url_medium, public_url")
          .eq("uploader_user_id", userId)
          .eq("hidden_by_admin", false)
          .order("created_at", { ascending: false })
          .limit(4);

        const filtered = ((images ?? []) as Array<Record<string, unknown>>).filter((row) => {
          const takenAt = row.taken_at ? new Date(String(row.taken_at)) : null;
          return Boolean(takenAt && !Number.isNaN(takenAt.getTime()) && takenAt >= currentWindowStart);
        });

        const awAges = filtered.map((row) => Number(row.aw_age_image)).filter((value) => Number.isFinite(value));
        const awScores = filtered
          .map((row) => computeAwScoreNormPct(row.real_age_years, row.aw_age_image))
          .filter((value): value is number => value != null && Number.isFinite(value));

        if (cancelled) return;
        setProfile({ ...EMPTY_CONTACT_PROFILE_FIELDS, ...(p as object), ...((contactData ?? {}) as object) } as MyProfilePreview);
        setStats({ awAge: average(awAges), awScoreNormPct: average(awScores) });
        setCoverImages(
          (coverRows ?? [])
            .map((row: any) => row.public_url_thumb ?? row.public_url_medium ?? row.public_url)
            .filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
        );
      } catch (loadError: unknown) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Náhled profilu se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const displayName = useMemo(() => safeText(profile?.display_name) || "AgeWinners uživatel", [profile?.display_name]);
  const canSeeContactFields = mode === "connected";
  const canSeeAgeInfo =
    canSeeGroup(profile?.profile_age_visibility ?? (profile?.allow_age_visible === false ? "private" : "contacts")) &&
    Boolean(profile?.allow_age_visible ?? true);
  const modeLabel = mode === "connected" ? "Ve spojení" : "Bez spojení";
  const combinedInterests = joinList(profile?.interests, profile?.interests_custom);
  const combinedGoals = joinList(profile?.life_goals, profile?.life_goals_custom);
  const combinedAreas = joinList(profile?.improvement_areas, profile?.improvement_areas_custom);
  const combinedActivities = joinList(profile?.activities, profile?.activities_custom);

  function visibleValue(hiddenFlag: boolean | null | undefined, value: unknown): ReactNode | null {
    if (!canSeeContactFields) return null;
    if (Boolean(hiddenFlag)) return null;
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value.trim() ? value : null;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    return String(value);
  }

  function visibleList(hiddenFlag: boolean | null | undefined, values: string[] | null | undefined): ReactNode | null {
    if (!canSeeContactFields) return null;
    if (Boolean(hiddenFlag)) return null;
    const items = Array.isArray(values) ? values.filter((value) => safeText(value)) : [];
    return items.length ? <BadgeList items={items} /> : null;
  }

  function visibleContact(hiddenFlag: boolean | null | undefined, value: string | null | undefined, isEmail = false): ReactNode | null {
    if (!canSeeGroup(profile?.social_links_visibility ?? (hiddenFlag ? "private" : "contacts"))) return null;
    if (Boolean(hiddenFlag)) return null;
    const clean = safeText(value);
    if (!clean) return null;
    const href = isEmail ? `mailto:${clean}` : clean;
    return (
      <a href={href} target={isEmail ? undefined : "_blank"} rel={isEmail ? undefined : "noreferrer"} className="break-all text-emerald-700 hover:underline">
        {clean}
      </a>
    );
  }

  function canSeeGroup(visibility: "everyone" | "contacts" | "private" | null | undefined) {
    if (visibility === "everyone") return true;
    if (visibility === "private") return false;
    return mode === "connected";
  }

  function groupedValue(visibility: "everyone" | "contacts" | "private" | null | undefined, hiddenFlag: boolean | null | undefined, value: unknown): ReactNode | null {
    if (!canSeeGroup(visibility ?? (hiddenFlag ? "private" : "contacts"))) return null;
    if (Boolean(hiddenFlag)) return null;
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value.trim() ? value : null;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    return String(value);
  }

  function groupedList(visibility: "everyone" | "contacts" | "private" | null | undefined, hiddenFlag: boolean | null | undefined, values: string[] | null | undefined): ReactNode | null {
    if (!canSeeGroup(visibility ?? (hiddenFlag ? "private" : "contacts"))) return null;
    if (Boolean(hiddenFlag)) return null;
    const items = Array.isArray(values) ? values.filter((value) => safeText(value)) : [];
    return items.length ? <BadgeList items={items} /> : null;
  }

  if (loading) {
    return <div className="rounded-2xl bg-white p-5 shadow-sm">Načítám náhled...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</div>;
  }

  if (!profile) {
    return <div className="rounded-2xl bg-white p-5 shadow-sm">Profil není dostupný.</div>;
  }

  const introItems = compactIntroItems([
    groupedValue(profile.profile_occupation_visibility, profile.occupation_hidden, profile.occupation)
      ? { icon: "briefcase", text: groupedValue(profile.profile_occupation_visibility, profile.occupation_hidden, profile.occupation) }
      : null,
    groupedValue(profile.profile_education_visibility, profile.is_student_hidden, profile.is_student)
      ? { icon: "school", text: profile.is_student ? "Studuje" : "Nestuduje" }
      : null,
    groupedValue(profile.profile_education_visibility, profile.education_level_hidden, profile.education_level)
      ? { icon: "school", text: groupedValue(profile.profile_education_visibility, profile.education_level_hidden, profile.education_level) }
      : null,
    groupedList(profile.profile_languages_visibility, profile.native_languages_hidden, profile.native_languages)
      ? { icon: "globe", text: <>Rodný jazyk: {groupedList(profile.profile_languages_visibility, profile.native_languages_hidden, profile.native_languages)}</> }
      : null,
    groupedList(profile.profile_languages_visibility, profile.other_languages_hidden, profile.other_languages)
      ? { icon: "globe", text: <>Další jazyky: {groupedList(profile.profile_languages_visibility, profile.other_languages_hidden, profile.other_languages)}</> }
      : null,
    canSeeAgeInfo && profile.date_of_birth
      ? { icon: "cake", text: <>Narozen/a {formatDateCZ(profile.date_of_birth)}</> }
      : null,
    groupedValue(profile.profile_relationship_visibility, profile.relationship_status_hidden, profile.relationship_status)
      ? { icon: "heart", text: groupedValue(profile.profile_relationship_visibility, profile.relationship_status_hidden, profile.relationship_status) }
      : null,
    groupedValue(profile.profile_motivation_visibility, profile.motivation_text_hidden, profile.motivation_text)
      ? { icon: "spark", text: groupedValue(profile.profile_motivation_visibility, profile.motivation_text_hidden, profile.motivation_text) }
      : null,
    groupedValue(profile.profile_body_visibility, profile.height_cm_hidden, profile.height_cm)
      ? { icon: "ruler", text: `${profile.height_cm} cm` }
      : null,
    groupedValue(profile.profile_body_visibility, profile.weight_kg_hidden, profile.weight_kg)
      ? { icon: "ruler", text: `${profile.weight_kg} kg` }
      : null,
  ]);

  const awItems: IntroItemData[] = canSeeAgeInfo
    ? [
        { icon: "chart", text: <>AW věk {stats.awAge !== null ? `${stats.awAge.toFixed(1)} let` : "zatím není dostupný"}</> },
        { icon: "chart", text: <>AW skóre {formatAwScore(stats.awScoreNormPct)}</> },
      ]
    : [];

  const aboutItems = compactIntroItems([
    visibleValue(profile.bio_contacts_hidden, profile.bio_contacts)
      ? { icon: "text", text: visibleValue(profile.bio_contacts_hidden, profile.bio_contacts) }
      : null,
    visibleValue(profile.about_me_hidden, profile.about_me) ? { icon: "text", text: visibleValue(profile.about_me_hidden, profile.about_me) } : null,
    visibleList(profile.primary_interests_hidden, profile.primary_interests)
      ? { icon: "star", text: <>Primární zájem: {visibleList(profile.primary_interests_hidden, profile.primary_interests)}</> }
      : null,
    visibleList(profile.interests_hidden, combinedInterests) ? { icon: "star", text: <>Zájmy: {visibleList(profile.interests_hidden, combinedInterests)}</> } : null,
    visibleList(profile.life_goals_hidden, combinedGoals) ? { icon: "target", text: <>Cíle: {visibleList(profile.life_goals_hidden, combinedGoals)}</> } : null,
    visibleValue(profile.self_view_hidden, profile.self_view) ? { icon: "spark", text: <>Považuje se za {visibleValue(profile.self_view_hidden, profile.self_view)}</> } : null,
    visibleList(profile.improvement_areas_hidden, combinedAreas)
      ? { icon: "target", text: <>Chce se zlepšit v: {visibleList(profile.improvement_areas_hidden, combinedAreas)}</> }
      : null,
  ]);

  const lifestyleItems = compactIntroItems([
    visibleList(profile.activities_hidden, combinedActivities) ? { icon: "activity", text: <>Pohyb / sport: {visibleList(profile.activities_hidden, combinedActivities)}</> } : null,
    visibleValue(profile.diet_preference_hidden, profile.diet_preference) ? { icon: "activity", text: <>Strava: {visibleValue(profile.diet_preference_hidden, profile.diet_preference)}</> } : null,
    visibleValue(profile.alcohol_use_hidden, profile.alcohol_use) ? { icon: "activity", text: <>Alkohol: {visibleValue(profile.alcohol_use_hidden, profile.alcohol_use)}</> } : null,
    visibleValue(profile.smoking_hidden, profile.smoking) ? { icon: "activity", text: <>Kouření: {visibleValue(profile.smoking_hidden, profile.smoking)}</> } : null,
    !profile.drugs_hidden && (profile.drug_light !== null || profile.drug_hard !== null)
      ? {
          icon: "activity",
          text: (
            <>
              {profile.drug_light !== null ? `Lehké drogy: ${profile.drug_light ? "Ano" : "Ne"}` : null}
              {profile.drug_light !== null && profile.drug_hard !== null ? " · " : null}
              {profile.drug_hard !== null ? `Tvrdé drogy: ${profile.drug_hard ? "Ano" : "Ne"}` : null}
            </>
          ),
        }
      : null,
    visibleValue(profile.mindset_hidden, profile.mindset) ? { icon: "spark", text: <>Mindset: {visibleValue(profile.mindset_hidden, profile.mindset)}</> } : null,
    visibleValue(profile.life_pace_hidden, profile.life_pace) ? { icon: "activity", text: <>Tempo života: {visibleValue(profile.life_pace_hidden, profile.life_pace)}</> } : null,
  ]);

  const contactItems = compactIntroItems([
    visibleContact(profile.instagram_url_hidden, profile.instagram_url) ? { icon: "link", text: <>Instagram: {visibleContact(profile.instagram_url_hidden, profile.instagram_url)}</> } : null,
    visibleContact(profile.facebook_url_hidden, profile.facebook_url) ? { icon: "link", text: <>Facebook: {visibleContact(profile.facebook_url_hidden, profile.facebook_url)}</> } : null,
    visibleContact(profile.tiktok_url_hidden, profile.tiktok_url) ? { icon: "link", text: <>TikTok: {visibleContact(profile.tiktok_url_hidden, profile.tiktok_url)}</> } : null,
    visibleContact(profile.youtube_url_hidden, profile.youtube_url) ? { icon: "link", text: <>YouTube: {visibleContact(profile.youtube_url_hidden, profile.youtube_url)}</> } : null,
    visibleContact(profile.linkedin_url_hidden, profile.linkedin_url) ? { icon: "link", text: <>LinkedIn: {visibleContact(profile.linkedin_url_hidden, profile.linkedin_url)}</> } : null,
    visibleContact(profile.x_url_hidden, profile.x_url) ? { icon: "link", text: <>X: {visibleContact(profile.x_url_hidden, profile.x_url)}</> } : null,
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">Jak mě vidí ostatní</h1>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              <PreviewButton active={mode === "connected"} onClick={() => setMode("connected")}>
                Ve spojení
              </PreviewButton>
              <PreviewButton active={mode === "disconnected"} onClick={() => setMode("disconnected")}>
                Bez spojení
              </PreviewButton>
            </div>
            <HelpIconButton
              title="Nápověda k náhledu profilu"
              modalTitle="Jak mě vidí ostatní"
              helpText={
                "Tato stránka slouží jako náhled toho, jak tvoji profilovou kartu uvidí jiný uživatel.\n\nVe spojení znamená potvrzený kontakt. Bez spojení znamená člověk mimo tvoji síť nebo samostatný sledující.\n\nPod tímto ovládáním se zobrazuje jen obsah, který by daný typ uživatele na profilu reálně viděl podle tvého nastavení soukromí."
              }
              breadcrumbs={[
                { label: "Můj profil", href: "/profile" },
                { label: "Jak mě vidí ostatní" },
              ]}
            />
          </div>
        </div>
      </section>

      <ProfileHero
        eyebrow={modeLabel}
        title={displayName}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        coverImages={coverImages}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-5">
          <IntroPanel title="Osobní údaje">
            <IntroList
              items={[
                ...introItems,
                ...awItems,
                profile.created_at ? { icon: "calendar", text: <>Členem od {formatDateCZ(profile.created_at)}</> } : null,
              ].filter((item): item is IntroItemData => Boolean(item))}
              emptyText={canSeeContactFields ? "Zatím nejsou vyplněné další osobní údaje." : "Bez spojení se zobrazí jen základní profilová karta."}
            />
          </IntroPanel>
        </div>

        <div className="space-y-5">
          {aboutItems.length > 0 ? (
            <IntroPanel title="O mně">
              <IntroList items={aboutItems} />
            </IntroPanel>
          ) : null}

          {lifestyleItems.length > 0 ? (
            <IntroPanel title="Životní styl">
              <IntroList items={lifestyleItems} />
            </IntroPanel>
          ) : null}

          {contactItems.length > 0 ? (
            <IntroPanel title="Kontakt">
              <IntroList items={contactItems} />
            </IntroPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PreviewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

function BadgeList({ items }: { items: string[] }) {
  const visible = items.map((item) => safeText(item)).filter(Boolean);
  if (visible.length === 0) return <span className="text-slate-500">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {visible.map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
          {item}
        </span>
      ))}
    </span>
  );
}

function IntroPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function IntroList({ items, emptyText }: { items: IntroItemData[]; emptyText?: string }) {
  if (!items.length) return <div className="text-sm leading-6 text-slate-500">{emptyText ?? "Zatím bez dalších informací."}</div>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
          <ProfileMiniIcon name={item.icon} />
          <div className="min-w-0 flex-1">{item.text}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileMiniIcon({ name }: { name: IntroIconName }) {
  const common = "stroke-current";
  return (
    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#effdef] text-[#148C2E] shadow-[0_4px_14px_rgba(50,205,50,0.12)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === "briefcase" ? <><path className={common} d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" /><path className={common} d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><path className={common} d="M4 12h16" /></> : null}
        {name === "school" ? <><path className={common} d="m3 10 9-5 9 5-9 5-9-5Z" /><path className={common} d="M7 12v4c3 2 7 2 10 0v-4" /></> : null}
        {name === "globe" ? <><circle className={common} cx="12" cy="12" r="9" /><path className={common} d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></> : null}
        {name === "cake" ? <><path className={common} d="M4 21h16v-8H4v8Z" /><path className={common} d="M4 16h16M8 13V9M12 13V9M16 13V9" /><path className={common} d="M8 7h.01M12 7h.01M16 7h.01" /></> : null}
        {name === "heart" ? <path className={common} d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z" /> : null}
        {name === "spark" ? <><path className={common} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path className={common} d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></> : null}
        {name === "ruler" ? <><path className={common} d="M4 17 17 4l3 3L7 20l-3-3Z" /><path className={common} d="m8 13 2 2M11 10l2 2M14 7l2 2" /></> : null}
        {name === "chart" ? <><path className={common} d="M4 19V5" /><path className={common} d="M4 19h16" /><path className={common} d="M8 15l3-4 3 2 4-6" /></> : null}
        {name === "calendar" ? <><path className={common} d="M5 5h14v15H5V5Z" /><path className={common} d="M8 3v4M16 3v4M5 10h14" /></> : null}
        {name === "text" ? <><path className={common} d="M5 7h14M5 12h14M5 17h9" /></> : null}
        {name === "star" ? <path className={common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" /> : null}
        {name === "target" ? <><circle className={common} cx="12" cy="12" r="8" /><circle className={common} cx="12" cy="12" r="4" /><path className={common} d="M12 12h.01" /></> : null}
        {name === "activity" ? <path className={common} d="M4 12h4l2-6 4 12 2-6h4" /> : null}
        {name === "link" ? <><path className={common} d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path className={common} d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></> : null}
        {name === "mail" ? <><path className={common} d="M4 6h16v12H4V6Z" /><path className={common} d="m4 7 8 6 8-6" /></> : null}
      </svg>
    </span>
  );
}
