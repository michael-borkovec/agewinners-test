/**
 * File purpose
 * - Render AW age trajectory chart across multiple time windows
 * - Show AW age against continuous real age at each point
 * - Use real age on the X axis instead of calendar dates
 *
 * Related APIs, components, or modules
 * - lib/api/stats
 * - app/stats/page.tsx
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyAwAgeTrajectory, getMyRealVsGuessedRows, type AwAgeTrajectoryRow, type AwAgeTrajectoryView } from "@/lib/api/stats";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";

function buildTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const rawStep = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceStep = magnitude;
  if (normalized >= 5) niceStep = 5 * magnitude;
  else if (normalized >= 2) niceStep = 2 * magnitude;

  const start = Math.ceil(min / niceStep) * niceStep;
  const ticks: number[] = [];

  for (let v = start; v <= max + 0.0001; v += niceStep) {
    ticks.push(Number(v.toFixed(10)));
  }

  if (ticks.length === 0) ticks.push(min, max);
  return Array.from(new Set(ticks));
}

function hasValidAwPoint(row: { aw_age_at_point: number | null; images_used: number }) {
  return typeof row.aw_age_at_point === "number" && Number.isFinite(row.aw_age_at_point) && row.aw_age_at_point > 0 && row.images_used > 0;
}

function expectedGapYears(view: AwAgeTrajectoryView) {
  if (view === "50d") return 4 / 365.25;
  if (view === "1y") return 45 / 365.25;
  return 1.25;
}

function parseDateSafe(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageInYearsDecimal(pointDateIso: string, nowRealAgeRounded: number | null): number | null {
  const pointDate = parseDateSafe(pointDateIso);
  if (!pointDate || typeof nowRealAgeRounded !== "number" || !Number.isFinite(nowRealAgeRounded)) return null;

  const now = new Date();
  const diffMs = now.getTime() - pointDate.getTime();
  const diffYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);

  return nowRealAgeRounded - diffYears;
}

function fmt1(n: number | null | undefined, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

function ageAppearanceText(realAge: number | null | undefined, awAge: number | null | undefined) {
  if (typeof realAge !== "number" || !Number.isFinite(realAge)) return "";
  if (typeof awAge !== "number" || !Number.isFinite(awAge)) return "";

  if (awAge < realAge) return "vypadáš mladší";
  if (awAge > realAge) return "vypadáš starší";
  return "vypadáš přesně na svůj věk";
}

type ChartPointRow = AwAgeTrajectoryRow & {
  real_age_chart: number;
};

function formatPointYear(pointDate: string) {
  const d = parseDateSafe(pointDate);
  if (!d) return pointDate;
  return String(d.getFullYear());
}

function getViewStartDate(view: AwAgeTrajectoryView): Date | null {
  if (view === "life") return null;
  const start = new Date();
  if (view === "50d") start.setDate(start.getDate() - 49);
  if (view === "1y") start.setFullYear(start.getFullYear() - 1);
  if (view === "10y") start.setFullYear(start.getFullYear() - 10);
  return start;
}

export default function AwAgeTrajectoryChart(props: {
  view: AwAgeTrajectoryView;
  tags: string[];
  includeExperimental: boolean;
  refreshKey?: number;
}) {
  const { view, tags, includeExperimental, refreshKey = 0 } = props;
  const router = useRouter();
  const tagKey = tags.join("|");
  const activeTags = useMemo(() => (tagKey ? tagKey.split("|").filter(Boolean) : []), [tagKey]);
  const [rows, setRows] = useState<AwAgeTrajectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ChartPointRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const filtersActive = activeTags.length > 0 || includeExperimental;
        const data = filtersActive
          ? (await getMyRealVsGuessedRows({ tags: activeTags, includeExperimental }))
              .filter((row) => {
                const date = row.taken_at ? new Date(row.taken_at) : null;
                const start = getViewStartDate(view);
                if (!date || Number.isNaN(date.getTime())) return false;
                return !start || date >= start;
              })
              .map((row) => ({
                point_date: String(row.taken_at ?? ""),
                real_age_at_point: typeof row.real_age_years === "number" ? row.real_age_years : Number(row.real_age_years ?? NaN),
                aw_age_at_point:
                  typeof row.aw_age_image === "number"
                    ? row.aw_age_image
                    : row.aw_age_image == null
                      ? Number(row.avg_guessed_age ?? NaN)
                      : Number(row.aw_age_image),
                images_used: 1,
              }))
          : await getMyAwAgeTrajectory(view);
        if (!cancelled) {
          setRows(
            (data ?? [])
              .filter((r) => !!r.point_date)
              .map((r) => ({
                ...r,
                real_age_at_point: Number.isFinite(Number(r.real_age_at_point)) ? Number(r.real_age_at_point) : null,
                aw_age_at_point: Number.isFinite(Number(r.aw_age_at_point)) ? Number(r.aw_age_at_point) : null,
              }))
          );
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Graf se nepodařilo načíst.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [view, activeTags, includeExperimental, refreshKey]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => new Date(a.point_date).getTime() - new Date(b.point_date).getTime());
  }, [rows]);

  const chartRows = useMemo(() => {
    if (sortedRows.length === 0) return [];

    const latestRealAge =
      typeof sortedRows[sortedRows.length - 1]?.real_age_at_point === "number"
        ? sortedRows[sortedRows.length - 1].real_age_at_point
        : null;

    return sortedRows
      .map((r) => {
        const realAgeContinuous = ageInYearsDecimal(r.point_date, latestRealAge);

        return {
          ...r,
          real_age_chart: view === "50d" ? latestRealAge : realAgeContinuous,
        };
      })
      .filter((r): r is ChartPointRow => typeof r.real_age_chart === "number" && Number.isFinite(r.real_age_chart));
  }, [sortedRows, view]);

  if (loading) {
    return <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Nacítám graf…</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  const drawableRows = chartRows.filter(hasValidAwPoint);

  if (drawableRows.length === 0) {
    return <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Zatím nejsou data pro graf.</div>;
  }

  const W = 860;
  const H = 430;
  const padLeft = 64;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 62;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const xs = drawableRows.map((r) => r.real_age_chart as number);
  const ys = drawableRows
    .flatMap((r) => [r.real_age_chart, r.aw_age_at_point])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.floor(Math.min(...ys) - 1);
  const maxY = Math.ceil(Math.max(...ys) + 1);
  const xSpan = Math.max(0.1, maxX - minX);
  const ySpan = Math.max(1, maxY - minY);

  const sx = (x: number) => padLeft + ((x - minX) / xSpan) * plotW;
  const sy = (y: number) => padTop + plotH - ((y - minY) / ySpan) * plotH;

  const xTicks = buildTicks(minX, maxX, 6);
  const yTicks = buildTicks(minY, maxY, 6);

  const awSeries = chartRows.map((r) => ({
    x: sx(r.real_age_chart as number),
    y: hasValidAwPoint(r) ? sy(r.aw_age_at_point as number) : null,
    sourceX: r.real_age_chart as number,
  }));

  const awLineSegments = awSeries
    .map((point, index) => ({ point, index }))
    .filter((item) => typeof item.point.y === "number" && Number.isFinite(item.point.y))
    .flatMap((item, validIndex, validItems) => {
      const next = validItems[validIndex + 1];
      if (!next) return [];
      const hiddenRowsBetween = chartRows.slice(item.index + 1, next.index).some((row) => !hasValidAwPoint(row));
      const wideGap = Math.abs(next.point.sourceX - item.point.sourceX) > expectedGapYears(view);
      return [
        {
          x1: item.point.x,
          y1: item.point.y as number,
          x2: next.point.x,
          y2: next.point.y as number,
          dashed: hiddenRowsBetween || wideGap,
        },
      ];
    });
  const hasDashedAwSegments = awLineSegments.some((segment) => segment.dashed);

  const selectedDelta =
    selectedRow && typeof selectedRow.aw_age_at_point === "number"
      ? selectedRow.aw_age_at_point - selectedRow.real_age_chart
      : null;

  function openYearPhotos(row: ChartPointRow) {
    const year = formatPointYear(row.point_date);
    const query = new URLSearchParams({
      view: "photos",
      year,
    });

    if (tags.length > 0) query.set("tags", tags.join(","));
    if (includeExperimental) query.set("experimental", "1");

    router.push(`/my-albums?${query.toString()}`);
  }

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Tvůj AW věk v čase">
        {yTicks.map((t) => (
          <line key={`grid-y-${t}`} x1={padLeft} y1={sy(t)} x2={padLeft + plotW} y2={sy(t)} stroke="#e5e7eb" strokeWidth={1} />
        ))}

        {xTicks.map((t) => {
          const x = sx(t);
          return <line key={`grid-x-${t}`} x1={x} y1={padTop} x2={x} y2={padTop + plotH} stroke="#f1f5f9" strokeWidth={1} />;
        })}

        <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#94a3b8" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#94a3b8" />

        <line
          x1={sx(minX)}
          y1={sy(minX)}
          x2={sx(maxX)}
          y2={sy(maxX)}
          stroke="#111827"
          strokeWidth={1}
          opacity={0.45}
        />

        {yTicks.map((t) => (
          <g key={`y-tick-${t}`}>
            <line x1={padLeft - 6} y1={sy(t)} x2={padLeft} y2={sy(t)} stroke="#94a3b8" />
            <text x={padLeft - 10} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {t}
            </text>
          </g>
        ))}

        {xTicks.map((t) => {
          const x = sx(t);
          return (
            <g key={`x-tick-${t}`}>
              <line x1={x} y1={padTop + plotH} x2={x} y2={padTop + plotH + 6} stroke="#94a3b8" />
              <text x={x} y={padTop + plotH + 20} textAnchor="middle" fontSize="11" fill="#64748b">
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}

        <text x={padLeft + plotW / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="#475569">
          Věk
        </text>

        <text transform={`translate(16 ${padTop + plotH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#475569">
          AW věk
        </text>

        {awLineSegments.map((segment, index) => (
          <line
            key={`aw-line-${index}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeDasharray={segment.dashed ? "7 6" : undefined}
            strokeLinecap="round"
            opacity={segment.dashed ? 0.7 : 1}
          />
        ))}

        {chartRows.map((r) => {
          const x = sx(r.real_age_chart as number);
          const yAw = hasValidAwPoint(r) ? sy(r.aw_age_at_point as number) : null;
          const appearance = ageAppearanceText(r.real_age_chart, r.aw_age_at_point);

          return (
            <g key={r.point_date}>
              <title>
                {`Věk ${fmt1(r.real_age_chart)} • AW ${fmt1(r.aw_age_at_point)} • ${appearance} • fotek v okně ${r.images_used}`}
              </title>

              {typeof yAw === "number" ? (
                <circle
                  cx={x}
                  cy={yAw}
                  r={5}
                  fill="#22c55e"
                  className="cursor-pointer"
                  onClick={() => setSelectedRow(r)}
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#111827]" />
          <span>Referenční diagonála</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          <span>AW věk</span>
        </div>
        {hasDashedAwSegments ? (
          <div className="inline-flex items-center gap-2">
            <svg viewBox="0 0 32 8" className="h-2 w-8" aria-hidden="true">
              <line x1="1" y1="4" x2="31" y2="4" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" opacity="0.7" />
            </svg>
            <span>Období bez fotek</span>
          </div>
        ) : null}
      </div>
    {selectedRow ? (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
        onClick={() => setSelectedRow(null)}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-slate-900">Rok {formatPointYear(selectedRow.point_date)}</div>
              <div className="mt-1 text-xs text-slate-500">Detail vývoje AW věku pro vybraný rok.</div>
            </div>
            <CloseButton onClick={() => setSelectedRow(null)} label="Zavřít" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Věk" value={`${fmt1(selectedRow.real_age_chart)} let`} />
            <MiniStat label="AW věk" value={`${fmt1(selectedRow.aw_age_at_point)} let`} />
            <MiniStat
              label="Rozdíl"
              value={
                selectedDelta == null
                  ? "—"
                  : `${selectedDelta > 0 ? "+" : ""}${selectedDelta.toFixed(1)} let`
              }
            />
            <MiniStat label="Počet fotek" value={String(selectedRow.images_used)} />
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {ageAppearanceText(selectedRow.real_age_chart, selectedRow.aw_age_at_point)}
          </div>

          <AwButton variant="primary" onClick={() => openYearPhotos(selectedRow)} className="mt-4 w-full">
            Zobrazit fotografie pro vybraný rok
          </AwButton>
        </div>
      </div>
    ) : null}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

