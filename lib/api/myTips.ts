/**
 * File: lib/api/myTips.ts
 *
 * Purpose:
 * - API for "My tips"
 * - Returns FULL + THUMB urls for each photo and groups them by post.
 * - Enforces effective content visibility using the new simplified rule:
 *   - post outside album -> post.visibility
 *   - post inside album  -> album.visibility
 * - Privileged viewers (super_user / moderator / admin) bypass visibility
 *
 * IMPORTANT:
 * - Pure API module (NO JSX / NO React)
 * - Album membership is resolved via post_albums
 * - Image-level visibility is NOT used here anymore
 */

import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_POST_REVEAL_DELAY_DAYS, getPostRevealDelayDays } from "@/lib/api/appSettings";
import { getStoriesForPosts, type PostStory } from "@/lib/api/postStories";
import type { ContentVisibility } from "@/types/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type MyTipPhotoRow = {
  imageId: number;
  postId: number | null;

  imagePublicUrl: string;
  imageMediumUrl: string | null;
  imageThumbUrl: string | null;

  photoCategory: string | null;
  imageComment: string | null;

  createdAt: string | null;
  guessedAge: number | null;

  realAgeYears: number | null;
  awAgeYears: number | null;
};

export type MyTipPostGroup = {
  postId: number;

  postTitle: string | null;
  postText: string | null;
  postCreatedAt: string | null;
  postVisibility: ContentVisibility | null;
  effectiveVisibility: ContentVisibility | null;

  authorUserId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;

  albumId: number | null;
  albumTitle: string | null;
  albumVisibility: ContentVisibility | null;

  story: PostStory | null;
  photos: MyTipPhotoRow[];
};

type ViewerProfile = {
  user_id: string;
  super_user: boolean | null;
  role: "user" | "moderator" | "admin" | null;
};

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function toMsg(err: any) {
  if (!err) return "Neznámá chyba.";
  if (typeof err === "string") return err;
  return err?.message || err?.details || err?.hint || "Neznámá chyba.";
}

function safeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isPrivilegedViewer(profile: ViewerProfile | null | undefined) {
  return Boolean(profile?.super_user) || profile?.role === "moderator" || profile?.role === "admin";
}

function asVisibility(v: any): ContentVisibility {
  if (v === "contacts") return "contacts";
  if (v === "private") return "private";
  return "everyone";
}

