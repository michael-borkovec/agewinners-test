/**
 * File: app/my-tips/page.tsx
 *
 * Purpose:
 * - "Moje tipy"
 *
 * Layout rule (2026-03):
 * - If all photos are landscape -> L+L, odd last L => full width
 * - If all photos are portrait -> P+P, odd last P => full width
 * - If mixed L + P:
 *   - split into 2 groups (all L, all P)
 *   - group order is determined by the first photo orientation
 *   - inside each group preserve original order
 *   - pair within each group
 *   - if both groups are odd, place the last leftover L + leftover P together in one row
 *   - if only one group is odd, its leftover item is rendered full width
 */

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { loadMyTipPosts, type MyTipPostGroup, type MyTipPhotoRow } from "@/lib/api/myTips";
import { useAuth } from "@/components/auth/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { hideFeedImage, PHOTO_CATEGORY_LABELS, type PhotoCategory, unhideFeedImage } from "@/lib/api/posts";
import { SectionHeaderFilter } from "@/components/SectionHeaderFilter";
import SoftEmptyState from "@/components/SoftEmptyState";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert } from "@/components/AwDialog";
import { createImageComment, createStoryComment, getImageComments, getStoryComments, type CommentRow } from "@/lib/api/comments";
import { DEFAULT_POST_REVEAL_DELAY_DAYS, getPostRevealDelayDays } from "@/lib/api/appSettings";
import EmojiTextarea from "@/components/EmojiTextarea";
import ImageGalleryModal, { type GalleryImage } from "@/components/ImageGalleryModal";
import ReportImageModal from "@/components/ReportImageModal";
import {
  getImageReactionDetails,
  getImageReactionSummary,
  type ImageReactionDetail,
  getMyImageReactions,
  toggleImageReaction,
  type ImageReactionKey,
  type ImageReactionSummary,
} from "@/lib/api/imageReactions";
import { toggleStoryReaction } from "@/lib/api/postStories";
import { buildCommentTree, type CommentNode } from "@/lib/commentsTree";
import { formatAbsoluteUiTimestamp, formatRelativeUiTimestamp } from "@/lib/utils/timeFormat";

function formatCommentDateCZ(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("cs-CZ");
}

function formatTipTimestampLabel(value: string | null | undefined) {
  if (!value) return "Datum tipu: —";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `Datum tipu: ${value}`;

  const diffMs = Date.now() - date.getTime();
  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
    return `Tipovals před: ${formatRelativeUiTimestamp(value)}`;
  }

  return `Datum tipu: ${formatAbsoluteUiTimestamp(value)}`;
}

function describeError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  const message = String((error as { message?: unknown } | null)?.message ?? "").trim();
  if (message) return message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Neznámá chyba";
  }
}

function msFromDays(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

function formatCzCount(value: number, forms: [string, string, string]) {
  const abs = Math.abs(Math.trunc(value));
  if (abs === 1) return `${value} ${forms[0]}`;
  if (abs >= 2 && abs <= 4) return `${value} ${forms[1]}`;
  return `${value} ${forms[2]}`;
}

function formatRevealRemaining(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "méne jak minutu";

  const totalMinutes = Math.ceil(ms / (60 * 1000));
  if (totalMinutes < 1) return "méne jak minutu";
  if (totalMinutes < 60) return formatCzCount(totalMinutes, ["minutu", "minuty", "minut"]);

  const totalHours = Math.ceil(ms / (60 * 60 * 1000));
  if (totalHours < 24) return formatCzCount(totalHours, ["hodinu", "hodiny", "hodin"]);

  const totalDays = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return formatCzCount(totalDays, ["den", "dny", "dní"]);
}

function formatPhotoCount(count: number) {
  return formatCzCount(count, ["fotka", "fotky", "fotek"]);
}

function formatCommentCount(count: number) {
  return formatCzCount(count, ["komentář", "komentáře", "komentářů"]);
}

function formatCzAfterDays(days: number) {
  const value = Math.max(1, Math.trunc(days));
  if (value === 1) return "1 dni";
  return `${value} dnech`;
}

function shouldUseRelativePrefix(text: string) {
  return /\b\d+\s*(min|h)\b/.test(text);
}

function safeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt1(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

function fmtInt(n: number | null, fallback = "—") {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return String(Math.trunc(n));
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const hasAvatar = !!avatarUrl && String(avatarUrl).trim().length > 0;
  const initial = (name || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
      {hasAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(avatarUrl)} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-sm font-bold text-slate-700">{initial}</span>
      )}
    </div>
  );
}

type TipStatus = "anonymni" | "bez_komentaru" | "odhalene";

type TipVisibilityFilter =
  | "vsechny"
  | "s_viditelnymi_komentari"
  | "identita_uzivatele"
  | "docasne_anonymni";

type LayoutRow<T> =
  | { type: "single"; item: T; fullWidth: boolean }
  | { type: "pair"; left: T; right: T | null };

type ZoomState =
  | { open: false; photo: null; revealed: false; remainingMs: 0 }
  | { open: true; photo: MyTipPhotoRow; photos: MyTipPhotoRow[]; revealed: boolean; remainingMs: number };

type TipGalleryImage = GalleryImage & {
  photo: MyTipPhotoRow;
};

type ReactionModalState =
  | { open: false; imageId: null }
  | { open: true; imageId: number };

type ReactionOption = {
  key: ImageReactionKey;
  label: string;
  emoji: string;
  bgClass: string;
};

const REACTION_OPTIONS: ReactionOption[] = [
  { key: "like", label: "Like", emoji: "ðŸ‘", bgClass: "bg-sky-100" },
  { key: "clap", label: "Tleskám", emoji: "👏", bgClass: "bg-emerald-100" },
  { key: "care", label: "Podpora", emoji: "ðŸ¤—", bgClass: "bg-violet-100" },
  { key: "love", label: "Láska", emoji: "❤️", bgClass: "bg-rose-100" },
  { key: "insight", label: "Zajímavé", emoji: "💡", bgClass: "bg-amber-100" },
  { key: "fun", label: "Úsměv", emoji: "😊", bgClass: "bg-cyan-100" },
];

type PostRevealMeta = {
  latestGuessAtMs: number;
  groupRevealed: boolean;
  identityRevealed: boolean;
  remainingMs: number;
};

function getPhotoCategoryText(photoCategory: string | null | undefined) {
  const safeCategory = String(photoCategory ?? "").trim();
  if (!safeCategory || safeCategory === "bezna") return null;
  return PHOTO_CATEGORY_LABELS[safeCategory as PhotoCategory] ?? safeCategory;
}

function getImageCaptionText(imageComment: string | null | undefined) {
  const safeComment = String(imageComment ?? "").trim();
  return safeComment.length ? safeComment : null;
}

function reactionOptionByKey(key: ImageReactionKey | null | undefined) {
  return REACTION_OPTIONS.find((option) => option.key === key) ?? REACTION_OPTIONS[0];
}

function topReactionKeys(summary: ImageReactionSummary | undefined) {
  if (!summary) return [] as ImageReactionKey[];
  return (Object.entries(summary.byReaction) as Array<[ImageReactionKey, number]>)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);
}

function hasRepeatedReaction(summary: ImageReactionSummary | undefined) {
  if (!summary) return false;
  return Object.values(summary.byReaction).some((count) => Number(count) >= 2);
}

function getPostRevealMeta(params: {
  photos: MyTipPhotoRow[];
  revealDelayDays: number;
  identityDelayMs: number;
  nowMs: number;
  isPrivilegedViewer: boolean;
}): PostRevealMeta {
  if (params.isPrivilegedViewer) {
    return {
      latestGuessAtMs: Number.NaN,
      groupRevealed: true,
      identityRevealed: true,
      remainingMs: 0,
    };
  }

  const guessTimes = params.photos
    .map((photo) => (photo.createdAt ? new Date(photo.createdAt).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));

  if (guessTimes.length === 0) {
    return {
      latestGuessAtMs: Number.NaN,
      groupRevealed: false,
      identityRevealed: false,
      remainingMs: Number.POSITIVE_INFINITY,
    };
  }

  const latestGuessAtMs = Math.max(...guessTimes);
  const revealAt = latestGuessAtMs + msFromDays(params.revealDelayDays);
  const identityRevealAt = latestGuessAtMs + params.identityDelayMs;
  const remainingMs = Math.max(0, revealAt - params.nowMs);

  return {
    latestGuessAtMs,
    groupRevealed: remainingMs <= 0,
    identityRevealed: Math.max(0, identityRevealAt - params.nowMs) <= 0,
    remainingMs,
  };
}

