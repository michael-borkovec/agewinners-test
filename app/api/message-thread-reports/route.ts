/**
 * File purpose
 * - Create an open report for a message thread by an authenticated participant.
 * Main responsibilities
 * - Validate allowed reasons and comment rules
 * - Insert thread report through the current session so ownership stays on auth.uid()
 * Related APIs, components, or modules
 * - lib/api/messages.ts
 * - supabase/migrations/20260330_messages_phase2.sql
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const MESSAGE_THREAD_REPORT_REASONS = [
  "Spam / nevyzadane zpravy",
  "Obtezovani / sikana",
  "Sexualni obsah",
  "Rasismus / projev nenavisti",
  "Podvod / manipulace",
  "Ostatni - uvedte v komentari",
] as const;

type Reason = (typeof MESSAGE_THREAD_REPORT_REASONS)[number];

function isReason(value: unknown): value is Reason {
  return MESSAGE_THREAD_REPORT_REASONS.includes(value as Reason);
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
  const threadId = Number(body.threadId);
  const reason = body.reason;
  const details = typeof body.details === "string" ? body.details.trim() : "";

  if (!Number.isFinite(threadId) || threadId <= 0) {
    return NextResponse.json({ error: "bad_request_threadId" }, { status: 400 });
  }

  if (!isReason(reason)) {
    return NextResponse.json({ error: "bad_request_reason" }, { status: 400 });
  }

  if (reason === "Ostatni - uvedte v komentari" && details.length < 3) {
    return NextResponse.json({ error: "comment_required_for_other" }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("message_thread_participants")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error: insertError } = await supabase.from("message_thread_reports").insert({
    thread_id: threadId,
    reason,
    details: details.length ? details.slice(0, 2000) : null,
    status: "open",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
