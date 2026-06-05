/**
 * File purpose
 * - "Můj profil -> Účet a bezpečnost" (/profile/security).
 * Main responsibilities
 * - Show account identity and safety state.
 * - Let the user update password from an authenticated session.
 * - Explain security items that require backend/provider support later.
 * Related APIs, components, or modules
 * - components/auth/AuthContext.tsx
 * - lib/api/auth.ts
 * - app/profile/components/ProfileSurface.tsx
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AwButton from "@/components/AwButton";
import { awAlert, awConfirm } from "@/components/AwDialog";
import { useAuth } from "@/components/auth/AuthContext";
import { ProfileHero, ProfileSectionCard } from "@/app/profile/components/ProfileSurface";
import { signOut, updatePassword } from "@/lib/api/auth";
import { supabase } from "@/lib/supabaseClient";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("cs-CZ");
}

export default function ProfileSecurityPage() {
  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const email = session?.user?.email ?? "—";
  const providers = useMemo(() => {
    const identities = session?.user?.identities ?? [];
    const names = identities.map((identity) => identity.provider).filter(Boolean);
    return Array.from(new Set(names)).join(", ") || "E-mail";
  }, [session?.user?.identities]);

  async function handlePasswordSave() {
    if (password.length < 8) {
      await awAlert("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (password !== passwordAgain) {
      await awAlert("Hesla se neshodují.");
      return;
    }

    const ok = await awConfirm({
      title: "Změnit heslo",
      message: "Po změně hesla doporučujeme znovu se přihlásit na všech zařízeních.",
      confirmLabel: "Změnit heslo",
    });
    if (!ok) return;

    setSavingPassword(true);
    try {
      await updatePassword(password);
      setPassword("");
      setPasswordAgain("");
      await awAlert("Heslo bylo změněno.");
    } catch (e: unknown) {
      await awAlert(e instanceof Error ? e.message : "Heslo se nepodařilo změnit.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOutEverywhere() {
    const ok = await awConfirm({
      title: "Odhlásit relace",
      message: "Odhlásíš aktuální přihlášení. Ostatní relace může Supabase ukončit podle nastavení projektu.",
      confirmLabel: "Odhlásit",
      danger: true,
    });
    if (!ok) return;

    setSigningOut(true);
    try {
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch {
        await signOut();
      }
      window.location.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <ProfileHero
        title="Účet a bezpečnost"
        description="Zkontroluj přihlašovací údaje, změň heslo a projdi doporučení pro bezpečnější účet."
      />

      <ProfileSectionCard title="Změna hesla" description="Použij silné heslo, které nepoužíváš v jiné službě.">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-bold text-slate-900">Nové heslo</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="min. 8 znaků"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-bold text-slate-900">Nové heslo znovu</span>
            <input
              type="password"
              value={passwordAgain}
              onChange={(e) => setPasswordAgain(e.target.value)}
              autoComplete="new-password"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="zopakuj heslo"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <AwButton variant="primary" onClick={handlePasswordSave} disabled={savingPassword}>
              {savingPassword ? "Ukládám..." : "Změnit heslo"}
            </AwButton>
            <Link href="/forgot-password" className="inline-flex min-h-10 items-center rounded-lg bg-[#effdef] px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-[#dcfbdc]">
              Poslat resetovací e-mail
            </Link>
          </div>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Bezpečnostní kontrola" description="První verze přehledu. Některé položky vyžadují doplnění podpory v Supabase Auth.">
        <div className="grid gap-3 sm:grid-cols-2">
          <SecurityItem title="E-mail" status="Aktivní" text={email} tone="good" />
          <SecurityItem title="Přihlášení" status="Aktivní" text={providers} tone="good" />
          <SecurityItem title="Poslední přihlášení" status="Info" text={formatDate(session?.user?.last_sign_in_at)} tone="neutral" />
          <SecurityItem title="Silné heslo" status={password.length >= 8 ? "Rozpracováno" : "Doporučeno"} text="Používej alespoň 8 znaků a unikátní kombinaci." tone="neutral" />
          <SecurityItem title="Dvoufaktorové ověření" status="Připravit" text="2FA zatím není napojené v UI. Doporučený další krok." tone="private" />
          <SecurityItem title="Aktivní zařízení" status="Připravit" text="Přehled zařízení bude potřeba doplnit podle Auth provideru." tone="private" />
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Relace a odhlášení" description="Když máš podezření na cizí přístup, odhlas se a změň heslo.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Odhlásit aktuální relace</div>
            <div className="mt-1 text-sm text-slate-600">Po odhlášení se vrátíš na přihlašovací stránku.</div>
          </div>
          <AwButton variant="secondary" onClick={handleSignOutEverywhere} disabled={signingOut}>
            {signingOut ? "Odhlašuji..." : "Odhlásit"}
          </AwButton>
        </div>
      </ProfileSectionCard>
    </div>
  );
}

function SecurityItem({ title, status, text, tone }: { title: string; status: string; text: string; tone: "good" | "neutral" | "private" }) {
  const badgeClass =
    tone === "good"
      ? "bg-[#effdef] text-emerald-900"
      : tone === "private"
        ? "bg-slate-200 text-slate-700"
        : "bg-white text-slate-700";

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}>{status}</span>
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}
