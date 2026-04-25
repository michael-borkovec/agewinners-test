/**
 * File: lib/api/posts.ts
 *
 * Purpose:
 * - API layer for posts used by Feed and My Posts
 * - Uses 2-step queries to avoid Supabase embed ambiguity
 * - Provides stable exports used by UI:
 *   - getFeedPosts
 *   - getMyPosts
 *   - createPostWithImages
 *   - deleteMyPost
 *   - getLatestPostIdForImage
 *
 * IMPORTANT:
 * - DB uses post_albums (not posts.album_id). This file reads albums via post_albums.
 *
 * NEW (thumb):
 * - Images select includes:
 *   - storage_path_thumb
 *   - public_url_thumb
 *
 * FIX (empty posts visibility):
 * - Feed should NOT show empty posts (posts with zero images).
 * - Owner CAN still see empty posts in "My posts" (handled by getMyPosts + UI).
 *
 * New album visibility rule:
 * - if post belongs to album -> effective visibility = album.visibility
 * - else -> effective visibility = post.visibility
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabaseClient";
import { getStoriesForPosts } from "@/lib/api/postStories";

/** Legacy predefined tag values, formerly image categories. */
export type PredefinedPhotoTag =
  | "bezna"
  | "oblicej"
  | "cela_postava"
  | "postava_bez_obliceje"
  | "v_plavkach"
  | "makeup_stylizace"
  | "spolecenske_saty"
  | "sport";

export type PhotoTag = string;
export type PhotoCategory = PredefinedPhotoTag;
export type ContentVisibility = "everyone" | "contacts" | "private";

export const PHOTO_TAG_LABELS: Record<PredefinedPhotoTag, string> = {
  oblicej: "Obličej",
  cela_postava: "Celá postava",
  postava_bez_obliceje: "Postava bez obličeje",
  v_plavkach: "V plavkách",
  makeup_stylizace: "Make-up / stylizace",
  spolecenske_saty: "Společenské šaty",
  sport: "Sport",
} as Record<PredefinedPhotoTag, string>;

export const PHOTO_TAG_OPTIONS: Array<{ value: PredefinedPhotoTag; label: string }> = (
  Object.keys(PHOTO_TAG_LABELS) as PredefinedPhotoTag[]
).map((k) => ({ value: k, label: PHOTO_TAG_LABELS[k] }));

export const PHOTO_CATEGORY_LABELS = PHOTO_TAG_LABELS;
export const PHOTO_CATEGORY_OPTIONS = PHOTO_TAG_OPTIONS;

const PREDEFINED_PHOTO_TAGS = new Set<string>(Object.keys(PHOTO_TAG_LABELS));

type AnyRow = Record<string, any>;
const ANONYMOUS_AUTHOR_LABEL = "Anonymní uživatel";
let hiddenImagesTableAvailable: boolean | null = null;

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function shuffleArray<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asVisibility(v: any): ContentVisibility {
  if (v === "contacts") return "contacts";
  if (v === "private") return "private";
  return "everyone";
}

export function normalizeImageTag(input: unknown): string {
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

export function normalizeImageTags(inputs: unknown[]): string[] {
  const tags = inputs.map(normalizeImageTag).filter((tag) => Boolean(tag) && tag !== "bezna");
  return uniq(tags).slice(0, 12);
}

export function getLegacyPhotoCategoryFromTags(tags: string[]): PredefinedPhotoTag {
  const predefined = tags.find((tag) => PREDEFINED_PHOTO_TAGS.has(tag));
  return (predefined || "bezna") as PredefinedPhotoTag;
}

async function loadImageTags(imageIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (imageIds.length === 0) return out;

  const { data, error } = await supabase.from("image_tags").select("image_id, tag").in("image_id", imageIds);

  if (error) {
    if (error.message?.includes("Could not find the table 'public.image_tags'")) return out;
    console.warn("posts.ts: image_tags load failed:", error.message);
    return out;
  }

  for (const row of (data ?? []) as AnyRow[]) {
    const imageId = toInt(row.image_id);
    const tag = normalizeImageTag(row.tag);
    if (!imageId || !tag) continue;
    const current = out.get(imageId) ?? [];
    current.push(tag);
    out.set(imageId, current);
  }

  return out;
}

async function loadChallengeTags(tags: string[]): Promise<Map<string, AnyRow>> {
  const out = new Map<string, AnyRow>();
  const uniqueTags = uniq(tags.map(normalizeImageTag).filter(Boolean));
  if (uniqueTags.length === 0) return out;

  const { data, error } = await supabase
    .from("aw_challenges")
    .select("id, title, visibility, challenge_tag")
    .in("challenge_tag", uniqueTags);

  if (error) {
    if (error.message?.includes("Could not find the table 'public.aw_challenges'")) return out;
    console.warn("posts.ts: challenge tag load failed:", error.message);
    return out;
  }

  for (const row of (data ?? []) as AnyRow[]) {
    const tag = normalizeImageTag(row.challenge_tag);
    if (!tag) continue;
    out.set(tag, row);
  }

  return out;
}

function isPrivilegedProfile(profile: AnyRow | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.super_user) || profile.role === "moderator" || profile.role === "admin";
}

