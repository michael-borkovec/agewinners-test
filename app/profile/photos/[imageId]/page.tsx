/**
 * File: app/profile/photos/[imageId]/page.tsx
 * Description:
 *   Statistiky fotky:
 *   - real_age_years (images)
 *   - avg_guessed_age = prostý průměr tipů (informativní)
 *   - aw_age_image = AW výsledek (deltaNorm váženě přes weight_at_guess)
 *   - graf tipů v čase + seznam tipů (včetně weight_at_guess snapshot)
 *
 * Fix (chart UX):
 * - Zelené body v grafu jsou opět klikatelné
 * - Tooltip na hover ukazuje datum + tipnutý věk
 * - Klik na bod zvýrazní odpovídající tip v seznamu a odscrolluje k němu
 */

"use client";

import Link from "next/link";
import React from "react";
import { useParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const MIN_AGE = 16;
const MAX_AGE = 116;

function fmt1(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

function fmtDateCZ(iso: string) {
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

function maxErr(realAge: number) {
  return Math.max(realAge - MIN_AGE, MAX_AGE - realAge);
}

/**
 * AW score (deltaNorm) in percent:
 * aw_score_norm_pct = ((aw_age_image - real) / maxErr(real)) * 100
 */
function computeAwScoreNormPct(realAge: number, awAgeImage: number | null): number | null {
  if (!Number.isFinite(realAge) || realAge <= 0) return null;
  if (awAgeImage == null || !Number.isFinite(awAgeImage)) return null;
  const me = maxErr(realAge);
  if (!Number.isFinite(me) || me <= 0) return null;
  return ((awAgeImage - realAge) / me) * 100;
}

function ScoreBoxForPhoto({ awScoreNormPct }: { awScoreNormPct: number | null }) {
  if (awScoreNormPct == null || !Number.isFinite(awScoreNormPct)) {
    return (
      <div className="rounded-2xl bg-gray-50 p-4 text-gray-900">
        <p className="text-sm font-semibold">AW skóre zatím není k dispozici (potřebujeme více tipů).</p>
      </div>
    );
  }

  const abs = Math.abs(awScoreNormPct);

  if (abs < 0.0001) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
        <p className="text-sm font-semibold">Skvělé, AW skóre je prakticky 0 % (tipují tě velmi přesně).</p>
      </div>
    );
  }

  if (awScoreNormPct > 0) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
        <p className="text-sm font-semibold">
          AW skóre této fotky je <span className="font-bold tabular-nums">{abs.toFixed(1)} %</span> nad tvým skutečným
          věkem (AW výsledek tě posouvá ke staršímu dojmu).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
      <p className="text-sm font-semibold">
        Gratuluji, AW skóre této fotky je <span className="font-bold tabular-nums">{abs.toFixed(1)} %</span> pod tvým
        skutečným věkem (AW výsledek tě posouvá k mladšímu dojmu).
      </p>
    </div>
  );
}

type ImageRow = {
  id: number;
  public_url: string | null;
  real_age_years: number;
  avg_guessed_age: number | null; // informational (unweighted)
  aw_age_image: number | null; // AW result (deltaNorm weighted)
  guesses_count: number;
};

type GuessListRow = {
  id: number;
  created_at: string;
  guessed_age: number;
  is_anonymous: boolean;
  guesser_user_id: string | null;
  guesser_name: string;
  weight_at_guess: number; // snapshot
};

type TimelinePoint = {
  id: number; // guess id
  createdAt: string;
  guessedAge: number;
};

/**
 * Simple inline SVG chart:
 * - green clickable dots
 * - tooltip via <title>
 * - click selects point
 */
