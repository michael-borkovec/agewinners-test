/**
 * File: components/ui/StatBar.tsx
 *
 * Purpose:
 * - Tiny reusable progress bar for statistics (0–100%).
 * - Fill uses a smooth color transition from black (low) to green (high).
 * - Accessible: includes aria-label and text alternative.
 */

"use client";

import React from "react";

type StatBarProps = {
  /** 0..100 (values outside will be clamped) */
  valuePct: number;
  /** Optional label for screen readers (e.g. "Přesnost tipů") */
  ariaLabel?: string;
  /** Visual size */
  height?: number; // px
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Color interpolation from black -> green based on value 0..100.
 * - 0%: black
 * - 100%: green
 *
 * We interpolate RGB:
 * black: (0,0,0)
 * green: (34,197,94)  // Tailwind emerald/green-ish
 */
function colorForPct(pct: number) {
  const t = clamp(pct, 0, 100) / 100;
  const r = Math.round(0 + (34 - 0) * t);
  const g = Math.round(0 + (197 - 0) * t);
  const b = Math.round(0 + (94 - 0) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function StatBar({ valuePct, ariaLabel, height = 10 }: StatBarProps) {
  const pct = clamp(Number.isFinite(valuePct) ? valuePct : 0, 0, 100);
  const fillColor = colorForPct(pct);

  return (
    <div className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-full bg-white"
        style={{ height }}
        role="img"
        aria-label={ariaLabel ? `${ariaLabel}: ${pct.toFixed(0)} %` : `Hodnota: ${pct.toFixed(0)} %`}
        title={ariaLabel ? `${ariaLabel}: ${pct.toFixed(0)} %` : `${pct.toFixed(0)} %`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: fillColor,
            transition: "width 250ms ease, background-color 250ms ease",
          }}
        />
      </div>

      {/* Optional tiny text fallback for very small bars (kept visually subtle) */}
      <div className="mt-1 text-[10px] text-slate-500 tabular-nums">
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

