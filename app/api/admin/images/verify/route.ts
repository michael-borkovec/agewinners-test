/**
 * File: app/api/admin/images/verify/route.ts
 *
 * Purpose:
 * - Admin + Moderator:
 *   POST { imageId, verified: boolean }
 *     verified=true  -> sets verified_at=now(), verified_by=currentUserId
 *     verified=false -> sets verified_at=null, verified_by=null
 *
 * Notes:
 * - cookies() is async in your Next setup → await cookies().
 * - Uses service role client to update DB safely.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function serviceRoleGuardError() {
  return NextResponse.json(
    {
      error:
        "Server nemá SERVICE ROLE klíč. Zkontroluj .env.local: SUPABASE_SERVICE_ROLE_KEY a restartuj dev server.",
    },
    { status: 500 }
  );
}

async function getRoleAndUserIdFromSession(): Promise<{
  role: "user" | "admin" | "moderator";
  userId: string | null;
}> {
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
  if (!auth?.user) return { role: "user", userId: null };

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return { role: "user", userId: auth.user.id };
  return { role: (data?.role ?? "user") as any, userId: auth.user.id };
}

export async function POST(req: Request) {
  const { role, userId } = await getRoleAndUserIdFromSession();
  if (role !== "admin" && role !== "moderator") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return serviceRoleGuardError();

  const body = await req.json().catch(() => ({}));
  const imageId = Number(body.imageId);
  const verified = Boolean(body.verified);

  if (!Number.isFinite(imageId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const patch = verified
    ? { verified_at: new Date().toISOString(), verified_by: userId }
    : { verified_at: null, verified_by: null };

  const { error } = await admin.from("images").update(patch).eq("id", imageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
