/**
 * lib/utils/supabaseClient.ts
 *
 * Purpose:
 * - Single Supabase client instance for the app (browser client).
 * - Centralized so all API modules import from the same path.
 */

import { createClient } from "@supabase/supabase-js";

// NOTE:
// These must exist in your .env.local (Next.js):
// NEXT_PUBLIC_SUPABASE_URL=...
// NEXT_PUBLIC_SUPABASE_ANON_KEY=...
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
