/**
 * File: app/profile/albums/[albumId]/page.tsx
 * Description:
 *   Detail alba – client-side (kvůli RLS + Next sync dynamic params).
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

function fmtDate(iso: string | null, fallback = "—") {
  if (!iso) return fallback;
  return String(iso).slice(0, 10);
}

function fmt1(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

type AlbumRow = {
  id: number;
  title: string | null;
  description: string | null;
  aw_age: number | null;
  created_at: string | null;
};

export default function AlbumDetailPage() {
  const params = useParams<{ albumId: string }>();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";

  const albumId = useMemo(() => Number(params?.albumId), [params]);

  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [album, setAlbum] = useState<AlbumRow | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photosCount, setPhotosCount] = useState(0);
  const [tipsTotal, setTipsTotal] = useState(0);
  const [awComputed, setAwComputed] = useState<number | null>(null);

  // session
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

  // load album + aggregates
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(albumId)) {
        setError("Neplatné ID alba.");
        setLoading(false);
        return;
      }

      if (!session?.user?.id) {
        setError("Pro detail alba se prosím přihlas.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1) Album
      const { data: a, error: aErr } = await supabase
        .from("albums")
        .select("id, title, description, aw_age, created_at")
        .eq("id", albumId)
        .single();

      if (cancelled) return;

      if (aErr || !a) {
        setError(aErr?.message ?? "Album nenalezeno nebo nemáš přístup.");
        setAlbum(null);
        setLoading(false);
        return;
      }

      setAlbum({
        id: Number(a.id),
        title: a.title ?? null,
        description: a.description ?? null,
        aw_age: typeof a.aw_age === "number" ? a.aw_age : null,
        created_at: a.created_at ? String(a.created_at) : null,
      });

      // 2) album -> posts
      const { data: rels, error: rErr } = await supabase
        .from("post_albums")
        .select("album_id, post_id, sort_order, created_at")
        .eq("album_id", albumId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (rErr) {
        setError(rErr.message);
        setLoading(false);
        return;
      }

      const postIds = Array.from(
        new Set((rels ?? []).map((r: any) => Number(r.post_id)).filter(Number.isFinite))
      );

      if (postIds.length === 0) {
        setCoverUrl(null);
        setPhotosCount(0);
        setTipsTotal(0);
        setAwComputed(null);
        setLoading(false);
        return;
      }

      const { data: postImageRows, error: piErr } = await supabase
        .from("post_images")
        .select("post_id, image_id, sort_order, created_at")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (piErr) {
        setError(piErr.message);
        setLoading(false);
        return;
      }

      const imageIds = Array.from(
        new Set((postImageRows ?? []).map((r: any) => Number(r.image_id)).filter(Number.isFinite))
      );

      if (imageIds.length === 0) {
        setCoverUrl(null);
        setPhotosCount(0);
        setTipsTotal(0);
        setAwComputed(null);
        setLoading(false);
        return;
      }

      // 3) images minimal
      const { data: imgs, error: iErr } = await supabase
        .from("images")
        .select("id, public_url, guesses_count, aw_age_image")
        .in("id", imageIds)
        .eq("hidden_by_admin", false);

      if (cancelled) return;

      if (iErr) {
        setError(iErr.message);
        setLoading(false);
        return;
      }

      let cover: string | null = null;
      let tips = 0;
      let awSum = 0;
      let awCount = 0;

      const imgById = new Map<number, any>();
      (imgs ?? []).forEach((img: any) => {
        const id = Number(img.id);
        if (Number.isFinite(id)) imgById.set(id, img);
      });

      (postImageRows ?? []).forEach((rel: any) => {
        const imageId = Number(rel.image_id);
        if (!Number.isFinite(imageId)) return;

        const img = imgById.get(imageId);
        if (!img) return;

        const url = img.public_url ? String(img.public_url) : null;
        if (!cover && url) cover = url;

        tips += Number(img.guesses_count ?? 0);

        const aw = img.aw_age_image;
        if (typeof aw === "number" && Number.isFinite(aw)) {
          awSum += aw;
          awCount += 1;
        }
      });

      setCoverUrl(cover);
      setPhotosCount((postImageRows ?? []).length);
      setTipsTotal(tips);
      setAwComputed(awCount > 0 ? awSum / awCount : null);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [albumId, session?.user?.id]);

  const awFinal = album?.aw_age ?? awComputed;

  return (
    <section className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? "Editace alba" : album?.title ?? "Album"}
        </h1>
        <Link href="/profile/photos?mode=my_albums" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Zpět na alba
        </Link>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</div>
      ) : !album ? null : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex max-h-[520px] items-center justify-center bg-gray-50">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="p-6 text-sm text-gray-500">Bez náhledu</div>
            )}
          </div>

            <div className="space-y-2 p-4 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
              <span>
                <span className="font-semibold">Fotky:</span> {photosCount}
              </span>
              <span>
                <span className="font-semibold">Tipů:</span> {tipsTotal}
              </span>
              <span>
                <span className="font-semibold">AW věk:</span> {fmt1(awFinal)}
              </span>
              <span>
                <span className="font-semibold">Vytvořeno:</span> {fmtDate(album.created_at)}
              </span>
            </div>

            {album.description ? <div className="text-xs text-gray-600">{album.description}</div> : null}
          </div>
        </div>
      )}
    </section>
  );
}
