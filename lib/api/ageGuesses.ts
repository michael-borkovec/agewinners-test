/**
 * File: lib/api/ageGuesses.ts
 * Description:
 *   Vkládání tipů věku výhradně přes DB RPC.
 *   - submit_age_guess: tip na jednu fotku
 *   - submit_album_guess: tip na album (vloží tip do všech fotek v albu, max 6)
 *   Klient nikdy nesmí insertovat do tabulky age_guesses přímo.
 */

import { supabase } from "@/lib/supabaseClient";

export type CreateAgeGuessInput = {
  imageId: number;
  guessedAge: number;
  /**
   * Pokud není poslané, DB použije user_profiles.anonymous_guesses_default
   */
  isAnonymous?: boolean;
};

export type CreateAlbumGuessInput = {
  albumId: number;
  guessedAge: number;
  /**
   * Pokud není poslané, DB použije user_profiles.anonymous_guesses_default
   */
  isAnonymous?: boolean;
};

export type CreateAgeGuessResult =
  | { ok: true; guessId: number; guessedAge: number }
  | { ok: false; message: string };

export type CreateAlbumGuessResult =
  | { ok: true; insertedCount: number }
  | { ok: false; message: string };

export type PublicAgeGuessDetail = {
  imageId: number;
  userId: string | null;
  isAnonymous: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  guessedAge: number;
  createdAt: string | null;
};

export async function getMyLatestGuessAgesForImages(
  currentUserId: string,
  imageIds: number[]
): Promise<Record<number, number>> {
  const cleanedIds = Array.from(
    new Set(
      (imageIds ?? [])
        .map((id) => toInt(id))
        .filter((id): id is number => id != null && id > 0)
    )
  );

  if (!currentUserId || cleanedIds.length === 0) return {};

  const { data, error } = await supabase
    .from("age_guesses")
    .select("id, image_id, guessed_age, created_at")
    .eq("guesser_user_id", currentUserId)
    .in("image_id", cleanedIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.warn("getMyLatestGuessAgesForImages failed:", error.message);
    return {};
  }

  const out: Record<number, number> = {};
  for (const row of data ?? []) {
    const imageId = toInt((row as { image_id?: unknown }).image_id);
    const guessedAge = toInt((row as { guessed_age?: unknown }).guessed_age);
    if (!imageId || guessedAge == null) continue;
    if (out[imageId] == null) {
      out[imageId] = guessedAge;
    }
  }

  return out;
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Guess details for a photo.
 * Anonymous guesses keep value/date visible, but do not expose the guesser identity.
 */
export async function getPublicAgeGuessDetails(imageId: number): Promise<PublicAgeGuessDetail[]> {
  const normalizedImageId = toInt(imageId);
  if (!normalizedImageId || normalizedImageId <= 0) return [];

  const { data: rows, error } = await supabase
    .from("age_guesses")
    .select("image_id, guesser_user_id, guessed_age, created_at, is_anonymous")
    .eq("image_id", normalizedImageId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw error;

  const userIds = Array.from(
    new Set(
      ((rows ?? []) as Array<Record<string, unknown>>)
        .filter((row) => !Boolean(row.is_anonymous))
        .map((row) => String(row.guesser_user_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: profiles, error: profileError } = userIds.length
    ? await supabase.from("user_profiles").select("user_id, display_name, avatar_url, bio").in("user_id", userIds)
    : { data: [], error: null };

  if (profileError) throw profileError;

  const profileById = new Map<string, { displayName: string | null; avatarUrl: string | null; bio: string | null }>();
  for (const profile of (profiles ?? []) as Array<Record<string, unknown>>) {
    const userId = String(profile.user_id ?? "");
    if (!userId) continue;
    profileById.set(userId, {
      displayName: profile.display_name ? String(profile.display_name) : null,
      avatarUrl: profile.avatar_url ? String(profile.avatar_url) : null,
      bio: profile.bio ? String(profile.bio) : null,
    });
  }

  return ((rows ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const isAnonymous = Boolean(row.is_anonymous);
      const userId = isAnonymous ? null : String(row.guesser_user_id ?? "");
      const guessedAge = toInt(row.guessed_age);
      const profile = userId ? profileById.get(userId) : null;
      return {
        imageId: toInt(row.image_id) ?? normalizedImageId,
        userId,
        isAnonymous,
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        bio: profile?.bio ?? null,
        guessedAge: guessedAge ?? 0,
        createdAt: row.created_at ? String(row.created_at) : null,
      };
    })
    .filter((row) => (row.isAnonymous || row.userId) && row.guessedAge > 0);
}

/**
 * Tip na jednu fotku přes RPC submit_age_guess.
 */
export async function createAgeGuess(
  input: CreateAgeGuessInput
): Promise<CreateAgeGuessResult> {
  const imageId = toInt(input.imageId);
  const guessedAge = toInt(input.guessedAge);

  if (!imageId || imageId <= 0) return { ok: false, message: "Neplatné imageId." };
  if (guessedAge == null) return { ok: false, message: "Neplatný tipovaný věk." };

  const { data, error } = await supabase.rpc("submit_age_guess", {
    p_image_id: imageId,
    p_guessed_age: guessedAge,
    p_is_anonymous: typeof input.isAnonymous === "boolean" ? input.isAnonymous : null,
  });

  if (error) return { ok: false, message: error.message || "Nepodařilo se uložit tip." };

  const guessId = toInt(data);
  if (!guessId) return { ok: false, message: "RPC vrátila neplatné ID tipu." };

  const { data: guessRow, error: guessError } = await supabase
    .from("age_guesses")
    .select("guessed_age")
    .eq("id", guessId)
    .maybeSingle();

  if (guessError) {
    return { ok: true, guessId, guessedAge };
  }

  const confirmedAge = toInt((guessRow as { guessed_age?: unknown } | null)?.guessed_age) ?? guessedAge;
  return { ok: true, guessId, guessedAge: confirmedAge };
}

/**
 * Tip na album přes RPC submit_album_guess.
 * DB:
 * - ověří, že album obsahuje tipovatelnou sadu fotek přes post_albums -> post_images
 * - respektuje aktuální pravidla album guessu definovaná v DB / RPC
 * - non-superuser: odmítne, pokud už existuje jakýkoli tip na některou fotku v albu
 * - vloží tip do všech fotek v albu voláním submit_age_guess
 */
export async function createAlbumGuess(
  input: CreateAlbumGuessInput
): Promise<CreateAlbumGuessResult> {
  const albumId = toInt(input.albumId);
  const guessedAge = toInt(input.guessedAge);

  if (!albumId || albumId <= 0) return { ok: false, message: "Neplatné albumId." };
  if (guessedAge == null) return { ok: false, message: "Neplatný tipovaný věk." };

  const { data, error } = await supabase.rpc("submit_album_guess", {
    p_album_id: albumId,
    p_guessed_age: guessedAge,
    p_is_anonymous: typeof input.isAnonymous === "boolean" ? input.isAnonymous : null,
  });

  if (error) return { ok: false, message: error.message || "Nepodařilo se uložit tip alba." };

  const insertedCount = toInt(data);
  if (insertedCount == null) {
    return { ok: false, message: "RPC vrátila neplatný počet vložených tipů." };
  }

  return { ok: true, insertedCount };
}
