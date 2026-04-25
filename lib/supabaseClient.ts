/**
 * File: lib/supabaseClient.ts
 *
 * Purpose:
 * - Browser/client Supabase instance.
 * - Keep auth compatible with SSR/API cookie-based flows.
 * - Store auth as session cookies so login does not survive full browser close.
 *
 * IMPORTANT:
 * - This module MUST be safe to import in Client Components.
 * - Therefore it must NOT import "next/headers" or other server-only modules.
 */

import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize, type SerializeOptions } from "cookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Use this in "use client" components.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      if (typeof document === "undefined") return [];

      const parsed = parse(document.cookie ?? "");
      return Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([name, value]) => ({ name, value }));
    },
    setAll(cookiesToSet) {
      if (typeof document === "undefined") return;

      cookiesToSet.forEach(({ name, value, options }) => {
        const sessionCookieOptions: SerializeOptions = { ...(options ?? {}) };
        delete sessionCookieOptions.maxAge;
        delete sessionCookieOptions.expires;
        document.cookie = serialize(name, value, sessionCookieOptions);
      });
    },
  },
});
