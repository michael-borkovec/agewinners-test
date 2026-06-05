"use client";

/**
 * File purpose
 * - Shared visual building blocks for the /profile area.
 * Main responsibilities
 * - Render a social-network style profile header.
 * - Keep profile cards, stats, and section introductions visually consistent.
 * Related APIs, components, or modules
 * - app/profile/basic/page.tsx
 * - app/profile/as-seen/page.tsx
 * - app/profile/privacy/page.tsx
 * - app/profile/personal/page.tsx
 */

import type { ReactNode } from "react";
import HelpIconButton from "@/components/HelpIconButton";

type ProfileHeroStat = {
  label: string;
  value: ReactNode;
  hint?: string;
};

type ProfileHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  stats?: ProfileHeroStat[];
  coverImages?: string[];
  actions?: ReactNode;
  children?: ReactNode;
};

function initialsFromName(name: string | null | undefined) {
  const clean = (name ?? "").trim();
  if (!clean) return "AW";
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "A";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export function ProfileHero({
  eyebrow,
  title,
  description,
  displayName,
  avatarUrl,
  bio,
  stats = [],
  coverImages = [],
  actions,
  children,
}: ProfileHeroProps) {
  const safeDisplayName = (displayName ?? "").trim() || title.trim() || "AgeWinners profil";
  const safeBio = (bio ?? "").trim();
  const showAvatar = Boolean(avatarUrl || displayName || safeBio);
  const showCover = showAvatar || coverImages.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl bg-white">
      {showCover ? (
        <div className="relative h-20 bg-[linear-gradient(135deg,#e8fbe8_0%,#ffffff_48%,#f3f6fb_100%)] sm:h-24">
          {coverImages.length > 0 ? (
            <div className="grid h-full grid-cols-4 gap-1 opacity-95">
              {coverImages.slice(0, 4).map((src, index) => (
                <div key={`${src}-${index}`} className="overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/10 to-transparent" />
        </div>
      ) : null}

      <div className={`relative px-5 pb-5 sm:px-6 ${showCover ? "" : "pt-5"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
            {showAvatar ? (
              <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm sm:-mt-14 sm:h-24 sm:w-24">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={safeDisplayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-lg font-black text-slate-600">{initialsFromName(safeDisplayName)}</span>
                )}
              </div>
            ) : null}

            <div className="min-w-0 flex-1 pt-0 sm:pt-2">
              {eyebrow ? <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">{eyebrow}</div> : null}
              <div className="mt-1 flex min-w-0 items-start justify-between gap-3">
                <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h1>
                {description ? (
                  <HelpIconButton
                    title={`Nápověda: ${title}`}
                    modalTitle={title}
                    helpText={description}
                    breadcrumbs={[
                      { label: "Můj profil", href: "/profile" },
                      { label: title },
                    ]}
                    className="-mt-1 shrink-0"
                    iconClassName="h-4 w-4"
                  />
                ) : null}
              </div>
              {displayName ? <div className="mt-1 truncate text-sm font-semibold text-slate-700">{safeDisplayName}</div> : null}
            </div>
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
        </div>

        {safeBio || children ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              {safeBio ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-800">{safeBio}</p> : null}
              {children ? <div className="mt-4">{children}</div> : null}
            </div>

            {stats.length > 0 ? (
              <div className="grid min-w-[260px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="mt-1 text-sm font-black text-slate-950">{item.value}</div>
                    {item.hint ? <div className="mt-0.5 text-[11px] font-medium text-slate-500">{item.hint}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ProfileSectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          {description ? (
            <HelpIconButton
              title={`Nápověda: ${title}`}
              modalTitle={title}
              helpText={description}
              breadcrumbs={[
                { label: "Můj profil", href: "/profile" },
                { label: title },
              ]}
              className="-mt-2 shrink-0"
              iconClassName="h-4 w-4"
            />
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function VisibilityBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "private" }) {
  const className =
    tone === "good"
      ? "bg-[#effdef] text-emerald-900"
      : tone === "private"
        ? "bg-slate-100 text-slate-700"
        : "bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}
