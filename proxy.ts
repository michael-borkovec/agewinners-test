/**
 * proxy.ts
 *
 * Purpose (temporary fix):
 * - Disable auth redirects for now to avoid infinite redirect to /login.
 *
 * Why:
 * - Current auth is client-side (supabase-js stores session in localStorage),
 *   so server-side code cannot see the session and would think the user is always logged out.
 *
 * Next step (later):
 * - Migrate to cookie-based Supabase SSR auth so proxy can correctly protect routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  // ✅ No redirects for now — let the UI (AuthShell) decide what to show.
  return NextResponse.next();
}

// ✅ Keep it enabled but harmless.
export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
