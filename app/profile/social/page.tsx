/**
 * File purpose
 * - "Můj profil -> Sociální sítě" (/profile/social).
 * Main responsibilities
 * - Edit optional public/contact social links.
 * - Save values to user_profiles through the shared profile API.
 * - Let each contact field be hidden individually.
 * Related APIs, components, or modules
 * - lib/api/userProfiles
 * - app/profile/components/ProfileSurface.tsx
 */

"use client";

import { useEffect, useState } from "react";
import AwButton from "@/components/AwButton";
import { awAlert } from "@/components/AwDialog";
import { ProfileHero, ProfileSectionCard } from "@/app/profile/components/ProfileSurface";
import { getMyProfile, updateMyPersonalProfile, type MyProfile } from "@/lib/api/userProfiles";

type ContactFieldKey =
  | "instagram_url"
  | "facebook_url"
  | "tiktok_url"
  | "youtube_url"
  | "linkedin_url"
  | "x_url";

type ContactField = {
  key: ContactFieldKey;
  label: string;
  placeholder: string;
};

const CONTACT_FIELDS: ContactField[] = [
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/uzivatel" },
  { key: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/uzivatel" },
  { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@uzivatel" },
  { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@kanal" },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/uzivatel" },
  { key: "x_url", label: "X", placeholder: "https://x.com/uzivatel" },
];

function normalizeUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || /^mailto:/i.test(clean)) return clean;
  if (clean.includes("@") && !clean.includes("/") && !clean.includes(".")) return clean;
  return `https://${clean}`;
}

function isProbablyValidUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(normalizeUrl(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function unwrapProfile(result: Awaited<ReturnType<typeof getMyProfile>>) {
  if (result.errorMessage || !result.data) throw new Error(result.errorMessage ?? "Profil se nepodařilo načíst.");
  return result.data;
}

function isMissingContactSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /schema cache/i.test(message) &&
    (/user_profiles/i.test(message) || CONTACT_FIELDS.some((field) => message.includes(field.key)) || message.includes("contact_note"))
  );
}

function contactSchemaErrorMessage() {
  return "Kontaktní pole zatím nejsou v databázi aktivní. Je potřeba aplikovat databázovou migraci pro kontakty a obnovit Supabase schema cache.";
}

export default function ProfileSocialPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  async function loadProfile() {
    const p = unwrapProfile(await getMyProfile());
    setProfile(p);
    setValues(
      Object.fromEntries(CONTACT_FIELDS.map((field) => [field.key, String((p as any)[field.key] ?? "")]))
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        await loadProfile();
      } catch (e: unknown) {
        if (!cancelled) await awAlert(e instanceof Error ? e.message : "Sociální sítě se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    for (const field of CONTACT_FIELDS) {
      const value = values[field.key] ?? "";
      if (!isProbablyValidUrl(value)) {
        await awAlert(`${field.label}: zadej platný odkaz nebo pole nech prázdné.`);
        return;
      }
    }

    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};

      for (const field of CONTACT_FIELDS) {
        const raw = values[field.key] ?? "";
        patch[field.key] = normalizeUrl(raw) || null;
      }

      const res = await updateMyPersonalProfile(patch);
      if (res.errorMessage) throw new Error(res.errorMessage);
      await loadProfile();
      await awAlert("Změny uloženy.");
    } catch (e: unknown) {
      await awAlert(isMissingContactSchemaError(e) ? contactSchemaErrorMessage() : e instanceof Error ? e.message : "Změny se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm text-sm text-slate-600">Načítám sociální sítě...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <ProfileHero
        title="Sociální sítě"
        description="Přidej odkazy na své profily. Kdo je uvidí, nastavíš v sekci Soukromí."
      />

      <ProfileSectionCard title="Profily" description="Web a e-mail patří do profilové karty. Tady nastavuješ jen sociální sítě.">
        <div className="grid gap-3">
          {CONTACT_FIELDS.map((field) => (
            <label key={field.key} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[140px_1fr] sm:items-center">
              <span className="text-sm font-bold text-slate-900">{field.label}</span>
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((current) => ({ ...current, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
                disabled={saving}
              />
            </label>
          ))}
        </div>
      </ProfileSectionCard>

      <AwButton variant="primary" onClick={handleSave} disabled={saving} className="w-full justify-center">
        {saving ? "Ukládám..." : "Uložit změny"}
      </AwButton>
    </div>
  );
}
