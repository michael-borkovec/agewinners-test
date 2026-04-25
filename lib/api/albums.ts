/**
 * File: lib/api/albums.ts
 *
 * Purpose:
 * - API vrstva pro nový model alb v AgeWinners.
 *
 * Nový model:
 * - album = kolekce postů
 * - fotky patří pouze postům
 * - vazba album ↔ post je přes tabulku post_albums
 */

import { supabase } from "@/lib/supabaseClient";
import type { DbAlbum } from "@/types/db";

type AlbumVisibility = DbAlbum["visibility"];

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function errMsg(error: any, fallback: string) {
  return error?.message || error?.details || error?.hint || fallback;
}

export async function createAlbum(params: {
  ownerUserId: string;
  title: string;
  description?: string;
  visibility?: AlbumVisibility;
}): Promise<DbAlbum> {
  const { ownerUserId, title, description, visibility } = params;

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    throw new Error("Název alba je povinný.");
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      owner_user_id: ownerUserId,
      title: cleanTitle,
      description: description?.trim() ? description.trim() : null,
      visibility: visibility ?? "everyone",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createAlbum error", error);
    throw new Error(errMsg(error, "Nepodařilo se vytvořit album."));
  }

  return data as DbAlbum;
}

export async function getAlbumsByOwner(ownerUserId: string): Promise<DbAlbum[]> {
  if (!ownerUserId) {
    throw new Error("Chybí ownerUserId.");
  }

  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getAlbumsByOwner error", error);
    throw new Error(errMsg(error, "Nepodařilo se načíst alba pro daného uživatele."));
  }

  return data as DbAlbum[];
}

/**
 * Aktuální aplikační pravidlo:
 * - jeden post může být maximálně v jednom albu
 * - proto před vložením smažeme případné staré vazby pro post
 */
export async function addPostToAlbum(params: {
  postId: number;
  albumId: number;
  sortOrder?: number;
}): Promise<void> {
  const { postId, albumId, sortOrder = 0 } = params;

  if (!Number.isFinite(postId) || postId <= 0) {
    throw new Error("Neplatné ID postu.");
  }
  if (!Number.isFinite(albumId) || albumId <= 0) {
    throw new Error("Neplatné ID alba.");
  }

  const { error: deleteError } = await supabase
    .from("post_albums")
    .delete()
    .eq("post_id", postId);

  if (deleteError) {
    console.error("addPostToAlbum delete old relation error", deleteError);
    throw new Error(errMsg(deleteError, "Nepodařilo se připravit přiřazení postu do alba."));
  }

  const { error: insertError } = await supabase
    .from("post_albums")
    .insert({
      post_id: postId,
      album_id: albumId,
      sort_order: sortOrder,
    });

  if (insertError) {
    console.error("addPostToAlbum insert relation error", insertError);
    throw new Error(errMsg(insertError, "Nepodařilo se přidat post do alba."));
  }
}

export async function removePostFromAlbum(params: {
  postId: number;
  albumId: number;
}): Promise<void> {
  const { postId, albumId } = params;

  if (!Number.isFinite(postId) || postId <= 0) {
    throw new Error("Neplatné ID postu.");
  }
  if (!Number.isFinite(albumId) || albumId <= 0) {
    throw new Error("Neplatné ID alba.");
  }

  const { error } = await supabase
    .from("post_albums")
    .delete()
    .match({
      post_id: postId,
      album_id: albumId,
    });

  if (error) {
    console.error("removePostFromAlbum error", error);
    throw new Error(errMsg(error, "Nepodařilo se odebrat post z alba."));
  }
}

export async function removePostFromAnyAlbum(postId: number): Promise<void> {
  if (!Number.isFinite(postId) || postId <= 0) {
    throw new Error("Neplatné ID postu.");
  }

  const { error } = await supabase
    .from("post_albums")
    .delete()
    .eq("post_id", postId);

  if (error) {
    console.error("removePostFromAnyAlbum error", error);
    throw new Error(errMsg(error, "Nepodařilo se odebrat post z alba."));
  }
}

/**
 * NOVÉ — editace názvu a popisu alba
 */
