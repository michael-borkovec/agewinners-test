/**
 * File: app/api/admin/users/password/route.ts
 *
 * Purpose:
 * - Admin-only: reset user password via Supabase admin API.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdmin() {
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
  if (!auth?.user) return false;

  const { data } = await supabase.rpc("admin_get_my_role");
  const row = Array.isArray(data) ? data[0] : null;
  return (row?.role ?? "user") === "admin";
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!userId || newPassword.length < 8) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
