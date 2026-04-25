/**
 * File: app/api/image-reports/route.ts
 *
 * Purpose:
 * - Create an "open" report for an image by an authenticated user.
 * - Validates allowed reasons and comment rules.
 *
 * Security:
 * - Uses user session (anon client) -> RLS applies.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const REASONS = [
  "Nelze tipovat věk - více osob",
  "Nelze tipovat věk - žádná osoba",
  "Nelze tipovat věk - nedostatečný záběr",
  "Sexuální podtext",
  "Rasismus/projev nenávisti",
  "Ostatní - uveďte v komentáři",
] as const;

type Reason = (typeof REASONS)[number];

function isReason(x: any): x is Reason {
  return REASONS.includes(x);
}

export async function POST(req: Request) {
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

  // Must be logged in
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const imageId = Number(body.imageId);
  const reason = body.reason;
  const details = typeof body.details === "string" ? body.details.trim() : "";

  if (!Number.isFinite(imageId) || imageId <= 0) {
    return NextResponse.json({ error: "bad_request_imageId" }, { status: 400 });
  }

  if (!isReason(reason)) {
    return NextResponse.json({ error: "bad_request_reason" }, { status: 400 });
  }

  // Comment rules:
  // - For "Ostatní..." comment is required
  // - For others comment is optional
  if (reason === "Ostatní - uveďte v komentáři" && details.length < 3) {
    return NextResponse.json({ error: "comment_required_for_other" }, { status: 400 });
  }

  // Cap length to keep UI + payload tidy
  const detailsCapped = details.slice(0, 1000);

  const { error: insErr } = await supabase.from("image_reports").insert({
    image_id: imageId,
    reason,
    details: detailsCapped.length ? detailsCapped : null,
    status: "open",
    // reporter_user_id defaults to auth.uid() in DB
  });

  if (insErr) {
    // optional: surface DB error
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
