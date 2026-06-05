"use client";

/**
 * File: app/settings/privacy/page.tsx
 * Description:
 *   Soukromí & personalizace:
 *   - Moje síť (žádosti o spojení, sledování)  [pokud máš v profilu]
 *   - default visibility (post/album/image)
 *   - default age reveal (mode + delay)
 *   - TIPOVÁNÍ:
 *     - výchozí anonymita tipů (jen pro nové tipy)
 *     - nevratné odtajnění všech minulých anonymních tipů (RPC)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { awAlert, awConfirm } from "@/components/AwDialog";
import type { ContentVisibility, AgeRevealMode } from "@/types/db";
import {
  getMyProfile,
  updateMyPrivacySettings,
  updateMyGuessPrivacySettings,
  revealMyGuesses,
  type MyProfile,
} from "@/lib/api/userProfiles";

const visibilityOptions: { value: ContentVisibility; label: string }[] = [
  { value: "everyone", label: "Všichni" },
  { value: "contacts", label: "Jen kontakty" },
  { value: "private", label: "Jen já" },
];

const ageRevealOptions: { value: AgeRevealMode; label: string }[] = [
  { value: "never", label: "Nikdy" },
  { value: "delayed", label: "Se zpožděním" },
  { value: "immediate", label: "Ihned" },
];

export default function PrivacySettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // if you use it elsewhere; safe to keep
  const [profile, setProfile] = useState<MyProfile | null>(null);

  // Existing
  const [postVis, setPostVis] = useState<ContentVisibility>("everyone");
  const [albumVis, setAlbumVis] = useState<ContentVisibility>("everyone");
  const [imageVis, setImageVis] = useState<ContentVisibility>("everyone");
  const [revealMode, setRevealMode] = useState<AgeRevealMode>("immediate");
  const [delayDays, setDelayDays] = useState<number>(2);

  // NEW: default anonymity for NEW guesses (default = veřejné => false)
  const [anonDefault, setAnonDefault] = useState<boolean>(false);
  const [revealBusy, setRevealBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await getMyProfile();
        if (result.errorMessage || !result.data) {
          throw new Error(result.errorMessage ?? "Nastavení se nepodařilo načíst.");
        }

        const p = result.data;
        setProfile(p);

        setPostVis(p.defaultPostVisibility ?? "everyone");
        setAlbumVis(p.defaultAlbumVisibility ?? "everyone");
        setImageVis(p.defaultImageVisibility ?? "everyone");
        setRevealMode(p.defaultAgeRevealMode ?? "immediate");
        setDelayDays(p.defaultAgeRevealDelayDays ?? 0);

        // default: veřejné tipování => false
        setAnonDefault(Boolean((p as any).anonymous_guesses_default ?? false));
      } catch (e) {
        console.error(e);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSave() {
    const finalDelay = revealMode === "delayed" ? Math.max(1, delayDays) : 0;

    setSaving(true);
    try {
      // existing privacy settings
      await updateMyPrivacySettings({
        defaultPostVisibility: postVis,
        defaultAlbumVisibility: albumVis,
        defaultImageVisibility: imageVis,
        defaultAgeRevealMode: revealMode,
        defaultAgeRevealDelayDays: finalDelay,
      });

      // NEW: guess anonymity default
      await updateMyGuessPrivacySettings({
        anonymousGuessesDefault: anonDefault,
      });

      await awAlert("Uloženo.");
    } catch (e: any) {
      console.error(e);
      await awAlert(e?.message ?? "Uložení se nepovedlo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevealAllGuesses() {
    const ok = await awConfirm({
      title: "Odtajnit tipy",
      message:
        "Odtajnit všechny mé tipy z minulosti?\n\n" +
        "Je to nevratné: všechny dříve anonymní tipy se stanou veřejnými (ostatní uvidí, jak jsi tipoval/a).",
      confirmLabel: "Odtajnit",
      danger: true,
    });
    if (!ok) return;

    setRevealBusy(true);
    try {
      const count = await revealMyGuesses();
      await awAlert(`Hotovo. Odtajněno tipů: ${count}`);
    } catch (e: any) {
      console.error(e);
      await awAlert(e?.message ?? "Nepovedlo se odtajnit tipy.");
    } finally {
      setRevealBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-600">Načítám nastavení…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6 space-y-5">
        <h1 className="text-xl font-bold">Soukromí & personalizace</h1>
        <p className="text-sm text-gray-600">
          Nastavíš výchozí viditelnost obsahu, odhalení věku a pravidla pro „spojení“ a „sledování“.
        </p>

        {/* Výchozí viditelnost */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Výchozí viditelnost</h2>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Výchozí viditelnost postů</label>
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
              <label className="block text-sm font-semibold mb-1">Výchozí viditelnost alb</label>
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
              <label className="block text-sm font-semibold mb-1">Výchozí viditelnost fotek</label>
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
        </div>

        {/* Odhalení věku */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Odhalení věku</h2>

          <div className="mt-3">
            <label className="block text-sm font-semibold mb-1">Režim odhalení věku</label>
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

            <div className="mt-3">
              <label className="block text-sm font-semibold mb-1">Zpoždění odhalení věku (dny)</label>
              <input
                type="number"
                min={1}
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2"
                disabled={revealMode !== "delayed"}
              />
              <div className="mt-1 text-xs text-gray-500">Dostupné jen pro „Se zpožděním“.</div>
            </div>
          </div>
        </div>

        {/* NEW: Tipování věku */}
        <div className="rounded-2xl p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Tipování věku</div>
            <div className="mt-1 text-xs text-gray-600">
              Nastavení ovlivní jen nové tipy. Tipy z minulosti zůstanou tak, jak byly uloženy.
            </div>
          </div>

          <label className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Tipovat anonymně (výchozí)</div>
              <div className="text-xs text-gray-600">
                Výchozí je veřejné tipování. Když zapneš anonymitu, nové tipy budou uložené anonymně.
              </div>
            </div>

            <input
              type="checkbox"
              checked={anonDefault}
              onChange={(e) => setAnonDefault(e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
          </label>

          <button
            type="button"
            onClick={handleRevealAllGuesses}
            disabled={revealBusy}
            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60"
          >
            {revealBusy ? "Odtajňuji…" : "Odtajnit všechny mé tipy z minulosti"}
          </button>

          <div className="text-[11px] text-gray-600">
            Zpětná anonymizace není možná. Odtajnění je nevratné (ostatní uvidí, jak jsi tipoval/a).
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-semibold rounded-xl py-2 disabled:opacity-60"
        >
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </main>
  );
}

