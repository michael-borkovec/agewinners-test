/**
 * File: app/page.tsx
 *
 * Purpose:
 * - Feed page
 * - Sticky header with modal filter + refresh icon
 * - Show individual photos in batches of eight
 * - Load the next batch automatically after eight successful guesses
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import type { UiPost } from "@/types/ui";
import { createAgeGuess } from "@/lib/api/ageGuesses";
import { getFeedPosts, hideFeedImage, PHOTO_TAG_LABELS, type PredefinedPhotoTag, unhideFeedImage } from "@/lib/api/posts";
import { SectionHeaderFilter, type FilterOption } from "@/components/SectionHeaderFilter";
import { useAuth } from "@/components/auth/AuthContext";

const ALL_TAGS = Object.keys(PHOTO_TAG_LABELS) as PredefinedPhotoTag[];
const FEED_HIDDEN_MODE_OPTIONS: FilterOption[] = [
  { key: "exclude", label: "Nezobrazovat skryté fotky" },
  { key: "include", label: "Zobrazit vše (i skryté fotky)" },
  { key: "only", label: "Zobrazit pouze skryté fotky" },
];
const FEED_BATCH_SIZE = 8;

export default function FeedPage() {
  const { userId: currentUserId, isLoggedIn, isPrivilegedViewer } = useAuth();
  const authLoading = !isLoggedIn && !currentUserId;
  const [filterTags, setFilterTags] = useState<PredefinedPhotoTag[]>([]);
  const [hiddenMode, setHiddenMode] = useState<"exclude" | "include" | "only">("exclude");
  const filterOptions = useMemo(() => ALL_TAGS.map((tag) => ({ key: tag, label: PHOTO_TAG_LABELS[tag] })), []);

  const [posts, setPosts] = useState<UiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [guessedInCurrentBatch, setGuessedInCurrentBatch] = useState(0);

  const refreshScheduledRef = useRef(false);
  const guessedImageIdsInBatchRef = useRef<Set<number>>(new Set());
  const superUserGuessedByPostRef = useRef<Record<number, number[]>>({});
  const scrollToTopAfterLoadRef = useRef(false);
  const currentFeedImageIdsRef = useRef<Set<number>>(new Set());
  const postsRef = useRef<UiPost[]>([]);

  const clearAllFeedTimers = useCallback(() => {
    refreshScheduledRef.current = false;
  }, []);

  const loadFeed = useCallback(async (options?: { excludeCurrentImages?: boolean }) => {
    if (!currentUserId || authLoading) return;

    setLoading(true);
    setErr(null);
    const excludedImageIds = options?.excludeCurrentImages ? Array.from(currentFeedImageIdsRef.current) : [];

    try {
      const fetchBatch = async (excludeImageIds: number[]) => {
        const requestedLimit = Math.min(50, FEED_BATCH_SIZE + excludeImageIds.length);
        return getFeedPosts({
          currentUserId,
          isPrivilegedViewer,
          categories: filterTags.length === 0 ? [] : filterTags,
          limit: requestedLimit,
          offset: 0,
          excludeFullyGuessed: true,
          hiddenMode,
          excludeImageIds,
        });
      };

      let nextPosts = ((await fetchBatch(excludedImageIds)) as UiPost[]).slice(0, FEED_BATCH_SIZE);
      if (nextPosts.length === 0 && excludedImageIds.length > 0) {
        nextPosts = ((await fetchBatch([])) as UiPost[]).slice(0, FEED_BATCH_SIZE);
      }
      guessedImageIdsInBatchRef.current = new Set();
      currentFeedImageIdsRef.current = new Set(
        nextPosts.map((post) => Number(post.images?.[0]?.id ?? 0)).filter((imageId) => imageId > 0)
      );
      postsRef.current = nextPosts;
      setGuessedInCurrentBatch(0);
      superUserGuessedByPostRef.current = {};
      setPosts(nextPosts);

      if (scrollToTopAfterLoadRef.current && typeof window !== "undefined") {
        scrollToTopAfterLoadRef.current = false;
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Feed se nepodařilo načíst.");
    } finally {
      refreshScheduledRef.current = false;
      setLoading(false);
    }
  }, [authLoading, currentUserId, filterTags, hiddenMode, isPrivilegedViewer]);

  const handleManualRefresh = useCallback(async () => {
    scrollToTopAfterLoadRef.current = true;
    await loadFeed({ excludeCurrentImages: true });
  }, [loadFeed]);

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

  function scheduleNextFeedBatch() {
    if (refreshScheduledRef.current) return;
    refreshScheduledRef.current = true;
    superUserGuessedByPostRef.current = {};
    void loadFeed({ excludeCurrentImages: true });
  }

  async function handleGuess(imageId: number, age: number) {
    const result = await createAgeGuess({ imageId, guessedAge: age });
    if (!result?.ok) return result;
    window.dispatchEvent(new Event("aw-hot-message-refresh"));
    const confirmedAge = Number(result.guessedAge ?? age);

    const target = postsRef.current.find((post) => Number(post.images?.[0]?.id) === imageId) ?? null;
    setPosts((prev) => {
      const nextPosts = prev.map((post) =>
        (post.images ?? []).some((image) => Number(image.id) === imageId)
          ? {
              ...post,
              images: (post.images ?? []).map((image) =>
                Number(image.id) === imageId ? { ...image, viewerGuessedAge: confirmedAge } : image
              ),
            }
          : post
      );
      postsRef.current = nextPosts;
      return nextPosts;
    });

    const guessedImageIds = guessedImageIdsInBatchRef.current;
    if (!guessedImageIds.has(imageId)) {
      guessedImageIds.add(imageId);
      setGuessedInCurrentBatch(Math.min(guessedImageIds.size, FEED_BATCH_SIZE));
    }

    if (isPrivilegedViewer && target) {
      const sourcePostId = Number(target.sourcePostId ?? target.id ?? 0);
      const existingGuessed = new Set<number>(
        postsRef.current
          .filter((post) => Number(post.sourcePostId ?? post.id) === sourcePostId)
          .map((post) => (post.images?.[0]?.viewerGuessedAge != null ? Number(post.images?.[0]?.id ?? 0) : 0))
          .filter((id) => id > 0)
      );
      const localGuessed = new Set<number>(superUserGuessedByPostRef.current[sourcePostId] ?? []);

      existingGuessed.forEach((id) => localGuessed.add(id));
      localGuessed.add(imageId);
      superUserGuessedByPostRef.current[sourcePostId] = Array.from(localGuessed);

    }

    if (guessedImageIds.size >= FEED_BATCH_SIZE) {
      scheduleNextFeedBatch();
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
    setPosts((prev) => {
      const nextPosts = prev.filter((post) => Number(post.images?.[0]?.id) !== imageId);
      currentFeedImageIdsRef.current = new Set(
        nextPosts.map((post) => Number(post.images?.[0]?.id ?? 0)).filter((nextImageId) => nextImageId > 0)
      );
      postsRef.current = nextPosts;
      return nextPosts;
    });
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
        helpText={"Feed načítá sadu 8 fotek ostatních uživatelů. Počet v hlavičce průběžně ukazuje, kolik fotek z aktuální osmičky už máš odtipováno; hotové fotografie mají jemně zelené pozadí.\n\nPo úspěšném odtipování všech 8 fotek se automaticky načte nová sada dalších 8 fotek. Novou sadu můžeš kdykoliv načíst také ručně ikonou refresh; filtr přitom zůstane zachovaný.\n\nTvoje vlastní ani běžně už tipované fotky se ve feedu nezobrazují. Každý tip pomáhá zpřesňovat AW výsledek ostatních a dává prostor i novým nebo méně tipovaným fotkám."}
        helpKey="feed"
        helpModalTitle="Nápověda - Feed"
        helpModalOverlayClassName="z-[140]"
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
        statusText={`${guessedInCurrentBatch} z ${FEED_BATCH_SIZE} odtipováno`}
        headerTooltip="Po odtipování všech 8 fotek se automaticky načte nová sada. Novou sadu můžeš načíst i ručním refreshem."
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
              hideTimestamps
              showPostMenu={false}
              framelessImages
              highlightGuessed={post.images?.some((image) => image.viewerGuessedAge != null)}
              hideChallengeTags
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