async function loadViewerPrivilege(currentUserId: string): Promise<boolean> {
  if (!currentUserId) return false;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("super_user, role")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) {
    console.warn("posts.ts: viewer privilege load failed:", error.message);
    return false;
  }

  return isPrivilegedProfile((data ?? null) as AnyRow | null);
}

async function loadViewerGuesses(params: { currentUserId: string; imageIds: number[] }) {
  const { currentUserId, imageIds } = params;

  const empty = {
    guessedSet: new Set<number>(),
    guessedAgeByImageId: new Map<number, number>(),
  };

  if (!currentUserId || imageIds.length === 0) return empty;

  const { data, error } = await supabase
    .from("age_guesses")
    .select("image_id, guessed_age, created_at")
    .eq("guesser_user_id", currentUserId)
    .in("image_id", imageIds);

  if (error) {
    console.warn("getFeedPosts: cannot load guesses (RLS?):", error.message);
    return empty;
  }

  const guessedRowsSorted = [...(data ?? [])].sort((a: any, b: any) =>
    String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? ""))
  );

  const guessedSet = new Set<number>();
  const guessedAgeByImageId = new Map<number, number>();
  guessedRowsSorted.forEach((row: any) => {
    const imageId = toInt(row?.image_id);
    const guessedAge = toInt(row?.guessed_age);
    if (!imageId) return;

    guessedSet.add(imageId);

    if (!guessedAgeByImageId.has(imageId) && guessedAge) {
      guessedAgeByImageId.set(imageId, guessedAge);
    }
  });

  return { guessedSet, guessedAgeByImageId };
}

/**
 * Find the newest post (by post_images.created_at) that contains the given image.
 */
export async function getLatestPostIdForImage(imageId: number): Promise<number | null> {
  const iid = toInt(imageId);
  if (!iid) throw new Error("getLatestPostIdForImage: invalid imageId");

  const { data, error } = await supabase
    .from("post_images")
    .select("post_id, created_at")
    .eq("image_id", iid)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  const pid = toInt((row as any)?.post_id);
  return pid ? pid : null;
}

async function loadAcceptedContactUserIds(currentUserId: string): Promise<Set<string>> {
  if (!currentUserId) return new Set<string>();

  const { data, error } = await supabase
    .from("connections")
    .select("user_id_a, user_id_b, status")
    .eq("status", "accepted")
    .or(`user_id_a.eq.${currentUserId},user_id_b.eq.${currentUserId}`);

  if (error) {
    console.warn("posts.ts: connections load failed:", error.message);
    return new Set<string>();
  }

  const out = new Set<string>();

  for (const row of (data ?? []) as AnyRow[]) {
    const a = String(row.user_id_a ?? "");
    const b = String(row.user_id_b ?? "");
    if (!a || !b) continue;

    if (a === currentUserId && b) out.add(b);
    if (b === currentUserId && a) out.add(a);
  }

  return out;
}

async function loadHiddenPostIds(currentUserId: string): Promise<Set<number>> {
  if (!currentUserId) return new Set<number>();

  const { data, error } = await supabase
    .from("hidden_posts")
    .select("post_id")
    .eq("user_id", currentUserId);

  if (error) {
    console.warn("posts.ts: hidden_posts load failed:", error.message);
    return new Set<number>();
  }

  return new Set((data ?? []).map((row: AnyRow) => toInt(row.post_id)).filter((id) => id > 0));
}

