/**
 * Reusable gallery navigation state.
 * Handles cyclic previous/next movement for image modal viewers.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useGalleryNavigation<T>(items: T[], initialIndex = 0) {
  const total = items.length;
  const safeInitialIndex = total > 0 ? Math.min(Math.max(0, initialIndex), total - 1) : 0;
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);

  useEffect(() => {
    setCurrentIndex(total > 0 ? Math.min(Math.max(0, initialIndex), total - 1) : 0);
  }, [initialIndex, total]);

  const hasItems = total > 0;
  const canNavigate = total > 1;

  const nextImage = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevImage = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const currentItem = useMemo(() => (hasItems ? items[currentIndex] : null), [currentIndex, hasItems, items]);
  const nextItem = useMemo(() => (canNavigate ? items[(currentIndex + 1) % total] : null), [canNavigate, currentIndex, items, total]);
  const prevItem = useMemo(() => (canNavigate ? items[(currentIndex - 1 + total) % total] : null), [canNavigate, currentIndex, items, total]);

  return {
    currentIndex,
    setCurrentIndex,
    currentItem,
    nextItem,
    prevItem,
    total,
    hasItems,
    canNavigate,
    nextImage,
    prevImage,
  };
}
