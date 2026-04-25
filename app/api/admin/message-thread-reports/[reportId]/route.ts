/**
 * File purpose
 * - Admin + moderator detail endpoint for one message thread report.
 * Main responsibilities
 * - Return report detail, participant labels and thread messages for review
 * Related APIs, components, or modules
 * - app/api/admin/message-thread-reports/route.ts
 * - components/admin/MessageReportDetail.tsx
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type GateResult = { ok: true } | { ok: false };

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
  return role === "admin" || role === "moderator" ? { ok: true } : { ok: false };
}

export async function GET(_: Request, context: { params: Promise<{ reportId: string }> }) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { reportId: reportIdParam } = await context.params;
  const reportId = Number(reportIdParam);
  if (!Number.isFinite(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "bad_request_reportId" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: report, error: reportError } = await admin
    .from("message_thread_reports")
    .select("id, thread_id, reporter_user_id, reason, details, status, admin_note, reviewed_at, reviewed_by, created_at")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) return NextResponse.json({ error: reportError.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const threadId = Number((report as any).thread_id);

  const [{ data: thread }, { data: participants }, { data: messages }] = await Promise.all([
    admin
      .from("message_threads")
      .select("id, thread_kind, last_message_preview, last_message_at")
      .eq("id", threadId)
      .maybeSingle(),
    admin
      .from("message_thread_participants")
      .select("thread_id, user_id")
      .eq("thread_id", threadId),
    admin
      .from("messages")
      .select("id, thread_id, sender_user_id, body, created_at, reply_to_message_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(150),
  ]);

  const userIds = Array.from(
    new Set(
      [
        String((report as any).reporter_user_id ?? ""),
        String((report as any).reviewed_by ?? ""),
        ...((participants ?? []) as any[]).map((row) => String(row.user_id ?? "")),
        ...((messages ?? []) as any[]).map((row) => String(row.sender_user_id ?? "")),
      ].filter(Boolean)
    )
  );

  const { data: profiles } = userIds.length
    ? await admin.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
    : { data: [] as any[] };

  const profileMap = new Map(((profiles ?? []) as any[]).map((row) => [String(row.user_id ?? ""), row]));
  const replyMap = new Map(((messages ?? []) as any[]).map((row) => [Number(row.id), row]));

  const payload = {
    report_id: Number((report as any).id),
    thread_id: threadId,
    thread_kind: String((thread as any)?.thread_kind ?? ""),
    status: String((report as any).status ?? ""),
    reason: String((report as any).reason ?? ""),
    details: (report as any).details ?? null,
    admin_note: (report as any).admin_note ?? null,
    created_at: String((report as any).created_at ?? ""),
    reviewed_at: (report as any).reviewed_at ?? null,
    reviewed_by: (report as any).reviewed_by ?? null,
    reviewed_by_display_name: profileMap.get(String((report as any).reviewed_by ?? ""))?.display_name ?? null,
    reporter_user_id: String((report as any).reporter_user_id ?? ""),
    reporter_display_name: profileMap.get(String((report as any).reporter_user_id ?? ""))?.display_name ?? null,
    participant_names: ((participants ?? []) as any[]).map((row) => ({
      user_id: String(row.user_id ?? ""),
      display_name: profileMap.get(String(row.user_id ?? ""))?.display_name ?? String(row.user_id ?? ""),
      avatar_url: profileMap.get(String(row.user_id ?? ""))?.avatar_url ?? null,
    })),
    last_message_preview: (thread as any)?.last_message_preview ?? null,
    last_message_at: (thread as any)?.last_message_at ?? null,
    messages: ((messages ?? []) as any[]).map((row) => {
      const replyTo = row.reply_to_message_id ? replyMap.get(Number(row.reply_to_message_id)) : null;
      return {
        id: Number(row.id),
        sender_user_id: String(row.sender_user_id ?? ""),
        sender_display_name: profileMap.get(String(row.sender_user_id ?? ""))?.display_name ?? null,
        body: String(row.body ?? ""),
        created_at: String(row.created_at ?? ""),
        reply_to_message_id: row.reply_to_message_id ?? null,
        reply_to_body: replyTo ? String(replyTo.body ?? "") : null,
      };
    }),
  };

  return NextResponse.json(payload, { status: 200 });
}
