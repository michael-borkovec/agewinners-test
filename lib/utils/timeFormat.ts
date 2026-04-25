/**
 * File purpose
 * - Shared timestamp formatting helpers for user-facing UI.
 * Main responsibilities
 * - Format relative timestamps for posts/photos/messages-like surfaces.
 * - Format absolute timestamps without seconds for network-style surfaces.
 * Related APIs, components, or modules
 * - components/PostCard
 * - app/my-tips/page
 * - app/my-albums/page
 * - app/network/page
 */

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isYesterday(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateDay = new Date(date);
  dateDay.setHours(0, 0, 0, 0);

  return dateDay.getTime() === yesterday.getTime();
}

function appendYesterdaySuffix(text: string, date: Date, now: Date) {
  return isYesterday(date, now) ? `${text} (včera)` : text;
}

export function formatRelativeUiTimestamp(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;

  const date = parseDate(value);
  if (!date) return String(value);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs >= 0) {
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) {
      return appendYesterdaySuffix(`${Math.max(diffMinutes, 0)} min`, date, now);
    }

    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours < 24) {
      return appendYesterdaySuffix(`${diffHours} h`, date, now);
    }
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  const formatted = date.toLocaleDateString(
    "cs-CZ",
    sameYear
      ? { day: "2-digit", month: "2-digit" }
      : { day: "2-digit", month: "2-digit", year: "numeric" }
  );

  return appendYesterdaySuffix(formatted, date, now);
}

export function formatAbsoluteUiTimestamp(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;

  const date = parseDate(value);
  if (!date) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}. ${month}. ${year} ${hours}:${minutes}`;
}
