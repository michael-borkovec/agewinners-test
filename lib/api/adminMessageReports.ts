/**
 * File purpose
 * - Client wrappers for admin moderation of message thread reports.
 * Main responsibilities
 * - Load report list and detail through admin API routes
 * - Resolve thread reports as accepted or rejected
 * Related APIs, components, or modules
 * - app/api/admin/message-thread-reports/route.ts
 * - app/api/admin/message-thread-reports/[reportId]/route.ts
 */

export type MessageReportStatus = "open" | "accepted" | "rejected";

export type AdminMessageReportListItem = {
  report_id: number;
  thread_id: number;
  thread_kind: string;
  status: MessageReportStatus;
  reason: string;
  details: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reporter_user_id: string;
  reporter_display_name: string | null;
  reviewed_by: string | null;
  reviewed_by_display_name: string | null;
  participant_names: string[];
  last_message_preview: string | null;
  last_message_at: string | null;
};

export type AdminMessageReportDetail = {
  report_id: number;
  thread_id: number;
  thread_kind: string;
  status: MessageReportStatus;
  reason: string;
  details: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_display_name: string | null;
  reporter_user_id: string;
  reporter_display_name: string | null;
  participant_names: Array<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  }>;
  last_message_preview: string | null;
  last_message_at: string | null;
  messages: Array<{
    id: number;
    sender_user_id: string;
    sender_display_name: string | null;
    body: string;
    created_at: string;
    reply_to_message_id: number | null;
    reply_to_body: string | null;
  }>;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function adminListMessageReports(params: {
  status?: MessageReportStatus;
  limit?: number;
  offset?: number;
}) {
  const status = params.status ?? "open";
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const query = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });
  return getJson<AdminMessageReportListItem[]>(`/api/admin/message-thread-reports?${query.toString()}`);
}

export async function adminGetMessageReport(reportId: number) {
  return getJson<AdminMessageReportDetail>(`/api/admin/message-thread-reports/${reportId}`);
}

export async function adminResolveMessageReport(params: {
  reportId: number;
  action: "confirm" | "reject";
  adminNote?: string | null;
}) {
  return postJson<{ ok: true }>("/api/admin/message-thread-reports", {
    reportId: params.reportId,
    action: params.action,
    adminNote: params.adminNote ?? null,
  });
}