async function loadHiddenImageIds(currentUserId: string): Promise<Set<number>> {
  if (!currentUserId) return new Set<number>();
  if (hiddenImagesTableAvailable === false) return new Set<number>();

  const { data, error } = await supabase
    .from("hidden_images")
    .select("image_id")
    .eq("user_id", currentUserId);

  if (error) {
    if (error.message?.includes("Could not find the table 'public.hidden_images'")) {
      hiddenImagesTableAvailable = false;
      return new Set<number>();
    }
    console.warn("posts.ts: hidden_images load failed:", error.message);
    return new Set<number>();
  }

  hiddenImagesTableAvailable = true;
  return new Set((data ?? []).map((row: AnyRow) => toInt(row.image_id)).filter((id) => id > 0));
}

function canViewerAccessVisibility(params: {
  currentUserId: string;
  authorUserId: string;
  effectiveVisibility: ContentVisibility;
  acceptedContactUserIds: Set<string>;
}) {
  const { currentUserId, authorUserId, effectiveVisibility, acceptedContactUserIds } = params;

  if (!currentUserId || !authorUserId) return false;
  if (currentUserId === authorUserId) return true;

  if (effectiveVisibility === "everyone") return true;
  if (effectiveVisibility === "private") return false;

  return acceptedContactUserIds.has(authorUserId);
}

/**
 * Internal helper: load posts + attach author profile + attach images + attach album via post_albums
 */
