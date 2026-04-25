/**
 * lib/api/userProfiles.ts
 *
 * Purpose:
 * - Unified API layer for public.user_profiles
 * - Backward compatible for:
 *   - profile/basic (expects ApiResult + camelCase)
 *   - AuthShell sidebar/header (expects ApiResult + camelCase)
 *   - profile/privacy (currently reads returned object in try/catch style)
 *   - profile/personal (needs updateMyPersonalProfile export)
 *
 * Notes:
 * - getMyProfile() returns ApiResult<MyProfile>
 * - MyProfile includes both camelCase and snake_case aliases
 * - updateMyPersonalProfile() applies full snake_case patches for /profile/personal
 */

import { supabase } from "@/lib/supabaseClient";
import type { AgeRevealMode, ContentVisibility, DbUserProfile } from "@/types/db";

export type ApiResult<T> = {
  data: T | null;
  errorMessage: string | null;
};

export type MyProfile = DbUserProfile & {
  userId: string;
  registrationNumber?: number | null;
  displayName: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;

  defaultPostVisibility?: ContentVisibility | null;
  defaultAlbumVisibility?: ContentVisibility | null;
  defaultImageVisibility?: ContentVisibility | null;
  defaultAgeRevealMode?: AgeRevealMode | null;
  defaultAgeRevealDelayDays?: number | null;
  wellbeingDailyEntryVisibilityDefault?: ContentVisibility | null;

  allowAgeVisible?: boolean | null;
  allowConnectionRequests?: boolean | null;
  allowFollowing?: boolean | null;
  notifyConnectionRequests?: boolean | null;
  notifyConnectionDeclined?: boolean | null;
  notifyContactRemoved?: boolean | null;
  notifyFollowStarted?: boolean | null;
  notifyFollowStopped?: boolean | null;
  notifyPhotoCommented?: boolean | null;

  anonymousGuessesDefault?: boolean | null;

  superUser?: boolean | null;
  accountStatus?: string | null;
};

function formatSupabaseError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const anyErr = err as Record<string, unknown>;
  return (
    String(anyErr?.message ?? "") ||
    String(anyErr?.error_description ?? "") ||
    String(anyErr?.details ?? "") ||
    String(anyErr?.hint ?? "") ||
    "Unknown error"
  );
}

