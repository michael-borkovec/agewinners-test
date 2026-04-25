/**
 * Fullscreen image gallery modal.
 * Supports cyclic navigation, keyboard control, swipe, and image zoom/pan.
 */

"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { useGalleryNavigation } from "@/hooks/useGalleryNavigation";
import { IMAGE_ZOOM_MAX_SCALE, IMAGE_ZOOM_MIN_SCALE, IMAGE_ZOOM_STEP, useImageZoomPan } from "@/hooks/useImageZoomPan";

export type GalleryImage = {
  id: string | number;
  src: string;
  alt?: string;
};

type ImageGalleryModalProps<T extends GalleryImage> = {
  open: boolean;
  images: T[];
  initialIndex: number;
  onClose: () => void;
  renderCaption?: (image: T, index: number) => ReactNode;
  renderFooter?: (image: T, index: number) => ReactNode;
};

const SWIPE_THRESHOLD_PX = 42;
export default function ImageGalleryModal<T extends GalleryImage>({
  open,
  images,
  initialIndex,
  onClose,
  renderCaption,
  renderFooter,
}: ImageGalleryModalProps<T>) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const { currentIndex, currentItem, nextItem, prevItem, total, hasItems, canNavigate, nextImage, prevImage } =
    useGalleryNavigation(images, initialIndex);
  const {
    scale,
    translate,
    dragging,
    isZoomed,
    resetZoom,
    changeScale,
    toggleZoom,
    handlePointerDown,
    handlePointerMove,
    finishPointerDrag,
  } = useImageZoomPan();

  useEffect(() => {
    if (!open) return;
    resetZoom();
  }, [currentIndex, open, resetZoom]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => modalRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextImage();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevImage();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeScale(IMAGE_ZOOM_STEP);
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        changeScale(-IMAGE_ZOOM_STEP);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [changeScale, nextImage, onClose, open, prevImage]);

  useEffect(() => {
    if (!open) return;

    function onCtrlWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      changeScale(event.deltaY < 0 ? IMAGE_ZOOM_STEP : -IMAGE_ZOOM_STEP);
    }

    window.addEventListener("wheel", onCtrlWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener("wheel", onCtrlWheel, { capture: true });
    };
  }, [changeScale, open]);

  const preloadItems = useMemo(() => [prevItem, nextItem].filter(Boolean) as T[], [nextItem, prevItem]);

  if (!open || !hasItems || !currentItem) return null;

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (isZoomed) return;
    if (!canNavigate) return;
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX == null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) nextImage();
    else prevImage();
  }

  function handleZoomPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    suppressNextClickRef.current = false;
    handlePointerDown(event);
  }

  function handleZoomPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    if (start) {
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > 6) suppressNextClickRef.current = true;
    }
    handlePointerMove(event);
  }

  function handleZoomPointerFinish(event: React.PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = null;
    finishPointerDrag(event);
  }

  function handleZoomClick(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    toggleZoom();
  }

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/80 p-3 outline-none sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Prohlížení fotek"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <CloseButton onClick={onClose} label="Zavřít galerii" className="rounded-full bg-white/90 text-slate-900 shadow hover:bg-white" />
        <div className="rounded-full bg-black/55 px-3 py-1 text-sm font-semibold tabular-nums text-white shadow">
          {currentIndex + 1}/{total}
        </div>
        <div className="flex items-center overflow-hidden rounded-full bg-black/55 text-sm font-semibold tabular-nums text-white shadow">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => changeScale(-IMAGE_ZOOM_STEP)}
            disabled={scale <= IMAGE_ZOOM_MIN_SCALE}
            aria-label="Oddálit fotku"
            title="Oddálit"
          >
            -
          </button>
          <button
            type="button"
            className="h-9 min-w-14 px-2 transition hover:bg-white/15"
            onClick={toggleZoom}
            aria-label="Přepnout přiblížení fotky"
            title="Přepnout přiblížení"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => changeScale(IMAGE_ZOOM_STEP)}
            disabled={scale >= IMAGE_ZOOM_MAX_SCALE}
            aria-label="Přiblížit fotku"
            title="Přiblížit"
          >
            +
          </button>
        </div>
      </div>

      {canNavigate ? (
        <>
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-3xl font-bold text-white shadow transition hover:bg-white/40 sm:left-5 sm:h-14 sm:w-14"
            aria-label="Předchozí fotka"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-3 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-3xl font-bold text-white shadow transition hover:bg-white/40 sm:right-5 sm:h-14 sm:w-14"
            aria-label="Další fotka"
          >
            {">"}
          </button>
        </>
      ) : null}

      <div className="absolute inset-0 z-10 grid grid-cols-2" aria-hidden="true">
        <button type="button" className="cursor-w-resize" tabIndex={-1} onClick={prevImage} />
        <button type="button" className="cursor-e-resize" tabIndex={-1} onClick={nextImage} />
      </div>

      <div
        className="relative z-20 flex h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col items-center justify-center sm:h-[calc(100vh-2rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        {renderCaption?.(currentItem, currentIndex)}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
          <div
            className={[
              "touch-none select-none transition-transform duration-150 ease-out",
              dragging ? "cursor-grabbing" : isZoomed ? "cursor-grab" : "cursor-zoom-in",
            ].join(" ")}
            style={{
              transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
              transformOrigin: "center center",
              transition: dragging ? "none" : "transform 160ms ease-out",
            }}
            onClick={handleZoomClick}
            onPointerDown={handleZoomPointerDown}
            onPointerMove={handleZoomPointerMove}
            onPointerUp={handleZoomPointerFinish}
            onPointerCancel={handleZoomPointerFinish}
            onLostPointerCapture={handleZoomPointerFinish}
          >
            <img
              key={`${currentItem.id}-${currentIndex}`}
              src={currentItem.src}
              alt={currentItem.alt ?? "Fotka"}
              className="max-h-[72vh] w-auto max-w-full animate-[aw-gallery-fade_180ms_ease-out] rounded-xl object-contain shadow-2xl sm:max-h-[78vh]"
              draggable={false}
            />
          </div>
        </div>
        <div className="w-full shrink-0">{renderFooter?.(currentItem, currentIndex)}</div>
      </div>

      <div className="hidden">
        {preloadItems.map((item) => (
          <img key={`preload-${item.id}`} src={item.src} alt="" aria-hidden="true" />
        ))}
      </div>

      <style jsx global>{`
        @keyframes aw-gallery-fade {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
