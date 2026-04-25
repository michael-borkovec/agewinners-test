/**
 * File: app/profile/photos/albums/[albumId]/page.tsx
 * Purpose:
 *   Album detail page in profile photos section:
 *   - Shows photos belonging to a single album
 *   - UI is intentionally the same as "Moje fotky" grid (only filtered)
 *
 * Important Next.js note:
 * - This is a Client Component, so we must read the route param via useParams()
 *   (NOT via props params).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useParams } from "next/navigation";
import { awAlert } from "@/components/AwDialog";
import { supabase } from "@/lib/supabaseClient";

type MyPhotoRow = {
  id: number;
  public_url: string | null;
  taken_at: string | null;
  guesses_count: number;
  aw_age_image: number | null;

  // derived
  last_posted_at: string | null;
  posted_count: number;
};

type AlbumMeta = {
  id: number;
  title: string | null;
  description: string | null;
  aw_age: number | null;
  created_at: string | null;
};

function safeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeInt(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fmt1(v: number | null, fallback = "—") {
  if (v == null || Number.isNaN(Number(v))) return fallback;
  return Number(v).toFixed(1);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("cs-CZ");
}

export default function AlbumPhotosPage() {
  const params = useParams<{ albumId: string }>();
  const albumIdStr = params?.albumId;
  const albumIdNum = Number(albumIdStr);

  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [album, setAlbum] = useState<AlbumMeta | null>(null);
  const [photos, setPhotos] = useState<MyPhotoRow[]>([]);

  /* -----------------------------
   * Auth session
   * ----------------------------- */
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const isLoggedIn = !!session?.user?.id;

  /* -----------------------------
   * Load album meta + album photos
   * ----------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!albumIdStr || !Number.isFinite(albumIdNum)) {
          setError("Neplatné ID alba.");
          setAlbum(null);
          setPhotos([]);
          return;
        }

        if (!isLoggedIn) {
          setAlbum(null);
          setPhotos([]);
          return;
        }

        const userId = session!.user!.id;

        // 1) Album meta (only my album)
        const { data: a, error: aErr } = await supabase
          .from("albums")
          .select("id, title, description, aw_age, created_at")
          .eq("id", albumIdNum)
          .eq("owner_user_id", userId)
          .single();

        if (cancelled) return;

        if (aErr) {
          setError(aErr.message || "Album se nepodařilo načíst.");
          setAlbum(null);
          setPhotos([]);
          return;
        }

        const meta: AlbumMeta = {
          id: Number((a as any).id),
          title: (a as any).title ?? null,
          description: (a as any).description ?? null,
          aw_age: safeNumber((a as any).aw_age),
          created_at: (a as any).created_at ? String((a as any).created_at) : null,
        };

        setAlbum(meta);

        // 2) Album posts via post_albums
        const { data: rels, error: relErr } = await supabase
          .from("post_albums")
          .select("post_id, sort_order, created_at")
          .eq("album_id", albumIdNum);

        if (cancelled) return;

        if (relErr) {
          setError(relErr.message || "Fotky alba se nepodařilo načíst.");
          setPhotos([]);
          return;
        }

        const postIds = Array.from(
          new Set((rels ?? []).map((r: any) => Number(r.post_id)).filter((x: number) => Number.isFinite(x)))
        );

        if (postIds.length === 0) {
          setPhotos([]);
          return;
        }

        const { data: postRows, error: postRowsErr } = await supabase
          .from("posts")
          .select("id, created_at")
          .in("id", postIds);

        if (cancelled) return;

        if (postRowsErr) {
          setError(postRowsErr.message || "Posty alba se nepodaÅ™ilo naÄÃ­st.");
          setPhotos([]);
          return;
        }

        const postCreatedAtById = new Map<number, string | null>();
        (postRows ?? []).forEach((post: any) => {
          const id = Number(post.id);
          if (Number.isFinite(id)) {
            postCreatedAtById.set(id, post.created_at ? String(post.created_at) : null);
          }
        });

        // 3) Album post_images -> images
        const { data: postRels, error: postRelErr } = await supabase
          .from("post_images")
          .select("post_id, image_id, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        if (cancelled) return;

        if (postRelErr) {
          console.warn("AlbumPhotos: cannot load post_images:", postRelErr.message);
          setPhotos([]);
          return;
        }

        const imageIds = Array.from(
          new Set((postRels ?? []).map((r: any) => Number(r.image_id)).filter((x: number) => Number.isFinite(x)))
        );

        if (imageIds.length === 0) {
          setPhotos([]);
          return;
        }

        const { data: imgs, error: imgsErr } = await supabase
          .from("images")
          .select("id, public_url, taken_at, guesses_count, aw_age_image")
          .in("id", imageIds)
          .eq("hidden_by_admin", false);

        if (cancelled) return;

        if (imgsErr) {
          setError(imgsErr.message || "Fotky alba se nepodaÅ™ilo naÄÃ­st.");
          setPhotos([]);
          return;
        }

        const imgById = new Map<number, any>();
        (imgs ?? []).forEach((img: any) => {
          const id = Number(img.id);
          if (Number.isFinite(id)) imgById.set(id, img);
        });

        const baseByImageId = new Map<number, MyPhotoRow>();
        (postRels ?? []).forEach((rel: any) => {
          const imageId = Number(rel.image_id);
          if (!Number.isFinite(imageId) || baseByImageId.has(imageId)) return;

          const img = imgById.get(imageId);
          if (!img) return;

          baseByImageId.set(imageId, {
            id: imageId,
            public_url: img.public_url ?? null,
            taken_at: img.taken_at ?? null,
            guesses_count: safeInt(img.guesses_count, 0),
            aw_age_image: safeNumber(img.aw_age_image),
            last_posted_at: null,
            posted_count: 0,
          });
        });

        const agg = new Map<number, { count: number; maxIso: string | null }>();

        (postRels ?? []).forEach((r: any) => {
          const imageId = Number(r.image_id);
          if (!Number.isFinite(imageId)) return;

          const postId = Number(r.post_id);
          const createdAt = Number.isFinite(postId) ? postCreatedAtById.get(postId) ?? null : null;

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

        const enriched = Array.from(baseByImageId.values()).map((img) => {
          const a = agg.get(img.id);
          if (!a) return img;
          return { ...img, posted_count: a.count, last_posted_at: a.maxIso };
        });

        setPhotos(enriched);
      } catch (e: any) {
        setError(e?.message ?? "Něco se pokazilo při načítání alba.");
        setAlbum(null);
        setPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [albumIdStr, albumIdNum, isLoggedIn, session?.user?.id]);

  const sortedPhotos = useMemo(() => {
    // default: newest first by ID (simple & stable)
    return [...photos].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [photos]);

  return (
    <section className="max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {album?.title?.trim() ? album.title : "Album"}
          </h1>
          <div className="mt-1 text-sm text-gray-600">
            Vytvořeno: {fmtDate(album?.created_at ?? null)} • AW věk:{" "}
            <span className="font-semibold">{fmt1(album?.aw_age ?? null, "—")}</span>
          </div>
        </div>

        {/* NOTE: later we can add ?mode=my_albums to return directly to the albums tab */}
        <Link href="/profile/photos" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Zpět na alba
        </Link>
      </div>

      {!isLoggedIn && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Pro zobrazení alba se prosím přihlas.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : sortedPhotos.length === 0 ? (
        <EmptyState title="Album je zatím prázdné" text="V albu zatím nejsou žádné posty ani fotky." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPhotos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex h-48 items-center justify-center bg-gray-50">
                {p.public_url ? (
                  <img
                    src={p.public_url}
                    alt="Fotka v albu"
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
                    onClick={() => void awAlert("Statistiky / edit fotky doplníme v další iteraci.")}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Detail / akce…
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
