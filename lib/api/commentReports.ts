/**
 * File purpose
 * - Client helper for reporting comments through a Next API route.
 * Main responsibilities
 * - Export allowed comment report reasons and submit helper.
 * Related APIs, components, or modules
 * - app/api/comment-reports/route.ts
 * - components/ReportCommentModal.tsx
 */

export const COMMENT_REPORT_REASONS = [
  "Spam / reklama",
  "Nevhodný nebo urážlivý komentář",
  "Rasismus / projev nenávisti",
  "Obtěžování nebo útok",
  "Ostatní - uveďte v komentáři",
] as const;

export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number];

export async function reportComment(params: {
  commentId: number;
  reason: CommentReportReason;
  details?: string;
}): Promise<void> {
  const res = await fetch("/api/comment-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commentId: params.commentId,
      reason: params.reason,
      details: params.details ?? "",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Nahlášení komentáře se nepodařilo.");
  }
}