function normalizeDateToYmd(input: string | Date): string {
  if (input instanceof Date) {
    const yyyy = input.getFullYear();
    const mm = String(input.getMonth() + 1).padStart(2, "0");
    const dd = String(input.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return String(input);
}

export async function getAuthenticatedUserId(): Promise<ApiResult<string>> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  const userId = data?.user?.id;
  if (!userId) {
    return { data: null, errorMessage: "Uživatel není přihlášen." };
  }

  return { data: userId, errorMessage: null };
}

function mapDbProfileToUi(row: DbUserProfile): MyProfile {
  return {
    ...row,
    userId: row.user_id,
    registrationNumber: row.registration_number ?? null,
    displayName: row.display_name ?? null,
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    dateOfBirth: row.date_of_birth ?? null,

    defaultPostVisibility: row.default_post_visibility ?? null,
    defaultAlbumVisibility: row.default_album_visibility ?? null,
    defaultImageVisibility: row.default_image_visibility ?? null,
    defaultAgeRevealMode: row.default_age_reveal_mode ?? null,
    defaultAgeRevealDelayDays: row.default_age_reveal_delay_days ?? null,
    wellbeingDailyEntryVisibilityDefault: row.wellbeing_daily_entry_visibility_default ?? "everyone",

    allowAgeVisible: row.allow_age_visible ?? null,
    allowConnectionRequests: row.allow_connection_requests ?? null,
    allowFollowing: row.allow_following ?? null,
    notifyConnectionRequests: row.notify_connection_requests ?? null,
    notifyConnectionDeclined: row.notify_connection_declined ?? null,
    notifyContactRemoved: row.notify_contact_removed ?? null,
    notifyFollowStarted: row.notify_follow_started ?? null,
    notifyFollowStopped: row.notify_follow_stopped ?? null,
    notifyPhotoCommented: row.notify_photo_commented ?? null,

    anonymousGuessesDefault: row.anonymous_guesses_default ?? null,

    superUser: row.super_user ?? null,
    role: row.role ?? null,
    accountStatus: row.account_status ?? "active",

    // snake_case aliases
    user_id: row.user_id ?? null,
    registration_number: row.registration_number ?? null,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    date_of_birth: row.date_of_birth ?? null,

    default_post_visibility: row.default_post_visibility ?? null,
    default_album_visibility: row.default_album_visibility ?? null,
    default_image_visibility: row.default_image_visibility ?? null,
    default_age_reveal_mode: row.default_age_reveal_mode ?? null,
    default_age_reveal_delay_days: row.default_age_reveal_delay_days ?? null,
    wellbeing_daily_entry_visibility_default: row.wellbeing_daily_entry_visibility_default ?? "everyone",

    allow_age_visible: row.allow_age_visible ?? null,
    allow_connection_requests: row.allow_connection_requests ?? null,
    allow_following: row.allow_following ?? null,
    notify_connection_requests: row.notify_connection_requests ?? null,
    notify_connection_declined: row.notify_connection_declined ?? null,
    notify_contact_removed: row.notify_contact_removed ?? null,
    notify_follow_started: row.notify_follow_started ?? null,
    notify_follow_stopped: row.notify_follow_stopped ?? null,
    notify_photo_commented: row.notify_photo_commented ?? null,

    anonymous_guesses_default: row.anonymous_guesses_default ?? null,
    personalization_ads_consent: row.personalization_ads_consent ?? false,
    personalization_ads_consent_at: row.personalization_ads_consent_at ?? null,
    account_status: row.account_status ?? "active",
    suspended_at: row.suspended_at ?? null,
    suspended_by: row.suspended_by ?? null,
    suspension_reason: row.suspension_reason ?? null,
  };
}

export async function getMyProfile(): Promise<ApiResult<MyProfile>> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    return { data: null, errorMessage: auth.errorMessage };
  }

  const userId = auth.data;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  if (!data) {
    const { error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          display_name: "Nový uživatel",
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      return { data: null, errorMessage: formatSupabaseError(upsertError) };
    }

    const { data: refetched, error: refetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (refetchError) {
      return { data: null, errorMessage: formatSupabaseError(refetchError) };
    }

    return { data: mapDbProfileToUi(refetched), errorMessage: null };
  }

  return { data: mapDbProfileToUi(data), errorMessage: null };
}

export async function updateMyBasicProfile(payload: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
}): Promise<ApiResult<null>> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    return { data: null, errorMessage: auth.errorMessage };
  }

  const userId = auth.data;
  const update: Record<string, unknown> = {};

  if (payload.displayName !== undefined) update.display_name = payload.displayName;
  if (payload.bio !== undefined) update.bio = payload.bio;
  if (payload.avatarUrl !== undefined) update.avatar_url = payload.avatarUrl;

  const { error } = await supabase.from("user_profiles").update(update).eq("user_id", userId);

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  return { data: null, errorMessage: null };
}

/**
 * Full update helper for /profile/personal and other snake_case profile patches.
 */
export async function updateMyPersonalProfile(payload: Record<string, unknown>): Promise<ApiResult<null>> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    return { data: null, errorMessage: auth.errorMessage };
  }

  const userId = auth.data;
  const update = Object.fromEntries(Object.entries(payload).filter(([key]) => !["user_id", "created_at", "updated_at"].includes(key)));

  const { error } = await supabase.from("user_profiles").update(update).eq("user_id", userId);

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  return { data: null, errorMessage: null };
}

