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
import { ProfileHero, ProfileSectionCard } from "@/app/profile/components/ProfileSurface";
import type { DbUserProfile, ContentVisibility, ProfileGroupVisibility } from "@/types/db";
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

function labelProfileVisibility(v: ProfileGroupVisibility) {
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

  const [profileAgeVisibility, setProfileAgeVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [allowConnectionRequests, setAllowConnectionRequests] = useState(true);
  const [allowFollowing, setAllowFollowing] = useState(true);
  const [wellbeingDailyEntryVisibilityDefault, setWellbeingDailyEntryVisibilityDefault] = useState<ContentVisibility>("everyone");
  const [socialLinksVisibility, setSocialLinksVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [profileOccupationVisibility, setProfileOccupationVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [profileEducationVisibility, setProfileEducationVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [profileLanguagesVisibility, setProfileLanguagesVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [profileRelationshipVisibility, setProfileRelationshipVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [profileMotivationVisibility, setProfileMotivationVisibility] = useState<ProfileGroupVisibility>("contacts");
  const [profileBodyVisibility, setProfileBodyVisibility] = useState<ProfileGroupVisibility>("contacts");

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

    setProfileAgeVisibility((p.profile_age_visibility ?? (p.allow_age_visible === false ? "private" : "contacts")) as ProfileGroupVisibility);
    setAllowConnectionRequests(Boolean(p.allow_connection_requests ?? true));
    setAllowFollowing(Boolean(p.allow_following ?? true));
    setWellbeingDailyEntryVisibilityDefault((p.wellbeing_daily_entry_visibility_default ?? "everyone") as ContentVisibility);
    setSocialLinksVisibility((p.social_links_visibility ?? "contacts") as ProfileGroupVisibility);
    setProfileOccupationVisibility((p.profile_occupation_visibility ?? (p.occupation_hidden ? "private" : "contacts")) as ProfileGroupVisibility);
    setProfileEducationVisibility((p.profile_education_visibility ?? ((p.is_student_hidden || p.education_level_hidden) ? "private" : "contacts")) as ProfileGroupVisibility);
    setProfileLanguagesVisibility((p.profile_languages_visibility ?? ((p.native_languages_hidden || p.other_languages_hidden) ? "private" : "contacts")) as ProfileGroupVisibility);
    setProfileRelationshipVisibility((p.profile_relationship_visibility ?? (p.relationship_status_hidden ? "private" : "contacts")) as ProfileGroupVisibility);
    setProfileMotivationVisibility((p.profile_motivation_visibility ?? (p.motivation_text_hidden ? "private" : "contacts")) as ProfileGroupVisibility);
    setProfileBodyVisibility((p.profile_body_visibility ?? ((p.height_cm_hidden || p.weight_kg_hidden) ? "private" : "contacts")) as ProfileGroupVisibility);
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
        profileAgeVisibility,
        allowConnectionRequests,
        allowFollowing,
        wellbeingDailyEntryVisibilityDefault,
        socialLinksVisibility,
        profileOccupationVisibility,
        profileEducationVisibility,
        profileLanguagesVisibility,
        profileRelationshipVisibility,
        profileMotivationVisibility,
        profileBodyVisibility,
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
      <ProfileHero
        title="Soukromí"
        description="Nastav, kdo uvidí tvůj obsah, kdo tě může kontaktovat a jak se budou chovat nové tipy. Zpětné změny spouštěj jen vědomě."
      />

      <ProfileSectionCard
        title="Výchozí viditelnost obsahu"
        description={
          "Tato volba se použije pro nově vytvořený obsah. Zpětná změna je samostatná akce.\n\nKdyž post není v albu, řídí se svou vlastní viditelností. Když je post v albu, použije se viditelnost alba.\n\nAplikovat zpětně na posty změní výchozí viditelnost samostatných postů. Pokud je post v albu, použije se viditelnost alba. Změna může ovlivnit přepočítání AW skóre.\n\nAplikovat zpětně na alba změní viditelnost všech alb. Posty zařazené do alba se pak budou řídit viditelností alba. Změna může ovlivnit přepočítání AW skóre."
        }
      >
        <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
          <label className="text-sm font-semibold text-gray-900">Posty</label>
            <select
              value={defaultPostVisibility}
              onChange={(e) => setDefaultPostVisibility(e.target.value as ContentVisibility)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="everyone">{labelVisibility("everyone")}</option>
              <option value="contacts">{labelVisibility("contacts")}</option>
              <option value="private">{labelVisibility("private")}</option>
            </select>

            <AwButton size="sm" onClick={() => handleApplyBackfill("posty")} disabled={busyPostBackfill} className="shrink-0">
              {busyPostBackfill ? "Pracuji…" : "Aplikovat zpětně"}
            </AwButton>
        </div>

        <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
          <label className="text-sm font-semibold text-gray-900">Alba</label>
            <select
              value={defaultAlbumVisibility}
              onChange={(e) => setDefaultAlbumVisibility(e.target.value as ContentVisibility)}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="everyone">{labelVisibility("everyone")}</option>
              <option value="contacts">{labelVisibility("contacts")}</option>
              <option value="private">{labelVisibility("private")}</option>
            </select>

            <AwButton size="sm" onClick={() => handleApplyBackfill("alba")} disabled={busyAlbumBackfill} className="shrink-0">
              {busyAlbumBackfill ? "Pracuji…" : "Aplikovat zpětně"}
            </AwButton>
        </div>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Viditelnost profilu" description="Tady nastavuješ, kdo uvidí vybrané informace z části O mně a sociální sítě. Samotný obsah těchto polí upravuješ v O mně a Sociálních sítích.">
        <div className="grid gap-3">
          <ProfileVisibilitySelect label="Sociální sítě" value={socialLinksVisibility} onChange={setSocialLinksVisibility} />
          <ProfileVisibilitySelect label="Povolání" value={profileOccupationVisibility} onChange={setProfileOccupationVisibility} />
          <ProfileVisibilitySelect label="Vzdělání a student" value={profileEducationVisibility} onChange={setProfileEducationVisibility} />
          <ProfileVisibilitySelect label="Jazyky" value={profileLanguagesVisibility} onChange={setProfileLanguagesVisibility} />
          <ProfileVisibilitySelect label="Vztahový status" value={profileRelationshipVisibility} onChange={setProfileRelationshipVisibility} />
          <ProfileVisibilitySelect label="Motivační věta" value={profileMotivationVisibility} onChange={setProfileMotivationVisibility} />
          <ProfileVisibilitySelect label="Výška a váha" value={profileBodyVisibility} onChange={setProfileBodyVisibility} />
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Věk" description="Řídí, kdo uvidí věkové a AW údaje v náhledu profilu. Tohle ovlivňuje i některé funkce, například reputační skóre.">
        <ProfileVisibilitySelect label="Věk a AW údaje" value={profileAgeVisibility} onChange={setProfileAgeVisibility} />
      </ProfileSectionCard>

      <ProfileSectionCard title="Moje síť" description="Urči, jestli tě ostatní mohou sledovat nebo požádat o spojení.">
        <div className="space-y-3">

        <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-900" onClick={() => setAllowConnectionRequests(!allowConnectionRequests)}>
          <PrivacyCheckbox checked={allowConnectionRequests} onChange={setAllowConnectionRequests} />
          <span className="font-semibold">Povolit žádosti o spojení</span>
        </div>

        <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-900" onClick={() => setAllowFollowing(!allowFollowing)}>
          <PrivacyCheckbox checked={allowFollowing} onChange={setAllowFollowing} />
          <span className="font-semibold">Povolit sledování</span>
        </div>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Wellbeing vývoj" description="Výchozí viditelnost pro celý denní zápis ve statistikách.">
        <div className="space-y-3">

        <label className="grid gap-1 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-900 sm:grid-cols-[160px_1fr] sm:items-center">
          <span className="font-semibold">Denní zápis</span>
          <select
            value={wellbeingDailyEntryVisibilityDefault}
            onChange={(e) => setWellbeingDailyEntryVisibilityDefault(e.target.value as ContentVisibility)}
            className="w-full rounded-xl bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="everyone">{labelVisibility("everyone")}</option>
            <option value="contacts">{labelVisibility("contacts")}</option>
            <option value="private">{labelVisibility("private")}</option>
          </select>
        </label>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Tipování" description="Nastavení výchozí anonymity a odtajnění starších tipů.">
        <div className="space-y-3">

        <div className="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-900" onClick={() => setAnonymousGuessesDefault(!anonymousGuessesDefault)}>
          <PrivacyCheckbox checked={anonymousGuessesDefault} onChange={setAnonymousGuessesDefault} className="mt-0.5" />
          <div>
            <div className="font-semibold">Tipovat anonymně (výchozí pro nové tipy)</div>
            <div className="text-xs text-gray-600">
              Platí jen pro nové tipy. Staré tipy se nemění (pokud je níže neodtajníš).
            </div>
          </div>
        </div>

        <AwButton onClick={handleRevealAllMyGuesses} disabled={revealBusy} className="w-full">
          {revealBusy ? "Pracuji…" : "Odtajnit všechny moje minulé tipy"}
        </AwButton>
        </div>
      </ProfileSectionCard>

      <AwButton variant="primary" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Ukládám…" : "Uložit"}
      </AwButton>
    </div>
  );
}

function ProfileVisibilitySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ProfileGroupVisibility;
  onChange: (value: ProfileGroupVisibility) => void;
}) {
  return (
    <label className="grid gap-2 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-900 sm:grid-cols-[180px_1fr] sm:items-center">
      <span className="font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ProfileGroupVisibility)}
        className="w-full rounded-xl bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-100"
      >
        <option value="contacts">{labelProfileVisibility("contacts")}</option>
        <option value="everyone">{labelProfileVisibility("everyone")}</option>
        <option value="private">{labelProfileVisibility("private")}</option>
      </select>
    </label>
  );
}

function PrivacyCheckbox({ checked, onChange, className = "" }: { checked: boolean; onChange: (checked: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
        checked ? "border-[#32CD32] bg-[#32CD32] text-white" : "border-slate-300 bg-white text-transparent"
      } ${className}`.trim()}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 10 4 4 8-8" />
      </svg>
    </button>
  );
}
