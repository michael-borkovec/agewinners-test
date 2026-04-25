"use client";

/**
 * File: app/onboarding/page.tsx
 * Description:
 *   Onboarding nastavení profilu:
 *   - date_of_birth (nastavit jen jednou) + silné varování + potvrzení
 *   - první nastavení default privacy (post/album/image) + age reveal
 *   - POZOR: privacy nastavení se bude dát měnit i později v "Soukromí & personalizace"
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { awAlert } from "@/components/AwDialog";
import type { ContentVisibility, AgeRevealMode } from "@/types/db";
import { getMyProfile, updateMyOnboarding, type MyProfile } from "@/lib/api/userProfiles";

/** ============ Helpers pro český výpis DOB ============ */

const CZ_MONTHS = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Jednoduchá „slovní“ forma dne (1–31) pro čitelné potvrzení.
function czDayWord(day: number) {
  const words: Record<number, string> = {
    1: "první",
    2: "druhý",
    3: "třetí",
    4: "čtvrtý",
    5: "pátý",
    6: "šestý",
    7: "sedmý",
    8: "osmý",
    9: "devátý",
    10: "desátý",
    11: "jedenáctý",
    12: "dvanáctý",
    13: "třináctý",
    14: "čtrnáctý",
    15: "patnáctý",
    16: "šestnáctý",
    17: "sedmnáctý",
    18: "osmnáctý",
    19: "devatenáctý",
    20: "dvacátý",
    21: "dvacátý první",
    22: "dvacátý druhý",
    23: "dvacátý třetí",
    24: "dvacátý čtvrtý",
    25: "dvacátý pátý",
    26: "dvacátý šestý",
    27: "dvacátý sedmý",
    28: "dvacátý osmý",
    29: "dvacátý devátý",
    30: "třicátý",
    31: "třicátý první",
  };
  return words[day] ?? `${day}.`;
}

function formatDobCz(dobIso: string) {
  // dobIso je "YYYY-MM-DD"
  const [y, m, d] = dobIso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;

  const dd = pad2(d);
  const mm = pad2(m);
  const monthName = CZ_MONTHS[m - 1] ?? "";

  return {
    numeric: `${dd}. ${mm}. ${y}`,
    verbose: `${czDayWord(d)} den měsíce ${monthName}, roku ${y}`,
  };
}

/** ============ Options ============ */

const visibilityOptions: { value: ContentVisibility; label: string }[] = [
  { value: "everyone", label: "Všichni na AgeWinners" },
  { value: "contacts", label: "Jen kontakty" },
  { value: "private", label: "Jen já" },
];

