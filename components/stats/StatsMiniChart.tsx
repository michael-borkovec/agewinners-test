/**
 * File purpose
 * - Render compact SVG charts for profile statistics
 * - Support line and bar variants without external chart dependencies
 * - Used by /stats section placeholders and first real widgets
 */

"use client";

import HelpIconButton from "@/components/HelpIconButton";
import type { ReactNode } from "react";

export type StatsMiniChartPoint = {
  label: string;
  value: number | null;
  color?: string;
};

type StatsMiniChartProps = {
  title: string;
  description?: string;
  helpText?: string;
  helpKey?: string;
  helpTitle?: string;
  helpBreadcrumbs?: Array<{ label: string; href?: string }>;
  points: StatsMiniChartPoint[];
  loading?: boolean;
  error?: string | null;
  variant?: "line" | "bar";
  color?: string;
  valueLabel?: (value: number | null) => string;
  yDomain?: { min: number; max: number };
  secondaryPoints?: StatsMiniChartPoint[];
  secondaryColor?: string;
  legend?: ReactNode;
  emptyText?: string;
};

function defaultValueLabel(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function buildTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, index) => min + step * index);
}

export default function StatsMiniChart({
  title,
  description,
  helpText,
  helpKey,
  helpTitle,
  helpBreadcrumbs,
  points,
  loading = false,
  error = null,
  variant = "line",
  color = "#10b981",
  valueLabel = defaultValueLabel,
  yDomain,
  secondaryPoints = [],
  secondaryColor = "#bae6fd",
  legend,
  emptyText = "Zatím nejsou k dispozici data pro graf.",
}: StatsMiniChartProps) {
  const chartPoints = points.filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  const secondaryChartPoints = secondaryPoints.filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  const resolvedHelpText = [description, helpText].filter(Boolean).join("\n\n");

  return (
    <div className="rounded-2xl bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        {resolvedHelpText ? (
          <HelpIconButton
            helpText={resolvedHelpText}
            helpKey={helpKey}
            modalTitle={helpTitle ?? `Nápověda - ${title}`}
            breadcrumbs={helpBreadcrumbs}
            className="shrink-0 p-1"
            iconClassName="h-4 w-4"
          />
        ) : null}
      </div>

      {loading ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Načítám graf…</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {!loading && !error ? (
        chartPoints.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">{emptyText}</div>
        ) : (
          <ChartSvg
            points={chartPoints}
            secondaryPoints={secondaryChartPoints}
            variant={variant}
            color={color}
            secondaryColor={secondaryColor}
            valueLabel={valueLabel}
            yDomain={yDomain}
          />
        )
      ) : null}
      {legend ? <div className="mt-3">{legend}</div> : null}
    </div>
  );
}

function ChartSvg({
  points,
  secondaryPoints,
  variant,
  color,
  secondaryColor,
  valueLabel,
  yDomain,
}: {
  points: Array<{ label: string; value: number | null; color?: string }>;
  secondaryPoints: Array<{ label: string; value: number | null; color?: string }>;
  variant: "line" | "bar";
  color: string;
  secondaryColor: string;
  valueLabel: (value: number | null) => string;
  yDomain?: { min: number; max: number };
}) {
  const W = 860;
  const H = 290;
  const padLeft = 58;
  const padRight = 22;
  const padTop = 22;
  const padBottom = 54;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const values = points.map((point) => point.value as number);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const yMin = yDomain ? yDomain.min : variant === "bar" ? 0 : Math.floor(rawMin - Math.max(1, Math.abs(rawMin) * 0.05));
  const yMax = yDomain ? yDomain.max : Math.ceil(rawMax + Math.max(1, Math.abs(rawMax) * 0.05));
  const ySpan = Math.max(1, yMax - yMin);
  const yTicks = buildTicks(yMin, yMax, 4);
  const xLabelIndexes =
    points.length <= 4
      ? points.map((_, index) => index)
      : Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  const sx = (index: number) => padLeft + ((index + 0.5) / Math.max(1, points.length)) * plotW;
  const sy = (value: number) => padTop + plotH - ((value - yMin) / ySpan) * plotH;
  const baselineY = sy(Math.max(0, yMin));

  const linePoints = points.map((point, index) => `${sx(index)},${sy(point.value as number)}`).join(" ");
  const barWidth = Math.max(3, Math.min(28, plotW / Math.max(1, points.length) - 6));
  const secondaryByLabel = new Map(secondaryPoints.map((point) => [point.label, point]));

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[620px]" role="img" aria-label="Statistický graf">
        {yTicks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line x1={padLeft} y1={sy(tick)} x2={padLeft + plotW} y2={sy(tick)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padLeft - 10} y={sy(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {valueLabel(tick)}
            </text>
          </g>
        ))}

        <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#94a3b8" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#94a3b8" />

        {xLabelIndexes.map((index) => (
          <text key={`x-${index}`} x={sx(index)} y={padTop + plotH + 24} textAnchor="middle" fontSize="11" fill="#64748b">
            {points[index]?.label ?? ""}
          </text>
        ))}

        {variant === "line" ? (
          <>
            {points.map((point, index) => {
              const secondary = secondaryByLabel.get(point.label);
              if (!secondary || typeof secondary.value !== "number") return null;
              const x = sx(index) + Math.max(7, barWidth * 0.45);
              return (
                <g key={`secondary-${point.label}-${index}`}>
                  <title>{`${point.label} plán: ${valueLabel(secondary.value)}`}</title>
                  <circle cx={x} cy={sy(secondary.value)} r={4} fill={secondary.color ?? secondaryColor} opacity={0.75} />
                </g>
              );
            })}
            <polyline fill="none" stroke={color} strokeWidth="3" points={linePoints} />
            {points.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <title>{`${point.label}: ${valueLabel(point.value)}`}</title>
                <circle cx={sx(index)} cy={sy(point.value as number)} r={4} fill={color} />
              </g>
            ))}
          </>
        ) : (
          <>
          {points.map((point, index) => {
            const secondary = secondaryByLabel.get(point.label);
            if (!secondary || typeof secondary.value !== "number") return null;
            const value = secondary.value;
            const x = sx(index) + barWidth * 0.12;
            const y = sy(value);
            const height = Math.max(1, baselineY - y);
            return (
              <g key={`secondary-${point.label}-${index}`}>
                <title>{`${point.label} plán: ${valueLabel(secondary.value)}`}</title>
                <rect x={x} y={y} width={barWidth} height={height} rx={4} fill={secondary.color ?? secondaryColor} opacity={0.55} />
              </g>
            );
          })}
          {points.map((point, index) => {
            const value = point.value as number;
            const x = sx(index) - barWidth * 0.62;
            const y = sy(value);
            const height = Math.max(1, baselineY - y);
            return (
              <g key={`${point.label}-${index}`}>
                <title>{`${point.label}: ${valueLabel(point.value)}`}</title>
                <rect x={x} y={y} width={barWidth} height={height} rx={4} fill={point.color ?? color} opacity={0.88} />
              </g>
            );
          })}
          </>
        )}
      </svg>
    </div>
  );
}