function GuessTimelineChartInline({
  points,
  selectedId,
  onSelect,
}: {
  points: TimelinePoint[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (!points.length) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Graf tipů v čase</div>
        <div className="mt-2 text-sm text-gray-600">Zatím žádné tipy.</div>
      </div>
    );
  }

  const W = 920; // virtual width (scaled via viewBox)
  const H = 220;
  const P = 28;

  const ages = points.map((p) => p.guessedAge).filter((n) => Number.isFinite(n));
  const minA = Math.min(...ages);
  const maxA = Math.max(...ages);

  // add padding so chart is not flat
  const yMin = Math.floor(minA - 5);
  const yMax = Math.ceil(maxA + 5);

  const xCount = points.length;
  const xStep = xCount <= 1 ? 0 : (W - P * 2) / (xCount - 1);

  const yToSvg = (age: number) => {
    if (yMax === yMin) return H / 2;
    const t = (age - yMin) / (yMax - yMin); // 0..1
    return H - P - t * (H - P * 2);
  };

  const xToSvg = (i: number) => P + i * xStep;

  // Path connecting points (subtle)
  const pathD = points
    .map((p, i) => {
      const x = xToSvg(i);
      const y = yToSvg(p.guessedAge);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Graf tipů v čase</div>
        <div className="text-xs text-gray-500">{points.length} bodů</div>
      </div>

      <div className="mt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[220px] w-full min-w-[620px]"
          role="img"
          aria-label="Graf tipů v čase"
        >
          {/* background */}
          <rect x="0" y="0" width={W} height={H} fill="#ffffff" />

          {/* y-axis labels (min/max) */}
          <text x={P} y={P - 8} fontSize="11" fill="#6b7280">
            {yMax}
          </text>
          <text x={P} y={H - 8} fontSize="11" fill="#6b7280">
            {yMin}
          </text>

          {/* connecting line */}
          <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />

          {/* points */}
          {points.map((p, i) => {
            const x = xToSvg(i);
            const y = yToSvg(p.guessedAge);
            const isSel = selectedId === p.id;

            return (
              <g
                key={p.id}
                onClick={() => onSelect(p.id)}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(p.id);
                }}
              >
                <title>
                  {`${fmtDateCZ(p.createdAt)} • tip: ${p.guessedAge} let`}
                </title>

                {/* hit area */}
                <circle cx={x} cy={y} r={10} fill="transparent" />

                {/* dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSel ? 6 : 4}
                  fill={isSel ? "#16a34a" : "#22c55e"}
                  stroke={isSel ? "#065f46" : "#047857"}
                  strokeWidth={isSel ? 2 : 1}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 text-[11px] text-gray-600">
        Tip: Najetím myší uvidíš tooltip. Kliknutím zvýrazníš tip v seznamu níže.
      </div>
    </div>
  );
}

export default function PhotoStatsPage() {
  const params = useParams<{ imageId: string }>();
  const imageId = Number(params?.imageId);

  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [image, setImage] = React.useState<ImageRow | null>(null);
  const [timeline, setTimeline] = React.useState<TimelinePoint[]>([]);
  const [guesses, setGuesses] = React.useState<GuessListRow[]>([]);

  // selected guess for highlight + scroll
  const [selectedGuessId, setSelectedGuessId] = React.useState<number | null>(null);

  // session
  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // load data
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(imageId)) {
        setError("Neplatné ID fotky.");
        setLoading(false);
        return;
      }
      if (!session?.user?.id) {
        setError("Pro detail fotky se prosím přihlas.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1) image
      const { data: img, error: imgErr } = await supabase
        .from("images")
        .select("id, public_url, real_age_years, avg_guessed_age, aw_age_image, guesses_count")
        .eq("id", imageId)
        .single();

      if (cancelled) return;

      if (imgErr || !img) {
        setError(imgErr?.message ?? "Fotka nenalezena nebo nemáš přístup.");
        setImage(null);
        setTimeline([]);
        setGuesses([]);
        setLoading(false);
        return;
      }

      setImage({
        id: Number(img.id),
        public_url: img.public_url ?? null,
        real_age_years: Number(img.real_age_years ?? 0),
        avg_guessed_age: typeof img.avg_guessed_age === "number" ? img.avg_guessed_age : null,
        aw_age_image: typeof img.aw_age_image === "number" ? img.aw_age_image : null,
        guesses_count: Number(img.guesses_count ?? 0),
      });

      // 2) guesses list + timeline
      const { data: g, error: gErr } = await supabase
        .from("age_guesses")
        .select("id, guessed_age, created_at, is_anonymous, guesser_user_id, weight_at_guess")
        .eq("image_id", imageId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (cancelled) return;

      if (gErr) {
        setError(gErr.message ?? "Nepodařilo se načíst tipy.");
        setTimeline([]);
        setGuesses([]);
        setLoading(false);
        return;
      }

      const raw: GuessListRow[] = (g ?? [])
        .map((x: any) => {
          const isAnon = Boolean(x.is_anonymous);
          const w = Number(x.weight_at_guess);
          return {
            id: Number(x.id),
            created_at: String(x.created_at),
            guessed_age: Number(x.guessed_age),
            is_anonymous: isAnon,
            guesser_user_id: x.guesser_user_id ? String(x.guesser_user_id) : null,
            guesser_name: isAnon ? "Anonym" : "Uživatel",
            weight_at_guess: Number.isFinite(w) ? w : 0.8,
          };
        })
        .filter((x) => Number.isFinite(x.guessed_age) && x.created_at);

      // Resolve names for non-anonymous guesses
      const publicUserIds = Array.from(
        new Set(raw.filter((x) => !x.is_anonymous && x.guesser_user_id).map((x) => x.guesser_user_id as string))
      );

      if (publicUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, display_name")
          .in("user_id", publicUserIds);

        const nameById = new Map<string, string>();
        (profiles ?? []).forEach((p: any) => {
          const id = p.user_id ? String(p.user_id) : "";
          const nm = p.display_name ? String(p.display_name) : "";
          if (id) nameById.set(id, nm || "Uživatel");
        });

        for (const item of raw) {
          if (!item.is_anonymous && item.guesser_user_id) {
            item.guesser_name = nameById.get(item.guesser_user_id) ?? "Uživatel";
          }
        }
      }

      // timeline chronological (include id for click->highlight)
      const pts: TimelinePoint[] = [...raw]
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((x) => ({ id: x.id, guessedAge: x.guessed_age, createdAt: x.created_at }));

      setGuesses(raw); // newest -> oldest
      setTimeline(pts);

      // reset selection after reload
      setSelectedGuessId(null);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [imageId, session?.user?.id]);

  const realAge = image?.real_age_years ?? 0;
  const avgGuessed = image?.avg_guessed_age ?? null;
  const awAgeImage = image?.aw_age_image ?? null;

  const awScoreNormPct = React.useMemo(() => computeAwScoreNormPct(realAge, awAgeImage), [realAge, awAgeImage]);

  function handleSelectPoint(guessId: number) {
    setSelectedGuessId(guessId);

    // Scroll to the row in the list
    requestAnimationFrame(() => {
      const el = document.getElementById(`guess-row-${guessId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vývoj fotky</h1>
          <p className="mt-1 text-sm text-gray-600">Co lidé tipují vs. AW výsledek (deltaNorm váženě).</p>
        </div>

        <Link
          href="/profile/photos"
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Zpět
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ) : !image ? null : (
        <>
          {/* Image preview */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex max-h-[560px] items-center justify-center bg-gray-50">
              {image.public_url ? (
                <img
                  src={image.public_url}
                  alt="Fotka"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-6 text-sm text-gray-500">Bez náhledu</div>
              )}
            </div>
          </div>

          {/* TOP summary */}
          <div className="space-y-3">
            <p className="text-lg font-semibold text-gray-900">
              Tvůj skutečný věk na této fotce je{" "}
              <span className="text-2xl font-bold tabular-nums">{realAge}</span> let
            </p>

            <p className="text-lg font-semibold text-gray-900">
              Ostatní si myslí (prostý průměr), že na ní máš{" "}
              <span className="text-2xl font-bold tabular-nums">{avgGuessed == null ? "—" : fmt1(avgGuessed)}</span> let
            </p>

            <p className="text-lg font-semibold text-gray-900">
              AW věk této fotky (váženě + deltaNorm) je{" "}
              <span className="text-2xl font-bold tabular-nums">{awAgeImage == null ? "—" : fmt1(awAgeImage)}</span> let
            </p>

            <ScoreBoxForPhoto awScoreNormPct={awScoreNormPct} />

            <div className="text-xs text-gray-600">
              Tipů na této fotce: <span className="font-semibold tabular-nums">{image.guesses_count}</span>
            </div>
          </div>

          {/* Timeline chart (inline SVG, clickable + tooltip) */}
          <GuessTimelineChartInline points={timeline} selectedId={selectedGuessId} onSelect={handleSelectPoint} />

          {/* Count + list */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">Tipy (nejnovější první)</div>
              <div className="text-xs text-gray-500">{guesses.length} tipů</div>
            </div>

            {guesses.length === 0 ? (
              <div className="text-sm text-gray-600">Zatím žádné tipy.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {guesses.map((g) => {
                  const selected = selectedGuessId === g.id;
                  return (
                    <div
                      key={g.id}
                      id={`guess-row-${g.id}`}
                      className={[
                        "flex items-center justify-between gap-3 py-2",
                        selected ? "rounded-xl bg-emerald-50 px-2" : "",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900">
                          <span className="font-semibold">{fmtDateCZ(g.created_at)}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="font-semibold">{g.guesser_name}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-700">tip:</span>{" "}
                          <span className="font-semibold tabular-nums">{g.guessed_age}</span>
                        </div>
                        <div className="text-xs text-gray-500">{g.is_anonymous ? "Anonymní tip" : "Veřejný tip"}</div>
                      </div>

                      <div className="shrink-0 text-xs">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                          váha: <span className="font-semibold tabular-nums">{g.weight_at_guess.toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 text-[11px] text-gray-600">
              Váha je snapshot při vložení tipu (<code>weight_at_guess</code>) a nemění se zpětně.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

