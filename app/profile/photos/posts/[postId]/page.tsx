/**
 * File: app/profile/photos/posts/[postId]/page.tsx
 * Purpose:
 *   Otevřený post v /profile/photos → zobrazí pouze fotky daného postu.
 *   UI je shodné s "Moje fotky", jen je to filtrováno podle postu.
 *
 * Notes:
 * - Záměrně NEpoužíváme Supabase embed post_images -> images,
 *   protože DB má více vztahů a Supabase hlásí "more than one relationship found".
 * - Místo toho děláme 2 dotazy: post_images → image_ids, poté images → rows.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { awAlert } from "@/components/AwDialog";
import { supabase } from "@/lib/supabaseClient";

type PostMeta = {
  id: number;
  created_at: string | null;
  text: string | null;
  title: string | null; // připraveno i pro budoucí title
  author_user_id: string | null;
};

type PhotoRow = {
  id: number;
  public_url: string | null;
  taken_at: string | null;
  guesses_count: number;
  aw_age_image: number | null;

  // derived
  last_posted_at: string | null;
  posted_count: number;
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

export default function ProfilePostPhotosPage() {
  const params = useParams<{ postId: string }>();
  const postIdStr = params?.postId;

  const postIdNum = useMemo(() => {
    const n = Number(postIdStr);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }, [postIdStr]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [post, setPost] = useState<PostMeta | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!postIdStr || !postIdNum) {
          setError("Neplatné ID postu.");
          setPost(null);
          setPhotos([]);
          return;
        }

        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id ?? null;

        if (!uid) {
          setError("Nejsi přihlášený.");
          setPost(null);
          setPhotos([]);
          return;
        }

        // 1) Load post meta + verify owner
        const { data: postRow, error: postErr } = await supabase
          .from("posts")
          .select("id, created_at, text, author_user_id, title")
          .eq("id", postIdNum)
          .single();

        if (cancelled) return;

        if (postErr || !postRow) {
          setError(postErr?.message || "Post se nepodařilo načíst.");
          setPost(null);
          setPhotos([]);
          return;
        }

        const meta: PostMeta = {
          id: Number((postRow as any).id),
          created_at: (postRow as any).created_at ? String((postRow as any).created_at) : null,
          text: (postRow as any).text ?? null,
          title: (postRow as any).title ?? null,
          author_user_id: (postRow as any).author_user_id ?? null,
        };

        if (meta.author_user_id !== uid) {
          setError("Tento post nepatří tobě (nebo k němu nemáš přístup).");
          setPost(null);
          setPhotos([]);
          return;
        }

        setPost(meta);

        // 2) Load image IDs from post_images
        const { data: rels, error: relErr } = await supabase
          .from("post_images")
          .select("image_id")
          .eq("post_id", postIdNum)
          .order("sort_order", { ascending: true });

        if (cancelled) return;

        if (relErr) {
          setError(relErr.message || "Fotky postu se nepodařilo načíst.");
          setPhotos([]);
          return;
        }

        const imageIds = (rels ?? [])
          .map((r: any) => Number(r.image_id))
          .filter((x) => Number.isFinite(x));

        if (imageIds.length === 0) {
          setPhotos([]);
          return;
        }

        // 3) Load images by IDs (no embed → no ambiguity)
        const { data: imgs, error: imgErr } = await supabase
          .from("images")
          .select("id, public_url, taken_at, guesses_count, aw_age_image")
          .in("id", imageIds)
          .eq("hidden_by_admin", false);

        if (cancelled) return;

        if (imgErr) {
          setError(imgErr.message || "Fotky postu se nepodařilo načíst (images).");
          setPhotos([]);
          return;
        }

        // keep order according to post_images order
        const mapById = new Map<number, any>();
        (imgs ?? []).forEach((x: any) => mapById.set(Number(x.id), x));

        const list: PhotoRow[] = imageIds
          .map((id) => {
            const img = mapById.get(id);
            if (!img) return null;
            return {
              id: Number(img.id),
              public_url: img.public_url ?? null,
              taken_at: img.taken_at ?? null,
              guesses_count: safeInt(img.guesses_count, 0),
              aw_age_image: safeNumber(img.aw_age_image),
              // v tomto view je fotka postnutá v rámci daného postu
              last_posted_at: meta.created_at,
              posted_count: 1,
            } as PhotoRow;
          })
          .filter(Boolean) as PhotoRow[];

        setPhotos(list);
      } catch (e: any) {
        setError(e?.message ?? "Nepodařilo se načíst post.");
        setPost(null);
        setPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [postIdStr, postIdNum]);

  return (
    <section className="max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {post?.title?.trim() ? post.title : `Post #${postIdNum ?? "—"}`}
          </h1>
          <div className="mt-1 text-sm text-gray-600">
            Vytvořeno: <span className="font-semibold">{fmtDate(post?.created_at ?? null)}</span> • Fotek:{" "}
            <span className="font-semibold">{photos.length}</span>
          </div>
        </div>

        <Link href="/profile/photos" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Zpět na moje posty
        </Link>
      </div>

      {post?.text?.trim() ? (
        <div className="mb-4 rounded-2xl bg-white p-4 text-sm text-gray-800 shadow-sm">
          {post.text}
        </div>
      ) : null}

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-semibold text-gray-900">Tento post je prázdný</p>
          <p className="mt-1 text-sm text-gray-600">Vypadá to, že k postu nejsou připojené žádné fotky.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex h-48 items-center justify-center bg-gray-50">
                {p.public_url ? (
                  <img
                    src={p.public_url}
                    alt="Fotka z postu"
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
                    <span className="font-semibold">Post:</span> {fmtDate(p.last_posted_at)}
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
                    onClick={() => void awAlert("Vývoj / editace fotky doplníme v další iteraci.")}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Vývoj / editovat…
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

