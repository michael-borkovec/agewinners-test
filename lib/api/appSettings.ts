/**
 * File purpose
 * - Client-side helpers for safe runtime app settings reads
 * - Centralize fallback handling for reveal-delay configuration
 * - Related APIs, components, or modules
 *   - app/my-tips/page.tsx
 *   - app/api/settings/reveal-delay/route.ts
 */

export const DEFAULT_POST_REVEAL_DELAY_DAYS = 10;

type RevealDelayResponse = {
  days?: number | null;
};

export async function getPostRevealDelayDays(): Promise<number> {
  try {
    const res = await fetch("/api/settings/reveal-delay", {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data = (await res.json()) as RevealDelayResponse;
    const days = Number(data?.days);

    if (!Number.isFinite(days) || days < 1) {
      return DEFAULT_POST_REVEAL_DELAY_DAYS;
    }

    return Math.trunc(days);
  } catch {
    return DEFAULT_POST_REVEAL_DELAY_DAYS;
  }
}
