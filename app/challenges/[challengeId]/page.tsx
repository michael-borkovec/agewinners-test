/**
 * Public or owner-visible AW challenge detail
 * - Shows challenge card from aw_challenges
 * - Uses existing stored AW score values without changing AW calculation
 * - Provides shareable URL target for posts and profile links
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAwChallengeById, type PublicAwChallenge } from "@/lib/api/challenges";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("cs-CZ");
}

function formatAwScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (value === 100) return "0.0 %";
  if (value > 100) return `+${(value - 100).toFixed(1)} %`;
  return `-${(100 - value).toFixed(1)} %`;
}

function visibilityLabel(value: PublicAwChallenge["visibility"]) {
  if (value === "private") return "Soukromá";
  if (value === "contacts") return "Pro kontakty";
  return "Veřejná";
}

export default function ChallengeDetailPage() {
  const params = useParams<{ challengeId?: string }>();
  const challengeId = typeof params?.challengeId === "string" ? params.challengeId : "";
  const [challenge, setChallenge] = useState<PublicAwChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const row = await getAwChallengeById(challengeId);
        if (!cancelled) setChallenge(row);
      } catch (loadError: unknown) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Výzvu se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  const progressText = useMemo(() => {
    if (!challenge) return "—";
    const start = challenge.baseline_aw_score_norm_pct;
    const target = challenge.target_aw_score_norm_pct;
    if (typeof start !== "number" || !Number.isFinite(start)) return "Startovní AW skóre zatím není dostupné.";
    const delta = target - start;
    if (delta === 0) return "Cíl drží stejné AW skóre jako na startu.";
    return `Cílový posun: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} p. b.`;
  }, [challenge]);

  if (loading) {
    return <div className="rounded-2xl bg-white p-5 shadow-sm">Načítám výzvu...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</div>;
  }

  if (!challenge) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-lg font-bold text-slate-900">Výzva není dostupná</div>
        <p className="mt-2 text-sm text-slate-600">Buď neexistuje, nebo k ní nemáš přístup.</p>
      </div>
    );
  }

  const ownerName = challenge.owner?.display_name?.trim() || "Uživatel AgeWinners";
  const showPrivateGoal = challenge.private_goal && challenge.private_goal_visibility === "everyone";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">AW výzva</div>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">{challenge.title}</h1>
        <div className="mt-1 text-sm text-slate-600">{ownerName}</div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <InfoBox label="Start" value={formatAwScore(challenge.baseline_aw_score_norm_pct)} />
          <InfoBox label="Cíl" value={formatAwScore(challenge.target_aw_score_norm_pct)} />
          <InfoBox label="Termín" value={formatDate(challenge.target_date_current)} />
          <InfoBox label="Viditelnost" value={visibilityLabel(challenge.visibility)} />
        </div>

        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">
          {progressText}
        </div>

        {challenge.public_message ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{challenge.public_message}</p>
        ) : null}

        {showPrivateGoal ? (
          <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-900">Zveřejněný osobní cíl:</span> {challenge.private_goal}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {challenge.photo_scope === "challenge_tag" ? `#${challenge.challenge_tag ?? "výzva"}` : "Fotky podle období"}
          </span>
          {challenge.photo_scope === "auto_period" ? (
            <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              Experimentální fotky: {challenge.include_experimental_images ? "ano" : "ne"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm font-bold text-slate-900">Statistika výzvy</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          První verze ukazuje uložený start, cíl a termín. Další krok napojí konečnou hodnotu AW skóre,
          počet zařazených fotek a vývoj po dnech.
        </p>
        <Link href="/stats?section=challenges" className="mt-4 inline-flex rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828]">
          Otevřít vývoj výzev
        </Link>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}