function msFromDays(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

function isPostContentRevealed(photos: MyTipPhotoRow[], revealDelayDays: number, privileged: boolean) {
  if (privileged) return true;
  const guessTimes = photos
    .map((photo) => (photo.createdAt ? new Date(photo.createdAt).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (guessTimes.length === 0) return false;
  return Date.now() >= Math.max(...guessTimes) + msFromDays(revealDelayDays);
}

function visibilityAllows(params: {
  visibility: ContentVisibility | null | undefined;
  isOwner: boolean;
  isPrivileged: boolean;
  isConnected: boolean;
}) {
  const visibility = params.visibility ?? "everyone";

  if (params.isPrivileged) return true;
  if (params.isOwner) return true;
  if (visibility === "everyone") return true;
  if (visibility === "contacts") return params.isConnected;
  return false;
}

async function getViewerProfile(currentUserId: string): Promise<ViewerProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, super_user, role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) throw new Error(toMsg(error));
  return (data as ViewerProfile | null) ?? null;
}

async function getConnectedUserIds(currentUserId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("connections")
    .select("user_id_a, user_id_b, status")
    .eq("status", "accepted")
    .or(`user_id_a.eq.${currentUserId},user_id_b.eq.${currentUserId}`);

  if (error) throw new Error(toMsg(error));

  const out = new Set<string>();

  for (const row of data ?? []) {
    const a = String((row as any).user_id_a ?? "");
    const b = String((row as any).user_id_b ?? "");
    if (a === currentUserId && b) out.add(b);
    if (b === currentUserId && a) out.add(a);
  }

  return out;
}

/**
 * Loads my latest guesses (per image) and returns photo rows.
 */
export async function loadMyTipPhotos(params: { currentUserId: string; limit?: number }) {
  const { currentUserId, limit = 200 } = params;
  if (!currentUserId) throw new Error("loadMyTipPhotos: missing currentUserId");

  const { data: gRows, error: gErr } = await supabase
    .from("age_guesses")
    .select("image_id, guessed_age, created_at")
    .eq("guesser_user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (gErr) throw new Error(toMsg(gErr));

  const guesses = (gRows ?? []) as any[];
  const imageIdsAll = guesses.map((r) => toInt(r.image_id)).filter((x) => x > 0);
  if (imageIdsAll.length === 0) return [] as MyTipPhotoRow[];

  const latestGuessByImage = new Map<number, { guessedAge: number | null; createdAt: string | null }>();
  for (const r of guesses) {
    const imageId = toInt(r.image_id);
    if (!imageId) continue;
    if (latestGuessByImage.has(imageId)) continue;

    latestGuessByImage.set(imageId, {
      guessedAge: safeNumber(r.guessed_age),
      createdAt: r.created_at ?? null,
    });
  }

  const imageIds = Array.from(latestGuessByImage.keys());
  if (imageIds.length === 0) return [] as MyTipPhotoRow[];

  const { data: imgRows, error: iErr } = await supabase
    .from("images")
    .select("id, public_url, public_url_medium, public_url_thumb, photo_category, comment, real_age_years, aw_age_image, avg_guessed_age, hidden_by_suspension")
    .in("id", imageIds)
    .eq("hidden_by_suspension", false)
    .eq("hidden_by_admin", false);

  if (iErr) throw new Error(toMsg(iErr));

  const imgById = new Map<number, any>();
  (imgRows ?? []).forEach((r: any) => imgById.set(toInt(r.id), r));

  const { data: piRows, error: piErr } = await supabase
    .from("post_images")
    .select("post_id, image_id")
    .in("image_id", imageIds);

  if (piErr) throw new Error(toMsg(piErr));

  const postByImageId = new Map<number, number>();
  (piRows ?? []).forEach((r: any) => {
    const iid = toInt(r.image_id);
    const pid = toInt(r.post_id);
    if (iid && pid && !postByImageId.has(iid)) postByImageId.set(iid, pid);
  });

  const out: MyTipPhotoRow[] = [];
  for (const [imageId, g] of latestGuessByImage.entries()) {
    const img = imgById.get(imageId);
    if (!img) continue;

    const awAgeYears = safeNumber(img.aw_age_image) ?? safeNumber(img.avg_guessed_age);

    out.push({
      imageId,
      postId: postByImageId.get(imageId) ?? null,

      imagePublicUrl: img.public_url ?? "",
      imageMediumUrl: img.public_url_medium ?? null,
      imageThumbUrl: img.public_url_thumb ?? null,

      photoCategory: img.photo_category ?? null,
      imageComment: img.comment ?? null,

      createdAt: g.createdAt,
      guessedAge: g.guessedAge,

      realAgeYears: safeNumber(img.real_age_years),
      awAgeYears,
    });
  }

  out.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  return out;
}

/**
 * Groups my tip photos by post and enriches with post + author + album info.
 * Effective visibility rule:
 * - if post is in album -> use album.visibility
 * - else -> use post.visibility
 */
export async function loadMyTipPosts(params: { currentUserId: string; limit?: number }) {
  const { currentUserId, limit = 300 } = params;

  const viewerProfile = await getViewerProfile(currentUserId);
  const privileged = isPrivilegedViewer(viewerProfile);
  const connectedUserIds = privileged ? new Set<string>() : await getConnectedUserIds(currentUserId);

  const [photos, revealDelayDays] = await Promise.all([
    loadMyTipPhotos({ currentUserId, limit }),
    getPostRevealDelayDays().catch(() => DEFAULT_POST_REVEAL_DELAY_DAYS),
  ]);

  const postIds = uniq(
    photos
      .map((p) => p.postId)
      .filter((x): x is number => Number.isFinite(Number(x)) && !!x)
      .map((x) => toInt(x))
      .filter((x) => x > 0)
  );

  if (postIds.length === 0) return [] as MyTipPostGroup[];
  const storyByPostId = await getStoriesForPosts(postIds).catch(() => ({} as Record<number, PostStory>));

  const { data: postsRows, error: postsErr } = await supabase
    .from("posts")
    .select("id, title, text, created_at, author_user_id, visibility, hidden_by_suspension")
    .in("id", postIds)
    .eq("hidden_by_suspension", false);

  if (postsErr) throw new Error(toMsg(postsErr));

  const postById = new Map<number, any>();
  (postsRows ?? []).forEach((r: any) => postById.set(toInt(r.id), r));

  const authorIds = uniq((postsRows ?? []).map((p: any) => String(p.author_user_id ?? "")).filter(Boolean));
  const { data: profRows, error: profErr } = authorIds.length
    ? await supabase.from("user_profiles").select("user_id, display_name, avatar_url, account_status").in("user_id", authorIds)
    : { data: [], error: null };

  if (profErr) console.warn("myTips.ts: user_profiles load failed:", profErr.message);

  const profById = new Map<string, any>();
  (profRows ?? []).forEach((r: any) => profById.set(String(r.user_id), r));

  const { data: paRows, error: paErr } = await supabase
    .from("post_albums")
    .select("post_id, album_id")
    .in("post_id", postIds);

  if (paErr) throw new Error(toMsg(paErr));

  const albumIdByPostId = new Map<number, number>();
  (paRows ?? []).forEach((r: any) => {
    const pid = toInt(r.post_id);
    const aid = toInt(r.album_id);
    if (pid && aid && !albumIdByPostId.has(pid)) albumIdByPostId.set(pid, aid);
  });

  const albumIds = uniq(Array.from(albumIdByPostId.values())).filter((x) => x > 0);
  const albumById = new Map<number, any>();

  if (albumIds.length > 0) {
    const aRes = await supabase
      .from("albums")
      .select("id, title, visibility, owner_user_id")
      .in("id", albumIds);

    if (aRes.error) throw new Error(toMsg(aRes.error));
    (aRes.data ?? []).forEach((r: any) => albumById.set(toInt(r.id), r));
  }

  const photosByPostId = new Map<number, MyTipPhotoRow[]>();
  for (const p of photos) {
    const pid = toInt(p.postId);
    if (!pid) continue;
    if (!photosByPostId.has(pid)) photosByPostId.set(pid, []);
    photosByPostId.get(pid)!.push(p);
  }

  const out: MyTipPostGroup[] = [];

  for (const [postId, pPhotos] of photosByPostId.entries()) {
    const post = postById.get(postId);
    if (!post) continue;

    const postAuthorId = post.author_user_id ? String(post.author_user_id) : null;
    const isOwner = postAuthorId === currentUserId;
    const isConnected = !!postAuthorId && connectedUserIds.has(postAuthorId);

    const postVisibility = asVisibility(post.visibility);

    const albumId = albumIdByPostId.get(postId) ?? null;
    const album = albumId ? albumById.get(albumId) : null;
    const albumVisibility = album ? asVisibility(album.visibility) : null;

    const effectiveVisibility = albumVisibility ?? postVisibility;

    const canSeePost = visibilityAllows({
      visibility: effectiveVisibility,
      isOwner,
      isPrivileged: privileged,
      isConnected,
    });

    if (!canSeePost) continue;
    if (pPhotos.length === 0) continue;

    const pr = postAuthorId ? profById.get(postAuthorId) : null;
    if (pr?.account_status === "suspended") continue;

    pPhotos.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    const contentRevealed = isPostContentRevealed(pPhotos, revealDelayDays, privileged);

    out.push({
      postId,
      postTitle: post.title ?? null,
      postText: post.text ?? post.body ?? null,
      postCreatedAt: post.created_at ?? null,
      postVisibility,
      effectiveVisibility,

      authorUserId: postAuthorId,
      authorName: pr?.display_name ?? postAuthorId ?? null,
      authorAvatarUrl: pr?.avatar_url ?? null,

      albumId,
      albumTitle: album?.title ?? null,
      albumVisibility,

      story: contentRevealed ? storyByPostId[postId] ?? null : null,
      photos: pPhotos,
    });
  }

  out.sort((a, b) => String(b.photos?.[0]?.createdAt ?? "").localeCompare(String(a.photos?.[0]?.createdAt ?? "")));
  return out;
}
