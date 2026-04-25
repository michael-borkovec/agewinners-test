/**
 * File: app/profile/photos/page.tsx
 * Description:
 *   Profilová sekce: "Moje fotky & věkové tipy" (/profile/photos)
 *
 * Fix:
 * - Removes ANY accidental usage of `supabase.select(...)` (invalid).
 * - Avoids ambiguous embed relationships by using 2-step queries.
 *
 * Modes:
 * - my_photos: moje fotky + odvozené (kolikrát postnuto, poslední post)
 * - my_albums: moje alba + cover + sum tipů + computed aw age
 * - my_posts: moje posty (základ) + počet fotek + poslední datum
 * - my_guesses: moje tipy (základ) + náhled fotky + guessed age
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
  | "post_created_desc"
  | "post_created_asc"
  | "guess_created_desc"
  | "guess_created_asc";

type MyPhotoRow = {
  id: number;
  public_url: string | null;
  taken_at: string | null;

  guesses_count: number;
  aw_age_image: number | null;

  last_posted_at: string | null;
  posted_count: number;
};

type MyAlbumRow = {
  id: number;
  title: string | null;
  description: string | null;

  aw_age: number | null;
  created_at: string | null;

  cover_url: string | null;
  photos_count: number;
  tips_total: number;
  aw_age_computed: number | null;

  last_posted_at: string | null;
  posted_count: number;
};

type MyPostRow = {
  id: number;
  title: string | null;
  text: string | null;
  created_at: string | null;

  cover_url: string | null;
  photos_count: number;
};

type MyGuessRow = {
  id: number; // age_guesses.id (or synthetic)
  image_id: number;
  guessed_age: number | null;
  created_at: string | null;

  // image preview
  image_public_url: string | null;
  image_taken_at: string | null;
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{text}</div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
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
  const [myGuesses, setMyGuesses] = useState<MyGuessRow[]>([]);

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

  const isLoggedIn = !!session?.user?.id;

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
        { value: "last_posted_desc", label: "Vytvořeno (nejnovější)" },
        { value: "last_posted_asc", label: "Vytvořeno (nejstarší)" },
        { value: "guesses_count_desc", label: "Počet tipů v albu (nejvíc)" },
        { value: "guesses_count_asc", label: "Počet tipů v albu (nejmíň)" },
        { value: "album_title_asc", label: "Název alba (A → Z)" },
        { value: "album_title_desc", label: "Název alba (Z → A)" },
        { value: "aw_age_desc", label: "Průměrný věk alba (nejvyšší)" },
        { value: "aw_age_asc", label: "Průměrný věk alba (nejnižší)" },
      ] as const;
    }

    if (mode === "my_posts") {
      return [
        { value: "post_created_desc", label: "Datum postu (nejnovější)" },
        { value: "post_created_asc", label: "Datum postu (nejstarší)" },
      ] as const;
    }

    return [
      { value: "guess_created_desc", label: "Datum tipu (nejnovější)" },
      { value: "guess_created_asc", label: "Datum tipu (nejstarší)" },
    ] as const;
  }, [mode]);

  // Keep sort valid for selected mode
  useEffect(() => {
    if (!sortOptions.find((o) => o.value === sort)) {
      setSort(sortOptions[0].value as SortOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* -----------------------------
   * LOAD: My Photos
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
          .eq("hidden_by_admin", false)
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

        // 2-step: post_images -> posts(created_at) (no embeds ambiguity)
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
   * LOAD: My Albums
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

        const { data: albums, error: albumsError } = await supabase
          .from("albums")
          .select("id, title, description, aw_age, created_at")
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
          aw_age: safeNumber(a.aw_age),
          created_at: a.created_at ? String(a.created_at) : null,

          cover_url: null,
          photos_count: 0,
          tips_total: 0,
          aw_age_computed: null,

          last_posted_at: a.created_at ? String(a.created_at) : null,
          posted_count: 0,
        }));

        const albumIds = base.map((x) => x.id).filter((x) => Number.isFinite(x));
        if (albumIds.length === 0) {
          setMyAlbums([]);
          return;
        }

        const { data: rels, error: relError } = await supabase
          .from("post_albums")
          .select("album_id, post_id, sort_order, created_at")
          .in("album_id", albumIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (cancelled) return;

        if (relError) {
          setError(relError.message || "Nepodařilo se načíst fotky alb.");
          setMyAlbums([]);
          return;
        }

        const postIds = Array.from(
          new Set((rels ?? []).map((r: any) => Number(r.post_id)).filter((x: number) => Number.isFinite(x)))
        );

        const postById = new Map<number, any>();
        if (postIds.length > 0) {
          const { data: posts, error: postErr } = await supabase
            .from("posts")
            .select("id, created_at")
            .in("id", postIds);

          if (postErr) {
            console.warn("ProfileAlbums: cannot load posts:", postErr.message);
          } else {
            (posts ?? []).forEach((post: any) => {
              const id = Number(post.id);
              if (Number.isFinite(id)) postById.set(id, post);
            });
          }
        }

        const { data: postImageRows, error: postImageErr } = postIds.length
          ? await supabase
              .from("post_images")
              .select("post_id, image_id, sort_order, created_at")
              .in("post_id", postIds)
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true })
          : { data: [], error: null };

        if (cancelled) return;

        if (postImageErr) {
          setError(postImageErr.message || "Failed to load post images for albums.");
          setMyAlbums([]);
          return;
        }

        const imageIds = Array.from(
          new Set((postImageRows ?? []).map((r: any) => Number(r.image_id)).filter((x: number) => Number.isFinite(x)))
        );

        const imgById = new Map<number, any>();
        if (imageIds.length > 0) {
          const { data: imgs, error: imgErr } = await supabase
            .from("images")
            .select("id, public_url, guesses_count, aw_age_image")
            .in("id", imageIds)
            .eq("hidden_by_admin", false);

          if (imgErr) {
            console.warn("ProfileAlbums: cannot load images:", imgErr.message);
          } else {
            (imgs ?? []).forEach((img: any) => {
              const id = Number(img.id);
              if (Number.isFinite(id)) imgById.set(id, img);
            });
          }
        }

        const imageRelsByPostId = new Map<number, any[]>();
        (postImageRows ?? []).forEach((rel: any) => {
          const postId = Number(rel.post_id);
          if (!Number.isFinite(postId)) return;
          const arr = imageRelsByPostId.get(postId) ?? [];
          arr.push(rel);
          imageRelsByPostId.set(postId, arr);
        });

        const perAlbum = new Map<
          number,
          {
            coverUrl: string | null;
            photosCount: number;
            tipsTotal: number;
            awSum: number;
            awCount: number;
            latestPostAt: string | null;
            postsCount: number;
          }
        >();

        (rels ?? []).forEach((r: any) => {
          const albumId = Number(r.album_id);
          const postId = Number(r.post_id);
          if (!Number.isFinite(albumId) || !Number.isFinite(postId)) return;

          const cur = perAlbum.get(albumId) ?? {
            coverUrl: null,
            photosCount: 0,
            tipsTotal: 0,
            awSum: 0,
            awCount: 0,
            latestPostAt: null,
            postsCount: 0,
          };

          cur.postsCount += 1;

          const post = postById.get(postId);
          const postCreatedAt = post?.created_at ? String(post.created_at) : null;
          if (postCreatedAt) {
            if (!cur.latestPostAt || new Date(postCreatedAt).getTime() > new Date(cur.latestPostAt).getTime()) {
              cur.latestPostAt = postCreatedAt;
            }
          }

          const postImageRels = imageRelsByPostId.get(postId) ?? [];
          for (const postImageRel of postImageRels) {
            const imageId = Number(postImageRel.image_id);
            if (!Number.isFinite(imageId)) continue;

            const img = imgById.get(imageId);
            if (!img) continue;

            const coverUrl = img.public_url ? String(img.public_url) : null;
            const guesses = safeInt(img.guesses_count, 0);
            const aw = safeNumber(img.aw_age_image);

            if (!cur.coverUrl && coverUrl) cur.coverUrl = coverUrl;

            cur.photosCount += 1;
            cur.tipsTotal += guesses;

            if (aw !== null) {
              cur.awSum += aw;
              cur.awCount += 1;
            }
          }

          perAlbum.set(albumId, cur);
        });

        const enriched: MyAlbumRow[] = base.map((a) => {
          const agg = perAlbum.get(a.id);
          if (!agg) return a;

          const computed = agg.awCount > 0 ? agg.awSum / agg.awCount : null;

          return {
            ...a,
            cover_url: agg.coverUrl,
            photos_count: agg.photosCount,
            tips_total: agg.tipsTotal,
            aw_age_computed: computed,
            last_posted_at: agg.latestPostAt ?? a.created_at,
            posted_count: agg.postsCount,
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
   * LOAD: My Posts
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

        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select("id, title, text, created_at")
          .eq("author_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500);

        if (cancelled) return;

        if (postsError) {
          setError(postsError.message || "Nepodařilo se načíst posty.");
          setMyPosts([]);
          return;
        }

        const base: MyPostRow[] = (posts ?? []).map((p: any) => ({
          id: Number(p.id),
          title: p.title ?? null,
          text: p.text ?? null,
          created_at: p.created_at ? String(p.created_at) : null,
          cover_url: null,
          photos_count: 0,
        }));

        const postIds = base.map((x) => x.id).filter((x) => Number.isFinite(x));
        if (postIds.length === 0) {
          setMyPosts([]);
          return;
        }

        // 2-step: post_images then images (avoid embed ambiguity)
        const { data: rels, error: relErr } = await supabase
          .from("post_images")
          .select("post_id, image_id")
          .in("post_id", postIds)
          .order("id", { ascending: true });

        if (cancelled) return;

        if (relErr) {
          console.warn("ProfilePosts: cannot load post_images:", relErr.message);
          setMyPosts(base);
          return;
        }

        const imageIds = Array.from(
          new Set((rels ?? []).map((r: any) => Number(r.image_id)).filter((x: number) => Number.isFinite(x)))
        );

        const imgById = new Map<number, any>();
        if (imageIds.length > 0) {
          const { data: imgs } = await supabase.from("images").select("id, public_url").in("id", imageIds).eq("hidden_by_admin", false);
          (imgs ?? []).forEach((img: any) => {
            const id = Number(img.id);
            if (Number.isFinite(id)) imgById.set(id, img);
          });
        }

        const agg = new Map<number, { count: number; coverUrl: string | null }>();
        (rels ?? []).forEach((r: any) => {
          const postId = Number(r.post_id);
          const imageId = Number(r.image_id);
          if (!Number.isFinite(postId) || !Number.isFinite(imageId)) return;

          const img = imgById.get(imageId);
          const url = img?.public_url ? String(img.public_url) : null;

          const cur = agg.get(postId) ?? { count: 0, coverUrl: null };
          cur.count += 1;
          if (!cur.coverUrl && url) cur.coverUrl = url;
          agg.set(postId, cur);
        });

        const enriched = base.map((p) => {
          const a = agg.get(p.id);
          if (!a) return p;
          return { ...p, photos_count: a.count, cover_url: a.coverUrl };
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
   * LOAD: My Guesses (my tips)
   * ----------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadMyGuesses() {
      if (mode !== "my_guesses") return;

      if (!session?.user?.id) {
        setMyGuesses([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userId = session.user.id;

        const { data: guesses, error: gErr } = await supabase
          .from("age_guesses")
          .select("id, image_id, guessed_age, created_at")
          .eq("guesser_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500);

        if (cancelled) return;

        if (gErr) {
          setError(gErr.message || "Nepodařilo se načíst moje tipy.");
          setMyGuesses([]);
          return;
        }

        const base: MyGuessRow[] = (guesses ?? []).map((g: any) => ({
          id: Number(g.id),
          image_id: Number(g.image_id),
          guessed_age: safeNumber(g.guessed_age),
          created_at: g.created_at ? String(g.created_at) : null,
          image_public_url: null,
          image_taken_at: null,
        }));

        const imageIds = Array.from(
          new Set(base.map((x) => x.image_id).filter((x) => Number.isFinite(x)))
        );

        if (imageIds.length === 0) {
          setMyGuesses([]);
          return;
        }

        const { data: imgs, error: imgErr } = await supabase
          .from("images")
          .select("id, public_url, taken_at")
          .in("id", imageIds);

        if (cancelled) return;

        if (imgErr) {
          console.warn("MyGuesses: cannot load images:", imgErr.message);
          setMyGuesses(base);
          return;
        }

        const byId = new Map<number, any>();
        (imgs ?? []).forEach((img: any) => {
          const id = Number(img.id);
          if (Number.isFinite(id)) byId.set(id, img);
        });

        const enriched = base.map((g) => {
          const img = byId.get(g.image_id);
          if (!img) return g;
          return {
            ...g,
            image_public_url: img.public_url ? String(img.public_url) : null,
            image_taken_at: img.taken_at ? String(img.taken_at) : null,
          };
        });

        setMyGuesses(enriched);
      } catch (e: any) {
        setError(e?.message ?? "Nepodařilo se načíst moje tipy.");
        setMyGuesses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMyGuesses();
    return () => {
      cancelled = true;
    };
  }, [mode, session?.user?.id]);

  /* -----------------------------
   * SORT: Photos
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
   * SORT: Albums
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
   * SORT: Posts
   * ----------------------------- */
  const sortedPosts = useMemo(() => {
    const arr = [...myPosts];
    if (mode !== "my_posts") return arr;

    if (sort === "post_created_desc") arr.sort((a, b) => compareNullableIso(a.created_at, b.created_at, "desc"));
    else if (sort === "post_created_asc") arr.sort((a, b) => compareNullableIso(a.created_at, b.created_at, "asc"));

    return arr;
  }, [myPosts, mode, sort]);

  /* -----------------------------
   * SORT: Guesses
   * ----------------------------- */
  const sortedGuesses = useMemo(() => {
    const arr = [...myGuesses];
    if (mode !== "my_guesses") return arr;

    if (sort === "guess_created_desc") arr.sort((a, b) => compareNullableIso(a.created_at, b.created_at, "desc"));
    else if (sort === "guess_created_asc") arr.sort((a, b) => compareNullableIso(a.created_at, b.created_at, "asc"));

    return arr;
  }, [myGuesses, mode, sort]);

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
          Pro zobrazení „Moje fotky / alba / posty / tipy“ se prosím přihlas.
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
                        <span className="font-semibold">AW věk:</span> {fmt1(p.aw_age_image)}
                      </span>
                    </div>

                   <div className="pt-2 text-xs flex items-center gap-2">
  <Link href={`/profile/photos/${p.id}`} className="text-emerald-700 hover:underline">
    Statistiky
  </Link>
  <span className="text-gray-300">|</span>
  <Link href={`/profile/photos/${p.id}?edit=1`} className="text-emerald-700 hover:underline">
    Editovat
  </Link>
