/**
 * File purpose
 * - Manage image reactions used in My Tips.
 * Main responsibilities
 * - Load reaction summaries and current-user reaction choices.
 * - Toggle or change current-user reaction for a photo.
 * Related APIs, components, or modules
 * - supabase/migrations/20260410_notification_preferences_and_image_likes.sql
 * - app/my-tips/page.tsx
 */

import { supabase } from "@/lib/supabaseClient";

export type ImageReactionKey = "like" | "clap" | "care" | "love" | "insight" | "fun";

export type ImageReactionSummary = {
  total: number;
  byReaction: Partial<Record<ImageReactionKey, number>>;
  recentUserNames: string[];
};

export type ImageReactionDetail = {
  imageId: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  reaction: ImageReactionKey;
  createdAt: string | null;
};

const IMAGE_REACTION_SCHEMA_STORAGE_KEY = "aw:image-reactions:reaction-column-unavailable";

async function getAuthUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("Musíš být přihlášen/a.");
  return user.id;
}

function toImageIds(imageIds: number[]) {
  return Array.from(new Set(imageIds.map((id) => Math.trunc(Number(id))).filter((id) => Number.isFinite(id) && id > 0)));
}

function asReactionKey(value: unknown): ImageReactionKey | null {
  const safe = String(value ?? "");
  if (safe === "like" || safe === "clap" || safe === "care" || safe === "love" || safe === "insight" || safe === "fun") {
    return safe;
  }
  return null;
}

function isReactionColumnSchemaError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return message.includes("image_likes.reaction") || (message.includes("image_likes") && message.includes("reaction"));
}

function reactionFallbackErrorMessage() {
  return "Rozsirene reakce se jeste nepodarilo zpristupnit. Zkus stranku za chvili obnovit.";
}

function isDuplicateImageLikeError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return message.includes("duplicate key value") && message.includes("image_likes_pkey");
}

