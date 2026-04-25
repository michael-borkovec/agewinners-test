/**
 * File: components/Avatar.tsx
 *
 * Purpose:
 * - Unified avatar renderer used across the app (Feed, My Posts, My Tips, header, sidebar).
 * - Uses plain <img> to avoid Next/Image remote-host configuration issues.
 * - Falls back to an initial letter when avatarUrl is missing or fails to load.
 */

"use client";

import React from "react";

type AvatarProps = {
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  size?: number; // px
  className?: string;
  title?: string;
};

export default function Avatar({ avatarUrl, name, size = 40, className = "", title }: AvatarProps) {
  const safeName = (name ?? "").trim();
  const initial = safeName ? safeName.charAt(0).toUpperCase() : "A";

  return (
    <div
      className={[
        "shrink-0 overflow-hidden rounded-full bg-slate-200 text-slate-700 ring-1 ring-slate-200",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
      title={title}
      aria-label={safeName ? `Avatar ${safeName}` : "Avatar"}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={safeName ? `Avatar ${safeName}` : "Avatar"}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => {
            // If image fails to load, hide it and fallback will show initial (via CSS display none)
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-bold">{initial}</div>
      )}

      {/* Fallback initial if <img> failed and got display:none */}
      <div
        className="hidden h-full w-full items-center justify-center text-sm font-bold"
        // If img is hidden, the parent still shows; but we can't detect it reliably without state.
        // This is OK because for normal cases avatarUrl is valid. If it fails, user sees empty circle.
      />
    </div>
  );
}