export async function updateAlbumDetails(params: {
  albumId: number;
  title: string;
  description?: string;
}): Promise<void> {
  const { albumId, title, description } = params;

  if (!Number.isFinite(albumId) || albumId <= 0) {
    throw new Error("Neplatné ID alba.");
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    throw new Error("Název alba je povinný.");
  }

  const { error } = await supabase
    .from("albums")
    .update({
      title: cleanTitle,
      description: description?.trim() ? description.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", albumId);

  if (error) {
    console.error("updateAlbumDetails error", error);
    throw new Error(errMsg(error, "Nepodařilo se upravit album."));
  }
}

/**
 * Robustní verze:
 * - bez hlubokého nested selectu
 * - načítá data v několika krocích a skládá je v TS
 */
export async function getAlbumsWithPosts(ownerUserId: string): Promise<any[]> {
  if (!ownerUserId) {
    throw new Error("Chybí ownerUserId.");
  }

  // 1) alba vlastníka
  const { data: albums, error: albumsError } = await supabase
    .from("albums")
    .select("id, owner_user_id, title, description, visibility, created_at, updated_at")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (albumsError || !albums) {
    console.error("getAlbumsWithPosts albums error", albumsError);
    throw new Error(errMsg(albumsError, "Nepodařilo se načíst alba."));
  }

  const albumIds = albums.map((a: any) => toInt(a.id)).filter((x) => x > 0);
  if (albumIds.length === 0) return [];

  // 2) vazby album -> post
  const { data: postAlbumRows, error: paError } = await supabase
    .from("post_albums")
    .select("post_id, album_id, sort_order, created_at")
    .in("album_id", albumIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (paError) {
    console.error("getAlbumsWithPosts post_albums error", paError);
    throw new Error(errMsg(paError, "Nepodařilo se načíst vazby album → post."));
  }

  const postIds = uniq(
    (postAlbumRows ?? [])
      .map((r: any) => toInt(r.post_id))
      .filter((x) => x > 0)
  );

  // pokud album nemá posty, vrátíme prázdná post_albums
  if (postIds.length === 0) {
    return albums.map((album: any) => ({
      ...album,
      post_albums: [],
    }));
  }

  // 3) posty
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, created_at, author_user_id, title, text, visibility")
    .in("id", postIds);

  if (postsError) {
    console.error("getAlbumsWithPosts posts error", postsError);
    throw new Error(errMsg(postsError, "Nepodařilo se načíst posty v albech."));
  }

  const postsById = new Map<number, any>();
  (posts ?? []).forEach((p: any) => postsById.set(toInt(p.id), p));

  // 4) autoři
  const authorIds = uniq(
    (posts ?? [])
      .map((p: any) => String(p.author_user_id ?? ""))
      .filter(Boolean)
  );

  const { data: profiles, error: profilesError } = authorIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", authorIds)
    : { data: [], error: null };

  if (profilesError) {
    console.warn("getAlbumsWithPosts user_profiles error", profilesError);
  }

  const profileByUserId = new Map<string, any>();
  (profiles ?? []).forEach((p: any) => {
    profileByUserId.set(String(p.user_id), p);
  });

  // 5) post_images
  const { data: postImages, error: postImagesError } = await supabase
    .from("post_images")
    .select("post_id, image_id, sort_order, created_at")
    .in("post_id", postIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (postImagesError) {
    console.error("getAlbumsWithPosts post_images error", postImagesError);
    throw new Error(errMsg(postImagesError, "Nepodařilo se načíst fotky postů."));
  }

  const imageIds = uniq(
    (postImages ?? [])
      .map((r: any) => toInt(r.image_id))
      .filter((x) => x > 0)
  );

  // 6) images
  const { data: images, error: imagesError } = imageIds.length
    ? await supabase
        .from("images")
        .select(`
          id,
          public_url,
          public_url_medium,
          public_url_thumb,
          storage_path_medium,
          storage_path_thumb,
          photo_category,
          taken_at,
          include_in_global_aw,
          comment,
          real_age_years,
          aw_age_image,
          avg_guessed_age,
          guesses_count,
          uploader_user_id
        `)
        .in("id", imageIds)
    : { data: [], error: null };

  if (imagesError) {
    console.error("getAlbumsWithPosts images error", imagesError);
    throw new Error(errMsg(imagesError, "Nepodařilo se načíst obrázky postů."));
  }

  const imageById = new Map<number, any>();
  (images ?? []).forEach((img: any) => imageById.set(toInt(img.id), img));

  // 7) images by post
  const imagesByPostId = new Map<number, any[]>();
  (postImages ?? []).forEach((rel: any) => {
    const pid = toInt(rel.post_id);
    const iid = toInt(rel.image_id);
    const img = imageById.get(iid);
    if (!pid || !img) return;

    const arr = imagesByPostId.get(pid) ?? [];
    arr.push({
      ...img,
      publicUrl: img.public_url ?? null,
      publicUrlMedium: img.public_url_medium ?? null,
      publicUrlThumb: img.public_url_thumb ?? null,
      public_url: img.public_url ?? null,
      public_url_medium: img.public_url_medium ?? null,
      public_url_thumb: img.public_url_thumb ?? null,
      storage_path_medium: img.storage_path_medium ?? null,
      storage_path_thumb: img.storage_path_thumb ?? null,
    });
    imagesByPostId.set(pid, arr);
  });

  // 8) posts by album
  const relsByAlbumId = new Map<number, any[]>();

  (postAlbumRows ?? []).forEach((rel: any) => {
    const albumId = toInt(rel.album_id);
    const postId = toInt(rel.post_id);
    const post = postsById.get(postId);
    if (!albumId || !post) return;

    const pr = profileByUserId.get(String(post.author_user_id ?? ""));

    const mappedPost = {
      id: postId,
      createdAt: post.created_at ?? null,
      created_at: post.created_at ?? null,
      authorUserId: post.author_user_id ?? null,
      author_user_id: post.author_user_id ?? null,
      author: pr?.display_name ?? post.author_user_id ?? "",
      authorAvatarUrl: pr?.avatar_url ?? null,
      title: post.title ?? "",
      text: post.text ?? "",
      visibility: post.visibility ?? "everyone",
      images: imagesByPostId.get(postId) ?? [],
    };

    const arr = relsByAlbumId.get(albumId) ?? [];
    arr.push({
      post_id: postId,
      album_id: albumId,
      sort_order: rel.sort_order ?? 0,
      created_at: rel.created_at ?? null,
      posts: mappedPost,
    });
    relsByAlbumId.set(albumId, arr);
  });

  // 9) finální výstup kompatibilní s app/my-albums/page.tsx
  return albums.map((album: any) => ({
    ...album,
    post_albums: relsByAlbumId.get(toInt(album.id)) ?? [],
  }));
}

export async function deleteMyAlbum(
  albumId: number,
  options?: { deletePosts?: boolean }
): Promise<void> {
  const deletePosts = options?.deletePosts ?? false;

  if (!Number.isFinite(albumId) || albumId <= 0) {
    throw new Error("Neplatné ID alba.");
  }

  const { data: rels, error: relError } = await supabase
    .from("post_albums")
    .select("post_id")
    .eq("album_id", albumId);

  if (relError) {
    console.error("deleteMyAlbum rels error", relError);
    throw new Error(errMsg(relError, "Nepodařilo se načíst vazby alba."));
  }

  const postIds = (rels ?? [])
    .map((r: any) => toInt(r.post_id))
    .filter((x) => x > 0);

  if (deletePosts && postIds.length > 0) {
    const { error: delPostsError } = await supabase
      .from("posts")
      .delete()
      .in("id", postIds);

    if (delPostsError) {
      console.error("deleteMyAlbum delete posts error", delPostsError);
      throw new Error(errMsg(delPostsError, "Nepodařilo se smazat posty v albu."));
    }
  }

  const { error: relDeleteError } = await supabase
    .from("post_albums")
    .delete()
    .eq("album_id", albumId);

  if (relDeleteError) {
    console.error("deleteMyAlbum relations delete error", relDeleteError);
    throw new Error(errMsg(relDeleteError, "Nepodařilo se odstranit vazby alba."));
  }

  const { error: albumError } = await supabase
    .from("albums")
    .delete()
    .eq("id", albumId);

  if (albumError) {
    console.error("deleteMyAlbum album delete error", albumError);
    throw new Error(errMsg(albumError, "Nepodařilo se smazat album."));
  }
}

export async function updateAlbumVisibility(params: {
  albumId: number;
  visibility: AlbumVisibility;
}): Promise<void> {
  const { albumId, visibility } = params;

  if (!Number.isFinite(albumId) || albumId <= 0) {
    throw new Error("Neplatné ID alba.");
  }

  const { error } = await supabase
    .from("albums")
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", albumId);

  if (error) {
    console.error("updateAlbumVisibility error", error);
    throw new Error(errMsg(error, "Nepodařilo se změnit viditelnost alba."));
  }
}
