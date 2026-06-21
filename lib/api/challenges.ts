/**
 * File purpose
 * - API helpers for AW challenges
 * - Persist challenge baseline/target values without changing AW score rules
 * - Used by /my-albums first challenge creation UI
 */

import { supabase } from "@/lib/supabaseClient";

export type AwChallengeVisibility = "private" | "contacts" | "everyone";
export type AwChallengePrivateGoalVisibility = "private" | "everyone";
export type AwChallengePhotoScope = "auto_period" | "challenge_tag";
export type AwChallengeStatus = "draft" | "active" | "completed" | "missed" | "extended" | "cancelled" | "archived";

export type AwChallenge = {
  id: string;
  owner_user_id: string;
  title: string;
  public_message: string | null;
  private_goal: string | null;
  private_goal_visibility: AwChallengePrivateGoalVisibility;
  visibility: AwChallengeVisibility;
  status: AwChallengeStatus;
  start_date: string;
  target_date_original: string;
  target_date_current: string;
  baseline_aw_score_norm_pct: number | null;
  target_aw_score_norm_pct: number;
  photo_scope: AwChallengePhotoScope;
  challenge_tag: string | null;
  include_experimental_images: boolean;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  completed_at: string | null;
  extended_at: string | null;
  private_goal_published_at: string | null;
};

export type CreateAwChallengeInput = {
  title: string;
  publicMessage?: string;
  privateGoal?: string;
  privateGoalVisibility: AwChallengePrivateGoalVisibility;
  visibility: AwChallengeVisibility;
  startDate: string;
  targetDate: string;
  baselineAwScoreNormPct: number | null;
  targetAwScoreNormPct: number;
  photoScope: AwChallengePhotoScope;
  challengeTag?: string | null;
  includeExperimentalImages?: boolean;
};

export type UpdateAwChallengeInput = {
  id: string;
  title: string;
  privateGoal?: string;
  privateGoalVisibility: AwChallengePrivateGoalVisibility;
  visibility: AwChallengeVisibility;
  targetDateCurrent: string;
  includeExperimentalImages?: boolean;
};

export type CreateAwChallengeTagInput = {
  challengeId: string;
  challengeTag: string;
  switchToChallengeTagScope?: boolean;
};

