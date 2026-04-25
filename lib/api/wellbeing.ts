/**
 * File purpose
 * - Client API helpers for voluntary daily wellbeing entries.
 * - Keeps one editable entry per signed-in user and day.
 * - Related APIs, components, or modules
 *   - app/stats/page.tsx
 *   - supabase/migrations/20260417_wellbeing_daily_entries.sql
 */

import { supabase } from "@/lib/supabaseClient";
import type { ContentVisibility } from "@/types/db";

export type WellbeingMood = "lehka" | "klid" | "radost" | "unava" | "napeti";
export type WellbeingFoodAmount = "malo" | "bezne" | "moc" | "bez_jidla";
export type WellbeingFoodType = "dietni" | "vegan" | "vegetarian" | "vyvazena" | "bezna" | "sladke" | "maso" | "nezdrava";

export type WellbeingVisibilityDefaults = {
  entryVisibility: ContentVisibility;
};

export type WellbeingDailyEntry = {
  userId: string;
  entryDate: string;
  mood: WellbeingMood | null;
  moodScore: number | null;
  energyScore: number | null;
  sleepHours: number | null;
  movementMinutes: number | null;
  waterLiters: number | null;
  foodAmount: WellbeingFoodAmount | null;
  foodType: WellbeingFoodType | null;
  entryVisibility: ContentVisibility;
  selfCareDone: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WellbeingDailyEntryInput = {
  mood?: WellbeingMood | null;
  moodScore?: number | null;
  energyScore?: number | null;
  sleepHours?: number | null;
  movementMinutes?: number | null;
  waterLiters?: number | null;
  foodAmount?: WellbeingFoodAmount | null;
  foodType?: WellbeingFoodType | null;
  entryVisibility?: ContentVisibility;
  selfCareDone?: boolean;
  note?: string | null;
  entryDate?: string;
};

export type WellbeingPlanEntry = {
  userId: string;
  planDate: string;
  sleepHours: number | null;
  movementMinutes: number | null;
  waterLiters: number | null;
  foodAmount: WellbeingFoodAmount | null;
  foodType: WellbeingFoodType | null;
  createdAt: string;
  updatedAt: string;
};

export type WellbeingPlanEntryInput = Omit<WellbeingPlanEntry, "userId" | "createdAt" | "updatedAt">;

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: unknown, fallback: number | null = 0) {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toVisibility(value: unknown, fallback: ContentVisibility = "everyone"): ContentVisibility {
  return value === "contacts" || value === "private" || value === "everyone" ? value : fallback;
}

const DAILY_SELECT =
  "user_id, entry_date, mood, mood_score, energy_score, sleep_hours, movement_minutes, water_glasses, water_liters, food_amount, food_type, entry_visibility, self_care_done, note, created_at, updated_at";

const PLAN_SELECT =
  "user_id, plan_date, sleep_hours, movement_minutes, water_liters, food_amount, food_type, created_at, updated_at";

function normalizeEntry(row: Record<string, unknown>): WellbeingDailyEntry {
  const legacyWaterGlasses = toNumber(row.water_glasses, null);
  const waterLiters = toNumber(row.water_liters, legacyWaterGlasses == null ? null : legacyWaterGlasses * 0.25);

  return {
    userId: String(row.user_id ?? ""),
    entryDate: String(row.entry_date ?? ""),
    mood: row.mood == null ? null : (String(row.mood) as WellbeingMood),
    moodScore: toNumber(row.mood_score, null),
    energyScore: toNumber(row.energy_score, null),
    sleepHours: toNumber(row.sleep_hours, null),
    movementMinutes: toNumber(row.movement_minutes, null),
    waterLiters,
    foodAmount: row.food_amount == null ? null : (String(row.food_amount) as WellbeingFoodAmount),
    foodType: row.food_type == null ? null : (String(row.food_type) as WellbeingFoodType),
    entryVisibility: toVisibility(row.entry_visibility),
    selfCareDone: Boolean(row.self_care_done),
    note: row.note == null ? null : String(row.note),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function normalizePlan(row: Record<string, unknown>): WellbeingPlanEntry {
  return {
    userId: String(row.user_id ?? ""),
    planDate: String(row.plan_date ?? ""),
    sleepHours: toNumber(row.sleep_hours, null),
    movementMinutes: toNumber(row.movement_minutes, null),
    waterLiters: toNumber(row.water_liters, null),
    foodAmount: row.food_amount == null ? null : (String(row.food_amount) as WellbeingFoodAmount),
    foodType: row.food_type == null ? null : (String(row.food_type) as WellbeingFoodType),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");
  return user.id;
}

export function getTodayWellbeingDate() {
  return formatLocalDate();
}

export async function getMyWellbeingEntries(days = 30): Promise<WellbeingDailyEntry[]> {
  const userId = await getCurrentUserId();
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, days - 1));

  const { data, error } = await supabase
    .from("wellbeing_daily_entries")
    .select(DAILY_SELECT)
    .eq("user_id", userId)
    .gte("entry_date", formatLocalDate(start))
    .order("entry_date", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizeEntry);
}

export async function getMyTodayWellbeingEntry(): Promise<WellbeingDailyEntry | null> {
  const userId = await getCurrentUserId();
  const today = formatLocalDate();

  const { data, error } = await supabase
    .from("wellbeing_daily_entries")
    .select(DAILY_SELECT)
    .eq("user_id", userId)
    .eq("entry_date", today)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeEntry(data as Record<string, unknown>) : null;
}

export async function upsertMyTodayWellbeingEntry(input: WellbeingDailyEntryInput): Promise<WellbeingDailyEntry> {
  const userId = await getCurrentUserId();

  const payload = {
    user_id: userId,
    entry_date: input.entryDate ?? formatLocalDate(),
    mood: input.mood ?? null,
    mood_score: input.moodScore ?? null,
    energy_score: input.energyScore ?? null,
    sleep_hours: input.sleepHours ?? null,
    movement_minutes: input.movementMinutes ?? null,
    water_liters: input.waterLiters ?? null,
    food_amount: input.foodAmount ?? null,
    food_type: input.foodAmount === "bez_jidla" ? null : input.foodType ?? null,
    entry_visibility: input.entryVisibility ?? "everyone",
    self_care_done: input.selfCareDone ?? false,
    note: input.note?.trim() || null,
  };

  const { data, error } = await supabase
    .from("wellbeing_daily_entries")
    .upsert(payload, { onConflict: "user_id,entry_date" })
    .select(DAILY_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalizeEntry(data as Record<string, unknown>);
}

export async function getMyWellbeingEntriesForMonth(year: number, monthIndex: number): Promise<WellbeingDailyEntry[]> {
  const userId = await getCurrentUserId();
  const start = formatLocalDate(new Date(year, monthIndex, 1));
  const end = formatLocalDate(new Date(year, monthIndex + 1, 0));

  const { data, error } = await supabase
    .from("wellbeing_daily_entries")
    .select(DAILY_SELECT)
    .eq("user_id", userId)
    .gte("entry_date", start)
    .lte("entry_date", end)
    .order("entry_date", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizeEntry);
}

export async function getMyWellbeingVisibilityDefaults(): Promise<WellbeingVisibilityDefaults> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("wellbeing_daily_entry_visibility_default")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    entryVisibility: toVisibility(row.wellbeing_daily_entry_visibility_default),
  };
}

export async function getMyWellbeingPlansForMonth(year: number, monthIndex: number): Promise<WellbeingPlanEntry[]> {
  const userId = await getCurrentUserId();
  const start = formatLocalDate(new Date(year, monthIndex, 1));
  const end = formatLocalDate(new Date(year, monthIndex + 1, 0));

  const { data, error } = await supabase
    .from("wellbeing_plan_entries")
    .select(PLAN_SELECT)
    .eq("user_id", userId)
    .gte("plan_date", start)
    .lte("plan_date", end)
    .order("plan_date", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizePlan);
}

export async function upsertMyWellbeingPlan(input: WellbeingPlanEntryInput): Promise<WellbeingPlanEntry> {
  const userId = await getCurrentUserId();
  const payload = {
    user_id: userId,
    plan_date: input.planDate,
    sleep_hours: input.sleepHours ?? null,
    movement_minutes: input.movementMinutes ?? null,
    water_liters: input.waterLiters ?? null,
    food_amount: input.foodAmount ?? null,
    food_type: input.foodAmount === "bez_jidla" ? null : input.foodType ?? null,
  };

  const { data, error } = await supabase
    .from("wellbeing_plan_entries")
    .upsert(payload, { onConflict: "user_id,plan_date" })
    .select(PLAN_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalizePlan(data as Record<string, unknown>);
}
