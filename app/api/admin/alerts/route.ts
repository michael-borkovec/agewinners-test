/**
 * File purpose
 * - Aggregate shared admin/moderator operational alerts for bell badges and notifications page.
 * Main responsibilities
 * - Count unread staff inbox messages from non-staff users
 * - Count open image and message reports
 * - Return grouped summaries with latest actor and target admin link
 * Related APIs, components, or modules
 * - components/AuthShell.tsx
 * - components/admin/AdminSectionNav.tsx
 * - app/notifications/page.tsx
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type StaffRole = "admin" | "moderator";
type AlertKind = "admin_support" | "moderator_outreach" | "image_report" | "message_report";

type AlertActor = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type AdminAlertSummary = {
  kind: AlertKind;
  total_count: number;
  user_count: number;
  latest_at: string | null;
  href: string;
  latest_actor: AlertActor | null;
};

async function getStaffIdentity(): Promise<{ ok: true; userId: string; role: StaffRole } | { ok: false }> {
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

  const { data } = await supabase.from("user_profiles").select("role").eq("user_id", auth.user.id).maybeSingle();
  const role = String((data as { role?: string } | null)?.role ?? "user");
  if (role === "admin" || role === "moderator") {
    return { ok: true, userId: auth.user.id, role };
  }
  return { ok: false };
}

function asString(value: unknown) {
  return value == null ? "" : String(value);
}

function asInt(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function buildStaffMessageAlert(params: {
  admin: ReturnType<typeof getSupabaseAdmin>;
  me: string;
  scope: "admin_support" | "moderator_outreach";
}): Promise<AdminAlertSummary | null> {
  const { admin, me, scope } = params;

  const { data: participantRows, error: participantError } = await admin
    .from("message_thread_participants")
    .select("thread_id, last_read_message_id")
    .eq("user_id", me);

  if (participantError) throw new Error(participantError.message);

  const participantMap = new Map<number, number>();
  const threadIds = (participantRows ?? [])
    .map((row) => {
      const threadId = asInt((row as Record<string, unknown>).thread_id);
      participantMap.set(threadId, asInt((row as Record<string, unknown>).last_read_message_id));
      return threadId;
    })
    .filter((threadId) => threadId > 0);

  if (threadIds.length === 0) return null;

  const { data: threadRows, error: threadError } = await admin
    .from("message_threads")
    .select("id, thread_kind, subject_user_id")
    .in("id", threadIds)
    .eq("thread_kind", scope);

  if (threadError) throw new Error(threadError.message);

  const scopedThreads = (threadRows ?? []) as Array<Record<string, unknown>>;
  if (scopedThreads.length === 0) return null;

  const scopedThreadIds = scopedThreads.map((row) => asInt(row.id)).filter((id) => id > 0);
  const subjectUserByThreadId = new Map<number, string>();
  for (const row of scopedThreads) {
    subjectUserByThreadId.set(asInt(row.id), asString(row.subject_user_id));
  }

  const { data: messageRows, error: messageError } = await admin
    .from("messages")
    .select("id, thread_id, sender_user_id, created_at")
    .in("thread_id", scopedThreadIds)
    .order("created_at", { ascending: false });

  if (messageError) throw new Error(messageError.message);

  const senderIds = Array.from(
    new Set(((messageRows ?? []) as Array<Record<string, unknown>>).map((row) => asString(row.sender_user_id)).filter(Boolean))
  );

  const { data: senderProfiles, error: senderProfilesError } = senderIds.length
    ? await admin.from("user_profiles").select("user_id, display_name, avatar_url, role").in("user_id", senderIds)
    : { data: [], error: null };

  if (senderProfilesError) throw new Error(senderProfilesError.message);

  const senderById = new Map<string, { role: string; display_name: string | null; avatar_url: string | null }>();
  for (const row of (senderProfiles ?? []) as Array<Record<string, unknown>>) {
    senderById.set(asString(row.user_id), {
      role: asString(row.role),
      display_name: (row.display_name as string | null | undefined) ?? null,
      avatar_url: (row.avatar_url as string | null | undefined) ?? null,
    });
  }

  let totalCount = 0;
  let latestAt: string | null = null;
  let latestThreadId: number | null = null;
  let latestActor: AlertActor | null = null;
  const affectedUsers = new Set<string>();

  for (const row of (messageRows ?? []) as Array<Record<string, unknown>>) {
    const threadId = asInt(row.thread_id);
    const messageId = asInt(row.id);
    const senderUserId = asString(row.sender_user_id);
    const sender = senderById.get(senderUserId);
    const isStaffSender = sender?.role === "admin" || sender?.role === "moderator";
    const lastRead = participantMap.get(threadId) ?? 0;

    if (messageId <= lastRead || isStaffSender) continue;

    totalCount += 1;
    const subjectUserId = subjectUserByThreadId.get(threadId);
    if (subjectUserId) affectedUsers.add(subjectUserId);
    if (!latestAt) {
      latestAt = asString(row.created_at) || null;
      latestThreadId = threadId;
      latestActor = senderUserId
        ? {
            user_id: senderUserId,
            display_name: sender?.display_name ?? null,
            avatar_url: sender?.avatar_url ?? null,
          }
        : null;
    }
  }

  if (totalCount === 0) return null;

  return {
    kind: scope,
    total_count: totalCount,
    user_count: affectedUsers.size,
    latest_at: latestAt,
    href:
      scope === "admin_support"
        ? `/admin/admin-messages${latestThreadId ? `?thread=${latestThreadId}` : ""}`
        : `/admin/moderator-messages${latestThreadId ? `?thread=${latestThreadId}` : ""}`,
    latest_actor: latestActor,
  };
}

async function buildImageReportAlert(admin: ReturnType<typeof getSupabaseAdmin>): Promise<AdminAlertSummary | null> {
  const { data, error } = await admin
    .from("image_reports")
    .select("id, image_id, reporter_user_id, created_at, status")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return null;

  const reporterIds = Array.from(new Set(rows.map((row) => asString(row.reporter_user_id)).filter(Boolean)));
  const { data: profiles, error: profilesError } = reporterIds.length
    ? await admin.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", reporterIds)
    : { data: [], error: null };

  if (profilesError) throw new Error(profilesError.message);
  const profileMap = new Map<string, AlertActor>();
  for (const row of (profiles ?? []) as Array<Record<string, unknown>>) {
    profileMap.set(asString(row.user_id), {
      user_id: asString(row.user_id),
      display_name: (row.display_name as string | null | undefined) ?? null,
      avatar_url: (row.avatar_url as string | null | undefined) ?? null,
    });
  }

  return {
    kind: "image_report",
    total_count: new Set(rows.map((row) => asInt(row.image_id)).filter((id) => id > 0)).size,
    user_count: new Set(rows.map((row) => asString(row.reporter_user_id)).filter(Boolean)).size,
    latest_at: asString(rows[0]?.created_at) || null,
    href: "/admin?tab=images&statusFilter=new_reported&visibilityFilter=all",
    latest_actor: profileMap.get(asString(rows[0]?.reporter_user_id)) ?? null,
  };
}

async function buildMessageReportAlert(admin: ReturnType<typeof getSupabaseAdmin>): Promise<AdminAlertSummary | null> {
  const { data, error } = await admin
    .from("message_thread_reports")
    .select("id, thread_id, reporter_user_id, created_at, status")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return null;

  const reporterIds = Array.from(new Set(rows.map((row) => asString(row.reporter_user_id)).filter(Boolean)));
  const { data: profiles, error: profilesError } = reporterIds.length
    ? await admin.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", reporterIds)
    : { data: [], error: null };

  if (profilesError) throw new Error(profilesError.message);
  const profileMap = new Map<string, AlertActor>();
  for (const row of (profiles ?? []) as Array<Record<string, unknown>>) {
    profileMap.set(asString(row.user_id), {
      user_id: asString(row.user_id),
      display_name: (row.display_name as string | null | undefined) ?? null,
      avatar_url: (row.avatar_url as string | null | undefined) ?? null,
    });
  }

  return {
    kind: "message_report",
    total_count: new Set(rows.map((row) => asInt(row.thread_id)).filter((id) => id > 0)).size,
    user_count: new Set(rows.map((row) => asString(row.reporter_user_id)).filter(Boolean)).size,
    latest_at: asString(rows[0]?.created_at) || null,
    href: "/admin/message-reports",
    latest_actor: profileMap.get(asString(rows[0]?.reporter_user_id)) ?? null,
  };
}

export async function GET() {
  const identity = await getStaffIdentity();
  if (!identity.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const summaries: AdminAlertSummary[] = [];

  const messageScopes: Array<"admin_support" | "moderator_outreach"> =
    identity.role === "admin" ? ["admin_support", "moderator_outreach"] : ["moderator_outreach"];

  for (const scope of messageScopes) {
    const summary = await buildStaffMessageAlert({ admin, me: identity.userId, scope });
    if (summary) summaries.push(summary);
  }

  const [imageReportSummary, messageReportSummary] = await Promise.all([
    buildImageReportAlert(admin),
    buildMessageReportAlert(admin),
  ]);

  if (imageReportSummary) summaries.push(imageReportSummary);
  if (messageReportSummary) summaries.push(messageReportSummary);

  summaries.sort((a, b) => {
    const aTime = a.latest_at ? new Date(a.latest_at).getTime() : 0;
    const bTime = b.latest_at ? new Date(b.latest_at).getTime() : 0;
    return bTime - aTime;
  });

  const counts = {
    adminSupportUnread: summaries.find((item) => item.kind === "admin_support")?.total_count ?? 0,
    moderatorOutreachUnread: summaries.find((item) => item.kind === "moderator_outreach")?.total_count ?? 0,
    imageReportsOpen: summaries.find((item) => item.kind === "image_report")?.total_count ?? 0,
    messageReportsOpen: summaries.find((item) => item.kind === "message_report")?.total_count ?? 0,
  };

  return NextResponse.json({ summaries, counts }, { status: 200 });
}
