/**
 * File: app/api/admin/users/route.ts
 *
 * Purpose:
 * - Admin-only user management API.
 * - Lists auth users enriched with user_profiles.
 * - Updates role, super_user and reversible account suspension.
 * - Keeps hard delete as an explicit last-resort operation.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AdminRole = "user" | "admin" | "moderator";

function serviceRoleGuardError() {
  return NextResponse.json(
    {
      error:
        "Server nemá SERVICE ROLE klíč. Zkontroluj .env.local: SUPABASE_SERVICE_ROLE_KEY a restartuj dev server.",
    },
    { status: 500 }
  );
}

async function getAdminIdentity(): Promise<{ userId: string | null; role: AdminRole }> {
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
  const identity = await getAdminIdentity();
  if (identity.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return serviceRoleGuardError();

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const page = Math.max(Math.floor(Number(url.searchParams.get("page") ?? "0")), 0);

  const admin = getSupabaseAdmin();

  const { data } = await admin.auth.admin.listUsers({
    page: page + 1,
    perPage: limit,
  });

  const authUsers = data?.users ?? [];
  const total = Number((data as any)?.total ?? 0);
  const ids = authUsers.map((u) => u.id);

  const profileMap = new Map<string, Record<string, any>>();

  if (ids.length > 0) {
    const { data: profiles, error: pErr } = await admin
      .from("user_profiles")
      .select(
        "user_id, display_name, role, super_user, registration_number, account_status, suspended_at, suspension_reason"
      )
      .in("user_id", ids);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    for (const p of profiles ?? []) profileMap.set(String((p as any).user_id), p as Record<string, any>);
  }

  const users = authUsers.map((u) => {
    const p = profileMap.get(u.id);

    return {
      user_id: u.id,
      registration_number: p?.registration_number ?? null,
      display_name: p?.display_name ?? null,
      email: (u as any).email ?? null,
      role: (p?.role ?? "user") as AdminRole,
      super_user: Boolean(p?.super_user ?? false),
      account_status: p?.account_status ?? "active",
      suspended_at: p?.suspended_at ?? null,
      suspension_reason: p?.suspension_reason ?? null,
      created_at: (u as any).created_at ?? null,
      last_sign_in_at: (u as any).last_sign_in_at ?? null,
    };
  });

  return NextResponse.json({ users, total_count: total, page, limit }, { status: 200 });
}

export async function PATCH(req: Request) {
  const identity = await getAdminIdentity();
  if (identity.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return serviceRoleGuardError();

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  if (!userId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = getSupabaseAdmin();

  if (body.role) {
    const nextRole = String(body.role);
    if (!["user", "admin", "moderator"].includes(nextRole)) {
      return NextResponse.json({ error: "bad role" }, { status: 400 });
    }

    const { error } = await admin.from("user_profiles").update({ role: nextRole }).eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.superUser !== undefined) {
    const { error } = await admin
      .from("user_profiles")
      .update({ super_user: Boolean(body.superUser) })
      .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.accountStatus !== undefined) {
    const nextStatus = String(body.accountStatus);
    if (!["active", "suspended"].includes(nextStatus)) {
      return NextResponse.json({ error: "bad account status" }, { status: 400 });
    }

    if (nextStatus === "suspended" && userId === identity.userId) {
      return NextResponse.json({ error: "Admin nemůže pozastavit sám sebe." }, { status: 400 });
    }

    const suspended = nextStatus === "suspended";
    const { error: rpcError } = await admin.rpc("apply_user_suspension", {
      p_user_id: userId,
      p_suspended: suspended,
      p_admin_user_id: identity.userId,
      p_reason: String(body.suspensionReason ?? "").trim() || null,
    });

    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

    const authUpdate = suspended ? ({ ban_duration: "876000h" } as any) : ({ ban_duration: "none" } as any);
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: Request) {
  const identity = await getAdminIdentity();
  if (identity.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return serviceRoleGuardError();

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  if (!userId) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (userId === identity.userId) {
    return NextResponse.json({ error: "Admin nemůže smazat sám sebe." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
