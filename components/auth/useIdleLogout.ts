/**
 * File: components/auth/useIdleLogout.ts
 *
 * Purpose:
 * - Auto logout after a period of user inactivity (idle timeout).
 * - Prevents "forever logged in" when refresh tokens keep sessions alive.
 *
 * How it works:
 * - Listens to common user activity events and updates lastActive timestamp.
 * - If user is idle longer than `idleMs`, performs supabase.auth.signOut().
 *
 * Notes:
 * - Use this in a top-level authenticated shell OR in frequently used pages.
 * - Works in dev (localhost) and production.
 */

"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type Options = {
  /** Idle timeout in milliseconds (e.g. 2 hours = 2 * 60 * 60 * 1000) */
  idleMs: number;
  /** Where to redirect after signOut */
  redirectTo?: string;
  /** Enable/disable hook (useful during debugging) */
  enabled?: boolean;
};

const DEFAULT_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "pointerdown"] as const;

export function useIdleLogout(options: Options) {
  const { idleMs, redirectTo = "/login", enabled = true } = options;

  const lastActiveRef = useRef<number>(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function markActive() {
      lastActiveRef.current = Date.now();
    }

    async function checkIdle() {
      const now = Date.now();
      const idleFor = now - lastActiveRef.current;

      if (idleFor >= idleMs) {
        // One last check: if session already gone, still cleanly redirect
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        } finally {
          window.location.assign(redirectTo);
        }
      }
    }

    // Mark active on user interactions
    DEFAULT_EVENTS.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));

    // Also mark active when tab becomes visible again (user returns)
    function onVisibility() {
      if (document.visibilityState === "visible") markActive();
    }
    document.addEventListener("visibilitychange", onVisibility);

    // Periodic idle check (every 30s is enough)
    timerRef.current = window.setInterval(checkIdle, 30_000) as unknown as number;

    return () => {
      DEFAULT_EVENTS.forEach((ev) => window.removeEventListener(ev, markActive as any));
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, idleMs, redirectTo]);
}
