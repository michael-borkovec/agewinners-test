/**
 * File purpose
 * - Shared modal close button for AgeWinners.
 * Main responsibilities
 * - Keep close icons visually consistent across dialogs and modals.
 * Related APIs, components, or modules
 * - components/EditImageModal.tsx
 * - report modals, gallery modals, help dialogs
 */

"use client";

import type { ButtonHTMLAttributes } from "react";

type CloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
};

export default function CloseButton({ label = "Zavřít", className = "", type = "button", ...props }: CloseButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:pointer-events-none disabled:opacity-55",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span className="text-[1.9rem] font-light leading-none" aria-hidden="true">
        ×
      </span>
    </button>
  );
}
