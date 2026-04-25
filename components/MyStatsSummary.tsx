/**
 * File purpose
 * - Sidebar summary of the user's current AW status
 * - Show one short sentence about how the user currently looks by AW
 * - Link to the detailed statistics page
 *
 * Related APIs, components, or modules
 * - lib/api/stats
 * - components/LeftSidebar.tsx
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getMyAwAgeCurrentSafe,
  getMyPowerScoreSafe,
  getMyStatsSafe,
  type MyAwAgeCurrent,
  type MyStats,
  type PowerScore,
} from "@/lib/api/stats";

function buildAwSummary(rawAwScoreNormPct: number | null | undefined, awAge: number | null | undefined) {
  if (rawAwScoreNormPct == null || Number.isNaN(Number(rawAwScoreNormPct)) || awAge == null || Number.isNaN(Number(awAge))) {
    return "Tvoje AW statistiky se ještě dopočítávají.";
  }

  const score = Number(rawAwScoreNormPct);
  const aw = Number(awAge);

  if (score === 100) {
    return `Vypadáš přesně na svůj věk! Tvůj AW věk je ${aw.toFixed(1)}.`;
  }

  if (score > 100) {
    return `Vypadáš o ${(score - 100).toFixed(1)} % starší! Tvůj AW věk je ${aw.toFixed(1)}.`;
  }

  return `Vypadáš o ${(100 - score).toFixed(1)} % mladší! Tvůj AW věk je ${aw.toFixed(1)}.`;
}

function formatAwScoreForUi(rawAwScoreNormPct: number | null | undefined) {
  if (rawAwScoreNormPct == null || !Number.isFinite(Number(rawAwScoreNormPct))) return "—";
  const score = Number(rawAwScoreNormPct);
  if (score === 100) return "0.0 %";
  if (score > 100) return `+${(score - 100).toFixed(1)} %`;
  return `-${(100 - score).toFixed(1)} %`;
}

export default function MyStatsSummary() {
  const pathname = usePathname();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [awCurrent, setAwCurrent] = useState<MyAwAgeCurrent | null>(null);
  const [powerScore, setPowerScore] = useState<PowerScore | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [awErr, setAwErr] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [statsRes, awRes, powerRes] = await Promise.all([getMyStatsSafe(), getMyAwAgeCurrentSafe(), getMyPowerScoreSafe()]);

      if (cancelled) return;

      if (statsRes.errorMessage) {
        setStats(null);
        setErr(statsRes.errorMessage);
      } else {
        setStats(statsRes.data);
        setErr(null);
      }

      if (awRes.errorMessage) {
        setAwCurrent(null);
        setAwErr(awRes.errorMessage);
      } else {
        setAwCurrent(awRes.data);
        setAwErr(null);
      }

      setPowerScore(powerRes.data ?? null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const summaryAwAge = useMemo(() => {
    if (typeof awCurrent?.aw_age === "number" && Number.isFinite(awCurrent.aw_age)) {
      return awCurrent.aw_age;
    }
    if (typeof stats?.awAgeUser === "number" && Number.isFinite(stats.awAgeUser)) {
      return stats.awAgeUser;
    }
    return null;
  }, [awCurrent?.aw_age, stats?.awAgeUser]);

  const summaryText = useMemo(
    () => buildAwSummary(stats?.awScoreNormPct ?? null, summaryAwAge),
    [summaryAwAge, stats?.awScoreNormPct]
  );
  const isStatsPage = Boolean(pathname?.startsWith("/stats"));
  const showDetails = isStatsPage || detailsOpen;
  const realAge = typeof awCurrent?.real_age === "number" && Number.isFinite(awCurrent.real_age) ? awCurrent.real_age : null;
  const avgAccuracyPct =
    typeof stats?.avgAccuracyPct === "number" && Number.isFinite(stats.avgAccuracyPct) ? stats.avgAccuracyPct : null;
  const powerScoreValue =
    typeof powerScore?.p_score === "number" && Number.isFinite(powerScore.p_score) ? powerScore.p_score : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {err ? <div className="text-sm text-rose-700">{err}</div> : null}
      <div className="space-y-4 text-sm text-slate-700">
        {stats ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-950">
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold transition hover:bg-emerald-100/60 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              aria-expanded={showDetails}
            >
              {summaryText}
            </button>
            {awErr ? <div className="mt-1 text-xs font-medium text-rose-700">RPC chyba: {awErr}</div> : null}
            {showDetails ? (
              <div className="border-t border-emerald-100 px-3 py-3">
                <div className="grid gap-2">
                  <SummaryDetailLink
                    href="/stats?section=aw-age"
                    label="AW věk"
                    value={summaryAwAge !== null ? `${summaryAwAge.toFixed(1)} let` : "—"}
                  />
                  <SummaryDetailRow label="Věk" value={realAge !== null ? `${realAge.toFixed(1)} let` : "—"} />
                  <SummaryDetailLink
                    href="/stats?section=aw-score"
                    label="AW skóre"
                    value={formatAwScoreForUi(stats.awScoreNormPct)}
                  />
                  <SummaryDetailRow label="Power skóre" value={powerScoreValue !== null ? powerScoreValue.toFixed(1) : "—"} />
                  <SummaryDetailLink
                    href="/stats?section=my-tips"
                    label="Přesnost tipů"
                    value={avgAccuracyPct !== null ? `${avgAccuracyPct.toFixed(1)} %` : "—"}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : !err ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">Načítám AW souhrn…</div>
        ) : null}

        <Link
          href="/stats"
          title="Moje statistiky"
          aria-label="Moje statistiky"
          className={[
            "flex items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-center transition focus:outline-none focus:ring-2 focus:ring-slate-300 md:flex-col",
            isStatsPage ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-gray-200 bg-white text-slate-900 hover:bg-gray-50",
          ].join(" ")}
        >
          <img src="/ui/Statistiky.ico" alt="" className="h-10 w-10 shrink-0" />
          <div className="text-sm font-semibold">Moje statistiky</div>
        </Link>

      </div>
    </div>
  );
}

function SummaryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
      <span className="text-xs font-semibold text-emerald-900">{label}</span>
      <span className="text-xs font-bold text-slate-950">{value}</span>
    </div>
  );
}

function SummaryDetailLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 transition hover:bg-white">
      <span className="text-xs font-semibold text-emerald-900">{label}</span>
      <span className="text-xs font-bold text-slate-950">{value}</span>
    </Link>
  );
}