</div>

                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}

        {mode === "my_albums" ? (
          loading ? (
            <GridSkeleton />
          ) : sortedAlbums.length === 0 ? (
            <EmptyState title="Zatím tu nemáš žádná alba" text="Až přidáš post do alba nebo pro něj vytvoříš nové album, objeví se tady." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedAlbums.map((a) => {
                const aw = a.aw_age !== null ? a.aw_age : a.aw_age_computed;
                return (
                  <div key={a.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex h-48 items-center justify-center bg-gray-50">
                      {a.cover_url ? (
                        <img
                          src={a.cover_url}
                          alt="Album cover"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-sm text-gray-500">Bez náhledu</div>
                      )}
                    </div>

                    <div className="space-y-2 p-4 text-sm">
                      <div className="font-semibold text-gray-900">{a.title ?? "Album"}</div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                        <span>
                          <span className="font-semibold">Fotky:</span> {a.photos_count}
                        </span>
                        <span>
                          <span className="font-semibold">Tipů:</span> {a.tips_total}
                        </span>
                        <span>
                          <span className="font-semibold">AW věk:</span> {fmt1(aw)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                        <span>
                          <span className="font-semibold">Vytvořeno:</span> {fmtDate(a.created_at)}
                        </span>
                      </div>

                      <div className="pt-2 text-xs flex items-center gap-2 flex-wrap">
  <Link href={`/profile/albums/${a.id}`} className="text-emerald-700 hover:underline">
    Otevřít album
  </Link>
  <span className="text-gray-300">|</span>
  <Link href={`/profile/albums/${a.id}`} className="text-emerald-700 hover:underline">
    Statistiky
  </Link>
  <span className="text-gray-300">|</span>
  <Link href={`/profile/albums/${a.id}?edit=1`} className="text-emerald-700 hover:underline">
    Editovat
  </Link>
</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : null}

        {mode === "my_posts" ? (
          loading ? (
            <GridSkeleton />
          ) : sortedPosts.length === 0 ? (
            <EmptyState title="Zatím tu nemáš žádné posty" text="Vytvoř post s fotkami a objeví se tady." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPosts.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex h-48 items-center justify-center bg-gray-50">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="Post cover" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-sm text-gray-500">Bez náhledu</div>
                    )}
                  </div>

                  <div className="space-y-2 p-4 text-sm">
                    <div className="font-semibold text-gray-900">{p.title ?? "Post"}</div>
                    {p.text ? <div className="line-clamp-2 text-xs text-gray-600">{p.text}</div> : null}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                      <span>
                        <span className="font-semibold">Fotky:</span> {p.photos_count}
                      </span>
                      <span>
                        <span className="font-semibold">Datum:</span> {fmtDate(p.created_at)}
                      </span>
                    </div>

                    <div className="pt-2 text-xs flex items-center gap-2 flex-wrap">
  <Link href={`/profile/posts/${p.id}`} className="text-emerald-700 hover:underline">
    Otevřít post
  </Link>
  <span className="text-gray-300">|</span>
  <Link href={`/profile/posts/${p.id}`} className="text-emerald-700 hover:underline">
    Statistiky
  </Link>
  <span className="text-gray-300">|</span>
  <Link href={`/profile/posts/${p.id}?edit=1`} className="text-emerald-700 hover:underline">
    Editovat
  </Link>
</div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}

        {mode === "my_guesses" ? (
          loading ? (
            <GridSkeleton />
          ) : sortedGuesses.length === 0 ? (
            <EmptyState title="Zatím tu nemáš žádné tipy" text="Až budeš tipovat věk u fotek ostatních, uvidíš je tady." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedGuesses.map((g) => (
                <div key={g.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex h-48 items-center justify-center bg-gray-50">
                    {g.image_public_url ? (
                      <img
                        src={g.image_public_url}
                        alt="Tipnutá fotka"
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
                        <span className="font-semibold">Tip:</span> {g.guessed_age ?? "—"}
                      </span>
                      <span>
                        <span className="font-semibold">Kdy:</span> {fmtDate(g.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                      <span>
                        <span className="font-semibold">Pořízení:</span> {fmtDate(g.image_taken_at)}
                      </span>
                    </div>

                    <div className="pt-2 text-xs">
                      <div className="pt-2 text-xs">
  <Link href={`/profile/photos/${g.image_id}`} className="text-emerald-700 hover:underline">
    Statistiky fotky
  </Link>
</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