async function loadPostsWithImages(params: {
  postFilter: (q: any) => any;
  currentUserId: string;
  includeSensitiveImageFields: boolean;
  limit: number;
  offset: number;
}) {
  const { postFilter, currentUserId, includeSensitiveImageFields, limit, offset } = params;

  // 1) Load posts
  const postsQ = postFilter(
    supabase
      .from("posts")
      .select("id, created_at, author_user_id, title, text, visibility, hidden_by_suspension")
      .eq("hidden_by_suspension", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
  );

  const { data: postRows, error: postsErr } = await postsQ;
  if (postsErr) throw postsErr;

  const posts = (postRows ?? []) as AnyRow[];
  const postIds = posts.map((p) => toInt(p.id)).filter((x) => Number.isFinite(x) && x > 0);
  if (postIds.length === 0) return [];

  // 2) Load authors (user_profiles)
  const authorIds = uniq(posts.map((p) => String(p.author_user_id)).filter(Boolean));
  const { data: profRows, error: profErr } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, account_status")
    .in("user_id", authorIds);

  if (profErr) console.warn("posts.ts: user_profiles load failed:", profErr.message);

  const profileByUserId = new Map<string, AnyRow>();
  (profRows ?? []).forEach((r: AnyRow) => profileByUserId.set(String(r.user_id), r));

  // 3) Load post_images
  const { data: piRows, error: piErr } = await supabase
    .from("post_images")
    .select("post_id, image_id, created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (piErr) throw piErr;

  const postImages = (piRows ?? []) as AnyRow[];
  const imageIds = uniq(postImages.map((r) => toInt(r.image_id)).filter((x) => x > 0));

  // 4) Load images
  const imageSelect = includeSensitiveImageFields
    ? "id, public_url, public_url_medium, public_url_thumb, storage_path_medium, storage_path_thumb, photo_category, taken_at, include_in_global_aw, comment, real_age_years, aw_age_image, avg_guessed_age, guesses_count, uploader_user_id, hidden_by_suspension"
    : "id, public_url, public_url_medium, public_url_thumb, storage_path_medium, storage_path_thumb, photo_category, taken_at, include_in_global_aw, comment, uploader_user_id, hidden_by_suspension";

  const { data: imgRows, error: imgErr } = imageIds.length
    ? await supabase
        .from("images")
        .select(imageSelect)
        .in("id", imageIds)
        .eq("hidden_by_suspension", false)
        .eq("hidden_by_admin", false)
    : { data: [], error: null };

  if (imgErr) throw imgErr;

  const imageById = new Map<number, AnyRow>();
  (imgRows ?? []).forEach((r: AnyRow) => imageById.set(toInt(r.id), r));
  const tagsByImageId = await loadImageTags(imageIds);
  const allImageTags = uniq(Array.from(tagsByImageId.values()).flat());
  const challengeByTag = await loadChallengeTags(allImageTags);

  const commentCountByImageId = new Map<number, number>();
  if (imageIds.length > 0) {
    const { data: commentRows, error: commentCountErr } = await supabase
      .from("comments")
      .select("image_id")
      .in("image_id", imageIds)
      .eq("target_type", "image")
      .eq("is_deleted", false)
      .eq("is_hidden_by_moderation", false)
      .eq("hidden_by_suspension", false);

    if (commentCountErr) {
      console.warn("posts.ts: image comment counts load failed:", commentCountErr.message);
    } else {
      (commentRows ?? []).forEach((row: AnyRow) => {
        const imageId = toInt(row.image_id);
        if (!imageId) return;
        commentCountByImageId.set(imageId, (commentCountByImageId.get(imageId) ?? 0) + 1);
      });
    }
  }

  // 5) Load post_albums relations
  const { data: paRows, error: paErr } = await supabase
    .from("post_albums")
    .select("post_id, album_id, sort_order, created_at")
    .in("post_id", postIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (paErr) console.warn("posts.ts: post_albums load failed:", paErr.message);

  const albumIdByPostId = new Map<number, number>();
  (paRows ?? []).forEach((r: AnyRow) => {
    const pid = toInt(r.post_id);
    const aid = toInt(r.album_id);
    if (!pid || !aid) return;
    if (!albumIdByPostId.has(pid)) albumIdByPostId.set(pid, aid);
  });

  const albumIds = uniq(Array.from(albumIdByPostId.values())).filter((x) => x > 0);

  const albumById = new Map<number, AnyRow>();
  if (albumIds.length > 0) {
    const { data: aRows, error: aErr } = await supabase
      .from("albums")
      .select("id, title, description, visibility")
      .in("id", albumIds);

    if (aErr) console.warn("posts.ts: albums load failed:", aErr.message);
    else (aRows ?? []).forEach((a: AnyRow) => albumById.set(toInt(a.id), a));
  }

  const storyByPostId = includeSensitiveImageFields ? await getStoriesForPosts(postIds).catch(() => ({})) : {};

  // 6) Assemble images by post id
  const imagesByPostId = new Map<number, AnyRow[]>();
  postImages.forEach((rel) => {
    const pid = toInt(rel.post_id);
    const iid = toInt(rel.image_id);
    const img = imageById.get(iid);
    if (!img) return;
    const arr = imagesByPostId.get(pid) ?? [];
    arr.push(img);
    imagesByPostId.set(pid, arr);
  });

  // 7) Return UiPost-ish objects
  return posts.flatMap((p) => {
    const postId = toInt(p.id);
    const au = String(p.author_user_id ?? "");
    const pr = profileByUserId.get(au);
    if (pr?.account_status === "suspended") return [];

    const imgs = (imagesByPostId.get(postId) ?? []).map((img) => {
      const base: AnyRow = {
        ...img,
        publicUrl: img.public_url ?? img.publicUrl ?? null,
        publicUrlMedium: img.public_url_medium ?? img.publicUrlMedium ?? null,
        publicUrlThumb: img.public_url_thumb ?? img.publicUrlThumb ?? null,
      };

      base.public_url = base.public_url ?? base.publicUrl ?? null;
      base.public_url_medium = img.public_url_medium ?? img.publicUrlMedium ?? null;
      base.public_url_thumb = img.public_url_thumb ?? img.publicUrlThumb ?? null;
      base.storage_path_medium = img.storage_path_medium ?? null;
      base.storage_path_thumb = img.storage_path_thumb ?? null;
      base.comments_count = commentCountByImageId.get(toInt(img.id)) ?? 0;
      base.tags = tagsByImageId.get(toInt(img.id)) ?? normalizeImageTags([img.photo_category]);
      base.challengeTags = base.tags
        .map((tag: string) => challengeByTag.get(normalizeImageTag(tag)))
        .filter(Boolean)
        .map((challenge: AnyRow) => ({
          id: String(challenge.id),
          title: String(challenge.title ?? "Výzva"),
          tag: normalizeImageTag(challenge.challenge_tag),
          visibility: asVisibility(challenge.visibility),
        }));

      if (!includeSensitiveImageFields) {
        base.real_age_years = null;
        base.aw_age_image = null;
        base.avg_guessed_age = null;
        base.guesses_count = null;
      }

      return base;
    });

    const albumId = albumIdByPostId.get(postId) ?? null;
    const album = albumId ? albumById.get(albumId) : null;

    const postVisibility = asVisibility(p.visibility);
    const albumVisibility = album ? asVisibility(album.visibility) : null;
    const effectiveVisibility = albumVisibility ?? postVisibility;

    return [{
      id: postId,
      createdAt: p.created_at ?? null,
      authorUserId: au,
      author: pr?.display_name ?? au,
      authorAvatarUrl: pr?.avatar_url ?? null,
      title: p.title ?? "",
      text: p.text ?? "",
      visibility: postVisibility,
      images: imgs,
      isMine: au === currentUserId,

      albumId,
      albumTitle: album?.title ?? null,
      albumDescription: album?.description ?? null,
      albumVisibility,
      effectiveVisibility,
      story: (storyByPostId as Record<number, unknown>)[postId] ?? null,
    }];
  });
}

function hasAnyImages(p: any): boolean {
  const imgs = (p?.images ?? []) as any[];
  return Array.isArray(imgs) && imgs.length > 0;
}

/**
 * Feed:
 * - Only posts by OTHER users
 * - respects effective visibility:
 *   - album.visibility overrides post.visibility
 * - Exclude fully guessed posts for all viewers (default true)
 *
 * FIX:
 * - Feed should not show empty posts (posts with 0 images).
 */
export async function getFeedPosts(params: {
  currentUserId: string;
  categories?: PhotoCategory[];
  limit?: number;
  offset?: number;
  excludeFullyGuessed?: boolean;
  hiddenMode?: "exclude" | "include" | "only";
}) {
  const { currentUserId, categories = [], limit = 30, offset = 0, excludeFullyGuessed = true, hiddenMode = "exclude" } = params;

  if (!currentUserId) throw new Error("getFeedPosts: missing currentUserId");

  const postsAll = await loadPostsWithImages({
    currentUserId,
    includeSensitiveImageFields: false,
    limit,
    offset,
    postFilter: (q) => q.neq("author_user_id", currentUserId),
  });

  const acceptedContactUserIds = await loadAcceptedContactUserIds(currentUserId);
  const isPrivilegedViewer = await loadViewerPrivilege(currentUserId);
  const hiddenPostIds = await loadHiddenPostIds(currentUserId);
  const hiddenImageIds = await loadHiddenImageIds(currentUserId);

  const visibleByPrivacy = postsAll.filter((p: any) =>
    canViewerAccessVisibility({
      currentUserId,
      authorUserId: String(p.authorUserId ?? ""),
      effectiveVisibility: asVisibility(p.effectiveVisibility),
      acceptedContactUserIds,
    })
  );

  // hide empty posts from OTHER users in Feed
  const postsNonEmpty = visibleByPrivacy.filter((p: any) => hasAnyImages(p));
  const postsVisibleByHiddenState = postsNonEmpty.filter((p: any) => {
    const isHidden = hiddenPostIds.has(toInt(p.id));
    if (hiddenMode === "include") return true;
    if (hiddenMode === "only") return isHidden;
    return !isHidden;
  });

  const want = new Set(normalizeImageTags(categories));
  const allImageIds = uniq(
    postsVisibleByHiddenState.flatMap((p: any) => (p.images ?? []).map((img: any) => toInt(img.id))).filter(Boolean)
  );
  const { guessedSet, guessedAgeByImageId } = await loadViewerGuesses({
    currentUserId,
    imageIds: allImageIds,
  });

  const withViewerGuesses = postsVisibleByHiddenState.map((p: any) => {
    const images = (p.images ?? []).map((img: any) => {
      const imageId = toInt(img?.id);

      return {
        ...img,
        comment: isPrivilegedViewer ? img?.comment ?? null : null,
        contentRevealed: isPrivilegedViewer,
        viewerGuessedAge: imageId ? guessedAgeByImageId.get(imageId) ?? null : null,
      };
    });

    return {
      ...p,
      isHiddenByViewer: hiddenPostIds.has(toInt(p.id)),
      author: isPrivilegedViewer ? p.author : ANONYMOUS_AUTHOR_LABEL,
      authorAvatarUrl: isPrivilegedViewer ? p.authorAvatarUrl : null,
      identityRevealed: isPrivilegedViewer,
      title: isPrivilegedViewer ? p.title : "",
      text: isPrivilegedViewer ? p.text : "",
      albumTitle: isPrivilegedViewer ? p.albumTitle : null,
      albumDescription: isPrivilegedViewer ? p.albumDescription : null,
      contentRevealed: isPrivilegedViewer,
      images,
    };
  });

  const photoCards = withViewerGuesses.flatMap((p: any) => {
    const postId = toInt(p.id);
    const images = Array.isArray(p.images) ? p.images : [];
    const sourcePostImageIds = images.map((img: any) => toInt(img?.id)).filter((id: number) => id > 0);
    const guessedCount = sourcePostImageIds.filter((imageId: number) => guessedSet.has(imageId)).length;
    const postFullyGuessed = sourcePostImageIds.length > 0 && guessedCount >= sourcePostImageIds.length;

    if (excludeFullyGuessed && postFullyGuessed) return [];

    return images.flatMap((img: any) => {
      const imageId = toInt(img?.id);
      if (!imageId) return [];
      const imageTags = normalizeImageTags([...(Array.isArray(img?.tags) ? img.tags : []), img?.photo_category]);
      if (want.size > 0 && !imageTags.some((tag) => want.has(tag))) return [];

      const viewerAlreadyGuessed = guessedSet.has(imageId);
      const imageHiddenByViewer = hiddenImageIds.has(imageId);
      if (hiddenMode === "exclude" && imageHiddenByViewer) return [];
      if (hiddenMode === "only" && !imageHiddenByViewer) return [];
      if (viewerAlreadyGuessed) return [];

      return [
        {
          ...p,
          feedCardId: `feed:${postId}:${imageId}`,
          sourcePostId: postId,
          sourcePostImageIds,
          isHiddenByViewer: imageHiddenByViewer,
          images: [img],
        },
      ];
    });
  });

  return shuffleArray(photoCards).slice(0, limit);
}

/**
 * My posts:
 * - Only posts by current user
 * - Includes sensitive image fields
 *
 * NOTE:
 * - We KEEP empty posts here so the owner can see and delete them.
 */
export async function getMyPosts(params: { currentUserId: string; limit?: number; offset?: number }) {
  const { currentUserId, limit = 50, offset = 0 } = params;
  if (!currentUserId) throw new Error("getMyPosts: missing currentUserId");

  return loadPostsWithImages({
    currentUserId,
    includeSensitiveImageFields: true,
    limit,
    offset,
    postFilter: (q) => q.eq("author_user_id", currentUserId),
  });
}

/**
 * Create post and attach already-uploaded images via post_images.
 * IMPORTANT: DB requires posts.text NOT NULL, but empty string is allowed.
 */
export async function createPostWithImages(params: {
  currentUserId: string;
  title: string;
  text?: string;
  imageIds: number[];
}) {
  const { currentUserId, title, text = "", imageIds } = params;

  if (!currentUserId) throw new Error("createPostWithImages: missing currentUserId");
  if (!title?.trim()) throw new Error("Doplň prosím název příspěvku.");

  const { data: inserted, error: insErr } = await supabase
    .from("posts")
    .insert({
      author_user_id: currentUserId,
      title: title.trim(),
      text: text.trim(),
    })
    .select("id")
    .single();

  if (insErr) throw insErr;

  const postId = toInt((inserted as any)?.id);
  if (!postId) throw new Error("Nepodařilo se vytvořit post (chybí id).");

  const relRows = (imageIds ?? [])
    .map((id) => toInt(id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((imageId) => ({ post_id: postId, image_id: imageId }));

  if (relRows.length > 0) {
    const { error: relErr } = await supabase.from("post_images").insert(relRows);
    if (relErr) throw relErr;
  }

  return { postId };
}

export async function updateMyPostDetails(params: {
  postId: number;
  title: string;
  text?: string;
}) {
  const postId = toInt(params.postId);
  const title = String(params.title ?? "").trim();
  const text = String(params.text ?? "").trim();

  if (!postId) throw new Error("updateMyPostDetails: invalid postId");
  if (!title) throw new Error("Doplň prosím název příspěvku.");

  const { error } = await supabase
    .from("posts")
    .update({
      title,
      text,
    })
    .eq("id", postId);

  if (error) throw error;
}

/**
 * Delete my post (DB/RLS should enforce ownership).
 */
export async function deleteMyPost(postId: number) {
  const pid = toInt(postId);
  if (!pid) throw new Error("deleteMyPost: invalid postId");

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const userId = auth.user?.id ?? null;

  const { data: postImageRows, error: relLoadErr } = await supabase
    .from("post_images")
    .select("image_id")
    .eq("post_id", pid);

  if (relLoadErr) throw relLoadErr;

  const imageIds = (postImageRows ?? [])
    .map((row: AnyRow) => toInt(row.image_id))
    .filter((imageId) => imageId > 0);

  if (imageIds.length > 0) {
    const { error: hideErr } = await supabase
      .from("images")
      .update({
        hidden_by_admin: true,
        hidden_by_admin_at: new Date().toISOString(),
        hidden_by_admin_by: userId,
      })
      .in("id", imageIds);

    if (hideErr) throw hideErr;
  }

  await supabase.from("post_images").delete().eq("post_id", pid);
  await supabase.from("post_albums").delete().eq("post_id", pid);

  const { error } = await supabase.from("posts").delete().eq("id", pid);
  if (error) throw error;
}

export async function hideFeedPost(params: { postId: number; currentUserId: string }) {
  const postId = toInt(params.postId);
  if (!postId) throw new Error("hideFeedPost: invalid postId");
  if (!params.currentUserId) throw new Error("hideFeedPost: missing currentUserId");

  const { error } = await supabase.from("hidden_posts").upsert(
    {
      user_id: params.currentUserId,
      post_id: postId,
    },
    { onConflict: "user_id,post_id" }
  );

  if (error) throw error;
}

export async function unhideFeedPost(params: { postId: number; currentUserId: string }) {
  const postId = toInt(params.postId);
  if (!postId) throw new Error("unhideFeedPost: invalid postId");
  if (!params.currentUserId) throw new Error("unhideFeedPost: missing currentUserId");

  const { error } = await supabase
    .from("hidden_posts")
    .delete()
    .eq("user_id", params.currentUserId)
    .eq("post_id", postId);

  if (error) throw error;
}

export async function hideFeedImage(params: { imageId: number; currentUserId: string }) {
  const imageId = toInt(params.imageId);
  if (!imageId) throw new Error("hideFeedImage: invalid imageId");
  if (!params.currentUserId) throw new Error("hideFeedImage: missing currentUserId");
  if (hiddenImagesTableAvailable === false) {
    throw new Error("Skrývání fotek zatím není v databázi aktivované. Je potřeba spustit novou migraci.");
  }

  const { error } = await supabase.from("hidden_images").upsert(
    {
      user_id: params.currentUserId,
      image_id: imageId,
    },
    { onConflict: "user_id,image_id" }
  );

  if (error) {
    if (error.message?.includes("Could not find the table 'public.hidden_images'")) {
      hiddenImagesTableAvailable = false;
      throw new Error("Skrývání fotek zatím není v databázi aktivované. Je potřeba spustit novou migraci.");
    }
    throw error;
  }

  hiddenImagesTableAvailable = true;
}

export async function unhideFeedImage(params: { imageId: number; currentUserId: string }) {
  const imageId = toInt(params.imageId);
  if (!imageId) throw new Error("unhideFeedImage: invalid imageId");
  if (!params.currentUserId) throw new Error("unhideFeedImage: missing currentUserId");
  if (hiddenImagesTableAvailable === false) {
    throw new Error("Skrývání fotek zatím není v databázi aktivované. Je potřeba spustit novou migraci.");
  }

  const { error } = await supabase
    .from("hidden_images")
    .delete()
    .eq("user_id", params.currentUserId)
    .eq("image_id", imageId);

  if (error) {
    if (error.message?.includes("Could not find the table 'public.hidden_images'")) {
      hiddenImagesTableAvailable = false;
      throw new Error("Skrývání fotek zatím není v databázi aktivované. Je potřeba spustit novou migraci.");
    }
    throw error;
  }

  hiddenImagesTableAvailable = true;
}

