/**
 * File: lib/api/images.ts
 *
 * Purpose:
 * - Upload FULL image to Supabase Storage (bucket: post-images)
 * - Create THUMB image (client-side resize) and upload it too
 * - Insert row into `images`
 * - Provide edit/delete APIs used by PostCard/EditImageModal
 * - Enforce minimum age 16+ for uploaded photos (based on user's DOB)
 *
 * Notes:
 * - THUMB is meant for previews in feed/my-posts/my-tips.
 * - FULL is meant for zoom/maximize.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabaseClient";
import { getLegacyPhotoCategoryFromTags, normalizeImageTags } from "@/lib/api/posts";
import { prepareImageUploadVariants } from "@/lib/image/clientImage";

const BUCKET = "post-images";

export type UploadAndCreateImageParams = {
  file: File;
  takenAt: string; // required (YYYY-MM-DD)
  photoCategory?: string;
  photoTags?: string[];
  includeInGlobalAw: boolean;
  comment?: string | null;
  onProgress?: (state: { percent: number; label: string }) => void;
};

function normalizeDateISO(input: string) {
  const s = (input ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = String(m[1]).padStart(2, "0");
    const dd = String(m[2]).padStart(2, "0");
    const yy = String(m[3]);
    return `${yy}-${mm}-${dd}`;
  }

  return s;
}

function yearsDiff(dobISO: string, takenISO: string) {
  const dob = new Date(dobISO + "T00:00:00Z");
  const t = new Date(takenISO + "T00:00:00Z");

  if (Number.isNaN(dob.getTime()) || Number.isNaN(t.getTime())) return NaN;

  let years = t.getUTCFullYear() - dob.getUTCFullYear();
  const m = t.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && t.getUTCDate() < dob.getUTCDate())) years--;
  return years;
}

function uniqueName(userId: string, fileName: string) {
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
  const stamp = Date.now();
  const rnd = Math.random().toString(16).slice(2);
  return `${userId}/${stamp}-${rnd}.${ext}`;
}

function uniqueVariantNameFromFullPath(fullPath: string, variant: "thumb" | "feed") {
  const lastDot = fullPath.lastIndexOf(".");
  if (lastDot === -1) return fullPath + `.${variant}.webp`;
  return fullPath.slice(0, lastDot) + `.${variant}.webp`;
}

function toMessage(err: any): string {
  if (!err) return "Nezn�m� chyba.";
  if (typeof err === "string") return err;
  return err?.message || err?.error_description || err?.details || "Nezn�m� chyba.";
}

function isMissingImageTagsTable(err: any): boolean {
  return Boolean(err?.message?.includes("Could not find the table 'public.image_tags'"));
}

async function uploadPreparedVariant(path: string, file: File) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/webp",
  });
  if (error) throw new Error(toMessage(error));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? null;
  if (!publicUrl) throw new Error("Nepodařilo se získat URL fotky.");
  return publicUrl;
}

async function prepareAndUploadImageVariants(params: {
  userId: string;
  file: File;
  onProgress?: (percent: number, label: string) => void;
}) {
  const { userId, file, onProgress } = params;

  onProgress?.(15, "Fotku optimalizujeme pro nejlepší kvalitu a rychlost");
  const prepared = await prepareImageUploadVariants(file);

  const detailPath = uniqueName(userId, prepared.detail.file.name);
  const feedPath = uniqueVariantNameFromFullPath(detailPath, "feed");
  const thumbPath = uniqueVariantNameFromFullPath(detailPath, "thumb");

  const uploadedPaths: string[] = [];
  try {
    onProgress?.(35, "Nahrávám kvalitní verzi fotky");
    const publicUrl = await uploadPreparedVariant(detailPath, prepared.detail.file);
    uploadedPaths.push(detailPath);

    onProgress?.(55, "Nahrávám verzi pro feed");
    const publicUrlMedium = await uploadPreparedVariant(feedPath, prepared.feed.file);
    uploadedPaths.push(feedPath);

    onProgress?.(72, "Nahrávám malý náhled fotky");
    const publicUrlThumb = await uploadPreparedVariant(thumbPath, prepared.thumb.file);
    uploadedPaths.push(thumbPath);

    return {
      prepared,
      detailPath,
      feedPath,
      thumbPath,
      publicUrl,
      publicUrlMedium,
      publicUrlThumb,
    };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function uploadAndCreateImage(params: UploadAndCreateImageParams) {
  const { file, takenAt, photoCategory, photoTags = [], includeInGlobalAw, comment, onProgress } = params;
  const reportProgress = (percent: number, label: string) => onProgress?.({ percent, label });
  const normalizedTags = normalizeImageTags([...photoTags, photoCategory]);
  const finalTags = normalizedTags;
  const legacyPhotoCategory = getLegacyPhotoCategoryFromTags(finalTags);

  reportProgress(5, "Kontroluji fotku");

  const takenISO = normalizeDateISO(takenAt);
  if (!takenISO || !/^\d{4}-\d{2}-\d{2}$/.test(takenISO)) {
    throw new Error("Chybi nebo je neplatne datum porizeni fotky. Vyber prosim datum porizeni.");
  }

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(toMessage(authErr));
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Nejsi prihlaseny.");

  const { data: prof, error: profErr } = await supabase
    .from("user_profiles")
    .select("date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();

  if (profErr) throw new Error(toMessage(profErr));

  const dob = (prof as any)?.date_of_birth as string | null | undefined;
  if (!dob) throw new Error("Chybi datum narozeni v profilu. Dokonci prosim onboarding.");

  const realAgeYears = yearsDiff(dob, takenISO);
  if (!Number.isFinite(realAgeYears)) {
    throw new Error("Nepodarilo se spocitat vek. Zkontroluj datum narozeni a datum porizeni fotky.");
  }

  if (realAgeYears < 16) {
    throw new Error("U AgeWinners je mozne publikovat fotografie, na kterych jsou osoby starsi nez 16 let.");
  }

  const uploaded = await prepareAndUploadImageVariants({
    userId,
    file,
    onProgress: reportProgress,
  });

  const safeComment = comment?.trim() ? comment.trim().slice(0, 50) : null;

  reportProgress(90, "Ukladam fotku");
  const { data: inserted, error: insErr } = await supabase
    .from("images")
    .insert({
      uploader_user_id: userId,
      storage_path: uploaded.detailPath,
      public_url: uploaded.publicUrl,
      storage_path_medium: uploaded.feedPath,
      public_url_medium: uploaded.publicUrlMedium,
      storage_path_thumb: uploaded.thumbPath,
      public_url_thumb: uploaded.publicUrlThumb,
      taken_at: takenISO,
      real_age_years: realAgeYears,
      photo_category: legacyPhotoCategory,
      include_in_global_aw: !!includeInGlobalAw,
      comment: safeComment,
    })
    .select("id, public_url, public_url_medium, public_url_thumb, taken_at, photo_category, include_in_global_aw, comment, real_age_years")
    .single();

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([uploaded.detailPath, uploaded.feedPath, uploaded.thumbPath]);
    throw new Error(toMessage(insErr));
  }

  const imageId = Number((inserted as { id?: unknown } | null)?.id);
  if (Number.isFinite(imageId) && finalTags.length > 0) {
    const { error: tagErr } = await supabase.from("image_tags").insert(
      finalTags.map((tag) => ({
        image_id: imageId,
        tag,
      }))
    );

    if (tagErr && !isMissingImageTagsTable(tagErr)) {
      throw new Error(toMessage(tagErr));
    }
  }
  reportProgress(100, "Fotka je nahrana");
  return inserted as any;
}
export async function getMyImageForEdit(imageId: number) {
  const { data, error } = await supabase
    .from("images")
    .select("id, public_url, public_url_medium, public_url_thumb, storage_path, storage_path_medium, storage_path_thumb, taken_at, photo_category, include_in_global_aw, comment")
    .eq("id", imageId)
    .maybeSingle();

  if (error) throw new Error(toMessage(error));
  if (!data) throw new Error("Fotka nenalezena.");

  const { data: tagRows, error: tagErr } = await supabase
    .from("image_tags")
    .select("tag")
    .eq("image_id", imageId);

  if (tagErr && !isMissingImageTagsTable(tagErr)) {
    throw new Error(toMessage(tagErr));
  }

  const tags = tagErr
    ? normalizeImageTags([(data as any)?.photo_category])
    : normalizeImageTags((tagRows ?? []).map((row: any) => row.tag));

  return { ...(data as any), tags };
}

export async function updateMyImageFile(params: {
  imageId: number;
  file: File;
  onProgress?: (state: { percent: number; label: string }) => void;
}) {
  const { imageId, file, onProgress } = params;
  const reportProgress = (percent: number, label: string) => onProgress?.({ percent, label });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(toMessage(authErr));
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Nejsi prihlaseny.");

  const { data: current, error: currentErr } = await supabase
    .from("images")
    .select("id, storage_path, storage_path_medium, storage_path_thumb")
    .eq("id", imageId)
    .maybeSingle();

  if (currentErr) throw new Error(toMessage(currentErr));
  if (!current) throw new Error("Fotka nenalezena.");

  const oldStoragePath = (current as any)?.storage_path as string | null | undefined;
  const oldMediumPath = (current as any)?.storage_path_medium as string | null | undefined;
  const oldThumbPath = (current as any)?.storage_path_thumb as string | null | undefined;

  const uploaded = await prepareAndUploadImageVariants({
    userId,
    file,
    onProgress: reportProgress,
  });

  reportProgress(90, "Ukladam upravenou fotku");
  const { data, error } = await supabase
    .from("images")
    .update({
      storage_path: uploaded.detailPath,
      public_url: uploaded.publicUrl,
      storage_path_medium: uploaded.feedPath,
      public_url_medium: uploaded.publicUrlMedium,
      storage_path_thumb: uploaded.thumbPath,
      public_url_thumb: uploaded.publicUrlThumb,
    })
    .eq("id", imageId)
    .select("id, public_url, public_url_medium, public_url_thumb, storage_path, storage_path_medium, storage_path_thumb")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([uploaded.detailPath, uploaded.feedPath, uploaded.thumbPath]);
    throw new Error(toMessage(error));
  }

  const oldPaths = [oldStoragePath, oldMediumPath, oldThumbPath].filter(Boolean) as string[];
  if (oldPaths.length > 0) {
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove(oldPaths);
    if (removeErr) console.warn("updateMyImageFile: old storage remove failed:", removeErr.message);
  }

  reportProgress(100, "Upravena fotka je ulozena");
  return data as any;
}
export async function updateMyImageMetadata(params: {
  imageId: number;
  takenAt: string;
  photoCategory?: string;
  photoTags?: string[];
  includeInGlobalAw: boolean;
  comment?: string | null;
}) {
  const { imageId, takenAt, photoCategory, photoTags = [], includeInGlobalAw, comment } = params;
  const takenISO = normalizeDateISO(takenAt);
  const normalizedTags = normalizeImageTags([...photoTags, photoCategory]);
  const finalTags = normalizedTags;
  const legacyPhotoCategory = getLegacyPhotoCategoryFromTags(finalTags);

  if (!takenISO || !/^\d{4}-\d{2}-\d{2}$/.test(takenISO)) {
    throw new Error("Chyb� nebo je neplatn� datum por�zen� (taken_at).");
  }

  const safeComment = comment?.trim() ? comment.trim().slice(0, 50) : null;

  const { data, error } = await supabase
    .from("images")
    .update({
      taken_at: takenISO,
      photo_category: legacyPhotoCategory,
      include_in_global_aw: !!includeInGlobalAw,
      comment: safeComment,
    })
    .eq("id", imageId)
    .select("id, taken_at, photo_category, include_in_global_aw, comment, real_age_years, aw_age_image, avg_guessed_age, guesses_count")
    .single();

  if (error) throw new Error(toMessage(error));

  const { error: deleteTagErr } = await supabase.from("image_tags").delete().eq("image_id", imageId);
  if (deleteTagErr && !isMissingImageTagsTable(deleteTagErr)) throw new Error(toMessage(deleteTagErr));

  if (!deleteTagErr && finalTags.length > 0) {
    const { error: insertTagErr } = await supabase.from("image_tags").insert(
      finalTags.map((tag) => ({
        image_id: imageId,
        tag,
      }))
    );

    if (insertTagErr && !isMissingImageTagsTable(insertTagErr)) throw new Error(toMessage(insertTagErr));
  }
  return data as any;
}

async function countRowsClient(table: string, column: string, value: any) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw new Error(toMessage(error));
  return Number(count ?? 0);
}

export async function deleteMyImageCompletely(imageId: number) {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(toMessage(authErr));
  const userId = auth?.user?.id ?? null;

  // User-facing delete is a soft hide: metrics keep seeing the image row.
  const { data: postLinks, error: plErr } = await supabase
    .from("post_images")
    .select("post_id")
    .eq("image_id", imageId);

  if (plErr) throw new Error(toMessage(plErr));

  const affectedPostIds = Array.from(
    new Set((postLinks ?? []).map((r: any) => Number(r.post_id)).filter((n) => Number.isFinite(n)))
  );

  const { data: img, error: e1 } = await supabase
    .from("images")
    .select("id")
    .eq("id", imageId)
    .maybeSingle();

  if (e1) throw new Error(toMessage(e1));
  if (!img) return;

  const { error: e2 } = await supabase
    .from("images")
    .update({
      hidden_by_admin: true,
      hidden_by_admin_at: new Date().toISOString(),
      hidden_by_admin_by: userId,
    })
    .eq("id", imageId);
  if (e2) throw new Error(toMessage(e2));

  for (const postId of affectedPostIds) {
    try {
      await supabase.from("post_images").delete().eq("post_id", postId).eq("image_id", imageId);
      const remainingImages = await countRowsClient("post_images", "post_id", postId);
      if (remainingImages === 0) {
        await supabase.from("posts").delete().eq("id", postId);
      }
    } catch (e: any) {
      console.warn("deleteMyImageCompletely: post cleanup failed:", e?.message ?? e);
    }
  }
}
