/**
 * File: lib/server/adminDeleteImage.ts
 *
 * Purpose:
 * - Shared server-only helper for deleting an image as admin/moderator.
 * - Ensures identical behavior across:
 *    - DELETE /api/admin/images
 *    - POST /api/admin/image-reports (confirm -> delete)
 *
 * Behavior:
 * - Inserts moderation event ALWAYS into image_moderation_events:
 *    - If image has ANY report (any status): event_type='rejected_and_deleted'
 *    - Else: event_type='deleted_by_admin'
 * - Deletes image row from DB (CASCADE removes post_images)
 * - Cleans up empty posts; albums may remain empty
 * - Removes storage objects from bucket "post-images" (best-effort; returns warning on failure)
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function countRows(admin: ReturnType<typeof getSupabaseAdmin>, table: string, column: string, value: any) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  if (error) throw new Error(error.message);
  return Number(count ?? 0);
}

export async function adminDeleteImage(params: {
  imageId: number;
  moderatorUserId: string;
  noteFromUi?: string | null;
}) {
  const { imageId, moderatorUserId } = params;
  const noteFromUi = typeof params.noteFromUi === "string" ? params.noteFromUi.trim() : "";

  const admin = getSupabaseAdmin();

  // 0) Find affected posts BEFORE deleting image (because post_images will cascade away)
  const { data: postLinks, error: postLinksErr } = await admin
    .from("post_images")
    .select("post_id")
    .eq("image_id", imageId);

  if (postLinksErr) throw new Error(postLinksErr.message);

  const affectedPostIds = Array.from(
    new Set((postLinks ?? []).map((r: any) => Number(r.post_id)).filter((n) => Number.isFinite(n)))
  );

  // 1) Load image details BEFORE deleting DB row
  const { data: img, error: imgErr } = await admin
    .from("images")
    .select("id, uploader_user_id, storage_path, storage_path_medium, storage_path_thumb")
    .eq("id", imageId)
    .maybeSingle();

  if (imgErr) throw new Error(imgErr.message);
  if (!img) {
    // Idempotency: caller may attempt to delete already-deleted image.
    return {
      ok: true,
      already_deleted: true,
      deleted: { imageId, paths: [] as string[] },
      moderation_event: null as any,
      cleanup: { deleted_posts: [] as number[] },
      warning: null as string | null,
    };
  }

  // 2) Find last report for this image (ANY status)
  const { data: lastReport, error: repErr } = await admin
    .from("image_reports")
    .select("id, status, reason, details, created_at, reporter_user_id")
    .eq("image_id", imageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (repErr) {
    // non-fatal
    console.warn("[adminDeleteImage] failed to load image_reports:", repErr.message);
  }

  const hasAnyReport = Boolean((lastReport as any)?.id);
  const eventType = hasAnyReport ? "rejected_and_deleted" : "deleted_by_admin";
  const reason = hasAnyReport ? String((lastReport as any)?.reason ?? "reported") : "admin_delete";

  const reportDetails = String((lastReport as any)?.details ?? "").trim();
  const mergedNote = [reportDetails, noteFromUi].filter(Boolean).join(" | ").slice(0, 2000);

  // 3) Insert moderation event ALWAYS
  const { error: evErr } = await admin.from("image_moderation_events").insert({
    image_id: imageId,
    uploader_user_id: (img as any).uploader_user_id,
    event_type: eventType,
    report_id: hasAnyReport ? ((lastReport as any)?.id ?? null) : null,
    moderator_user_id: moderatorUserId,
    reason,
    note: mergedNote.length ? mergedNote : null,
  });

  if (evErr) throw new Error(`moderation_event_insert_failed: ${evErr.message}`);

  // 4) Delete DB row (CASCADE removes post_images)
  const { error: delErr } = await admin.from("images").delete().eq("id", imageId);
  if (delErr) throw new Error(delErr.message);

  // 4b) Cleanup: delete empty posts. Albums may remain empty.
  const deletedPosts: number[] = [];
  for (const postId of affectedPostIds) {
    const remainingImages = await countRows(admin, "post_images", "post_id", postId);
    if (remainingImages === 0) {
      const { error: pDelErr } = await admin.from("posts").delete().eq("id", postId);
      if (!pDelErr) deletedPosts.push(postId);
    }
  }

  // 5) Delete files from Storage bucket "post-images" (best-effort)
  const pathsToDelete: string[] = [];
  if ((img as any).storage_path) pathsToDelete.push(String((img as any).storage_path));
  if ((img as any).storage_path_medium) pathsToDelete.push(String((img as any).storage_path_medium));
  if ((img as any).storage_path_thumb) pathsToDelete.push(String((img as any).storage_path_thumb));

  let storageWarning: string | null = null;
  if (pathsToDelete.length > 0) {
    const { error: stErr } = await admin.storage.from("post-images").remove(pathsToDelete);
    if (stErr) storageWarning = stErr.message;
  }

  return {
    ok: true,
    already_deleted: false,
    deleted: { imageId, paths: pathsToDelete },
    moderation_event: {
      event_type: eventType,
      report_id: hasAnyReport ? ((lastReport as any)?.id ?? null) : null,
    },
    cleanup: { deleted_posts: deletedPosts },
    warning: storageWarning,
  };
}
