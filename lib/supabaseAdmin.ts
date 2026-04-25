/**
 * File: lib/supabaseAdmin.ts
 *
 * Purpose:
 * - Server-only Supabase client using SERVICE ROLE key
 * - Used for admin operations (reset password, delete user, delete images/storage)
 *
 * SECURITY:
 * - Never import this file in client components.
 */

import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
