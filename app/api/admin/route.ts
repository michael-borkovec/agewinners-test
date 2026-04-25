/**
 * File: app/api/admin/me/route.ts
 *
 * Purpose:
 * - Returns current user role for admin area gating.
 * - Source of truth: user_profiles.role
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ role: "user" }, { status: 200 });

  const { data, error } = await supabase.rpc("admin_get_my_role");
  if (error) return NextResponse.json({ role: "user" }, { status: 200 });

  const row = Array.isArray(data) ? data[0] : null;
  return NextResponse.json({ role: row?.role ?? "user" }, { status: 200 });
}
