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
  getMyStatsProgress30dSafe,
  getMyStatsSafe,
  type MyAwAgeCurrent,
  type MyStatsProgress30d,
  type MyStats,
  type PowerScore,
} from "@/lib/api/stats";

function buildAwSummary(rawAwScoreNormPct: number | null | undefined, awAge: number | null | undefined) {
  if (rawAwScoreNormPct == null || Number.isNaN(Number(rawAwScoreNormPct)) || awAge == null || Number.isNaN(Number(awAge))) {
    return "Tvůj AW vývoj se ještě dopočítává.";
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
  const [progress30d, setProgress30d] = useState<MyStatsProgress30d | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [awErr, setAwErr] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [statsRes, awRes, powerRes, progressRes] = await Promise.all([
        getMyStatsSafe(),
        getMyAwAgeCurrentSafe(),
        getMyPowerScoreSafe(),
        getMyStatsProgress30dSafe(),
      ]);

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
      setProgress30d(progressRes.data ?? null);
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
  const showDetails = detailsOpen;
  const realAge = typeof awCurrent?.real_age === "number" && Number.isFinite(awCurrent.real_age) ? awCurrent.real_age : null;
  const avgAccuracyPct =
    typeof stats?.avgAccuracyPct === "number" && Number.isFinite(stats.avgAccuracyPct) ? stats.avgAccuracyPct : null;
  const powerScoreValue =
    typeof powerScore?.p_score === "number" && Number.isFinite(powerScore.p_score) ? powerScore.p_score : null;

  return (
    <div>
      {err ? <div className="text-sm text-rose-700">{err}</div> : null}
      <div className="space-y-4 text-sm text-slate-700">
        {stats ? (
          <div className="rounded-2xl bg-gradient-to-br from-[#effdef] via-white to-white text-emerald-950 shadow-[0_10px_28px_rgba(50,205,50,0.14)]">
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-[#effdef]/80 focus:outline-none focus:ring-2 focus:ring-[#98f398]"
              aria-expanded={showDetails}
            >
              <span>{summaryText}</span>
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#32CD32] text-white shadow-sm transition ${
                  showDetails ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {awErr ? <div className="mt-1 text-xs font-medium text-rose-700">RPC chyba: {awErr}</div> : null}
            {showDetails ? (
              <div className="space-y-3 px-3 py-3">
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
                  <SummaryDetailLink
                    href="/stats?section=power-score"
                    label="Power skóre"
                    value={powerScoreValue !== null ? powerScoreValue.toFixed(1) : "—"}
                  />
                  <SummaryDetailLink
                    href="/stats?section=my-tips"
                    label="Přesnost tipů"
                    value={avgAccuracyPct !== null ? `${avgAccuracyPct.toFixed(1)} %` : "—"}
                  />
                </div>
                <AwProgressMiniCard progress={progress30d} />
                <Link
                  href="/stats"
                  title="Můj vývoj"
                  aria-label="Můj vývoj"
                  className="flex items-center justify-center gap-3 rounded-2xl bg-white px-3 py-3 text-center text-slate-900 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-300 md:flex-col"
                >
                  <img src="/icons/nav/stats.svg" alt="" className="h-10 w-10 shrink-0" />
                  <div className="text-sm font-semibold">Můj vývoj</div>
                </Link>
              </div>
            ) : null}
          </div>
        ) : !err ? (
          <div className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">Načítám AW souhrn…</div>
        ) : null}

      </div>
    </div>
  );
}

function formatSignedDelta(value: number | null, decimals: number, suffix = "") {
  if (value === null) return null;
  if (Math.abs(value) < 0.05) return "beze změny";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}${suffix}`;
}

function progressTone(value: number | null) {
  return value !== null && value > 0 ? "text-emerald-700" : "text-slate-900";
}

function AwProgressMiniCard({ progress }: { progress: MyStatsProgress30d | null }) {
  if (!progress) return null;

  const items = [
    {
      label: "AW věk",
      value: formatSignedDelta(progress.awAgeDelta30d, 1, " roku"),
      tone: progressTone(null),
    },
    {
      label: "Power skóre",
      value: formatSignedDelta(progress.powerDelta30d, 0),
      tone: progressTone(progress.powerDelta30d),
    },
    {
      label: "Přesnost",
      value: formatSignedDelta(progress.accuracyDelta30d, 1, " %"),
      tone: progressTone(progress.accuracyDelta30d),
    },
    {
      label: "Hlasy",
      value: progress.receivedVotes30d !== null ? String(progress.receivedVotes30d) : null,
      tone: progress.receivedVotes30d && progress.receivedVotes30d > 0 ? "text-emerald-700" : "text-slate-900",
    },
  ].filter((item) => item.value !== null);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl bg-white/80 px-3 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-bold text-emerald-950">Posledních 30 dní</div>
        {!progress.hasHistoryComparison ? <div className="text-[11px] font-semibold text-slate-500">Zatím málo dat</div> : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-[#effdef] px-2.5 py-2">
            <div className="text-[11px] font-semibold text-emerald-900">{item.label}</div>
            <div className={`mt-0.5 text-sm font-black ${item.tone}`}>{item.value}</div>
          </div>
        ))}
      </div>
      {!progress.hasHistoryComparison ? <div className="mt-2 text-[11px] font-medium text-slate-500">Vývoj se ještě sbírá.</div> : null}
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



