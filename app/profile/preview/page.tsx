/**
 * app/profile/preview/page.tsx
 *
 * Purpose:
 * - "Jak mě vidí ostatní?" – náhled vlastního profilu v různých režimech:
 *   - "Mimo moji síť"  -> jako cizí uživatel bez spojení
 *   - "Mé kontakty"    -> jako uživatel ve spojení
 *
 * Notes:
 * - Je to kontrolní UX – uživatel rychle ověří, co vlastně zveřejňuje.
 * - Respektuje per-field privacy: *_hidden
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { awAlert } from "@/components/AwDialog";
import { getMyProfile } from "@/lib/api/userProfiles";

type Mode = "public" | "contacts";

function safeText(v: any): string | null {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}

function joinList(a?: string[] | null, b?: string[] | null): string[] {
  const one = Array.isArray(a) ? a : [];
  const two = Array.isArray(b) ? b : [];
  const merged = [...one, ...two].map((x) => String(x).trim()).filter(Boolean);
  return Array.from(new Set(merged));
}

function BadgeList({ items }: { items: string[] }) {
  if (!items.length) return <div className="text-sm text-slate-500">—</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <span
          key={x}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800"
        >
          {x}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function ProfilePreviewPage() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("public");
  const [profile, setProfile] = useState<any>(null);

  const isConnectedView = mode === "contacts";

  const displayName = useMemo(() => safeText(profile?.display_name) || profile?.user_id || "Uživatel", [profile]);
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const p = await getMyProfile();
        if (!cancelled) setProfile(p);
      } catch (e: any) {
        await awAlert(e?.message ?? "Profil se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only show if:
  // - mode == contacts
  // - not hidden
  // - has value
  function showIfContacts(hiddenFlag: any, value: any) {
    if (!isConnectedView) return false;
    if (Boolean(hiddenFlag)) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && !value.trim()) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-600">Načítám náhled…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-700">Profil není dostupný.</div>
        </div>
      </div>
    );
  }

  const combinedInterests = joinList(profile?.interests, profile?.interests_custom);
  const combinedGoals = joinList(profile?.life_goals, profile?.life_goals_custom);
  const combinedAreas = joinList(profile?.improvement_areas, profile?.improvement_areas_custom);
  const combinedActivities = joinList(profile?.activities, profile?.activities_custom);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Jak mě vidí ostatní?</h1>
            <p className="mt-1 text-sm text-slate-600">
              Přepínej režim a zkontroluj, co se opravdu zobrazuje.
            </p>
          </div>

          {/* Segmented toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setMode("public")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === "public" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mimo moji síť
            </button>
            <button
              type="button"
              onClick={() => setMode("contacts")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === "contacts" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mé kontakty
            </button>
          </div>
        </div>

        {/* Preview "card" */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-slate-600">{initial}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xl font-semibold text-slate-900">{displayName}</div>
              <div className="mt-1 text-xs text-slate-500 break-all">{profile.user_id}</div>
              <div className="mt-2 text-sm text-slate-700">{safeText(profile.bio) || "—"}</div>
            </div>
          </div>

          {/* public: primary interests if not hidden */}
          {!Boolean(profile.primary_interests_hidden) && (profile.primary_interests?.length ?? 0) > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primární zájem</div>
              <div className="mt-2">
                <BadgeList items={profile.primary_interests ?? []} />
              </div>
            </div>
          )}

          {!isConnectedView && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Více informací</div>
              <div className="mt-1 text-sm text-slate-600">V tomto režimu se detailní informace nezobrazují.</div>
            </div>
          )}

          {isConnectedView && (
            <div className="mt-6 space-y-6">
              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Identita</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {showIfContacts(profile.bio_contacts_hidden, profile.bio_contacts) && (
                    <InfoRow label="Bio (jen pro kontakty)" value={profile.bio_contacts} />
                  )}
                  {showIfContacts(profile.occupation_hidden, profile.occupation) && (
                    <InfoRow label="Povolání" value={profile.occupation} />
                  )}
                  {showIfContacts(profile.is_student_hidden, profile.is_student) && (
                    <InfoRow label="Student" value={profile.is_student ? "Ano" : "Ne"} />
                  )}
                  {showIfContacts(profile.education_level_hidden, profile.education_level) && (
                    <InfoRow label="Vzdělání" value={profile.education_level} />
                  )}
                  {showIfContacts(profile.relationship_status_hidden, profile.relationship_status) && (
                    <InfoRow label="Status" value={profile.relationship_status} />
                  )}
                  {showIfContacts(profile.motivation_text_hidden, profile.motivation_text) && (
                    <InfoRow label="Motivační věta" value={profile.motivation_text} />
                  )}
                  {showIfContacts(profile.height_cm_hidden, profile.height_cm) && (
                    <InfoRow label="Výška" value={`${profile.height_cm} cm`} />
                  )}
                  {showIfContacts(profile.weight_kg_hidden, profile.weight_kg) && (
                    <InfoRow label="Váha" value={`${profile.weight_kg} kg`} />
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Zájmy</div>
                <div className="mt-3 grid gap-3">
                  {showIfContacts(profile.about_me_hidden, profile.about_me) && (
                    <InfoRow label="O mně" value={profile.about_me} />
                  )}
                  {showIfContacts(profile.interests_hidden, combinedInterests) && (
                    <InfoRow label="Zájmy" value={<BadgeList items={combinedInterests} />} />
                  )}
                  {showIfContacts(profile.life_goals_hidden, combinedGoals) && (
                    <InfoRow label="Životní cíle" value={<BadgeList items={combinedGoals} />} />
                  )}
                  {showIfContacts(profile.self_view_hidden, profile.self_view) && (
                    <InfoRow label="Považuji se za" value={profile.self_view} />
                  )}
                  {showIfContacts(profile.improvement_areas_hidden, combinedAreas) && (
                    <InfoRow label="Chci se zlepšit v" value={<BadgeList items={combinedAreas} />} />
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Životní styl</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {showIfContacts(profile.activities_hidden, combinedActivities) && (
                    <InfoRow label="Pohyb / Sport" value={<BadgeList items={combinedActivities} />} />
                  )}
                  {showIfContacts(profile.diet_preference_hidden, profile.diet_preference) && (
                    <InfoRow label="Strava" value={profile.diet_preference} />
                  )}
                  {showIfContacts(profile.alcohol_use_hidden, profile.alcohol_use) && (
                    <InfoRow label="Alkohol" value={profile.alcohol_use} />
                  )}
                  {showIfContacts(profile.smoking_hidden, profile.smoking) && (
                    <InfoRow label="Kouření" value={profile.smoking} />
                  )}
                  {isConnectedView && !Boolean(profile.drugs_hidden) && (profile.drug_light !== null || profile.drug_hard !== null) && (
                    <InfoRow
                      label="Drogy"
                      value={
                        <div className="space-y-1">
                          {profile.drug_light !== null && <div>Lehké drogy: {profile.drug_light ? "Ano" : "Ne"}</div>}
                          {profile.drug_hard !== null && <div>Tvrdé drogy: {profile.drug_hard ? "Ano" : "Ne"}</div>}
                        </div>
                      }
                    />
                  )}
                  {showIfContacts(profile.mindset_hidden, profile.mindset) && (
                    <InfoRow label="Mindset" value={profile.mindset} />
                  )}
                  {showIfContacts(profile.life_pace_hidden, profile.life_pace) && (
                    <InfoRow label="Tempo života" value={profile.life_pace} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Tip: pokud se ti něco zobrazuje a nechceš to – vrať se do /profile/personal a u položky zapni ikonku „skrýt“.
        </div>
      </div>
    </div>
  );
}
