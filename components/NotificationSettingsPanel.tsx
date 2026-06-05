/**
 * File purpose
 * - Render reusable notification preference controls.
 * Main responsibilities
 * - Load current notification toggles and save user changes.
 * Related APIs, components, or modules
 * - lib/api/userProfiles
 * - app/notifications/settings/page.tsx
 * - app/notifications/page.tsx
 */

"use client";

import { useEffect, useState } from "react";
import { awAlert } from "@/components/AwDialog";
import { getMyProfile, updateMyPrivacySettings } from "@/lib/api/userProfiles";

type NotificationToggleKey =
  | "notifyConnectionRequests"
  | "notifyConnectionDeclined"
  | "notifyContactRemoved"
  | "notifyFollowStarted"
  | "notifyFollowStopped"
  | "notifyPhotoCommented";

const TOGGLES: Array<{ key: NotificationToggleKey; label: string; hint: string }> = [
  { key: "notifyConnectionRequests", label: "Žádosti o spojení", hint: "Když ti někdo pošle novou žádost o spojení." },
  { key: "notifyConnectionDeclined", label: "Zamítnuté žádosti", hint: "Když někdo zamítne tvoji žádost o spojení." },
  { key: "notifyContactRemoved", label: "Odebrání ze spojení", hint: "Když tě někdo odstraní ze svých kontaktů." },
  { key: "notifyFollowStarted", label: "Nové sledování", hint: "Když tě někdo začne sledovat." },
  { key: "notifyFollowStopped", label: "Ukončené sledování", hint: "Když tě někdo přestane sledovat." },
  { key: "notifyPhotoCommented", label: "Komentáře a odpovědi u fotky", hint: "Když někdo okomentuje tvoji fotku nebo odpoví na komentář u fotky." },
];

const DEFAULT_VALUES: Record<NotificationToggleKey, boolean> = {
  notifyConnectionRequests: true,
  notifyConnectionDeclined: true,
  notifyContactRemoved: true,
  notifyFollowStarted: true,
  notifyFollowStopped: true,
  notifyPhotoCommented: true,
};

export default function NotificationSettingsPanel(props: { onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<NotificationToggleKey, boolean>>(DEFAULT_VALUES);

  async function reload() {
    setLoading(true);
    try {
      const profile = await getMyProfile();
      const data = profile.data;
      if (!data) throw new Error(profile.errorMessage ?? "Nastavení upozornění se nepodařilo načíst.");

      setValues({
        notifyConnectionRequests: Boolean(data.notifyConnectionRequests ?? true),
        notifyConnectionDeclined: Boolean(data.notifyConnectionDeclined ?? true),
        notifyContactRemoved: Boolean(data.notifyContactRemoved ?? true),
        notifyFollowStarted: Boolean(data.notifyFollowStarted ?? true),
        notifyFollowStopped: Boolean(data.notifyFollowStopped ?? true),
        notifyPhotoCommented: Boolean(data.notifyPhotoCommented ?? true),
      });
    } catch (e: unknown) {
      await awAlert(e instanceof Error ? e.message : "Nastavení upozornění se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateMyPrivacySettings(values);
      if (result.errorMessage) throw new Error(result.errorMessage);
      await awAlert("Nastavení upozornění uloženo.");
      props.onSaved?.();
    } catch (e: unknown) {
      await awAlert(e instanceof Error ? e.message : "Nastavení upozornění se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="text-sm text-slate-600">
        Vyber si, které události ti mají chodit do interních upozornění. Výchozí stav je zapnutý pro všechny.
      </p>

      <div className="mt-5 space-y-3">
        {TOGGLES.map((toggle) => (
          <label key={toggle.key} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={values[toggle.key]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [toggle.key]: e.target.checked,
                }))
              }
              disabled={loading || saving}
              className="mt-1 h-4 w-4 accent-emerald-600"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">{toggle.label}</div>
              <div className="mt-1 text-xs text-slate-600">{toggle.hint}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
        >
          {saving ? "Ukládám..." : "Uložit"}
        </button>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading || saving}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Obnovit
        </button>
      </div>
    </>
  );
}