export type PublicAwChallenge = AwChallenge & {
  owner?: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type AwChallengeStatsRow = {
  challenge: AwChallenge;
  imageCount: number;
  postCount: number;
  daysTotal: number | null;
  daysElapsed: number | null;
  daysRemaining: number | null;
};

export function normalizeAwChallengeTag(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^#+/g, "")
    .replace(/[^a-z0-9_ -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function assertMyChallengeTagIsUnique(tag: string, exceptChallengeId?: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  let query = supabase
    .from("aw_challenges")
    .select("id")
    .eq("owner_user_id", user.id)
    .ilike("challenge_tag", tag);

  if (exceptChallengeId) query = query.neq("id", exceptChallengeId);

  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  if ((data ?? []).length > 0) throw new Error("Tenhle tag výzvy už používáš. Zvol jiný.");
}

export async function createAwChallenge(input: CreateAwChallengeInput): Promise<AwChallenge> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const title = input.title.trim();
  if (!title) throw new Error("Doplň název výzvy.");
  if (!input.targetDate) throw new Error("Doplň termín výzvy.");
  if (!Number.isFinite(input.targetAwScoreNormPct)) throw new Error("Doplň platné cílové AW skóre.");

  const challengeTag = input.photoScope === "challenge_tag" ? normalizeAwChallengeTag(input.challengeTag) : null;
  if (input.photoScope === "challenge_tag") {
    if (!challengeTag) throw new Error("Doplň tag výzvy.");
    await assertMyChallengeTagIsUnique(challengeTag);
  }

  const payload = {
    owner_user_id: user.id,
    title,
    public_message: input.publicMessage?.trim() || null,
    private_goal: input.privateGoal?.trim() || null,
    private_goal_visibility: input.privateGoalVisibility,
    visibility: input.visibility,
    status: "active" satisfies AwChallengeStatus,
    start_date: input.startDate,
    target_date_original: input.targetDate,
    target_date_current: input.targetDate,
    baseline_aw_score_norm_pct: input.baselineAwScoreNormPct,
    target_aw_score_norm_pct: input.targetAwScoreNormPct,
    photo_scope: input.photoScope,
    challenge_tag: challengeTag,
    include_experimental_images: input.photoScope === "auto_period" ? Boolean(input.includeExperimentalImages) : false,
  };

  const { data, error } = await supabase.from("aw_challenges").insert(payload).select("*").single();

  if (error) {
    if (error.message.includes("aw_challenges_dates_check")) {
      throw new Error("Termín výzvy nemůže být v minulosti. Vyber dnešní nebo budoucí datum.");
    }
    throw new Error(error.message);
  }
  return data as AwChallenge;
}

export async function listMyAwChallenges(): Promise<AwChallenge[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data, error } = await supabase
    .from("aw_challenges")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AwChallenge[];
}

function diffDays(from: string | null | undefined, to: string | null | undefined) {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export async function listMyAwChallengeStats(): Promise<AwChallengeStatsRow[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const challenges = await listMyAwChallenges();
  if (challenges.length === 0) return [];

  const { data: images, error: imageError } = await supabase
    .from("images")
    .select("id, taken_at, include_in_global_aw")
    .eq("uploader_user_id", user.id);

  if (imageError) throw new Error(imageError.message);

  const imageRows = (images ?? []) as Array<Record<string, unknown>>;
  const imageIds = imageRows
    .map((row) => Number(row.id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  const tagsByImageId = new Map<number, Set<string>>();
  if (imageIds.length > 0) {
    const { data: tagRows, error: tagError } = await supabase
      .from("image_tags")
      .select("image_id, tag")
      .in("image_id", imageIds);

    if (tagError && !tagError.message?.includes("Could not find the table 'public.image_tags'")) {
      throw new Error(tagError.message);
    }

    for (const row of (tagRows ?? []) as Array<Record<string, unknown>>) {
      const imageId = Number(row.image_id ?? 0);
      const tag = normalizeAwChallengeTag(row.tag);
      if (!Number.isFinite(imageId) || imageId <= 0 || !tag) continue;
      const current = tagsByImageId.get(imageId) ?? new Set<string>();
      current.add(tag);
      tagsByImageId.set(imageId, current);
    }
  }

  const postIdsByImageId = new Map<number, Set<number>>();
  if (imageIds.length > 0) {
    const { data: postRows, error: postError } = await supabase
      .from("post_images")
      .select("post_id, image_id")
      .in("image_id", imageIds);

    if (postError) throw new Error(postError.message);

    for (const row of (postRows ?? []) as Array<Record<string, unknown>>) {
      const imageId = Number(row.image_id ?? 0);
      const postId = Number(row.post_id ?? 0);
      if (!Number.isFinite(imageId) || imageId <= 0 || !Number.isFinite(postId) || postId <= 0) continue;
      const current = postIdsByImageId.get(imageId) ?? new Set<number>();
      current.add(postId);
      postIdsByImageId.set(imageId, current);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return challenges.map((challenge) => {
    const matchedImageIds = new Set<number>();

    for (const row of imageRows) {
      const imageId = Number(row.id ?? 0);
      if (!Number.isFinite(imageId) || imageId <= 0) continue;

      if (challenge.photo_scope === "challenge_tag") {
        const tag = normalizeAwChallengeTag(challenge.challenge_tag);
        if (tag && tagsByImageId.get(imageId)?.has(tag)) matchedImageIds.add(imageId);
        continue;
      }

      const takenAt = String(row.taken_at ?? "").slice(0, 10);
      if (!takenAt || takenAt < challenge.start_date || takenAt > challenge.target_date_current) continue;
      const isExperimental = row.include_in_global_aw === false;
      if (isExperimental && !challenge.include_experimental_images) continue;
      matchedImageIds.add(imageId);
    }

    const matchedPostIds = new Set<number>();
    for (const imageId of matchedImageIds) {
      for (const postId of postIdsByImageId.get(imageId) ?? []) matchedPostIds.add(postId);
    }

    return {
      challenge,
      imageCount: matchedImageIds.size,
      postCount: matchedPostIds.size,
      daysTotal: diffDays(challenge.start_date, challenge.target_date_current),
      daysElapsed: today <= challenge.start_date ? 0 : diffDays(challenge.start_date, today),
      daysRemaining: today >= challenge.target_date_current ? 0 : diffDays(today, challenge.target_date_current),
    };
  });
}

export async function updateAwChallenge(input: UpdateAwChallengeInput): Promise<AwChallenge> {
  const title = input.title.trim();
  if (!title) throw new Error("Doplň název výzvy.");
  if (!input.targetDateCurrent) throw new Error("Doplň termín výzvy.");

  const { data, error } = await supabase
    .from("aw_challenges")
    .update({
      title,
      private_goal: input.privateGoal?.trim() || null,
      private_goal_visibility: input.privateGoalVisibility,
      visibility: input.visibility,
      target_date_current: input.targetDateCurrent,
      include_experimental_images: Boolean(input.includeExperimentalImages),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("aw_challenge_target_date_can_only_extend")) {
      throw new Error("Termín aktivní výzvy můžeš jen prodloužit, ne zkrátit.");
    }
    if (error.message.includes("aw_challenge_immutable_after_activation")) {
      throw new Error("Tuhle část aktivní výzvy už nejde zpětně změnit.");
    }
    throw new Error(error.message);
  }

  return data as AwChallenge;
}

export async function getAwChallengeById(challengeId: string): Promise<PublicAwChallenge | null> {
  const id = challengeId.trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from("aw_challenges")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  const challenge = data as AwChallenge;
  const { data: owner } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", challenge.owner_user_id)
    .maybeSingle();

  return { ...challenge, owner: owner ?? null } as PublicAwChallenge;
}

export async function applyAwChallengeTagToPostImages(input: {
  challengeId: string;
  postId: number;
}): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Uživatel není přihlášen.");

  const { data: challenge, error: challengeError } = await supabase
    .from("aw_challenges")
    .select("id, owner_user_id, photo_scope, challenge_tag")
    .eq("id", input.challengeId)
    .eq("owner_user_id", user.id)
    .single();

  if (challengeError) throw new Error(challengeError.message);

  const tag = String(challenge?.challenge_tag ?? "").trim();
  if (!tag) throw new Error("Výzva zatím nemá vytvořený tag.");
  if (challenge?.photo_scope !== "challenge_tag") {
    throw new Error("Tag lze hromadně použít jen u výzvy s rozsahem přes tag.");
  }

  const { data: postImages, error: relError } = await supabase
    .from("post_images")
    .select("image_id")
    .eq("post_id", input.postId);

  if (relError) throw new Error(relError.message);

  const imageIds = ((postImages ?? []) as Array<Record<string, unknown>>)
    .map((row) => Number(row.image_id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (imageIds.length === 0) return 0;

  const { data: ownedImages, error: imageError } = await supabase
    .from("images")
    .select("id")
    .eq("uploader_user_id", user.id)
    .in("id", imageIds);

  if (imageError) throw new Error(imageError.message);

  const rows = ((ownedImages ?? []) as Array<Record<string, unknown>>)
    .map((row) => Number(row.id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((imageId) => ({ image_id: imageId, tag }));

  if (rows.length === 0) return 0;

  const { error: tagError } = await supabase
    .from("image_tags")
    .upsert(rows, { onConflict: "image_id,tag", ignoreDuplicates: true });

  if (tagError) throw new Error(tagError.message);

  return rows.length;
}

export async function createAwChallengeTag(input: CreateAwChallengeTagInput): Promise<AwChallenge> {
  const tag = normalizeAwChallengeTag(input.challengeTag);
  if (!tag) throw new Error("Tag výzvy nemůže být prázdný.");

  const { data, error } = await supabase
    .from("aw_challenges")
    .update({
      challenge_tag: tag,
      ...(input.switchToChallengeTagScope ? { photo_scope: "challenge_tag" satisfies AwChallengePhotoScope } : {}),
    })
    .eq("id", input.challengeId)
    .is("challenge_tag", null)
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("aw_challenge_immutable_after_activation")) {
      throw new Error("Tag lze vytvořit jen tehdy, pokud výzva ještě žádný tag nemá.");
    }
    throw new Error(error.message);
  }

  return data as AwChallenge;
}
