/**
 * File: lib/api/adminReports.ts
 *
 * Purpose:
 * - Admin API wrappers for image report moderation RPCs.
 * - DB table: public.image_reports (id is BIGINT, details is TEXT)
 * - Extended: includes image verification metadata.
 */

import { supabase } from "@/lib/supabaseClient";

export type ReportStatus = "open" | "accepted" | "rejected";

export type AdminReportListItem = {
  report_id: number; // ✅ bigint -> number in JS
  status: ReportStatus;
  reason: string;
  details: string | null;
  created_at: string;

  image_id: number;
  image_public_url: string | null;
  image_taken_at: string | null;
  image_category: string | null;

  image_verified_at: string | null;
  image_verified_by: string | null;
  image_verified_by_display_name: string | null;

  reporter_user_id: string;
  reporter_display_name: string | null;

  image_owner_user_id: string;
  image_owner_display_name: string | null;

  admin_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reviewed_by_display_name?: string | null;
};

export type AdminReportDetail = AdminReportListItem & {
  note?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
};

export async function adminListImageReports(params: {
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}): Promise<AdminReportListItem[]> {
  const { status = "open", limit = 50, offset = 0 } = params;

  const { data, error } = await supabase.rpc("admin_list_image_reports", {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return (data ?? []) as AdminReportListItem[];
}

export async function adminGetImageReport(reportId: number): Promise<AdminReportDetail | null> {
  const { data, error } = await supabase.rpc("admin_get_image_report", {
    p_report_id: reportId,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? (data[0] as AdminReportListItem | undefined) : null;
  if (!row) return null;

  return {
    ...row,
    note: row.details ?? null,
    resolved_at: row.reviewed_at ?? null,
    resolution_note: row.admin_note ?? null,
  };
}

export async function adminResolveImageReport(params: {
  reportId: number;
  decision: "accepted" | "rejected";
  note?: string | null;
}): Promise<void> {
  const res = await fetch("/api/admin/image-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId: params.reportId,
      action: params.decision === "accepted" ? "confirm" : "reject",
      adminNote: params.note ?? null,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(String(body?.error ?? `HTTP ${res.status}`));
  }
}
