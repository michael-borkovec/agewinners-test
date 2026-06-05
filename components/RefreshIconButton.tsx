/**
 * File purpose
 * - Reusable icon-only refresh button used across the app.
 * Main responsibilities
 * - Render the same refresh icon style as feed headers.
 * - Keep a11y labels and disabled state consistent.
 * Related APIs, components, or modules
 * - components/SectionHeaderFilter.tsx
 */

"use client";

import { useEffect, useState } from "react";

type RefreshIconButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  activeIconPath?: string;
  activeDurationMs?: number;
  title?: string;
  ariaLabel?: string;
};

export default function RefreshIconButton({
  onClick,
  disabled = false,
  className = "",
  activeIconPath,
  activeDurationMs = 5000,
  title = "Obnovit",
  ariaLabel = "Obnovit",
}: RefreshIconButtonProps) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!animating) return;

    const timeoutId = window.setTimeout(() => {
      setAnimating(false);
    }, activeDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeDurationMs, animating]);

  return (
    <button
      type="button"
      onClick={() => {
        if (activeIconPath) setAnimating(true);
        onClick();
      }}
      disabled={disabled}
      className={`rounded-md p-2 hover:bg-slate-100 disabled:opacity-60 ${className}`.trim()}
      aria-label={ariaLabel}
      title={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/action/refresh.png" alt="" className={`h-5 w-5 object-contain ${animating ? "animate-spin" : ""}`} />
    </button>
  );
}
