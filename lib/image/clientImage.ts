/**
 * File: lib/image/clientImage.ts
 *
 * Purpose:
 * - Client-side resize + recompress before upload to Storage.
 * - Converts to WebP (good size/quality) and strips EXIF by re-encoding.
 *
 * Fix (orientation):
 * - Uses createImageBitmap(..., { imageOrientation: "from-image" }) when available,
 *   so images taken on mobile (EXIF Orientation) are drawn into canvas correctly.
 *
 * Notes:
 * - Runs in the browser only (uses Canvas).
 * - Keeps aspect ratio.
 * - Limits the longer edge to maxLongEdgePx (e.g. 1920 for full, 600 for thumb).
 */

export type PrepareImageResult = {
  file: File; // processed file (webp)
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
};

export type ImageDimensions = {
  width: number;
  height: number;
  shortEdge: number;
  longEdge: number;
};

export type ImageQualityStatus = "too_small" | "usable_with_warning" | "good";

export type ImageQualityCheck = ImageDimensions & {
  status: ImageQualityStatus;
  message: string | null;
};

export type PreparedImageVariantName = "thumb" | "feed" | "detail";

export type PreparedImageVariant = PrepareImageResult & {
  name: PreparedImageVariantName;
};

export type PreparedUploadImage = {
  source: ImageQualityCheck;
  thumb: PreparedImageVariant;
  feed: PreparedImageVariant;
  detail: PreparedImageVariant;
};

