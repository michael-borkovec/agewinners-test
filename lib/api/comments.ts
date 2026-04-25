/**
 * lib/api/comments.ts
 *
 * Purpose:
 * - API pro komentáře
 * - Comments access is derived from content visibility
 * - Effective access:
 *   - post comment => post.visibility + optional album.visibility
 *   - image comment => image.visibility + post.visibility + optional album.visibility
 *   - story comment => parent post.visibility + optional album.visibility
 * - Privileged viewers bypass visibility:
 *   - super_user = true
 *   - role = moderator
 *   - role = admin
 *
 * Notes:
 * - Reveal timing is still enforced in UI / page logic
 * - This file enforces content visibility, not a separate comments_visibility
 */

import { createNetworkNotification } from "@/lib/api/notifications";
import { supabase } from "@/lib/supabaseClient";
import type { ContentVisibility } from "@/types/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CommentTargetType = "post" | "image" | "story";

export type CommentRow = {
  id: number;
  author_user_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  post_id: number;
  image_id: number | null;
  story_id?: number | null;
  parent_comment_id: number | null;
  target_type: CommentTargetType;
  author_snapshot_display_name: string | null;
  author_snapshot_avatar_url: string | null;
};

type ViewerProfile = {
  user_id: string;
  super_user: boolean | null;
  role: "user" | "moderator" | "admin" | null;
};

function toMsg(err: any) {
  if (!err) return "Neznámá chyba.";
  if (typeof err === "string") return err;
  return err?.message || err?.details || err?.hint || "Neznámá chyba.";
}

function normalizeBody(body: string) {
  return String(body ?? "").trim();
}

function isPrivilegedViewer(profile: ViewerProfile | null | undefined) {
  return Boolean(profile?.super_user) || profile?.role === "moderator" || profile?.role === "admin";
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

async function getAuthUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(toMsg(error));
  return user?.id ?? null;
}

async function getViewerProfile(userId: string): Promise<ViewerProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, super_user, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(toMsg(error));
  return (data as ViewerProfile | null) ?? null;
}

async function areUsersConnected(userA: string, userB: string): Promise<boolean> {
  if (!userA || !userB) return false;
  if (userA === userB) return true;

  const a = userA < userB ? userA : userB;
  const b = userA < userB ? userB : userA;

  const { data, error } = await supabase
    .from("connections")
    .select("id")
    .eq("user_id_a", a)
    .eq("user_id_b", b)
    .eq("status", "accepted")
    .maybeSingle();

  if (error) throw new Error(toMsg(error));
  return Boolean(data);
}

async function getPostContext(postId: number) {
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_user_id, visibility, hidden_by_suspension")
    .eq("id", postId)
    .maybeSingle();

  if (postError) throw new Error(toMsg(postError));
  if (!post) return null;
  if ((post as any).hidden_by_suspension) return null;

  let album: any = null;
  const { data: rel, error: relError } = await supabase
    .from("post_albums")
    .select("album_id, sort_order, created_at")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (relError) throw new Error(toMsg(relError));

  const albumId = Number((rel as any)?.album_id);
  if (Number.isFinite(albumId) && albumId > 0) {
    const { data: albumRow, error: albumError } = await supabase
      .from("albums")
      .select("id, owner_user_id, visibility")
      .eq("id", albumId)
      .maybeSingle();

    if (albumError) throw new Error(toMsg(albumError));
    album = albumRow ?? null;
  }

  return {
    post: post as any,
    album,
  };
}

async function getImageContext(imageId: number) {
  const { data: image, error: imageError } = await supabase
    .from("images")
    .select("id, uploader_user_id, visibility, hidden_by_suspension, hidden_by_admin")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError) throw new Error(toMsg(imageError));
  if (!image) return null;
  if ((image as any).hidden_by_suspension) return null;
  if ((image as any).hidden_by_admin) return null;

  const { data: pi, error: piError } = await supabase
    .from("post_images")
    .select("post_id, image_id")
    .eq("image_id", imageId)
    .maybeSingle();

  if (piError) throw new Error(toMsg(piError));

  const postId = Number((pi as any)?.post_id);
  if (!Number.isFinite(postId) || postId <= 0) return null;

  const postContext = await getPostContext(postId);
  if (!postContext) return null;

  return {
    image: image as any,
    postId,
    post: postContext.post,
    album: postContext.album,
  };
}

