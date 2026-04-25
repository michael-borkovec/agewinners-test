/**
 * File purpose
 * - API layer for optional author stories attached to posts.
 * Main responsibilities
 * - Create story text and story-only images.
 * - Load visible stories for post lists and My Tips.
 * - Manage story reactions and story reports.
 * Related APIs, components, or modules
 * - lib/api/posts
 * - lib/api/myTips
 * - lib/api/comments
 * - supabase/migrations/20260425_post_stories_phase_a.sql
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabaseClient";
import { prepareImageUploadVariants } from "@/lib/image/clientImage";
import type { ImageReactionKey } from "@/lib/api/imageReactions";

const BUCKET = "post-images";

export type PostStoryImage = {
  id: number;
  storyId: number;
  publicUrl: string;
  publicUrlMedium: string | null;
  publicUrlThumb: string | null;
  sortOrder: number;
  altText: string | null;
};

export type PostStory = {
  id: number;
  postId: number;
  authorUserId: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  images: PostStoryImage[];
  likesCount?: number;
  myReaction?: ImageReactionKey | null;
};

export type StoryReactionSummary = {
  total: number;
  byReaction: Partial<Record<ImageReactionKey, number>>;
};

function toMsg(err: any) {
  if (!err) return "Neznámá chyba.";
  if (typeof err === "string") return err;
  return err?.message || err?.details || err?.hint || "Neznámá chyba.";
}

function toInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function asReactionKey(value: unknown): ImageReactionKey | null {
  const safe = String(value ?? "");
  if (safe === "like" || safe === "clap" || safe === "care" || safe === "love" || safe === "insight" || safe === "fun") {
    return safe;
  }
  return null;
}

function uniqueName(userId: string, fileName: string) {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
  const stamp = Date.now();
  const rnd = Math.random().toString(16).slice(2);
  return `${userId}/stories/${stamp}-${rnd}.${ext}`;
}

function uniqueVariantNameFromFullPath(fullPath: string, variant: "thumb" | "feed") {
  const lastDot = fullPath.lastIndexOf(".");
  if (lastDot === -1) return fullPath + `.${variant}.webp`;
  return fullPath.slice(0, lastDot) + `.${variant}.webp`;
}

async function getAuthUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(toMsg(error));
  if (!user?.id) throw new Error("Musíš být přihlášen/a.");
  return user.id;
}

async function uploadPreparedVariant(path: string, file: File) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/webp",
  });
  if (error) throw new Error(toMsg(error));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? null;
  if (!publicUrl) throw new Error("Nepodařilo se získat URL obrázku.");
  return publicUrl;
}

async function uploadStoryImageFile(userId: string, file: File) {
  const prepared = await prepareImageUploadVariants(file);
  const detailPath = uniqueName(userId, prepared.detail.file.name);
  const feedPath = uniqueVariantNameFromFullPath(detailPath, "feed");
  const thumbPath = uniqueVariantNameFromFullPath(detailPath, "thumb");
  const uploadedPaths: string[] = [];

  try {
    const publicUrl = await uploadPreparedVariant(detailPath, prepared.detail.file);
    uploadedPaths.push(detailPath);
    const publicUrlMedium = await uploadPreparedVariant(feedPath, prepared.feed.file);
    uploadedPaths.push(feedPath);
    const publicUrlThumb = await uploadPreparedVariant(thumbPath, prepared.thumb.file);
    uploadedPaths.push(thumbPath);

    return {
      storagePath: detailPath,
      publicUrl,
      storagePathMedium: feedPath,
      publicUrlMedium,
      storagePathThumb: thumbPath,
      publicUrlThumb,
    };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function createPostStory(params: {
  postId: number;
  currentUserId: string;
  body: string;
  imageFiles?: File[];
}) {
  const postId = toInt(params.postId);
  const currentUserId = String(params.currentUserId ?? "");
  const body = String(params.body ?? "").trim();
  const imageFiles = params.imageFiles ?? [];

  if (!postId) throw new Error("Chybí postId pro příběh.");
  if (!currentUserId) throw new Error("Chybí přihlášený uživatel.");
  if (!body && imageFiles.length === 0) return null;
  if (body.length > 3000) throw new Error("Příběh je příliš dlouhý (max 3000 znaků).");

  const { data: inserted, error } = await supabase
    .from("post_stories")
    .insert({
      post_id: postId,
      author_user_id: currentUserId,
      body,
    })
    .select("id, post_id, author_user_id, body, created_at, updated_at")
    .single();

  if (error) throw new Error(toMsg(error));

  const storyId = toInt((inserted as any)?.id);
  if (!storyId) throw new Error("Příběh se vytvořil, ale chybí id.");

  if (imageFiles.length > 0) {
    const imageRows = [];
    for (const [index, file] of imageFiles.entries()) {
      const uploaded = await uploadStoryImageFile(currentUserId, file);
      imageRows.push({
        story_id: storyId,
        uploader_user_id: currentUserId,
        storage_path: uploaded.storagePath,
        public_url: uploaded.publicUrl,
        storage_path_medium: uploaded.storagePathMedium,
        public_url_medium: uploaded.publicUrlMedium,
        storage_path_thumb: uploaded.storagePathThumb,
        public_url_thumb: uploaded.publicUrlThumb,
        sort_order: index,
      });
    }

    const { error: imageError } = await supabase.from("post_story_images").insert(imageRows);
    if (imageError) throw new Error(toMsg(imageError));
  }

  return { storyId };
}

export async function getStoriesForPosts(postIds: number[]): Promise<Record<number, PostStory>> {
  const ids = uniq(postIds.map(toInt).filter((id) => id > 0));
  if (ids.length === 0) return {};

  const { data: storyRows, error } = await supabase
    .from("post_stories")
    .select("id, post_id, author_user_id, body, created_at, updated_at")
    .in("post_id", ids)
    .eq("hidden_by_moderation", false)
    .eq("hidden_by_suspension", false);

  if (error) {
    if (String(error.message ?? "").includes("post_stories")) return {};
    throw new Error(toMsg(error));
  }

  const stories = (storyRows ?? []) as any[];
  const storyIds = stories.map((row) => toInt(row.id)).filter((id) => id > 0);

  const { data: imageRows, error: imageError } = storyIds.length
    ? await supabase
        .from("post_story_images")
        .select("id, story_id, public_url, public_url_medium, public_url_thumb, sort_order, alt_text")
        .in("story_id", storyIds)
        .eq("hidden_by_moderation", false)
        .eq("hidden_by_suspension", false)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (imageError) throw new Error(toMsg(imageError));

  const imagesByStoryId = new Map<number, PostStoryImage[]>();
  for (const row of (imageRows ?? []) as any[]) {
    const storyId = toInt(row.story_id);
    const image: PostStoryImage = {
      id: toInt(row.id),
      storyId,
      publicUrl: String(row.public_url ?? ""),
      publicUrlMedium: row.public_url_medium ?? null,
      publicUrlThumb: row.public_url_thumb ?? null,
      sortOrder: toInt(row.sort_order),
      altText: row.alt_text ?? null,
    };
    imagesByStoryId.set(storyId, [...(imagesByStoryId.get(storyId) ?? []), image]);
  }

  const summaries = await getStoryReactionSummary(storyIds);
  const myReactions = await getMyStoryReactions(storyIds).catch(() => ({} as Record<number, ImageReactionKey>));

  const out: Record<number, PostStory> = {};
  for (const row of stories) {
    const storyId = toInt(row.id);
    const postId = toInt(row.post_id);
    if (!storyId || !postId) continue;
    out[postId] = {
      id: storyId,
      postId,
      authorUserId: String(row.author_user_id ?? ""),
      body: String(row.body ?? ""),
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      images: imagesByStoryId.get(storyId) ?? [],
      likesCount: summaries[storyId]?.total ?? 0,
      myReaction: myReactions[storyId] ?? null,
    };
  }

  return out;
}

export async function getStoryReactionSummary(storyIds: number[]): Promise<Record<number, StoryReactionSummary>> {
  const ids = uniq(storyIds.map(toInt).filter((id) => id > 0));
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from("post_story_likes")
    .select("story_id, reaction")
    .in("story_id", ids);

  if (error) {
    if (String(error.message ?? "").includes("post_story_likes")) return {};
    throw new Error(toMsg(error));
  }

  const out: Record<number, StoryReactionSummary> = {};
  for (const row of (data ?? []) as any[]) {
    const storyId = toInt(row.story_id);
    const reaction = asReactionKey(row.reaction) ?? "like";
    if (!storyId) continue;
    const current = out[storyId] ?? { total: 0, byReaction: {} };
    current.total += 1;
    current.byReaction[reaction] = (current.byReaction[reaction] ?? 0) + 1;
    out[storyId] = current;
  }
  return out;
}

export async function getMyStoryReactions(storyIds: number[]): Promise<Record<number, ImageReactionKey>> {
  const ids = uniq(storyIds.map(toInt).filter((id) => id > 0));
  if (ids.length === 0) return {};

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("post_story_likes")
    .select("story_id, reaction")
    .eq("user_id", userId)
    .in("story_id", ids);

  if (error) throw new Error(toMsg(error));

  const out: Record<number, ImageReactionKey> = {};
  for (const row of (data ?? []) as any[]) {
    const storyId = toInt(row.story_id);
    const reaction = asReactionKey(row.reaction);
    if (storyId && reaction) out[storyId] = reaction;
  }
  return out;
}

export async function toggleStoryReaction(storyId: number, reaction: ImageReactionKey): Promise<{ reaction: ImageReactionKey | null }> {
  const normalizedStoryId = toInt(storyId);
  const normalizedReaction = asReactionKey(reaction);
  if (!normalizedStoryId) throw new Error("Neplatné storyId.");
  if (!normalizedReaction) throw new Error("Neplatná reakce.");

  const userId = await getAuthUserId();
  const { data: existing, error: existingError } = await supabase
    .from("post_story_likes")
    .select("story_id, reaction")
    .eq("story_id", normalizedStoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(toMsg(existingError));

  if (existing) {
    const currentReaction = asReactionKey((existing as any).reaction) ?? "like";
    if (currentReaction === normalizedReaction) {
      const { error } = await supabase
        .from("post_story_likes")
        .delete()
        .eq("story_id", normalizedStoryId)
        .eq("user_id", userId);
      if (error) throw new Error(toMsg(error));
      return { reaction: null };
    }

    const { error } = await supabase
      .from("post_story_likes")
      .update({ reaction: normalizedReaction })
      .eq("story_id", normalizedStoryId)
      .eq("user_id", userId);
    if (error) throw new Error(toMsg(error));
    return { reaction: normalizedReaction };
  }

  const { error } = await supabase.from("post_story_likes").insert({
    story_id: normalizedStoryId,
    user_id: userId,
    reaction: normalizedReaction,
  });

  if (error) throw new Error(toMsg(error));
  return { reaction: normalizedReaction };
}

export async function reportPostStory(params: { storyId: number; reason: string; details?: string | null }) {
  const storyId = toInt(params.storyId);
  const reason = String(params.reason ?? "").trim().slice(0, 80);
  const details = String(params.details ?? "").trim().slice(0, 1000) || null;
  if (!storyId) throw new Error("Neplatné storyId.");
  if (reason.length < 2) throw new Error("Doplň důvod nahlášení.");

  const userId = await getAuthUserId();
  const { error } = await supabase.from("post_story_reports").insert({
    story_id: storyId,
    reporter_user_id: userId,
    reason,
    details,
  });

  if (error) throw new Error(toMsg(error));
}