export async function uploadMyAvatar(file: File): Promise<ApiResult<{ avatarUrl: string }>> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    return { data: null, errorMessage: auth.errorMessage };
  }

  const userId = auth.data;

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { data: null, errorMessage: "Podporované formáty: PNG, JPG, WebP." };
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { data: null, errorMessage: "Maximální velikost avatara je 5 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${userId}/avatar.${ext}`;

  const upload = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (upload.error) {
    return { data: null, errorMessage: formatSupabaseError(upload.error) };
  }

  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = publicData?.publicUrl;

  if (!avatarUrl) {
    return { data: null, errorMessage: "Nepodařilo se získat veřejnou URL avatara." };
  }

  const save = await updateMyBasicProfile({ avatarUrl });
  if (save.errorMessage) {
    return { data: null, errorMessage: save.errorMessage };
  }

  return { data: { avatarUrl }, errorMessage: null };
}

export async function removeMyAvatar(): Promise<ApiResult<null>> {
  return updateMyBasicProfile({ avatarUrl: null });
}

export async function updateMyDateOfBirthSuperUser(
  dateOfBirth: string | Date
): Promise<ApiResult<null>> {
  const p_date_of_birth = normalizeDateToYmd(dateOfBirth);

  const { error } = await supabase.rpc("update_my_date_of_birth_super_user", {
    p_date_of_birth,
  });

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  return { data: null, errorMessage: null };
}

export async function updateMyPrivacySettings(payload: {
  defaultPostVisibility?: ContentVisibility;
  defaultAlbumVisibility?: ContentVisibility;
  defaultImageVisibility?: ContentVisibility;
  defaultAgeRevealMode?: AgeRevealMode;
  defaultAgeRevealDelayDays?: number;
  allowAgeVisible?: boolean;
  allowConnectionRequests?: boolean;
  allowFollowing?: boolean;
  notifyConnectionRequests?: boolean;
  notifyConnectionDeclined?: boolean;
  notifyContactRemoved?: boolean;
  notifyFollowStarted?: boolean;
  notifyFollowStopped?: boolean;
  notifyPhotoCommented?: boolean;
  anonymousGuessesDefault?: boolean;
  wellbeingDailyEntryVisibilityDefault?: ContentVisibility;
}): Promise<ApiResult<null>> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    return { data: null, errorMessage: auth.errorMessage };
  }

  const userId = auth.data;
  const update: Record<string, unknown> = {};

  if (payload.defaultPostVisibility !== undefined) {
    update.default_post_visibility = payload.defaultPostVisibility;
  }
  if (payload.defaultAlbumVisibility !== undefined) {
    update.default_album_visibility = payload.defaultAlbumVisibility;
  }
  if (payload.defaultImageVisibility !== undefined) {
    update.default_image_visibility = payload.defaultImageVisibility;
  }
  if (payload.defaultAgeRevealMode !== undefined) {
    update.default_age_reveal_mode = payload.defaultAgeRevealMode;
  }
  if (payload.defaultAgeRevealDelayDays !== undefined) {
    update.default_age_reveal_delay_days = payload.defaultAgeRevealDelayDays;
  }
  if (payload.allowAgeVisible !== undefined) {
    update.allow_age_visible = payload.allowAgeVisible;
  }
  if (payload.allowConnectionRequests !== undefined) {
    update.allow_connection_requests = payload.allowConnectionRequests;
  }
  if (payload.allowFollowing !== undefined) {
    update.allow_following = payload.allowFollowing;
  }
  if (payload.notifyConnectionRequests !== undefined) {
    update.notify_connection_requests = payload.notifyConnectionRequests;
  }
  if (payload.notifyConnectionDeclined !== undefined) {
    update.notify_connection_declined = payload.notifyConnectionDeclined;
  }
  if (payload.notifyContactRemoved !== undefined) {
    update.notify_contact_removed = payload.notifyContactRemoved;
  }
  if (payload.notifyFollowStarted !== undefined) {
    update.notify_follow_started = payload.notifyFollowStarted;
  }
  if (payload.notifyFollowStopped !== undefined) {
    update.notify_follow_stopped = payload.notifyFollowStopped;
  }
  if (payload.notifyPhotoCommented !== undefined) {
    update.notify_photo_commented = payload.notifyPhotoCommented;
  }
  if (payload.anonymousGuessesDefault !== undefined) {
    update.anonymous_guesses_default = payload.anonymousGuessesDefault;
  }
  if (payload.wellbeingDailyEntryVisibilityDefault !== undefined) {
    update.wellbeing_daily_entry_visibility_default = payload.wellbeingDailyEntryVisibilityDefault;
  }

  const { error } = await supabase.from("user_profiles").update(update).eq("user_id", userId);

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  return { data: null, errorMessage: null };
}

