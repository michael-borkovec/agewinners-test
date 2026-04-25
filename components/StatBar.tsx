/**
 * File: components/StatBar.tsx
 *
 * Purpose:
 * - Jednoduchý progress bar pro statistiky.
 * - Fill má gradient uvnitř (černá -> zelená) a šířka odpovídá procentům.
 */

"use client";

import React from "react";

export default function StatBar({
  pct,
  height = 8,
  title,
}: {
  /** 0..100 */
  pct: number;
  height?: number;
  title?: string;
}) {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;

  return (
    <div
      className="w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200"
      style={{ height }}
      aria-label={title}
      title={title}
    >
      <div
        className="h-full"
        style={{
          width: `${safePct}%`,
          // ✅ gradient uvnitř fillu (po celé šířce fillu)
          background: "linear-gradient(90deg, #000000 0%, #22c55e 100%)",
        }}
      />
    </div>
  );
}
