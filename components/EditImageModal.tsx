/**
 * File purpose
 * - Modal for owner-side photo editing.
 * Main responsibilities
 * - Edit taken date, tags, comment, privacy masking, and advanced flags.
 * - Keep existing save payloads and blur-editor integration intact.
 * Related APIs, components, or modules
 * - components/ImageBlurEditor.tsx
 * - components/edit-image/AdvancedSection.tsx
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert } from "@/components/AwDialog";
import AdvancedSection from "@/components/edit-image/AdvancedSection";
import ImageBlurEditor, { type BlurEllipse } from "@/components/ImageBlurEditor";
import { getMyImageTagOptions, type ImageTagOption } from "@/lib/api/stats";
import { normalizeImageTag, normalizeImageTags, PHOTO_TAG_OPTIONS, type PhotoTag } from "@/lib/api/posts";

type PhotoCategory = PhotoTag;
type TagSuggestion = {
  tag: string;
  label: string;
  count?: number;
  source: "predefined" | "used" | "create";
};

const LEGACY_PHOTO_CATEGORY_OPTIONS: Array<{ value: PhotoCategory; label: string }> = [
  { value: "oblicej", label: "Obličej" },
  { value: "cela_postava", label: "Celá postava" },
  { value: "postava_bez_obliceje", label: "Postava bez obličeje" },
  { value: "v_plavkach", label: "Plavky" },
  { value: "makeup_stylizace", label: "Make-up" },
  { value: "spolecenske_saty", label: "Společenské šaty" },
  { value: "sport", label: "Sport" },
];

export type EditImageInitial = {
  id?: number;
  imageId?: number;
  taken_at: string | null;
  photo_category: PhotoCategory | null;
  tags?: PhotoTag[] | null;
  include_in_global_aw: boolean | null;
  comment: string | null;
  public_url?: string | null;
  public_url_medium?: string | null;
  public_url_thumb?: string | null;
};

type EditImageSavePayload = {
  imageId: number;
  takenAt: string;
  photoTags: PhotoTag[];
  includeInGlobalAw: boolean;
  comment: string | null;
  replacementFile?: File | null;
};

type PendingBlurredImage = {
  file: File;
  previewUrl: string;
  ellipses: BlurEllipse[];
};

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function resolveImageId(initial: EditImageInitial | null): number | null {
  if (!initial) return null;
  const id = initial.imageId ?? initial.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
}

function normalizeComment(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, 50);
}

export default function EditImageModal({
  open,
  initial,
  busy,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: EditImageInitial | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (payload: EditImageSavePayload) => void | Promise<void>;
}) {
  const [takenAt, setTakenAt] = useState("");
  const [photoTags, setPhotoTags] = useState<PhotoTag[]>([]);
  const [customTagDraft, setCustomTagDraft] = useState("");
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [availableTags, setAvailableTags] = useState<ImageTagOption[]>([]);
  const [isExperimental, setIsExperimental] = useState(false);
  const [comment, setComment] = useState("");
  const [blurEditorOpen, setBlurEditorOpen] = useState(false);
  const [blurSourceFile, setBlurSourceFile] = useState<File | null>(null);
  const [blurSourcePreviewUrl, setBlurSourcePreviewUrl] = useState<string | null>(null);
  const [blurLoading, setBlurLoading] = useState(false);
  const [pendingBlurredImage, setPendingBlurredImage] = useState<PendingBlurredImage | null>(null);

  const imageId = useMemo(() => resolveImageId(initial), [initial]);
  const normalizedInitialTags = useMemo(
    () => normalizeImageTags([...(Array.isArray(initial?.tags) ? initial?.tags : []), initial?.photo_category]),
    [initial?.photo_category, initial?.tags]
  );
  const normalizedCurrentTags = useMemo(() => normalizeImageTags(photoTags), [photoTags]);
  const normalizedInitialComment = useMemo(() => normalizeComment(initial?.comment), [initial?.comment]);
  const trimmedComment = useMemo(() => normalizeComment(comment), [comment]);
  const blurSourceAvailable = Boolean(initial?.public_url || initial?.public_url_medium || initial?.public_url_thumb || pendingBlurredImage);

  useEffect(() => {
    if (!open || !initial) return;

    setTakenAt((initial.taken_at ?? "").slice(0, 10));
    setPhotoTags(normalizedInitialTags);
    setCustomTagDraft("");
    setIsExperimental((initial.include_in_global_aw ?? true) === false);
    setComment((initial.comment ?? "").slice(0, 50));
    setBlurEditorOpen(false);
    setBlurSourceFile(null);
    setBlurSourcePreviewUrl(null);
    setBlurLoading(false);
    setPendingBlurredImage(null);
  }, [initial, normalizedInitialTags, open]);

  useEffect(() => {
    if (open) return;
    revokeBlobUrl(pendingBlurredImage?.previewUrl);
    revokeBlobUrl(blurSourcePreviewUrl);
    setPendingBlurredImage(null);
    setBlurEditorOpen(false);
    setBlurSourceFile(null);
    setBlurSourcePreviewUrl(null);
  }, [open, pendingBlurredImage?.previewUrl, blurSourcePreviewUrl]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadTagOptions() {
      try {
        const rows = await getMyImageTagOptions();
        if (!cancelled) setAvailableTags(rows);
      } catch (tagLoadError) {
        console.warn("EditImageModal: tag options load failed", tagLoadError);
        if (!cancelled) setAvailableTags([]);
      }
    }

    void loadTagOptions();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose, open]);

  const hasChanges = useMemo(() => {
    if (!initial || !imageId) return false;
    if (takenAt.trim() !== (initial.taken_at ?? "").slice(0, 10)) return true;
    if (normalizedCurrentTags.join("|") !== normalizedInitialTags.join("|")) return true;
    if (isExperimental !== ((initial.include_in_global_aw ?? true) === false)) return true;
    if (trimmedComment !== normalizedInitialComment) return true;
    if (pendingBlurredImage?.file) return true;
    return false;
  }, [
    imageId,
    initial,
    isExperimental,
    normalizedCurrentTags,
    normalizedInitialComment,
    normalizedInitialTags,
    pendingBlurredImage?.file,
    takenAt,
    trimmedComment,
  ]);

  const canSave = useMemo(() => {
    if (!open) return false;
    if (!initial) return false;
    if (!imageId) return false;
    if (busy) return false;
    if (!takenAt.trim()) return false;
    if (!hasChanges) return false;
    return true;
  }, [busy, hasChanges, imageId, initial, open, takenAt]);

  const tagLabelByValue = useMemo(() => {
    const labels = new Map<string, string>();
    const predefined = PHOTO_TAG_OPTIONS.length > 0 ? PHOTO_TAG_OPTIONS : LEGACY_PHOTO_CATEGORY_OPTIONS;

    predefined.forEach((option) => labels.set(option.value, option.label));
    availableTags.forEach((option) => labels.set(option.tag, option.label));

    return labels;
  }, [availableTags]);

  const tagSuggestions = useMemo<TagSuggestion[]>(() => {
    const selected = new Set(photoTags.map(normalizeImageTag).filter(Boolean));
    const query = customTagDraft.trim().toLowerCase();
    const normalizedDraft = normalizeImageTag(customTagDraft);
    const merged = new Map<string, TagSuggestion>();
    const predefined = PHOTO_TAG_OPTIONS.length > 0 ? PHOTO_TAG_OPTIONS : LEGACY_PHOTO_CATEGORY_OPTIONS;

    predefined.forEach((option) => {
      const tag = normalizeImageTag(option.value);
      if (!tag || selected.has(tag)) return;
      merged.set(tag, { tag, label: option.label, source: "predefined" });
    });

    availableTags.forEach((option) => {
      const tag = normalizeImageTag(option.tag);
      if (!tag || selected.has(tag)) return;
      const existing = merged.get(tag);
      merged.set(tag, {
        tag,
        label: existing?.label ?? option.label,
        count: option.count,
        source: option.predefined ? "predefined" : "used",
      });
    });

    const options = Array.from(merged.values())
      .filter((option) => {
        if (!query) return true;
        return option.tag.toLowerCase().includes(query) || option.label.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        const sourceWeight = (item: TagSuggestion) => (item.source === "used" ? 0 : 1);
        return sourceWeight(a) - sourceWeight(b) || Number(b.count ?? 0) - Number(a.count ?? 0) || a.label.localeCompare(b.label, "cs");
      })
      .slice(0, query ? 8 : 10);

    if (normalizedDraft && !selected.has(normalizedDraft) && !merged.has(normalizedDraft)) {
      options.unshift({
        tag: normalizedDraft,
        label: customTagDraft.trim(),
        source: "create",
      });
    }

    return options;
  }, [availableTags, customTagDraft, photoTags]);

  function formatTagLabel(tag: string) {
    return tagLabelByValue.get(tag) ?? tag.replaceAll("_", " ");
  }

  function addPhotoTag(tag: string) {
    const normalized = normalizeImageTag(tag);
    if (!normalized) return;
    setPhotoTags((prev) => Array.from(new Set([...prev.map(normalizeImageTag).filter(Boolean), normalized])));
    setCustomTagDraft("");
  }

  function removePhotoTag(tag: string) {
    const normalized = normalizeImageTag(tag);
    setPhotoTags((prev) => prev.map(normalizeImageTag).filter((item) => item && item !== normalized));
  }

  function addCustomPhotoTag() {
    addPhotoTag(customTagDraft);
  }

  async function openBlurEditor() {
    const sourceUrl = pendingBlurredImage?.previewUrl ?? initial?.public_url ?? initial?.public_url_medium ?? initial?.public_url_thumb ?? null;
    if (!sourceUrl) return;

    setBlurLoading(true);
    try {
      if (pendingBlurredImage) {
        setBlurSourceFile(pendingBlurredImage.file);
        setBlurSourcePreviewUrl(pendingBlurredImage.previewUrl);
        setBlurEditorOpen(true);
        return;
      }

      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error("Fotku se nepodařilo načíst pro zakrytí.");
      const blob = await response.blob();
      const extension = blob.type === "image/png" ? "png" : "jpg";
      const file = new File([blob], `photo-${imageId ?? "edit"}.${extension}`, {
        type: blob.type || "image/jpeg",
        lastModified: Date.now(),
      });
      const localPreviewUrl = URL.createObjectURL(file);

      setBlurSourceFile(file);
      revokeBlobUrl(blurSourcePreviewUrl);
      setBlurSourcePreviewUrl(localPreviewUrl);
      setBlurEditorOpen(true);
    } catch (loadError) {
      await awAlert(loadError instanceof Error ? loadError.message : "Fotku se nepodařilo načíst pro zakrytí.");
    } finally {
      setBlurLoading(false);
    }
  }

  async function handleSave() {
    if (!imageId || !canSave) return;

    await onSave({
      imageId,
      takenAt,
      photoTags: normalizedCurrentTags,
      includeInGlobalAw: !isExperimental,
      comment: trimmedComment ? trimmedComment : null,
      replacementFile: pendingBlurredImage?.file ?? null,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <ImageBlurEditor
        open={blurEditorOpen}
        file={blurSourceFile}
        previewUrl={blurSourcePreviewUrl}
        onCancel={() => setBlurEditorOpen(false)}
        onSave={(payload) => {
          revokeBlobUrl(pendingBlurredImage?.previewUrl);
          revokeBlobUrl(blurSourcePreviewUrl);
          setPendingBlurredImage(payload);
          setBlurSourceFile(payload.file);
          setBlurSourcePreviewUrl(payload.previewUrl);
          setBlurEditorOpen(false);
        }}
      />

      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <div className="text-lg font-semibold text-slate-900">Editace fotky</div>
          </div>

          <CloseButton onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!imageId ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Chybí ID fotky. Zavři okno a zkus to znovu.
            </div>
          ) : null}

          <div className="space-y-5">
            <label className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Datum pořízení</div>
              <input
                type="date"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
            </label>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Tagy</div>
              <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-3 focus-within:border-emerald-300">
                <div className="flex flex-wrap items-center gap-2">
                  {photoTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      #{formatTagLabel(tag)}
                      <AwButton
                        type="button"
                        onClick={() => removePhotoTag(tag)}
                        disabled={busy}
                        variant="tertiary"
                        size="sm"
                        className="min-h-0 rounded-full px-1 py-0 text-emerald-700 no-underline hover:bg-emerald-100"
                        aria-label={`Odebrat tag ${formatTagLabel(tag)}`}
                      >
                        ×
                      </AwButton>
                    </span>
                  ))}

                  <input
                    className="min-w-[150px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
                    value={customTagDraft}
                    onFocus={() => setTagInputFocused(true)}
                    onBlur={() => setTagInputFocused(false)}
                    onChange={(e) => setCustomTagDraft(e.target.value.slice(0, 40))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const firstSuggestion = tagSuggestions[0];
                        addPhotoTag(firstSuggestion?.tag ?? customTagDraft);
                      }
                      if (e.key === "Backspace" && !customTagDraft && photoTags.length > 0) {
                        removePhotoTag(photoTags[photoTags.length - 1]);
                      }
                    }}
                    placeholder={photoTags.length > 0 ? "Přidej tag..." : "Přidej tag nebo nech bez tagu"}
                    disabled={busy}
                  />
                </div>
              </div>

              {(tagInputFocused || customTagDraft.trim()) && tagSuggestions.length > 0 ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {tagSuggestions.map((option) => (
                    <button
                      key={`${option.source}-${option.tag}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addPhotoTag(option.tag)}
                      disabled={busy}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      <span className="font-semibold text-slate-800">
                        {option.source === "create" ? `Vytvořit #${option.label}` : `#${option.label}`}
                      </span>
                      <span className="text-xs text-slate-400">
                        {option.source === "used" && option.count ? `${option.count}x` : option.source === "predefined" ? "doporučené" : "nový tag"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <AwButton
                type="button"
                variant="secondary"
                onClick={() => void openBlurEditor()}
                disabled={busy || !imageId || !blurSourceAvailable || blurLoading}
                className="no-underline"
              >
                {blurLoading ? "Načítám editor..." : "Zakrýt části fotky v editoru"}
              </AwButton>
            </div>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Komentář</div>
                <div className="text-xs text-slate-400">{comment.length}/50</div>
              </div>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 50))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
                placeholder="Krátký komentář k fotce..."
                maxLength={50}
              />
            </label>

            <AdvancedSection checked={isExperimental} disabled={busy} onChange={setIsExperimental} />

            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}

            <div className="hidden">
              {PHOTO_TAG_OPTIONS.map((option) => {
                const checked = photoTags.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addPhotoTag(option.value)}
                    disabled={busy}
                    className={[
                      "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                      checked
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
              <input
                className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                value={customTagDraft}
                onChange={(e) => setCustomTagDraft(e.target.value.slice(0, 40))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomPhotoTag();
                  }
                }}
                placeholder="Vlastní tag"
                disabled={busy}
              />
              <AwButton type="button" onClick={addCustomPhotoTag} disabled={busy || !customTagDraft.trim()} variant="primary" size="sm">
                Přidat
              </AwButton>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <AwButton type="button" onClick={onClose} variant="tertiary" className="no-underline">
            Zrušit
          </AwButton>
          <AwButton type="button" disabled={!canSave} onClick={() => void handleSave()} variant="primary">
            Uložit
          </AwButton>
        </div>
      </div>
    </div>
  );
}
