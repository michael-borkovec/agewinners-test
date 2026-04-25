/**
 * File purpose
 * - Manage simple photo likes for revealed images in My Tips.
 * Main responsibilities
 * - Load like counts and current-user like flags.
 * - Toggle current-user like for a photo.
 * Related APIs, components, or modules
 * - supabase/migrations/20260410_notification_preferences_and_image_likes.sql
 * - app/my-tips/page.tsx
 */

import { supabase } from "@/lib/supabaseClient";

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

export async function getImageLikeCounts(imageIds: number[]): Promise<Record<number, number>> {
  const ids = toImageIds(imageIds);
  if (ids.length === 0) return {};

  const { data, error } = await supabase.from("image_likes").select("image_id").in("image_id", ids);
  if (error) throw error;

  const counts: Record<number, number> = {};
  for (const row of data ?? []) {
    const imageId = Number((row as Record<string, unknown>).image_id ?? 0);
    if (!Number.isFinite(imageId) || imageId <= 0) continue;
    counts[imageId] = (counts[imageId] ?? 0) + 1;
  }

  return counts;
}

export async function getMyLikedImageIds(imageIds: number[]): Promise<Set<number>> {
  const ids = toImageIds(imageIds);
  if (ids.length === 0) return new Set<number>();

  const userId = await getAuthUserId();
  const { data, error } = await supabase.from("image_likes").select("image_id").eq("user_id", userId).in("image_id", ids);
  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => Number((row as Record<string, unknown>).image_id ?? 0))
      .filter((imageId) => Number.isFinite(imageId) && imageId > 0)
  );
}

export async function toggleImageLike(imageId: number): Promise<{ liked: boolean }> {
  const normalizedImageId = Math.trunc(Number(imageId));
  if (!Number.isFinite(normalizedImageId) || normalizedImageId <= 0) {
    throw new Error("Neplatné imageId.");
  }

  const userId = await getAuthUserId();

  const { data: existing, error: existingError } = await supabase
    .from("image_likes")
    .select("image_id")
    .eq("image_id", normalizedImageId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase.from("image_likes").delete().eq("image_id", normalizedImageId).eq("user_id", userId);
    if (error) throw error;
    return { liked: false };
  }

  const { error } = await supabase.from("image_likes").insert({
    image_id: normalizedImageId,
    user_id: userId,
  });

  if (error) throw error;
  return { liked: true };
}
