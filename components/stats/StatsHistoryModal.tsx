/**
 * File purpose
 * - Show historical daily snapshots for selected profile metrics
 * - Provide month/year views in a modal chart
 * - Reuse stats history rows fetched from the API layer
 *
 * Related APIs, components, or modules
 * - lib/api/stats
 * - app/stats/page.tsx
 */

"use client";

import { useMemo } from "react";
import type { StatsHistoryRow, StatsHistoryView } from "@/lib/api/stats";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";

export type StatsHistoryMetric = "aw_age" | "aw_score_norm_pct" | "avg_accuracy_pct";

type StatsHistoryModalProps = {
  open: boolean;
  metric: StatsHistoryMetric | null;
  rows: StatsHistoryRow[];
  loading: boolean;
  error: string | null;
  view: StatsHistoryView;
  onClose: () => void;
  onViewChange: (view: StatsHistoryView) => void;
};

type MetricConfig = {
  title: string;
  description: string;
  lineColor: string;
  dotColor: string;
  valueSuffix: string;
  getValue: (row: StatsHistoryRow) => number | null;
  formatValue: (value: number | null) => string;
};

function fmt1(value: number | null, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}${suffix}`;
}

function formatAwScoreForUi(rawAwScoreNormPct: number | null) {
  if (rawAwScoreNormPct == null || !Number.isFinite(rawAwScoreNormPct)) return "—";
  if (rawAwScoreNormPct === 100) return "0.0 %";
  if (rawAwScoreNormPct > 100) return `+${(rawAwScoreNormPct - 100).toFixed(1)} %`;
  return `-${(100 - rawAwScoreNormPct).toFixed(1)} %`;
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

function formatDateLong(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildMetricConfig(metric: StatsHistoryMetric | null): MetricConfig | null {
  if (metric === "aw_age") {
    return {
      title: "Historie AW věku",
      description: "Denní snapshot toho, na kolik let profil působí podle aktuální AW metriky.",
      lineColor: "#16a34a",
      dotColor: "#22c55e",
      valueSuffix: " let",
      getValue: (row) => row.aw_age,
      formatValue: (value) => fmt1(value, " let"),
    };
  }

  if (metric === "aw_score_norm_pct") {
    return {
      title: "Historie AW skóre",
      description: "Denní snapshot AW skóre v procentech relativně k dnešnímu zobrazenému výpočtu.",
      lineColor: "#0f766e",
      dotColor: "#14b8a6",
      valueSuffix: " %",
      getValue: (row) => row.aw_score_norm_pct,
      formatValue: (value) => formatAwScoreForUi(value),
    };
  }

  if (metric === "avg_accuracy_pct") {
    return {
      title: "Historie průměrné přesnosti tipů",
      description: "Denní snapshot průměrné přesnosti tipů ve chvíli, kdy byly statistiky otevřené.",
      lineColor: "#2563eb",
      dotColor: "#3b82f6",
      valueSuffix: " %",
      getValue: (row) => row.avg_accuracy_pct,
      formatValue: (value) => fmt1(value, " %"),
    };
  }

  return null;
}

function buildTicks(min: number, max: number, count = 5): number[] {
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

export default function StatsHistoryModal(props: StatsHistoryModalProps) {
  const { open, metric, rows, loading, error, view, onClose, onViewChange } = props;

  const config = useMemo(() => buildMetricConfig(metric), [metric]);

  const chartRows = useMemo(() => {
    if (!config) return [];
    return rows
      .map((row) => ({
        date: row.snapshot_date,
        value: config.getValue(row),
      }))
      .filter((row) => typeof row.value === "number" && Number.isFinite(row.value));
  }, [config, rows]);

  if (!open || !config) return null;

  const W = 860;
  const H = 360;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 56;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const minY = chartRows.length ? Math.floor(Math.min(...chartRows.map((r) => r.value as number)) - 1) : 0;
  const maxY = chartRows.length ? Math.ceil(Math.max(...chartRows.map((r) => r.value as number)) + 1) : 10;
  const ySpan = Math.max(1, maxY - minY);
  const indexSpan = Math.max(1, chartRows.length - 1);
  const yTicks = buildTicks(minY, maxY, 5);

  const sx = (index: number) => padLeft + (index / indexSpan) * plotW;
  const sy = (value: number) => padTop + plotH - ((value - minY) / ySpan) * plotH;

  const points = chartRows.map((row, index) => ({
    ...row,
    x: sx(index),
    y: sy(row.value as number),
  }));

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const xLabelIndexes =
    chartRows.length <= 4
      ? chartRows.map((_, index) => index)
      : Array.from(new Set([0, Math.floor((chartRows.length - 1) / 2), chartRows.length - 1]));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">{config.title}</div>
            <div className="mt-1 max-w-2xl text-sm text-slate-600">{config.description}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-slate-100 p-1">
              <AwButton variant={view === "1m" ? "primary" : "tertiary"} size="sm" onClick={() => onViewChange("1m")} className="shadow-none no-underline">
                Poslední měsíc
              </AwButton>
              <AwButton variant={view === "1y" ? "primary" : "tertiary"} size="sm" onClick={() => onViewChange("1y")} className="shadow-none no-underline">
                Poslední rok
              </AwButton>
            </div>

            <CloseButton onClick={onClose} label="Zavřít" />
          </div>
        </div>

        {loading ? <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">Načítám historii…</div> : null}
        {error ? <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

        {!loading && !error ? (
          chartRows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
              Zatím nejsou k dispozici denní snapshoty pro vybraný interval.
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={config.title}>
                {yTicks.map((tick) => (
                  <line
                    key={`grid-y-${tick}`}
                    x1={padLeft}
                    y1={sy(tick)}
                    x2={padLeft + plotW}
                    y2={sy(tick)}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                ))}

                <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#94a3b8" />
                <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#94a3b8" />

                {yTicks.map((tick) => (
                  <g key={`tick-${tick}`}>
                    <line x1={padLeft - 6} y1={sy(tick)} x2={padLeft} y2={sy(tick)} stroke="#94a3b8" />
                    <text x={padLeft - 10} y={sy(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                      {fmt1(tick, config.valueSuffix)}
                    </text>
                  </g>
                ))}

                {xLabelIndexes.map((index) => (
                  <g key={`x-label-${index}`}>
                    <line
                      x1={sx(index)}
                      y1={padTop + plotH}
                      x2={sx(index)}
                      y2={padTop + plotH + 6}
                      stroke="#94a3b8"
                    />
                    <text x={sx(index)} y={padTop + plotH + 20} textAnchor="middle" fontSize="11" fill="#64748b">
                      {formatDateShort(chartRows[index]?.date ?? "")}
                    </text>
                  </g>
                ))}

                <polyline fill="none" stroke={config.lineColor} strokeWidth="3" points={polyline} />

                {points.map((point) => (
                  <g key={point.date}>
                    <title>{`${formatDateLong(point.date)} • ${config.formatValue(point.value)}`}</title>
                    <circle cx={point.x} cy={point.y} r={4} fill={config.dotColor} />
                  </g>
                ))}
              </svg>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="První bod" value={`${formatDateLong(chartRows[0]?.date ?? "")} • ${config.formatValue(chartRows[0]?.value ?? null)}`} />
                <MiniStat
                  label="Poslední bod"
                  value={`${formatDateLong(chartRows[chartRows.length - 1]?.date ?? "")} • ${config.formatValue(
                    chartRows[chartRows.length - 1]?.value ?? null
                  )}`}
                />
                <MiniStat label="Počet snapshotů" value={String(chartRows.length)} />
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
