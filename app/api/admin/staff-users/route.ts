/**
 * File purpose
 * - Staff user picker API for admin/moderator shared inboxes.
 * Main responsibilities
 * - Search active user profiles by display name or email
 * - Restrict access to admin and moderator roles
 * - Return a lightweight list for compose modals
 * Related APIs, components, or modules
 * - components/admin/StaffInbox.tsx
 * - app/api/admin/users/route.ts
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AdminRole = "user" | "admin" | "moderator";

async function getStaffIdentity(): Promise<{ userId: string | null; role: AdminRole }> {
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
  if (!auth?.user) return { userId: null, role: "user" };

  const { data } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return { userId: auth.user.id, role: (data?.role ?? "user") as AdminRole };
}

export async function GET(req: Request) {
  const identity = await getStaffIdentity();
  if (identity.role !== "admin" && identity.role !== "moderator") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_service_role" }, { status: 500 });
  }

  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "12"), 1), 25);

  const admin = getSupabaseAdmin();
  let query = admin
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, account_status")
    .neq("user_id", identity.userId ?? "")
    .order("display_name", { ascending: true })
    .limit(limit);

  if (q) {
    const escaped = q.replace(/[%_,]/g, "");
    query = query.ilike("display_name", `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: (data ?? [])
      .filter((row) => row.account_status !== "suspended")
      .map((row) => ({
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      })),
  });
}
