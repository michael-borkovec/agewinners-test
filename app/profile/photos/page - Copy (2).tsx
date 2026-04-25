/**
 * File: app/profile/photos/page.tsx
 * Description:
 *   Profilová sekce: "Moje fotky & věkové tipy" (/profile/photos)
 *
 * ✅ REAL DATA:
 * - Mode "Moje fotky":
 *   - images.aw_age_image, images.guesses_count, images.taken_at
 *   - derived: last_posted_at + posted_count via post_images → posts(created_at)
 *
 * - Mode "Moje alba":
 *   - albums (owner_user_id)
 *   - album_images → images (cover + sums)
 *   - album stats:
 *     - tips_total = SUM(images.guesses_count)
 *     - aw_age_album = prefer albums.aw_age, fallback AVG(images.aw_age_image)
 *     - photos_count = number of images in album
 *
 * ✅ NEW (this iteration):
 * - Mode "Moje posty":
 *   - posts (author_user_id = me)
 *   - post_images → images (cover + count)
 *   - action: "Otevřít post" => /profile/photos/posts/[postId]
 *
 * Notes:
 * - "Last posted" for albums is still a placeholder (albums.created_at).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { awAlert } from "@/components/AwDialog";
import { supabase } from "@/lib/supabaseClient";

console.log("AW SUPABASE SANITY:", {
  hasFrom: typeof (supabase as any)?.from,
  hasRpc: typeof (supabase as any)?.rpc,
  hasSelect: typeof (supabase as any)?.select,
  sampleKeys: Object.keys(supabase as any).slice(0, 25),
});



type PhotosMode = "my_photos" | "my_albums" | "my_posts" | "my_guesses";

type SortOption =
  | "last_posted_desc"
  | "last_posted_asc"
  | "guesses_count_desc"
  | "guesses_count_asc"
  | "aw_age_desc"
  | "aw_age_asc"
  | "album_title_asc"
  | "album_title_desc"
  | "guessed_user_name_asc"
  | "guessed_user_name_desc";

type MyPhotoRow = {
  id: number;
  public_url: string | null;
  taken_at: string | null;

  guesses_count: number; // non-null in DB
  aw_age_image: number | null;

  // derived
  last_posted_at: string | null;
  posted_count: number;
};

type MyAlbumRow = {
  id: number;
  title: string | null;
  description: string | null;
  year: number | null;

  // stored on album (if your create_album_from_post sets it)
  aw_age: number | null;

  created_at: string | null;

  // derived from album_images → images
  cover_url: string | null;
  photos_count: number;
  tips_total: number;

  // derived fallback
  aw_age_computed: number | null;

  // placeholder for future "posted multiple times"
  last_posted_at: string | null;
  posted_count: number;
};

type MyPostRow = {
  id: number;
  created_at: string | null;
  text: string | null;

  cover_url: string | null;
  photos_count: number;
};

function safeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeInt(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fmtDate(iso: string | null, fallback = "—") {
  if (!iso) return fallback;
  return String(iso).slice(0, 10);
}

function fmt1(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

function compareNullableIso(a: string | null, b: string | null, dir: "asc" | "desc") {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();

  if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
  if (!Number.isFinite(ta)) return 1;
  if (!Number.isFinite(tb)) return -1;

  return dir === "asc" ? ta - tb : tb - ta;
}

function compareNullableNumber(a: number | null, b: number | null, dir: "asc" | "desc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === "asc" ? a - b : b - a;
}

export default function ProfilePhotosPage() {
  const [session, setSession] = useState<Session | null>(null);

  const [mode, setMode] = useState<PhotosMode>("my_photos");
  const [sort, setSort] = useState<SortOption>("last_posted_desc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myPhotos, setMyPhotos] = useState<MyPhotoRow[]>([]);
  const [myAlbums, setMyAlbums] = useState<MyAlbumRow[]>([]);
  const [myPosts, setMyPosts] = useState<MyPostRow[]>([]);

  // Load session (client-side)
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sortOptions = useMemo(() => {
    if (mode === "my_photos") {
      return [
        { value: "last_posted_desc", label: "Poslední postnutí (nejnovější)" },
        { value: "last_posted_asc", label: "Poslední postnutí (nejstarší)" },
        { value: "guesses_count_desc", label: "Počet tipů (nejvíc)" },
        { value: "guesses_count_asc", label: "Počet tipů (nejmíň)" },
        { value: "aw_age_desc", label: "Průměrný věk (nejvyšší)" },
        { value: "aw_age_asc", label: "Průměrný věk (nejnižší)" },
      ] as const;
    }

    if (mode === "my_albums") {
      return [
        { value: "last_posted_desc", label: "Poslední postnutí (nejnovější)" },
        { value: "last_posted_asc", label: "Poslední postnutí (nejstarší)" },
        { value: "guesses_count_desc", label: "Počet tipů (nejvíc)" },
        { value: "guesses_count_asc", label: "Počet tipů (nejmíň)" },
        { value: "album_title_asc", label: "Název alba (A → Z)" },
        { value: "album_title_desc", label: "Název alba (Z → A)" },
        { value: "aw_age_desc", label: "Průměrný věk alba (nejvyšší)" },
        { value: "aw_age_asc", label: "Průměrný věk alba (nejnižší)" },
      ] as const;
    }

    if (mode === "my_posts") {
      return [
        { value: "last_posted_desc", label: "Datum postnutí (nejnovější)" },
        { value: "last_posted_asc", label: "Datum postnutí (nejstarší)" },
      ] as const;
    }

    return [
      { value: "last_posted_desc", label: "Datum tipu (nejnovější)" },
      { value: "last_posted_asc", label: "Datum tipu (nejstarší)" },
      { value: "guessed_user_name_asc", label: "Jméno tipovaného uživatele (A → Z)" },
      { value: "guessed_user_name_desc", label: "Jméno tipovaného uživatele (Z → A)" },
    ] as const;
  }, [mode]);

  // Keep sort valid for selected mode
  useEffect(() => {
    if (!sortOptions.find((o) => o.value === sort)) {
      setSort(sortOptions[0].value as SortOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isLoggedIn = !!session?.user?.id;

  /* -----------------------------
   * LOAD: My Photos (real)
   * ----------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadMyPhotos() {
      if (mode !== "my_photos") return;

      if (!session?.user?.id) {
        setMyPhotos([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userId = session.user.id;

        const { data: images, error: imagesError } = await supabase
          .from("images")
          .select("id, public_url, taken_at, guesses_count, aw_age_image")
          .eq("uploader_user_id", userId)
          .order("id", { ascending: false })
          .limit(500);

        if (cancelled) return;

        if (imagesError) {
          setError(imagesError.message || "Nepodařilo se načíst fotky.");
          setMyPhotos([]);
          return;
        }

        const base: MyPhotoRow[] = (images ?? []).map((row: any) => ({
          id: Number(row.id),
          public_url: row.public_url ?? null,
          taken_at: row.taken_at ?? null,
          guesses_count: safeInt(row.guesses_count, 0),
          aw_age_image: safeNumber(row.aw_age_image),
          last_posted_at: null,
          posted_count: 0,
        }));

        const imageIds = base.map((x) => x.id).filter((x) => Number.isFinite(x));
        if (imageIds.length === 0) {
          setMyPhotos([]);
          return;
        }

        const { data: rels, error: relError } = await supabase
          .from("post_images")
          .select("image_id, post_id")
          .in("image_id", imageIds);

        if (cancelled) return;

        if (relError) {
          console.warn("ProfilePhotos: cannot load post_images:", relError.message);
          setMyPhotos(base);
          return;
        }

        const postIds = Array.from(
          new Set((rels ?? []).map((r: any) => Number(r.post_id)).filter((x: number) => Number.isFinite(x)))
        );

        let postCreatedAtById = new Map<number, string>();
        if (postIds.length > 0) {
          const { data: posts, error: postsErr } = await supabase
            .from("posts")
            .select("id, created_at")
            .in("id", postIds);

          if (!postsErr) {
            (posts ?? []).forEach((p: any) => {
              const pid = Number(p.id);
              const iso = p.created_at ? String(p.created_at) : "";
              if (Number.isFinite(pid) && iso) postCreatedAtById.set(pid, iso);
            });
          }
        }

        const agg = new Map<number, { count: number; maxIso: string | null }>();

        (rels ?? []).forEach((r: any) => {
          const imageId = Number(r.image_id);
          const postId = Number(r.post_id);
          if (!Number.isFinite(imageId) || !Number.isFinite(postId)) return;

          const createdAt = postCreatedAtById.get(postId) ?? null;

          const cur = agg.get(imageId) ?? { count: 0, maxIso: null };
          cur.count += 1;

          if (createdAt) {
            if (!cur.maxIso) cur.maxIso = createdAt;
            else {
              const curT = new Date(cur.maxIso).getTime();
              const newT = new Date(createdAt).getTime();
              if (Number.isFinite(newT) && (!Number.isFinite(curT) || newT > curT)) cur.maxIso = createdAt;
            }
          }

          agg.set(imageId, cur);
        });

        const enriched = base.map((img) => {
          const a = agg.get(img.id);
          if (!a) return img;
          return { ...img, posted_count: a.count, last_posted_at: a.maxIso };
        });

        setMyPhotos(enriched);
      } catch (e: any) {
        setError(e?.message ?? "Nepodařilo se načíst fotky.");
        setMyPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMyPhotos();

    return () => {
      cancelled = true;
    };
  }, [mode, session?.user?.id]);

  /* -----------------------------
   * LOAD: My Albums (real)
   * ----------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadMyAlbums() {
      if (mode !== "my_albums") return;

      if (!session?.user?.id) {
        setMyAlbums([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userId = session.user.id;

        // 1) albums
        const { data: albums, error: albumsError } = await supabase
          .from("albums")
          .select("id, title, description, year, aw_age, created_at")
          .eq("owner_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500);

        if (cancelled) return;

        if (albumsError) {
          setError(albumsError.message || "Nepodařilo se načíst alba.");
          setMyAlbums([]);
          return;
        }

        const base: MyAlbumRow[] = (albums ?? []).map((a: any) => ({
          id: Number(a.id),
          title: a.title ?? null,
          description: a.description ?? null,
          year: a.year !== undefined && a.year !== null ? Number(a.year) : null,
          aw_age: safeNumber(a.aw_age),
          created_at: a.created_at ? String(a.created_at) : null,

          cover_url: null,
          photos_count: 0,
          tips_total: 0,
          aw_age_computed: null,

          // placeholder
          last_posted_at: a.created_at ? String(a.created_at) : null,
          posted_count: 1,
        }));

        const albumIds = base.map((x) => x.id).filter((x) => Number.isFinite(x));
        if (albumIds.length === 0) {
          setMyAlbums([]);
          return;
        }

        // 2) album_images → images (for cover + sums)
        const { data: rels, error: relError } = await supabase
          .from("album_images")
          .select("album_id, image_id, images(public_url, guesses_count, aw_age_image)")
          .in("album_id", albumIds);

        if (cancelled) return;

        if (relError) {
          console.warn("ProfilePhotos: cannot load album_images/images:", relError.message);
          setMyAlbums(base);
          return;
        }

        const agg = new Map<
          number,
          { count: number; tips: number; cover: string | null; awSum: number; awCnt: number }
        >();

        (rels ?? []).forEach((r: any) => {
          const albumId = Number(r.album_id);
          if (!Number.isFinite(albumId)) return;

          const img = r?.images ?? null;

          const cur = agg.get(albumId) ?? { count: 0, tips: 0, cover: null, awSum: 0, awCnt: 0 };
          cur.count += 1;

          const guesses = safeInt(img?.guesses_count, 0);
          cur.tips += guesses;

          if (!cur.cover && img?.public_url) cur.cover = String(img.public_url);

          const aw = safeNumber(img?.aw_age_image);
          if (aw !== null) {
            cur.awSum += aw;
            cur.awCnt += 1;
          }

          agg.set(albumId, cur);
        });

        const enriched = base.map((a) => {
          const x = agg.get(a.id);
          if (!x) return a;

          const awComputed = x.awCnt > 0 ? Number((x.awSum / x.awCnt).toFixed(1)) : null;

          return {
            ...a,
            cover_url: x.cover,
            photos_count: x.count,
            tips_total: x.tips,
            aw_age_computed: awComputed,
          };
        });

        setMyAlbums(enriched);
      } catch (e: any) {
        setError(e?.message ?? "Nepodařilo se načíst alba.");
        setMyAlbums([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMyAlbums();

    return () => {
      cancelled = true;
    };
  }, [mode, session?.user?.id]);

  /* -----------------------------
   * LOAD: My Posts (NEW)
   * ----------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadMyPosts() {
      if (mode !== "my_posts") return;

      if (!session?.user?.id) {
        setMyPosts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userId = session.user.id;

        // 1) posts
        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select("id, created_at, text, author_user_id")
          .eq("author_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(300);

        if (cancelled) return;

        if (postsError) {
          setError(postsError.message || "Nepodařilo se načíst posty.");
          setMyPosts([]);
          return;
        }

        const base: MyPostRow[] = (posts ?? []).map((p: any) => ({
          id: Number(p.id),
          created_at: p.created_at ? String(p.created_at) : null,
          text: p.text ?? null,
          cover_url: null,
          photos_count: 0,
        }));

        const postIds = base.map((x) => x.id).filter((x) => Number.isFinite(x));
        if (postIds.length === 0) {
          setMyPosts([]);
          return;
        }

        // 2) post_images → images (cover + count)
        const { data: rels, error: relError } = await supabase
          .from("post_images")
          .select("post_id, image_id, images(public_url)")
          .in("post_id", postIds);

        if (cancelled) return;

        if (relError) {
          console.warn("ProfilePhotos: cannot load post_images/images:", relError.message);
          setMyPosts(base);
          return;
        }

        const agg = new Map<number, { count: number; cover: string | null }>();

        (rels ?? []).forEach((r: any) => {
          const postId = Number(r.post_id);
          if (!Number.isFinite(postId)) return;

          const cur = agg.get(postId) ?? { count: 0, cover: null };
          cur.count += 1;

          if (!cur.cover && r?.images?.public_url) cur.cover = String(r.images.public_url);

          agg.set(postId, cur);
        });

        const enriched = base.map((p) => {
          const a = agg.get(p.id);
          if (!a) return p;
          return { ...p, photos_count: a.count, cover_url: a.cover };
        });

        setMyPosts(enriched);
      } catch (e: any) {
        setError(e?.message ?? "Nepodařilo se načíst posty.");
        setMyPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMyPosts();

    return () => {
      cancelled = true;
    };
  }, [mode, session?.user?.id]);

  /* -----------------------------
   * SORT: My Photos
   * ----------------------------- */
  const sortedPhotos = useMemo(() => {
    const arr = [...myPhotos];
    if (mode !== "my_photos") return arr;

    if (sort === "last_posted_desc") arr.sort((a, b) => compareNullableIso(a.last_posted_at, b.last_posted_at, "desc"));
    else if (sort === "last_posted_asc") arr.sort((a, b) => compareNullableIso(a.last_posted_at, b.last_posted_at, "asc"));
    else if (sort === "guesses_count_desc") arr.sort((a, b) => (b.guesses_count ?? 0) - (a.guesses_count ?? 0));
    else if (sort === "guesses_count_asc") arr.sort((a, b) => (a.guesses_count ?? 0) - (b.guesses_count ?? 0));
    else if (sort === "aw_age_desc") arr.sort((a, b) => compareNullableNumber(a.aw_age_image, b.aw_age_image, "desc"));
    else if (sort === "aw_age_asc") arr.sort((a, b) => compareNullableNumber(a.aw_age_image, b.aw_age_image, "asc"));

    return arr;
  }, [myPhotos, mode, sort]);

  /* -----------------------------
   * SORT: My Albums
   * ----------------------------- */
  const sortedAlbums = useMemo(() => {
    const arr = [...myAlbums];
    if (mode !== "my_albums") return arr;

    const getAw = (a: MyAlbumRow) => (a.aw_age !== null ? a.aw_age : a.aw_age_computed);

    if (sort === "last_posted_desc") arr.sort((a, b) => compareNullableIso(a.last_posted_at, b.last_posted_at, "desc"));
    else if (sort === "last_posted_asc") arr.sort((a, b) => compareNullableIso(a.last_posted_at, b.last_posted_at, "asc"));
    else if (sort === "guesses_count_desc") arr.sort((a, b) => (b.tips_total ?? 0) - (a.tips_total ?? 0));
    else if (sort === "guesses_count_asc") arr.sort((a, b) => (a.tips_total ?? 0) - (b.tips_total ?? 0));
    else if (sort === "album_title_asc")
      arr.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""), "cs", { sensitivity: "base" }));
    else if (sort === "album_title_desc")
      arr.sort((a, b) => String(b.title ?? "").localeCompare(String(a.title ?? ""), "cs", { sensitivity: "base" }));
    else if (sort === "aw_age_desc") arr.sort((a, b) => compareNullableNumber(getAw(a), getAw(b), "desc"));
    else if (sort === "aw_age_asc") arr.sort((a, b) => compareNullableNumber(getAw(a), getAw(b), "asc"));

    return arr;
  }, [myAlbums, mode, sort]);

  /* -----------------------------
   * SORT: My Posts (NEW)
   * ----------------------------- */
  const sortedPosts = useMemo(() => {
    const arr = [...myPosts];
    if (mode !== "my_posts") return arr;

    if (sort === "last_posted_desc") arr.sort((a, b) => compareNullableIso(a.created_at, b.created_at, "desc"));
    else if (sort === "last_posted_asc") arr.sort((a, b) => compareNullableIso(a.created_at, b.created_at, "asc"));

    return arr;
  }, [myPosts, mode, sort]);

  return (
    <section className="max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Moje fotky & věkové tipy</h1>
        <Link href="/profile" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Zpět na profil
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Zobrazit</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PhotosMode)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-64"
          >
            <option value="my_photos">Moje fotky</option>
            <option value="my_albums">Moje alba</option>
            <option value="my_posts">Moje posty</option>
            <option value="my_guesses">Moje tipy</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Řazení</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-80"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isLoggedIn && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Pro zobrazení „Moje fotky / alba / posty“ se prosím přihlas.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</div>
      )}

      <div className="mt-4">
        {mode === "my_photos" ? (
          loading ? (
            <GridSkeleton />
          ) : sortedPhotos.length === 0 ? (
            <EmptyState title="Zatím tu nemáš žádné fotky" text="Přidej fotku přes nový post a pak se ti tu zobrazí přehled." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPhotos.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex h-48 items-center justify-center bg-gray-50">
                    {p.public_url ? (
                      <img
                        src={p.public_url}
                        alt="Moje fotka"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">Bez náhledu</div>
                    )}
                  </div>

                  <div className="space-y-2 p-4 text-sm">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                      <span>
                        <span className="font-semibold">Pořízení:</span> {fmtDate(p.taken_at)}
                      </span>
                      <span>
                        <span className="font-semibold">Poslední post:</span> {fmtDate(p.last_posted_at)}
                      </span>
                      <span>
                        <span className="font-semibold">Postnuto:</span> {p.posted_count}×
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                      <span>
                        <span className="font-semibold">Tipů:</span> {p.guesses_count}
                      </span>
                      <span>
                        <span className="font-semibold">Průměr (AW):</span> {fmt1(p.aw_age_image, "—")}
                      </span>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => void awAlert("Statistiky / editace fotky doplníme v další iteraci.")}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Statistiky / editovat…
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : mode === "my_albums" ? (
          loading ? (
            <GridSkeleton />
          ) : sortedAlbums.length === 0 ? (
            <EmptyState title="Zatím tu nemáš žádná alba" text="Album vytvoříš z vlastního postu přes menu „…“." />
          ) : (
            <>
              <div className="mb-3 text-[11px] text-slate-500">
                Pozn.: „Poslední postnutí“ je zatím podle data vytvoření alba. Jakmile přidáme tabulku pro vícenásobné postování alb,
                přepneme to na skutečný „last posted“.
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedAlbums.map((a) => {
                  const aw = a.aw_age !== null ? a.aw_age : a.aw_age_computed;

                  return (
                    <div key={a.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex h-48 items-center justify-center bg-gray-50">
                        {a.cover_url ? (
                          <img
                            src={a.cover_url}
                            alt="Cover alba"
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">Bez coveru</div>
                        )}
                      </div>

                      <div className="space-y-2 p-4 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">
                              {a.title?.trim() ? a.title : "Album"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {a.year ? `Rok: ${a.year}` : "Rok: —"} • Vytvořeno: {fmtDate(a.created_at)}
                            </div>
                          </div>

                          <div className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            AW {fmt1(aw, "—")}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                          <span>
                            <span className="font-semibold">Fotky:</span> {a.photos_count}
                          </span>
                          <span>
                            <span className="font-semibold">Tipů:</span> {a.tips_total}
                          </span>
                          <span>
                            <span className="font-semibold">Poslední post:</span> {fmtDate(a.last_posted_at)}
                          </span>
                        </div>

                        <div className="pt-1 flex gap-3">
                          <Link
                            href={`/profile/photos/albums/${a.id}`}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                            aria-label="Otevřít album"
                          >
                            Otevřít album
                          </Link>

                          <button
                            type="button"
                            onClick={() => void awAlert("Statistiky / editace alba doplníme v další iteraci.")}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Statistiky / editovat…
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : mode === "my_posts" ? (
          loading ? (
            <GridSkeleton />
          ) : sortedPosts.length === 0 ? (
            <EmptyState title="Zatím tu nemáš žádné posty" text="Vytvoř post na hlavní stránce a tady ho pak uvidíš." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPosts.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex h-48 items-center justify-center bg-gray-50">
                    {p.cover_url ? (
                      <img
                        src={p.cover_url}
                        alt="Cover postu"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">Bez coveru</div>
                    )}
                  </div>

                  <div className="space-y-2 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">Post #{p.id}</div>
                        <div className="text-[11px] text-gray-500">Vytvořeno: {fmtDate(p.created_at)}</div>
                      </div>
                      <div className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {p.photos_count} fotek
                      </div>
                    </div>

                    {p.text?.trim() ? (
                      <div className="line-clamp-2 text-xs text-gray-700">{p.text}</div>
                    ) : (
                      <div className="text-xs text-gray-400">Bez textu</div>
                    )}

                    <div className="pt-1 flex gap-3">
                      <Link
                        href={`/profile/photos/posts/${p.id}`}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                        aria-label="Otevřít post"
                      >
                        Otevřít post
                      </Link>

                      <button
                        type="button"
                        onClick={() => void awAlert("Statistiky / editace postu doplníme v další iteraci.")}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Statistiky / editovat…
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <EmptyState title="Moje tipy: další iterace" text="Teď máme reálné fotky, alba a posty. Tipy doplníme hned potom." />
        )}
      </div>
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{text}</p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}