function isReactionColumnUnavailableCached() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(IMAGE_REACTION_SCHEMA_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberReactionColumnUnavailable() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(IMAGE_REACTION_SCHEMA_STORAGE_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
}

function clearRememberedReactionColumnUnavailable() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(IMAGE_REACTION_SCHEMA_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

async function loadReactionRows(imageIds: number[]) {
  if (!isReactionColumnUnavailableCached()) {
    const withReaction = await supabase
      .from("image_likes")
      .select("image_id, reaction, user_id, created_at")
      .in("image_id", imageIds);

    if (!withReaction.error) {
      clearRememberedReactionColumnUnavailable();
      return withReaction.data ?? [];
    }

    if (!isReactionColumnSchemaError(withReaction.error)) {
      throw withReaction.error;
    }

    rememberReactionColumnUnavailable();
  }

  const fallback = await supabase.from("image_likes").select("image_id, user_id, created_at").in("image_id", imageIds);
  if (fallback.error) throw fallback.error;
  return fallback.data ?? [];
}

async function loadMyReactionRows(imageIds: number[], userId: string) {
  if (!isReactionColumnUnavailableCached()) {
    const withReaction = await supabase
      .from("image_likes")
      .select("image_id, reaction")
      .eq("user_id", userId)
      .in("image_id", imageIds);

    if (!withReaction.error) {
      clearRememberedReactionColumnUnavailable();
      return withReaction.data ?? [];
    }

    if (!isReactionColumnSchemaError(withReaction.error)) {
      throw withReaction.error;
    }

    rememberReactionColumnUnavailable();
  }

  const fallback = await supabase.from("image_likes").select("image_id").eq("user_id", userId).in("image_id", imageIds);
  if (fallback.error) throw fallback.error;
  return fallback.data ?? [];
}

export async function getImageReactionSummary(imageIds: number[]): Promise<Record<number, ImageReactionSummary>> {
  const ids = toImageIds(imageIds);
  if (ids.length === 0) return {};

  const data = await loadReactionRows(ids);

  const userIds = Array.from(
    new Set((data ?? []).map((row) => String((row as Record<string, unknown>).user_id ?? "")).filter(Boolean))
  );
  const { data: profileRows, error: profileError } = userIds.length
    ? await supabase.from("user_profiles").select("user_id, display_name").in("user_id", userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;

  const profileNameById = new Map<string, string>();
  for (const row of (profileRows ?? []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id ?? "");
    const displayName = String(row.display_name ?? "").trim();
    if (userId && displayName) profileNameById.set(userId, displayName);
  }

  const counts: Record<number, ImageReactionSummary> = {};
  const orderedRows = [...(data ?? [])].sort((a, b) => {
    const aTime = new Date(String((a as Record<string, unknown>).created_at ?? "")).getTime();
    const bTime = new Date(String((b as Record<string, unknown>).created_at ?? "")).getTime();
    return Number.isFinite(bTime) && Number.isFinite(aTime) ? bTime - aTime : 0;
  });

  for (const row of orderedRows) {
    const imageId = Number((row as Record<string, unknown>).image_id ?? 0);
    const reaction = asReactionKey((row as Record<string, unknown>).reaction) ?? "like";
    const userId = String((row as Record<string, unknown>).user_id ?? "");
    const displayName = profileNameById.get(userId) ?? "";
    if (!Number.isFinite(imageId) || imageId <= 0) continue;
    const current = counts[imageId] ?? { total: 0, byReaction: {}, recentUserNames: [] };
    current.total += 1;
    current.byReaction[reaction] = (current.byReaction[reaction] ?? 0) + 1;
    if (displayName && !current.recentUserNames.includes(displayName) && current.recentUserNames.length < 2) {
      current.recentUserNames.push(displayName);
    }
    counts[imageId] = current;
  }

  return counts;
}

export async function getImageReactionDetails(imageId: number): Promise<ImageReactionDetail[]> {
  const normalizedImageId = Math.trunc(Number(imageId));
  if (!Number.isFinite(normalizedImageId) || normalizedImageId <= 0) return [];

  const currentUserId = await getAuthUserId();
  const rows = await loadReactionRows([normalizedImageId]);
  const userIds = Array.from(
    new Set(rows.map((row) => String((row as Record<string, unknown>).user_id ?? "")).filter(Boolean))
  );

  const [connectionsA, connectionsB] = userIds.length
    ? await Promise.all([
        supabase
          .from("connections")
          .select("user_id_b")
          .eq("status", "accepted")
          .eq("user_id_a", currentUserId)
          .in("user_id_b", userIds),
        supabase
          .from("connections")
          .select("user_id_a")
          .eq("status", "accepted")
          .eq("user_id_b", currentUserId)
          .in("user_id_a", userIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (connectionsA.error) throw connectionsA.error;
  if (connectionsB.error) throw connectionsB.error;

  const connectedUserIds = new Set<string>([
    ...(connectionsA.data ?? []).map((row) => String((row as Record<string, unknown>).user_id_b ?? "")).filter(Boolean),
    ...(connectionsB.data ?? []).map((row) => String((row as Record<string, unknown>).user_id_a ?? "")).filter(Boolean),
  ]);

  const { data: profileRows, error: profileError } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url, bio, bio_contacts, bio_contacts_hidden")
        .in("user_id", userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;

  const profileById = new Map<
    string,
    {
      displayName: string | null;
      avatarUrl: string | null;
      bio: string | null;
      bioContacts: string | null;
      bioContactsHidden: boolean;
    }
  >();
  for (const row of (profileRows ?? []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id ?? "");
    if (!userId) continue;
    profileById.set(userId, {
      displayName: row.display_name ? String(row.display_name) : null,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      bio: row.bio ? String(row.bio) : null,
      bioContacts: row.bio_contacts ? String(row.bio_contacts) : null,
      bioContactsHidden: Boolean(row.bio_contacts_hidden),
    });
  }

  return [...rows]
    .sort((a, b) => {
      const aTime = new Date(String((a as Record<string, unknown>).created_at ?? "")).getTime();
      const bTime = new Date(String((b as Record<string, unknown>).created_at ?? "")).getTime();
      return Number.isFinite(bTime) && Number.isFinite(aTime) ? bTime - aTime : 0;
    })
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = String(record.user_id ?? "");
      const profile = profileById.get(userId);
      const visibleBio =
        connectedUserIds.has(userId) && !profile?.bioContactsHidden && String(profile?.bioContacts ?? "").trim()
          ? String(profile?.bioContacts ?? "").trim()
          : String(profile?.bio ?? "").trim() || null;
      return {
        imageId: Number(record.image_id ?? 0),
        userId,
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        bio: visibleBio,
        reaction: asReactionKey(record.reaction) ?? "like",
        createdAt: record.created_at ? String(record.created_at) : null,
      };
    })
    .filter((item) => Number.isFinite(item.imageId) && item.imageId > 0 && item.userId);
}

export async function getMyImageReactions(imageIds: number[]): Promise<Record<number, ImageReactionKey>> {
  const ids = toImageIds(imageIds);
  if (ids.length === 0) return {};

  const userId = await getAuthUserId();
  const data = await loadMyReactionRows(ids, userId);

  const byImageId: Record<number, ImageReactionKey> = {};
  for (const row of data ?? []) {
    const imageId = Number((row as Record<string, unknown>).image_id ?? 0);
    const reaction = asReactionKey((row as Record<string, unknown>).reaction) ?? "like";
    if (!Number.isFinite(imageId) || imageId <= 0 || !reaction) continue;
    byImageId[imageId] = reaction;
  }

  return byImageId;
}

export async function toggleImageReaction(imageId: number, reaction: ImageReactionKey): Promise<{ reaction: ImageReactionKey | null }> {
  const normalizedImageId = Math.trunc(Number(imageId));
  if (!Number.isFinite(normalizedImageId) || normalizedImageId <= 0) {
    throw new Error("Neplatné imageId.");
  }

  const userId = await getAuthUserId();
  let reactionColumnUnavailable = isReactionColumnUnavailableCached();
  let existing: Record<string, unknown> | null = null;

  if (!reactionColumnUnavailable) {
    const withReaction = await supabase
      .from("image_likes")
      .select("image_id, reaction")
      .eq("image_id", normalizedImageId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!withReaction.error) {
      clearRememberedReactionColumnUnavailable();
      existing = (withReaction.data as Record<string, unknown> | null) ?? null;
    } else if (isReactionColumnSchemaError(withReaction.error)) {
      rememberReactionColumnUnavailable();
      reactionColumnUnavailable = true;
    } else {
      throw withReaction.error;
    }
  }

  if (reactionColumnUnavailable) {
    const fallback = await supabase
      .from("image_likes")
      .select("image_id")
      .eq("image_id", normalizedImageId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    existing = (fallback.data as Record<string, unknown> | null) ?? null;
  }

  if (existing) {
    const currentReaction = reactionColumnUnavailable ? "like" : asReactionKey((existing as Record<string, unknown>).reaction);
    if (currentReaction === reaction) {
      const { error } = await supabase.from("image_likes").delete().eq("image_id", normalizedImageId).eq("user_id", userId);
      if (error) throw error;
      return { reaction: null };
    }

    if (reactionColumnUnavailable) {
      throw new Error(reactionFallbackErrorMessage());
    }

    const { error: deleteError } = await supabase.from("image_likes").delete().eq("image_id", normalizedImageId).eq("user_id", userId);
    if (deleteError) throw deleteError;

    const { error: insertAfterDeleteError } = await supabase.from("image_likes").insert({
      image_id: normalizedImageId,
      user_id: userId,
      reaction,
    });

    if (insertAfterDeleteError) throw insertAfterDeleteError;
    return { reaction };
  }

  if (reactionColumnUnavailable && reaction !== "like") {
    throw new Error(reactionFallbackErrorMessage());
  }

  const { error } = await supabase.from("image_likes").insert({
    image_id: normalizedImageId,
    user_id: userId,
    ...(reactionColumnUnavailable ? {} : { reaction }),
  });

  if (error) {
    if (isDuplicateImageLikeError(error)) {
      return { reaction };
    }
    throw error;
  }
  return { reaction };
}