export const IMAGE_UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;
export const MIN_IMAGE_SHORT_EDGE_PX = 600;
export const RECOMMENDED_IMAGE_SHORT_EDGE_PX = 1024;
export const IMAGE_VARIANT_SPECS: Record<PreparedImageVariantName, { maxLongEdgePx: number; quality: number }> = {
  thumb: { maxLongEdgePx: 320, quality: 0.74 },
  feed: { maxLongEdgePx: 1024, quality: 0.82 },
  detail: { maxLongEdgePx: 1600, quality: 0.84 },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type LoadedDrawable =
  | { kind: "bitmap"; bitmap: ImageBitmap; width: number; height: number }
  | { kind: "img"; img: HTMLImageElement; width: number; height: number };

async function loadDrawableFromFile(file: File): Promise<LoadedDrawable> {
  // Prefer createImageBitmap (supports EXIF orientation via imageOrientation option in many browsers)
  // Fallback to <img>.
  const hasCIB = typeof window !== "undefined" && typeof (window as any).createImageBitmap === "function";

  if (hasCIB) {
    try {
      // Some browsers support the options object with imageOrientation.
      const bitmap: ImageBitmap = await (window as any).createImageBitmap(file, {
        imageOrientation: "from-image",
        premultiplyAlpha: "default",
        colorSpaceConversion: "default",
      });

      const w = (bitmap as any).width as number;
      const h = (bitmap as any).height as number;

      if (w && h) {
        return { kind: "bitmap", bitmap, width: w, height: h };
      }

      // If width/height missing for some reason, fall through to <img>.
      try {
        bitmap.close?.();
      } catch {}
    } catch {
      // ignore and fallback to <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Nepodařilo se načíst obrázek."));
      img.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Obrázek má neplatné rozměry.");

    return { kind: "img", img, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function closeDrawable(loaded: LoadedDrawable) {
  if (loaded.kind !== "bitmap") return;
  try {
    loaded.bitmap.close?.();
  } catch {}
}

function getDimensions(loaded: LoadedDrawable): ImageDimensions {
  const width = loaded.width;
  const height = loaded.height;
  return {
    width,
    height,
    shortEdge: Math.min(width, height),
    longEdge: Math.max(width, height),
  };
}

function computeTargetSize(w: number, h: number, maxLongEdgePx: number) {
  const longEdge = Math.max(w, h);
  if (longEdge <= maxLongEdgePx) return { tw: w, th: h };

  const scale = maxLongEdgePx / longEdge;
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  return { tw, th };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Nepodařilo se vytvořit blob z canvasu."));
        resolve(b);
      },
      type,
      quality
    );
  });
}

/**
 * Prepare image for upload:
 * - resize to maxLongEdgePx
 * - encode as WebP
 * - fixes EXIF orientation (via createImageBitmap imageOrientation, if available)
 */
export async function prepareImageForUpload(params: {
  file: File;
  maxLongEdgePx: number;
  quality?: number;
}): Promise<PrepareImageResult> {
  const { file, maxLongEdgePx, quality = 0.82 } = params;

  const q = clamp(quality, 0.4, 0.92);

  const loaded = await loadDrawableFromFile(file);
  const w = loaded.width;
  const h = loaded.height;

  if (!w || !h) throw new Error("Obrázek má neplatné rozměry.");

  const { tw, th } = computeTargetSize(w, h, maxLongEdgePx);

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas není podporován.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (loaded.kind === "bitmap") {
    ctx.drawImage(loaded.bitmap, 0, 0, tw, th);
    closeDrawable(loaded);
  } else {
    ctx.drawImage(loaded.img, 0, 0, tw, th);
  }

  const blob = await canvasToBlob(canvas, "image/webp", q);

  const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
  const outName = `${baseName}.webp`;

  const outFile = new File([blob], outName, { type: "image/webp" });

  return {
    file: outFile,
    width: tw,
    height: th,
    originalBytes: file.size,
    outputBytes: outFile.size,
  };
}

export async function inspectImageFile(file: File): Promise<ImageDimensions> {
  const loaded = await loadDrawableFromFile(file);
  try {
    const dimensions = getDimensions(loaded);
    if (!dimensions.width || !dimensions.height) throw new Error("ObrÃ¡zek mÃ¡ neplatnÃ© rozmÄ›ry.");
    return dimensions;
  } finally {
    closeDrawable(loaded);
  }
}

export async function checkImageQuality(file: File): Promise<ImageQualityCheck> {
  const dimensions = await inspectImageFile(file);

  if (dimensions.shortEdge < MIN_IMAGE_SHORT_EDGE_PX) {
    return {
      ...dimensions,
      status: "too_small",
      message: "Fotka mÃ¡ pÅ™Ã­liÅ¡ nÃ­zkÃ© rozliÅ¡enÃ­ pro pÅ™esnÃ© tipovÃ¡nÃ­.",
    };
  }

  if (dimensions.shortEdge < RECOMMENDED_IMAGE_SHORT_EDGE_PX) {
    return {
      ...dimensions,
      status: "usable_with_warning",
      message: "Fotka mÅ¯Å¾e bÃ½t mÃ©nÄ› pÅ™esnÃ¡ pro tipovÃ¡nÃ­. DoporuÄujeme vyÅ¡Å¡Ã­ kvalitu.",
    };
  }

  return {
    ...dimensions,
    status: "good",
    message: null,
  };
}

async function renderVariant(params: {
  loaded: LoadedDrawable;
  sourceFile: File;
  name: PreparedImageVariantName;
  maxLongEdgePx: number;
  quality: number;
}): Promise<PreparedImageVariant> {
  const { loaded, sourceFile, name, maxLongEdgePx, quality } = params;
  const q = clamp(quality, 0.4, 0.92);
  const { tw, th } = computeTargetSize(loaded.width, loaded.height, maxLongEdgePx);

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nenÃ­ podporovÃ¡n.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (loaded.kind === "bitmap") {
    ctx.drawImage(loaded.bitmap, 0, 0, tw, th);
  } else {
    ctx.drawImage(loaded.img, 0, 0, tw, th);
  }

  const blob = await canvasToBlob(canvas, "image/webp", q);
  const baseName = (sourceFile.name || "image").replace(/\.[^.]+$/, "");
  const outFile = new File([blob], `${baseName}.${name}.webp`, { type: "image/webp" });

  return {
    name,
    file: outFile,
    width: tw,
    height: th,
    originalBytes: sourceFile.size,
    outputBytes: outFile.size,
  };
}

export async function prepareImageUploadVariants(file: File): Promise<PreparedUploadImage> {
  const source = await checkImageQuality(file);
  if (source.status === "too_small") {
    throw new Error(source.message ?? "Fotka mÃ¡ pÅ™Ã­liÅ¡ nÃ­zkÃ© rozliÅ¡enÃ­ pro pÅ™esnÃ© tipovÃ¡nÃ­.");
  }

  const loaded = await loadDrawableFromFile(file);
  try {
    const thumb = await renderVariant({ loaded, sourceFile: file, name: "thumb", ...IMAGE_VARIANT_SPECS.thumb });
    const feed = await renderVariant({ loaded, sourceFile: file, name: "feed", ...IMAGE_VARIANT_SPECS.feed });
    const detail = await renderVariant({ loaded, sourceFile: file, name: "detail", ...IMAGE_VARIANT_SPECS.detail });

    return {
      source,
      thumb,
      feed,
      detail,
    };
  } finally {
    closeDrawable(loaded);
  }
}
