/**
 * AW referral API helpers
 * Main responsibilities
 * - Load and create the current user's short public invite slug.
 * - Load referral bonus rows for profile and statistics screens.
 * Related APIs, components, or modules
 * - app/profile/basic/page.tsx
 * - app/stats/page.tsx
 * - supabase/migrations/20260510_aw_referrals.sql
 */

import { supabase } from "@/lib/supabaseClient";

export type ReferralStatus = "pending" | "active" | "expired";

export type ReferralSummaryRow = {
  referralSlug: string;
  referredUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  registeredAt: string | null;
  activatedAt: string | null;
  bonusExpiresAt: string | null;
  status: ReferralStatus;
  referredPowerScore: number;
  bonusScore: number;
  daysRemaining: number;
};

export type ReferralOverview = {
  slug: string;
  rows: ReferralSummaryRow[];
  activeCount: number;
  pendingCount: number;
  expiredCount: number;
  totalUsedCount: number;
  activeBonusScore: number;
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(value: unknown): ReferralStatus {
  return value === "active" || value === "expired" || value === "pending" ? value : "pending";
}

function mapReferralRow(row: Record<string, unknown>): ReferralSummaryRow {
  return {
    referralSlug: String(row.referral_slug ?? ""),
    referredUserId: row.referred_user_id ? String(row.referred_user_id) : null,
    displayName: row.display_name ? String(row.display_name) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    registeredAt: row.registered_at ? String(row.registered_at) : null,
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    bonusExpiresAt: row.bonus_expires_at ? String(row.bonus_expires_at) : null,
    status: normalizeStatus(row.status),
    referredPowerScore: toNumber(row.referred_power_score),
    bonusScore: toNumber(row.bonus_score),
    daysRemaining: Math.max(0, Math.round(toNumber(row.days_remaining))),
  };
}

export function buildReferralUrl(slug: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/ref/${slug}`;
}

export function buildDefaultInviteText(referralUrl: string) {
  return [
    "Ahoj, zkus AgeWinners.",
    "Nahraješ fotku, ostatní tipují tvůj AW věk a uvidíš, jak působíš na ostatní.",
    "",
    `Přidej se přes můj odkaz: ${referralUrl}`,
  ].join("\n");
}

export async function ensureMyReferralSlug(): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_referral_code_for_user", {});
  if (error) throw new Error(error.message);
  return String(data ?? "");
}

export async function getMyReferralOverview(): Promise<ReferralOverview> {
  const slug = await ensureMyReferralSlug();
  const { data, error } = await supabase.rpc("get_my_referral_summary");
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as Array<Record<string, unknown>>)
    .map(mapReferralRow)
    .filter((row) => Boolean(row.referralSlug));
  const effectiveSlug = rows[0]?.referralSlug || slug;
  const activeRows = rows.filter((row) => row.referredUserId && row.status === "active");

  return {
    slug: effectiveSlug,
    rows: rows.filter((row) => row.referredUserId),
    activeCount: activeRows.length,
    pendingCount: rows.filter((row) => row.referredUserId && row.status === "pending").length,
    expiredCount: rows.filter((row) => row.referredUserId && row.status === "expired").length,
    totalUsedCount: rows.filter((row) => row.referredUserId).length,
    activeBonusScore: activeRows
      .slice()
      .sort((a, b) => b.referredPowerScore - a.referredPowerScore)
      .slice(0, 10)
      .reduce((sum, row) => sum + row.bonusScore, 0),
  };
}

export async function getMyReferralBonusScore(): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data, error } = await supabase.rpc("get_referral_bonus_for_user", { p_user_id: user.id });
  if (error) throw new Error(error.message);
  return toNumber(data);
}
