"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import HelpIconButton from "@/components/HelpIconButton";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert, awPrompt } from "@/components/AwDialog";
import { PageSectionTitle } from "@/components/PageSectionTitle";
import { PostCard } from "@/components/PostCard";
import RefreshIconButton from "@/components/RefreshIconButton";
import {
  createAwChallenge,
  createAwChallengeTag,
  listMyAwChallenges,
  updateAwChallenge,
  type AwChallenge,
  type AwChallengePrivateGoalVisibility,
} from "@/lib/api/challenges";
import {
  createAlbum,
  deleteMyAlbum,
  getAlbumsWithPosts,
  removePostFromAlbum,
  updateAlbumDetails,
} from "@/lib/api/albums";
import { getMyStatsSafe, type CategoryFilter, type MyStats } from "@/lib/api/stats";
import { formatRelativeUiTimestamp } from "@/lib/utils/timeFormat";
import type { UiPost } from "@/types/ui";

type AlbumPostRel = {
  post_id: number;
  album_id: number;
  sort_order?: number | null;
  created_at?: string | null;
  posts?: AlbumPost | null;
};

type AlbumRow = {
  id: number;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  visibility?: "everyone" | "contacts" | "private" | null;
  post_albums?: AlbumPostRel[];
};

type AlbumImage = {
  id?: number | null;
  public_url_thumb?: string | null;
  public_url?: string | null;
  publicUrl?: string | null;
  taken_at?: string | null;
  photo_category?: string | null;
  include_in_global_aw?: boolean | null;
  comment?: string | null;
  real_age_years?: number | null;
  aw_age_image?: number | null;
  avg_guessed_age?: number | null;
  guesses_count?: number | null;
};

type AlbumPost = {
  id?: number | null;
  title?: string | null;
  text?: string | null;
  created_at?: string | null;
  images?: AlbumImage[] | null;
};

type ChallengeView = "challenges" | "changes" | "photos";
type HighlightMode = "all" | "younger" | "older" | "most_rated";
type ChallengeVisibility = "private" | "contacts" | "everyone";
type ChallengeScope = "auto_period" | "challenge_tag";

type ChallengePhotoRow = {
  key: string;
  imageId: number;
  thumbUrl: string | null;
  takenAt: string | null;
  photoCategory: string | null;
  includeInGlobalAw: boolean;
  comment: string | null;
  realAgeYears: number | null;
  awAgeImage: number | null;
  avgGuessedAge: number | null;
  guessesCount: number;
  postId: number;
  postCreatedAt: string | null;
  postTitle: string | null;
  albumId: number;
  albumTitle: string | null;
  albumVisibility: AlbumRow["visibility"];
};

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "Všechny kategorie" },
  { value: "bezna", label: "Bežná" },
  { value: "oblicej", label: "Oblicej" },
  { value: "cela_postava", label: "Celá postava" },
  { value: "postava_bez_obliceje", label: "Postava bez obliceje" },
  { value: "v_plavkach", label: "Plavky" },
  { value: "makeup_stylizace", label: "Make-up" },
  { value: "spolecenske_saty", label: "Spolecenské šaty" },
  { value: "sport", label: "Sport" },
];