async function getStoryContext(storyId: number) {
  const { data: story, error: storyError } = await supabase
    .from("post_stories")
    .select("id, post_id, author_user_id, hidden_by_moderation, hidden_by_suspension")
    .eq("id", storyId)
    .maybeSingle();

  if (storyError) throw new Error(toMsg(storyError));
  if (!story) return null;
  if ((story as any).hidden_by_moderation || (story as any).hidden_by_suspension) return null;

  const postId = Number((story as any).post_id);
  if (!Number.isFinite(postId) || postId <= 0) return null;

  const postContext = await getPostContext(postId);
  if (!postContext) return null;

  return {
    story: story as any,
    postId,
    post: postContext.post,
    album: postContext.album,
  };
}

async function canViewPost(viewerUserId: string | null, postId: number) {
  const ctx = await getPostContext(postId);
  if (!ctx) return { allowed: false, reason: "target_not_found" as const };

  if (!viewerUserId) return { allowed: false, reason: "not_authenticated" as const };

  const viewerProfile = await getViewerProfile(viewerUserId);
  const privileged = isPrivilegedViewer(viewerProfile);

  const postAuthorId = String(ctx.post.author_user_id);
  const albumOwnerId = ctx.album?.owner_user_id ? String(ctx.album.owner_user_id) : null;

  const postOwner = viewerUserId === postAuthorId;
  const albumOwner = albumOwnerId === viewerUserId;

  const postConnected = await areUsersConnected(viewerUserId, postAuthorId);
  const albumConnected = albumOwnerId ? await areUsersConnected(viewerUserId, albumOwnerId) : false;

  const effectiveAllowed = ctx.album
    ? visibilityAllows({
        visibility: (ctx.album.visibility ?? "everyone") as ContentVisibility,
        isOwner: albumOwner,
        isPrivileged: privileged,
        isConnected: albumConnected,
      })
    : visibilityAllows({
        visibility: (ctx.post.visibility ?? "everyone") as ContentVisibility,
        isOwner: postOwner,
        isPrivileged: privileged,
        isConnected: postConnected,
      });

  return {
    allowed: privileged || effectiveAllowed,
    reason: privileged || effectiveAllowed ? "allowed" as const : "forbidden" as const,
    postId,
  };
}

async function canViewImage(viewerUserId: string | null, imageId: number) {
  const ctx = await getImageContext(imageId);
  if (!ctx) return { allowed: false, reason: "target_not_found" as const, postId: null };

  if (!viewerUserId) return { allowed: false, reason: "not_authenticated" as const, postId: ctx.postId };

  const viewerProfile = await getViewerProfile(viewerUserId);
  const privileged = isPrivilegedViewer(viewerProfile);

  const imageOwnerId = String(ctx.image.uploader_user_id);
  const imageOwner = viewerUserId === imageOwnerId;
  const imageConnected = await areUsersConnected(viewerUserId, imageOwnerId);

  const imageAllowed = visibilityAllows({
    visibility: (ctx.image.visibility ?? "everyone") as ContentVisibility,
    isOwner: imageOwner,
    isPrivileged: privileged,
    isConnected: imageConnected,
  });

  const postAccess = await canViewPost(viewerUserId, ctx.postId);

  return {
    allowed: privileged || (postAccess.allowed && imageAllowed),
    reason: privileged || (postAccess.allowed && imageAllowed) ? "allowed" as const : "forbidden" as const,
    postId: ctx.postId,
  };
}

async function canViewStory(viewerUserId: string | null, storyId: number) {
  const ctx = await getStoryContext(storyId);
  if (!ctx) return { allowed: false, reason: "target_not_found" as const, postId: null };
  if (!viewerUserId) return { allowed: false, reason: "not_authenticated" as const, postId: ctx.postId };

  const postAccess = await canViewPost(viewerUserId, ctx.postId);
  return {
    allowed: postAccess.allowed,
    reason: postAccess.allowed ? "allowed" as const : asDeniedReason(postAccess.reason),
    postId: ctx.postId,
  };
}