export async function updateMyOnboarding(payload: {
  dateOfBirth: string | Date;
  defaultPostVisibility?: ContentVisibility;
  defaultAlbumVisibility?: ContentVisibility;
  defaultImageVisibility?: ContentVisibility;
  defaultAgeRevealMode?: AgeRevealMode;
  defaultAgeRevealDelayDays?: number;
}): Promise<ApiResult<null>> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    return { data: null, errorMessage: auth.errorMessage };
  }

  const current = await getMyProfile();
  if (current.errorMessage || !current.data) {
    return { data: null, errorMessage: current.errorMessage ?? "Profil se nepodařilo načíst." };
  }

  const update: Record<string, unknown> = {};

  if (!current.data.date_of_birth) {
    update.date_of_birth = normalizeDateToYmd(payload.dateOfBirth);
  }

  if (payload.defaultPostVisibility !== undefined) update.default_post_visibility = payload.defaultPostVisibility;
  if (payload.defaultAlbumVisibility !== undefined) update.default_album_visibility = payload.defaultAlbumVisibility;
  if (payload.defaultImageVisibility !== undefined) update.default_image_visibility = payload.defaultImageVisibility;
  if (payload.defaultAgeRevealMode !== undefined) update.default_age_reveal_mode = payload.defaultAgeRevealMode;
  if (payload.defaultAgeRevealDelayDays !== undefined) update.default_age_reveal_delay_days = payload.defaultAgeRevealDelayDays;

  if (Object.keys(update).length === 0) {
    return { data: null, errorMessage: null };
  }

  const { error } = await supabase.from("user_profiles").update(update).eq("user_id", auth.data);

  if (error) {
    return { data: null, errorMessage: formatSupabaseError(error) };
  }

  return { data: null, errorMessage: null };
}

export async function applyMyPostVisibilityBackfill(
  visibility: ContentVisibility
): Promise<number> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    throw new Error(auth.errorMessage ?? "Uživatel není přihlášen.");
  }

  const { data, error } = await supabase
    .from("posts")
    .update({ visibility })
    .eq("author_user_id", auth.data)
    .select("id");

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (data ?? []).length;
}

export async function applyMyAlbumVisibilityBackfill(
  visibility: ContentVisibility
): Promise<number> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    throw new Error(auth.errorMessage ?? "Uživatel není přihlášen.");
  }

  const { data, error } = await supabase
    .from("albums")
    .update({ visibility })
    .eq("owner_user_id", auth.data)
    .select("id");

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (data ?? []).length;
}

export async function applyMyImageVisibilityBackfill(
  visibility: ContentVisibility
): Promise<number> {
  const auth = await getAuthenticatedUserId();
  if (!auth.data) {
    throw new Error(auth.errorMessage ?? "Uživatel není přihlášen.");
  }

  const { data, error } = await supabase
    .from("images")
    .update({ visibility })
    .eq("uploader_user_id", auth.data)
    .select("id");

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return (data ?? []).length;
}

export async function updateMyGuessPrivacySettings(payload: {
  anonymousGuessesDefault?: boolean;
}): Promise<ApiResult<null>> {
  return updateMyPrivacySettings({
    anonymousGuessesDefault: payload.anonymousGuessesDefault,
  });
}

export async function revealMyGuesses(): Promise<number> {
  const res = await updateMyPrivacySettings({ anonymousGuessesDefault: false });
  if (res.errorMessage) {
    throw new Error(res.errorMessage);
  }
  return 0;
}
