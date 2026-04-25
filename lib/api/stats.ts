/**
 * File: lib/api/stats.ts
 *
 * Purpose:
 * - Typed wrappers for stats RPC calls (Supabase).
 * - Tag filters use image_tags with legacy photo_category fallback.
 * - Provides safe wrappers compatible with the /stats UI.
 */

import { supabase } from "@/lib/supabaseClient";

export type CategoryFilter =
  | "all"
  | "bezna"
  | "oblicej"
  | "cela_postava"
  | "postava_bez_obliceje"
  | "v_plavkach"
  | "makeup_stylizace"
  | "spolecenske_saty"
  | "sport";

export type ImageTagOption = {
  tag: string;
  label: string;
  count: number;
  predefined: boolean;
};

const PREDEFINED_TAG_LABELS: Record<Exclude<CategoryFilter, "all" | "bezna">, string> = {
  oblicej: "Obličej",
  cela_postava: "Celá postava",
  postava_bez_obliceje: "Postava bez obličeje",
  v_plavkach: "Plavky",
  makeup_stylizace: "Make-up",
  spolecenske_saty: "Společenské šaty",
  sport: "Sport",
};

function normalizeStatsTag(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_ -]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function normalizeStatsTags(inputs: unknown[]): string[] {
  return Array.from(new Set(inputs.map(normalizeStatsTag).filter((tag) => Boolean(tag) && tag !== "bezna"))).slice(0, 12);
}

export type MyStats = {
  realAgeUser?: number | null;
  awAgeUser?: number | null;
  awScoreNormPct?: number | null;
  avgAccuracyPct?: number | null;

  postsCount?: number | null;
  imagesCount?: number | null;
  albumsCount?: number | null;

  guessesMadeCount?: number | null;
  guessesReceivedCount?: number | null;

  [key: string]: unknown;
};

export type CreditsBreakdown = {
  p_score: number | null;
  a_score: number | null;
  c_score: number | null;
  r_score: number | null;
  t_score?: number | null;
  b_score?: number | null;
  [key: string]: unknown;
};

export type PowerScore = CreditsBreakdown;

export type SafeResult<T> = {
  data: T | null;
  errorMessage: string | null;
};

export async function getMyStats(): Promise<MyStats> {
  const { data, error } = await supabase.rpc("get_my_stats");
  if (error) throw new Error(error.message);
  return (data ?? {}) as MyStats;
}

export async function getMyStatsFiltered(params: { category: CategoryFilter; includeExperimental: boolean }): Promise<MyStats> {
  const { category, includeExperimental } = params;

  const { data, error } = await supabase.rpc("get_my_stats_filtered", {
    p_photo_category: category === "all" ? null : category,
    p_include_experimental: includeExperimental,
  });

  if (error) throw new Error(error.message);
  return (data ?? {}) as MyStats;
}

export async function getMyStatsSafe(): Promise<SafeResult<MyStats>> {
  try {
    const data = await getMyStats();
    return { data, errorMessage: null };
  } catch (e: unknown) {
    return { data: null, errorMessage: e instanceof Error ? e.message : "RPC error" };
  }
}

export async function getMyStatsFilteredSafe(params: {
  category: CategoryFilter;
  includeExperimental: boolean;
}): Promise<SafeResult<MyStats>> {
  try {
    const data = await getMyStatsFiltered(params);
    return { data, errorMessage: null };
  } catch (e: unknown) {
    return { data: null, errorMessage: e instanceof Error ? e.message : "RPC error" };
  }
}

export type MyCredits = {
  creditsTotal: number | null;
  breakdown: CreditsBreakdown | null;
};

export async function getMyCreditsSafe(): Promise<SafeResult<MyCredits>> {
  try {
    const { data, error } = await supabase.rpc("get_my_power_score");
    if (error) return { data: null, errorMessage: error.message };

    const normalized = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
    const bd = normalized as CreditsBreakdown | null;

    const creditsTotal =
      bd && typeof bd.p_score === "number" && Number.isFinite(bd.p_score) ? bd.p_score : bd && bd.p_score === 0 ? 0 : null;

    return {
      data: { creditsTotal, breakdown: bd ?? null },
      errorMessage: null,
    };
  } catch (e: unknown) {
    return { data: null, errorMessage: e instanceof Error ? e.message : "RPC error" };
  }
}

