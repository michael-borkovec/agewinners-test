/**
 * Profile visibility preview
 * - Lets the owner compare how their profile looks to contacts and to the public
 * - Mirrors current public profile visibility rules from app/users/[userId]
 * - Followers are treated as public unless they are also accepted contacts
 */

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type PreviewMode = "contacts" | "public";

type MyProfilePreview = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  bio: string | null;
  created_at: string | null;
  allow_age_visible: boolean | null;
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
};

type StatsSummary = {
  awAge: number | null;
  awScoreNormPct: number | null;
};

const CURRENT_AW_WINDOW_YEARS = 5;

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

export default function ProfileAsSeenPage() {
  const { userId } = useAuth();
  const [mode, setMode] = useState<PreviewMode>("contacts");
  const [profile, setProfile] = useState<MyProfilePreview | null>(null);
  const [stats, setStats] = useState<StatsSummary>({ awAge: null, awScoreNormPct: null });
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
          .select(`
            user_id, display_name, avatar_url, date_of_birth, bio, created_at,
            allow_age_visible,
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
          `)
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;

        const currentWindowStart = new Date();
        currentWindowStart.setFullYear(currentWindowStart.getFullYear() - CURRENT_AW_WINDOW_YEARS);

        const { data: images, error: imagesError } = await supabase
          .from("images")
          .select("taken_at, real_age_years, aw_age_image, include_in_global_aw")
          .eq("uploader_user_id", userId)
          .eq("include_in_global_aw", true)
          .not("aw_age_image", "is", null);

        if (imagesError) throw imagesError;

        const filtered = ((images ?? []) as Array<Record<string, unknown>>).filter((row) => {
          const takenAt = row.taken_at ? new Date(String(row.taken_at)) : null;
          return Boolean(takenAt && !Number.isNaN(takenAt.getTime()) && takenAt >= currentWindowStart);
        });

        const awAges = filtered.map((row) => Number(row.aw_age_image)).filter((value) => Number.isFinite(value));
        const awScores = filtered
          .map((row) => computeAwScoreNormPct(row.real_age_years, row.aw_age_image))
          .filter((value): value is number => value != null && Number.isFinite(value));

        if (cancelled) return;
        setProfile(p as MyProfilePreview);
        setStats({ awAge: average(awAges), awScoreNormPct: average(awScores) });
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
  const canSeeContactFields = mode === "contacts";
  const canSeeAgeInfo = canSeeContactFields && Boolean(profile?.allow_age_visible ?? true);
  const combinedInterests = joinList(profile?.interests, profile?.interests_custom);
  const combinedGoals = joinList(profile?.life_goals, profile?.life_goals_custom);
  const combinedAreas = joinList(profile?.improvement_areas, profile?.improvement_areas_custom);
  const combinedActivities = joinList(profile?.activities, profile?.activities_custom);

  function detailText(hiddenFlag: boolean | null | undefined, value: unknown) {
    if (!canSeeContactFields) return "—";
    if (Boolean(hiddenFlag)) return "Skryto";
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value.trim() ? value : "—";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    return String(value);
  }

  function detailList(hiddenFlag: boolean | null | undefined, values: string[] | null | undefined) {
    if (!canSeeContactFields) return <span className="text-slate-500">—</span>;
    if (Boolean(hiddenFlag)) return <span className="text-slate-500">Skryto</span>;
    const items = Array.isArray(values) ? values.filter((value) => safeText(value)) : [];
    if (items.length === 0) return <span className="text-slate-500">—</span>;
    return <BadgeList items={items} />;
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Můj profil</div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Jak mě vidí ostatní</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Přepni si náhled mezi kontakty a veřejností. Sledování samo o sobě neodemkne kontaktní informace:
              sledující vidí veřejný pohled, pokud s tebou nejsou zároveň ve spojení.
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <PreviewButton active={mode === "contacts"} onClick={() => setMode("contacts")}>
              Kontakty
            </PreviewButton>
            <PreviewButton active={mode === "public"} onClick={() => setMode("public")}>
              Veřejný
            </PreviewButton>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-lg font-semibold text-slate-600">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-semibold text-slate-900">{displayName}</div>
            <div className="mt-1 text-xs text-slate-500">
              Náhled: {mode === "contacts" ? "kontakt ve spojení" : "veřejnost / sledující bez spojení"}
            </div>
            <div className="mt-2 text-sm text-slate-700">{safeText(profile.bio) || "—"}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Datum narození" value={canSeeAgeInfo ? formatDateCZ(profile.date_of_birth) : mode === "contacts" ? "Skryto" : "—"} />
          <InfoRow label="AW věk" value={canSeeAgeInfo && stats.awAge !== null ? `${stats.awAge.toFixed(1)} let` : canSeeAgeInfo ? "—" : mode === "contacts" ? "Skryto" : "—"} />
          <InfoRow label="AW skóre" value={canSeeAgeInfo ? formatAwScore(stats.awScoreNormPct) : mode === "contacts" ? "Skryto" : "—"} />
          <InfoRow label="Povolání" value={detailText(profile.occupation_hidden, profile.occupation)} />
          <InfoRow label="Student" value={detailText(profile.is_student_hidden, profile.is_student)} />
          <InfoRow label="Vzdělání" value={detailText(profile.education_level_hidden, profile.education_level)} />
          <InfoRow label="Rodný jazyk" value={detailList(profile.native_languages_hidden, profile.native_languages)} />
          <InfoRow label="Další jazyky" value={detailList(profile.other_languages_hidden, profile.other_languages)} />
          <InfoRow label="Bio pro kontakty" value={detailText(profile.bio_contacts_hidden, profile.bio_contacts)} />
        </div>

        {!Boolean(profile.primary_interests_hidden) && (profile.primary_interests?.length ?? 0) > 0 && canSeeContactFields ? (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primární zájem</div>
            <div className="mt-2">
              <BadgeList items={profile.primary_interests ?? []} />
            </div>
          </div>
        ) : null}

        {canSeeContactFields ? (
          <div className="mt-6 space-y-4">
            <SectionCard title="Identita">
              <InfoRow label="Status" value={detailText(profile.relationship_status_hidden, profile.relationship_status)} />
              <InfoRow label="Motivační věta" value={detailText(profile.motivation_text_hidden, profile.motivation_text)} />
              <InfoRow label="Výška" value={Boolean(profile.height_cm_hidden) ? "Skryto" : profile.height_cm != null ? `${profile.height_cm} cm` : "—"} />
              <InfoRow label="Váha" value={Boolean(profile.weight_kg_hidden) ? "Skryto" : profile.weight_kg != null ? `${profile.weight_kg} kg` : "—"} />
            </SectionCard>

            <SectionCard title="Zájmy">
              <InfoRow label="O mně" value={detailText(profile.about_me_hidden, profile.about_me)} />
              <InfoRow label="Zájmy" value={detailList(profile.interests_hidden, combinedInterests)} />
              <InfoRow label="Životní cíle" value={detailList(profile.life_goals_hidden, combinedGoals)} />
              <InfoRow label="Považuji se za" value={detailText(profile.self_view_hidden, profile.self_view)} />
              <InfoRow label="Chci se zlepšit v" value={detailList(profile.improvement_areas_hidden, combinedAreas)} />
            </SectionCard>

            <SectionCard title="Životní styl">
              <InfoRow label="Pohyb / Sport" value={detailList(profile.activities_hidden, combinedActivities)} />
              <InfoRow label="Strava" value={detailText(profile.diet_preference_hidden, profile.diet_preference)} />
              <InfoRow label="Alkohol" value={detailText(profile.alcohol_use_hidden, profile.alcohol_use)} />
              <InfoRow label="Kouření" value={detailText(profile.smoking_hidden, profile.smoking)} />
              <InfoRow
                label="Drogy"
                value={
                  Boolean(profile.drugs_hidden)
                    ? "Skryto"
                    : profile.drug_light !== null || profile.drug_hard !== null
                      ? (
                          <div className="space-y-1">
                            {profile.drug_light !== null ? <div>Lehké drogy: {profile.drug_light ? "Ano" : "Ne"}</div> : null}
                            {profile.drug_hard !== null ? <div>Tvrdé drogy: {profile.drug_hard ? "Ano" : "Ne"}</div> : null}
                          </div>
                        )
                      : "—"
                }
              />
              <InfoRow label="Mindset" value={detailText(profile.mindset_hidden, profile.mindset)} />
              <InfoRow label="Tempo života" value={detailText(profile.life_pace_hidden, profile.life_pace)} />
            </SectionCard>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Veřejný pohled nezobrazuje kontaktní osobní detaily. Stejně tě vidí i sledující, pokud nejsou zároveň tvým kontaktem.
          </div>
        )}

        <div className="mt-6 text-xs text-slate-500">Členem od: {formatDateCZ(profile.created_at)}</div>
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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function BadgeList({ items }: { items: string[] }) {
  const visible = items.map((item) => safeText(item)).filter(Boolean);
  if (visible.length === 0) return <span className="text-slate-500">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((item) => (
        <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
}
