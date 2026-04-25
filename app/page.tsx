/**
 * File: app/page.tsx
 *
 * Purpose:
 * - Feed page
 * - Sticky header with modal filter + refresh icon
 * - Feed now shows individual photos from posts in random order
 * - Successful guesses remove photos locally after a short delay
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import type { UiPost } from "@/types/ui";
import { createAgeGuess } from "@/lib/api/ageGuesses";
import { supabase } from "@/lib/supabaseClient";
import { getFeedPosts, hideFeedImage, PHOTO_TAG_LABELS, type PredefinedPhotoTag, unhideFeedImage } from "@/lib/api/posts";
import { SectionHeaderFilter, type FilterOption } from "@/components/SectionHeaderFilter";

const ALL_TAGS = Object.keys(PHOTO_TAG_LABELS) as PredefinedPhotoTag[];
const FEED_HIDDEN_MODE_OPTIONS: FilterOption[] = [
  { key: "exclude", label: "Nezobrazovat skryté fotky" },
  { key: "include", label: "Zobrazit vše (i skryté fotky)" },
  { key: "only", label: "Zobrazit pouze skryté fotky" },
];
const FEED_REFRESH_AFTER_GUESSES = 7;

export default function FeedPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPrivilegedViewer, setIsPrivilegedViewer] = useState(false);
  const [filterTags, setFilterTags] = useState<PredefinedPhotoTag[]>([]);
  const [hiddenMode, setHiddenMode] = useState<"exclude" | "include" | "only">("exclude");
  const filterOptions = useMemo(() => ALL_TAGS.map((tag) => ({ key: tag, label: PHOTO_TAG_LABELS[tag] })), []);

  const [posts, setPosts] = useState<UiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refreshScheduledRef = useRef(false);
  const successfulGuessCountRef = useRef(0);
  const superUserGuessedByPostRef = useRef<Record<number, number[]>>({});
  const pinnedCardAfterRefreshRef = useRef<UiPost | null>(null);
  const scrollToTopAfterLoadRef = useRef(false);

  const clearAllFeedTimers = useCallback(() => {
    refreshScheduledRef.current = false;
  }, []);

  const loadFeed = useCallback(async () => {
    if (!currentUserId || authLoading) return;

    clearAllFeedTimers();
    setLoading(true);
    setErr(null);

    try {
      const data = await getFeedPosts({
        currentUserId,
        categories: filterTags.length === 0 ? [] : filterTags,
        limit: 30,
        offset: 0,
        excludeFullyGuessed: true,
        hiddenMode,
      });

      const nextPosts = data as UiPost[];
      const pinnedCard = pinnedCardAfterRefreshRef.current;
      pinnedCardAfterRefreshRef.current = null;
      successfulGuessCountRef.current = 0;
      superUserGuessedByPostRef.current = {};
      setPosts(
        pinnedCard
          ? [pinnedCard, ...nextPosts.filter((post) => Number(post.images?.[0]?.id) !== Number(pinnedCard.images?.[0]?.id))]
          : nextPosts
      );

      if (scrollToTopAfterLoadRef.current && typeof window !== "undefined") {
        scrollToTopAfterLoadRef.current = false;
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Feed se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, clearAllFeedTimers, currentUserId, filterTags, hiddenMode]);

  const handleManualRefresh = useCallback(async () => {
    scrollToTopAfterLoadRef.current = true;
    await loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    let alive = true;

    async function loadViewerPrivilege(uid: string) {
      try {
        const { data: prof, error } = await supabase
          .from("user_profiles")
          .select("super_user, role")
          .eq("user_id", uid)
          .maybeSingle();

        if (!alive) return;
        if (!error && prof) {
          setIsPrivilegedViewer(
            Boolean((prof as { super_user?: boolean | null; role?: string | null }).super_user) ||
              (prof as { role?: string | null }).role === "moderator" ||
              (prof as { role?: string | null }).role === "admin"
          );
        } else {
          setIsPrivilegedViewer(false);
        }
      } catch {
        if (!alive) return;
        setIsPrivilegedViewer(false);
      }
    }

    async function loadSessionOnly() {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id ?? null;
        if (!alive) return;

        setCurrentUserId(uid);
        setAuthLoading(false);

        if (uid) void loadViewerPrivilege(uid);
        else setIsPrivilegedViewer(false);
      } catch {
        if (!alive) return;
        setCurrentUserId(null);
        setIsPrivilegedViewer(false);
        setAuthLoading(false);
      }
    }

    void loadSessionOnly();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const uid = newSession?.user?.id ?? null;
      if (!alive) return;

      setCurrentUserId(uid);
      setAuthLoading(false);

      if (uid) void loadViewerPrivilege(uid);
      else setIsPrivilegedViewer(false);
    });

    const onFocus = () => void loadSessionOnly();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadSessionOnly();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (currentUserId && !authLoading) {
      void loadFeed();
    }
  }, [authLoading, currentUserId, loadFeed]);

  useEffect(() => {
    return () => {
      clearAllFeedTimers();
    };
  }, [clearAllFeedTimers]);

  function scheduleRefreshAfterThreshold(lastGuessedCard: UiPost | null) {
    if (refreshScheduledRef.current) return;
    refreshScheduledRef.current = true;
    pinnedCardAfterRefreshRef.current = lastGuessedCard;
    successfulGuessCountRef.current = 0;
    superUserGuessedByPostRef.current = {};
    void loadFeed();
  }

  async function handleGuess(imageId: number, age: number) {
    const result = await createAgeGuess({ imageId, guessedAge: age });
    if (!result?.ok) return result;
    const confirmedAge = Number(result.guessedAge ?? age);

    const target = posts.find((post) => Number(post.images?.[0]?.id) === imageId) ?? null;
    if (!target) return result;
    const pinnedCard: UiPost = {
      ...target,
      images: (target.images ?? []).map((image) =>
        Number(image.id) === imageId ? { ...image, viewerGuessedAge: confirmedAge } : image
      ),
    };
    setPosts((prev) =>
      prev.map((post) =>
        Number(post.images?.[0]?.id) === imageId
          ? {
              ...post,
              images: (post.images ?? []).map((image) =>
                Number(image.id) === imageId ? { ...image, viewerGuessedAge: confirmedAge } : image
              ),
            }
          : post
      )
    );

    successfulGuessCountRef.current += 1;

    if (isPrivilegedViewer) {
      const sourcePostId = Number(target.sourcePostId ?? target.id ?? 0);
      const existingGuessed = new Set<number>(
        posts
          .filter((post) => Number(post.sourcePostId ?? post.id) === sourcePostId)
          .map((post) => (post.images?.[0]?.viewerGuessedAge != null ? Number(post.images?.[0]?.id ?? 0) : 0))
          .filter((id) => id > 0)
      );
      const localGuessed = new Set<number>(superUserGuessedByPostRef.current[sourcePostId] ?? []);

      existingGuessed.forEach((id) => localGuessed.add(id));
      localGuessed.add(imageId);
      superUserGuessedByPostRef.current[sourcePostId] = Array.from(localGuessed);

    }

    if (successfulGuessCountRef.current >= FEED_REFRESH_AFTER_GUESSES) {
      scheduleRefreshAfterThreshold(pinnedCard);
    }

    return result;
  }

  async function handleToggleHiddenImage(imageId: number) {
    if (!currentUserId) throw new Error("Pro skrytí fotky se prosím přihlas.");

    const target = posts.find((post) => Number(post.images?.[0]?.id) === imageId) ?? null;
    const isHidden = Boolean(target?.isHiddenByViewer);

    if (isHidden) {
      await unhideFeedImage({ imageId, currentUserId });
      await loadFeed();
      return;
    }

    await hideFeedImage({ imageId, currentUserId });
    setPosts((prev) => prev.filter((post) => Number(post.images?.[0]?.id) !== imageId));
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border bg-white p-6">
          <div className="text-slate-600">Načítám…</div>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/Menu-Feed.ico" alt="" className="h-[2.1em] w-[2.1em] shrink-0" />
            <h1 className="text-[1.625rem] font-semibold leading-tight">Feed</h1>
          </div>
          <p className="mt-2 text-slate-600">Pro zobrazení feedu se prosím přihlas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SectionHeaderFilter
        title="Feed"
        iconPath="/ui/Menu-Feed.ico"
        helpText="Feed ti ukazuje fotky k tipování v aktuální filtraci. Trychtýř mění, co chceš vidět. Obnovení načte nový výběr a po správných tipech se obsah průběžně proměňuje."
        storageKey="aw:filter:feed"
        options={filterOptions}
        mainTitle="Tagy"
        value={filterTags}
        onChange={(next) => setFilterTags(next as PredefinedPhotoTag[])}
        selectTitle="Skryté fotky"
        selectOptions={FEED_HIDDEN_MODE_OPTIONS}
        selectValue={hiddenMode}
        onSelectChange={(next) => setHiddenMode((next as "exclude" | "include" | "only") || "exclude")}
        onRefresh={handleManualRefresh}
        refreshActiveIconPath="/ui/refresh-rot.gif"
        refreshActiveDurationMs={5000}
      />

      <div className="px-2 py-4 sm:p-4">
        {loading ? <p className="text-slate-600">Načítám…</p> : null}
        {err ? <p className="text-rose-700">{err}</p> : null}
        {!loading && !err && posts.length === 0 ? <p className="text-slate-600">V této filtraci zatím nic není.</p> : null}

        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.feedCardId ?? `${post.id}-${String(post.images?.[0]?.id ?? "x")}`}
              post={post}
              currentUserId={currentUserId}
              isSuperUser={isPrivilegedViewer}
              forceInlineGuess
              hideViewerMetadata={!isPrivilegedViewer}
              showPostMenu={false}
              framelessImages
              imageTileClassName="mx-auto w-3/4"
              onAgeGuess={handleGuess}
              onHideImage={handleToggleHiddenImage}
              onPostChanged={async () => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
