/**
 * File: lib/api/imageReports.ts
 *
 * Purpose:
 * - Client helper for reporting an image (creates image_reports row through Next API route).
 */

export const REPORT_REASONS = [
  "Nelze tipovat věk - více osob",
  "Nelze tipovat věk - žádná osoba",
  "Nelze tipovat věk - nedostatečný záběr",
  "Sexuální podtext",
  "Rasismus/projev nenávisti",
  "Ostatní - uveďte v komentáři",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export async function reportImage(params: {
  imageId: number;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const res = await fetch("/api/image-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageId: params.imageId,
      reason: params.reason,
      details: params.details ?? "",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Nahlášení se nepodařilo.");
  }
}
