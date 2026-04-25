/**
 * File: lib/supabaseServer.ts
 *
 * Purpose:
 * - Server-side Supabase client for Server Components / RSC.
 * - Compatible cookie adapter (avoids cookieStore.getAll()) for older Next/Turbopack combos.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Minimal cookie adapter:
 * - `get(name)` exists broadly
 * - we avoid `getAll()` which fails in your runtime
 */
export function supabaseServer() {
  const cookieStore: any = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // @supabase/ssr calls getAll in newer examples, but we implement get+set+remove
      // using a getAll shim that works even if cookieStore.getAll doesn't exist.
      getAll() {
        // If getAll exists, use it.
        if (typeof cookieStore.getAll === "function") {
          return cookieStore.getAll();
        }

        // Fallback: attempt to parse from raw cookie header if available
        // Some runtimes expose cookieStore as iterable; otherwise return empty.
        try {
          if (typeof cookieStore[Symbol.iterator] === "function") {
            const arr: any[] = [];
            for (const c of cookieStore as any) {
              // Expect { name, value }
              if (c?.name) arr.push({ name: c.name, value: c.value });
            }
            return arr;
          }
        } catch {
          // ignore
        }

        // Last resort: no cookies
        return [];
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // In Server Components, cookie writes may be blocked -> ignore
        }
      },
    },
  });
}