function formatPhotoCategory(value: string | null | undefined) {
  if (!value) return "Bez kategorie";
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

const SIGNIFICANT_DELTA_YEARS = 5;
const CHALLENGE_TAG_PREFIX = "vyzva";

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDate(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("cs-CZ");
}

function yearDateRange(year: string) {
  if (!/^\d{4}$/.test(year)) return { from: "", to: "" };
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

function isCategoryFilter(value: string | null): value is CategoryFilter {
  return CATEGORY_OPTIONS.some((option) => option.value === value);
}

function compareIsoDesc(a: string | null | undefined, b: string | null | undefined) {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return tb - ta;
}

function ageDeltaText(delta: number | null) {
  if (delta == null || !Number.isFinite(delta)) return "Bez rozdílu";
  if (delta <= -SIGNIFICANT_DELTA_YEARS) return `Působíš výrazně mladší o ${Math.abs(delta).toFixed(1)} let`;
  if (delta >= SIGNIFICANT_DELTA_YEARS) return `Působíš výrazně starší o ${delta.toFixed(1)} let`;
  if (delta < 0) return `Působíš mladší o ${Math.abs(delta).toFixed(1)} let`;
  if (delta > 0) return `Působíš starší o ${delta.toFixed(1)} let`;
  return "Působíš přesně na svůj věk";
}

function formatAwScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (value === 100) return "0.0 %";
  if (value > 100) return `+${(value - 100).toFixed(1)} %`;
  return `-${(100 - value).toFixed(1)} %`;
}

function normalizeChallengeSlug(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "moje-vyzva";
}

function challengeVisibilityLabel(value: ChallengeVisibility) {
  if (value === "private") return "Soukromá";
  if (value === "contacts") return "Pro kontakty";
  return "Veřejná";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function challengeSharePath(challengeId: string) {
  return `/challenges/${challengeId}`;
}

function challengeShareUrl(challengeId: string) {
  if (typeof window === "undefined") return challengeSharePath(challengeId);
  return `${window.location.origin}${challengeSharePath(challengeId)}`;
}

function albumVisibilityLabel(visibility: AlbumRow["visibility"]) {
  if (visibility === "contacts") return "Viditelné pro kontakty";
  if (visibility === "private") return "Soukromé";
  return "Viditelné pro všechny";
}

function toChangePostCardPost(post: AlbumPost, userId: string): UiPost {
  const images = (post.images ?? []).reduce<UiPost["images"]>((out, image) => {
    const id = Number(image.id ?? 0);
    const url = String(image.public_url ?? image.public_url_thumb ?? image.publicUrl ?? "");
    if (!Number.isFinite(id) || id <= 0 || !url) return out;

    out.push({
      id,
      url,
      comment: image.comment ?? null,
      real_age_years: image.real_age_years ?? null,
      aw_age_image: image.aw_age_image ?? null,
      avg_guessed_age: image.avg_guessed_age ?? null,
      guesses_count: image.guesses_count ?? null,
    });

    return out;
  }, []);

  return {
    id: Number(post.id ?? 0),
    authorUserId: userId,
    author: "Ty",
    authorAvatarUrl: null,
    title: post.title ?? null,
    text: post.text ?? "",
    createdAt: post.created_at ?? null,
    images,
  };
}

function AlbumEditModal({
  open,
  album,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  album: AlbumRow | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    removedPostIds: number[];
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(album?.title ?? "");
  const [description, setDescription] = useState(album?.description ?? "");
  const [removedPostIds, setRemovedPostIds] = useState<number[]>([]);

  if (!open || !album) return null;

  const rels = Array.isArray(album.post_albums) ? album.post_albums : [];

  function togglePost(postId: number) {
    setRemovedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((x) => x !== postId) : [...prev, postId]
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Editovat změnu</h3>
            <p className="mt-1 text-sm text-slate-600">
              Uprav název, popis a případně odeber vybrané posty ze změny.
            </p>
          </div>

          <CloseButton onClick={onClose} disabled={busy} label="Zavřít editaci" />
        </div>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Název změny</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Např. Moje promena"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Popis změny</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={4}
              className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Krátký popis změny..."
            />
          </label>

          <div>
            <div className="text-sm font-semibold text-slate-800">Posty ve změně</div>
            <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
              {rels.length === 0 ? (
                <div className="text-sm text-slate-500">Změna zatím neobsahuje žádné posty.</div>
              ) : (
                rels.map((rel) => {
                  const post = rel.posts ?? {};
                  const postId = Number(rel.post_id);
                  const checked = removedPostIds.includes(postId);

                  return (
                    <label
                      key={postId}
                      className="flex items-start gap-3 rounded-xl bg-white px-3 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePost(postId)}
                        disabled={busy}
                        className="mt-1 h-4 w-4 accent-emerald-600"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">
                          {post.title?.trim() ? post.title : `Post #${postId}`}
                        </div>
                        {post.text ? (
                          <div className="mt-1 line-clamp-2 text-slate-600">{post.text}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-slate-500">
                          Odebrat tento post ze změny
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <AwButton variant="tertiary" onClick={onClose} disabled={busy}>
            Zrušit
          </AwButton>
          <AwButton
            variant="primary"
            onClick={() =>
              onSave({
                title,
                description,
                removedPostIds,
              })
            }
            disabled={busy}
          >
            {busy ? "Ukládám…" : "Uložit změny"}
          </AwButton>
        </div>
      </div>
    </div>
  );
}

export default function MyAlbumsPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [busyAlbumId, setBusyAlbumId] = useState<number | null>(null);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeCreateOpen, setChallengeCreateOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AwChallenge | null>(null);
  const [challengeEditBusy, setChallengeEditBusy] = useState(false);
  const [tagBusyChallengeId, setTagBusyChallengeId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [challenges, setChallenges] = useState<AwChallenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumRow | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [createChangeOpen, setCreateChangeOpen] = useState(false);
  const [createChangeBusy, setCreateChangeBusy] = useState(false);
  const [activeView, setActiveView] = useState<ChallengeView>("challenges");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [includeExperimental, setIncludeExperimental] = useState(false);
  const [takenFrom, setTakenFrom] = useState("");
  const [takenTo, setTakenTo] = useState("");
  const [publishedFrom, setPublishedFrom] = useState("");
  const [publishedTo, setPublishedTo] = useState("");
  const [highlightMode, setHighlightMode] = useState<HighlightMode>("all");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [challengeTitle, setChallengeTitle] = useState("Moje AW výzva");
  const [challengeTagDraft, setChallengeTagDraft] = useState("");
  const [challengeTargetScore, setChallengeTargetScore] = useState("-3");
  const [challengeTargetDate, setChallengeTargetDate] = useState("");
  const [challengeVisibility, setChallengeVisibility] = useState<ChallengeVisibility>("private");
  const [challengeScope, setChallengeScope] = useState<ChallengeScope>("auto_period");
  const [challengeIncludeExperimentalImages, setChallengeIncludeExperimentalImages] = useState(false);
  const [challengePrivateGoal, setChallengePrivateGoal] = useState("");
  const [challengePrivateGoalVisibility, setChallengePrivateGoalVisibility] =
    useState<AwChallengePrivateGoalVisibility>("private");
  const [challengePublicMessage, setChallengePublicMessage] = useState("");
  const [editChallengeTitle, setEditChallengeTitle] = useState("");
  const [editChallengeTargetDate, setEditChallengeTargetDate] = useState("");
  const [editChallengeVisibility, setEditChallengeVisibility] = useState<ChallengeVisibility>("private");
  const [editChallengeIncludeExperimentalImages, setEditChallengeIncludeExperimentalImages] = useState(false);
  const [editChallengePrivateGoal, setEditChallengePrivateGoal] = useState("");
  const [editChallengePrivateGoalVisibility, setEditChallengePrivateGoalVisibility] =
    useState<AwChallengePrivateGoalVisibility>("private");

  const loadAlbums = useCallback(async () => {
    if (!userId) {
      setAlbums([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await getAlbumsWithPosts(userId);
      setAlbums((rows ?? []) as AlbumRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nepodařilo se načíst změny.");
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const loadChallenges = useCallback(async () => {
    if (!userId) {
      setChallenges([]);
      setChallengesLoading(false);
      return;
    }

    setChallengesLoading(true);
    setChallengeError(null);

    try {
      const rows = await listMyAwChallenges();
      setChallenges(rows);
    } catch (e: unknown) {
      setChallengeError(e instanceof Error ? e.message : "Výzvy se nepodarilo nacíst.");
      setChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!userId) {
        setMyStats(null);
        setStatsError(null);
        return;
      }

      const result = await getMyStatsSafe();
      if (cancelled) return;

      setMyStats(result.data);
      setStatsError(result.errorMessage);
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const queryView = searchParams?.get("view");
    const queryYear = searchParams?.get("year");
    const queryCategory = searchParams?.get("category");
    const queryExperimental = searchParams?.get("experimental");

    if (queryView === "changes" || queryView === "albums") {
      setActiveView("changes");
    }

    if (queryView === "photos" || queryYear) {
      setActiveView("photos");
      setFiltersOpen(true);
    }

    if (isCategoryFilter(queryCategory)) {
      setCategory(queryCategory);
    }

    setIncludeExperimental(queryExperimental === "1");

    if (queryYear && /^\d{4}$/.test(queryYear)) {
      const range = yearDateRange(queryYear);
      setTakenFrom(range.from);
      setTakenTo(range.to);
      setSelectedYear(queryYear);
    }
  }, [searchParams]);

  async function handleDeleteAlbum(albumId: number) {
    const choice = await awPrompt({
      title: "Smazat změnu",
      message:
        "Vyber akci:\n\n" +
        "1 = Smazat pouze změnu (posty zůstanou)\n" +
        "2 = Smazat změnu vcetne všech postů",
      placeholder: "Zadej 1 nebo 2",
      confirmLabel: "Pokracovat",
    });

    if (choice !== "1" && choice !== "2") return;

    const deletePosts = choice === "2";

    setBusyAlbumId(albumId);

    try {
      await deleteMyAlbum(albumId, { deletePosts });
      await loadAlbums();
      await awAlert(deletePosts ? "Změna i posty smazány." : "Změna smazána.");
    } catch (e: unknown) {
      await awAlert(e instanceof Error ? e.message : "Změnu se nepodařilo smazat.");
    } finally {
      setBusyAlbumId(null);
    }
  }

  function handleOpenEditAlbum(album: AlbumRow) {
    setEditingAlbum(album);
    setEditOpen(true);
  }

  async function handleSaveAlbumEdit(payload: {
    title: string;
    description: string;
    removedPostIds: number[];
  }) {
    if (!editingAlbum) return;

    setEditBusy(true);
    try {
      await updateAlbumDetails({
        albumId: editingAlbum.id,
        title: payload.title,
        description: payload.description,
      });

      for (const postId of payload.removedPostIds) {
        await removePostFromAlbum({
          postId,
          albumId: editingAlbum.id,
        });
      }

      setEditOpen(false);
      setEditingAlbum(null);
      await loadAlbums();
      await awAlert("Změna upravena.");
    } catch (e: unknown) {
      await awAlert(e instanceof Error ? e.message : "Změnu se nepodařilo upravit.");
    } finally {
      setEditBusy(false);
    }
  }

  const challengePhotos = useMemo<ChallengePhotoRow[]>(() => {
    return albums.flatMap((album) => {
      const rels = Array.isArray(album.post_albums) ? album.post_albums : [];
      return rels.flatMap((rel) => {
        const post = rel.posts;
        const images = Array.isArray(post?.images) ? post.images : [];

        return images.map((image) => ({
          key: `${album.id}-${Number(rel.post_id)}-${Number(image.id ?? 0)}`,
          imageId: Number(image.id ?? 0),
          thumbUrl:
            String(image.public_url_thumb ?? image.public_url ?? image.publicUrl ?? "") || null,
          takenAt: typeof image.taken_at === "string" ? image.taken_at : null,
          photoCategory: typeof image.photo_category === "string" ? image.photo_category : null,
          includeInGlobalAw: Boolean(image.include_in_global_aw),
          comment: typeof image.comment === "string" ? image.comment : null,
          realAgeYears: safeNumber(image.real_age_years),
          awAgeImage: safeNumber(image.aw_age_image),
          avgGuessedAge: safeNumber(image.avg_guessed_age),
          guessesCount: Number(image.guesses_count ?? 0),
          postId: Number(rel.post_id),
          postCreatedAt: typeof post?.created_at === "string" ? post.created_at : null,
          postTitle: typeof post?.title === "string" ? post.title : null,
          albumId: album.id,
          albumTitle: album.title ?? null,
          albumVisibility: album.visibility ?? null,
        }));
      });
    });
  }, [albums]);
  const filteredChallengePhotos = useMemo(() => {
    let next = [...challengePhotos];

    if (!includeExperimental) {
      next = next.filter((photo) => photo.includeInGlobalAw);
    }

    if (category !== "all") {
      next = next.filter((photo) => photo.photoCategory === category);
    }

    if (takenFrom) {
      next = next.filter((photo) => (photo.takenAt ? photo.takenAt.slice(0, 10) >= takenFrom : false));
    }

    if (takenTo) {
      next = next.filter((photo) => (photo.takenAt ? photo.takenAt.slice(0, 10) <= takenTo : false));
    }

    if (publishedFrom) {
      next = next.filter((photo) => (photo.postCreatedAt ? photo.postCreatedAt.slice(0, 10) >= publishedFrom : false));
    }

    if (publishedTo) {
      next = next.filter((photo) => (photo.postCreatedAt ? photo.postCreatedAt.slice(0, 10) <= publishedTo : false));
    }

    if (highlightMode === "younger") {
      next = next.filter((photo) => {
        const delta = photo.awAgeImage !== null && photo.realAgeYears !== null ? photo.awAgeImage - photo.realAgeYears : null;
        return delta !== null && delta <= -SIGNIFICANT_DELTA_YEARS;
      });
    }

    if (highlightMode === "older") {
      next = next.filter((photo) => {
        const delta = photo.awAgeImage !== null && photo.realAgeYears !== null ? photo.awAgeImage - photo.realAgeYears : null;
        return delta !== null && delta >= SIGNIFICANT_DELTA_YEARS;
      });
    }

    if (highlightMode === "most_rated") {
      next = next.filter((photo) => photo.guessesCount > 0);
    }

    next.sort((a, b) => {
      if (highlightMode === "most_rated" && a.guessesCount !== b.guessesCount) {
        return b.guessesCount - a.guessesCount;
      }

      const deltaA = a.awAgeImage !== null && a.realAgeYears !== null ? Math.abs(a.awAgeImage - a.realAgeYears) : -1;
      const deltaB = b.awAgeImage !== null && b.realAgeYears !== null ? Math.abs(b.awAgeImage - b.realAgeYears) : -1;

      if ((highlightMode === "younger" || highlightMode === "older") && deltaA !== deltaB) {
        return deltaB - deltaA;
      }

      return compareIsoDesc(a.postCreatedAt, b.postCreatedAt);
    });

    return next;
  }, [category, challengePhotos, highlightMode, includeExperimental, publishedFrom, publishedTo, takenFrom, takenTo]);
  const hasActivePhotoFilters = useMemo(
    () =>
      category !== "all" ||
      includeExperimental ||
      !!takenFrom ||
      !!takenTo ||
      !!publishedFrom ||
      !!publishedTo ||
      highlightMode !== "all",
    [category, highlightMode, includeExperimental, publishedFrom, publishedTo, takenFrom, takenTo]
  );
  const currentAwScore = typeof myStats?.awScoreNormPct === "number" && Number.isFinite(myStats.awScoreNormPct) ? myStats.awScoreNormPct : null;
  const suggestedChallengeTag = `${CHALLENGE_TAG_PREFIX}-${normalizeChallengeSlug(challengeTitle)}`;
  const challengeTag = challengeTagDraft.trim() || suggestedChallengeTag;
  const challengeTargetScoreLabel = `${Number(challengeTargetScore) > 0 ? "+" : ""}${Number.isFinite(Number(challengeTargetScore)) ? Number(challengeTargetScore).toFixed(1) : challengeTargetScore} %`;

  function resetPhotoFilters() {
    setCategory("all");
    setIncludeExperimental(false);
    setTakenFrom("");
    setTakenTo("");
    setPublishedFrom("");
    setPublishedTo("");
    setHighlightMode("all");
    setSelectedYear(null);
  }

  async function handleCreateChange(payload: {
    title: string;
    description: string;
    visibility: NonNullable<AlbumRow["visibility"]>;
  }) {
    if (!userId) return;

    setCreateChangeBusy(true);
    try {
      await createAlbum({
        ownerUserId: userId,
        title: payload.title,
        description: payload.description,
        visibility: payload.visibility,
      });
      setCreateChangeOpen(false);
      await loadAlbums();
      await awAlert("Změna vytvořena.");
    } catch (e: unknown) {
      await awAlert(e instanceof Error ? e.message : "Změnu se nepodařilo vytvořit.");
    } finally {
      setCreateChangeBusy(false);
    }
  }

  async function handleCreateChallenge() {
    const targetDelta = Number(challengeTargetScore);
    if (!Number.isFinite(targetDelta)) {
      setChallengeError("Dopln cílové AW skóre jako císlo, napríklad -3.");
      return;
    }

    const today = todayIsoDate();
    if (!challengeTargetDate) {
      setChallengeError("Dopln termín výzvy.");
      return;
    }

    if (challengeTargetDate < today) {
      setChallengeError("Termín výzvy nemůže být v minulosti. Vyber dnešní nebo budoucí datum.");
      return;
    }

    setChallengeBusy(true);
    setChallengeError(null);

    try {
      await createAwChallenge({
        title: challengeTitle,
        publicMessage: challengePublicMessage,
        privateGoal: challengePrivateGoal,
        privateGoalVisibility: challengePrivateGoalVisibility,
        visibility: challengeVisibility,
        startDate: today,
        targetDate: challengeTargetDate,
        baselineAwScoreNormPct: currentAwScore,
        targetAwScoreNormPct: 100 + targetDelta,
        photoScope: challengeScope,
        challengeTag,
        includeExperimentalImages: challengeScope === "auto_period" ? challengeIncludeExperimentalImages : false,
      });

      await loadChallenges();
      setChallengeTitle("Moje AW výzva");
      setChallengeTagDraft("");
      setChallengeTargetScore("-3");
      setChallengeTargetDate("");
      setChallengeVisibility("private");
      setChallengeScope("auto_period");
      setChallengeIncludeExperimentalImages(false);
      setChallengePrivateGoal("");
      setChallengePrivateGoalVisibility("private");
      setChallengePublicMessage("");
      setChallengeCreateOpen(false);
      await awAlert("Výzva byla vytvořena.");
    } catch (e: unknown) {
      setChallengeError(e instanceof Error ? e.message : "Výzvu se nepodařilo vytvořit.");
    } finally {
      setChallengeBusy(false);
    }
  }

  function openEditChallenge(challenge: AwChallenge) {
    setEditingChallenge(challenge);
    setEditChallengeTitle(challenge.title);
    setEditChallengeTargetDate(challenge.target_date_current);
    setEditChallengeVisibility(challenge.visibility);
    setEditChallengeIncludeExperimentalImages(Boolean(challenge.include_experimental_images));
    setEditChallengePrivateGoal(challenge.private_goal ?? "");
    setEditChallengePrivateGoalVisibility(challenge.private_goal_visibility);
  }

  async function handleUpdateChallenge() {
    if (!editingChallenge) return;

    const today = todayIsoDate();
    if (!editChallengeTargetDate) {
      setChallengeError("Dopln termín výzvy.");
      return;
    }
    if (editChallengeTargetDate < today) {
      setChallengeError("Termín výzvy nemůže být v minulosti. Vyber dnešní nebo budoucí datum.");
      return;
    }
    if (editChallengeTargetDate < editingChallenge.target_date_current) {
      setChallengeError("Termín aktivní výzvy můžeš jen prodloužit, ne zkrátit.");
      return;
    }

    setChallengeEditBusy(true);
    setChallengeError(null);

    try {
      await updateAwChallenge({
        id: editingChallenge.id,
        title: editChallengeTitle,
        privateGoal: editChallengePrivateGoal,
        privateGoalVisibility: editChallengePrivateGoalVisibility,
        visibility: editChallengeVisibility,
        targetDateCurrent: editChallengeTargetDate,
        includeExperimentalImages:
          editingChallenge.photo_scope === "auto_period" ? editChallengeIncludeExperimentalImages : false,
      });
      setEditingChallenge(null);
      await loadChallenges();
      await awAlert("Výzva byla upravena.");
    } catch (e: unknown) {
      setChallengeError(e instanceof Error ? e.message : "Výzvu se nepodarilo upravit.");
    } finally {
      setChallengeEditBusy(false);
    }
  }

  async function handleCreateChallengeTag(challenge: AwChallenge) {
    const suggestedTag = `${CHALLENGE_TAG_PREFIX}-${normalizeChallengeSlug(challenge.title)}`;
    const tag = (await awPrompt({
      title: "Tag výzvy",
      message: "Zadej tag výzvy. Musí být jedinečný pro tvůj účet.",
      defaultValue: suggestedTag,
      confirmLabel: "Vytvořit tag",
    }))?.trim();
    if (!tag) return;

    setTagBusyChallengeId(challenge.id);
    setChallengeError(null);

    try {
      await createAwChallengeTag({
        challengeId: challenge.id,
        challengeTag: tag,
        switchToChallengeTagScope: challenge.photo_scope === "auto_period",
      });
      await loadChallenges();
      await awAlert(`Tag výzvy byl vytvořen: ${tag}`);
    } catch (e: unknown) {
      setChallengeError(e instanceof Error ? e.message : "Tag výzvy se nepodařilo vytvořit.");
    } finally {
      setTagBusyChallengeId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#e8fbe8] via-white to-white p-5 shadow-[0_12px_30px_rgba(50,205,50,0.10)]">
          <div className="text-lg font-bold text-slate-900">Výzvy a změny</div>
          <div className="mt-1 text-sm text-slate-500">Nacítám…</div>
        </div>
      </div>
    );
  }

  if (!userId) return <div>Prihlas se</div>;

  return (
    <>
      <AlbumEditModal
        key={editingAlbum ? `album-${editingAlbum.id}` : "album-none"}
        open={editOpen}
        album={editingAlbum}
        busy={editBusy}
        onClose={() => {
          if (editBusy) return;
          setEditOpen(false);
          setEditingAlbum(null);
        }}
        onSave={handleSaveAlbumEdit}
      />
      <ChangeCreateModal
        open={createChangeOpen}
        busy={createChangeBusy}
        onClose={() => {
          if (createChangeBusy) return;
          setCreateChangeOpen(false);
        }}
        onCreate={handleCreateChange}
      />
      <ChallengeEditModal
        challenge={editingChallenge}
        busy={challengeEditBusy}
        title={editChallengeTitle}
        onTitleChange={setEditChallengeTitle}
        targetDate={editChallengeTargetDate}
        onTargetDateChange={setEditChallengeTargetDate}
        visibility={editChallengeVisibility}
        onVisibilityChange={setEditChallengeVisibility}
        includeExperimentalImages={editChallengeIncludeExperimentalImages}
        onIncludeExperimentalImagesChange={setEditChallengeIncludeExperimentalImages}
        privateGoal={editChallengePrivateGoal}
        onPrivateGoalChange={setEditChallengePrivateGoal}
        privateGoalVisibility={editChallengePrivateGoalVisibility}
        onPrivateGoalVisibilityChange={setEditChallengePrivateGoalVisibility}
        onCreateTag={handleCreateChallengeTag}
        tagBusy={tagBusyChallengeId === editingChallenge?.id}
        onClose={() => {
          if (challengeEditBusy) return;
          setEditingChallenge(null);
        }}
        onSave={handleUpdateChallenge}
      />

      <div className="space-y-5">
        <div className="rounded-2xl bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <PageSectionTitle
                title="Výzvy a změny"
                iconPath="/ui/Menu-Moje-alba.ico"
                sizeClassName="text-[1.46rem]"
              />
            </div>

            <div className="flex items-start gap-2">
              <div className="flex items-center gap-1">
                <HelpIconButton
                  helpText="Výzvy sledují budoucí posun AW skóre. Změny jsou tvoje dosavadní kolekce postů a fotek.\n\nVýzvy jsou dočasné akce s cílem posunout AW skóre podle existujících pravidel AgeWinners.\n\nNa začátku výzvy se uloží aktuální AW skóre. Na konci se porovná s konečnou hodnotou. Výpočet AW skóre se tím nijak nemění.\n\nZměny jsou přejmenovaná alba: zpětné kolekce postů a fotek, které mohou popisovat proměnu uživatele v čase."
                  helpKey="changes-overview"
                  modalTitle="Nápověda - výzvy a změny"
                />
                {activeView === "photos" ? (
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((prev) => !prev)}
                    className="rounded-md p-2 hover:bg-slate-100"
                    aria-label="Filtry fotografií"
                    title="Filtry fotografií"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hasActivePhotoFilters ? "/icons/action/filter-full.png" : "/icons/action/filter-empty.png"} alt="" className="h-5 w-5" />
                  </button>
                ) : null}
                <RefreshIconButton
                  onClick={() => void loadAlbums()}
                  disabled={loading || busyAlbumId !== null || editBusy}
                  activeIconPath="/ui/refresh-rot.gif"
                  activeDurationMs={5000}
                />
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ViewTabButton active={activeView === "challenges"} onClick={() => setActiveView("challenges")}>
              Výzvy
            </ViewTabButton>
            <ViewTabButton active={activeView === "changes"} onClick={() => setActiveView("changes")}>
              Změny
            </ViewTabButton>
            <ViewTabButton active={activeView === "photos"} onClick={() => setActiveView("photos")}>
              Fotografie změn
            </ViewTabButton>
          </div>

          {activeView === "photos" && filtersOpen ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              {selectedYear ? (
                <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  Přednastaveno ze statistik: fotografie z roku <span className="font-semibold">{selectedYear}</span>.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Kategorie</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value as CategoryFilter)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900">
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Datum porízení od</span>
                  <input type="date" value={takenFrom} onChange={(e) => setTakenFrom(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900" />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Datum porízení do</span>
                  <input type="date" value={takenTo} onChange={(e) => setTakenTo(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900" />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Zvýraznit</span>
                  <select value={highlightMode} onChange={(e) => setHighlightMode(e.target.value as HighlightMode)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900">
                    <option value="all">Všechny fotky</option>
                    <option value="younger">Výrazne mladší</option>
                    <option value="older">Výrazne starší</option>
                    <option value="most_rated">Nejčastěji hodnocené</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Uveřejněno od</span>
                  <input type="date" value={publishedFrom} onChange={(e) => setPublishedFrom(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900" />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-700">Uveřejněno do</span>
                  <input type="date" value={publishedTo} onChange={(e) => setPublishedTo(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900" />
                </label>

                <label className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                  <input type="checkbox" checked={includeExperimental} onChange={(e) => setIncludeExperimental(e.target.checked)} />
                  <span className="text-sm font-semibold text-slate-800">Zahrnout experimentální</span>
                </label>

                <div className="flex items-end">
                  <button type="button" onClick={resetPhotoFilters} className="w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Vycistit filtry
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {activeView === "challenges" ? (
          <ChallengesSection
            challenges={challenges}
            loading={challengesLoading}
            error={challengeError}
            busy={challengeBusy}
            createOpen={challengeCreateOpen}
            onOpenCreate={() => setChallengeCreateOpen(true)}
            onCloseCreate={() => {
              if (challengeBusy) return;
              setChallengeCreateOpen(false);
            }}
            currentAwScore={currentAwScore}
            statsError={statsError}
            title={challengeTitle}
            onTitleChange={setChallengeTitle}
            targetScore={challengeTargetScore}
            onTargetScoreChange={setChallengeTargetScore}
            targetScoreLabel={challengeTargetScoreLabel}
            targetDate={challengeTargetDate}
            onTargetDateChange={setChallengeTargetDate}
            visibility={challengeVisibility}
            onVisibilityChange={setChallengeVisibility}
            scope={challengeScope}
            onScopeChange={setChallengeScope}
            includeExperimentalImages={challengeIncludeExperimentalImages}
            onIncludeExperimentalImagesChange={setChallengeIncludeExperimentalImages}
            suggestedChallengeTag={suggestedChallengeTag}
            challengeTagDraft={challengeTagDraft}
            onChallengeTagDraftChange={setChallengeTagDraft}
            privateGoal={challengePrivateGoal}
            onPrivateGoalChange={setChallengePrivateGoal}
            privateGoalVisibility={challengePrivateGoalVisibility}
            onPrivateGoalVisibilityChange={setChallengePrivateGoalVisibility}
            publicMessage={challengePublicMessage}
            onPublicMessageChange={setChallengePublicMessage}
            challengeTag={challengeTag}
            onCreate={handleCreateChallenge}
            onEdit={openEditChallenge}
            onCreateTag={handleCreateChallengeTag}
            tagBusyChallengeId={tagBusyChallengeId}
          />
        ) : activeView === "changes" ? (
          <>
            <div className="rounded-2xl bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900">Změny</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Kolekce postů a fotek, které zachycují tvoji proměnu v čase.
                  </div>
                </div>
                <AwButton variant="primary" onClick={() => setCreateChangeOpen(true)}>
                  Nová změna
                </AwButton>
              </div>
            </div>

            {albums.length === 0 ? (
              <div className="rounded-2xl bg-white p-5">
                <div className="text-base font-semibold text-slate-900">Zatím nemáš žádné změny</div>
                <div className="mt-2 text-sm text-slate-600">
                  Vytvoř první změnu a postůpně do ní přidávej posty, které spolu tvoří jeden příběh proměny.
                </div>
              </div>
            ) : null}

            {albums.map((album) => {
              const rels = Array.isArray(album.post_albums) ? album.post_albums : [];

              return (
                <section key={album.id} className="rounded-2xl bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h2 className="font-bold text-lg text-slate-900">
                        {album.title || `Změna #${album.id}`}
                      </h2>

                      {album.description ? (
                        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {album.description}
                        </div>
                      ) : null}

                      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
                        <div>Vytvořeno: {formatRelativeUiTimestamp(album.created_at ?? null)}</div>
                        <div>Aktualizováno: {formatRelativeUiTimestamp(album.updated_at ?? null)}</div>
                      </div>

                      <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {albumVisibilityLabel(album.visibility ?? null)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <AwButton onClick={() => handleOpenEditAlbum(album)} disabled={busyAlbumId === album.id}>
                        Editovat změnu
                      </AwButton>

                      <AwButton variant="tertiary" onClick={() => handleDeleteAlbum(album.id)} disabled={busyAlbumId === album.id}>
                        {busyAlbumId === album.id ? "Pracuji..." : "Smazat změnu"}
                      </AwButton>
                    </div>
                  </div>

                  <div className="mt-4 space-y-6">
                    {rels.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        Tato změna zatím neobsahuje žádné posty.
                      </div>
                    ) : (
                      rels.map((rel) => {
                        const post = rel.posts ?? {};

                        return (
                          <div key={rel.post_id} className="space-y-3">
                            <PostCard
                              post={toChangePostCardPost(post, userId)}
                              currentUserId={userId}
                              hideAlbumBadge
                              borderlessCard
                              ownerInfoMode="aw_score"
                              onPostChanged={loadAlbums}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Vybrané fotografie</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Fotky můžeš filtrovat podle období, kategorie, experimentálních snímků i podle toho, kde působíš výrazne mladší nebo starší.
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  Výsledku: <span className="text-slate-900">{filteredChallengePhotos.length}</span>
                </div>
              </div>
            </div>

            {filteredChallengePhotos.length === 0 ? (
              <div className="rounded-2xl bg-white p-6">
                <div className="text-base font-semibold text-slate-900">Žádné fotografie neodpovídají zadaným filtrum</div>
                <div className="mt-2 text-sm text-slate-600">
                  Zkus rozšířit období, změnit kategorii nebo vypnout některý z filtrů.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredChallengePhotos.map((photo) => {
                  const awReference = photo.awAgeImage ?? photo.avgGuessedAge;
                  const delta = awReference !== null && photo.realAgeYears !== null ? awReference - photo.realAgeYears : null;

                  return (
                    <article key={photo.key} className="overflow-hidden rounded-2xl bg-white">
                      <div className="aspect-[4/3] bg-slate-100">
                        {photo.thumbUrl ? (
                          <img src={photo.thumbUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">Bez náhledu</div>
                        )}
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {formatPhotoCategory(photo.photoCategory)}
                          </span>
                          {photo.includeInGlobalAw ? null : (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Experimentální
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {photo.postTitle?.trim() ? photo.postTitle : `Fotka #${photo.imageId}`}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Změna: {photo.albumTitle ?? `Změna #${photo.albumId}`}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <InfoCell label="Vek" value={photo.realAgeYears !== null ? `${photo.realAgeYears.toFixed(1)} let` : "-"} />
                          <InfoCell label="AW vek" value={awReference !== null ? `${awReference.toFixed(1)} let` : "-"} />
                          <InfoCell label="Hodnocení" value={String(photo.guessesCount)} />
                          <InfoCell label="Viditelnost změny" value={albumVisibilityLabel(photo.albumVisibility)} />
                        </div>

                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                          {ageDeltaText(delta)}
                        </div>

                        {photo.comment?.trim() ? (
                          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {photo.comment.trim()}
                          </div>
                        ) : null}

                        <div className="space-y-1 text-xs text-slate-500">
                          <div>Porízeno: {formatDate(photo.takenAt)}</div>
                          <div>Uveřejněno: {formatDate(photo.postCreatedAt)}</div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm font-semibold text-emerald-700">
                          <Link href={`/profile/photos/${photo.imageId}`} className="hover:underline">
                            Otevrít fotografii
                          </Link>
                          <Link href={`/profile/albums/${photo.albumId}`} className="hover:underline">
                            Otevřít změnu
                          </Link>
                          <Link href={`/profile/posts/${photo.postId}`} className="hover:underline">
                            Otevrít post
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ChangeCreateModal({
  open,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description: string;
    visibility: NonNullable<AlbumRow["visibility"]>;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<NonNullable<AlbumRow["visibility"]>>("everyone");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setVisibility("everyone");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Nová změna</h3>
            <p className="mt-1 text-sm text-slate-600">Vytvoř si kolekci postů a fotek, která popisuje tvoji proměnu v čase.</p>
          </div>
          <CloseButton onClick={onClose} disabled={busy} label="Zavřít vytvoření změny" />
        </div>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Název změny</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder="Např. Moje proměna" />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Popis změny</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} rows={4} className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder="Krátce popiš, co tato změna zachycuje." />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Viditelnost</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as NonNullable<AlbumRow["visibility"]>)} disabled={busy} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900">
              <option value="everyone">Viditelné pro všechny</option>
              <option value="contacts">Viditelné pro kontakty</option>
              <option value="private">Soukromé</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <AwButton variant="tertiary" onClick={onClose} disabled={busy}>Zrušit</AwButton>
          <AwButton variant="primary" onClick={() => onCreate({ title, description, visibility })} disabled={busy || !title.trim()}>
            {busy ? "Vytvářím..." : "Vytvořit změnu"}
          </AwButton>
        </div>
      </div>
    </div>
  );
}

function ChallengeEditModal({
  challenge,
  busy,
  title,
  onTitleChange,
  targetDate,
  onTargetDateChange,
  visibility,
  onVisibilityChange,
  includeExperimentalImages,
  onIncludeExperimentalImagesChange,
  privateGoal,
  onPrivateGoalChange,
  privateGoalVisibility,
  onPrivateGoalVisibilityChange,
  onCreateTag,
  tagBusy,
  onClose,
  onSave,
}: {
  challenge: AwChallenge | null;
  busy: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  targetDate: string;
  onTargetDateChange: (value: string) => void;
  visibility: ChallengeVisibility;
  onVisibilityChange: (value: ChallengeVisibility) => void;
  includeExperimentalImages: boolean;
  onIncludeExperimentalImagesChange: (value: boolean) => void;
  privateGoal: string;
  onPrivateGoalChange: (value: string) => void;
  privateGoalVisibility: AwChallengePrivateGoalVisibility;
  onPrivateGoalVisibilityChange: (value: AwChallengePrivateGoalVisibility) => void;
  onCreateTag: (challenge: AwChallenge) => Promise<void>;
  tagBusy: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Editovat výzvu</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Aktivní výzvu můžeš upravit jen v bezpečných polích. Startovní AW skóre, cíl a původní termín zůstávají zamčené.
            </p>
          </div>
          <CloseButton onClick={onClose} disabled={busy} label="Zavřít editaci" />
        </div>

        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCell label="Start" value={formatAwScore(challenge.baseline_aw_score_norm_pct)} />
            <InfoCell label="Cíl" value={formatAwScore(challenge.target_aw_score_norm_pct)} />
            <InfoCell label="Původní termín" value={formatDate(challenge.target_date_original)} />
          </div>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Název výzvy</span>
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              disabled={busy}
              className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Aktuální termín</span>
              <input
                type="date"
                value={targetDate}
                min={challenge.target_date_current}
                onChange={(event) => onTargetDateChange(event.target.value)}
                disabled={busy}
                className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
              />
              <span className="text-xs text-slate-500">Termín lze jen prodloužit.</span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Viditelnost výzvy</span>
              <select
                value={visibility}
                onChange={(event) => onVisibilityChange(event.target.value as ChallengeVisibility)}
                disabled={busy}
                className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
              >
                <option value="private">Soukromá</option>
                <option value="contacts">Pro kontakty</option>
                <option value="everyone">Veřejná</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Soukromý cíl</span>
            <textarea
              value={privateGoal}
              onChange={(event) => onPrivateGoalChange(event.target.value)}
              disabled={busy}
              rows={4}
              className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
            />
          </label>

          {challenge.photo_scope === "auto_period" ? (
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeExperimentalImages}
                onChange={(event) => onIncludeExperimentalImagesChange(event.target.checked)}
                disabled={busy}
                className="mt-1 h-4 w-4 accent-emerald-600"
              />
              <span>
                <span className="font-semibold text-slate-900">Pocítat i experimentální fotky</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Platí jen pro výzvy bez tagu. Jakmile se fotka do výzvy jednou zahrne, zůstane v ní i tehdy,
                  když ji později označíš jako experimentální.
                </span>
              </span>
            </label>
          ) : null}

          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-800">Viditelnost soukromého cíle</span>
            <select
              value={privateGoalVisibility}
              onChange={(event) => onPrivateGoalVisibilityChange(event.target.value as AwChallengePrivateGoalVisibility)}
              disabled={busy}
              className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
            >
              <option value="private">Zatím soukromý</option>
              <option value="everyone">Zveřejnit</option>
            </select>
          </label>

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="mb-3 rounded-xl bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Odkaz na výzvu</div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link href={challengeSharePath(challenge.id)} className="break-all text-sm font-semibold text-emerald-800 hover:underline">
                  {challengeSharePath(challenge.id)}
                </Link>
                <AwButton size="sm" onClick={() => void navigator.clipboard?.writeText(challengeShareUrl(challenge.id))} className="w-fit text-xs">
                  Kopírovat odkaz
                </AwButton>
              </div>
            </div>
            <div>
              Rozsah fotek:{" "}
              <span className="font-semibold">
                {challenge.photo_scope === "challenge_tag" ? "jen fotky/posty s tagem výzvy" : "všechny nové fotky v období výzvy"}
              </span>
            </div>
            <div className="mt-1">
              Tag: <span className="font-semibold">{challenge.challenge_tag ?? "zatím nevytvořen"}</span>
            </div>
            {!challenge.challenge_tag ? (
              <div className="mt-3">
                <AwButton onClick={() => void onCreateTag(challenge)} disabled={busy || tagBusy}>
                  {tagBusy
                    ? "Vytvářím tag..."
                    : challenge.photo_scope === "auto_period"
                      ? "Změnit rozsah na vybrané fotky a vytvořit tag"
                      : "Vytvořit tag výzvy"}
                </AwButton>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Jakmile tag vytvoříš, bude se nabízet při přidávání fotek a postů. Pro výzvu s rozsahem přes tag určuje, které fotky k výzvě patří.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <AwButton variant="tertiary" onClick={onClose} disabled={busy}>
            Zrušit
          </AwButton>
          <AwButton variant="primary" onClick={() => void onSave()} disabled={busy}>
            {busy ? "Ukládám..." : "Uložit"}
          </AwButton>
        </div>
      </div>
    </div>
  );
}

function ChallengesSection({
  challenges,
  loading,
  error,
  busy,
  createOpen,
  onOpenCreate,
  onCloseCreate,
  currentAwScore,
  statsError,
  title,
  onTitleChange,
  targetScore,
  onTargetScoreChange,
  targetScoreLabel,
  targetDate,
  onTargetDateChange,
  visibility,
  onVisibilityChange,
  scope,
  onScopeChange,
  includeExperimentalImages,
  onIncludeExperimentalImagesChange,
  suggestedChallengeTag,
  challengeTagDraft,
  onChallengeTagDraftChange,
  privateGoal,
  onPrivateGoalChange,
  privateGoalVisibility,
  onPrivateGoalVisibilityChange,
  publicMessage,
  onPublicMessageChange,
  challengeTag,
  onCreate,
  onEdit,
  onCreateTag,
  tagBusyChallengeId,
}: {
  challenges: AwChallenge[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  createOpen: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  currentAwScore: number | null;
  statsError: string | null;
  title: string;
  onTitleChange: (value: string) => void;
  targetScore: string;
  onTargetScoreChange: (value: string) => void;
  targetScoreLabel: string;
  targetDate: string;
  onTargetDateChange: (value: string) => void;
  visibility: ChallengeVisibility;
  onVisibilityChange: (value: ChallengeVisibility) => void;
  scope: ChallengeScope;
  onScopeChange: (value: ChallengeScope) => void;
  includeExperimentalImages: boolean;
  onIncludeExperimentalImagesChange: (value: boolean) => void;
  suggestedChallengeTag: string;
  challengeTagDraft: string;
  onChallengeTagDraftChange: (value: string) => void;
  privateGoal: string;
  onPrivateGoalChange: (value: string) => void;
  privateGoalVisibility: AwChallengePrivateGoalVisibility;
  onPrivateGoalVisibilityChange: (value: AwChallengePrivateGoalVisibility) => void;
  publicMessage: string;
  onPublicMessageChange: (value: string) => void;
  challengeTag: string;
  onCreate: () => Promise<void>;
  onEdit: (challenge: AwChallenge) => void;
  onCreateTag: (challenge: AwChallenge) => Promise<void>;
  tagBusyChallengeId: string | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-bold text-slate-900">AW výzvy</div>
            <div className="mt-1 text-sm text-slate-600">Vytvoř si měřitelný cíl pro posun AW skóre.</div>
          </div>
          <AwButton variant="primary" onClick={onOpenCreate}>
            Nová výzva
          </AwButton>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onCloseCreate}>
          <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
      <div className="rounded-2xl bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">Nová AW výzva</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Výzva uloží počáteční AW skóre podle aktuálních pravidel AgeWinners a na konci ho porovná s konečnou hodnotou.
            </p>
          </div>
          <HelpIconButton
            helpText="AW skóre má vlastní oficiální výpočet a výzvy ho nemění.\n\nPři vytvoření výzvy se uloží aktuální AW skóre jako startovní hodnota. Na konci výzvy se porovná s konečným AW skóre.\n\nPo spuštění nepůjde zpětně změnit startovní hodnota, cíl, původní termín ani rozsah fotek. Soukromý cíl můžeš později zveřejnit."
            helpKey="challenge-create"
            modalTitle="Nápoveda - AW výzvy"
          />
          <CloseButton onClick={onCloseCreate} disabled={busy} label="Zavřít formulář" />
        </div>

        {statsError ? (
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Aktuální AW skóre se nepodarilo nacíst: {statsError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Název výzvy</span>
              <input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Např. Muj rocní restart"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <InfoCell label="Startovní AW skóre" value={formatAwScore(currentAwScore)} />
              <label className="grid gap-1 rounded-xl bg-slate-50 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cílové AW skóre</span>
                <input
                  value={targetScore}
                  onChange={(event) => onTargetScoreChange(event.target.value)}
                  className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="-3"
                />
              </label>
              <label className="grid gap-1 rounded-xl bg-slate-50 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Termín</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(event) => onTargetDateChange(event.target.value)}
                  className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-800">Viditelnost výzvy</span>
                <select
                  value={visibility}
                  onChange={(event) => onVisibilityChange(event.target.value as ChallengeVisibility)}
                  className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="private">Soukromá</option>
                  <option value="contacts">Pro kontakty</option>
                  <option value="everyone">Veřejná</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-800">Rozsah fotek</span>
                <select
                  value={scope}
                  onChange={(event) => onScopeChange(event.target.value as ChallengeScope)}
                  className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="auto_period">Všechny nové fotky v období výzvy</option>
                  <option value="challenge_tag">Jen fotky/posty s tagem výzvy</option>
                </select>
                {scope === "challenge_tag" ? (
                  <span className="text-xs text-slate-500">
                    Tag se bude nabízet při přidávání fotek a postů. Musí být jedinečný v rámci tvého účtu.
                  </span>
                ) : null}
              </label>
            </div>

            {scope === "challenge_tag" ? (
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-800">Tag výzvy</span>
                <div className="flex gap-2">
                  <input
                    value={challengeTagDraft}
                    onChange={(event) => onChallengeTagDraftChange(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder={suggestedChallengeTag}
                  />
                  <AwButton size="sm" onClick={() => onChallengeTagDraftChange(suggestedChallengeTag)} className="text-xs">
                    Použít návrh
                  </AwButton>
                </div>
                <span className="text-xs text-slate-500">
                  Výsledný tag: <span className="font-semibold">#{challengeTag}</span>
                </span>
              </label>
            ) : null}

            {scope === "auto_period" ? (
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeExperimentalImages}
                  onChange={(event) => onIncludeExperimentalImagesChange(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-emerald-600"
                />
                <span>
                  <span className="font-semibold text-slate-900">Pocítat i experimentální fotky</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Platí jen pro výzvy bez tagu. Fotky se berou podle data porízení v období výzvy.
                  </span>
                </span>
              </label>
            ) : null}

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Soukromý cíl</span>
              <textarea
                value={privateGoal}
                onChange={(event) => onPrivateGoalChange(event.target.value)}
                rows={3}
                className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Jen pro tebe. Např. co chceš změnit v režimu, stylu, pohybu nebo péči o sebe."
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Viditelnost soukromého cíle</span>
              <select
                value={privateGoalVisibility}
                onChange={(event) => onPrivateGoalVisibilityChange(event.target.value as AwChallengePrivateGoalVisibility)}
                className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="private">Zatím soukromý</option>
                <option value="everyone">Zveřejnit už teď</option>
              </select>
              <span className="text-xs text-slate-500">Soukromý cíl můžeš v průběhu výzvy nebo po ní změnit na veřejný.</span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-800">Text pro veřejný post</span>
              <textarea
                value={publicMessage}
                onChange={(event) => onPublicMessageChange(event.target.value)}
                rows={3}
                className="rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Jdu do AW výzvy. Chci posunout svoje AW skóre a sledovat změnu v čase."
              />
            </label>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="text-sm font-bold text-emerald-950">Náhled výzvy</div>
            <div className="mt-3 rounded-2xl bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">AW výzva</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{title || "Moje AW výzva"}</div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Start</span>
                  <span className="font-bold text-slate-900">{formatAwScore(currentAwScore)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Cíl</span>
                  <span className="font-bold text-slate-900">{targetScoreLabel}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Termín</span>
                  <span className="font-bold text-slate-900">{targetDate ? formatDate(targetDate) : "Dopln datum"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Viditelnost</span>
                  <span className="font-bold text-slate-900">{challengeVisibilityLabel(visibility)}</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                {publicMessage.trim() || "Jdu do AW výzvy. Chci posunout svoje AW skóre a sledovat změnu v čase."}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-emerald-950">
              {scope === "challenge_tag"
                ? `Pripraví se tag: ${challengeTag}`
                : includeExperimentalImages
                  ? "Výzva se bude vztahovat na fotky s datem porízení v období výzvy, vcetne experimentálních."
                  : "Výzva se bude vztahovat na fotky s datem porízení v období výzvy, bez experimentálních."}
            </div>

            <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs leading-5 text-emerald-950">
              Odkaz pro sdílení vznikne po vytvoření výzvy.
            </div>

            <AwButton variant="primary" onClick={() => void onCreate()} disabled={busy} className="mt-4 w-full">
              {busy ? "Ukládám..." : "Vytvořit výzvu"}
            </AwButton>
          </div>
        </div>
      </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

      <div className="rounded-2xl bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900">Moje výzvy</div>
            <div className="mt-1 text-sm text-slate-600">Aktivní a historické AW výzvy.</div>
          </div>
          <HelpIconButton
            helpText="Seznam zobrazuje uložené výzvy. Startovní a cílové AW skóre jsou uložené hodnoty pro porovnání průběhu.\n\nU aktivní výzvy můžeš upravit bezpečná pole, prodloužit termín, vytvořit tag a sdílet odkaz. Fotky se do výzvy párují podle zvoleného rozsahu: buď automaticky podle období, nebo přes tag výzvy."
            helpKey="challenge-list"
            modalTitle="Nápověda - moje výzvy"
          />
        </div>

        {loading ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nacítám výzvy...</div> : null}

        {!loading && challenges.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Zatím nemáš žádnou výzvu.</div>
        ) : null}

        {!loading && challenges.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="rounded-2xl bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{challenge.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(challenge.start_date)} - {formatDate(challenge.target_date_current)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-xl bg-white px-3 py-1 text-xs font-bold text-emerald-800">
                      {challengeVisibilityLabel(challenge.visibility)}
                    </div>
                    {challenge.status === "active" ? (
                      <AwButton size="sm" onClick={() => onEdit(challenge)} className="text-xs">
                        Editovat
                      </AwButton>
                    ) : null}
                    {!challenge.challenge_tag ? (
                      <AwButton size="sm" onClick={() => void onCreateTag(challenge)} disabled={tagBusyChallengeId === challenge.id} className="text-xs">
                        {tagBusyChallengeId === challenge.id ? "Vytvářím tag..." : "Vytvořit tag"}
                      </AwButton>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <InfoCell label="Start" value={formatAwScore(challenge.baseline_aw_score_norm_pct)} />
                  <InfoCell label="Cíl" value={formatAwScore(challenge.target_aw_score_norm_pct)} />
                  <InfoCell label="Stav" value={challenge.status} />
                  <InfoCell label="Fotky" value={challenge.photo_scope === "challenge_tag" ? challenge.challenge_tag ?? "Tag" : "Období výzvy"} />
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">Odkaz:</span>{" "}
                    <Link href={challengeSharePath(challenge.id)} className="break-all text-emerald-800 hover:underline">
                      {challengeSharePath(challenge.id)}
                    </Link>
                  </div>
                  <AwButton size="sm" onClick={() => void navigator.clipboard?.writeText(challengeShareUrl(challenge.id))} className="w-fit text-xs">
                    Kopírovat
                  </AwButton>
                </div>

                {challenge.photo_scope === "auto_period" ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Experimentální fotky: {challenge.include_experimental_images ? "zapocítávají se" : "nezapocítávají se"}
                  </div>
                ) : null}

                {challenge.public_message ? (
                  <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">{challenge.public_message}</div>
                ) : null}

                {challenge.private_goal && challenge.private_goal_visibility === "everyone" ? (
                  <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                    Soukromý cíl zveřejněn: {challenge.private_goal}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChallengeInfoCard
          title="Nemenné po spuštění"
          text="Startovní AW skóre, cíl, původní termín a rozsah fotek se po aktivaci výzvy zamknou."
        />
        <ChallengeInfoCard
          title="Prodloužení je fér"
          text="Když termín nestihneš, výzvu půjde prodloužit. Původní nesplněný termín ale zůstane v historii."
        />
        <ChallengeInfoCard
          title="Soukromý cíl zustává soukromý"
          text="Veřejně se komunikuje AW skóre. Osobní formulace cíle zůstane jen pro tebe."
        />
      </div>
    </div>
  );
}

function ChallengeInfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-5">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function ViewTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-[#32CD32] text-white" : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}