function buildLayoutRows<T>(items: T[], isPortrait: (item: T) => boolean): LayoutRow<T>[] {
  if (items.length === 0) return [];

  const portraits = items.filter((item) => isPortrait(item));
  const landscapes = items.filter((item) => !isPortrait(item));

  const hasPortrait = portraits.length > 0;
  const hasLandscape = landscapes.length > 0;

  const rows: LayoutRow<T>[] = [];

  function pushPairs(group: T[], leftoverFullWidth: boolean) {
    const pairableCount = group.length % 2 === 0 ? group.length : group.length - 1;

    for (let i = 0; i < pairableCount; i += 2) {
      rows.push({
        type: "pair",
        left: group[i],
        right: group[i + 1],
      });
    }

    if (group.length % 2 === 1) {
      rows.push({
        type: "single",
        item: group[group.length - 1],
        fullWidth: leftoverFullWidth,
      });
    }
  }

  if (!hasPortrait && hasLandscape) {
    pushPairs(landscapes, true);
    return rows;
  }

  if (hasPortrait && !hasLandscape) {
    pushPairs(portraits, true);
    return rows;
  }

  const firstIsPortrait = isPortrait(items[0]);
  const firstGroup = firstIsPortrait ? portraits : landscapes;
  const secondGroup = firstIsPortrait ? landscapes : portraits;

  const firstOdd = firstGroup.length % 2 === 1;
  const secondOdd = secondGroup.length % 2 === 1;

  const firstMain = firstOdd ? firstGroup.slice(0, -1) : firstGroup;
  const secondMain = secondOdd ? secondGroup.slice(0, -1) : secondGroup;

  for (let i = 0; i < firstMain.length; i += 2) {
    rows.push({
      type: "pair",
      left: firstMain[i],
      right: firstMain[i + 1],
    });
  }

  for (let i = 0; i < secondMain.length; i += 2) {
    rows.push({
      type: "pair",
      left: secondMain[i],
      right: secondMain[i + 1],
    });
  }

  if (firstOdd && secondOdd) {
    rows.push({
      type: "pair",
      left: firstGroup[firstGroup.length - 1],
      right: secondGroup[secondGroup.length - 1],
    });
  } else if (firstOdd) {
    rows.push({
      type: "single",
      item: firstGroup[firstGroup.length - 1],
      fullWidth: true,
    });
  } else if (secondOdd) {
    rows.push({
      type: "single",
      item: secondGroup[secondGroup.length - 1],
      fullWidth: true,
    });
  }

  return rows;
}

function thumbAspectClass(isPortrait: boolean, fullWidth: boolean) {
  if (fullWidth) return isPortrait ? "aspect-[3/4]" : "aspect-[4/3]";
  return isPortrait ? "aspect-[3/4]" : "aspect-[4/3]";
}

function thumbImageClass(isPortrait: boolean) {
  return isPortrait ? "h-full w-full object-cover object-top" : "h-full w-full object-cover object-center";
}

function computeAwScorePct(realAge: number | null, awAge: number | null): number | null {
  if (typeof realAge !== "number" || !Number.isFinite(realAge) || realAge <= 0) return null;
  if (typeof awAge !== "number" || !Number.isFinite(awAge)) return null;
  return ((awAge - realAge) / realAge) * 100;
}

function TipInfoBox({
  realAge,
  awAge,
  myTip,
  photoCategory,
  showPhotoCategory = false,
}: {
  realAge: number | null;
  awAge: number | null;
  myTip: number | null;
  photoCategory?: string | null;
  showPhotoCategory?: boolean;
}) {
  const photoCategoryText = getPhotoCategoryText(photoCategory);

  return (
    <div className="w-fit max-w-full space-y-2 text-center text-xs">
      <div className="inline-grid grid-cols-3 gap-1.5">
        <div className="rounded-xl bg-white px-2 py-1.5">
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-600">Vek</div>
          <div className="mt-1 text-[0.99rem] font-bold leading-none text-slate-900">{fmtInt(realAge)}</div>
        </div>

        <div className="rounded-xl bg-white px-2 py-1.5">
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-600">AW vek</div>
          <div className="mt-1 text-[0.99rem] font-bold leading-none text-slate-900">{fmt1(awAge)}</div>
        </div>

        <div className="rounded-xl bg-white px-2 py-1.5">
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-600">Tvuj tip</div>
          <div className="mt-1 text-[0.99rem] font-bold leading-none text-slate-900">{fmtInt(myTip)}</div>
        </div>
      </div>

      {showPhotoCategory && photoCategoryText ? <div className="rounded-xl bg-white p-2 text-slate-700">Kategorie fotky: {photoCategoryText}</div> : null}
    </div>
  );
}

