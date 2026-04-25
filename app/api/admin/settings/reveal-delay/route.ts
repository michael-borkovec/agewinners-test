/**
 * File purpose
 * - Admin-only read/write endpoint for global post reveal delay
 * - Validates admin session before updating runtime settings
 * - Related APIs, components, or modules
 *   - app/admin/page.tsx
 *   - public.app_runtime_settings
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_POST_REVEAL_DELAY_DAYS } from "@/lib/api/appSettings";

async function getAdminUserId() {
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
  if (!auth?.user) return null;

  const { data, error } = await supabase.rpc("admin_get_my_role");
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : null;
  if (row?.role !== "admin") return null;

  return auth.user.id;
}

export async function GET() {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("app_runtime_settings")
    .select("int_value, updated_at")
    .eq("setting_key", "post_reveal_delay_days")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const days = Number(data?.int_value);
  return NextResponse.json(
    {
      days: Number.isFinite(days) && days >= 1 ? Math.trunc(days) : DEFAULT_POST_REVEAL_DELAY_DAYS,
      updated_at: data?.updated_at ?? null,
    },
    { status: 200 }
  );
}

export async function PATCH(req: Request) {
  const adminUserId = await getAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const nextDays = Number(body.days);

  if (!Number.isFinite(nextDays) || nextDays < 1 || nextDays > 365) {
    return NextResponse.json({ error: "Počet dní musí být mezi 1 a 365." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("app_runtime_settings").upsert(
    {
      setting_key: "post_reveal_delay_days",
      int_value: Math.trunc(nextDays),
      updated_by: adminUserId,
    },
    { onConflict: "setting_key" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, days: Math.trunc(nextDays) }, { status: 200 });
}