const ageRevealOptions: { value: AgeRevealMode; label: string }[] = [
  { value: "never", label: "Můj věk nikdy neuvidí" },
  { value: "delayed", label: "Uvidí až po X dnech" },
  { value: "immediate", label: "Uvidí hned" },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  // Form state
  const [dob, setDob] = useState<string>(""); // YYYY-MM-DD
  const [dobConfirm, setDobConfirm] = useState(false); // potvrzení „už nepůjde změnit“

  // Privacy defaults – nastavíme v onboardingu, ale později půjdou měnit v Settings
  const [postVis, setPostVis] = useState<ContentVisibility>("everyone");
  const [albumVis, setAlbumVis] = useState<ContentVisibility>("everyone");
  const [imageVis, setImageVis] = useState<ContentVisibility>("everyone");
  const [revealMode, setRevealMode] = useState<AgeRevealMode>("never");
  const [delayDays, setDelayDays] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const result = await getMyProfile();
        if (result.errorMessage || !result.data) {
          throw new Error(result.errorMessage ?? "Profil se nepodařilo načíst.");
        }

        const p = result.data;
        setProfile(p);

        // DOB: pokud už existuje, zobrazíme ho, ale nezamkneme možnost uložit privacy nastavení
        if (p.date_of_birth) {
          setDob(p.date_of_birth);
        } else {
          setDob("");
        }

        // Načteme defaulty, aby onboarding respektoval aktuální stav profilu
        setPostVis(p.defaultPostVisibility ?? "everyone");
        setAlbumVis(p.defaultAlbumVisibility ?? "everyone");
        setImageVis(p.defaultImageVisibility ?? "everyone");
        setRevealMode(p.defaultAgeRevealMode ?? "never");
        setDelayDays(p.defaultAgeRevealDelayDays ?? 0);
      } catch (e: any) {
        console.error(e);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const dobLocked = Boolean(profile?.date_of_birth); // pokud už existuje v DB, nepůjde změnit (DB trigger)

  const dobPreview = useMemo(() => {
    if (!dob) return null;
    return formatDobCz(dob);
  }, [dob]);

  async function handleSave() {
    // Pokud DOB ještě nikdy nebylo nastavené, vyžadujeme vyplnění + potvrzení
    if (!dobLocked) {
      if (!dob) {
        await awAlert("Vyplň prosím datum narození.");
        return;
      }
      if (!dobConfirm) {
        await awAlert(
          "Prosím potvrď, že rozumíš tomu, že datum narození už později nepůjde změnit."
        );
        return;
      }
    }

    // Pokud delayed, musí být aspoň 1 den
    const finalDelay = revealMode === "delayed" ? Math.max(1, delayDays) : 0;

    setSaving(true);
    try {
      await updateMyOnboarding({
        // DOB:
        // - pokud je dobLocked, necháme uložené DOB beze změny (pošleme stávající)
        // - pokud není dobLocked, posíláme nově zadané DOB
        dateOfBirth: dobLocked ? (profile?.date_of_birth ?? dob) : dob,

        // Privacy defaults (měnitelné kdykoliv později v Settings)
        defaultPostVisibility: postVis,
        defaultAlbumVisibility: albumVis,
        defaultImageVisibility: imageVis,
        defaultAgeRevealMode: revealMode,
        defaultAgeRevealDelayDays: finalDelay,
      });

      router.push("/");
    } catch (e: any) {
      console.error(e);

      // Typická chyba, pokud by někdo zkoušel měnit DOB podruhé:
      const msg = e?.message ?? "Uložení se nepovedlo.";
      await awAlert(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-600">Načítám onboarding…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6 space-y-5">
        <h1 className="text-xl font-bold">Nastavení profilu</h1>

        <p className="text-sm text-gray-600">
          Prosím nastav základní údaje. Datum narození lze nastavit pouze jednou.
          Nastavení soukromí půjde kdykoliv změnit v sekci{" "}
          <span className="font-semibold">Soukromí & personalizace</span>.
        </p>

        {/* Datum narození */}
        <div>
          <label className="block text-sm font-semibold mb-1">
            Datum narození
          </label>

          <input
            type="date"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              // při změně DOB (jen při prvním nastavení) resetneme potvrzení
              if (!dobLocked) setDobConfirm(false);
            }}
            disabled={dobLocked}
            className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-100"
          />

          {dobLocked ? (
            <p className="text-xs text-gray-500 mt-1">
              Datum narození už je nastavené a nejde změnit.
            </p>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                Pozor, datum narození můžete nastavit pouze teď a už nikdy jej nebude možné změnit.
                Ujistěte se tedy, že jej máte správně nastavené.
              </p>

              {dobPreview && (
                <div className="mt-2 text-sm text-amber-900">
                  <p>
                    <span className="font-semibold">Vaše datum narození je:</span>{" "}
                    {dobPreview.numeric}.
                  </p>
                  <p>Tedy {dobPreview.verbose}.</p>
                  <p className="text-xs text-amber-900/80 mt-1">
                    (např. „02. 07. 1982“ = „druhý den měsíce červenec, roku 1982“)
                  </p>
                </div>
              )}

              <label className="mt-3 flex items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={dobConfirm}
                  onChange={(e) => setDobConfirm(e.target.checked)}
                />
                Rozumím a potvrzuji, že datum narození už nepůjde změnit.
              </label>
            </div>
          )}
        </div>

        {/* Default visibility – měnitelné i později v Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Viditelnost postů
            </label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={postVis}
              onChange={(e) => setPostVis(e.target.value as ContentVisibility)}
            >
              {visibilityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Viditelnost alb
            </label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={albumVis}
              onChange={(e) => setAlbumVis(e.target.value as ContentVisibility)}
            >
              {visibilityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Viditelnost fotek
            </label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={imageVis}
              onChange={(e) => setImageVis(e.target.value as ContentVisibility)}
            >
              {visibilityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Age reveal */}
        <div>
          <label className="block text-sm font-semibold mb-1">
            Kdy se tipér dozví můj věk?
          </label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={revealMode}
            onChange={(e) => setRevealMode(e.target.value as AgeRevealMode)}
          >
            {ageRevealOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {revealMode === "delayed" && (
            <div className="mt-2">
              <label className="block text-sm mb-1">Po kolika dnech?</label>
              <input
                type="number"
                min={1}
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-semibold rounded-xl py-2 disabled:opacity-60"
        >
          {saving ? "Ukládám…" : "Uložit a pokračovat"}
        </button>

        <div className="text-xs text-gray-500">
          Tip: Nastavení soukromí můžeš kdykoliv změnit v{" "}
          <span className="font-semibold">Soukromí & personalizace</span>.
        </div>
      </div>
    </main>
  );
}
