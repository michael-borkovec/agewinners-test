/**
 * File: app/profile/stats/page.tsx
 *
 * Purpose:
 * - Backward-compatible redirect from the old profile statistics route
 * - Keeps existing links and bookmarks working after moving statistics to /stats
 * - Related route: app/stats/page.tsx
 */

import { redirect } from "next/navigation";

type LegacyProfileStatsPageProps = {
  searchParams?: Promise<{ section?: string | string[] }> | { section?: string | string[] };
};

export default async function LegacyProfileStatsPage({ searchParams }: LegacyProfileStatsPageProps) {
  const params = searchParams ? await searchParams : {};
  const rawSection = Array.isArray(params.section) ? params.section[0] : params.section;
  const sectionQuery = rawSection ? `?section=${encodeURIComponent(rawSection)}` : "";

  redirect(`/stats${sectionQuery}`);
}
