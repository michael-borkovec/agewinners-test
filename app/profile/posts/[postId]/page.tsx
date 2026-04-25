/**
 * File: app/profile/posts/[postId]/page.tsx
 * Description:
 *   Detail postu – client-side (kvůli RLS + Next sync dynamic params).
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

type PostRow = {
  id: number;
  title: string | null;
  text: string | null;
  created_at: string | null;
};

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";

  const postId = useMemo(() => Number(params?.postId), [params]);

  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [post, setPost] = useState<PostRow | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photosCount, setPhotosCount] = useState(0);

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(postId)) {
        setError("Neplatné ID postu.");
        setLoading(false);
        return;
      }

      if (!session?.user?.id) {
        setError("Pro detail postu se prosím přihlas.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: p, error: pErr } = await supabase
        .from("posts")
        .select("id, title, text, created_at")
        .eq("id", postId)
        .single();

      if (cancelled) return;

      if (pErr || !p) {
        setError(pErr?.message ?? "Post nenalezen nebo nemáš přístup.");
        setPost(null);
        setLoading(false);
        return;
      }

      setPost({
        id: Number(p.id),
        title: p.title ?? null,
        text: p.text ?? null,
        created_at: p.created_at ? String(p.created_at) : null,
      });

const { data: rels, error: rErr } = await supabase
  .from("post_images")
  .select("post_id, image_id")
  .eq("post_id", postId)
  .order("image_id", { ascending: true });


      if (cancelled) return;

      if (rErr) {
        setError(rErr.message);
        setLoading(false);
        return;
      }

      const imageIds = Array.from(
        new Set((rels ?? []).map((r: any) => Number(r.image_id)).filter(Number.isFinite))
      );

      if (imageIds.length === 0) {
        setCoverUrl(null);
        setPhotosCount(0);
        setLoading(false);
        return;
      }

      const { data: imgs, error: iErr } = await supabase
        .from("images")
        .select("id, public_url")
        .in("id", imageIds);

      if (cancelled) return;

      if (iErr) {
        setError(iErr.message);
        setLoading(false);
        return;
      }

      setPhotosCount((imgs ?? []).length);
      setCoverUrl(imgs?.[0]?.public_url ? String(imgs[0].public_url) : null);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId, session?.user?.id]);

  return (
    <section className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? "Editace postu" : post?.title ?? "Post"}
        </h1>
        <Link href="/profile/photos?mode=my_posts" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Zpět na posty
        </Link>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{error}</div>
      ) : !post ? null : (
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
                <span className="font-semibold">Datum:</span> {fmtDate(post.created_at)}
              </span>
              <span>
                <span className="font-semibold">Fotky:</span> {photosCount}
              </span>
            </div>

            {post.text ? <div className="whitespace-pre-wrap text-sm text-gray-700">{post.text}</div> : null}
          </div>
        </div>
      )}
    </section>
  );
}
