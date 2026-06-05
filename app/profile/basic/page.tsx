/**
 * File purpose
 * - "Můj profil -> Základní profil"
 * - Editace display_name, bio a avataru.
 * - Zobrazení data narození pro všechny, editace jen pro SuperUser.
 * - Related APIs, components, or modules
 *   - lib/api/userProfiles
 *   - components/EmojiTextarea.tsx
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AwInvitesCard from "@/components/AwInvitesCard";
import EmojiTextarea from "@/components/EmojiTextarea";
import { awAlert, awConfirm } from "@/components/AwDialog";
import { ProfileHero, ProfileSectionCard } from "@/app/profile/components/ProfileSurface";
import type { MyProfile } from "@/lib/api/userProfiles";
import {
  getMyProfile,
  updateMyBasicProfile,
  updateMyPersonalProfile,
  uploadMyAvatar,
  removeMyAvatar,
  updateMyDateOfBirthSuperUser,
} from "@/lib/api/userProfiles";

function formatDobCZ(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("cs-CZ");
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function unwrapOrThrow<T>(res: { data: T | null; errorMessage: string | null }): T {
  if (res.errorMessage) throw new Error(res.errorMessage);
  if (res.data === null || res.data === undefined) throw new Error("Neočekávaná prázdná odpověď serveru.");
  return res.data;
}

function addCacheBust(url: string | null, bust: number) {
  if (!url) return null;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${bust}`;
}

export default function BasicProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [publicBio, setPublicBio] = useState("");
  const [networkBio, setNetworkBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBust, setAvatarBust] = useState<number>(() => Date.now());
  const [dobDraft, setDobDraft] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const isSuperUser = useMemo(() => Boolean(profile?.superUser), [profile]);

  async function loadProfile() {
    const res = await getMyProfile();
    const p = unwrapOrThrow(res);

    setProfile(p);
    setDisplayName(p.displayName ?? "");
    setPublicBio(p.bio ?? "");
    setNetworkBio((p as any).bio_contacts ?? "");
    setAvatarUrl(p.avatarUrl ?? null);
    setDobDraft(toDateInputValue(p.dateOfBirth));
    setAvatarBust(Date.now());
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await loadProfile();
      } catch (e: any) {
        if (!cancelled) await awAlert(e?.message ?? "Profil se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!avatarMenuRef.current) return;
      if (avatarMenuRef.current.contains(e.target as Node)) return;
      setAvatarMenuOpen(false);
    }

    if (avatarMenuOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [avatarMenuOpen]);

  async function handleSaveBasic() {
    if (!profile) return;

    const name = displayName.trim();
    if (!name) {
      await awAlert("Jméno nesmí být prázdné.");
      return;
    }

    setSaving(true);
    try {
      const res = await updateMyBasicProfile({
        displayName: name,
        bio: publicBio,
        avatarUrl: avatarUrl ?? null,
      });
      if (res.errorMessage) throw new Error(res.errorMessage);

      const personalRes = await updateMyPersonalProfile({
        bio_contacts: networkBio.trim() || null,
        bio_contacts_hidden: false,
      });
      if (personalRes.errorMessage) throw new Error(personalRes.errorMessage);

      await loadProfile();
      window.dispatchEvent(new Event("aw-profile-updated"));
      await awAlert("Uloženo.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Uložení se nepodařilo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFileSelected(file: File | null) {
    if (!file) return;

    setAvatarUploading(true);
    try {
      const res = await uploadMyAvatar(file);
      const data = unwrapOrThrow(res);

      setAvatarUrl(data.avatarUrl);
      setAvatarBust(Date.now());
      await loadProfile();
      window.dispatchEvent(new Event("aw-profile-updated"));
      await awAlert("Avatar nahrán.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Upload avatara se nepodařil.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    const ok = await awConfirm({
      title: "Odebrat avatar",
      message: "Opravdu chceš odebrat avatar? Soubor ve Storage zatím zůstane.",
      confirmLabel: "Odebrat",
      danger: true,
    });
    if (!ok) return;

    setAvatarUploading(true);
    try {
      const res = await removeMyAvatar();
      if (res.errorMessage) throw new Error(res.errorMessage);

      setAvatarUrl(null);
      setAvatarBust(Date.now());
      await loadProfile();
      window.dispatchEvent(new Event("aw-profile-updated"));
      await awAlert("Avatar odebrán.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Odebrání avatara se nepodařilo.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveDob() {
    if (!profile || !isSuperUser) return;

    if (!dobDraft || !/^\d{4}-\d{2}-\d{2}$/.test(dobDraft)) {
      await awAlert("Zadej platné datum ve formátu YYYY-MM-DD.");
      return;
    }

    const ok = await awConfirm({
      title: "Změnit datum narození",
      message: "Opravdu chceš změnit datum narození? Tato akce je jen pro SuperUser.",
      confirmLabel: "Změnit",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await updateMyDateOfBirthSuperUser(dobDraft);
      if (res.errorMessage) throw new Error(res.errorMessage);

      await loadProfile();
      window.dispatchEvent(new Event("aw-profile-updated"));
      await awAlert("Datum narození upraveno.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Změna data narození se nepodařila.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-600">Načítám profil...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-700">Profil není dostupný.</div>
        </div>
      </div>
    );
  }

  const dobFromDb = profile.dateOfBirth;
  const avatarPreviewUrl = addCacheBust(avatarUrl, avatarBust);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <ProfileHero
        title="Profilová karta"
        description="Tady ladíš první dojem: fotku, jméno a krátký text, který uvidí ostatní v profilu i v navigaci."
        actions={
          isSuperUser ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">SuperUser</span>
          ) : null
        }
      />

      <ProfileSectionCard
        title="Základní údaje"
        description="Veřejnou část nech krátkou a čitelnou. Detailnější informace patří do sekce O mně. Datum narození je jen pro informaci a běžný uživatel ho nemůže měnit, protože je navázané na výpočty skutečného věku, AW věku, historické statistiky a vyhodnocení fotek v čase. Kdyby se datum měnilo volně, starší výsledky by mohly přestat dávat smysl."
      >
        <div className="flex items-center gap-4">
          <div ref={avatarMenuRef} className="relative">
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={avatarUploading || saving}
              onChange={(e) => handleAvatarFileSelected(e.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              onClick={() => setAvatarMenuOpen((v) => !v)}
              disabled={avatarUploading || saving}
              className="h-16 w-16 overflow-hidden rounded-full bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              aria-label="Možnosti avatara"
              title="Možnosti avatara"
            >
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Můj avatar"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                  -
                </div>
              )}
            </button>

            {avatarMenuOpen ? (
              <div className="absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-2xl bg-white p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    avatarFileInputRef.current?.click();
                    setAvatarMenuOpen(false);
                  }}
                  disabled={avatarUploading || saving}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {avatarUploading ? "Nahrávám..." : "Nahrát avatar"}
                </button>
                <div className="px-3 pb-2 text-xs text-slate-500">Max. 5 MB, PNG/JPG/WebP.</div>

                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleRemoveAvatar();
                      setAvatarMenuOpen(false);
                    }}
                    disabled={avatarUploading || saving}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Odebrat avatar
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Jméno</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Např. Jana Nováková"
              disabled={saving}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Veřejné bio</span>
            <EmojiTextarea
              value={publicBio}
              onChange={setPublicBio}
              rows={4}
              className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Krátce o sobě..."
              disabled={saving}
              pickerVariant="corner"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Bio pro moji síť</span>
            <EmojiTextarea
              value={networkBio}
              onChange={setNetworkBio}
              rows={4}
              className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Tohle uvidí jen tvoje síť..."
              disabled={saving}
              pickerVariant="corner"
            />
          </label>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-800">Datum narození</div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label>
                <input
                  type="date"
                  value={dobDraft}
                  onChange={(e) => setDobDraft(e.target.value)}
                  className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  disabled={!isSuperUser || saving}
                />
              </label>

              {isSuperUser ? (
                <button
                  type="button"
                  onClick={handleSaveDob}
                  disabled={saving}
                  className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
                >
                  Uložit datum narození
                </button>
              ) : null}
            </div>

          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveBasic}
              disabled={saving || avatarUploading}
              className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
            >
              {saving ? "Ukládám..." : "Uložit profil"}
            </button>
          </div>
        </div>
      </ProfileSectionCard>

      <div>
        <AwInvitesCard />
      </div>
    </div>
  );
}
