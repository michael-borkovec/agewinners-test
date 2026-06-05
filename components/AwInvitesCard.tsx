/**
 * AW invite sharing card
 * Main responsibilities
 * - Show the current user's short referral link.
 * - Provide a small editable invitation text with copy actions.
 * Related APIs, components, or modules
 * - lib/api/referrals
 * - app/profile/basic/page.tsx
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HelpIconButton from "@/components/HelpIconButton";
import { buildDefaultInviteText, buildReferralUrl, getMyReferralOverview, type ReferralOverview } from "@/lib/api/referrals";

function formatPower(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export default function AwInvitesCard() {
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [inviteText, setInviteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const referralUrl = useMemo(() => (overview?.slug ? buildReferralUrl(overview.slug) : ""), [overview?.slug]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyReferralOverview();
        if (cancelled) return;
        setOverview(data);
        const url = buildReferralUrl(data.slug);
        setInviteText((prev) => prev || buildDefaultInviteText(url));
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "AW pozvánky se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function copyText(text: string, label: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="rounded-2xl bg-emerald-50/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:flex-1">
          <h2 className="text-base font-bold text-slate-950">AW pozvánky</h2>
          <HelpIconButton
            title="Nápověda: AW pozvánky"
            modalTitle="AW pozvánky"
            helpText="Pozvi známé do AW. Když se zaregistrují, nahrají fotku a dají 10 tipů, získáš na 30 dní bonus do Power skóre."
            className="-mt-2 shrink-0"
            iconClassName="h-4 w-4"
            breadcrumbs={[
              { label: "Můj profil", href: "/profile" },
              { label: "Profilová karta", href: "/profile/basic" },
              { label: "AW pozvánky" },
            ]}
          />
        </div>
        <Link href="/stats?section=aw-invites" className="text-sm font-bold text-emerald-700 hover:underline">
          Přehled pozvánek
        </Link>
      </div>

      {loading ? <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm text-slate-600">Načítám AW odkaz...</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      {!loading && !error && overview ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900">
              <span className="block truncate">{referralUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => copyText(referralUrl, "odkaz")}
              className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-bold text-white hover:bg-[#28b828]"
            >
              Kopírovat odkaz
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aktivní bonus</div>
              <div className="mt-1 text-lg font-black text-slate-950">+{formatPower(overview.activeBonusScore)}</div>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aktivní pozvánky</div>
              <div className="mt-1 text-lg font-black text-slate-950">{overview.activeCount}/10</div>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Použití odkazu</div>
              <div className="mt-1 text-lg font-black text-slate-950">{overview.totalUsedCount}</div>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-900">Text pozvánky</span>
            <textarea
              value={inviteText}
              onChange={(event) => setInviteText(event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => copyText(inviteText, "text")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 hover:bg-slate-800"
              aria-label="Kopírovat text"
              title="Kopírovat text"
            >
              <CopyIcon />
            </button>
            <button
              type="button"
              onClick={() => setInviteText(buildDefaultInviteText(referralUrl))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              aria-label="Obnovit text"
              title="Obnovit text"
            >
              <img src="/icons/action/refresh.png" alt="" className="h-5 w-5 object-contain" />
            </button>
            {copied ? <span className="text-sm font-semibold text-emerald-700">Zkopírováno: {copied}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2.5" fill="#ffffff" />
      <path d="M11 11h5M11 14h4" stroke="#020617" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="#32CD32" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8h8.5A2.5 2.5 0 0 1 19 10.5V19" stroke="#32CD32" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


