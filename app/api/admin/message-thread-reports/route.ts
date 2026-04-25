/**
 * File purpose
 * - Admin + moderator review endpoint for message thread reports.
 * Main responsibilities
 * - Confirm or reject a thread report
 * - Store review metadata and optional admin note
 * Related APIs, components, or modules
 * - app/api/message-thread-reports/route.ts
 * - supabase/migrations/20260330_messages_phase2.sql
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type GateResult =
  | {
      ok: true;
      userId: string;
    }
  | { ok: false };

async function getRoleFromSession(): Promise<GateResult> {
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
  if (!auth?.user) return { ok: false };

  const { data, error } = await supabase.rpc("admin_get_my_role");
  if (error) return { ok: false };

  const row = Array.isArray(data) ? data[0] : null;
  const role = String(row?.role ?? "user");

  if (role === "admin" || role === "moderator") {
    return { ok: true, userId: auth.user.id };
  }

  return { ok: false };
}

export async function POST(req: Request) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reportId = Number(body.reportId);
  const action = String(body.action ?? "");
  const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 2000) : "";

  if (!Number.isFinite(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "bad_request_reportId" }, { status: 400 });
  }

  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json({ error: "bad_request_action" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: report, error: reportError } = await admin
    .from("message_thread_reports")
    .select("id, status")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (String((report as any).status ?? "") !== "open") {
    return NextResponse.json({ error: "report_not_open" }, { status: 409 });
  }

  const { error: updateError } = await admin
    .from("message_thread_reports")
    .update({
      status: action === "confirm" ? "accepted" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: gate.userId,
      admin_note: adminNote.length ? adminNote : null,
    })
    .eq("id", reportId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET(req: Request) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") ?? "open");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  if (!["open", "accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "bad_request_status" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: reports, error: reportsError } = await admin
    .from("message_thread_reports")
    .select("id, thread_id, reporter_user_id, reason, details, status, admin_note, reviewed_at, reviewed_by, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (reportsError) return NextResponse.json({ error: reportsError.message }, { status: 500 });

  const reportRows = (reports ?? []) as Array<Record<string, any>>;
  const threadIds = Array.from(new Set(reportRows.map((row) => Number(row.thread_id)).filter(Number.isFinite)));
  const userIds = Array.from(
    new Set(
      reportRows
        .flatMap((row) => [String(row.reporter_user_id ?? ""), String(row.reviewed_by ?? "")])
        .filter(Boolean)
    )
  );

  const [{ data: threads }, { data: participants }, { data: profiles }] = await Promise.all([
    threadIds.length
      ? admin
          .from("message_threads")
          .select("id, thread_kind, last_message_preview, last_message_at")
          .in("id", threadIds)
      : Promise.resolve({ data: [] as any[] }),
    threadIds.length
      ? admin
          .from("message_thread_participants")
          .select("thread_id, user_id")
          .in("thread_id", threadIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? admin
          .from("user_profiles")
          .select("user_id, display_name")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const participantUserIds = Array.from(new Set(((participants ?? []) as any[]).map((row) => String(row.user_id ?? "")).filter(Boolean)));
  let participantProfiles: any[] = [];
  if (participantUserIds.length) {
    const { data } = await admin
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", participantUserIds);
    participantProfiles = data ?? [];
  }

  const threadMap = new Map(((threads ?? []) as any[]).map((row) => [Number(row.id), row]));
  const profileMap = new Map([...(profiles ?? []), ...participantProfiles].map((row: any) => [String(row.user_id ?? ""), row]));
  const participantMap = new Map<number, string[]>();
  for (const row of (participants ?? []) as any[]) {
    const threadId = Number(row.thread_id);
    const userId = String(row.user_id ?? "");
    const label = String(profileMap.get(userId)?.display_name ?? userId);
    participantMap.set(threadId, [...(participantMap.get(threadId) ?? []), label]);
  }

  const payload = reportRows.map((row) => {
    const threadId = Number(row.thread_id);
    const thread = threadMap.get(threadId);
    const reviewerId = String(row.reviewed_by ?? "");
    return {
      report_id: Number(row.id),
      thread_id: threadId,
      thread_kind: String(thread?.thread_kind ?? ""),
      status: String(row.status ?? ""),
      reason: String(row.reason ?? ""),
      details: row.details ?? null,
      admin_note: row.admin_note ?? null,
      created_at: String(row.created_at ?? ""),
      reviewed_at: row.reviewed_at ?? null,
      reporter_user_id: String(row.reporter_user_id ?? ""),
      reporter_display_name: profileMap.get(String(row.reporter_user_id ?? ""))?.display_name ?? null,
      reviewed_by: reviewerId || null,
      reviewed_by_display_name: reviewerId ? profileMap.get(reviewerId)?.display_name ?? null : null,
      participant_names: participantMap.get(threadId) ?? [],
      last_message_preview: thread?.last_message_preview ?? null,
      last_message_at: thread?.last_message_at ?? null,
    };
  });

  return NextResponse.json(payload, { status: 200 });
}
