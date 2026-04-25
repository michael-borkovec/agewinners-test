/**
 * File purpose
 * - Client helper for reporting a whole post through a Next API route.
 * Main responsibilities
 * - Export allowed post report reasons and submit helper.
 * Related APIs, components, or modules
 * - app/api/post-reports/route.ts
 * - components/ReportPostModal.tsx
 */

export const POST_REPORT_REASONS = [
  "Spam / reklama",
  "Nevhodný nebo urážlivý obsah",
  "Sexuální podtext",
  "Rasismus / projev nenávisti",
  "Ostatní - uveďte v komentáři",
] as const;

export type PostReportReason = (typeof POST_REPORT_REASONS)[number];

export async function reportPost(params: {
  postId: number;
  reason: PostReportReason;
  details?: string;
}): Promise<void> {
  const res = await fetch("/api/post-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postId: params.postId,
      reason: params.reason,
      details: params.details ?? "",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Nahlášení se nepodařilo.");
  }
}
