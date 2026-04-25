/**
 * Reusable image zoom and pan state.
 * Handles scale limits, reset behavior, double-click zoom, and pointer dragging.
 */

"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export const IMAGE_ZOOM_MIN_SCALE = 1;
export const IMAGE_ZOOM_MAX_SCALE = 4;
export const IMAGE_ZOOM_STEP = 0.18;
export const IMAGE_ZOOM_DOUBLE_CLICK_SCALE = 2;

type DragStart = {
  pointerId: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function useImageZoomPan() {
  const dragStartRef = useRef<DragStart | null>(null);
  const [scale, setScale] = useState(IMAGE_ZOOM_MIN_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const isZoomed = scale > IMAGE_ZOOM_MIN_SCALE;

  const resetZoom = useCallback(() => {
    setScale(IMAGE_ZOOM_MIN_SCALE);
    setTranslate({ x: 0, y: 0 });
    setDragging(false);
    dragStartRef.current = null;
  }, []);

  const changeScale = useCallback((delta: number) => {
    setScale((prev) => {
      const next = clamp(Number((prev + delta).toFixed(2)), IMAGE_ZOOM_MIN_SCALE, IMAGE_ZOOM_MAX_SCALE);
      if (next === IMAGE_ZOOM_MIN_SCALE) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const toggleZoom = useCallback(() => {
    setScale((prev) => {
      if (prev > IMAGE_ZOOM_MIN_SCALE) {
        setTranslate({ x: 0, y: 0 });
        return IMAGE_ZOOM_MIN_SCALE;
      }
      return IMAGE_ZOOM_DOUBLE_CLICK_SCALE;
    });
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isZoomed) return;
      event.preventDefault();
      event.stopPropagation();
      dragStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: translate.x,
        startY: translate.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    },
    [isZoomed, translate.x, translate.y]
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setTranslate({
      x: drag.startX + event.clientX - drag.x,
      y: drag.startY + event.clientY - drag.y,
    });
  }, []);

  const finishPointerDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragStartRef.current;
    if (drag?.pointerId === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
    }
    dragStartRef.current = null;
    setDragging(false);
  }, []);

  return {
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
  };
}
