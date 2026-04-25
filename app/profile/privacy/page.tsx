/**
 * app/profile/privacy/page.tsx
 *
 * Purpose:
 * - "Můj profil → Soukromí & personalizace" (/profile/privacy)
 * - Allows editing of:
 *   - default_post_visibility
 *   - default_album_visibility
 *   - allow_age_visible
 *   - allow_connection_requests
 *   - allow_following
 *   - anonymous_guesses_default
 *   - revealMyGuesses()
 *
 * New visibility model:
 * - řešíme už jen Posty a Alba
 * - fotky samostatnou viditelnost neřeší
 * - pokud je post v albu, použije se visibility alba
 * - pokud post není v albu, použije se visibility postu
 *
 * Notes:
 * - Visibility dropdowns define default visibility for NEW content
 * - "Aplikovat zpětně" updates existing content visibility
 */

"use client";

import { useEffect, useState } from "react";
import AwButton from "@/components/AwButton";
import { awAlert, awConfirm } from "@/components/AwDialog";
import type { DbUserProfile, ContentVisibility } from "@/types/db";
import {
  applyMyAlbumVisibilityBackfill,
  applyMyPostVisibilityBackfill,
  getMyProfile,
  revealMyGuesses,
  updateMyGuessPrivacySettings,
  updateMyPrivacySettings,
} from "@/lib/api/userProfiles";

function labelVisibility(v: ContentVisibility) {
  if (v === "everyone") return "Všichni";
  if (v === "contacts") return "Kontakty";
  return "Soukromé";
}

function retroInfo(kind: "posty" | "alba") {
  if (kind === "posty") {
    return (
      'Touto volbou změníte zpětně výchozí viditelnost vašich samostatných postů.\n\n' +
      "Pokud post není v albu, bude se řídit touto viditelností.\n" +
      "Pokud je post v albu, použije se viditelnost alba.\n\n" +
      "Berte prosím na vědomí, že změna může ovlivnit přepočítání AW skóre."
    );
  }

  return (
    'Touto volbou změníte zpětně viditelnost všech vašich alb.\n\n' +
    "Posty zařazené do alba se pak budou řídit viditelností alba.\n\n" +
    "Berte prosím na vědomí, že změna může ovlivnit přepočítání AW skóre."
  );
}

