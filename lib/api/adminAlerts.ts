/**
 * File purpose
 * - Client helpers for shared admin/moderator operational alerts.
 * Main responsibilities
 * - Load grouped admin alert summaries for notifications and admin nav badges
 * - Expose counts for bell and section badges
 * Related APIs, components, or modules
 * - app/api/admin/alerts/route.ts
 * - app/notifications/page.tsx
 * - components/AuthShell.tsx
 * - components/admin/AdminSectionNav.tsx
 */

export type AdminAlertKind = "admin_support" | "moderator_outreach" | "image_report" | "message_report";

export type AdminAlertSummary = {
  kind: AdminAlertKind;
  total_count: number;
  user_count: number;
  latest_at: string | null;
  href: string;
  latest_actor: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type AdminAlertCounts = {
  adminSupportUnread: number;
  moderatorOutreachUnread: number;
  imageReportsOpen: number;
  messageReportsOpen: number;
};

export async function getMyAdminAlerts(): Promise<{ summaries: AdminAlertSummary[]; counts: AdminAlertCounts }> {
  const res = await fetch("/api/admin/alerts", { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { summaries: AdminAlertSummary[]; counts: AdminAlertCounts };
}