export async function getMyPowerScoreSafe(): Promise<SafeResult<PowerScore>> {
  const res = await getMyCreditsSafe();
  return { data: res.data?.breakdown ?? null, errorMessage: res.errorMessage };
}

export type RealVsGuessedPoint = {
  year: number;
  realAge: number;
  guessedAge: number;
};

export type RealVsGuessedRawRow = {
  id: number;
  real_age_years: number;
  avg_guessed_age: number;
  public_url: string | null;
  aw_age_image: number | null;
  taken_at?: string | null;
  photo_category?: string | null;
  tags?: string[];
  include_in_global_aw?: boolean | null;
};

export async function getMyRealVsGuessedByYear(params: {
  category: CategoryFilter;
  includeExperimental: boolean;
}): Promise<RealVsGuessedPoint[]> {
  const rows = await getMyRealVsGuessedRows(params);
  const map = new Map<number, { sumReal: number; sumGuess: number; n: number }>();

  for (const r of rows) {
    const y = r.taken_at ? Number(String(r.taken_at).slice(0, 4)) : NaN;
    if (!Number.isFinite(y)) continue;

    const real = Number(r.real_age_years);
    const guess = Number(r.aw_age_image ?? r.avg_guessed_age);
    if (!Number.isFinite(real) || !Number.isFinite(guess)) continue;

    const cur = map.get(y) ?? { sumReal: 0, sumGuess: 0, n: 0 };
    cur.sumReal += real;
    cur.sumGuess += guess;
    cur.n += 1;
    map.set(y, cur);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      realAge: v.sumReal / v.n,
      guessedAge: v.sumGuess / v.n,
    }));
}

export async function getMyRealVsGuessedRows(params: {
  category?: CategoryFilter;
  tags?: string[];
  includeExperimental: boolean;
}): Promise<RealVsGuessedRawRow[]> {
  const { category = "all", tags = [], includeExperimental } = params;
  const wantedTags = normalizeStatsTags([...tags, category === "all" ? null : category]);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user?.id) {
    throw new Error("Uživatel není přihlášen.");
  }

  let q = supabase
    .from("images")
    .select("id, public_url, real_age_years, avg_guessed_age, aw_age_image, taken_at, photo_category, include_in_global_aw")
    .eq("uploader_user_id", user.id)
    .not("avg_guessed_age", "is", null);

  if (!includeExperimental) {
    q = q.eq("include_in_global_aw", true);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as RealVsGuessedRawRow[];
  if (rows.length === 0) return rows;

  const imageIds = rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0);
  const tagsByImageId = await loadImageTagsByImageId(imageIds);
  const enrichedRows = rows.map((row) => ({
    ...row,
    tags: normalizeStatsTags([...(tagsByImageId.get(Number(row.id)) ?? []), row.photo_category]),
  }));

  if (wantedTags.length === 0) return enrichedRows;

  const wanted = new Set(wantedTags);

  return enrichedRows.filter((row) => (row.tags ?? []).some((tag) => wanted.has(tag)));
}

async function loadImageTagsByImageId(imageIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (imageIds.length === 0) return out;

  const { data, error } = await supabase.from("image_tags").select("image_id, tag").in("image_id", imageIds);
  if (error) {
    if (error.message?.includes("Could not find the table 'public.image_tags'")) return out;
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const imageId = Number(row.image_id ?? 0);
    const tag = normalizeStatsTag(row.tag);
    if (!Number.isFinite(imageId) || imageId <= 0 || !tag) continue;
    out.set(imageId, [...(out.get(imageId) ?? []), tag]);
  }

  return out;
}

