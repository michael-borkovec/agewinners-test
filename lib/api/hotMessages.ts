/**
 * Hot message panel data
 * Main responsibilities:
 * - Load compact motivation aggregates for the authenticated sidebar panel
 * - Keep privacy-sensitive reveal checks aligned with loadMyTipPosts()
 * Related APIs, components, or modules:
 * - components/HotMessagePanel
 * - lib/api/myTips
 * - lib/api/stats
 */

import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_POST_REVEAL_DELAY_DAYS, getPostRevealDelayDays } from "@/lib/api/appSettings";
import { loadMyTipPosts } from "@/lib/api/myTips";
import { getMyPowerScoreSafe } from "@/lib/api/stats";

export const STREAK_MIN_TIPS = 1;
export const DAILY_TIP_TARGET = 10;
const TARGET_TIPS = 30;

export type HotMessageStats = {
  tipsGivenToday: number;
  tipsGiven30d: number;
  tipsReceived30d: number;
  uploads30d: number;
  ownPhotosBelow30Tips: number;
  closestPhotoTipsToStable?: number | null;
  revealReadyCount: number;
  currentStreakDays: number;
  streakDoneToday: boolean;
  dailyTipTargetDone: boolean;
  powerScore?: number | null;
  referralBonusActive?: boolean;
};

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(days: number, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return date;
}

function isoDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function msFromDays(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

function countCurrentStreak(createdAtRows: Array<{ created_at?: string | null }>, now = new Date()) {
  const daySet = new Set<string>();
  for (const row of createdAtRows) {
    const date = row.created_at ? new Date(row.created_at) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    daySet.add(isoDateKey(date));
  }

  const cursor = startOfLocalDay(now);
  let count = 0;

  if (!daySet.has(isoDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daySet.has(isoDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

async function countRows(query: PromiseLike<{ count: number | null; error: { message?: string } | null }>) {
  const { count, error } = await query;
  if (error) throw new Error(error.message || "Nepodařilo se načíst souhrn.");
  return toCount(count);
}

async function loadRevealReadyCount(currentUserId: string) {
  try {
    const revealDelayDays = await getPostRevealDelayDays().catch(() => DEFAULT_POST_REVEAL_DELAY_DAYS);
    const groups = await loadMyTipPosts({ currentUserId, limit: 120, revealDelayDays });

    return groups.filter((group) => {
      const latestGuessAt = Math.max(
        ...group.photos
          .map((photo) => (photo.createdAt ? new Date(photo.createdAt).getTime() : Number.NaN))
          .filter((value) => Number.isFinite(value))
      );

      if (!Number.isFinite(latestGuessAt)) return false;
      return Date.now() >= latestGuessAt + msFromDays(revealDelayDays);
    }).length;
  } catch (error) {
    console.warn("hotMessages: reveal ready count failed", error);
    return 0;
  }
}

export async function loadHotMessageStats(currentUserId: string): Promise<HotMessageStats> {
  if (!currentUserId) throw new Error("loadHotMessageStats: missing currentUserId");

  const todayStartIso = startOfLocalDay().toISOString();
  const thirtyDaysAgoIso = daysAgo(30).toISOString();
  const ninetyDaysAgoIso = daysAgo(90).toISOString();

  const [tipsGivenToday, tipsGiven30d, recentGuessRows, ownImageRes, powerRes, revealReadyCount] = await Promise.all([
    countRows(
      supabase
        .from("age_guesses")
        .select("id", { count: "exact", head: true })
        .eq("guesser_user_id", currentUserId)
        .gte("created_at", todayStartIso)
    ),
    countRows(
      supabase
        .from("age_guesses")
        .select("id", { count: "exact", head: true })
        .eq("guesser_user_id", currentUserId)
        .gte("created_at", thirtyDaysAgoIso)
    ),
    supabase
      .from("age_guesses")
      .select("created_at")
      .eq("guesser_user_id", currentUserId)
      .gte("created_at", ninetyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("images")
      .select("id, created_at, guesses_count, hidden_by_suspension, hidden_by_admin")
      .eq("uploader_user_id", currentUserId)
      .eq("hidden_by_suspension", false)
      .eq("hidden_by_admin", false)
      .limit(1000),
    getMyPowerScoreSafe(),
    loadRevealReadyCount(currentUserId),
  ]);

  if (recentGuessRows.error) throw new Error(recentGuessRows.error.message);
  if (ownImageRes.error) throw new Error(ownImageRes.error.message);

  const ownImages = (ownImageRes.data ?? []) as Array<Record<string, unknown>>;
  const ownImageIds = ownImages.map((image) => toNumber(image.id)).filter((id) => id > 0);
  const uploads30d = ownImages.filter((image) => {
    const createdAt = image.created_at ? new Date(String(image.created_at)).getTime() : Number.NaN;
    return Number.isFinite(createdAt) && createdAt >= new Date(thirtyDaysAgoIso).getTime();
  }).length;

  const underStableCounts = ownImages
    .map((image) => toNumber(image.guesses_count))
    .filter((count) => count < TARGET_TIPS);

  const tipsReceived30d =
    ownImageIds.length === 0
      ? 0
      : await countRows(
          supabase
            .from("age_guesses")
            .select("id", { count: "exact", head: true })
            .in("image_id", ownImageIds)
            .gte("created_at", thirtyDaysAgoIso)
        );

  const currentStreakDays = countCurrentStreak((recentGuessRows.data ?? []) as Array<{ created_at?: string | null }>);
  const streakDoneToday = tipsGivenToday >= STREAK_MIN_TIPS;
  const powerScore =
    typeof powerRes.data?.p_score === "number" && Number.isFinite(powerRes.data.p_score) ? powerRes.data.p_score : null;
  const referralBonus =
    typeof powerRes.data?.b_score === "number" && Number.isFinite(powerRes.data.b_score) ? powerRes.data.b_score : 0;

  return {
    tipsGivenToday,
    tipsGiven30d,
    tipsReceived30d,
    uploads30d,
    ownPhotosBelow30Tips: underStableCounts.length,
    closestPhotoTipsToStable: underStableCounts.length > 0 ? Math.max(...underStableCounts) : null,
    revealReadyCount,
    currentStreakDays,
    streakDoneToday,
    dailyTipTargetDone: tipsGivenToday >= DAILY_TIP_TARGET,
    powerScore,
    referralBonusActive: referralBonus > 0,
  };
}