function TipStoryBlock({ story, revealed }: { story: any; revealed: boolean }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [myReaction, setMyReaction] = useState<ImageReactionKey | null>(() => story?.myReaction ?? null);
  const [likesCount, setLikesCount] = useState(() => Number(story?.likesCount ?? 0));
  const [likeBusy, setLikeBusy] = useState(false);

  if (!revealed) {
    return (
      <section className="mt-3 rounded-xl bg-slate-50 p-3">
        <div className="text-sm font-semibold text-slate-800">Příběh autora</div>
        <p className="mt-1 text-sm text-slate-500">Příběh bude dostupný po odhalení postu.</p>
      </section>
    );
  }

  if (!story) return null;
  const images = Array.isArray(story.images) ? story.images : [];
  const body = String(story.body ?? "").trim();
  if (!body && images.length === 0) return null;
  const storyId = Number(story.id);

  async function toggleComments() {
    setCommentsOpen((value) => !value);
    if (commentsOpen || comments.length > 0 || !storyId) return;
    setCommentsLoading(true);
    try {
      setComments(await getStoryComments(storyId));
    } catch (error) {
      console.error("Nepodařilo se načíst komentáře příběhu.", error);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment() {
    if (!commentDraft.trim() || !storyId) return;
    setCommentSubmitting(true);
    try {
      const created = await createStoryComment({ storyId, body: commentDraft });
      setComments((prev) => [...prev, created]);
      setCommentDraft("");
      setCommentsOpen(true);
    } catch (error: any) {
      await awAlert(error?.message ?? "Komentář se nepodařilo uložit.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function toggleLike() {
    if (!storyId) return;
    setLikeBusy(true);
    try {
      const previous = myReaction;
      const result = await toggleStoryReaction(storyId, previous ?? "like");
      setMyReaction(result.reaction);
      setLikesCount((count) => Math.max(0, count + (previous && !result.reaction ? -1 : !previous && result.reaction ? 1 : 0)));
    } catch (error: any) {
      await awAlert(error?.message ?? "Reakci se nepodařilo uložit.");
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-xl bg-emerald-50/60 p-3">
      <div className="text-sm font-semibold text-slate-900">Příběh autora</div>
      {body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{body}</p> : null}
      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image: any) => {
            const src = image.publicUrlThumb ?? image.public_url_thumb ?? image.publicUrlMedium ?? image.public_url_medium ?? image.publicUrl ?? image.public_url;
            if (!src) return null;
            return (
              <div key={String(image.id)} className="aspect-[4/3] overflow-hidden rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={image.altText ?? "Obrázek příběhu"} className="h-full w-full object-cover" />
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={likeBusy}
          className={`rounded-xl bg-white px-3 py-2 text-xs font-semibold ${myReaction ? "text-emerald-700" : "text-slate-700 hover:bg-slate-100"} disabled:opacity-60`}
        >
          {myReaction ? "To se mi líbí" : "Like"}{likesCount > 0 ? ` (${likesCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => void toggleComments()}
          className={`rounded-xl bg-white px-3 py-2 text-xs font-semibold ${commentsOpen ? "text-emerald-700" : "text-slate-700 hover:bg-slate-100"}`}
        >
          Komentáře{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
      </div>

      {commentsOpen ? (
        <div className="mt-3 rounded-xl bg-white p-3">
          <EmojiTextarea
            value={commentDraft}
            onChange={(next) => setCommentDraft(next.slice(0, 1000))}
            placeholder="Napiš komentář k příběhu..."
            rows={3}
            disabled={commentSubmitting}
            compact
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">{commentDraft.trim().length}/1000</div>
            <button
              type="button"
              onClick={() => void submitComment()}
              disabled={commentSubmitting || !commentDraft.trim()}
              className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
            >
              {commentSubmitting ? "Ukládám..." : "Přidat komentář"}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {commentsLoading ? <div className="text-xs text-slate-500">Načítám komentáře...</div> : null}
            {!commentsLoading && comments.length === 0 ? <div className="text-xs text-slate-400">Zatím žádné komentáře</div> : null}
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-500">{comment.author_snapshot_display_name ?? "Uživatel"}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LikeOutlineIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 11v10" />
      <path d="M14 21h-5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3l1-5c.1-1 .7-2 1.7-2 .8 0 1.3.6 1.3 1.4V11h3.3c1.1 0 1.9 1 1.7 2.1l-1.3 6A2 2 0 0 1 17.7 21H14Z" />
    </svg>
  );
}

function CommentOutlineIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.3-3.4-.7L4 20l.8-4.5A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8 10h8" />
      <path d="M8 13h6" />
      <path d="M8 16h4" />
    </svg>
  );
}

function TipPhotoMenuButton(props: { onClick: () => void; label: string }) {
  return (
    <AwButton
      type="button"
      onClick={props.onClick}
      aria-label={props.label}
      variant="secondary"
      size="sm"
      className="h-9 w-9 min-h-9 rounded-full bg-white/95 px-0 py-0 text-slate-700 shadow-sm no-underline hover:bg-emerald-50"
    >
      <span className="text-lg leading-none">...</span>
    </AwButton>
  );
}

function TipPhotoMenuPanel(props: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-xl bg-white p-1 shadow-lg">
      {props.children}
    </div>
  );
}

function TipPhotoMenuAction(props: { onClick: () => void | Promise<void>; disabled?: boolean; children: ReactNode }) {
  return (
    <AwButton
      type="button"
      onClick={() => void props.onClick()}
      disabled={props.disabled}
      variant="tertiary"
      size="sm"
      className="flex w-full justify-start rounded-lg px-3 py-2 text-left text-slate-700 no-underline hover:bg-emerald-50 hover:text-emerald-900"
    >
      {props.children}
    </AwButton>
  );
}

function TipPhotoCard({
  imageId,
  postId,
  thumb,
  onZoom,
  onMeasure,
  isPortrait,
  revealed,
  remainingMs,
  realAge,
  awAge,
  myTip,
  fullWidth,
  comments,
  commentsOpen,
  commentsLoading,
  commentDraft,
  commentSubmitting,
  replyOpenByCommentId,
  replyDraftByCommentId,
  replySubmittingByCommentId,
  onCommentDraftChange,
  onReplyDraftChange,
  onToggleComments,
  onToggleReply,
  onSubmitComment,
  reactionSummary,
  myReaction,
  likeBusy,
  onToggleReaction,
  onOpenReactionDetails,
  photo,
  frameless = false,
  menuOpen,
  menuBusy,
  isHiddenByViewer = false,
  onToggleMenu,
  onToggleHidden,
  onReportImage,
}: {
  imageId: number;
  postId: number;
  thumb: string;
  onZoom: (photo: MyTipPhotoRow, revealed: boolean, remainingMs: number) => void;
  onMeasure: (imageId: number, el: HTMLImageElement | null) => void;
  isPortrait: boolean;
  revealed: boolean;
  remainingMs: number;
  realAge: number | null;
  awAge: number | null;
  myTip: number | null;
  fullWidth: boolean;
  comments: CommentRow[];
  commentsOpen: boolean;
  commentsLoading: boolean;
  commentDraft: string;
  commentSubmitting: boolean;
  replyOpenByCommentId: Record<number, boolean>;
  replyDraftByCommentId: Record<number, string>;
  replySubmittingByCommentId: Record<number, boolean>;
  onCommentDraftChange: (imageId: number, next: string) => void;
  onReplyDraftChange: (commentId: number, next: string) => void;
  onToggleComments: (imageId: number, revealed: boolean) => void;
  onToggleReply: (commentId: number) => void;
  onSubmitComment: (params: { imageId: number; postId: number; body: string; parentCommentId?: number | null }) => Promise<void>;
  reactionSummary?: ImageReactionSummary;
  myReaction: ImageReactionKey | null;
  likeBusy: boolean;
  onToggleReaction: (imageId: number, reaction: ImageReactionKey) => Promise<void>;
  onOpenReactionDetails: (imageId: number) => void;
  photo: MyTipPhotoRow;
  frameless?: boolean;
  menuOpen: boolean;
  menuBusy: boolean;
  isHiddenByViewer?: boolean;
  onToggleMenu: (imageId: number | null) => void;
  onToggleHidden: (imageId: number, isHidden: boolean) => Promise<void>;
  onReportImage: (imageId: number) => void;
}) {
  const aspectClass = thumbAspectClass(isPortrait, fullWidth);
  const imageClass = thumbImageClass(isPortrait);
  const widthClass = fullWidth ? "mx-auto w-full max-w-[65%]" : "w-full";
  const frameClass = frameless ? `${widthClass} bg-transparent p-0` : `${widthClass} rounded-2xl bg-slate-50 p-3`;
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const activeReaction = reactionOptionByKey(myReaction);
  const imageCaptionText = getImageCaptionText(photo.imageComment);
  const summaryReactionKeys = topReactionKeys(reactionSummary);
  const showReactionCount = hasRepeatedReaction(reactionSummary);
  const summaryTotal = reactionSummary?.total ?? 0;
  const commentCount = comments.length;
  const commentTree = buildCommentTree(comments);
  const renderCommentNode = (comment: CommentNode, depth = 0): ReactNode => (
    <div
      key={comment.id}
      className="rounded-xl bg-slate-50 px-3 py-2"
      style={{ marginLeft: depth ? Math.min(depth * 12, 36) : 0 }}
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span>{comment.author_snapshot_display_name ?? "Uživatel"}</span>
        <span>•</span>
        <span>{formatCommentDateCZ(comment.created_at)}</span>
      </div>
      <div className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{comment.body}</div>
      <button
        type="button"
        onClick={() => onToggleReply(comment.id)}
        className="mt-2 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
      >
        Odpovědět
      </button>

      {replyOpenByCommentId[comment.id] ? (
        <div className="mt-2 rounded-xl bg-white p-2">
          <EmojiTextarea
            value={replyDraftByCommentId[comment.id] ?? ""}
            onChange={(next) => onReplyDraftChange(comment.id, next.slice(0, 1000))}
            placeholder="Napiš odpověď…"
            rows={2}
            disabled={replySubmittingByCommentId[comment.id]}
            compact
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() =>
                onSubmitComment({
                  imageId,
                  postId,
                  body: replyDraftByCommentId[comment.id] ?? "",
                  parentCommentId: comment.id,
                })
              }
              disabled={replySubmittingByCommentId[comment.id] || !(replyDraftByCommentId[comment.id] ?? "").trim()}
              className="inline-flex items-center justify-center rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
            >
              {replySubmittingByCommentId[comment.id] ? "Ukládám…" : "Odeslat odpověď"}
            </button>
          </div>
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="mt-2 space-y-2">{comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}</div>
      ) : null}
    </div>
  );

  return (
    <div id={`tip-photo-${imageId}`} className={`${frameClass} group/photo relative`}>
      {revealed && imageCaptionText ? <div className="mb-2 px-1 text-sm font-medium text-slate-800">{imageCaptionText}</div> : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => onZoom(photo, revealed, remainingMs)}
          className="block w-full overflow-hidden rounded-xl bg-transparent"
          title="Klikni pro zvětšení"
        >
          <div className={`w-full overflow-hidden rounded-xl bg-transparent ${aspectClass}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt={`Fotka #${imageId}`}
              className={imageClass}
              onLoad={(e) => onMeasure(imageId, e.currentTarget)}
            />
          </div>
        </button>

        <div
          className={`absolute right-3 top-3 transition-opacity sm:right-4 sm:top-4 ${
            menuOpen ? "opacity-100" : "opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover/photo:pointer-events-auto sm:group-hover/photo:opacity-100"
          }`}
        >
          <div className="relative">
            <TipPhotoMenuButton label="Možnosti fotky" onClick={() => onToggleMenu(menuOpen ? null : imageId)} />

            {menuOpen ? (
              <TipPhotoMenuPanel>
                <TipPhotoMenuAction onClick={() => onToggleHidden(imageId, isHiddenByViewer)} disabled={menuBusy}>
                  {isHiddenByViewer ? "Zrušit skrytí fotky" : "Skrýt fotku"}
                </TipPhotoMenuAction>
                <TipPhotoMenuAction
                  onClick={() => {
                    onReportImage(imageId);
                    onToggleMenu(null);
                  }}
                >
                  Nahlásit fotku
                </TipPhotoMenuAction>
              </TipPhotoMenuPanel>
            ) : null}
          </div>
        </div>
      </div>

      {revealed ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3 pl-1">
            {summaryReactionKeys.length > 0 ? (
              <button
                type="button"
                onClick={() => onOpenReactionDetails(imageId)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <div className="flex items-center">
                  {summaryReactionKeys.map((reactionKey, index) => {
                    const reaction = reactionOptionByKey(reactionKey);
                    return (
                      <span
                        key={`${imageId}-${reactionKey}`}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm shadow-sm ${reaction.bgClass} ${
                          index > 0 ? "-ml-2" : ""
                        }`}
                      >
                        {reaction.emoji}
                      </span>
                    );
                  })}
                </div>
                {showReactionCount ? <span className="font-semibold text-slate-700">{summaryTotal}</span> : null}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => onToggleComments(imageId, revealed)}
              className="text-[0.68rem] italic font-semibold text-slate-500 hover:text-slate-900"
            >
              {formatCommentCount(commentCount)}
            </button>
          </div>

          <div className="mt-3 grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <div className="min-w-0">
              <TipInfoBox realAge={realAge} awAge={awAge} myTip={myTip} />
            </div>

            <div className="flex w-fit max-w-full items-center gap-2 justify-self-end">
              <div
                className="relative"
                onMouseEnter={() => setReactionPickerOpen(true)}
                onMouseLeave={() => setReactionPickerOpen(false)}
              >
                {reactionPickerOpen ? (
                  <div className="absolute bottom-full right-0 z-20 pb-2">
                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-lg">
                      {REACTION_OPTIONS.map((reaction) => (
                        <button
                          key={`${imageId}-${reaction.key}-picker`}
                          type="button"
                          onClick={() => {
                            setReactionPickerOpen(false);
                            void onToggleReaction(imageId, reaction.key);
                          }}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:-translate-y-1 ${reaction.bgClass}`}
                          title={reaction.label}
                          aria-label={reaction.label}
                        >
                          {reaction.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onFocus={() => setReactionPickerOpen(true)}
                  onClick={() => void onToggleReaction(imageId, myReaction ?? "like")}
                  disabled={likeBusy}
                  className={`flex w-fit min-w-[96px] items-center justify-start gap-2 rounded-xl bg-white px-3 py-2 text-[0.77rem] font-semibold transition ${
                    myReaction ? "text-emerald-700" : "text-slate-800 hover:bg-slate-100"
                  } disabled:opacity-60`}
                >
                  <LikeOutlineIcon className="h-5 w-5" />
                  <span>{myReaction ? activeReaction.label : "Like"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleComments(imageId, revealed)}
                className={`flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white px-0 py-0 text-[0.77rem] font-semibold transition ${
                  commentsOpen ? "text-emerald-700" : "text-slate-800 hover:bg-slate-100"
                }`}
                aria-label="Komentář"
                title="Komentář"
              >
                <CommentOutlineIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {commentsOpen ? (
            <div className="mt-3 space-y-2 rounded-xl bg-white p-3">
              <label htmlFor={`comment-${imageId}`} className="block text-xs font-semibold text-slate-700">
                Přidat komentář k této fotce
              </label>

              <EmojiTextarea
                value={commentDraft}
                onChange={(next) => onCommentDraftChange(imageId, next.slice(0, 1000))}
                placeholder="Napiš svůj komentář…"
                rows={3}
                disabled={commentSubmitting}
                compact
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">{commentDraft.trim().length}/1000</div>

                <button
                  type="button"
                  onClick={() =>
                    onSubmitComment({
                      imageId,
                      postId,
                      body: commentDraft,
                    })
                  }
                  disabled={commentSubmitting || !commentDraft.trim()}
                  className="inline-flex items-center justify-center rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
                >
                  {commentSubmitting ? "Ukládám…" : "Přidat komentář"}
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {commentsLoading ? (
                  <div className="text-xs text-slate-500">Načítám komentáře…</div>
                ) : comments.length === 0 ? (
                  <div className="text-xs text-slate-400">Zatím žádné komentáře</div>
                ) : null}
              </div>

              {!commentsLoading && comments.length > 0 ? (
                <div className="mt-2 space-y-3">
                  {commentTree.map((comment) => renderCommentNode(comment))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const IDENTITY_DELAY_HOURS = 24;
const WAITING_AVATAR = "/waiting.jpg";

const ALL_CATS = Object.keys(PHOTO_CATEGORY_LABELS) as PhotoCategory[];

export default function MyTipsPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [revealDelayDays, setRevealDelayDays] = useState(DEFAULT_POST_REVEAL_DELAY_DAYS);

  const [onlyAlbums, setOnlyAlbums] = useState(false);
  const [groups, setGroups] = useState<MyTipPostGroup[]>([]);

  const [filterCats, setFilterCats] = useState<PhotoCategory[]>([]);
  const filterOptions = useMemo(() => ALL_CATS.map((c) => ({ key: c, label: PHOTO_CATEGORY_LABELS[c] })), []);

  const [statusFilters, setStatusFilters] = useState<TipStatus[]>([]);
  const statusOptions = useMemo(
    () => [
      { key: "anonymni", label: "Anonymní" },
      { key: "bez_komentaru", label: "Bez komentářu" },
      { key: "odhalene", label: "Odhalené" },
    ],
    []
  );

  const [visibilityFilters, setVisibilityFilters] = useState<TipVisibilityFilter[]>([]);
  const visibilityOptions = useMemo(
    () => [
      { key: "vsechny", label: "Všechny" },
      { key: "s_viditelnymi_komentari", label: "S viditelnými komentáři" },
      { key: "identita_uzivatele", label: "Identita uživatele" },
      { key: "docasne_anonymni", label: "Dočasně anonymní" },
    ],
    []
  );
  const albumScopeOptions = useMemo(
    () => [
      { key: "vse", label: "Vše" },
      { key: "jen_alba", label: "Pouze alba" },
    ],
    []
  );

  const [zoom, setZoom] = useState<ZoomState>({ open: false, photo: null, revealed: false, remainingMs: 0 });
  const [reactionModal, setReactionModal] = useState<ReactionModalState>({ open: false, imageId: null });
  const [reactionModalFilter, setReactionModalFilter] = useState<"all" | ImageReactionKey>("all");
  const [reactionDetailsByImageId, setReactionDetailsByImageId] = useState<Record<number, ImageReactionDetail[]>>({});
  const [reactionDetailsLoadingByImageId, setReactionDetailsLoadingByImageId] = useState<Record<number, boolean>>({});
  const [isPrivilegedViewer, setIsPrivilegedViewer] = useState(false);
  const [isPortraitByImageId, setIsPortraitByImageId] = useState<Record<number, boolean>>({});
  const [commentsByImageId, setCommentsByImageId] = useState<Record<number, CommentRow[]>>({});
  const [commentsLoadingByImageId, setCommentsLoadingByImageId] = useState<Record<number, boolean>>({});
  const [commentsOpenByImageId, setCommentsOpenByImageId] = useState<Record<number, boolean>>({});
  const [commentDraftByImageId, setCommentDraftByImageId] = useState<Record<number, string>>({});
  const [commentSubmittingByImageId, setCommentSubmittingByImageId] = useState<Record<number, boolean>>({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState<Record<number, boolean>>({});
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<Record<number, string>>({});
  const [replySubmittingByCommentId, setReplySubmittingByCommentId] = useState<Record<number, boolean>>({});
  const [reactionSummaryByImageId, setReactionSummaryByImageId] = useState<Record<number, ImageReactionSummary>>({});
  const [myReactionByImageId, setMyReactionByImageId] = useState<Record<number, ImageReactionKey | null>>({});
  const [likeBusyByImageId, setLikeBusyByImageId] = useState<Record<number, boolean>>({});
  const [hiddenImageIds, setHiddenImageIds] = useState<Record<number, boolean>>({});
  const [photoMenuForId, setPhotoMenuForId] = useState<number | null>(null);
  const [photoMenuBusyById, setPhotoMenuBusyById] = useState<Record<number, boolean>>({});
  const [reportImageId, setReportImageId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const requestedCommentsRef = useRef<Set<number>>(new Set());
  const requestedReactionsRef = useRef<Set<number>>(new Set());
  const requestedReactionDetailsRef = useRef<Set<number>>(new Set());
  const focusedImageRef = useRef<number | null>(null);
  const focusImageId = Number(searchParams.get("focusImage") ?? 0) || null;
  const focusComments = searchParams.get("comments") === "1";
  const myTipsHelpPlainText = `Moje tipy ukazují posty a alba, u kterých jsi už tipoval všechny fotky.\n\nFiltr pracuje s kategoriemi, stavem tipu, viditelností a typem obsahu. Refresh načte aktuální stav odhalení.\n\nObsah se odhalí po ${formatCzAfterDays(revealDelayDays)} od času posledního tipu v postu. Jméno a fotka autora se odhalí po 24 hodinách od tipu poslední fotky v postu; spolu s tím se zpřístupní i komentáře.`;

  async function loadPrivilegedFlag() {
    if (!userId) return;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("super_user, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      const privileged =
        Boolean((data as any).super_user) ||
        (data as any).role === "moderator" ||
        (data as any).role === "admin";

      setIsPrivilegedViewer(privileged);
    } else {
      setIsPrivilegedViewer(false);
    }
  }

  async function reload() {
    if (!userId) return;

    setLoading(true);
    setErr(null);

    try {
      await loadPrivilegedFlag();
      const [data, nextRevealDelayDays] = await Promise.all([
        loadMyTipPosts({ currentUserId: userId, limit: 400 }),
        getPostRevealDelayDays(),
      ]);
      setGroups(data);
      setRevealDelayDays(nextRevealDelayDays);
    } catch (e: any) {
      setErr(e?.message ?? "Tipy se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  function onThumbLoad(imageId: number, el: HTMLImageElement | null) {
    if (!imageId || !el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    if (!w || !h) return;

    setIsPortraitByImageId((prev) => {
      const nextVal = h > w;
      if (prev[imageId] === nextVal) return prev;
      return { ...prev, [imageId]: nextVal };
    });
  }

  async function ensureImageCommentsLoaded(imageId: number, revealed: boolean) {
    if (!revealed || !imageId) return;
    if (requestedCommentsRef.current.has(imageId)) return;
    requestedCommentsRef.current.add(imageId);

    setCommentsLoadingByImageId((prev) => ({ ...prev, [imageId]: true }));

    try {
      const rows = await getImageComments(imageId);
      setCommentsByImageId((prev) => ({ ...prev, [imageId]: rows }));
    } catch (e) {
      console.error("Nepodařilo se načíst komentáře pro image", imageId, e);
      setCommentsByImageId((prev) => ({ ...prev, [imageId]: [] }));
    } finally {
      setCommentsLoadingByImageId((prev) => ({ ...prev, [imageId]: false }));
    }
  }

  function onCommentDraftChange(imageId: number, next: string) {
    setCommentDraftByImageId((prev) => ({
      ...prev,
      [imageId]: next,
    }));
  }

  function onReplyDraftChange(commentId: number, next: string) {
    setReplyDraftByCommentId((prev) => ({
      ...prev,
      [commentId]: next,
    }));
  }

  function onToggleReply(commentId: number) {
    setReplyOpenByCommentId((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }

  async function handleToggleComments(imageId: number, revealed: boolean) {
    setCommentsOpenByImageId((prev) => ({
      ...prev,
      [imageId]: !prev[imageId],
    }));

    if (!commentsOpenByImageId[imageId]) {
      await ensureImageCommentsLoaded(imageId, revealed);
    }
  }

  async function loadReactionsForImages(imageIds: number[]) {
    const ids = Array.from(new Set(imageIds.filter((id) => Number.isFinite(id) && id > 0))).filter(
      (id) => !requestedReactionsRef.current.has(id)
    );
    if (ids.length === 0) return;

    ids.forEach((id) => requestedReactionsRef.current.add(id));

    try {
      const [summary, reactions] = await Promise.all([getImageReactionSummary(ids), getMyImageReactions(ids)]);
      setReactionSummaryByImageId((prev) => ({ ...prev, ...summary }));
      setMyReactionByImageId((prev) => ({
        ...prev,
        ...Object.fromEntries(ids.map((id) => [id, reactions[id] ?? null])),
      }));
    } catch (e) {
      ids.forEach((id) => requestedReactionsRef.current.delete(id));
      console.error("Nepodařilo se načíst reakce fotek.", describeError(e));
    }
  }

  async function ensureReactionDetailsLoaded(imageId: number) {
    if (!Number.isFinite(imageId) || imageId <= 0) return;
    if (requestedReactionDetailsRef.current.has(imageId)) return;
    requestedReactionDetailsRef.current.add(imageId);
    setReactionDetailsLoadingByImageId((prev) => ({ ...prev, [imageId]: true }));

    try {
      const rows = await getImageReactionDetails(imageId);
      setReactionDetailsByImageId((prev) => ({ ...prev, [imageId]: rows }));
    } catch (e) {
      requestedReactionDetailsRef.current.delete(imageId);
      console.error("Nepodařilo se načíst detail reakcí.", describeError(e));
      setReactionDetailsByImageId((prev) => ({ ...prev, [imageId]: [] }));
    } finally {
      setReactionDetailsLoadingByImageId((prev) => ({ ...prev, [imageId]: false }));
    }
  }

  function openReactionDetails(imageId: number) {
    setReactionModal({ open: true, imageId });
    setReactionModalFilter("all");
    void ensureReactionDetailsLoaded(imageId);
  }

  async function handleToggleHiddenImage(imageId: number, isHidden: boolean) {
    if (!userId) {
      await awAlert("Pro skrytí fotky se prosím přihlas.");
      return;
    }

    setPhotoMenuBusyById((prev) => ({ ...prev, [imageId]: true }));
    try {
      if (isHidden) {
        await unhideFeedImage({ imageId, currentUserId: userId });
        setHiddenImageIds((prev) => {
          const next = { ...prev };
          delete next[imageId];
          return next;
        });
      } else {
        await hideFeedImage({ imageId, currentUserId: userId });
        setHiddenImageIds((prev) => ({ ...prev, [imageId]: true }));
      }
      setPhotoMenuForId(null);
    } catch (error) {
      await awAlert(describeError(error));
    } finally {
      setPhotoMenuBusyById((prev) => {
        const next = { ...prev };
        delete next[imageId];
        return next;
      });
    }
  }

  async function handleToggleReaction(imageId: number, reaction: ImageReactionKey) {
    setLikeBusyByImageId((prev) => ({ ...prev, [imageId]: true }));

    try {
      const currentReaction = myReactionByImageId[imageId] ?? null;
      const result = await toggleImageReaction(imageId, reaction);
      const nextReaction = result.reaction;
      requestedReactionDetailsRef.current.delete(imageId);
      setMyReactionByImageId((prev) => ({ ...prev, [imageId]: nextReaction }));
      setReactionSummaryByImageId((prev) => {
        const current = prev[imageId] ?? { total: 0, byReaction: {}, recentUserNames: [] };
        const nextByReaction: Partial<Record<ImageReactionKey, number>> = { ...current.byReaction };
        let nextTotal = current.total;

        if (currentReaction) {
          nextByReaction[currentReaction] = Math.max(0, (nextByReaction[currentReaction] ?? 0) - 1);
          if ((nextByReaction[currentReaction] ?? 0) === 0) {
            delete nextByReaction[currentReaction];
          }
          nextTotal = Math.max(0, nextTotal - 1);
        }

        if (nextReaction) {
          nextByReaction[nextReaction] = (nextByReaction[nextReaction] ?? 0) + 1;
          nextTotal += 1;
        }

        return {
          ...prev,
          [imageId]: {
            total: nextTotal,
            byReaction: nextByReaction,
            recentUserNames: Array.isArray(current.recentUserNames) ? current.recentUserNames : [],
          },
        };
      });
      if (reactionModal.open && reactionModal.imageId === imageId) {
        void ensureReactionDetailsLoaded(imageId);
      }
    } catch (e: any) {
      await awAlert(e?.message ?? "Reakce se nepodařila uložit.");
    } finally {
      setLikeBusyByImageId((prev) => ({ ...prev, [imageId]: false }));
    }
  }

  async function handleSubmitImageComment(params: {
    imageId: number;
    postId: number;
    body: string;
    parentCommentId?: number | null;
  }) {
    const cleanBody = String(params.body ?? "").trim();
    if (!cleanBody) return;

    if (params.parentCommentId != null) {
      setReplySubmittingByCommentId((prev) => ({ ...prev, [params.parentCommentId as number]: true }));
    } else {
      setCommentSubmittingByImageId((prev) => ({ ...prev, [params.imageId]: true }));
    }

    try {
      const created = await createImageComment({
        imageId: params.imageId,
        postId: params.postId,
        body: cleanBody,
        parentCommentId: params.parentCommentId ?? null,
      });

      setCommentsByImageId((prev) => ({
        ...prev,
        [params.imageId]: [...(prev[params.imageId] ?? []), created],
      }));

      if (params.parentCommentId != null) {
        setReplyDraftByCommentId((prev) => ({
          ...prev,
          [params.parentCommentId as number]: "",
        }));
        setReplyOpenByCommentId((prev) => ({
          ...prev,
          [params.parentCommentId as number]: false,
        }));
      } else {
        setCommentDraftByImageId((prev) => ({
          ...prev,
          [params.imageId]: "",
        }));
      }
    } catch (e: any) {
      await awAlert(e?.message ?? "Komentář se nepodařilo uložit.");
    } finally {
      if (params.parentCommentId != null) {
        setReplySubmittingByCommentId((prev) => ({ ...prev, [params.parentCommentId as number]: false }));
      } else {
        setCommentSubmittingByImageId((prev) => ({ ...prev, [params.imageId]: false }));
      }
    }
  }

  const identityDelayMs = IDENTITY_DELAY_HOURS * 60 * 60 * 1000;

  const visibleGroups = useMemo(() => {
    let out = groups;

    if (onlyAlbums) out = out.filter((g) => !!g.albumId);

    const withMeta = out.map((g) => {
      const revealMeta = getPostRevealMeta({
        photos: g.photos ?? [],
        revealDelayDays,
        identityDelayMs,
        nowMs,
        isPrivilegedViewer,
      });

      const status: TipStatus = !revealMeta.identityRevealed ? "anonymni" : revealMeta.groupRevealed ? "odhalene" : "bez_komentaru";

      return {
        g,
        status,
        groupRevealed: revealMeta.groupRevealed,
        identityRevealed: revealMeta.identityRevealed,
      };
    });

    const filteredByStatus = statusFilters.length === 0 ? withMeta : withMeta.filter((x) => statusFilters.includes(x.status));

    const visibilityFilterActive = visibilityFilters.filter((x) => x !== "vsechny");
    const filteredByVisibility =
      visibilityFilterActive.length === 0
        ? filteredByStatus
        : filteredByStatus.filter((x) => {
            return visibilityFilterActive.every((vf) => {
              switch (vf) {
                case "s_viditelnymi_komentari":
                  return x.groupRevealed;
                case "identita_uzivatele":
                  return x.identityRevealed;
                case "docasne_anonymni":
                  return !x.identityRevealed;
                default:
                  return true;
              }
            });
          });

    if (filterCats.length === 0) return filteredByVisibility.map((x) => x.g);

    const want = new Set(filterCats);

    return filteredByVisibility
      .map((x) => ({
        ...x.g,
        allPhotos: x.g.photos ?? [],
        photos: (x.g.photos ?? []).filter((p) => want.has((p.photoCategory ?? "") as any)),
      }))
      .filter((g) => (g.photos ?? []).length > 0);
  }, [
    groups,
    onlyAlbums,
    filterCats.join("|"),
    statusFilters.join("|"),
    visibilityFilters.join("|"),
    isPrivilegedViewer,
    nowMs,
    identityDelayMs,
    revealDelayDays,
  ]);

  useEffect(() => {
    const revealedImageIds: number[] = [];

    for (const g of visibleGroups) {
      const revealMeta = getPostRevealMeta({
        photos: g.photos ?? [],
        revealDelayDays,
        identityDelayMs,
        nowMs: Date.now(),
        isPrivilegedViewer,
      });

      if (revealMeta.groupRevealed) {
        g.photos.forEach((photo) => {
          revealedImageIds.push(Number(photo.imageId));
        });
      }
    }

    revealedImageIds.forEach((imageId) => {
      void ensureImageCommentsLoaded(imageId, true);
    });
    void loadReactionsForImages(revealedImageIds);
  }, [visibleGroups, isPrivilegedViewer, revealDelayDays, identityDelayMs]);

  useEffect(() => {
    if (!focusImageId || !focusComments) return;
    if (focusedImageRef.current === focusImageId) return;

    const group = visibleGroups.find((g) => (g.photos ?? []).some((photo) => Number(photo.imageId) === focusImageId));
    if (!group) return;

    const revealMeta = getPostRevealMeta({
      photos: group.photos ?? [],
      revealDelayDays,
      identityDelayMs,
      nowMs,
      isPrivilegedViewer,
    });

    focusedImageRef.current = focusImageId;
    setCommentsOpenByImageId((prev) => ({ ...prev, [focusImageId]: true }));
    if (revealMeta.groupRevealed) {
      void ensureImageCommentsLoaded(focusImageId, true);
    }

    window.setTimeout(() => {
      document.getElementById(`tip-photo-${focusImageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [focusComments, focusImageId, visibleGroups, revealDelayDays, identityDelayMs, nowMs, isPrivilegedViewer]);

  const reactionModalDetails = reactionModal.open && reactionModal.imageId ? reactionDetailsByImageId[reactionModal.imageId] ?? [] : [];
  const reactionModalSummary =
    reactionModal.open && reactionModal.imageId ? reactionSummaryByImageId[reactionModal.imageId] ?? null : null;
  const reactionModalFilteredDetails =
    reactionModalFilter === "all"
      ? reactionModalDetails
      : reactionModalDetails.filter((item) => item.reaction === reactionModalFilter);
  const zoomImages = useMemo<TipGalleryImage[]>(() => {
    if (!zoom.open) return [];
    return zoom.photos.reduce<TipGalleryImage[]>((acc, photo, index) => {
      const src = photo.imagePublicUrl || photo.imageMediumUrl || photo.imageThumbUrl || "";
      if (!src) return acc;
      acc.push({
          id: photo.imageId,
          src,
          alt: `Fotka #${photo.imageId || index + 1}`,
          photo,
      });
      return acc;
    }, []);
  }, [zoom]);
  const zoomInitialIndex = zoom.open
    ? Math.max(0, zoomImages.findIndex((item) => item.photo.imageId === zoom.photo.imageId))
    : 0;

  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ui/Menu-Moje-tipy.ico" alt="" className="h-[2.1em] w-[2.1em] shrink-0" />
            <h1 className="text-[1.625rem] font-semibold leading-tight">
              Moje tipy
            </h1>
          </div>
          <p className="mt-2 text-slate-600">Pro zobrazení se prosím přihlas.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Prihlásit se
            </Link>
            <Link href="/register" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">
              Registrovat se
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeaderFilter
        title="Moje tipy"
        iconPath="/ui/Menu-Moje-tipy.ico"
        refreshIconPath="/icons/action/refresh.png"
        refreshActiveIconPath="/ui/refresh-rot.gif"
        refreshActiveDurationMs={5000}
        refreshAnimationStorageKey="aw:refresh-animation:my-tips"
        helpText={myTipsHelpPlainText}
        helpKey="my-tips"
        helpModalTitle="Nápověda - Moje tipy"
        storageKey="aw:filter:my-tips"
        options={filterOptions}
        value={filterCats as string[]}
        onChange={(next) => setFilterCats(next as PhotoCategory[])}
        extraTitle="Stav tipu"
        extraOptions={statusOptions}
        extraValue={statusFilters as string[]}
        onExtraChange={(next) => setStatusFilters(next as TipStatus[])}
        extra2Title="Viditelnost"
        extra2Options={visibilityOptions}
        extra2Value={visibilityFilters as string[]}
        onExtra2Change={(next) => setVisibilityFilters(next as TipVisibilityFilter[])}
        selectTitle="Typ obsahu"
        selectOptions={albumScopeOptions}
        selectValue={onlyAlbums ? "jen_alba" : "vse"}
        onSelectChange={(next) => setOnlyAlbums(next === "jen_alba")}
        showClearAll
        doneButtonClassName="bg-[#32CD32] text-white hover:bg-[#28b828]"
      />

      <div className="p-4">
        {isPrivilegedViewer ? (
          <div className="mb-4 rounded-xl border bg-white p-4">
            <div className="text-xs font-semibold text-emerald-700">PRIVILEGED: vidíš vše okamžite</div>
          </div>
        ) : null}

        {loading ? <p className="text-slate-600">Načítám…</p> : null}
        {err ? <p className="text-rose-700">{err}</p> : null}

        {!loading && !err && visibleGroups.length === 0 ? (
          <SoftEmptyState
            title={onlyAlbums ? "Zatím tu nemáš tipy u alb" : "Zatím tu nemáš žádné tipy"}
            text={
              onlyAlbums
                ? "Jakmile otipuješ všechny fotky v některém albu, po odhalení se ti jeho výsledek objeví právě tady."
                : "Tady se později objeví posty a alba, u kterých už máš tipování dokončené a můžeš se vrátit k výsledkům."
            }
          />
        ) : null}

        <div className="space-y-4">
          {visibleGroups.map((g) => {
            const isAlbum = !!g.albumId;
            const revealSourcePhotos = ((g as MyTipPostGroup & { allPhotos?: MyTipPhotoRow[] }).allPhotos ?? g.photos) as MyTipPhotoRow[];
            const revealMeta = getPostRevealMeta({
              photos: revealSourcePhotos,
              revealDelayDays,
              identityDelayMs,
              nowMs,
              isPrivilegedViewer,
            });
            const groupRevealed = revealMeta.groupRevealed;
            const identityRevealed = revealMeta.identityRevealed;

            const authorNameReal = (g.authorName ?? "Uživatel").trim() || "Uživatel";
            const authorName = identityRevealed ? authorNameReal : "Anonymní uživatel";
            const avatarUrl = identityRevealed ? g.authorAvatarUrl : WAITING_AVATAR;
            const authorProfileHref = identityRevealed && g.authorUserId ? `/users/${g.authorUserId}` : null;

            const headerTitle = groupRevealed
              ? g.postTitle
                ? g.postTitle
                : `Post #${g.postId}`
              : null;

            const albumBadgeText = isAlbum
              ? groupRevealed
                ? `Album${g.albumTitle ? ` • ${g.albumTitle}` : ""}`
                : "Album (anonymní)"
              : null;

            const layoutRows = buildLayoutRows(g.photos, (photo) => !!isPortraitByImageId[Number((photo as any).imageId)]);
            const hasSinglePhoto = g.photos.length === 1;
            const lastTipAt = revealSourcePhotos.reduce<string | null>((latest, photo) => {
              if (!photo.createdAt) return latest;
              if (!latest) return photo.createdAt;
              return new Date(photo.createdAt).getTime() > new Date(latest).getTime() ? photo.createdAt : latest;
            }, null);
            const lastTipText = formatRelativeUiTimestamp(lastTipAt);
            const postRevealRemainingMs = revealMeta.remainingMs;

            return (
              <div key={String(g.postId)} className="rounded-2xl bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                                        {authorProfileHref ? (
                      <Link href={authorProfileHref} className="shrink-0" title={`Otevrít profil: ${authorName}`}>
                        <AuthorAvatar name={authorName} avatarUrl={avatarUrl} />
                      </Link>
                    ) : (
                      <AuthorAvatar name={authorName} avatarUrl={avatarUrl} />
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {albumBadgeText ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{albumBadgeText}</span>
                        ) : null}
                      </div>

                      {headerTitle ? <div className="mt-0.5 text-sm font-semibold text-slate-900">{headerTitle}</div> : null}

                      {!groupRevealed ? (
                        <div className="mt-0.5 text-sm font-bold text-slate-900">
                          Autora a komentáře uvidíš za {formatRevealRemaining(postRevealRemainingMs)}.
                        </div>
                      ) : null}

                      <div className="mt-1 text-xs text-slate-500">
                        Tipování postu dokončeno
                        {shouldUseRelativePrefix(lastTipText) ? " před " : " "}
                        {lastTipText} • {formatPhotoCount(revealSourcePhotos.length)}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    <span>Post #{g.postId}</span>
                  </div>
                </div>

                {groupRevealed && g.postText ? <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{g.postText}</div> : null}
                <TipStoryBlock story={(g as any).story ?? null} revealed={groupRevealed} />

                <div className="mt-4 space-y-3">
                  {layoutRows.map((row, idx) =>
                    row.type === "single" ? (
                      <div key={`single-${g.postId}-${idx}`}>
                        <TipPhotoCard
                          imageId={Number((row.item as any).imageId)}
                          postId={g.postId}
                          thumb={
                            hasSinglePhoto
                              ? (row.item as any).imageMediumUrl ?? (row.item as any).imageThumbUrl ?? (row.item as any).imagePublicUrl
                              : (row.item as any).imageThumbUrl ?? (row.item as any).imageMediumUrl ?? (row.item as any).imagePublicUrl
                          }
                          onZoom={(photo, revealed, remainingMs) => setZoom({ open: true, photo, photos: g.photos, revealed, remainingMs })}
                          onMeasure={onThumbLoad}
                          isPortrait={!!isPortraitByImageId[Number((row.item as any).imageId)]}
                          revealed={groupRevealed}
                          remainingMs={postRevealRemainingMs}
                          realAge={(row.item as any).realAgeYears ?? null}
                          awAge={(row.item as any).awAgeYears ?? null}
                          myTip={(row.item as any).guessedAge ?? null}
                          fullWidth={row.fullWidth}
                          comments={commentsByImageId[Number((row.item as any).imageId)] ?? []}
                          commentsOpen={!!commentsOpenByImageId[Number((row.item as any).imageId)]}
                          commentsLoading={!!commentsLoadingByImageId[Number((row.item as any).imageId)]}
                          commentDraft={commentDraftByImageId[Number((row.item as any).imageId)] ?? ""}
                          commentSubmitting={!!commentSubmittingByImageId[Number((row.item as any).imageId)]}
                          replyOpenByCommentId={replyOpenByCommentId}
                          replyDraftByCommentId={replyDraftByCommentId}
                          replySubmittingByCommentId={replySubmittingByCommentId}
                          onCommentDraftChange={onCommentDraftChange}
                          onReplyDraftChange={onReplyDraftChange}
                          onToggleComments={handleToggleComments}
                          onToggleReply={onToggleReply}
                          onSubmitComment={handleSubmitImageComment}
                          reactionSummary={reactionSummaryByImageId[Number((row.item as any).imageId)]}
                          myReaction={myReactionByImageId[Number((row.item as any).imageId)] ?? null}
                          likeBusy={!!likeBusyByImageId[Number((row.item as any).imageId)]}
                          onToggleReaction={handleToggleReaction}
                          onOpenReactionDetails={openReactionDetails}
                          photo={row.item as MyTipPhotoRow}
                          frameless={hasSinglePhoto}
                          menuOpen={photoMenuForId === Number((row.item as any).imageId)}
                          menuBusy={!!photoMenuBusyById[Number((row.item as any).imageId)]}
                          isHiddenByViewer={!!hiddenImageIds[Number((row.item as any).imageId)]}
                          onToggleMenu={setPhotoMenuForId}
                          onToggleHidden={handleToggleHiddenImage}
                          onReportImage={setReportImageId}
                        />
                      </div>
                    ) : (
                      <div key={`pair-${g.postId}-${idx}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[row.left, row.right].map((photo, colIdx) => {
                          if (!photo) {
                            return <div key={`empty-${g.postId}-${idx}-${colIdx}`} className="hidden sm:block" aria-hidden="true" />;
                          }

                          const photoImageId = Number((photo as any).imageId);

                          return (
                            <TipPhotoCard
                              key={String((photo as any).imageId)}
                              imageId={photoImageId}
                              postId={g.postId}
                              thumb={(photo as any).imageThumbUrl ?? (photo as any).imageMediumUrl ?? (photo as any).imagePublicUrl}
                              onZoom={(photoRow, revealedFlag, remainingMsValue) =>
                                setZoom({ open: true, photo: photoRow, photos: g.photos, revealed: revealedFlag, remainingMs: remainingMsValue })
                              }
                              onMeasure={onThumbLoad}
                              isPortrait={!!isPortraitByImageId[photoImageId]}
                              revealed={groupRevealed}
                              remainingMs={postRevealRemainingMs}
                              realAge={(photo as any).realAgeYears ?? null}
                              awAge={(photo as any).awAgeYears ?? null}
                              myTip={(photo as any).guessedAge ?? null}
                              fullWidth={false}
                              comments={commentsByImageId[photoImageId] ?? []}
                              commentsOpen={!!commentsOpenByImageId[photoImageId]}
                              commentsLoading={!!commentsLoadingByImageId[photoImageId]}
                              commentDraft={commentDraftByImageId[photoImageId] ?? ""}
                              commentSubmitting={!!commentSubmittingByImageId[photoImageId]}
                              replyOpenByCommentId={replyOpenByCommentId}
                              replyDraftByCommentId={replyDraftByCommentId}
                              replySubmittingByCommentId={replySubmittingByCommentId}
                              onCommentDraftChange={onCommentDraftChange}
                              onReplyDraftChange={onReplyDraftChange}
                              onToggleComments={handleToggleComments}
                              onToggleReply={onToggleReply}
                              onSubmitComment={handleSubmitImageComment}
                              reactionSummary={reactionSummaryByImageId[photoImageId]}
                              myReaction={myReactionByImageId[photoImageId] ?? null}
                              likeBusy={!!likeBusyByImageId[photoImageId]}
                              onToggleReaction={handleToggleReaction}
                              onOpenReactionDetails={openReactionDetails}
                              photo={photo as MyTipPhotoRow}
                              menuOpen={photoMenuForId === photoImageId}
                              menuBusy={!!photoMenuBusyById[photoImageId]}
                              isHiddenByViewer={!!hiddenImageIds[photoImageId]}
                              onToggleMenu={setPhotoMenuForId}
                              onToggleHidden={handleToggleHiddenImage}
                              onReportImage={setReportImageId}
                            />
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <ImageGalleryModal<TipGalleryImage>
          open={zoom.open && zoomImages.length > 0}
          images={zoomImages}
          initialIndex={zoomInitialIndex}
          onClose={() => setZoom({ open: false, photo: null, revealed: false, remainingMs: 0 })}
          renderCaption={(item) =>
            zoom.revealed && getImageCaptionText(item.photo.imageComment) ? (
              <div className="mb-3 text-center text-sm font-medium text-white/90">{getImageCaptionText(item.photo.imageComment)}</div>
            ) : null
          }
          renderFooter={(item) => (
            <div className="mx-auto mt-3 max-w-3xl rounded-2xl bg-white p-3 shadow-xl">
              {zoom.revealed ? (
                <>
                  <div className="flex justify-center">
                    <TipInfoBox
                      realAge={item.photo.realAgeYears}
                      awAge={item.photo.awAgeYears}
                      myTip={item.photo.guessedAge}
                      photoCategory={item.photo.photoCategory}
                      showPhotoCategory
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
                  <span className="font-semibold">Tvuj tip {fmtInt(item.photo.guessedAge)}</span>
                  <br />
                  Tipoval/a jsi {formatRelativeUiTimestamp(item.photo.createdAt)}. Autora a komentáře uvidíš za{" "}
                  <span className="font-semibold">{formatRevealRemaining(zoom.remainingMs)}</span>.
                </div>
              )}

              <div className="mt-2 text-center text-[11px] text-slate-500">
                Foto #{item.photo.imageId} • {formatTipTimestampLabel(item.photo.createdAt)}
              </div>
            </div>
          )}
        />

        <ReportImageModal
          open={reportImageId != null}
          imageId={reportImageId}
          onClose={() => setReportImageId(null)}
          onReported={() => setPhotoMenuForId(null)}
        />

        {reactionModal.open && reactionModal.imageId ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onClick={() => setReactionModal({ open: false, imageId: null })}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reaction-modal-title"
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <h2 id="reaction-modal-title" className="text-2xl font-semibold text-slate-900">
                  Reakce
                </h2>

                <CloseButton onClick={() => setReactionModal({ open: false, imageId: null })} label="Zavřít reakce" />
              </div>

              <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 px-5 pt-3">
                <button
                  type="button"
                  onClick={() => setReactionModalFilter("all")}
                  className={`border-b-2 px-2 py-2 text-sm font-semibold ${
                    reactionModalFilter === "all" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600"
                  }`}
                >
                  Vše {reactionModalSummary?.total ?? reactionModalDetails.length}
                </button>

                {REACTION_OPTIONS.filter((option) => Number(reactionModalSummary?.byReaction?.[option.key] ?? 0) > 0).map((option) => (
                  <button
                    key={`reaction-tab-${option.key}`}
                    type="button"
                    onClick={() => setReactionModalFilter(option.key)}
                    className={`flex items-center gap-2 border-b-2 px-2 py-2 text-sm font-semibold ${
                      reactionModalFilter === option.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${option.bgClass}`}>{option.emoji}</span>
                    <span>{reactionModalSummary?.byReaction?.[option.key] ?? 0}</span>
                  </button>
                ))}
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                {reactionDetailsLoadingByImageId[reactionModal.imageId] ? (
                  <div className="py-8 text-center text-sm text-slate-500">Načítám reakce…</div>
                ) : reactionModalFilteredDetails.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">Zatím tu nejsou žádné reakce.</div>
                ) : (
                  <div className="space-y-4">
                    {reactionModalFilteredDetails.map((item) => {
                      const reaction = reactionOptionByKey(item.reaction);
                      const displayName = String(item.displayName ?? item.userId ?? "Uživatel").trim() || "Uživatel";
                      const bio = String(item.bio ?? "").trim();

                      return (
                        <div key={`${item.imageId}-${item.userId}-${item.reaction}-${item.createdAt ?? "now"}`} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-b-0">
                          <Link href={`/users/${item.userId}`} className="relative block h-14 w-14 shrink-0">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                              {item.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.avatarUrl} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-lg font-bold text-slate-700">{displayName.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm shadow ${reaction.bgClass}`}>
                              {reaction.emoji}
                            </span>
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link href={`/users/${item.userId}`} className="text-[1.05rem] font-semibold text-slate-900 hover:underline">
                              {displayName}
                            </Link>
                            {item.createdAt ? <div className="text-xs text-slate-400">{formatRelativeUiTimestamp(item.createdAt)}</div> : null}
                            <div className="mt-1 text-sm text-slate-700">{bio || "Uživatel reagoval na tuto fotku."}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}




