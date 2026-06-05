/**
 * File: components/PostCard.tsx
 * Main responsibilities:
 * - Render one post card with images and optional age guessing
 * - Preserve photo orientation-aware layout similar to my-tips
 * - Provide owner actions for post and image management
 * - Provide viewer actions for reporting content and zoom-based guessing
 *
 * Related APIs, components, or modules:
 * - lib/api/posts
 * - lib/api/images
 * - components/AgeGuessSlider
 * - components/EditImageModal
 * - components/ReportImageModal
 * - components/ReportPostModal
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import AgeGuessSlider from "@/components/AgeGuessSlider";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert, awConfirm } from "@/components/AwDialog";
import EmojiTextarea from "@/components/EmojiTextarea";
import EditImageModal, { type EditImageInitial } from "@/components/EditImageModal";
import ImageGalleryModal, { type GalleryImage } from "@/components/ImageGalleryModal";
import ReportCommentModal from "@/components/ReportCommentModal";
import ReportImageModal from "@/components/ReportImageModal";
import ReportPostModal from "@/components/ReportPostModal";
import { getMyLatestGuessAgesForImages, getPublicAgeGuessDetails, type PublicAgeGuessDetail } from "@/lib/api/ageGuesses";
import { createImageComment, deleteComment, getImageComments, type CommentRow } from "@/lib/api/comments";
import {
  getImageReactionDetails,
  getImageReactionSummary,
  type ImageReactionDetail,
  type ImageReactionKey,
  type ImageReactionSummary,
} from "@/lib/api/imageReactions";
import { buildCommentTree, type CommentNode } from "@/lib/commentsTree";
import { deleteMyImageCompletely, getMyImageForEdit, updateMyImageFile, updateMyImageMetadata } from "@/lib/api/images";
import { createPostStory } from "@/lib/api/postStories";
import { deleteMyPost, updateMyPostDetails } from "@/lib/api/posts";
import type { AwDirectionKey } from "@/lib/awDirections";
import { formatRelativeUiTimestamp } from "@/lib/utils/timeFormat";
import type { UiPost } from "@/types/ui";

type AnyPost = UiPost & Record<string, any>;
type AnyImage = Record<string, any>;
type ImageCommentsState = Record<number, CommentRow[]>;
type ImageReactionState = Record<number, ImageReactionSummary>;

type ReactionModalState =
  | { open: false; imageId: null }
  | { open: true; imageId: number };

type GuessModalState =
  | { open: false; imageId: null; totalCount: 0 }
  | { open: true; imageId: number; totalCount: number };

type PostGalleryImage = GalleryImage & {
  image: AnyImage;
  imageId: number;
};

const REACTION_OPTIONS: Array<{
  key: ImageReactionKey;
  label: string;
  emoji: string;
  bgClass: string;
}> = [
  { key: "like", label: "Like", emoji: "ðŸ‘", bgClass: "bg-sky-100" },
  { key: "clap", label: "Tleskám", emoji: "👏", bgClass: "bg-emerald-100" },
  { key: "care", label: "Podpora", emoji: "ðŸ¤—", bgClass: "bg-violet-100" },
  { key: "love", label: "Láska", emoji: "❤️", bgClass: "bg-rose-100" },
  { key: "insight", label: "Zajímavé", emoji: "💡", bgClass: "bg-amber-100" },
  { key: "fun", label: "Úsměv", emoji: "😊", bgClass: "bg-cyan-100" },
];

type LayoutRow<T> =
  | { type: "single"; item: T; fullWidth: boolean }
  | { type: "pair"; left: T; right: T | null };

type PostCardProps = {
  post: AnyPost;
  currentUserId: string | null;
  isSuperUser?: boolean;
  forceInlineGuess?: boolean;
  hideViewerMetadata?: boolean;
  showPostMenu?: boolean;
  onAgeGuess?: (imageId: number, age: number) => Promise<{ ok: boolean; message?: string } | void>;
  onPostDeleted?: () => void | Promise<void>;
  onImageRemovedFromPost?: () => void | Promise<void>;
  onPostChanged?: () => void | Promise<void>;
  onSavePost?: (postId: number) => void | Promise<void>;
  onHidePost?: (postId: number) => void | Promise<void>;
  onHideImage?: (imageId: number) => void | Promise<void>;
  hideAlbumBadge?: boolean;
  ownerInfoMode?: "default" | "aw_score";
  renderCaptionAboveImage?: boolean;
  enableOwnerComments?: boolean;
  focusImageId?: number | null;
  framelessImages?: boolean;
  borderlessCard?: boolean;
  hideTimestamps?: boolean;
  imageTileClassName?: string;
};

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatNum(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "-";
}

function formatCommentCount(count: number) {
  const safeCount = Math.max(0, Math.trunc(Number(count) || 0));
  if (safeCount === 1) return "1 komentář";
  if (safeCount >= 2 && safeCount <= 4) return `${safeCount} komentáře`;
  return `${safeCount} komentářů`;
}

function imagePreviewUrl(image: AnyImage, preferMedium: boolean): string {
  if (preferMedium) {
    return (
      image?.public_url_medium ??
      image?.publicUrlMedium ??
      image?.public_url_thumb ??
      image?.publicUrlThumb ??
      image?.public_url ??
      image?.publicUrl ??
      image?.url ??
      ""
    );
  }

  return (
    image?.public_url_thumb ??
    image?.publicUrlThumb ??
    image?.public_url_medium ??
    image?.publicUrlMedium ??
    image?.public_url ??
    image?.publicUrl ??
    image?.url ??
    ""
  );
}

function imageFullUrl(image: AnyImage): string {
  return image?.public_url ?? image?.publicUrl ?? image?.url ?? imagePreviewUrl(image, true);
}

function buildLayoutRows<T>(items: T[], isPortrait: (item: T) => boolean): LayoutRow<T>[] {
  if (items.length === 0) return [];

  const portraits = items.filter((item) => isPortrait(item));
  const landscapes = items.filter((item) => !isPortrait(item));
  const rows: LayoutRow<T>[] = [];

  function pushPairs(group: T[], leftoverFullWidth: boolean) {
    const pairableCount = group.length % 2 === 0 ? group.length : group.length - 1;

    for (let i = 0; i < pairableCount; i += 2) {
      rows.push({ type: "pair", left: group[i], right: group[i + 1] });
    }

    if (group.length % 2 === 1) {
      rows.push({ type: "single", item: group[group.length - 1], fullWidth: leftoverFullWidth });
    }
  }

  if (portraits.length === 0) {
    pushPairs(landscapes, true);
    return rows;
  }

  if (landscapes.length === 0) {
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
    rows.push({ type: "pair", left: firstMain[i], right: firstMain[i + 1] });
  }

  for (let i = 0; i < secondMain.length; i += 2) {
    rows.push({ type: "pair", left: secondMain[i], right: secondMain[i + 1] });
  }

  if (firstOdd && secondOdd) {
    rows.push({ type: "pair", left: firstGroup[firstGroup.length - 1], right: secondGroup[secondGroup.length - 1] });
  } else if (firstOdd) {
    rows.push({ type: "single", item: firstGroup[firstGroup.length - 1], fullWidth: true });
  } else if (secondOdd) {
    rows.push({ type: "single", item: secondGroup[secondGroup.length - 1], fullWidth: true });
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

function MenuButton(props: { onClick: () => void; label: string }) {
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

function MenuPanel(props: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-xl bg-white p-1 shadow-lg">
      {props.children}
    </div>
  );
}

function MenuAction(props: {
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <AwButton
      type="button"
      onClick={() => void props.onClick()}
      disabled={props.disabled}
      variant="tertiary"
      size="sm"
      className={[
        "flex w-full justify-start rounded-lg px-3 py-2 text-left no-underline",
        props.danger ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800" : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900",
      ].join(" ")}
    >
      {props.children}
    </AwButton>
  );
}

function OwnerInfoBox(props: {
  realAge: number | null;
  awAge: number | null;
  mode: "default" | "aw_score";
}) {
  const awScore = computeAwScorePct(props.realAge, props.awAge);

  return (
    <div className="w-fit max-w-full space-y-2 text-center text-xs">
      <div className={`inline-grid gap-1.5 ${props.mode === "aw_score" ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-xl bg-white px-2 py-1.5">
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-600">Vek</div>
          <div className="mt-1 text-[0.99rem] font-bold leading-none text-slate-900">{formatNum(props.realAge)}</div>
        </div>

        <div className="rounded-xl bg-white px-2 py-1.5">
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-600">AW věk</div>
          <div className="mt-1 text-[0.99rem] font-bold leading-none text-slate-900">{formatNum(props.awAge)}</div>
        </div>

        {props.mode === "aw_score" ? (
          <div className="rounded-xl bg-white px-2 py-1.5">
            <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-slate-600">AW skóre</div>
            <div className="mt-1 text-[0.99rem] font-bold leading-none text-slate-900">
              {awScore == null ? "-" : `${awScore >= 0 ? "+" : ""}${awScore.toFixed(1)} %`}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PostStoryBlock({ story }: { story: any }) {
  if (!story) return null;
  const images = Array.isArray(story.images) ? story.images : [];
  const body = String(story.body ?? "").trim();
  if (!body && images.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl bg-emerald-50/60 p-3">
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
      {Number(story.likesCount ?? 0) > 0 ? (
        <div className="mt-2 text-xs font-semibold text-emerald-800">{Number(story.likesCount)} reakcí</div>
      ) : null}
    </section>
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

function ReplyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 9 5 14l5 5" />
      <path d="M19 5v6a4 4 0 0 1-4 4H5" />
    </svg>
  );
}

function ReportIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function DeleteIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PhotoTile(props: {
  img: AnyImage;
  imageId: number | null;
  viewerGuessAge: number | null;
  isMine: boolean;
  isSuperUser: boolean;
  isPortrait: boolean;
  fullWidth: boolean;
  menuOpen: boolean;
  isHiddenByViewer?: boolean;
  busyKey: string | null;
  ownerInfoMode: "default" | "aw_score";
  canGuessInline: boolean;
  hideComment?: boolean;
  renderCommentAboveImage?: boolean;
  onSubmitGuess?: (imageId: number, age: number) => Promise<{ ok: boolean; message?: string }>;
  onThumbLoad: (imageId: number, el: HTMLImageElement | null) => void;
  onOpenZoom: (imageId: number) => void;
  onToggleMenu: (imageId: number | null) => void;
  onOpenEditImage: (imageId: number) => void;
  onDeleteImage: (imageId: number) => void;
  onReportImage: (imageId: number) => void;
  onHideImage?: (imageId: number) => void | Promise<void>;
  ownerFooterSlot?: ReactNode;
  containerId?: string;
  frameless?: boolean;
  tileClassName?: string;
  preferMediumPreview?: boolean;
  bareImage?: boolean;
}) {
  const { img, imageId, viewerGuessAge, isMine, isSuperUser, isPortrait, fullWidth, menuOpen, busyKey, ownerInfoMode, canGuessInline, onSubmitGuess } = props;
  const thumb = imagePreviewUrl(img, Boolean(props.preferMediumPreview));
  const aspectClass = thumbAspectClass(isPortrait, fullWidth);
  const imageClass = thumbImageClass(isPortrait);
  const widthClass = props.tileClassName ?? "w-full";
  const frameClass = props.bareImage
    ? "bg-transparent p-0"
    : props.frameless
      ? "bg-white"
      : "overflow-hidden rounded-2xl bg-slate-50 p-3";
  const imageShellClass = props.frameless ? "block w-full overflow-hidden rounded-xl bg-white" : "block w-full overflow-hidden rounded-xl bg-white";
  const imageInnerClass = props.frameless
    ? `w-full overflow-hidden rounded-xl bg-white ${aspectClass}`
    : `w-full overflow-hidden rounded-xl bg-white ${aspectClass}`;
  const initialGuessAge = viewerGuessAge;
  const hasViewerGuess = viewerGuessAge != null;
  const showInlineGuess = canGuessInline || hasViewerGuess;
  const challengeTags = Array.isArray(img?.challengeTags) ? img.challengeTags.slice(0, 2) : [];
  const zoomHint = isMine
    ? "Klikni pro zvětšení"
    : hasViewerGuess
      ? 'U této fotky jsi už tipoval. Tipuj i ostatní fotky z postu. Až dáš tip u všech, post se přesune do sekce "Moje tipy".'
      : 'Otipuj i tuto fotku. Až dáš tip u všech, post se přesune do sekce "Moje tipy".';

  return (
    <div id={props.containerId} className={`${widthClass} ${frameClass}`}>
      <div className={props.bareImage || props.frameless ? "group/photo relative" : "group/photo relative"}>
        {!props.hideComment && props.renderCommentAboveImage && img?.comment ? (
          <p className="mb-3 text-sm text-slate-700">{String(img.comment)}</p>
        ) : null}

        {thumb ? (
          <button
            type="button"
            onClick={() => imageId && props.onOpenZoom(imageId)}
            className={imageShellClass}
            title={zoomHint}
          >
            <div className={imageInnerClass}>
              <img
                src={thumb}
                alt={img?.comment ? String(img.comment) : "Fotka v postu"}
                className={imageClass}
                onLoad={(e) => imageId && props.onThumbLoad(imageId, e.currentTarget)}
              />
            </div>
          </button>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">Bez náhledu</div>
        )}

        {challengeTags.length > 0 ? (
          <div className="pointer-events-none absolute bottom-6 left-6 flex max-w-[calc(100%-3rem)] flex-wrap gap-2">
            {challengeTags.map((challenge: AnyImage) => (
              <Link
                key={String(challenge.id)}
                href={`/challenges/${String(challenge.id)}`}
                onClick={(event) => event.stopPropagation()}
                className="pointer-events-auto rounded-lg border border-white/70 bg-slate-950/80 px-2.5 py-1 text-xs font-bold text-white shadow-sm backdrop-blur"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                  backgroundSize: "8px 8px",
                }}
                title={String(challenge.title ?? "Výzva")}
              >
                #{String(challenge.tag ?? challenge.title ?? "vyzva")}
              </Link>
            ))}
          </div>
        ) : null}

        {imageId ? (
          <div
            className={`absolute right-3 top-3 transition-opacity sm:right-4 sm:top-4 ${
              menuOpen ? "opacity-100" : "opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover/photo:pointer-events-auto sm:group-hover/photo:opacity-100"
            }`}
          >
            <div className="relative">
              <MenuButton label="Možnosti fotky" onClick={() => props.onToggleMenu(imageId)} />

              {menuOpen ? (
                <MenuPanel>
                  {isMine ? (
                    <>
                      <MenuAction onClick={() => props.onOpenEditImage(imageId)} disabled={busyKey === `image-edit-${imageId}`}>
                        Upravit fotku
                      </MenuAction>
                      <MenuAction onClick={() => props.onDeleteImage(imageId)} danger disabled={busyKey === `image-delete-${imageId}`}>
                        Smazat fotku
                      </MenuAction>
                    </>
                  ) : (
                    <>
                      {props.onHideImage ? (
                        <MenuAction onClick={() => props.onHideImage?.(imageId)}>
                          {props.isHiddenByViewer ? "Zrušit skrytí fotky" : "Skrýt fotku"}
                        </MenuAction>
                      ) : null}
                      <MenuAction onClick={() => props.onReportImage(imageId)}>Nahlásit fotku</MenuAction>
                    </>
                  )}
                </MenuPanel>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className={props.bareImage ? "space-y-3 pt-3" : "space-y-3 px-3 pb-3 pt-3"}>
        {!props.hideComment && !props.renderCommentAboveImage && img?.comment ? (
          <p className="text-sm text-slate-700">{String(img.comment)}</p>
        ) : null}

        {isMine ? (
          props.ownerFooterSlot ?? (
            <OwnerInfoBox
              realAge={toNumber(img?.real_age_years)}
              awAge={toNumber(img?.aw_age_image)}
              mode={ownerInfoMode}
            />
          )
        ) : showInlineGuess && imageId && onSubmitGuess ? (
          <div className="rounded-xl bg-white p-3">
            <AgeGuessSlider
              key={`inline-guess-${imageId}-${String(initialGuessAge ?? "none")}`}
              imageId={imageId}
              initialAge={initialGuessAge}
              lockAfterSubmit={!isSuperUser}
              onSubmit={onSubmitGuess}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PostCard({
  post,
  currentUserId,
  isSuperUser = false,
  forceInlineGuess = false,
  hideViewerMetadata = false,
  showPostMenu = true,
  onAgeGuess,
  onPostDeleted,
  onImageRemovedFromPost,
  onPostChanged,
  onSavePost,
  onHidePost,
  onHideImage,
  hideAlbumBadge,
  ownerInfoMode = "default",
  renderCaptionAboveImage = false,
  enableOwnerComments = false,
  focusImageId = null,
  framelessImages = false,
  borderlessCard = false,
  hideTimestamps = false,
  imageTileClassName,
}: PostCardProps) {
  const postId = toNumber(post?.id);
  const authorUserId = String(post?.authorUserId ?? "");
  const isMine = !!currentUserId && currentUserId === authorUserId;
  const images = Array.isArray(post?.images) ? post.images : [];
  const canSeeViewerMetadata = isMine || isSuperUser || !hideViewerMetadata;

  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [imageMenuForId, setImageMenuForId] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostText, setEditPostText] = useState("");
  const [editPostBusy, setEditPostBusy] = useState(false);
  const [editPostError, setEditPostError] = useState<string | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyFiles, setStoryFiles] = useState<File[]>([]);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const storyFileInputRef = useRef<HTMLInputElement | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<EditImageInitial | null>(null);
  const [editSuccessToast, setEditSuccessToast] = useState(false);

  const [reportImageId, setReportImageId] = useState<number | null>(null);
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [reportCommentId, setReportCommentId] = useState<number | null>(null);
  const [commentMenuForId, setCommentMenuForId] = useState<number | null>(null);
  const [zoomImageId, setZoomImageId] = useState<number | null>(null);
  const [isPortraitByImageId, setIsPortraitByImageId] = useState<Record<number, boolean>>({});
  const [guessUnlockedByImageId, setGuessUnlockedByImageId] = useState<Record<number, boolean>>({});
  const [localGuessedAgeByImageId, setLocalGuessedAgeByImageId] = useState<Record<number, number>>({});
  const [openCommentsByImageId, setOpenCommentsByImageId] = useState<Record<number, boolean>>({});
  const [loadingCommentsByImageId, setLoadingCommentsByImageId] = useState<Record<number, boolean>>({});
  const [commentErrorByImageId, setCommentErrorByImageId] = useState<Record<number, string | null>>({});
  const [commentsByImageId, setCommentsByImageId] = useState<ImageCommentsState>({});
  const [commentCountByImageId, setCommentCountByImageId] = useState<Record<number, number>>({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState<Record<number, boolean>>({});
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState<Record<number, string>>({});
  const [replySubmittingByCommentId, setReplySubmittingByCommentId] = useState<Record<number, boolean>>({});
  const [reactionSummaryByImageId, setReactionSummaryByImageId] = useState<ImageReactionState>({});
  const [reactionDetailsByImageId, setReactionDetailsByImageId] = useState<Record<number, ImageReactionDetail[]>>({});
  const [reactionDetailsLoadingByImageId, setReactionDetailsLoadingByImageId] = useState<Record<number, boolean>>({});
  const [reactionModal, setReactionModal] = useState<ReactionModalState>({ open: false, imageId: null });
  const [reactionModalFilter, setReactionModalFilter] = useState<ImageReactionKey | "all">("all");
  const [guessDetailsByImageId, setGuessDetailsByImageId] = useState<Record<number, PublicAgeGuessDetail[]>>({});
  const [guessDetailsLoadingByImageId, setGuessDetailsLoadingByImageId] = useState<Record<number, boolean>>({});
  const [guessModal, setGuessModal] = useState<GuessModalState>({ open: false, imageId: null, totalCount: 0 });
  const requestedOwnerCommentCountsRef = useRef<Set<number>>(new Set());
  const authorLockedHint =
    "Jméno, popisky, skutečný věk a komentáře budou postupně zpřístupněny až po tipování věku";
  const showAnonymousPlaceholder = post?.identityRevealed === false;
  const isHiddenByViewer = Boolean(post?.isHiddenByViewer);

  const layoutRows = useMemo(
    () => buildLayoutRows(images, (img) => !!isPortraitByImageId[toNumber((img as AnyImage)?.id) ?? -1]),
    [images, isPortraitByImageId]
  );
  const hasSingleImage = images.length === 1;

  const zoomImage = useMemo(
    () => images.find((img) => toNumber((img as AnyImage)?.id) === zoomImageId) ?? null,
    [images, zoomImageId]
  ) as AnyImage | null;
  const galleryImages = useMemo<PostGalleryImage[]>(
    () =>
      images.reduce<PostGalleryImage[]>((acc, img, index) => {
        const image = (img as AnyImage) ?? {};
        const imageId = toNumber(image.id);
        const src = imageFullUrl(image);
        if (!imageId || !src) return acc;
        acc.push({
          id: imageId,
          imageId,
          image,
          src,
          alt: image?.comment ? String(image.comment) : `Fotka ${index + 1}`,
        });
        return acc;
      }, []),
    [images]
  );
  const galleryInitialIndex = zoomImageId
    ? Math.max(0, galleryImages.findIndex((item) => item.imageId === zoomImageId))
    : 0;

  const reactionModalSummary = reactionModal.open ? reactionSummaryByImageId[reactionModal.imageId] : undefined;
  const reactionModalDetails = reactionModal.open ? reactionDetailsByImageId[reactionModal.imageId] ?? [] : [];
  const guessModalDetails = guessModal.open ? guessDetailsByImageId[guessModal.imageId] ?? [] : [];
  const reactionModalFilteredDetails = useMemo(
    () =>
      reactionModalFilter === "all"
        ? reactionModalDetails
        : reactionModalDetails.filter((item) => item.reaction === reactionModalFilter),
    [reactionModalDetails, reactionModalFilter]
  );

  useEffect(() => {
    if (!editSuccessToast) return;
    const timeoutId = window.setTimeout(() => setEditSuccessToast(false), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [editSuccessToast]);

  useEffect(() => {
    if (!currentUserId) return;
    const safeCurrentUserId = currentUserId;

    const imageIds = images
      .map((image) => toNumber((image as AnyImage)?.id))
      .filter((id): id is number => id != null && id > 0);

    if (imageIds.length === 0) return;

    let cancelled = false;

    async function syncLatestGuessesFromDb() {
      const latestGuesses = await getMyLatestGuessAgesForImages(safeCurrentUserId, imageIds);
      if (cancelled || Object.keys(latestGuesses).length === 0) return;

      setLocalGuessedAgeByImageId((prev) => ({
        ...prev,
        ...latestGuesses,
      }));
    }

    void syncLatestGuessesFromDb();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, images]);

  useEffect(() => {
    if (!enableOwnerComments) return;
    const imageIds = images
      .map((image) => toNumber((image as AnyImage)?.id))
      .filter((id): id is number => id != null && id > 0);

    if (imageIds.length === 0) return;

    let cancelled = false;

    async function loadReactions() {
      try {
        const summary = await getImageReactionSummary(imageIds);
        if (cancelled) return;
        setReactionSummaryByImageId(summary);
      } catch (error) {
        console.error("Nepodařilo se načíst reakce fotek v my-posts.", error);
      }
    }

    void loadReactions();

    return () => {
      cancelled = true;
    };
  }, [enableOwnerComments, images]);

  useEffect(() => {
    if (!enableOwnerComments || !isMine) return;
    const imageIds = images
      .map((image) => toNumber((image as AnyImage)?.id))
      .filter((id): id is number => id != null && id > 0)
      .filter((id) => !requestedOwnerCommentCountsRef.current.has(id));

    if (imageIds.length === 0) return;

    let cancelled = false;
    imageIds.forEach((id) => requestedOwnerCommentCountsRef.current.add(id));

    async function loadOwnerCommentCounts() {
      await Promise.all(
        imageIds.map(async (imageId) => {
          try {
            const rows = await getImageComments(imageId);
            if (cancelled) return;
            setCommentsByImageId((prev) => ({ ...prev, [imageId]: rows }));
            setCommentCountByImageId((prev) => ({ ...prev, [imageId]: rows.length }));
          } catch (error) {
            requestedOwnerCommentCountsRef.current.delete(imageId);
            console.error("Nepodařilo se načíst počet komentářů v my-posts.", error);
          }
        })
      );
    }

    void loadOwnerCommentCounts();

    return () => {
      cancelled = true;
    };
  }, [enableOwnerComments, isMine, images]);

  useEffect(() => {
    if (!focusImageId || !enableOwnerComments || !isMine) return;
    const hasImage = images.some((image) => toNumber((image as AnyImage)?.id) === focusImageId);
    if (!hasImage) return;

    setOpenCommentsByImageId((prev) => ({ ...prev, [focusImageId]: true }));
    if (commentsByImageId[focusImageId] == null && !loadingCommentsByImageId[focusImageId]) {
      void loadCommentsForImage(focusImageId);
    }

    window.setTimeout(() => {
      document.getElementById(`post-photo-${focusImageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, [focusImageId, enableOwnerComments, isMine, images, commentsByImageId, loadingCommentsByImageId]);

  function getViewerGuessAge(image: AnyImage | null | undefined): number | null {
    const imageId = toNumber(image?.id);
    const backendGuessAge = toNumber(image?.viewerGuessedAge);
    if (backendGuessAge != null) return backendGuessAge;
    if (imageId && Number.isFinite(localGuessedAgeByImageId[imageId])) {
      return localGuessedAgeByImageId[imageId];
    }
    return null;
  }

  async function handleAgeGuess(imageId: number, age: number) {
    if (!onAgeGuess) return { ok: false as const, message: "Tipování není dostupné." };
    const result = await onAgeGuess(imageId, age);
    if (result && typeof result === "object" && "ok" in result && result.ok) {
      let confirmedAge =
        "guessedAge" in result && typeof result.guessedAge === "number" && Number.isFinite(result.guessedAge)
          ? result.guessedAge
          : age;

      if (currentUserId) {
        const dbGuesses = await getMyLatestGuessAgesForImages(currentUserId, [imageId]);
        if (typeof dbGuesses[imageId] === "number" && Number.isFinite(dbGuesses[imageId])) {
          confirmedAge = dbGuesses[imageId];
        }
      }

      setLocalGuessedAgeByImageId((prev) => ({ ...prev, [imageId]: confirmedAge }));
      setGuessUnlockedByImageId((prev) => ({ ...prev, [imageId]: true }));
      if (zoomImageId != null) {
        setZoomImageId(null);
      }
      await onPostChanged?.();
      return result;
    }
    if (result && typeof result === "object" && "ok" in result) return result;
    return { ok: true as const };
  }

  async function handleDeletePost() {
    if (!postId) return;
    const confirmed = await awConfirm({
      title: "Smazat post",
      message: "Opravdu smazat tento post?",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!confirmed) return;

    setBusyKey(`post-delete-${postId}`);
    try {
      await deleteMyPost(postId);
      await onPostDeleted?.();
      await onPostChanged?.();
    } catch (e: any) {
      await awAlert(e?.message ?? "Post se nepodařilo smazat.");
    } finally {
      setBusyKey(null);
      setPostMenuOpen(false);
    }
  }

  function handleOpenEditPost() {
    setEditPostTitle(String(post?.title ?? ""));
    setEditPostText(String(post?.text ?? ""));
    setEditPostError(null);
    setEditPostOpen(true);
    setPostMenuOpen(false);
  }

  async function handleSubmitEditPost() {
    if (!postId) return;
    const cleanTitle = editPostTitle.trim();
    if (!cleanTitle) {
      setEditPostError("Doplň prosím název příspěvku.");
      return;
    }

    setEditPostBusy(true);
    setEditPostError(null);
    try {
      await updateMyPostDetails({
        postId,
        title: cleanTitle,
        text: editPostText.trim(),
      });
      setEditPostOpen(false);
      await onPostChanged?.();
    } catch (e: any) {
      const message = e?.message ?? "Post se nepodařilo uložit.";
      setEditPostError(message);
      await awAlert(message);
    } finally {
      setEditPostBusy(false);
    }
  }

  function handleOpenStoryModal() {
    if ((post as any)?.story) {
      void awAlert("Tento post už příběh má. Úprava existujícího příběhu přijde v další části.");
      setPostMenuOpen(false);
      return;
    }

    setStoryText("");
    setStoryFiles([]);
    setStoryError(null);
    setStoryModalOpen(true);
    setPostMenuOpen(false);
  }

  function onPickStoryFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) setStoryFiles((prev) => [...prev, ...files].slice(0, 6));
    event.target.value = "";
  }

  async function handleSubmitStory() {
    if (!postId || !currentUserId) return;
    if (!storyText.trim() && storyFiles.length === 0) {
      setStoryError("Doplň text příběhu nebo přidej obrázek.");
      return;
    }

    setStoryBusy(true);
    setStoryError(null);
    try {
      await createPostStory({
        postId,
        currentUserId,
        body: storyText.trim(),
        imageFiles: storyFiles,
      });
      setStoryModalOpen(false);
      setStoryText("");
      setStoryFiles([]);
      await onPostChanged?.();
      await awAlert("Příběh byl přidán k postu.");
    } catch (e: any) {
      const message = e?.message ?? "Příběh se nepodařilo přidat.";
      setStoryError(message);
      await awAlert(message);
    } finally {
      setStoryBusy(false);
    }
  }

  async function handleSavePost() {
    if (!postId || !onSavePost) return;
    setBusyKey(`post-save-${postId}`);
    try {
      await onSavePost(postId);
      await onPostChanged?.();
    } catch (e: any) {
      await awAlert(e?.message ?? "Post se nepodařilo uložit.");
    } finally {
      setBusyKey(null);
      setPostMenuOpen(false);
    }
  }

  async function handleHidePost() {
    if (!postId || !onHidePost) return;
    setBusyKey(`post-hide-${postId}`);
    try {
      await onHidePost(postId);
      await onPostChanged?.();
    } catch (e: any) {
      await awAlert(e?.message ?? "Post se nepodařilo skrýt.");
    } finally {
      setBusyKey(null);
      setPostMenuOpen(false);
    }
  }

  async function handleOpenEditImage(imageId: number) {
    setBusyKey(`image-edit-${imageId}`);
    setEditError(null);
    try {
      const data = await getMyImageForEdit(imageId);
      setEditInitial({
        id: Number(data?.id),
        taken_at: data?.taken_at ?? null,
        photo_category: data?.photo_category ?? null,
        tags: Array.isArray(data?.tags) ? data.tags : null,
        aw_directions: Array.isArray(data?.aw_directions) ? data.aw_directions : null,
        include_in_global_aw: data?.include_in_global_aw ?? null,
        comment: data?.comment ?? null,
        public_url: data?.public_url ?? null,
        public_url_medium: data?.public_url_medium ?? null,
        public_url_thumb: data?.public_url_thumb ?? null,
      });
      setEditOpen(true);
    } catch (e: any) {
      await awAlert(e?.message ?? "Fotku se nepodařilo načíst pro editaci.");
    } finally {
      setBusyKey(null);
      setImageMenuForId(null);
    }
  }

  async function handleSaveImageEdit(payload: {
    imageId: number;
    takenAt: string;
    photoTags: string[];
    awDirections: AwDirectionKey[];
    includeInGlobalAw: boolean;
    comment: string | null;
    replacementFile?: File | null;
  }) {
    setEditBusy(true);
    setEditError(null);
    try {
      if (payload.replacementFile) {
        await updateMyImageFile({
          imageId: payload.imageId,
          file: payload.replacementFile,
        });
      }
      await updateMyImageMetadata(payload);
      setEditOpen(false);
      setEditInitial(null);
      setEditSuccessToast(true);
      await onPostChanged?.();
    } catch (e: any) {
      setEditError(e?.message ?? "Fotku se nepodařilo uložit.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    const confirmed = await awConfirm({
      title: "Smazat fotku",
      message: "Opravdu smazat tuto fotku?",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!confirmed) return;
    setBusyKey(`image-delete-${imageId}`);
    try {
      await deleteMyImageCompletely(imageId);
      await onImageRemovedFromPost?.();
      await onPostChanged?.();
    } catch (e: any) {
      await awAlert(e?.message ?? "Fotku se nepodařilo smazat.");
    } finally {
      setBusyKey(null);
      setImageMenuForId(null);
    }
  }

  const albumTitle = post?.albumTitle ? String(post.albumTitle) : null;

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

  async function loadCommentsForImage(imageId: number) {
    setLoadingCommentsByImageId((prev) => ({ ...prev, [imageId]: true }));
    setCommentErrorByImageId((prev) => ({ ...prev, [imageId]: null }));

    try {
      const rows = await getImageComments(imageId);
      setCommentsByImageId((prev) => ({ ...prev, [imageId]: rows }));
      setCommentCountByImageId((prev) => ({ ...prev, [imageId]: rows.length }));
    } catch (e: any) {
      setCommentErrorByImageId((prev) => ({ ...prev, [imageId]: e?.message ?? "Komentáře se nepodařilo načíst." }));
    } finally {
      setLoadingCommentsByImageId((prev) => ({ ...prev, [imageId]: false }));
    }
  }

  async function ensureReactionDetailsLoaded(imageId: number) {
    if (!Number.isFinite(imageId) || imageId <= 0) return;
    if (reactionDetailsByImageId[imageId] != null || reactionDetailsLoadingByImageId[imageId]) return;

    setReactionDetailsLoadingByImageId((prev) => ({ ...prev, [imageId]: true }));
    try {
      const rows = await getImageReactionDetails(imageId);
      setReactionDetailsByImageId((prev) => ({ ...prev, [imageId]: rows }));
    } catch (error) {
      console.error("Nepodařilo se načíst detail reakcí v my-posts.", error);
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

  async function ensureGuessDetailsLoaded(imageId: number) {
    if (guessDetailsByImageId[imageId] != null || guessDetailsLoadingByImageId[imageId]) return;

    setGuessDetailsLoadingByImageId((prev) => ({ ...prev, [imageId]: true }));
    try {
      const rows = await getPublicAgeGuessDetails(imageId);
      setGuessDetailsByImageId((prev) => ({ ...prev, [imageId]: rows }));
    } catch (error) {
      console.error("Nepodařilo se načíst detail tipu v my-posts.", error);
      setGuessDetailsByImageId((prev) => ({ ...prev, [imageId]: [] }));
    } finally {
      setGuessDetailsLoadingByImageId((prev) => ({ ...prev, [imageId]: false }));
    }
  }

  function openGuessDetails(imageId: number, totalCount: number) {
    setGuessModal({ open: true, imageId, totalCount });
    void ensureGuessDetailsLoaded(imageId);
  }

  async function toggleCommentsForImage(imageId: number) {
    const nextOpen = !openCommentsByImageId[imageId];
    setOpenCommentsByImageId((prev) => ({ ...prev, [imageId]: nextOpen }));

    if (nextOpen && commentsByImageId[imageId] == null && !loadingCommentsByImageId[imageId]) {
      await loadCommentsForImage(imageId);
    }
  }

  async function handleDeleteComment(commentId: number, imageId: number) {
    const confirmed = await awConfirm({
      title: "Smazat komentář",
      message: "Opravdu smazat tento komentář?",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!confirmed) return;
    setBusyKey(`comment-delete-${commentId}`);
    try {
      await deleteComment(commentId);
      await loadCommentsForImage(imageId);
      setCommentMenuForId(null);
    } catch (e: any) {
      await awAlert(e?.message ?? "Komentář se nepodařilo smazat.");
    } finally {
      setBusyKey(null);
    }
  }

  function handleReplyDraftChange(commentId: number, next: string) {
    setReplyDraftByCommentId((prev) => ({ ...prev, [commentId]: next }));
  }

  function toggleReply(commentId: number) {
    setReplyOpenByCommentId((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }

  async function handleReplyToComment(params: { imageId: number; commentId: number; body: string }) {
    const cleanBody = String(params.body ?? "").trim();
    if (!cleanBody || !postId) return;

    setReplySubmittingByCommentId((prev) => ({ ...prev, [params.commentId]: true }));
    try {
      const created = await createImageComment({
        imageId: params.imageId,
        postId,
        body: cleanBody,
        parentCommentId: params.commentId,
      });
      setCommentsByImageId((prev) => ({
        ...prev,
        [params.imageId]: [...(prev[params.imageId] ?? []), created],
      }));
      setCommentCountByImageId((prev) => ({ ...prev, [params.imageId]: (prev[params.imageId] ?? commentsByImageId[params.imageId]?.length ?? 0) + 1 }));
      setReplyDraftByCommentId((prev) => ({ ...prev, [params.commentId]: "" }));
      setReplyOpenByCommentId((prev) => ({ ...prev, [params.commentId]: false }));
    } catch (e: any) {
      await awAlert(e?.message ?? "Odpověď se nepodařilo uložit.");
    } finally {
      setReplySubmittingByCommentId((prev) => ({ ...prev, [params.commentId]: false }));
    }
  }

  function renderOwnerFooter(image: AnyImage | null | undefined) {
    const imageId = toNumber(image?.id);
    const infoBox = (
      <OwnerInfoBox
        realAge={toNumber(image?.real_age_years)}
        awAge={toNumber(image?.aw_age_image)}
        mode={ownerInfoMode}
      />
    );

    if (!enableOwnerComments || !isMine || !imageId) return infoBox;

    const open = Boolean(openCommentsByImageId[imageId]);
    const loading = Boolean(loadingCommentsByImageId[imageId]);
    const items = commentsByImageId[imageId] ?? [];
    const initialCommentCount = toNumber(image?.comments_count);
    const commentCount = commentsByImageId[imageId]?.length ?? commentCountByImageId[imageId] ?? initialCommentCount ?? 0;
    const commentTree = buildCommentTree(items);
    const error = commentErrorByImageId[imageId];
    const reactionSummary = reactionSummaryByImageId[imageId];
    const summaryReactionKeys = topReactionKeys(reactionSummary);
    const showReactionCount = hasRepeatedReaction(reactionSummary);
    const summaryTotal = reactionSummary?.total ?? 0;
    const guessesCount = toNumber(image?.guesses_count) ?? 0;
    const renderCommentNode = (comment: CommentNode, depth = 0): ReactNode => (
      <div
        key={comment.id}
        className="rounded-xl bg-slate-50 p-3"
        style={{ marginLeft: depth ? Math.min(depth * 12, 36) : 0 }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {comment.author_snapshot_avatar_url ? (
                <img
                  src={comment.author_snapshot_avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                  {String(comment.author_snapshot_display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {comment.author_snapshot_display_name ?? "Uživatel"}
                </div>
                <div className="text-xs text-slate-500">{formatRelativeUiTimestamp(comment.created_at)}</div>
              </div>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.body}</p>
          </div>

          <div className="relative flex shrink-0 items-start justify-end gap-1">
            <button
              type="button"
              onClick={() => toggleReply(comment.id)}
              className="inline-flex h-7 min-w-[104px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 bg-white px-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ReplyIcon className="h-3.5 w-3.5 text-black" />
              Odpovědět
            </button>
            <button
              type="button"
              onClick={() => setCommentMenuForId((current) => (current === comment.id ? null : comment.id))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-semibold leading-none text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
              aria-label="Možnosti komentáře"
              title="Možnosti komentáře"
            >
              ...
            </button>

            {commentMenuForId === comment.id ? (
              <div className="absolute right-0 top-8 z-20 min-w-[130px] rounded-xl bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => void handleDeleteComment(comment.id, imageId)}
                  disabled={busyKey === `comment-delete-${comment.id}`}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <DeleteIcon className="h-3.5 w-3.5 text-black" />
                  Smazat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportCommentId(comment.id);
                    setCommentMenuForId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                >
                  <ReportIcon className="h-3.5 w-3.5 text-black" />
                  Nahlásit
                </button>
              </div>
            ) : null}
          </div>

          {replyOpenByCommentId[comment.id] ? (
            <div className="col-span-2 rounded-xl bg-white p-2">
              <textarea
                value={replyDraftByCommentId[comment.id] ?? ""}
                onChange={(e) => handleReplyDraftChange(comment.id, e.target.value.slice(0, 1000))}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
                placeholder="Napiš odpověď..."
                disabled={replySubmittingByCommentId[comment.id]}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleReplyToComment({ imageId, commentId: comment.id, body: replyDraftByCommentId[comment.id] ?? "" })}
                  disabled={replySubmittingByCommentId[comment.id] || !(replyDraftByCommentId[comment.id] ?? "").trim()}
                  className="rounded-xl bg-[#32CD32] px-3 py-2 text-sm font-semibold text-white hover:bg-[#28b828] disabled:opacity-60"
                >
                  {replySubmittingByCommentId[comment.id] ? "Ukládám..." : "Odeslat odpověď"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {comment.replies.length > 0 ? (
          <div className="mt-2 space-y-2">{comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}</div>
        ) : null}
      </div>
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 pl-1">
          {summaryReactionKeys.length > 0 ? (
            <button
              type="button"
              onClick={() => openReactionDetails(imageId)}
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
            onClick={() => void toggleCommentsForImage(imageId)}
            className="text-[0.68rem] italic font-semibold text-slate-500 hover:text-slate-900"
          >
            {formatCommentCount(commentCount)}
          </button>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <div className="min-w-0">{infoBox}</div>

          <div className="flex w-fit max-w-full items-center gap-2 justify-self-end">
            <button
              type="button"
              onClick={() => openGuessDetails(imageId, guessesCount)}
              className="flex min-h-[38px] w-fit min-w-[96px] items-center justify-start rounded-xl bg-sky-50 px-3 py-2 text-[0.77rem] font-semibold text-sky-700 transition hover:bg-sky-100 hover:text-sky-900"
            >
              Tipů: {guessesCount}
            </button>

            <button
              type="button"
              onClick={() => void toggleCommentsForImage(imageId)}
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white px-0 py-0 text-[0.77rem] font-semibold transition ${
                open ? "text-emerald-700" : "text-slate-800 hover:bg-slate-100"
              }`}
              aria-label="Komentář"
              title="Komentář"
            >
              <CommentOutlineIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {open ? (
          <div className="space-y-3 rounded-xl bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void toggleCommentsForImage(imageId)}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                Skrýt komentáře
              </button>

              {loading ? <span className="text-xs text-slate-500">Načítám...</span> : null}
            </div>

            <div className="space-y-3">
              {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

              {!loading && !error && items.length === 0 ? (
                <div className="text-sm text-slate-500">Zatím tu nejsou žádné komentáře.</div>
              ) : null}

              {commentTree.map((comment) => renderCommentNode(comment))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {editSuccessToast ? (
        <div className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
          Změny uloženy
        </div>
      ) : null}

      <EditImageModal
        open={editOpen}
        initial={editInitial}
        busy={editBusy}
        error={editError}
        onClose={() => {
          if (editBusy) return;
          setEditOpen(false);
          setEditInitial(null);
          setEditError(null);
        }}
        onSave={handleSaveImageEdit}
      />

      <ReportImageModal
        open={reportImageId != null}
        imageId={reportImageId}
        onClose={() => setReportImageId(null)}
        onReported={() => setReportImageId(null)}
      />

      <ReportPostModal
        open={reportPostId != null}
        postId={reportPostId}
        onClose={() => setReportPostId(null)}
        onReported={() => setReportPostId(null)}
      />

      <ReportCommentModal
        open={reportCommentId != null}
        commentId={reportCommentId}
        onClose={() => setReportCommentId(null)}
        onReported={() => setReportCommentId(null)}
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
                <div className="py-8 text-center text-sm text-slate-500">Načítám reakce...</div>
              ) : reactionModalFilteredDetails.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">Zatím tu nejsou žádné reakce.</div>
              ) : (
                <div className="space-y-4">
                  {reactionModalFilteredDetails.map((item) => {
                    const reaction = reactionOptionByKey(item.reaction);
                    const displayName = String(item.displayName ?? item.userId ?? "Uživatel").trim() || "Uživatel";
                    const bio = String(item.bio ?? "").trim();

                    return (
                      <div
                        key={`${item.imageId}-${item.userId}-${item.reaction}-${item.createdAt ?? "now"}`}
                        className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-b-0"
                      >
                        <Link href={`/users/${item.userId}`} className="relative block h-14 w-14 shrink-0">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                            {item.avatarUrl ? (
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

      {guessModal.open && guessModal.imageId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setGuessModal({ open: false, imageId: null, totalCount: 0 })}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guess-modal-title"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h2 id="guess-modal-title" className="text-2xl font-semibold text-slate-900">
                Tipy
              </h2>

              <CloseButton onClick={() => setGuessModal({ open: false, imageId: null, totalCount: 0 })} label="Zavřít tipy" />
            </div>

            <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-600">
              Anonymní tipy ukazují hodnotu a čas, ale jméno tipujícího zůstává skryté.
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {guessDetailsLoadingByImageId[guessModal.imageId] ? (
                <div className="py-8 text-center text-sm text-slate-500">Načítám tipy...</div>
              ) : guessModalDetails.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">Zatím tu nejsou žádné tipy.</div>
              ) : (
                <div className="space-y-4">
                  {guessModalDetails.map((item) => {
                    const displayName = item.isAnonymous
                      ? "Anonymní tip"
                      : String(item.displayName ?? item.userId ?? "Uživatel").trim() || "Uživatel";
                    const bio = String(item.bio ?? "").trim();
                    const avatar = (
                      <div className="relative block h-14 w-14 shrink-0">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                          {item.avatarUrl && !item.isAnonymous ? (
                            <img src={item.avatarUrl} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg font-bold text-slate-700">{item.isAnonymous ? "?" : displayName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-sky-100 px-1 text-xs font-bold text-sky-800 shadow">
                          {item.guessedAge}
                        </span>
                      </div>
                    );

                    return (
                      <div key={`${item.imageId}-${item.userId}-${item.createdAt ?? "now"}`} className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-b-0">
                        {item.isAnonymous || !item.userId ? avatar : <Link href={`/users/${item.userId}`}>{avatar}</Link>}

                        <div className="min-w-0 flex-1">
                          {item.isAnonymous || !item.userId ? (
                            <div className="text-[1.05rem] font-semibold text-slate-900">{displayName}</div>
                          ) : (
                            <Link href={`/users/${item.userId}`} className="text-[1.05rem] font-semibold text-slate-900 hover:underline">
                              {displayName}
                            </Link>
                          )}
                          {item.createdAt ? <div className="text-xs text-slate-400">{formatRelativeUiTimestamp(item.createdAt)}</div> : null}
                          <div className="mt-1 text-sm font-semibold text-slate-700">Tip: {item.guessedAge} let</div>
                          {bio && !item.isAnonymous ? <div className="mt-1 text-sm text-slate-700">{bio}</div> : null}
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

      <ImageGalleryModal<PostGalleryImage>
        open={zoomImageId != null && galleryImages.length > 0}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => {
          if (zoomImageId) {
            setGuessUnlockedByImageId((prev) => ({ ...prev, [zoomImageId]: true }));
          }
          setZoomImageId(null);
        }}
        renderCaption={(item) =>
          renderCaptionAboveImage && item.image?.comment ? (
            <p className="mb-3 text-center text-sm text-white/90">{String(item.image.comment)}</p>
          ) : null
        }
        renderFooter={(item) => (
          <div className="mx-auto mt-3 max-w-3xl rounded-2xl bg-white p-3 shadow-xl">
            {isMine ? (
              <div className="space-y-3">
                <OwnerInfoBox
                  realAge={toNumber(item.image?.real_age_years)}
                  awAge={toNumber(item.image?.aw_age_image)}
                  mode={ownerInfoMode}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <AwButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setZoomImageId(null);
                      void handleOpenEditImage(item.imageId);
                    }}
                    disabled={busyKey === `image-edit-${item.imageId}`}
                    className="w-full no-underline sm:w-auto"
                  >
                    Editovat fotku
                  </AwButton>
                  <AwButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setZoomImageId(null);
                      void handleDeleteImage(item.imageId);
                    }}
                    disabled={busyKey === `image-delete-${item.imageId}`}
                    className="w-full no-underline sm:w-auto"
                  >
                    Smazat fotku
                  </AwButton>
                </div>
              </div>
            ) : onAgeGuess ? (
              <div className="rounded-xl bg-slate-50 p-3">
                <AgeGuessSlider
                  imageId={item.imageId}
                  initialAge={getViewerGuessAge(item.image)}
                  lockAfterSubmit={!isSuperUser}
                  onSubmit={handleAgeGuess}
                />
              </div>
            ) : null}

            {canSeeViewerMetadata && !hideTimestamps ? (
              <div className="mt-2 text-center text-[11px] text-slate-500">{formatRelativeUiTimestamp(item.image?.taken_at ?? null)}</div>
            ) : null}
          </div>
        )}
      />

      {editPostOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setEditPostOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-post-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="edit-post-title" className="text-base font-semibold text-slate-900">Editovat post</h2>
              <CloseButton onClick={() => setEditPostOpen(false)} label="Zavřít editaci postu" />
            </div>

            {editPostError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{editPostError}</div> : null}

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700">Název postu</span>
                <input
                  value={editPostTitle}
                  onChange={(event) => setEditPostTitle(event.target.value)}
                  disabled={editPostBusy}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700">Text postu</span>
                <EmojiTextarea
                  value={editPostText}
                  onChange={setEditPostText}
                  rows={4}
                  disabled={editPostBusy}
                  compact
                  className="min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <AwButton type="button" variant="secondary" onClick={() => setEditPostOpen(false)} disabled={editPostBusy}>Zrušit</AwButton>
              <AwButton type="button" variant="primary" onClick={() => void handleSubmitEditPost()} disabled={editPostBusy || !editPostTitle.trim()}>
                {editPostBusy ? "Ukládám..." : "Uložit změny"}
              </AwButton>
            </div>
          </div>
        </div>
      ) : null}

      {storyModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setStoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-story-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="add-story-title" className="text-base font-semibold text-slate-900">Přidat příběh k postu</h2>
              <CloseButton onClick={() => setStoryModalOpen(false)} label="Zavřít přidání příběhu" />
            </div>

            {storyError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{storyError}</div> : null}

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700">Text příběhu</span>
                <EmojiTextarea
                  value={storyText}
                  onChange={(next) => setStoryText(next.slice(0, 3000))}
                  rows={4}
                  disabled={storyBusy}
                  compact
                  placeholder="Doplň kontext k postu..."
                  className="min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <span className="text-right text-[11px] text-slate-500">{storyText.trim().length}/3000</span>
              </label>

              <div>
                <input ref={storyFileInputRef} type="file" multiple accept="image/*" onChange={onPickStoryFiles} className="hidden" disabled={storyBusy} />
                <AwButton type="button" variant="secondary" onClick={() => storyFileInputRef.current?.click()} disabled={storyBusy || storyFiles.length >= 6}>
                  Přidat obrázky příběhu
                </AwButton>
                {storyFiles.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {storyFiles.map((file, index) => (
                      <button
                        key={`${file.name}-${file.size}-${index}`}
                        type="button"
                        onClick={() => setStoryFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={storyBusy}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <AwButton type="button" variant="secondary" onClick={() => setStoryModalOpen(false)} disabled={storyBusy}>Zrušit</AwButton>
              <AwButton type="button" variant="primary" onClick={() => void handleSubmitStory()} disabled={storyBusy || (!storyText.trim() && storyFiles.length === 0)}>
                {storyBusy ? "Ukládám..." : "Přidat příběh"}
              </AwButton>
            </div>
          </div>
        </div>
      ) : null}

      <article
        className={
          framelessImages || borderlessCard
            ? "rounded-2xl bg-white p-3 sm:p-4"
            : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        }
      >
        <div className="flex items-start justify-between gap-4">
          {canSeeViewerMetadata ? (
            <div className="min-w-0">
              {showAnonymousPlaceholder ? (
                <div
                  className="min-h-[1.75rem] select-none text-base font-semibold text-transparent"
                  title={authorLockedHint}
                  aria-label={authorLockedHint}
                >
                  &nbsp;
                </div>
              ) : (
                <div className="text-base font-semibold text-slate-900">{post?.author ?? "Uživatel"}</div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                {!hideTimestamps && (post?.createdAt || post?.time) ? <span>{formatRelativeUiTimestamp(String(post?.createdAt ?? post?.time))}</span> : null}
                {!hideAlbumBadge && albumTitle ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Album: {albumTitle}</span>
                ) : null}
              </div>

              {post?.title ? <h3 className="mt-3 text-lg font-semibold text-slate-900">{String(post.title)}</h3> : null}
              {post?.text ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{String(post.text)}</p> : null}
              <PostStoryBlock story={(post as any)?.story ?? null} />
            </div>
          ) : (
            <div />
          )}

          {showPostMenu ? (
            <div className="relative shrink-0">
              <MenuButton
                label="Možnosti postu"
                onClick={() => {
                  setPostMenuOpen((v) => !v);
                  setImageMenuForId(null);
                }}
              />

              {postMenuOpen ? (
                <MenuPanel>
                  {isMine ? (
                    <>
                      <MenuAction onClick={handleOpenEditPost} disabled={editPostBusy}>Editovat post</MenuAction>
                      <MenuAction onClick={handleOpenStoryModal} disabled={storyBusy}>Přidat příběh k postu</MenuAction>
                      {onSavePost ? <MenuAction onClick={handleSavePost} disabled={busyKey === `post-save-${postId}`}>Uložit post</MenuAction> : null}
                      {onHidePost ? <MenuAction onClick={handleHidePost} disabled={busyKey === `post-hide-${postId}`}>Skrýt post</MenuAction> : null}
                      <MenuAction onClick={handleDeletePost} danger disabled={busyKey === `post-delete-${postId}`}>Smazat post</MenuAction>
                    </>
                  ) : (
                    <>
                      {onHidePost ? (
                        <MenuAction onClick={handleHidePost} disabled={busyKey === `post-hide-${postId}`}>
                          {isHiddenByViewer ? "Zrušit skrytí postu" : "Skrýt post"}
                        </MenuAction>
                      ) : null}
                      <MenuAction
                        onClick={() => {
                          if (!postId) {
                            void awAlert("Tento post se nepodařilo nahlásit.");
                            return;
                          }
                          setReportPostId(postId);
                          setPostMenuOpen(false);
                        }}
                      >
                        Nahlásit celý post
                      </MenuAction>
                    </>
                  )}
                </MenuPanel>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 space-y-3 sm:mt-4">
          {layoutRows.map((row, rowIndex) =>
            row.type === "single" ? (
              <PhotoTile
                key={`single-${postId}-${rowIndex}`}
                img={(row.item as AnyImage) ?? {}}
                imageId={toNumber((row.item as AnyImage)?.id)}
                viewerGuessAge={getViewerGuessAge((row.item as AnyImage) ?? null)}
                isMine={isMine}
                isSuperUser={isSuperUser}
                isPortrait={!!isPortraitByImageId[toNumber((row.item as AnyImage)?.id) ?? -1]}
                fullWidth={row.fullWidth}
                menuOpen={imageMenuForId === toNumber((row.item as AnyImage)?.id)}
                isHiddenByViewer={Boolean((row.item as AnyImage)?.isHiddenByViewer ?? post?.isHiddenByViewer)}
                busyKey={busyKey}
                ownerInfoMode={ownerInfoMode}
                canGuessInline={forceInlineGuess || !!guessUnlockedByImageId[toNumber((row.item as AnyImage)?.id) ?? -1]}
                hideComment={!canSeeViewerMetadata}
                renderCommentAboveImage={renderCaptionAboveImage}
                onSubmitGuess={handleAgeGuess}
                onThumbLoad={onThumbLoad}
                onOpenZoom={(imageId) => setZoomImageId(imageId)}
                onToggleMenu={(imageId) => {
                  setImageMenuForId(imageMenuForId === imageId ? null : imageId);
                  setPostMenuOpen(false);
                }}
                onOpenEditImage={handleOpenEditImage}
                onDeleteImage={handleDeleteImage}
                onHideImage={onHideImage}
                onReportImage={(imageId) => {
                  setReportImageId(imageId);
                  setImageMenuForId(null);
                }}
                ownerFooterSlot={renderOwnerFooter((row.item as AnyImage) ?? null)}
                containerId={`post-photo-${toNumber((row.item as AnyImage)?.id) ?? "x"}`}
                frameless={framelessImages}
                tileClassName={imageTileClassName}
                preferMediumPreview={hasSingleImage}
                bareImage={hasSingleImage}
              />
            ) : (
              <div key={`pair-${postId}-${rowIndex}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[row.left, row.right].map((img, colIndex) =>
                  img ? (
                    <PhotoTile
                      key={String(toNumber((img as AnyImage)?.id) ?? `${postId}-${rowIndex}-${colIndex}`)}
                      img={(img as AnyImage) ?? {}}
                      imageId={toNumber((img as AnyImage)?.id)}
                      viewerGuessAge={getViewerGuessAge((img as AnyImage) ?? null)}
                      isMine={isMine}
                      isSuperUser={isSuperUser}
                      isPortrait={!!isPortraitByImageId[toNumber((img as AnyImage)?.id) ?? -1]}
                      fullWidth={false}
                      menuOpen={imageMenuForId === toNumber((img as AnyImage)?.id)}
                      isHiddenByViewer={Boolean((img as AnyImage)?.isHiddenByViewer ?? post?.isHiddenByViewer)}
                      busyKey={busyKey}
                      ownerInfoMode={ownerInfoMode}
                      canGuessInline={forceInlineGuess || !!guessUnlockedByImageId[toNumber((img as AnyImage)?.id) ?? -1]}
                      hideComment={!canSeeViewerMetadata}
                      renderCommentAboveImage={renderCaptionAboveImage}
                      onSubmitGuess={handleAgeGuess}
                      onThumbLoad={onThumbLoad}
                      onOpenZoom={(imageId) => setZoomImageId(imageId)}
                      onToggleMenu={(imageId) => {
                        setImageMenuForId(imageMenuForId === imageId ? null : imageId);
                        setPostMenuOpen(false);
                      }}
                      onOpenEditImage={handleOpenEditImage}
                      onDeleteImage={handleDeleteImage}
                      onHideImage={onHideImage}
                      onReportImage={(imageId) => {
                        setReportImageId(imageId);
                        setImageMenuForId(null);
                      }}
                      ownerFooterSlot={renderOwnerFooter((img as AnyImage) ?? null)}
                      containerId={`post-photo-${toNumber((img as AnyImage)?.id) ?? "x"}`}
                      frameless={framelessImages}
                      tileClassName={imageTileClassName}
                      preferMediumPreview={false}
                      bareImage={false}
                    />
                  ) : (
                    <div key={`empty-${postId}-${rowIndex}-${colIndex}`} className="hidden sm:block" aria-hidden="true" />
                  )
                )}
              </div>
            )
          )}
        </div>
      </article>
    </>
  );
}

export default PostCard;





