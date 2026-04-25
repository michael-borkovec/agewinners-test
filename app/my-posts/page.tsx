/**
 * File: app/my-posts/page.tsx
 *
 * Purpose:
 * - "Moje posty" page (only my posts)
 *
 * Fix:
 * - DOES NOT call supabase.auth.getSession().
 * - Uses AuthContext provided by AuthShell to get userId.
 * - Prevents stuck "Ověřuji přihlášení…" states during navigation.
 *
 * New:
 * - Sticky header with modal filter + refresh icon
 * - Filter is client-side (no API change): filter by photo tags inside loaded posts
 * - Filter persists across refresh
 *
 * UX:
 * - Sticky header stays visible while scrolling.
 * - New post form is below header and scrolls away (to keep space for browsing).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NewPostForm } from "@/components/NewPostForm";
import { PostCard } from "@/components/PostCard";
import { getMyPosts, normalizeImageTags, PHOTO_TAG_LABELS, type PredefinedPhotoTag } from "@/lib/api/posts";
import type { UiPost, UiPostImage } from "@/types/ui";
import { useAuth } from "@/components/auth/AuthContext";
import { SectionHeaderFilter } from "@/components/SectionHeaderFilter";

const ALL_TAGS = Object.keys(PHOTO_TAG_LABELS) as PredefinedPhotoTag[];

type TaggedPostImage = UiPostImage & {
  photo_category?: string | null;
  tags?: string[] | null;
};

type TaggedPost = UiPost & {
  images: TaggedPostImage[];
};

export default function MyPostsPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const focusImageId = Number(searchParams.get("focusImage") ?? 0) || null;

  const [posts, setPosts] = useState<UiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // empty array = show all
  const [filterTags, setFilterTags] = useState<PredefinedPhotoTag[]>([]);
  const filterOptions = useMemo(() => ALL_TAGS.map((tag) => ({ key: tag, label: PHOTO_TAG_LABELS[tag] })), []);

  async function reload() {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await getMyPosts({ currentUserId: userId, limit: 50, offset: 0 });
      setPosts(data as unknown as UiPost[]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Moje posty se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // client-side filter by tag
  const visiblePosts = useMemo(() => {
    if (filterTags.length === 0) return posts;
    const want = new Set(normalizeImageTags(filterTags));

    return posts.filter((p) => {
      const imgs = ((p as TaggedPost).images ?? []) as TaggedPostImage[];
      return imgs.some((img) => {
        const imageTags = normalizeImageTags([...(Array.isArray(img?.tags) ? img.tags : []), img?.photo_category]);
        return imageTags.some((tag) => want.has(tag));
      });
    });
  }, [posts, filterTags]);

  // AuthShell will redirect non-auth users to /login.
  // This is just a small guard for edge cases.
  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/Menu-moje-posty.ico" alt="" className="h-[2.1em] w-[2.1em] shrink-0" />
            <h1 className="text-[1.625rem] font-semibold leading-tight">
              Moje posty
            </h1>
          </div>
          <p className="mt-2 text-slate-600">Ověřuji přihlášení…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeaderFilter
        title="Moje posty"
        iconPath="/ui/Menu-moje-posty.ico"
        helpText="Tady spravuješ své příspěvky. Přes trychtýř omezíš zobrazení podle tagů fotek, otazník stručně připomene smysl stránky a obnovení načte aktuální stav po úpravách."
        storageKey="aw:filter:my-posts"
        options={filterOptions}
        mainTitle="Tagy"
        value={filterTags}
        onChange={(next) => setFilterTags(next as PredefinedPhotoTag[])}
        onRefresh={reload}
        refreshActiveIconPath="/ui/refresh-rot.gif"
        refreshActiveDurationMs={5000}
      />

      <div className="p-4">
        {/* This form scrolls away (header stays sticky). */}
        <div className="mb-4">
          <NewPostForm onCreated={reload} />
        </div>

        {loading ? <p className="text-slate-600">Načítám…</p> : null}
        {err ? <p className="text-rose-700">{err}</p> : null}

        {!loading && !err && visiblePosts.length === 0 ? (
          <p className="text-slate-600">{filterTags.length === 0 ? "Zatím tu nemáš žádný post." : "V této filtraci nemáš žádný post."}</p>
        ) : null}

        <div className="space-y-4">
          {visiblePosts.map((p) => (
            <PostCard
              key={String(p.id)}
              post={p}
              currentUserId={userId}
              hideAlbumBadge
              renderCaptionAboveImage
              enableOwnerComments
              focusImageId={focusImageId}
              onPostDeleted={() => reload()}
              onImageRemovedFromPost={() => reload()}
              onPostChanged={() => reload()}
              imageTileClassName={(p.images ?? []).length === 1 ? "mx-auto w-full max-w-[65%]" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
