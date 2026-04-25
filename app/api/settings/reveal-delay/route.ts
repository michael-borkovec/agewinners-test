/**
 * File purpose
 * - Public read endpoint for current post reveal delay
 * - Keeps clients independent from direct settings-table reads
 * - Related APIs, components, or modules
 *   - lib/api/appSettings.ts
 *   - app/my-tips/page.tsx
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEFAULT_POST_REVEAL_DELAY_DAYS } from "@/lib/api/appSettings";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data, error } = await supabase
    .from("app_runtime_settings")
    .select("int_value")
    .eq("setting_key", "post_reveal_delay_days")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ days: DEFAULT_POST_REVEAL_DELAY_DAYS }, { status: 200 });
  }

  const days = Number(data?.int_value);
  return NextResponse.json(
    { days: Number.isFinite(days) && days >= 1 ? Math.trunc(days) : DEFAULT_POST_REVEAL_DELAY_DAYS },
    { status: 200 }
  );
}