export async function getMyImageTagOptions(): Promise<ImageTagOption[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data: imageRows, error: imageError } = await supabase
    .from("images")
    .select("id, photo_category")
    .eq("uploader_user_id", user.id);

  if (imageError) throw new Error(imageError.message);

  const imageIds = ((imageRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => Number(row.id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  const counts = new Map<string, number>();
  for (const row of (imageRows ?? []) as Array<Record<string, unknown>>) {
    const tag = normalizeStatsTag(row.photo_category);
    if (tag && tag !== "bezna") counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const tagsByImageId = await loadImageTagsByImageId(imageIds);
  for (const tags of tagsByImageId.values()) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const challengeTags = new Map<string, string>();
  const { data: challengeRows, error: challengeError } = await supabase
    .from("aw_challenges")
    .select("title, challenge_tag")
    .eq("owner_user_id", user.id)
    .not("challenge_tag", "is", null);

  if (challengeError && !challengeError.message?.includes("Could not find the table 'public.aw_challenges'")) {
    throw new Error(challengeError.message);
  }

  for (const row of (challengeRows ?? []) as Array<Record<string, unknown>>) {
    const tag = normalizeStatsTag(row.challenge_tag);
    if (!tag) continue;
    challengeTags.set(tag, String(row.title ?? "Výzva"));
    if (!counts.has(tag)) counts.set(tag, 0);
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      predefined: Object.prototype.hasOwnProperty.call(PREDEFINED_TAG_LABELS, tag),
      label:
        PREDEFINED_TAG_LABELS[tag as Exclude<CategoryFilter, "all" | "bezna">] ??
        (challengeTags.has(tag) ? `#${tag} (výzva)` : tag),
    }))
    .sort((a, b) => Number(b.predefined) - Number(a.predefined) || b.count - a.count || a.label.localeCompare(b.label, "cs"));
}

export type DailyActivityRow = {
  day: string;
  login?: boolean;
  photos: number;
  albums?: number;
  comments: number;
  posts: number;
  ratings: number;
  imageLikesGiven: number;
  commentLikesGiven: number;
  imageLikesReceived: number;
  commentLikesReceived: number;
};

export async function getMyActivity50Days(): Promise<DailyActivityRow[]> {
  const { data, error } = await supabase.rpc("aw_user_activity_50_days");

  if (error) {
    console.error("aw_user_activity_50_days error:", error);
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    day: String(r.day ?? ""),
    photos: Number(r.photos ?? 0),
    comments: Number(r.comments ?? 0),
    posts: Number(r.posts ?? 0),
    ratings: Number(r.ratings ?? 0),
    imageLikesGiven: Number(r.image_likes_given ?? 0),
    commentLikesGiven: Number(r.comment_likes_given ?? 0),
    imageLikesReceived: Number(r.image_likes_received ?? 0),
    commentLikesReceived: Number(r.comment_likes_received ?? 0),
  }));
}

export type MyAwAgeCurrent = {
  real_age: number | null;
  aw_age: number | null;
  aw_delta_years: number | null;
  aw_delta_pct: number | null;
};

export type StatsHistoryView = "1m" | "1y";
export type TipCountHistoryView = "30d" | "1y" | "life";
export type AwScoreTrendGranularity = "daily" | "weekly" | "monthly";
export type TopPostMetric = "views" | "comments" | "likes" | "guesses";
export type TopPostSortDirection = "asc" | "desc";

export type StatsHistoryRow = {
  snapshot_date: string;
  aw_age: number | null;
  aw_score_norm_pct: number | null;
  avg_accuracy_pct: number | null;
  power_score: number | null;
};

export type TipCountHistoryPoint = {
  label: string;
  date: string;
  count: number;
};

export type GenerationAwPerceptionRow = {
  generation: string;
  bornRange: string;
  note: string | null;
  guesserCount: number;
  tipsCount: number;
  avgGuessedAge: number | null;
};

export type AwScoreTrendPoint = {
  label: string;
  date: string;
  awScoreNormPct: number | null;
};

export type TopAwInfluencePost = {
  postId: number;
  title: string;
  createdAt: string | null;
  imageCount: number;
  guessesCount: number;
  avgRealAge: number | null;
  avgAwAge: number | null;
  avgDeltaYears: number | null;
  influenceScore: number | null;
};

export type TopPostStatsRow = {
  postId: number;
  title: string;
  createdAt: string | null;
  imageCount: number;
  viewsCount: number;
  commentsCount: number;
  likesCount: number;
  guessesCount: number;
};

