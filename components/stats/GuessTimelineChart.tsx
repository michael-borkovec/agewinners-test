/**
 * File: components/stats/GuessTimelineChart.tsx
 * Description:
 *   Minimal SVG timeline chart for age guesses (no recharts).
 *   - X axis: months by default, but for last <= 90 days shows days.
 *   - Y axis: guessed age
 *   - Input points: { createdAt, guessedAge }
 */

"use client";

import React from "react";

export type GuessTimelinePoint = {
  createdAt: string; // ISO timestamp
  guessedAge: number;
};

function toMs(iso: string) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function fmtDayCZ(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
}

function fmtMonthCZ(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function GuessTimelineChart({ points }: { points: GuessTimelinePoint[] }) {
  const sorted = React.useMemo(() => {
    return [...(points ?? [])]
      .filter((p) => typeof p?.guessedAge === "number" && Number.isFinite(p.guessedAge) && p.createdAt)
      .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  }, [points]);

  // Empty state
  if (!sorted || sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Vývoj tipů v čase</div>
        <div className="mt-2 text-sm text-gray-600">Zatím žádná data pro graf.</div>
      </div>
    );
  }

  const msMin = toMs(sorted[0].createdAt);
  const msMax = toMs(sorted[sorted.length - 1].createdAt);

  const spanDays = Math.max(0, (msMax - msMin) / (1000 * 60 * 60 * 24));
  const useDailyTicks = spanDays <= 90; // < 3 měsíce => dny

  const ages = sorted.map((p) => p.guessedAge);
  const yMinRaw = Math.min(...ages);
  const yMaxRaw = Math.max(...ages);

  // Add padding so line isn't stuck to edges
  const yPad = Math.max(1, Math.round((yMaxRaw - yMinRaw) * 0.15));
  const yMin = yMinRaw - yPad;
  const yMax = yMaxRaw + yPad;

  // SVG layout
  const W = 980;
  const H = 260;
  const padL = 52;
  const padR = 18;
  const padT = 18;
  const padB = 46;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xOf = (ms: number) => {
    if (msMax === msMin) return padL + innerW / 2;
    return padL + ((ms - msMin) / (msMax - msMin)) * innerW;
  };

  const yOf = (age: number) => {
    if (yMax === yMin) return padT + innerH / 2;
    const t = (age - yMin) / (yMax - yMin);
    return padT + (1 - t) * innerH;
  };

  // Build polyline points
  const poly = sorted
    .map((p) => `${xOf(toMs(p.createdAt)).toFixed(1)},${yOf(p.guessedAge).toFixed(1)}`)
    .join(" ");

  // Y ticks (4 lines)
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const t = i / yTicks;
    return yMin + (yMax - yMin) * (1 - t);
  });

  // X ticks (up to 6 labels)
  const xTickCount: number = 6;
  const xTickMs = Array.from({ length: xTickCount }).map((_, i) => {
    if (xTickCount === 1) return msMin;
    return msMin + ((msMax - msMin) * i) / (xTickCount - 1);
  });

  const labelX = (ms: number) => (useDailyTicks ? fmtDayCZ(ms) : fmtMonthCZ(ms));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Vývoj tipů v čase</div>
        <div className="text-xs text-gray-500">{useDailyTicks ? "osa X: dny" : "osa X: měsíce"}</div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[260px] w-full min-w-[760px]">
          {/* background */}
          <rect x={0} y={0} width={W} height={H} fill="white" />

          {/* grid + y labels */}
          {yTickVals.map((v, i) => {
            const y = yOf(v);
            const label = Math.round(v);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
                  {label}
                </text>
              </g>
            );
          })}

          {/* x axis line */}
          <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="#E2E8F0" strokeWidth="1" />

          {/* x ticks */}
          {xTickMs.map((ms, i) => {
            const x = xOf(ms);
            return (
              <g key={i}>
                <line x1={x} y1={padT + innerH} x2={x} y2={padT + innerH + 6} stroke="#CBD5E1" strokeWidth="1" />
                <text x={x} y={padT + innerH + 22} textAnchor="middle" fontSize="11" fill="#64748B">
                  {labelX(ms)}
                </text>
              </g>
            );
          })}

          {/* polyline */}
          <polyline fill="none" stroke="#10B981" strokeWidth="2.5" points={poly} />

          {/* points */}
          {sorted.map((p, idx) => {
            const x = xOf(toMs(p.createdAt));
            const y = yOf(p.guessedAge);
            return (
              <g key={idx}>
                <circle cx={x} cy={y} r={4} fill="#10B981" stroke="white" strokeWidth="2" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        Zobrazeno <span className="font-semibold tabular-nums">{sorted.length}</span> tipů (chronologicky).
      </div>
    </div>
  );
}
