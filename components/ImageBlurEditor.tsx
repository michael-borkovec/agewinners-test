/**
 * File purpose
 * - MVP editor for blurring selected elliptical areas on a local image before upload.
 * - Handles mouse selection, undo, preview rendering, and exporting an edited File.
 * - Related APIs, components, or modules
 *   - components/NewPostForm.tsx
 *   - components/HelpIconButton.tsx
 */

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import HelpIconButton from "@/components/HelpIconButton";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";

export type BlurEllipse = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageBlurEditorProps = {
  open: boolean;
  file: File | null;
  previewUrl: string | null;
  onCancel: () => void;
  onSave: (payload: { file: File; previewUrl: string; ellipses: BlurEllipse[] }) => void;
};

type CanvasSize = {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

const HELP_TEXT =
  "Tažením myši označte oblast, kterou chcete rozmazat. Rozmazání můžete použít například pro zakrytí cizích obličejů nebo citlivých částí fotky. Pomocí tlačítka Krok zpět zrušíte poslední úpravu.";

const PREVIEW_BLUR_RADIUS = 26;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Fotku se nepodařilo načíst do editoru."));
    image.src = src;
  });
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function normalizeEllipse(startX: number, startY: number, endX: number, endY: number): BlurEllipse {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function drawFeatheredBlur(
  targetCtx: CanvasRenderingContext2D,
  sourceImage: HTMLImageElement,
  ellipses: BlurEllipse[],
  width: number,
  height: number,
  blurRadius = PREVIEW_BLUR_RADIUS
) {
  if (ellipses.length === 0) return;

  const blurCanvas = createCanvas(width, height);
  const blurCtx = blurCanvas.getContext("2d");
  if (!blurCtx) return;

  blurCtx.filter = `blur(${Math.max(1, Math.round(blurRadius))}px)`;
  blurCtx.drawImage(sourceImage, 0, 0, width, height);
  blurCtx.filter = "none";

  ellipses.forEach((ellipse) => {
    if (ellipse.width < 4 || ellipse.height < 4) return;

    const patchCanvas = createCanvas(width, height);
    const patchCtx = patchCanvas.getContext("2d");
    const maskCanvas = createCanvas(width, height);
    const maskCtx = maskCanvas.getContext("2d");
    if (!patchCtx || !maskCtx) return;

    patchCtx.drawImage(blurCanvas, 0, 0);

    const cx = ellipse.x + ellipse.width / 2;
    const cy = ellipse.y + ellipse.height / 2;
    const rx = Math.max(1, ellipse.width / 2);
    const ry = Math.max(1, ellipse.height / 2);

    maskCtx.save();
    maskCtx.translate(cx, cy);
    maskCtx.scale(rx, ry);
    const gradient = maskCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.72, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    maskCtx.fillStyle = gradient;
    maskCtx.beginPath();
    maskCtx.arc(0, 0, 1, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    patchCtx.globalCompositeOperation = "destination-in";
    patchCtx.drawImage(maskCanvas, 0, 0);
    patchCtx.globalCompositeOperation = "source-over";

    targetCtx.drawImage(patchCanvas, 0, 0);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Upravenou fotku se nepodařilo připravit."));
      },
      type,
      quality
    );
  });
}