export async function getMyAwAgeCurrent(): Promise<MyAwAgeCurrent | null> {
  const { data, error } = await supabase.rpc("get_my_aw_age_current");

  if (error) {
    console.error("get_my_aw_age_current error:", error);
    throw new Error(error.message);
  }

  const normalized = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
  if (!normalized) return null;

  return {
    real_age: typeof normalized.real_age === "number" ? normalized.real_age : null,
    aw_age: typeof normalized.aw_age === "number" ? normalized.aw_age : null,
    aw_delta_years: typeof normalized.aw_delta_years === "number" ? normalized.aw_delta_years : null,
    aw_delta_pct: typeof normalized.aw_delta_pct === "number" ? normalized.aw_delta_pct : null,
  };
}

export async function getMyAwAgeCurrentSafe(): Promise<SafeResult<MyAwAgeCurrent>> {
  try {
    const data = await getMyAwAgeCurrent();
    return { data, errorMessage: null };
  } catch (e: unknown) {
    return { data: null, errorMessage: e instanceof Error ? e.message : "RPC error" };
  }
}

export type AwAgeTrajectoryView = "50d" | "1y" | "10y" | "life";

export type AwAgeTrajectoryRow = {
  point_date: string;
  real_age_at_point: number | null;
  aw_age_at_point: number | null;
  images_used: number;
};

export async function getMyAwAgeTrajectory(view: AwAgeTrajectoryView): Promise<AwAgeTrajectoryRow[]> {
  const { data, error } = await supabase.rpc("get_my_aw_age_trajectory", {
    p_view: view,
  });

  if (error) {
    console.error("get_my_aw_age_trajectory error:", error);
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    point_date: String(r.point_date ?? ""),
    real_age_at_point: typeof r.real_age_at_point === "number" ? r.real_age_at_point : null,
    aw_age_at_point: typeof r.aw_age_at_point === "number" ? r.aw_age_at_point : null,
    images_used: Number(r.images_used ?? 0),
  }));
}

export async function getMyAwAgeTrajectorySafe(view: AwAgeTrajectoryView): Promise<SafeResult<AwAgeTrajectoryRow[]>> {
  try {
    const data = await getMyAwAgeTrajectory(view);
    return { data, errorMessage: null };
  } catch (e: unknown) {
    return { data: null, errorMessage: e instanceof Error ? e.message : "RPC error" };
  }
}

