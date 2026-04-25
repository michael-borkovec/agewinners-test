/**
 * File: app/api/admin/image-reports/route.ts
 *
 * Purpose:
 * - Admin + Moderator:
 *   POST: review an image report
 *     - action: "confirm" | "reject"
 *     - optionally change reason/category
 *     - optionally write admin_note
 *     - optionally set penalty coef for "Ostatní" (0.0 .. 1.0, default 0.5)
 *
 * Behavior:
 * - Updates: status, reviewed_at, reviewed_by, admin_note, reason (optional), penalty_coef (on confirm)
 * - If action="confirm": also deletes the image using shared helper (same behavior as admin delete).
 *
 * Security:
 * - Uses session to gate (admin_get_my_role)
 * - Uses SERVICE ROLE (getSupabaseAdmin) to update rows (bypass RLS safely)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { adminDeleteImage } from "@/lib/server/adminDeleteImage";

const REPORT_REASONS = [
  "Nelze tipovat věk - více osob",
  "Nelze tipovat věk - žádná osoba",
  "Nelze tipovat věk - nedostatečný záběr",
  "Sexuální podtext",
  "Rasismus/projev nenávisti",
  "Ostatní - uveďte v komentáři",
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

function isReportReason(x: any): x is ReportReason {
  return REPORT_REASONS.includes(x);
}

type GateResult =
  | {
      ok: true;
      role: "admin" | "moderator";
      userId: string;
      supabase: ReturnType<typeof createServerClient>;
    }
  | { ok: false; supabase: ReturnType<typeof createServerClient> };

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
  if (!auth?.user) return { ok: false, supabase };

  const userId = auth.user.id;

  const { data, error } = await supabase.rpc("admin_get_my_role");
  if (error) return { ok: false, supabase };

  const row = Array.isArray(data) ? data[0] : null;
  const role = (row?.role ?? "user") as string;

  if (role === "admin" || role === "moderator") {
    return { ok: true, role, userId, supabase };
  }
  return { ok: false, supabase };
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1.0, Math.max(0.0, v));
}

function coefForReason(reason: string, otherCoef: number | null) {
  // HARD => full penalty
  if (reason === "Sexuální podtext" || reason === "Rasismus/projev nenávisti") return 1.0;

  // SOFT => mild penalty
  if (
    reason === "Nelze tipovat věk - více osob" ||
    reason === "Nelze tipovat věk - žádná osoba" ||
    reason === "Nelze tipovat věk - nedostatečný záběr"
  )
    return 0.1;

  // OTHER => admin-controlled (0..1), default 0.5
  if (reason === "Ostatní - uveďte v komentáři") return otherCoef ?? 0.5;

  // Safe fallback (treat unknown as medium)
  return 0.5;
}

export async function POST(req: Request) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reportId = Number(body.reportId);
  const action = String(body.action ?? "");
  const reasonRaw = body.reason;
  const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 2000) : "";

  // "Ostatní" custom coef
  const otherCoefRaw = body.otherCoef;
  const otherCoef =
    otherCoefRaw === null || otherCoefRaw === undefined
      ? null
      : clamp01(Number(otherCoefRaw));

  if (!Number.isFinite(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "bad_request_reportId" }, { status: 400 });
  }

  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json({ error: "bad_request_action" }, { status: 400 });
  }

  const nextStatus = action === "confirm" ? "accepted" : "rejected";

  // optional: update category
  const nextReason = isReportReason(reasonRaw) ? (reasonRaw as ReportReason) : null;

  const admin = getSupabaseAdmin();

  // Ensure report exists and is still open (guard)
  const { data: rep, error: repErr } = await admin
    .from("image_reports")
    .select("id, status, image_id, reason")
    .eq("id", reportId)
    .maybeSingle();

  if (repErr) return NextResponse.json({ error: repErr.message }, { status: 500 });
  if (!rep) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (String((rep as any).status ?? "") !== "open") {
    return NextResponse.json({ error: "report_not_open" }, { status: 409 });
  }

  const finalReason: ReportReason = (nextReason ?? (rep as any).reason) as ReportReason;

  const penaltyCoef =
    action === "confirm"
      ? coefForReason(finalReason, finalReason === "Ostatní - uveďte v komentáři" ? otherCoef : null)
      : null;

  const patch: any = {
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.userId,
    admin_note: adminNote.length ? adminNote : null,
    // only meaningful on confirm
    penalty_coef: penaltyCoef,
  };

  if (nextReason) patch.reason = nextReason;

  const { error: updErr } = await admin.from("image_reports").update(patch).eq("id", reportId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // On confirm: delete image (same behavior as admin delete)
  if (action === "confirm") {
    const imageId = Number((rep as any).image_id);
    if (Number.isFinite(imageId) && imageId > 0) {
      try {
        const delResult = await adminDeleteImage({
          imageId,
          moderatorUserId: gate.userId,
          noteFromUi: adminNote,
        });
        return NextResponse.json({ ok: true, deleted: delResult }, { status: 200 });
      } catch (e: any) {
        // Report is already "accepted"; surface delete failure clearly.
        return NextResponse.json(
          { error: `accepted_but_delete_failed: ${e?.message ?? "delete_failed"}` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}