export default function ProfilePrivacyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DbUserProfile | null>(null);

  const [defaultPostVisibility, setDefaultPostVisibility] =
    useState<ContentVisibility>("everyone");
  const [defaultAlbumVisibility, setDefaultAlbumVisibility] =
    useState<ContentVisibility>("everyone");

  const [allowAgeVisible, setAllowAgeVisible] = useState(true);
  const [allowConnectionRequests, setAllowConnectionRequests] = useState(true);
  const [allowFollowing, setAllowFollowing] = useState(true);
  const [wellbeingDailyEntryVisibilityDefault, setWellbeingDailyEntryVisibilityDefault] = useState<ContentVisibility>("everyone");

  const [anonymousGuessesDefault, setAnonymousGuessesDefault] = useState(false);
  const [revealBusy, setRevealBusy] = useState(false);

  const [busyPostBackfill, setBusyPostBackfill] = useState(false);
  const [busyAlbumBackfill, setBusyAlbumBackfill] = useState(false);

  async function reloadProfile() {
    const result = await getMyProfile();
    if (result.errorMessage || !result.data) throw new Error(result.errorMessage ?? "Profil se nepodařilo načíst.");
    const p: any = result.data;
    setProfile(p);

    setDefaultPostVisibility(
      (p.default_post_visibility ?? "everyone") as ContentVisibility
    );
    setDefaultAlbumVisibility(
      (p.default_album_visibility ?? "everyone") as ContentVisibility
    );

    setAllowAgeVisible(Boolean(p.allow_age_visible ?? true));
    setAllowConnectionRequests(Boolean(p.allow_connection_requests ?? true));
    setAllowFollowing(Boolean(p.allow_following ?? true));
    setWellbeingDailyEntryVisibilityDefault((p.wellbeing_daily_entry_visibility_default ?? "everyone") as ContentVisibility);
    setAnonymousGuessesDefault(Boolean(p.anonymous_guesses_default ?? false));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (cancelled) return;
        await reloadProfile();
      } catch (e: any) {
        await awAlert(e?.message ?? "Privacy nastavení se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMyPrivacySettings({
        defaultPostVisibility,
        defaultAlbumVisibility,
        allowAgeVisible,
        allowConnectionRequests,
        allowFollowing,
        wellbeingDailyEntryVisibilityDefault,
      });

      await updateMyGuessPrivacySettings({
        anonymousGuessesDefault,
      });

      await reloadProfile();
      await awAlert("Uloženo.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Uložení se nepodařilo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyBackfill(kind: "posty" | "alba") {
    const info = retroInfo(kind);
    const ok = await awConfirm({
      title: "Aplikovat zpětně",
      message: `${info}\n\nPokračovat?`,
      confirmLabel: "Pokračovat",
    });
    if (!ok) return;

    try {
      if (kind === "posty") {
        setBusyPostBackfill(true);
        await updateMyPrivacySettings({ defaultPostVisibility });
        const count = await applyMyPostVisibilityBackfill(defaultPostVisibility);
        await awAlert(`Hotovo. Zpětně upravené posty: ${count}`);
      } else {
        setBusyAlbumBackfill(true);
        await updateMyPrivacySettings({ defaultAlbumVisibility });
        const count = await applyMyAlbumVisibilityBackfill(defaultAlbumVisibility);
        await awAlert(`Hotovo. Zpětně upravená alba: ${count}`);
      }

      await reloadProfile();
    } catch (e: any) {
      await awAlert(e?.message ?? "Zpětná změna se nepodařila.");
    } finally {
      setBusyPostBackfill(false);
      setBusyAlbumBackfill(false);
    }
  }

  async function handleRevealAllMyGuesses() {
    const ok = await awConfirm({
      title: "Odtajnit tipy",
      message:
        "Odtajnit všechny mé tipy z minulosti?\n\n" +
        "Je to nevratné: všechny dříve anonymní tipy se stanou veřejnými a ostatní uvidí, jak jsi tipoval/a.",
      confirmLabel: "Odtajnit",
      danger: true,
    });
    if (!ok) return;

    setRevealBusy(true);
    try {
      const count = await revealMyGuesses();
      await awAlert(`Hotovo. Odtajněno tipů: ${count}`);
    } catch (e: any) {
      await awAlert(e?.message ?? "Nepodařilo se odtajnit tipy.");
    } finally {
      setRevealBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-600">Načítám Soukromí…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-700">Profil není dostupný.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Soukromí & personalizace</h1>
        <p className="mt-1 text-sm text-gray-600">
          Nastav si, co uvidí ostatní a jak se budeš v aplikaci chovat jako tipař.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Výchozí viditelnost obsahu</h2>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Když post <span className="font-semibold">není v albu</span>, řídí se svou vlastní viditelností.
          Když je post <span className="font-semibold">v albu</span>, použije se viditelnost alba.
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700">Posty</label>
          <div className="mt-1 flex items-start gap-2">
            <select
              value={defaultPostVisibility}
              onChange={(e) => setDefaultPostVisibility(e.target.value as ContentVisibility)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="everyone">{labelVisibility("everyone")}</option>
              <option value="contacts">{labelVisibility("contacts")}</option>
              <option value="private">{labelVisibility("private")}</option>
            </select>

            <AwButton size="sm" onClick={() => handleApplyBackfill("posty")} disabled={busyPostBackfill} className="shrink-0">
              {busyPostBackfill ? "Pracuji…" : "Aplikovat zpětně"}
            </AwButton>

            <span
              title={retroInfo("posty")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-700"
            >
              i
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700">Alba</label>
          <div className="mt-1 flex items-start gap-2">
            <select
              value={defaultAlbumVisibility}
              onChange={(e) => setDefaultAlbumVisibility(e.target.value as ContentVisibility)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="everyone">{labelVisibility("everyone")}</option>
              <option value="contacts">{labelVisibility("contacts")}</option>
              <option value="private">{labelVisibility("private")}</option>
            </select>

            <AwButton size="sm" onClick={() => handleApplyBackfill("alba")} disabled={busyAlbumBackfill} className="shrink-0">
              {busyAlbumBackfill ? "Pracuji…" : "Aplikovat zpětně"}
            </AwButton>

            <span
              title={retroInfo("alba")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-700"
            >
              i
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Věk</h2>

        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={allowAgeVisible}
            onChange={(e) => setAllowAgeVisible(e.target.checked)}
            className="mt-1 h-4 w-4 accent-emerald-600"
          />
          <div>
            <div className="font-semibold">Povolit ostatním, aby viděli můj věk</div>
            <div className="text-xs text-gray-600">
              Tohle ovlivňuje i některé funkce (např. reputační skóre).
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Moje síť</h2>

        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={allowConnectionRequests}
            onChange={(e) => setAllowConnectionRequests(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          <span className="font-semibold">Povolit žádosti o spojení</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={allowFollowing}
            onChange={(e) => setAllowFollowing(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          <span className="font-semibold">Povolit sledování</span>
        </label>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Wellbeing statistiky</h2>
        <p className="text-sm leading-6 text-gray-600">Výchozí viditelnost pro celý denní zápis ve statistikách.</p>

        <label className="grid gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900 sm:grid-cols-[160px_1fr] sm:items-center">
          <span className="font-semibold">Denní zápis</span>
          <select
            value={wellbeingDailyEntryVisibilityDefault}
            onChange={(e) => setWellbeingDailyEntryVisibilityDefault(e.target.value as ContentVisibility)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="everyone">{labelVisibility("everyone")}</option>
            <option value="contacts">{labelVisibility("contacts")}</option>
            <option value="private">{labelVisibility("private")}</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Tipování</h2>

        <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={anonymousGuessesDefault}
            onChange={(e) => setAnonymousGuessesDefault(e.target.checked)}
            className="mt-1 h-4 w-4 accent-emerald-600"
          />
          <div>
            <div className="font-semibold">Tipovat anonymně (výchozí pro nové tipy)</div>
            <div className="text-xs text-gray-600">
              Platí jen pro nové tipy. Staré tipy se nemění (pokud je níže neodtajníš).
            </div>
          </div>
        </label>

        <AwButton onClick={handleRevealAllMyGuesses} disabled={revealBusy} className="w-full">
          {revealBusy ? "Pracuji…" : "Odtajnit všechny moje minulé tipy"}
        </AwButton>
      </div>

      <AwButton variant="primary" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Ukládám…" : "Uložit"}
      </AwButton>
    </div>
  );
}