function formatSnapshotDateLocal(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHistoryRangeStart(view: StatsHistoryView, now = new Date()) {
  const start = new Date(now);
  if (view === "1m") {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }
  return formatSnapshotDateLocal(start);
}

function getTipCountRangeStart(view: TipCountHistoryView, now = new Date()) {
  if (view === "life") return null;

  const start = new Date(now);
  if (view === "30d") {
    start.setDate(start.getDate() - 29);
  } else {
    start.setFullYear(start.getFullYear() - 1);
  }
  return formatSnapshotDateLocal(start);
}

function formatDateLabel(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

function formatMonthLabel(year: number, monthIndex: number) {
  return `${String(monthIndex + 1).padStart(2, "0")}/${year}`;
}

function getIsoWeekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getGenerationForBirthYear(year: number): Omit<GenerationAwPerceptionRow, "guesserCount" | "tipsCount" | "avgGuessedAge"> | null {
  if (year >= 1928 && year <= 1945) {
    return { generation: "Tichá generace", bornRange: "nar. cca 1928-1945", note: null };
  }
  if (year >= 1946 && year <= 1964) {
    return { generation: "Boomers", bornRange: "nar. cca 1946-1964", note: null };
  }
  if (year >= 1965 && year <= 1980) {
    return {
      generation: "Generace X",
      bornRange: "nar. cca 1965-1980",
      note: "Vyrůstali za socialismu, dospělost po revoluci.",
    };
  }
  if (year >= 1981 && year <= 1996) {
    return { generation: "Generace Y (Milleniálové)", bornRange: "nar. cca 1981-1996", note: null };
  }
  if (year >= 1997 && year <= 2012) {
    return { generation: "Generace Z", bornRange: "nar. cca 1997-2012", note: null };
  }
  return null;
}

export async function upsertMyStatsHistorySnapshot(input: {
  awAge: number | null;
  awScoreNormPct: number | null;
  avgAccuracyPct: number | null;
  powerScore: number | null;
  snapshotDate?: string;
}): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const payload = {
    user_id: user.id,
    snapshot_date: input.snapshotDate ?? formatSnapshotDateLocal(),
    aw_age: typeof input.awAge === "number" && Number.isFinite(input.awAge) ? input.awAge : null,
    aw_score_norm_pct:
      typeof input.awScoreNormPct === "number" && Number.isFinite(input.awScoreNormPct) ? input.awScoreNormPct : null,
    avg_accuracy_pct:
      typeof input.avgAccuracyPct === "number" && Number.isFinite(input.avgAccuracyPct) ? input.avgAccuracyPct : null,
    power_score: typeof input.powerScore === "number" && Number.isFinite(input.powerScore) ? input.powerScore : null,
  };

  const { error } = await supabase
    .from("aw_user_stats_history")
    .upsert(payload, { onConflict: "user_id,snapshot_date" });

  if (error) throw new Error(error.message);
}

export async function getMyStatsHistory(view: StatsHistoryView): Promise<StatsHistoryRow[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const startDate = getHistoryRangeStart(view);

  const { data, error } = await supabase
    .from("aw_user_stats_history")
    .select("snapshot_date, aw_age, aw_score_norm_pct, avg_accuracy_pct, power_score")
    .eq("user_id", user.id)
    .gte("snapshot_date", startDate)
    .order("snapshot_date", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    snapshot_date: String(row.snapshot_date ?? ""),
    aw_age: typeof row.aw_age === "number" ? row.aw_age : row.aw_age == null ? null : Number(row.aw_age),
    aw_score_norm_pct:
      typeof row.aw_score_norm_pct === "number"
        ? row.aw_score_norm_pct
        : row.aw_score_norm_pct == null
          ? null
          : Number(row.aw_score_norm_pct),
    avg_accuracy_pct:
      typeof row.avg_accuracy_pct === "number"
        ? row.avg_accuracy_pct
        : row.avg_accuracy_pct == null
          ? null
          : Number(row.avg_accuracy_pct),
    power_score:
      typeof row.power_score === "number" ? row.power_score : row.power_score == null ? null : Number(row.power_score),
  }));
}

export async function getMyTipCountHistory(view: TipCountHistoryView): Promise<TipCountHistoryPoint[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const startDate = getTipCountRangeStart(view);

  let query = supabase
    .from("age_guesses")
    .select("created_at")
    .eq("guesser_user_id", user.id)
    .order("created_at", { ascending: true });

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const createdAt = String(row.created_at ?? "");
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const key =
      view === "30d"
        ? createdAt.slice(0, 10)
        : view === "1y"
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          : String(date.getFullYear());

    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({
    date,
    label:
      view === "30d"
        ? formatDateLabel(date)
        : view === "1y"
          ? formatMonthLabel(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1)
          : date,
    count,
  }));
}