export default function ImageBlurEditor({ open, file, previewUrl, onCancel, onSave }: ImageBlurEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize | null>(null);
  const [ellipses, setEllipses] = useState<BlurEllipse[]>([]);
  const [draftEllipse, setDraftEllipse] = useState<BlurEllipse | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allEllipses = useMemo(() => (draftEllipse ? [...ellipses, draftEllipse] : ellipses), [draftEllipse, ellipses]);

  useEffect(() => {
    if (!open) return;

    setEllipses([]);
    setDraftEllipse(null);
    setDragStart(null);
    setError(null);
    setSaving(false);
  }, [open, previewUrl]);

  useEffect(() => {
    if (!open || !previewUrl) return;

    let cancelled = false;

    loadImage(previewUrl)
      .then((image) => {
        if (cancelled) return;

        const naturalWidth = image.naturalWidth || image.width;
        const naturalHeight = image.naturalHeight || image.height;
        const scale = Math.min(900 / naturalWidth, 560 / naturalHeight, 1);

        imageRef.current = image;
        setCanvasSize({
          width: Math.max(1, Math.round(naturalWidth * scale)),
          height: Math.max(1, Math.round(naturalHeight * scale)),
          naturalWidth,
          naturalHeight,
        });
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [open, previewUrl]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !canvasSize) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height);
    drawFeatheredBlur(ctx, image, ellipses, canvasSize.width, canvasSize.height, PREVIEW_BLUR_RADIUS);

    if (draftEllipse) {
      ctx.save();
      ctx.fillStyle = "rgba(121, 201, 78, 0.16)";
      ctx.strokeStyle = "rgba(22, 101, 52, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(
        draftEllipse.x + draftEllipse.width / 2,
        draftEllipse.y + draftEllipse.height / 2,
        Math.max(1, draftEllipse.width / 2),
        Math.max(1, draftEllipse.height / 2),
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [canvasSize, draftEllipse, ellipses, open]);

  if (!open) return null;

  function getCanvasPoint(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

    return {
      x: Math.max(0, Math.min(canvas.width, x)),
      y: Math.max(0, Math.min(canvas.height, y)),
    };
  }

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
    if (saving) return;
    if (event.button !== 0) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    setDragStart(point);
    setDraftEllipse(normalizeEllipse(point.x, point.y, point.x, point.y));
  }

  function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragStart) return;

    const point = getCanvasPoint(event);
    if (!point) return;

    setDraftEllipse(normalizeEllipse(dragStart.x, dragStart.y, point.x, point.y));
  }

  function finishDraft(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragStart) return;

    const point = getCanvasPoint(event);
    const next = point ? normalizeEllipse(dragStart.x, dragStart.y, point.x, point.y) : draftEllipse;

    if (next && next.width >= 8 && next.height >= 8) {
      setEllipses((prev) => [...prev, next]);
    }

    setDragStart(null);
    setDraftEllipse(null);
  }

  async function handleSave() {
    if (!file || !previewUrl || !canvasSize || !imageRef.current) {
      onCancel();
      return;
    }

    if (ellipses.length === 0) {
      onCancel();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const outputCanvas = createCanvas(canvasSize.naturalWidth, canvasSize.naturalHeight);
      const outputCtx = outputCanvas.getContext("2d");
      if (!outputCtx) throw new Error("Editor nelze spustit v tomto prohlížeči.");

      const scaleX = canvasSize.naturalWidth / canvasSize.width;
      const scaleY = canvasSize.naturalHeight / canvasSize.height;
      const naturalEllipses = ellipses.map((ellipse) => ({
        x: ellipse.x * scaleX,
        y: ellipse.y * scaleY,
        width: ellipse.width * scaleX,
        height: ellipse.height * scaleY,
      }));

      outputCtx.drawImage(imageRef.current, 0, 0, canvasSize.naturalWidth, canvasSize.naturalHeight);
      const exportBlurRadius = PREVIEW_BLUR_RADIUS * Math.max(scaleX, scaleY);
      drawFeatheredBlur(outputCtx, imageRef.current, naturalEllipses, canvasSize.naturalWidth, canvasSize.naturalHeight, exportBlurRadius);

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await canvasToBlob(outputCanvas, outputType);
      const editedFile = new File([blob], file.name, {
        type: outputType,
        lastModified: Date.now(),
      });

      onSave({
        file: editedFile,
        previewUrl: URL.createObjectURL(editedFile),
        ellipses: naturalEllipses,
      });
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Upravenou fotku se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-blur-editor-title"
      onClick={onCancel}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="image-blur-editor-title" className="text-lg font-bold text-slate-900">
              Zakrytí částí fotky
            </h2>
            <HelpIconButton
              helpText={HELP_TEXT}
              title="Nápověda"
              modalTitle="Nápověda"
              className="p-1"
              iconClassName="h-5 w-5"
              modalOverlayClassName="z-[100]"
            />
          </div>

          <CloseButton onClick={onCancel} label="Zavřít" />
        </div>

        <p className="mt-4 text-sm font-medium text-slate-700">Tažením myši označte oblast pro rozmazání.</p>

        <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-950/5 p-2">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
          ) : canvasSize ? (
            <canvas
              ref={canvasRef}
              className="mx-auto block max-w-full cursor-crosshair rounded-md bg-white"
              style={{ width: canvasSize.width, height: canvasSize.height }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={finishDraft}
              onMouseLeave={finishDraft}
            />
          ) : (
            <div className="rounded-lg bg-white px-4 py-8 text-center text-sm text-slate-600">Načítám fotku...</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Přidané oblasti: <span className="font-semibold tabular-nums text-slate-700">{ellipses.length}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <AwButton
              onClick={() => setEllipses((prev) => prev.slice(0, -1))}
              disabled={saving || allEllipses.length === 0}
            >
              Krok zpět
            </AwButton>
            <AwButton variant="tertiary" onClick={onCancel} disabled={saving}>
              Zrušit
            </AwButton>
            <AwButton variant="primary" onClick={() => void handleSave()} disabled={saving || Boolean(error)}>
              {saving ? "Ukládám..." : "Uložit úpravy"}
            </AwButton>
          </div>
        </div>
      </div>
    </div>
  );
}
