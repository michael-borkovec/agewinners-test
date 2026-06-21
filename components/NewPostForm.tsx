/**
 * File purpose
 * - Create a new post with photo uploads and metadata.
 * - Upload photos, create image rows, create a post, and optionally assign it to an album.
 * - Related APIs, components, or modules
 *   - lib/api/images
 *   - lib/api/posts
 *   - lib/api/albums
 *   - components/EmojiTextarea.tsx
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert } from "@/components/AwDialog";
import EmojiTextarea from "@/components/EmojiTextarea";
import HelpIconButton from "@/components/HelpIconButton";
import ImageBlurEditor, { type BlurEllipse } from "@/components/ImageBlurEditor";
import { uploadAndCreateImage } from "@/lib/api/images";
import { createPostWithImages, normalizeImageTag, PHOTO_TAG_OPTIONS, type PhotoTag } from "@/lib/api/posts";
import { getMyImageTagOptions, type ImageTagOption } from "@/lib/api/stats";
import {
  AW_DIRECTIONS,
  AW_DIRECTION_LABELS,
  getAwDirectionTags,
  normalizeAwDirectionKeys,
  type AwDirectionKey,
} from "@/lib/awDirections";
import { createAlbum, getAlbumsByOwner } from "@/lib/api/albums";
import { createPostStory } from "@/lib/api/postStories";
import { listMyAwChallenges, type AwChallenge } from "@/lib/api/challenges";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthContext";
import { checkImageQuality, IMAGE_UPLOAD_LIMIT_BYTES } from "@/lib/image/clientImage";

type PickedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  takenAt: string;
  photoTags: PhotoTag[];
  awDirections: AwDirectionKey[];
  tagLabels: Record<string, string>;
  customTagDraft: string;
  includeInGlobalAw: boolean;
  comment: string;
  exifStatus: "unknown" | "found" | "missing" | "error";
  isPortrait: boolean | null;
  blurEllipses: BlurEllipse[];
  qualityWarning: string | null;
};

type OwnedAlbumOption = {
  id: number;
  title: string;
  description: string | null;
};

type TagModalState =
  | { open: false; photoId: null; kind: null }
  | { open: true; photoId: string; kind: "default" | "challenges" | "custom" | "direction" };

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readExifTakenAtYmd(file: File): Promise<string | null> {
  if (
    !file.type.includes("jpeg") &&
    !file.name.toLowerCase().endsWith(".jpg") &&
    !file.name.toLowerCase().endsWith(".jpeg")
  ) {
    return null;
  }

  const buf = await file.arrayBuffer();
  const view = new DataView(buf);

  if (view.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  const length = view.byteLength;

  while (offset + 4 < length) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xffda || marker === 0xffd9) break;
    if ((marker & 0xff00) !== 0xff00) break;

    const size = view.getUint16(offset, false);
    if (size < 2 || offset + size > length) break;

    if (marker === 0xffe1) {
      const start = offset + 2;

      if (
        start + 6 <= length &&
        view.getUint8(start) === 0x45 &&
        view.getUint8(start + 1) === 0x78 &&
        view.getUint8(start + 2) === 0x69 &&
        view.getUint8(start + 3) === 0x66 &&
        view.getUint8(start + 4) === 0x00 &&
        view.getUint8(start + 5) === 0x00
      ) {
        const tiff = start + 6;
        if (tiff + 8 > length) return null;

        const little = view.getUint8(tiff) === 0x49 && view.getUint8(tiff + 1) === 0x49;
        const getU16 = (p: number) => view.getUint16(p, little);
        const getU32 = (p: number) => view.getUint32(p, little);

        if (getU16(tiff + 2) !== 42) return null;

        const ifd0Offset = getU32(tiff + 4);
        const ifd0 = tiff + ifd0Offset;
        if (ifd0 + 2 > length) return null;

        const TAG_EXIF_IFD = 0x8769;
        const TAG_DATETIME = 0x0132;
        const TAG_DT_ORIGINAL = 0x9003;
        const TAG_DT_DIGITIZED = 0x9004;

        function readIfdEntries(ifdPtr: number) {
          const count = getU16(ifdPtr);
          const entries = new Map<number, { type: number; count: number; valueOffset: number }>();

          for (let i = 0; i < count; i++) {
            const entry = ifdPtr + 2 + i * 12;
            if (entry + 12 > length) break;

            const tag = getU16(entry);
            const type = getU16(entry + 2);
            const countVal = getU32(entry + 4);
            const valueOffset = getU32(entry + 8);

            entries.set(tag, { type, count: countVal, valueOffset });
          }

          return entries;
        }

        function readAscii(valueOffset: number, count: number) {
          const ptr = tiff + valueOffset;
          if (ptr < 0 || ptr + count > length) return null;

          let s = "";
          for (let i = 0; i < count; i++) {
            const c = view.getUint8(ptr + i);
            if (c === 0) break;
            s += String.fromCharCode(c);
          }
          return s.trim() || null;
        }

        const ifd0Entries = readIfdEntries(ifd0);
        const candidates: string[] = [];

        const exifPtrTag = ifd0Entries.get(TAG_EXIF_IFD);
        if (exifPtrTag) {
          const exifIfd = tiff + exifPtrTag.valueOffset;
          if (exifIfd + 2 <= length) {
            const exifEntries = readIfdEntries(exifIfd);

            for (const tagId of [TAG_DT_ORIGINAL, TAG_DT_DIGITIZED]) {
              const t = exifEntries.get(tagId);
              if (t && t.type === 2 && t.count >= 10) {
                const raw = readAscii(t.valueOffset, t.count);
                if (raw) candidates.push(raw);
              }
            }
          }
        }

        const t0 = ifd0Entries.get(TAG_DATETIME);
        if (t0 && t0.type === 2 && t0.count >= 10) {
          const raw = readAscii(t0.valueOffset, t0.count);
          if (raw) candidates.push(raw);
        }

        for (const raw of candidates) {
          const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})/);
          if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        }
      }
    }

    offset += size;
  }

  return null;
}

function previewFrameClass(isPortrait: boolean | null) {
  if (isPortrait === true) return "h-40 w-28";
  if (isPortrait === false) return "h-28 w-40";
  return "h-32 w-32";
}

function formatFallbackTagLabel(tag: string) {
  return tag
    .replace(/^#/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function PhotoTagHelp() {
  return (
    <HelpIconButton
      helpText="Tagy pomáhají fotku zařadit do správného kontextu pro filtrování, výzvy a pozdější statistiky."
      helpKey="photo-tags"
      modalTitle="Nápověda - tagy fotek"
      className="shrink-0 p-0.5"
      iconClassName="h-4 w-4"
    />
  );
}

function TagSelectionModal({
  kind,
  photo,
  taggedChallenges,
  customTagHistory,
  onClose,
  onToggleTag,
  onAddCustomTag,
  onDraftChange,
}: {
  kind: "default" | "challenges" | "custom" | "direction";
  photo: PickedPhoto;
  taggedChallenges: AwChallenge[];
  customTagHistory: ImageTagOption[];
  onClose: () => void;
  onToggleTag: (photoId: string, tag: string) => void;
  onAddCustomTag: (photoId: string, tag?: string, label?: string) => void;
  onDraftChange: (photoId: string, value: string) => void;
}) {
  const selectedTags = new Set(photo.photoTags.map(normalizeImageTag).filter(Boolean));
  const directionTagOptions = getAwDirectionTags(photo.awDirections);
  const title =
    kind === "default"
      ? "Výchozí tagy"
      : kind === "challenges"
        ? "Moje výzvy"
        : kind === "direction"
          ? "Tagy AW směru"
          : "Vlastní tagy";
  const description =
    kind === "default"
      ? "Vyber jeden nebo více výchozích tagů pro tuto fotku."
      : kind === "challenges"
        ? "Vyber výzvy, ke kterým má tato fotka patřit."
        : kind === "direction"
          ? "Vyber tagy podle zvolených AW směrů. AW sleduje dojem z fotky, ne zdravotní účinek."
          : "Přidej nový vlastní tag nebo vyber některý z historie.";

  function chipClass(selected: boolean) {
    return [
      "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2",
      selected
        ? "bg-[#32CD32] text-white shadow-sm"
        : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
    ].join(" ");
  }

  function addDraftTag() {
    if (!photo.customTagDraft.trim()) return;
    onAddCustomTag(photo.id);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-900">{title}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <CloseButton type="button" onClick={onClose} />
        </div>

        {kind === "default" ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {PHOTO_TAG_OPTIONS.map((option) => {
              const selected = selectedTags.has(normalizeImageTag(option.value));
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggleTag(photo.id, option.value)}
                  className={chipClass(selected)}
                >
                  {selected ? <span aria-hidden="true">?</span> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {kind === "challenges" ? (
          <div className="mt-5 grid gap-2">
            {taggedChallenges.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Zatím nemáš žádnou výzvu s tagem. Tag vytvoříš v sekci Výzvy a změny.
              </div>
            ) : (
              taggedChallenges.map((challenge) => {
                const challengeTag = normalizeImageTag(challenge.challenge_tag);
                const selected = selectedTags.has(challengeTag);
                return (
                  <button
                    key={challenge.id}
                    type="button"
                    onClick={() => onToggleTag(photo.id, challengeTag)}
                    className={`${chipClass(selected)} justify-between text-left`}
                  >
                    <span>
                      {selected ? <span aria-hidden="true">? </span> : null}
                      Výzva: {challenge.title}
                    </span>
                    <span className={selected ? "text-emerald-50" : "text-slate-400"}>#{challenge.challenge_tag}</span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}

        {kind === "direction" ? (
          <div className="mt-5">
            {directionTagOptions.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nejdřív vyber AW směr fotky.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {directionTagOptions.map((option) => {
                  const selected = selectedTags.has(normalizeImageTag(option.tag));
                  return (
                    <button
                      key={`${option.directionKey}-${option.tag}`}
                      type="button"
                      onClick={() => onToggleTag(photo.id, option.tag)}
                      className={chipClass(selected)}
                      title={AW_DIRECTION_LABELS[option.directionKey]}
                    >
                      {selected ? <span aria-hidden="true">?</span> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {kind === "custom" ? (
          <div className="mt-5 grid gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Nový tag</label>
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  value={photo.customTagDraft}
                  onChange={(event) => onDraftChange(photo.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addDraftTag();
                    }
                  }}
                  placeholder="Např. MojePromena"
                />
                <AwButton
                  type="button"
                  onClick={addDraftTag}
                  disabled={!photo.customTagDraft.trim()}
                  variant="primary"
                >
                  Přidat tag
                </AwButton>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Vybrat z historie</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {customTagHistory.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Zatím nemáš žádné vlastní tagy v historii.</div>
                ) : (
                  customTagHistory.map((option) => {
                    const normalized = normalizeImageTag(option.tag);
                    const selected = selectedTags.has(normalized);
                    return (
                      <button
                        key={normalized}
                        type="button"
                        onClick={() => (selected ? onToggleTag(photo.id, normalized) : onAddCustomTag(photo.id, normalized, option.label))}
                        className={chipClass(selected)}
                      >
                        {selected ? <span aria-hidden="true">?</span> : null}
                        {option.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <AwButton
            type="button"
            onClick={onClose}
            variant="primary"
          >
            Hotovo
          </AwButton>
        </div>
      </div>
    </div>
  );
}

export function NewPostForm({ onCreated }: { onCreated?: () => void }) {
  const { userId } = useAuth();

  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [ownedAlbums, setOwnedAlbums] = useState<OwnedAlbumOption[]>([]);
  const [taggedChallenges, setTaggedChallenges] = useState<AwChallenge[]>([]);
  const [addToAlbumRequested, setAddToAlbumRequested] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | "new" | "">("");
  const [albumTitleDraft, setAlbumTitleDraft] = useState("");
  const [albumDescriptionDraft, setAlbumDescriptionDraft] = useState("");
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyImageFiles, setStoryImageFiles] = useState<File[]>([]);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [uploadProgressLabel, setUploadProgressLabel] = useState("");
  const [photoProcessingConsentChecked, setPhotoProcessingConsentChecked] = useState(false);
  const [tagModal, setTagModal] = useState<TagModalState>({ open: false, photoId: null, kind: null });
  const [customTagHistory, setCustomTagHistory] = useState<ImageTagOption[]>([]);
  const [blurEditorPhotoId, setBlurEditorPhotoId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      if (!userId) {
        setOwnedAlbums([]);
        setTaggedChallenges([]);
        return;
      }

      setAlbumsLoading(true);
      try {
        const [rows, challenges, tagOptions] = await Promise.all([getAlbumsByOwner(userId), listMyAwChallenges(), getMyImageTagOptions()]);
        if (cancelled) return;

        setOwnedAlbums(
          (rows ?? []).map((a: any) => ({
            id: Number(a.id),
            title: String(a.title ?? ""),
            description: a.description ?? null,
          }))
        );
        setTaggedChallenges(
          challenges.filter((challenge) => challenge.photo_scope === "challenge_tag" && Boolean(challenge.challenge_tag))
        );
        const challengeTags = new Set(
          challenges
            .map((challenge) => normalizeImageTag(challenge.challenge_tag))
            .filter(Boolean)
        );
        const predefinedTags = new Set(PHOTO_TAG_OPTIONS.map((option) => normalizeImageTag(option.value)));
        setCustomTagHistory(
          tagOptions.filter((option) => {
            const tag = normalizeImageTag(option.tag);
            return tag && !option.predefined && !predefinedTags.has(tag) && !challengeTags.has(tag);
          })
        );
      } catch (e) {
        console.warn("NewPostForm: options load failed", e);
        if (!cancelled) {
          setOwnedAlbums([]);
          setTaggedChallenges([]);
          setCustomTagHistory([]);
        }
      } finally {
        if (!cancelled) setAlbumsLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const canSubmit = !busy;

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setFormError(null);

    const placeholders: PickedPhoto[] = [];
    const rejectedMessages: string[] = [];

    for (const f of files) {
      if (f.size > IMAGE_UPLOAD_LIMIT_BYTES) {
        rejectedMessages.push(`${f.name}: Fotka je výrazně větší než běžný mobilní snímek. Zkus prosím vybrat menší verzi.`);
        continue;
      }

      try {
        const quality = await checkImageQuality(f);
        if (quality.status === "too_small") {
          rejectedMessages.push(`${f.name}: ${quality.message ?? "Fotka má příliš nízké rozlišení pro přesné tipování."}`);
          continue;
        }

        placeholders.push({
          id: uid(),
          file: f,
          previewUrl: URL.createObjectURL(f),
          takenAt: "",
          photoTags: [],
          awDirections: [],
          tagLabels: {},
          customTagDraft: "",
          includeInGlobalAw: true,
          comment: "",
          exifStatus: "unknown",
          isPortrait: quality.height > quality.width,
          blurEllipses: [],
          qualityWarning: quality.status === "usable_with_warning" ? quality.message : null,
        });
      } catch {
        rejectedMessages.push(`${f.name}: Fotku se nepodařilo načíst. Zkus prosím jiný soubor.`);
      }
    }

    if (rejectedMessages.length > 0) {
      setFormError(rejectedMessages.join(" "));
    }

    if (placeholders.length === 0) {
      e.target.value = "";
      return;
    }

    setPhotos((prev) => [...prev, ...placeholders]);
    e.target.value = "";

    for (const ph of placeholders) {
      try {
        const exifYmd = await readExifTakenAtYmd(ph.file);
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.id !== ph.id) return p;
            if (exifYmd) return { ...p, takenAt: exifYmd, exifStatus: "found" };
            return { ...p, exifStatus: "missing" };
          })
        );
      } catch {
        setPhotos((prev) => prev.map((p) => (p.id === ph.id ? { ...p, exifStatus: "error" } : p)));
      }
    }
  }

  function onPickStoryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) {
      setStoryImageFiles((prev) => [...prev, ...files].slice(0, 6));
    }
    e.target.value = "";
  }

  function removeStoryImage(index: number) {
    setStoryImageFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function updatePhoto(id: string, patch: Partial<PickedPhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function togglePhotoTag(photoId: string, tag: string) {
    const normalized = normalizeImageTag(tag);
    if (!normalized) return;

    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id !== photoId) return photo;
        const current = new Set(photo.photoTags.map(normalizeImageTag).filter(Boolean));
        if (current.has(normalized)) current.delete(normalized);
        else current.add(normalized);
        return { ...photo, photoTags: Array.from(current) };
      })
    );
  }

  function togglePhotoDirection(photoId: string, directionKey: AwDirectionKey) {
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id !== photoId) return photo;
        const current = new Set(normalizeAwDirectionKeys(photo.awDirections));
        if (current.has(directionKey)) current.delete(directionKey);
        else current.add(directionKey);
        return { ...photo, awDirections: Array.from(current) };
      })
    );
  }

  function removePhotoTag(photoId: string, tag: string) {
    const normalized = normalizeImageTag(tag);
    if (!normalized) return;

    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id !== photoId) return photo;
        const nextLabels = { ...photo.tagLabels };
        delete nextLabels[normalized];
        return {
          ...photo,
          photoTags: photo.photoTags.map(normalizeImageTag).filter((item) => item && item !== normalized),
          tagLabels: nextLabels,
        };
      })
    );
  }

  function addCustomPhotoTag(photoId: string, explicitTag?: string, explicitLabel?: string) {
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id !== photoId) return photo;
        const rawTag = explicitTag ?? photo.customTagDraft;
        const normalized = normalizeImageTag(rawTag);
        if (!normalized) return photo;
        const label = (explicitLabel ?? rawTag).trim() || normalized;
        return {
          ...photo,
          photoTags: Array.from(new Set([...photo.photoTags.map(normalizeImageTag).filter(Boolean), normalized])),
          tagLabels: {
            ...photo.tagLabels,
            [normalized]: label,
          },
          customTagDraft: "",
        };
      })
    );
  }

  function updatePhotoOrientation(id: string, img: HTMLImageElement | null) {
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;

    const isPortrait = h > w;
    setPhotos((prev) => prev.map((p) => (p.id === id && p.isPortrait !== isPortrait ? { ...p, isPortrait } : p)));
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const hit = prev.find((p) => p.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function applyBlurredPhoto(photoId: string, payload: { file: File; previewUrl: string; ellipses: BlurEllipse[] }) {
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id !== photoId) return photo;
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
        return {
          ...photo,
          file: payload.file,
          previewUrl: payload.previewUrl,
          blurEllipses: [...photo.blurEllipses, ...payload.ellipses],
          isPortrait: null,
        };
      })
    );
    setBlurEditorPhotoId(null);
  }

  function setError(msg: string) {
    setFormError(msg);
  }

  function setOverallUploadProgress(params: { photoIndex: number; photoCount: number; photoPercent: number; label: string }) {
    const { photoIndex, photoCount, photoPercent, label } = params;
    if (photoCount <= 0) {
      setUploadProgressPct(0);
      setUploadProgressLabel(label);
      return;
    }

    const normalizedPhotoPercent = Math.max(0, Math.min(100, photoPercent));
    const totalPercent = ((photoIndex + normalizedPhotoPercent / 100) / photoCount) * 92;

    setUploadProgressPct(Math.max(1, Math.min(92, Math.round(totalPercent))));
    setUploadProgressLabel(`Fotka ${photoIndex + 1} z ${photoCount}: ${label}`);
  }

  function applyFirstDateToAll() {
    if (photos.length < 2) return;
    const first = photos[0]?.takenAt ?? "";
    if (!first) return;

    setPhotos((prev) =>
      prev.map((p, idx) => {
        if (idx === 0) return p;
        return { ...p, takenAt: first };
      })
    );
  }

  function tagLabel(photo: PickedPhoto, tag: string) {
    const normalized = normalizeImageTag(tag);
    const predefined = PHOTO_TAG_OPTIONS.find((option) => normalizeImageTag(option.value) === normalized);
    if (predefined) return predefined.label;

    const challenge = taggedChallenges.find((item) => normalizeImageTag(item.challenge_tag) === normalized);
    if (challenge) return `Výzva: ${challenge.title}`;

    const directionTag = getAwDirectionTags(photo.awDirections).find((option) => normalizeImageTag(option.tag) === normalized);
    if (directionTag) return directionTag.label;

    return photo.tagLabels[normalized] ?? customTagHistory.find((option) => normalizeImageTag(option.tag) === normalized)?.label ?? formatFallbackTagLabel(normalized);
  }

  async function submit() {
    setFormError(null);

    if (!userId) return setError("Nejsi přihlášený.");
    if (!title.trim()) return setError("Doplň prosím název příspěvku.");
    if (photos.length === 0) return setError("Vyber alespon jednu fotku.");
    if (!photoProcessingConsentChecked) {
      return setError("Pro vytvoření postu je potřeba potvrdit souhlas se zpracováním fotografie.");
    }
    if (photos.some((p) => !p.takenAt)) return setError("U všech fotek vyber datum pořízení (taken_at).");
    if (addToAlbumRequested) {
      if (!selectedAlbumId) return setError("Vyber album nebo zvol vytvoření nového alba.");
      if (selectedAlbumId === "new" && !albumTitleDraft.trim()) return setError("Zadej název alba.");
    }

    setBusy(true);
    setUploadProgressPct(2);
    setUploadProgressLabel("Připravuji nahrávání fotek");

    try {
      const createdImageIds: number[] = [];
      for (const [index, p] of photos.entries()) {
        const res: any = await uploadAndCreateImage({
          file: p.file,
          takenAt: p.takenAt,
          photoTags: p.photoTags,
          awDirections: p.awDirections,
          includeInGlobalAw: p.includeInGlobalAw,
          comment: p.comment?.trim() ? p.comment.trim().slice(0, 50) : null,
          onProgress: ({ percent, label }) =>
            setOverallUploadProgress({
              photoIndex: index,
              photoCount: photos.length,
              photoPercent: percent,
              label,
            }),
        });

        const imageId = Number(res?.id);
        if (!Number.isFinite(imageId)) throw new Error("Upload fotky selhal, chybí id.");
        createdImageIds.push(imageId);
      }

      setUploadProgressPct(95);
      setUploadProgressLabel("Dokončuji vytvoření postu");
      const created = await createPostWithImages({
        currentUserId: userId,
        title: title.trim(),
        text: text.trim(),
        imageIds: createdImageIds,
      });

      const postId = Number((created as any)?.postId);
      if (!Number.isFinite(postId) || postId <= 0) {
        throw new Error("Post se vytvořil, ale chybí postId.");
      }

      if (addToAlbumRequested) {
        let albumIdToUse: number | null = null;
        setUploadProgressPct(97);
        setUploadProgressLabel("Dokončuji přiřazení do alba");

        if (selectedAlbumId === "new") {
          const createdAlbum = await createAlbum({
            ownerUserId: userId,
            title: albumTitleDraft.trim(),
            description: albumDescriptionDraft.trim() ? albumDescriptionDraft.trim() : undefined,
          });

          albumIdToUse = Number((createdAlbum as any)?.id);
          if (!Number.isFinite(albumIdToUse) || albumIdToUse <= 0) {
            throw new Error("Album se vytvořilo, ale chybí jeho ID.");
          }
        } else {
          albumIdToUse = Number(selectedAlbumId);
        }

        if (!Number.isFinite(albumIdToUse) || albumIdToUse <= 0) {
          throw new Error("Nepodařilo se určit album pro tento post.");
        }

        await supabase.from("post_albums").delete().eq("post_id", postId);

        const { error: relErr } = await supabase.from("post_albums").insert({
          post_id: postId,
          album_id: albumIdToUse,
          sort_order: 0,
        });

        if (relErr) throw relErr;
      }

      if (storyText.trim() || storyImageFiles.length > 0) {
        setUploadProgressPct(98);
        setUploadProgressLabel("Ukládám příběh autora");
        await createPostStory({
          postId,
          currentUserId: userId,
          body: storyText.trim(),
          imageFiles: storyImageFiles,
        });
      }

      setUploadProgressPct(100);
      setUploadProgressLabel("Hotovo");
      photos.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setTitle("");
      setText("");
      setAddToAlbumRequested(false);
      setSelectedAlbumId("");
      setAlbumTitleDraft("");
      setAlbumDescriptionDraft("");
      setStoryOpen(false);
      setStoryText("");
      setStoryImageFiles([]);
      setFormError(null);

      if (userId) {
        try {
          const rows = await getAlbumsByOwner(userId);
          setOwnedAlbums(
            (rows ?? []).map((a: any) => ({
              id: Number(a.id),
              title: String(a.title ?? ""),
              description: a.description ?? null,
            }))
          );
        } catch {}
      }

      onCreated?.();
      await awAlert(addToAlbumRequested ? "Post vytvořen a přidán do alba." : "Post vytvořen.");
    } catch (e: any) {
      const msg = e?.message ?? "Post se nepodařilo vytvořit.";
      setFormError(msg);
      await awAlert(`Nelze odeslat: ${msg}`);
    } finally {
      setBusy(false);
      setUploadProgressPct(0);
      setUploadProgressLabel("");
    }
  }

  const blurEditorPhoto = blurEditorPhotoId ? photos.find((photo) => photo.id === blurEditorPhotoId) ?? null : null;
  const tagModalPhoto = tagModal.open ? photos.find((photo) => photo.id === tagModal.photoId) ?? null : null;

  return (
    <div className="rounded-xl bg-white p-4">
      <ImageBlurEditor
        open={Boolean(blurEditorPhoto)}
        file={blurEditorPhoto?.file ?? null}
        previewUrl={blurEditorPhoto?.previewUrl ?? null}
        onCancel={() => setBlurEditorPhotoId(null)}
        onSave={(payload) => {
          if (!blurEditorPhotoId) return;
          applyBlurredPhoto(blurEditorPhotoId, payload);
        }}
      />

      {tagModal.open && tagModalPhoto ? (
        <TagSelectionModal
          kind={tagModal.kind}
          photo={tagModalPhoto}
          taggedChallenges={taggedChallenges}
          customTagHistory={customTagHistory}
          onClose={() => setTagModal({ open: false, photoId: null, kind: null })}
          onToggleTag={togglePhotoTag}
          onAddCustomTag={addCustomPhotoTag}
          onDraftChange={(photoId, value) => updatePhoto(photoId, { customTagDraft: value.slice(0, 40) })}
        />
      ) : null}

      <h2 className="text-base font-semibold">Přidat nový post</h2>

      <div className="mt-3 grid gap-3">
        {formError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Nelze odeslat: <span className="font-semibold">{formError}</span>
          </div>
        ) : null}

        {!userId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Nejsi přihlášený, pro vytvoření postu se prosím přihlas.
          </div>
        ) : null}

        {busy ? (
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm font-medium text-emerald-950">
              <span>{uploadProgressLabel || "Nahrávám fotky"}</span>
              <span className="tabular-nums">{uploadProgressPct} %</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-[#32CD32] transition-[width] duration-300 ease-out"
                style={{ width: `${uploadProgressPct}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-emerald-900/80">
              Fotky se právě nahrávají. Nech tuto stránku otevřenou, prosím.
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-sm text-slate-700">
            Název příspěvku <span className="text-rose-700">*</span>
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Napr. Muj pokrok"
            disabled={busy}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-700">
            Text příspěvku
          </label>
          <EmojiTextarea
            value={text}
            onChange={setText}
            placeholder="Napiš krátký popis..."
            rows={3}
            disabled={busy}
            panelClassName="mt-1"
            className="min-h-[84px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <p className="mt-1 text-xs text-slate-500">Text je volitelný.</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setStoryOpen((value) => !value)}
            disabled={busy}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">Přidat příběh k postu</span>
              <span className="mt-1 block text-xs text-slate-600">
                Volitelný autorský kontext se ukáže až po odhalení postu v Moje tipy.
              </span>
            </span>
            <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700">
              {storyOpen ? "Sbalit" : "Rozbalit"}
            </span>
          </button>

          {storyOpen ? (
            <div className="mt-3 grid gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Text příběhu</label>
                <EmojiTextarea
                  value={storyText}
                  onChange={(next) => setStoryText(next.slice(0, 3000))}
                  placeholder="Doplň, co je za fotkami, změnou nebo momentem..."
                  rows={4}
                  disabled={busy}
                  panelClassName="mt-1"
                  className="min-h-[112px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <div className="mt-1 text-right text-[11px] text-slate-500">{storyText.trim().length}/3000</div>
              </div>

              <div>
                <input
                  ref={storyFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onPickStoryFiles}
                  className="hidden"
                  disabled={busy}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <AwButton
                    type="button"
                    onClick={() => storyFileInputRef.current?.click()}
                    disabled={busy || storyImageFiles.length >= 6}
                    variant="secondary"
                  >
                    Přidat obrázky příběhu
                  </AwButton>
                  <span className="text-xs text-slate-500">Až 6 obrázků, odděleně od tipovaných fotek.</span>
                </div>

                {storyImageFiles.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {storyImageFiles.map((file, index) => (
                      <button
                        key={`${file.name}-${file.size}-${index}`}
                        type="button"
                        onClick={() => removeStoryImage(index)}
                        disabled={busy}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-rose-50 hover:text-rose-700"
                        title="Kliknutím obrázek odebereš."
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm text-slate-700">
            Fotky <span className="text-rose-700">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={onPickFiles}
            className="hidden"
            disabled={busy}
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <AwButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              variant="secondary"
            >
              Vybrat fotky
            </AwButton>

            <div className="text-xs text-slate-500">
              Vyber jednu nebo více fotek. Datum se zkusí načíst automaticky z EXIF u JPEG.
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">Album</div>
          <div className="mt-1 text-xs text-slate-600">
            Volitelně můžeš tento post přidat do existujícího alba, nebo pro něj vytvořit nové album.
          </div>

          <label className="mt-2 flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={addToAlbumRequested}
              onChange={(e) => setAddToAlbumRequested(e.target.checked)}
              disabled={busy}
            />
            Přidat post do alba
          </label>

          {addToAlbumRequested ? (
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700">Album</span>
                <select
                  value={selectedAlbumId === "" ? "" : String(selectedAlbumId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedAlbumId(v === "" ? "" : v === "new" ? "new" : Number(v));
                  }}
                  disabled={busy || albumsLoading}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="">{albumsLoading ? "Načítám alba..." : "Vyber album"}</option>

                  {ownedAlbums.map((album) => (
                    <option key={album.id} value={String(album.id)}>
                      {album.title}
                      {album.description ? ` - ${album.description}` : ""}
                    </option>
                  ))}

                  <option value="new">Vytvořit nové album pro tento post</option>
                </select>
              </label>

              {selectedAlbumId === "new" ? (
                <>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-700">Název alba</span>
                    <input
                      value={albumTitleDraft}
                      onChange={(e) => setAlbumTitleDraft(e.target.value)}
                      disabled={busy}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      placeholder="Napr. Moje promena"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-700">Popis alba</span>
                    <textarea
                      value={albumDescriptionDraft}
                      onChange={(e) => setAlbumDescriptionDraft(e.target.value)}
                      disabled={busy}
                      rows={3}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      placeholder="Krátký popis alba..."
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {photos.length > 0 ? (
          <div className="grid gap-3">
            {photos.map((p, idx) => (
              <div key={p.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="shrink-0">
                    <div className={`overflow-hidden rounded-md bg-slate-50 ${previewFrameClass(p.isPortrait)}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt="Náhled"
                        className="h-full w-full object-contain"
                        style={{ imageOrientation: "from-image" as any }}
                        onLoad={(e) => updatePhotoOrientation(p.id, e.currentTarget)}
                      />
                    </div>

                    <div className="mt-3 grid gap-2">
                      {p.qualityWarning ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                          {p.qualityWarning}
                        </div>
                      ) : null}

                      <AwButton
                        type="button"
                        variant="secondary"
                        onClick={() => setBlurEditorPhotoId(p.id)}
                        disabled={busy}
                        title="Zde můžete zakrýt cizí obličeje nebo citlivé části fotky pomocí rozmazání."
                      >
                        Zakrýt část fotky
                      </AwButton>
                      <AwButton
                        type="button"
                        variant="tertiary"
                        onClick={() => removePhoto(p.id)}
                        disabled={busy}
                      >
                        Odebrat fotku
                      </AwButton>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="block text-xs text-slate-600">
                          Datum pořízení <span className="text-rose-700">*</span>
                        </label>

                        <input
                          type="date"
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={p.takenAt}
                          onChange={(e) => updatePhoto(p.id, { takenAt: e.target.value })}
                          disabled={busy}
                        />

                        {idx === 0 && photos.length >= 2 ? (
                          <AwButton
                            type="button"
                            onClick={applyFirstDateToAll}
                            disabled={busy || !photos[0]?.takenAt}
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                            title="Zkopíruje datum z první fotky na všechny ostatní. Potom ho můžeš u každé fotky dál upravit ručně."
                          >
                            Použít toto datum pro všechny fotky v postu
                          </AwButton>
                        ) : null}
                      </div>

                      <div>
                        <label className="block text-xs text-slate-600">AW směr</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {AW_DIRECTIONS.map((direction) => {
                            const selected = p.awDirections.includes(direction.key);
                            return (
                              <button
                                key={direction.key}
                                type="button"
                                onClick={() => togglePhotoDirection(p.id, direction.key)}
                                disabled={busy}
                                className={[
                                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-60",
                                  selected
                                    ? "bg-[#32CD32] text-white shadow-sm"
                                    : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
                                ].join(" ")}
                              >
                                {direction.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">
                          Volitelné. Jedna fotka může mít více směrů.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <label className="block text-xs text-slate-600">Tagy</label>
                          <PhotoTagHelp />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <AwButton
                            type="button"
                            onClick={() => setTagModal({ open: true, photoId: p.id, kind: "default" })}
                            disabled={busy}
                            variant="secondary"
                          >
                            Výchozí tagy
                          </AwButton>
                          <AwButton
                            type="button"
                            onClick={() => setTagModal({ open: true, photoId: p.id, kind: "challenges" })}
                            disabled={busy}
                            variant="secondary"
                          >
                            Moje výzvy
                          </AwButton>
                          <AwButton
                            type="button"
                            onClick={() => setTagModal({ open: true, photoId: p.id, kind: "custom" })}
                            disabled={busy}
                            variant="secondary"
                          >
                            Vlastní tagy
                          </AwButton>
                          {p.awDirections.length > 0 ? (
                            <AwButton
                              type="button"
                              onClick={() => setTagModal({ open: true, photoId: p.id, kind: "direction" })}
                              disabled={busy}
                              variant="secondary"
                            >
                              Tagy AW směru
                            </AwButton>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {p.photoTags.length === 0 ? (
                            <span className="text-xs text-slate-500">Bez tagu</span>
                          ) : (
                            p.photoTags.map((tag) => {
                              const normalized = normalizeImageTag(tag);
                              const label = tagLabel(p, normalized);
                              return (
                                <button
                                  key={normalized}
                                  type="button"
                                  onClick={() => removePhotoTag(p.id, normalized)}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
                                  title="Kliknutím tag odebereš."
                                >
                                  #{label}
                                  <span className="text-emerald-700">×</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={p.includeInGlobalAw}
                            onChange={(e) => updatePhoto(p.id, { includeInGlobalAw: e.target.checked })}
                            disabled={busy}
                          />
                          Zahrnout do celkového věku. Experimentální fotky lze vypnout.
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-600">Komentář (max 50)</label>
                        <input
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={p.comment}
                          onChange={(e) => updatePhoto(p.id, { comment: e.target.value.slice(0, 50) })}
                          placeholder="Krátký komentář k fotce..."
                          disabled={busy}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-3">
          <AwButton
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            variant="primary"
            size="lg"
          >
            {busy ? "Ukládám..." : "Vytvořit post"}
          </AwButton>
        </div>

        <label className="mt-3 flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={photoProcessingConsentChecked}
            onChange={(e) => setPhotoProcessingConsentChecked(e.target.checked)}
            disabled={busy}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            Souhlasím se zpracováním fotografie v rámci služby AgeWinners, včetně jejího hodnocení ostatními uživateli
            a automatizovaného vyhodnocování. Více informací najdeš v sekci{" "}
            <Link href="/privacy-terms" className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              Soukromí a podmínky
            </Link>
            .
          </span>
        </label>
      </div>
    </div>
  );
}


