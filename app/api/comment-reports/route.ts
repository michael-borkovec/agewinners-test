/**
 * File purpose
 * - Create an "open" report for a comment by an authenticated user.
 * Main responsibilities
 * - Validate reason and optional details, then insert into public.comment_reports.
 * Related APIs, components, or modules
 * - lib/api/commentReports.ts
 * - components/ReportCommentModal.tsx
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { COMMENT_REPORT_REASONS } from "@/lib/api/commentReports";

type Reason = (typeof COMMENT_REPORT_REASONS)[number];

function isReason(value: unknown): value is Reason {
  return COMMENT_REPORT_REASONS.includes(value as Reason);
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

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const commentId = Number(body.commentId);
  const reason = body.reason;
  const details = typeof body.details === "string" ? body.details.trim() : "";

  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "bad_request_commentId" }, { status: 400 });
  }

  if (!isReason(reason)) {
    return NextResponse.json({ error: "bad_request_reason" }, { status: 400 });
  }

  if (reason === "Ostatní - uveďte v komentáři" && details.length < 3) {
    return NextResponse.json({ error: "comment_required_for_other" }, { status: 400 });
  }

  const detailsCapped = details.slice(0, 1000);

  const { error: insErr } = await supabase.from("comment_reports").insert({
    comment_id: commentId,
    reason,
    details: detailsCapped.length ? detailsCapped : null,
    status: "open",
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