function throwAccessError(reason: "not_authenticated" | "target_not_found" | "forbidden") {
  if (reason === "not_authenticated") {
    throw new Error("Musíš být přihlášen/a.");
  }
  if (reason === "target_not_found") {
    throw new Error("Cíl komentáře nebyl nalezen.");
  }
  throw new Error("K tomuto obsahu nemáš přístup.");
}

function asDeniedReason(reason: "allowed" | "not_authenticated" | "target_not_found" | "forbidden") {
  return reason === "allowed" ? "forbidden" : reason;
}

export async function getImageComments(imageId: number): Promise<CommentRow[]> {
  const viewerUserId = await getAuthUserId();
  const access = await canViewImage(viewerUserId, imageId);
  if (!access.allowed) {
    throwAccessError(asDeniedReason(access.reason));
  }

  const { data, error } = await supabase
    .from("comments")
    .select(
      [
        "id",
        "author_user_id",
        "body",
        "created_at",
        "updated_at",
        "post_id",
        "image_id",
        "story_id",
        "parent_comment_id",
        "target_type",
        "author_snapshot_display_name",
        "author_snapshot_avatar_url",
      ].join(",")
    )
    .eq("image_id", imageId)
    .eq("target_type", "image")
    .eq("is_deleted", false)
    .eq("is_hidden_by_moderation", false)
    .eq("hidden_by_suspension", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(toMsg(error));
  return ((data ?? []) as unknown) as CommentRow[];
}

export async function getPostComments(postId: number): Promise<CommentRow[]> {
  const viewerUserId = await getAuthUserId();
  const access = await canViewPost(viewerUserId, postId);
  if (!access.allowed) {
    throwAccessError(asDeniedReason(access.reason));
  }

  const { data, error } = await supabase
    .from("comments")
    .select(
      [
        "id",
        "author_user_id",
        "body",
        "created_at",
        "updated_at",
        "post_id",
        "image_id",
        "story_id",
        "parent_comment_id",
        "target_type",
        "author_snapshot_display_name",
        "author_snapshot_avatar_url",
      ].join(",")
    )
    .eq("post_id", postId)
    .eq("target_type", "post")
    .eq("is_deleted", false)
    .eq("is_hidden_by_moderation", false)
    .eq("hidden_by_suspension", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(toMsg(error));
  return ((data ?? []) as unknown) as CommentRow[];
}

export async function getStoryComments(storyId: number): Promise<CommentRow[]> {
  const viewerUserId = await getAuthUserId();
  const access = await canViewStory(viewerUserId, storyId);
  if (!access.allowed) {
    throwAccessError(asDeniedReason(access.reason));
  }

  const { data, error } = await supabase
    .from("comments")
    .select(
      [
        "id",
        "author_user_id",
        "body",
        "created_at",
        "updated_at",
        "post_id",
        "image_id",
        "story_id",
        "parent_comment_id",
        "target_type",
        "author_snapshot_display_name",
        "author_snapshot_avatar_url",
      ].join(",")
    )
    .eq("story_id", storyId)
    .eq("target_type", "story")
    .eq("is_deleted", false)
    .eq("is_hidden_by_moderation", false)
    .eq("hidden_by_suspension", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(toMsg(error));
  return ((data ?? []) as unknown) as CommentRow[];
}

export async function createImageComment(params: {
  imageId: number;
  postId: number;
  body: string;
  parentCommentId?: number | null;
}): Promise<CommentRow> {
  const cleanBody = normalizeBody(params.body);

  if (!params.imageId || !params.postId) {
    throw new Error("Chybí imageId nebo postId.");
  }

  if (!cleanBody) {
    throw new Error("Komentář je prázdný.");
  }

  if (cleanBody.length > 1000) {
    throw new Error("Komentář je příliš dlouhý (max 1000 znaků).");
  }

  const viewerUserId = await getAuthUserId();
  const access = await canViewImage(viewerUserId, params.imageId);
  if (!access.allowed) {
    throwAccessError(asDeniedReason(access.reason));
  }

  if (!viewerUserId) {
    throw new Error("Musíš být přihlášen/a.");
  }

  let parentCommentAuthorUserId: string | null = null;
  if (params.parentCommentId != null) {
    const { data: parentComment, error: parentError } = await supabase
      .from("comments")
      .select("id, image_id, post_id, target_type, author_user_id, is_deleted, is_hidden_by_moderation, hidden_by_suspension")
      .eq("id", params.parentCommentId)
      .maybeSingle();

    if (parentError) throw new Error(toMsg(parentError));
    if (!parentComment || parentComment.is_deleted || parentComment.is_hidden_by_moderation || parentComment.hidden_by_suspension) {
      throw new Error("Komentář, na který odpovídáš, nebyl nalezen.");
    }

    if (
      Number(parentComment.image_id ?? 0) !== params.imageId ||
      Number(parentComment.post_id ?? 0) !== params.postId ||
      parentComment.target_type !== "image"
    ) {
      throw new Error("Na tento komentář nelze odpovědět u jiné fotky.");
    }

    parentCommentAuthorUserId = String(parentComment.author_user_id ?? "") || null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (profileError) throw new Error(toMsg(profileError));

  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_user_id: viewerUserId,
      post_id: params.postId,
      image_id: params.imageId,
      story_id: null,
      parent_comment_id: params.parentCommentId ?? null,
      target_type: "image",
      body: cleanBody,
      author_snapshot_display_name: profile?.display_name ?? null,
      author_snapshot_avatar_url: profile?.avatar_url ?? null,
    })
    .select(
      [
        "id",
        "author_user_id",
        "body",
        "created_at",
        "updated_at",
        "post_id",
        "image_id",
        "story_id",
        "parent_comment_id",
        "target_type",
        "author_snapshot_display_name",
        "author_snapshot_avatar_url",
      ].join(",")
    )
    .single();

  if (error) throw new Error(toMsg(error));

  try {
    const ctx = await getImageContext(params.imageId);
    const targetUserId = String(ctx?.image?.uploader_user_id ?? "");
    if (parentCommentAuthorUserId && parentCommentAuthorUserId !== viewerUserId) {
      await createNetworkNotification({
        targetUserId: parentCommentAuthorUserId,
        type: "comment_replied",
        entityBigintId: params.imageId,
      });
    }

    if (targetUserId && targetUserId !== viewerUserId && targetUserId !== parentCommentAuthorUserId) {
      await createNetworkNotification({
        targetUserId,
        type: "photo_commented",
        entityBigintId: params.imageId,
      });
    }
  } catch (notificationError) {
    console.warn("Komentář byl uložen, ale upozornění pro autora se nepodařilo vytvořit.", notificationError);
  }

  return (data as unknown) as CommentRow;
}

export async function createPostComment(params: {
  postId: number;
  body: string;
  parentCommentId?: number | null;
}): Promise<CommentRow> {
  const cleanBody = normalizeBody(params.body);

  if (!params.postId) {
    throw new Error("Chybí postId.");
  }

  if (!cleanBody) {
    throw new Error("Komentář je prázdný.");
  }

  if (cleanBody.length > 1000) {
    throw new Error("Komentář je příliš dlouhý (max 1000 znaků).");
  }

  const viewerUserId = await getAuthUserId();
  const access = await canViewPost(viewerUserId, params.postId);
  if (!access.allowed) {
    throwAccessError(asDeniedReason(access.reason));
  }

  if (!viewerUserId) {
    throw new Error("Musíš být přihlášen/a.");
  }

  if (params.parentCommentId != null) {
    const { data: parentComment, error: parentError } = await supabase
      .from("comments")
      .select("id, post_id, image_id, target_type, is_deleted, is_hidden_by_moderation, hidden_by_suspension")
      .eq("id", params.parentCommentId)
      .maybeSingle();

    if (parentError) throw new Error(toMsg(parentError));
    if (!parentComment || parentComment.is_deleted || parentComment.is_hidden_by_moderation || parentComment.hidden_by_suspension) {
      throw new Error("Komentář, na který odpovídáš, nebyl nalezen.");
    }

    if (Number(parentComment.post_id ?? 0) !== params.postId || parentComment.target_type !== "post" || parentComment.image_id != null) {
      throw new Error("Na tento komentář nelze odpovědět u jiného postu.");
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (profileError) throw new Error(toMsg(profileError));

  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_user_id: viewerUserId,
      post_id: params.postId,
      image_id: null,
      story_id: null,
      parent_comment_id: params.parentCommentId ?? null,
      target_type: "post",
      body: cleanBody,
      author_snapshot_display_name: profile?.display_name ?? null,
      author_snapshot_avatar_url: profile?.avatar_url ?? null,
    })
    .select(
      [
        "id",
        "author_user_id",
        "body",
        "created_at",
        "updated_at",
        "post_id",
        "image_id",
        "story_id",
        "parent_comment_id",
        "target_type",
        "author_snapshot_display_name",
        "author_snapshot_avatar_url",
      ].join(",")
    )
    .single();

  if (error) throw new Error(toMsg(error));
  return (data as unknown) as CommentRow;
}

export async function createStoryComment(params: {
  storyId: number;
  body: string;
  parentCommentId?: number | null;
}): Promise<CommentRow> {
  const cleanBody = normalizeBody(params.body);

  if (!params.storyId) {
    throw new Error("Chybí storyId.");
  }

  if (!cleanBody) {
    throw new Error("Komentář je prázdný.");
  }

  if (cleanBody.length > 1000) {
    throw new Error("Komentář je příliš dlouhý (max 1000 znaků).");
  }

  const viewerUserId = await getAuthUserId();
  const access = await canViewStory(viewerUserId, params.storyId);
  if (!access.allowed) {
    throwAccessError(asDeniedReason(access.reason));
  }

  if (!viewerUserId) {
    throw new Error("Musíš být přihlášen/a.");
  }

  const postId = Number(access.postId ?? 0);
  if (!Number.isFinite(postId) || postId <= 0) throw new Error("Chybí postId příběhu.");

  if (params.parentCommentId != null) {
    const { data: parentComment, error: parentError } = await supabase
      .from("comments")
      .select("id, post_id, image_id, story_id, target_type, is_deleted, is_hidden_by_moderation, hidden_by_suspension")
      .eq("id", params.parentCommentId)
      .maybeSingle();

    if (parentError) throw new Error(toMsg(parentError));
    if (!parentComment || parentComment.is_deleted || parentComment.is_hidden_by_moderation || parentComment.hidden_by_suspension) {
      throw new Error("Komentář, na který odpovídáš, nebyl nalezen.");
    }

    if (Number(parentComment.story_id ?? 0) !== params.storyId || parentComment.target_type !== "story") {
      throw new Error("Na tento komentář nelze odpovědět u jiného příběhu.");
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (profileError) throw new Error(toMsg(profileError));

  const { data, error } = await supabase
    .from("comments")
    .insert({
      author_user_id: viewerUserId,
      post_id: postId,
      image_id: null,
      story_id: params.storyId,
      parent_comment_id: params.parentCommentId ?? null,
      target_type: "story",
      body: cleanBody,
      author_snapshot_display_name: profile?.display_name ?? null,
      author_snapshot_avatar_url: profile?.avatar_url ?? null,
    })
    .select(
      [
        "id",
        "author_user_id",
        "body",
        "created_at",
        "updated_at",
        "post_id",
        "image_id",
        "story_id",
        "parent_comment_id",
        "target_type",
        "author_snapshot_display_name",
        "author_snapshot_avatar_url",
      ].join(",")
    )
    .single();

  if (error) throw new Error(toMsg(error));
  return (data as unknown) as CommentRow;
}

export async function deleteComment(commentId: number): Promise<void> {
  if (!Number.isFinite(commentId) || commentId <= 0) {
    throw new Error("Neplatné ID komentáře.");
  }

  const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Komentář se nepodařilo smazat.");
  }
}
