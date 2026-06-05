/**
 * components/BasicProfileSection.tsx
 *
 * Purpose:
 * - Basic profile view/edit UX using EditableField
 * - Loads profile via getMyProfile() (ApiResult) and saves via updateMyBasicProfile()
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import EditableField from "./EditableField";
import ProfilePhotoField from "./ProfilePhotoField";
import AwButton from "@/components/AwButton";
import { getMyProfile, updateMyBasicProfile } from "@/lib/api/userProfiles";
import type { MyProfile } from "@/lib/api/userProfiles";

type EditingState = {
  display_name: boolean;
  bio: boolean;
};

function unwrapOrThrow<T>(res: { data: T | null; errorMessage: string | null }): T {
  if (res.errorMessage) throw new Error(res.errorMessage);
  if (res.data === null || res.data === undefined) throw new Error("Neočekávaná prázdná odpověď serveru.");
  return res.data;
}

export default function BasicProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<MyProfile | null>(null);

  const [displayNameEdit, setDisplayNameEdit] = useState("");
  const [bioEdit, setBioEdit] = useState("");

  const [editing, setEditing] = useState<EditingState>({
    display_name: false,
    bio: false,
  });

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await getMyProfile();
      const p = unwrapOrThrow(res);

      setProfile(p);
      setDisplayNameEdit(p.displayName ?? "");
      setBioEdit(p.bio ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Profil se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hasAnyEditing = useMemo(() => Object.values(editing).some(Boolean), [editing]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const patch: Record<string, any> = {};
      if (editing.display_name) patch.displayName = displayNameEdit.trim();
      if (editing.bio) patch.bio = bioEdit.trim();

      if (Object.keys(patch).length === 0) {
        setSuccess("Není co ukládat 🙂");
        return;
      }

      const res = await updateMyBasicProfile(patch);
      if (res.errorMessage) throw new Error(res.errorMessage);

      setEditing({ display_name: false, bio: false });
      await load();
      setSuccess("Změny uloženy ✅");
    } catch (e: any) {
      setError(e?.message ?? "Nepodařilo se uložit změny.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Základní profil</h1>
        <p className="mt-1 text-slate-600">
          Nastav si jméno, bio a profilovou fotku. Fotku nahraješ jako soubor (ne URL).
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</div>
        )}
        {success && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
            {success}
          </div>
        )}

        <div className="mt-5 grid gap-4">
          <ProfilePhotoField
            currentUrl={profile?.avatarUrl ?? null}
            onUploaded={(newUrl) => {
              setProfile((p) => (p ? { ...p, avatarUrl: newUrl } : p));
              setSuccess("Profilová fotka uložena ✅");
            }}
            onRemoved={() => {
              setProfile((p) => (p ? { ...p, avatarUrl: null } : p));
              setSuccess("Profilová fotka odebrána ✅");
            }}
          />

          <EditableField
            label="Zobrazované jméno"
            value={profile?.displayName}
            isEditing={editing.display_name}
            onStartEdit={() => setEditing((s) => ({ ...s, display_name: true }))}
            onCancelEdit={() => {
              setEditing((s) => ({ ...s, display_name: false }));
              setDisplayNameEdit(profile?.displayName ?? "");
            }}
            editValue={displayNameEdit}
            onChangeEditValue={setDisplayNameEdit}
            placeholder="Např. Petra, Martin, …"
          />

          <EditableField
            label="Bio"
            value={profile?.bio}
            isEditing={editing.bio}
            onStartEdit={() => setEditing((s) => ({ ...s, bio: true }))}
            onCancelEdit={() => {
              setEditing((s) => ({ ...s, bio: false }));
              setBioEdit(profile?.bio ?? "");
            }}
            editValue={bioEdit}
            onChangeEditValue={setBioEdit}
            placeholder="Napiš krátce, co tě baví…"
            multiline
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {hasAnyEditing ? "Máš rozpracované úpravy." : "Žádné úpravy nejsou aktivní."}
          </div>

          <AwButton variant="primary" onClick={handleSave} disabled={saving} className="px-5">
            {saving ? "Ukládám…" : "Uložit změny"}
          </AwButton>
        </div>
      </div>
    </div>
  );
}

