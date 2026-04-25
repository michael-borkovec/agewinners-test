/**
 * File purpose
 * - Record and read profile visit traffic for user statistics.
 * - Keep profile traffic writes and reads behind small typed helpers.
 * - Related APIs, components, or modules
 *   - app/users/[userId]/page.tsx
 *   - app/stats/page.tsx
 *   - supabase/migrations/20260419_profile_visits.sql
 */

import { supabase } from "@/lib/supabaseClient";

export type ProfileVisitTrendPoint = {
  date: string;
  label: string;
  count: number;
};

export type RecentProfileVisit = {
  id: number;
  viewedAt: string;
  viewerUserId: string;
  viewerDisplayName: string | null;
  viewerAvatarUrl: string | null;
};

export type ProfileTrafficSummary = {
  totalVisits: number;
  uniqueVisitors: number;
  trend: ProfileVisitTrendPoint[];
  recentVisits: RecentProfileVisit[];
};

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatLocalDate(date);
}

function formatShortDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

function buildEmptyTrend(days: number): ProfileVisitTrendPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const date = getDateDaysAgo(days - 1 - index);
    return {
      date,
      label: formatShortDate(date),
      count: 0,
    };
  });
}

export async function recordProfileVisit(viewedUserId: string): Promise<void> {
  const targetUserId = String(viewedUserId ?? "").trim();
  if (!targetUserId) return;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id || user.id === targetUserId) return;

  const { error } = await supabase.from("profile_visits").insert({
    viewed_user_id: targetUserId,
    viewer_user_id: user.id,
  });

  if (error) throw new Error(error.message);
}

export async function getMyProfileTraffic(days = 30): Promise<ProfileTrafficSummary> {
  const safeDays = Math.max(1, Math.min(90, Math.round(days)));
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const startDate = getDateDaysAgo(safeDays - 1);

  const { data: visits, error: visitsError } = await supabase
    .from("profile_visits")
    .select("id, viewer_user_id, viewed_at")
    .eq("viewed_user_id", user.id)
    .gte("viewed_at", `${startDate}T00:00:00`)
    .order("viewed_at", { ascending: false });

  if (visitsError) throw new Error(visitsError.message);

  const rows = (visits ?? []) as Array<Record<string, unknown>>;
  const countsByDate = new Map<string, number>();
  const uniqueVisitors = new Set<string>();

  rows.forEach((row) => {
    const viewedAt = String(row.viewed_at ?? "");
    const day = viewedAt.slice(0, 10);
    if (day) countsByDate.set(day, (countsByDate.get(day) ?? 0) + 1);

    const viewerUserId = String(row.viewer_user_id ?? "");
    if (viewerUserId) uniqueVisitors.add(viewerUserId);
  });

  const trend = buildEmptyTrend(safeDays).map((point) => ({
    ...point,
    count: countsByDate.get(point.date) ?? 0,
  }));

  const recentRows = rows.slice(0, 20);
  const recentViewerIds = Array.from(new Set(recentRows.map((row) => String(row.viewer_user_id ?? "")).filter(Boolean)));
  const profilesByUserId = new Map<string, { displayName: string | null; avatarUrl: string | null }>();

  if (recentViewerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", recentViewerIds);

    if (profilesError) throw new Error(profilesError.message);

    for (const profile of (profiles ?? []) as Array<Record<string, unknown>>) {
      const profileUserId = String(profile.user_id ?? "");
      if (!profileUserId) continue;
      profilesByUserId.set(profileUserId, {
        displayName: profile.display_name == null ? null : String(profile.display_name),
        avatarUrl: profile.avatar_url == null ? null : String(profile.avatar_url),
      });
    }
  }

  return {
    totalVisits: rows.length,
    uniqueVisitors: uniqueVisitors.size,
    trend,
    recentVisits: recentRows.map((row) => {
      const viewerUserId = String(row.viewer_user_id ?? "");
      const profile = profilesByUserId.get(viewerUserId);

      return {
        id: Number(row.id ?? 0),
        viewedAt: String(row.viewed_at ?? ""),
        viewerUserId,
        viewerDisplayName: profile?.displayName ?? null,
        viewerAvatarUrl: profile?.avatarUrl ?? null,
      };
    }),
  };
}
