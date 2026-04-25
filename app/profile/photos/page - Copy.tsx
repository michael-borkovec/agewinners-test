/**
 * File: app/profile/photos/page.tsx
 * Description:
 *   Profilová sekce: "Moje fotky & věkové tipy" (/profile/photos)
 *
 * ✅ Implemented (REAL DATA):
 * - Mode "Moje fotky": loads user's images from Supabase + computes:
 *   - last_posted_at (max posts.created_at for the image)
 *   - posted_count (how many times image was posted)
 *
 * Sorting (photos):
 * - last posted (desc/asc) [computed]
 * - guesses count (desc/asc) [images.guesses_count]
 * - average age (AW age image) (desc/asc) [images.aw_age_image, fallback avg_guessed_age]
 *
 * Notes:
 * - DB column is NOT images.aw_age (error you saw).
 * - We use images.aw_age_image (and fallback to avg_guessed_age for older data).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { awAlert } from "@/components/AwDialog";
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
  | "guessed_user_name_asc"
  | "guessed_user_name_desc";

type MyPhotoRow = {
  id: number;
  public_url: string | null;
  taken_at: string | null;

  guesses_count: number | null;

  // ✅ DB currently: aw_age_image (not aw_age)
  aw_age_image: number | null;

  // optional legacy fallback (if still present)
  avg_guessed_age: number | null;

  // derived
  last_posted_at: string | null; // ISO
  posted_count: number; // integer
};

function safeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
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

function pickAwAgeImage(row: MyPhotoRow): number | null {
  // Prefer new field; fallback to legacy avg
  return row.aw_age_image ?? row.avg_guessed_age ?? null;
}

export default function ProfilePhotosPage() {
  const [session, setSession] = useState<Session | null>(null);

  const [mode, setMode] = useState<PhotosMode>("my_photos");
  const [sort, setSort] = useState<SortOption>("last_posted_desc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myPhotos, setMyPhotos] = useState<MyPhotoRow[]>([]);

  // load session
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

  // keep sort valid for selected mode
  useEffect(() => {
    if (!sortOptions.find((o) => o.value === sort)) {
      setSort(sortOptions[0].value as SortOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // load real list: My Photos
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

        /**
         * ✅ IMPORTANT:
         * - images.aw_age DOES NOT exist (your error).
         * - We select aw_age_image instead.
         * - We also select avg_guessed_age as a legacy fallback (if still present).
         */
        const { data: images, error: imagesError } = await supabase
          .from("images")
          .select("id, public_url, taken_at, guesses_count, aw_age_image, avg_guessed_age")
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
          guesses_count: safeInt(row.guesses_count),
          aw_age_image: safeNumber(row.aw_age_image),
          avg_guessed_age: safeNumber(row.avg_guessed_age),
          last_posted_at: null,
          posted_count: 0,
        }));

        const imageIds = base.map((x) => x.id).filter((x) => Number.isFinite(x));
        if (imageIds.length === 0) {
          setMyPhotos([]);
          return;
        }

        // Load post_images relations + posts.created_at (embedded)
        const { data: rels, error: relError } = await supabase
          .from("post_images")
          .select("image_id, post_id, posts(created_at)")
          .in("image_id", imageIds);

        if (cancelled) return;

        if (relError) {
          // not fatal: still show photos, but without last_posted
          console.warn("ProfilePhotos: cannot load post_images/posts:", relError.message);
          setMyPhotos(base);
          return;
        }

        // aggregate per image
        const agg = new Map<number, { count: number; maxIso: string | null }>();

        (rels ?? []).forEach((r: any) => {
          const imageId = Number(r.image_id);
          if (!Number.isFinite(imageId)) return;

          const createdAt = r?.posts?.created_at ? String(r.posts.created_at) : null;

          const cur = agg.get(imageId) ?? { count: 0, maxIso: null };
          cur.count += 1;

          if (createdAt) {
            if (!cur.maxIso) cur.maxIso = createdAt;
            else {
              const curT = new Date(cur.maxIso).getTime();
              const newT = new Date(createdAt).getTime();
              if (Number.isFinite(newT) && (!Number.isFinite(curT) || newT > curT)) {
                cur.maxIso = createdAt;
              }
            }
          }

          agg.set(imageId, cur);
        });

        const enriched = base.map((img) => {
          const a = agg.get(img.id);
          if (!a) return img;
          return {
            ...img,
            posted_count: a.count,
            last_posted_at: a.maxIso,
          };
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

  // apply sorting (client-side)
  const sortedPhotos = useMemo(() => {
    const arr = [...myPhotos];
    if (mode !== "my_photos") return arr;

    if (sort === "last_posted_desc")
      arr.sort((a, b) => compareNullableIso(a.last_posted_at, b.last_posted_at, "desc"));
    else if (sort === "last_posted_asc")
      arr.sort((a, b) => compareNullableIso(a.last_posted_at, b.last_posted_at, "asc"));
    else if (sort === "guesses_count_desc")
      arr.sort((a, b) => compareNullableNumber(a.guesses_count ?? null, b.guesses_count ?? null, "desc"));
    else if (sort === "guesses_count_asc")
      arr.sort((a, b) => compareNullableNumber(a.guesses_count ?? null, b.guesses_count ?? null, "asc"));
    else if (sort === "aw_age_desc")
      arr.sort((a, b) => compareNullableNumber(pickAwAgeImage(a), pickAwAgeImage(b), "desc"));
    else if (sort === "aw_age_asc")
      arr.sort((a, b) => compareNullableNumber(pickAwAgeImage(a), pickAwAgeImage(b), "asc"));

    return arr;
  }, [myPhotos, mode, sort]);

  const isLoggedIn = !!session?.user?.id;

  return (
    <section className="max-w-5xl">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Moje fotky & věkové tipy</h1>

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
          Pro zobrazení „Moje fotky“ se prosím přihlas.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</div>
      )}

      <div className="mt-4">
        {mode !== "my_photos" ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900">Zatím v další iteraci</p>
            <p className="mt-1 text-sm text-gray-600">
              Teď děláme reálné seznamy „Moje fotky“. Alba / posty / tipy doplníme hned potom.
            </p>
          </div>
        ) : loading ? (
          <PhotosSkeleton />
        ) : sortedPhotos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900">Zatím tu nemáš žádné fotky</p>
            <p className="mt-1 text-sm text-gray-600">
              Přidej fotku přes nový post a pak se ti tu zobrazí přehled včetně statistik.
            </p>
          </div>
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
                      <span className="font-semibold">Tipů:</span> {p.guesses_count ?? 0}
                    </span>
                    <span>
                      <span className="font-semibold">Průměr (AW age):</span> {fmt1(pickAwAgeImage(p), "—")}
                    </span>
                  </div>

                  <div className="pt-1">
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        void awAlert("Detail fotky / repost / statistiky doplníme v další iteraci.");
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Detail / akce…
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PhotosSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-48 animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