export async function getMyGenerationAwPerception(): Promise<GenerationAwPerceptionRow[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data: imageRows, error: imageError } = await supabase.from("images").select("id").eq("uploader_user_id", user.id);
  if (imageError) throw new Error(imageError.message);

  const imageIds = ((imageRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => Number(row.id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (imageIds.length === 0) return [];

  const { data: guessRows, error: guessError } = await supabase
    .from("age_guesses")
    .select("guesser_user_id, guessed_age")
    .in("image_id", imageIds);

  if (guessError) throw new Error(guessError.message);

  const guesses = ((guessRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      guesserUserId: String(row.guesser_user_id ?? ""),
      guessedAge: Number(row.guessed_age ?? NaN),
    }))
    .filter((row) => row.guesserUserId && Number.isFinite(row.guessedAge));

  const guesserUserIds = Array.from(new Set(guesses.map((row) => row.guesserUserId)));
  if (guesserUserIds.length === 0) return [];

  const { data: profileRows, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, date_of_birth")
    .in("user_id", guesserUserIds);

  if (profileError) throw new Error(profileError.message);

  const birthYearByUserId = new Map<string, number>();
  for (const row of (profileRows ?? []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id ?? "");
    const year = Number(String(row.date_of_birth ?? "").slice(0, 4));
    if (userId && Number.isFinite(year)) birthYearByUserId.set(userId, year);
  }

  const order = ["Tichá generace", "Boomers", "Generace X", "Generace Y (Milleniálové)", "Generace Z"];
  const grouped = new Map<string, { meta: Omit<GenerationAwPerceptionRow, "guesserCount" | "tipsCount" | "avgGuessedAge">; users: Set<string>; sum: number; tips: number }>();

  for (const guess of guesses) {
    const birthYear = birthYearByUserId.get(guess.guesserUserId);
    if (!birthYear) continue;

    const meta = getGenerationForBirthYear(birthYear);
    if (!meta) continue;

    const current = grouped.get(meta.generation) ?? { meta, users: new Set<string>(), sum: 0, tips: 0 };
    current.users.add(guess.guesserUserId);
    current.sum += guess.guessedAge;
    current.tips += 1;
    grouped.set(meta.generation, current);
  }

  return order.map((generation) => {
    const row = grouped.get(generation);
    const meta =
      row?.meta ??
      ({
        "Tichá generace": { generation, bornRange: "nar. cca 1928-1945", note: null },
        Boomers: { generation, bornRange: "nar. cca 1946-1964", note: null },
        "Generace X": {
          generation,
          bornRange: "nar. cca 1965-1980",
          note: "Vyrůstali za socialismu, dospělost po revoluci.",
        },
        "Generace Y (Milleniálové)": { generation, bornRange: "nar. cca 1981-1996", note: null },
        "Generace Z": { generation, bornRange: "nar. cca 1997-2012", note: null },
      }[generation] as Omit<GenerationAwPerceptionRow, "guesserCount" | "tipsCount" | "avgGuessedAge">);

    return {
      ...meta,
      guesserCount: row?.users.size ?? 0,
      tipsCount: row?.tips ?? 0,
      avgGuessedAge: row && row.tips > 0 ? row.sum / row.tips : null,
    };
  });
}

export async function getMyAwScoreTrend(granularity: AwScoreTrendGranularity): Promise<AwScoreTrendPoint[]> {
  const rows = await getMyStatsHistory(granularity === "daily" ? "1m" : "1y");

  if (granularity === "daily") {
    return rows.map((row) => ({
      date: row.snapshot_date,
      label: formatDateLabel(row.snapshot_date),
      awScoreNormPct: row.aw_score_norm_pct,
    }));
  }

  const grouped = new Map<string, { label: string; date: string; sum: number; count: number }>();
  for (const row of rows) {
    if (typeof row.aw_score_norm_pct !== "number" || !Number.isFinite(row.aw_score_norm_pct)) continue;
    const date = new Date(row.snapshot_date);
    if (Number.isNaN(date.getTime())) continue;

    const key =
      granularity === "weekly"
        ? getIsoWeekKey(date)
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = granularity === "weekly" ? key.replace("-W", " / ") : formatMonthLabel(date.getFullYear(), date.getMonth());
    const current = grouped.get(key) ?? { label, date: row.snapshot_date, sum: 0, count: 0 };
    current.sum += row.aw_score_norm_pct;
    current.count += 1;
    current.date = row.snapshot_date;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((row) => ({
    label: row.label,
    date: row.date,
    awScoreNormPct: row.count > 0 ? row.sum / row.count : null,
  }));
}

export async function getMyTopPostsByMetric(
  metric: TopPostMetric,
  direction: TopPostSortDirection = "desc",
  limit = 10
): Promise<TopPostStatsRow[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data: postRows, error: postError } = await supabase
    .from("posts")
    .select("id, title, created_at")
    .eq("author_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (postError) throw new Error(postError.message);

  const posts = ((postRows ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      postId: Number(row.id ?? 0),
      title: String(row.title ?? "").trim(),
      createdAt: row.created_at ? String(row.created_at) : null,
    }))
    .filter((post) => Number.isFinite(post.postId) && post.postId > 0);

  if (posts.length === 0) return [];

  const postIds = posts.map((post) => post.postId);
  const { data: relRows, error: relError } = await supabase.from("post_images").select("post_id, image_id").in("post_id", postIds);
  if (relError) throw new Error(relError.message);

  const imageIdsByPostId = new Map<number, number[]>();
  const imageIdToPostIds = new Map<number, number[]>();
  for (const row of (relRows ?? []) as Array<Record<string, unknown>>) {
    const postId = Number(row.post_id ?? 0);
    const imageId = Number(row.image_id ?? 0);
    if (!Number.isFinite(postId) || postId <= 0 || !Number.isFinite(imageId) || imageId <= 0) continue;
    imageIdsByPostId.set(postId, [...(imageIdsByPostId.get(postId) ?? []), imageId]);
    imageIdToPostIds.set(imageId, [...(imageIdToPostIds.get(imageId) ?? []), postId]);
  }

  const imageIds = Array.from(imageIdToPostIds.keys());
  const guessesByImageId = new Map<number, number>();
  const likesByPostId = new Map<number, number>();
  const imageCommentsByPostId = new Map<number, number>();
  const postCommentsByPostId = new Map<number, number>();

  if (imageIds.length > 0) {
    const { data: imageRows, error: imageError } = await supabase.from("images").select("id, guesses_count").in("id", imageIds);
    if (imageError) throw new Error(imageError.message);

    for (const row of (imageRows ?? []) as Array<Record<string, unknown>>) {
      const imageId = Number(row.id ?? 0);
      const guessesCount = Number(row.guesses_count ?? 0);
      if (Number.isFinite(imageId) && imageId > 0) guessesByImageId.set(imageId, Number.isFinite(guessesCount) ? guessesCount : 0);
    }

    const { data: likeRows, error: likeError } = await supabase.from("image_likes").select("image_id").in("image_id", imageIds);
    if (likeError) throw new Error(likeError.message);

    for (const row of (likeRows ?? []) as Array<Record<string, unknown>>) {
      const imageId = Number(row.image_id ?? 0);
      const postIdsForImage = imageIdToPostIds.get(imageId) ?? [];
      for (const postId of postIdsForImage) {
        likesByPostId.set(postId, (likesByPostId.get(postId) ?? 0) + 1);
      }
    }

    const { data: imageCommentRows, error: imageCommentError } = await supabase
      .from("comments")
      .select("image_id")
      .in("image_id", imageIds)
      .eq("is_deleted", false)
      .eq("is_hidden_by_moderation", false);
    if (imageCommentError) throw new Error(imageCommentError.message);

    for (const row of (imageCommentRows ?? []) as Array<Record<string, unknown>>) {
      const imageId = Number(row.image_id ?? 0);
      const postIdsForImage = imageIdToPostIds.get(imageId) ?? [];
      for (const postId of postIdsForImage) {
        imageCommentsByPostId.set(postId, (imageCommentsByPostId.get(postId) ?? 0) + 1);
      }
    }
  }

  const { data: postCommentRows, error: postCommentError } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds)
    .eq("is_deleted", false)
    .eq("is_hidden_by_moderation", false);
  if (postCommentError) throw new Error(postCommentError.message);

  for (const row of (postCommentRows ?? []) as Array<Record<string, unknown>>) {
    const postId = Number(row.post_id ?? 0);
    if (Number.isFinite(postId) && postId > 0) postCommentsByPostId.set(postId, (postCommentsByPostId.get(postId) ?? 0) + 1);
  }

  return posts
    .map((post) => {
      const postImageIds = imageIdsByPostId.get(post.postId) ?? [];
      const guessesCount = postImageIds.reduce((sum, imageId) => sum + (guessesByImageId.get(imageId) ?? 0), 0);
      const commentsCount = (postCommentsByPostId.get(post.postId) ?? 0) + (imageCommentsByPostId.get(post.postId) ?? 0);

      return {
        ...post,
        title: post.title || `Příspěvek #${post.postId}`,
        imageCount: postImageIds.length,
        viewsCount: 0,
        commentsCount,
        likesCount: likesByPostId.get(post.postId) ?? 0,
        guessesCount,
      };
    })
    .sort((a, b) => {
      const key =
        metric === "views"
          ? "viewsCount"
          : metric === "comments"
            ? "commentsCount"
            : metric === "likes"
              ? "likesCount"
              : "guessesCount";
      const metricSort = direction === "asc" ? a[key] - b[key] : b[key] - a[key];
      return metricSort || new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    })
    .slice(0, limit);
}

export async function getMyTopAwInfluencePosts(limit = 8): Promise<TopAwInfluencePost[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data: postRows, error: postError } = await supabase
    .from("posts")
    .select("id, title, created_at")
    .eq("author_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (postError) throw new Error(postError.message);

  const posts = ((postRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id ?? 0),
    title: String(row.title ?? "").trim(),
    createdAt: row.created_at ? String(row.created_at) : null,
  }));

  const postIds = posts.map((post) => post.id).filter((id) => Number.isFinite(id) && id > 0);
  if (postIds.length === 0) return [];

  const { data: relRows, error: relError } = await supabase.from("post_images").select("post_id, image_id").in("post_id", postIds);
  if (relError) throw new Error(relError.message);

  const imageIds = Array.from(
    new Set(
      ((relRows ?? []) as Array<Record<string, unknown>>)
        .map((row) => Number(row.image_id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );

  if (imageIds.length === 0) return [];

  const { data: imageRows, error: imageError } = await supabase
    .from("images")
    .select("id, real_age_years, aw_age_image, avg_guessed_age, guesses_count, include_in_global_aw")
    .in("id", imageIds);

  if (imageError) throw new Error(imageError.message);

  const imageById = new Map<number, Record<string, unknown>>();
  for (const row of (imageRows ?? []) as Array<Record<string, unknown>>) {
    const id = Number(row.id ?? 0);
    if (Number.isFinite(id) && id > 0) imageById.set(id, row);
  }

  const postById = new Map(posts.map((post) => [post.id, post]));
  const grouped = new Map<number, { imageCount: number; guessesCount: number; sumReal: number; sumAw: number; usableImages: number }>();

  for (const rel of (relRows ?? []) as Array<Record<string, unknown>>) {
    const postId = Number(rel.post_id ?? 0);
    const imageId = Number(rel.image_id ?? 0);
    const image = imageById.get(imageId);
    if (!postById.has(postId) || !image) continue;
    if (image.include_in_global_aw === false) continue;

    const realAge = Number(image.real_age_years ?? NaN);
    const awAge = Number(image.aw_age_image ?? image.avg_guessed_age ?? NaN);
    const guessesCount = Number(image.guesses_count ?? 0);

    const current = grouped.get(postId) ?? { imageCount: 0, guessesCount: 0, sumReal: 0, sumAw: 0, usableImages: 0 };
    current.imageCount += 1;
    current.guessesCount += Number.isFinite(guessesCount) ? guessesCount : 0;

    if (Number.isFinite(realAge) && Number.isFinite(awAge)) {
      current.sumReal += realAge;
      current.sumAw += awAge;
      current.usableImages += 1;
    }

    grouped.set(postId, current);
  }

  return Array.from(grouped.entries())
    .map(([postId, values]) => {
      const post = postById.get(postId);
      const avgRealAge = values.usableImages > 0 ? values.sumReal / values.usableImages : null;
      const avgAwAge = values.usableImages > 0 ? values.sumAw / values.usableImages : null;
      const avgDeltaYears = avgRealAge != null && avgAwAge != null ? avgAwAge - avgRealAge : null;
      const influenceScore = avgDeltaYears != null ? Math.abs(avgDeltaYears) * Math.max(1, values.guessesCount) : null;

      return {
        postId,
        title: post?.title || `Příspěvek #${postId}`,
        createdAt: post?.createdAt ?? null,
        imageCount: values.imageCount,
        guessesCount: values.guessesCount,
        avgRealAge,
        avgAwAge,
        avgDeltaYears,
        influenceScore,
      };
    })
    .sort((a, b) => (b.influenceScore ?? -1) - (a.influenceScore ?? -1))
    .slice(0, limit);
}
