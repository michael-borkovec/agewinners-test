/**
 * File purpose
 * - Shared AgeWinners button component for primary, secondary, and tertiary actions.
 * Main responsibilities
 * - Keep button hierarchy, spacing, radius, focus, hover, and disabled states consistent.
 * Related APIs, components, or modules
 * - components/NewPostForm.tsx
 * - components/EditImageModal.tsx
 */

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type AwButtonVariant = "primary" | "secondary" | "tertiary";
type AwButtonSize = "sm" | "md" | "lg";

type AwButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AwButtonVariant;
  size?: AwButtonSize;
  children: ReactNode;
};

const baseClass =
  "inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-55";

const variantClass: Record<AwButtonVariant, string> = {
  primary: "bg-[#32CD32] text-white shadow-sm hover:bg-[#28b828]",
  secondary: "bg-[#effdef] text-emerald-900 hover:bg-[#dcfbdc]",
  tertiary: "bg-transparent text-slate-600 underline underline-offset-4 hover:text-slate-900 hover:bg-transparent focus:ring-slate-200",
};

const sizeClass: Record<AwButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

export default function AwButton({ variant = "secondary", size = "md", className = "", type = "button", children, ...props }: AwButtonProps) {
  return (
    <button type={type} className={[baseClass, variantClass[variant], sizeClass[size], className].filter(Boolean).join(" ")} {...props}>
      {children}
    </button>
  );
}


