/**
 * File: app/api/admin/images/route.ts
 *
 * Purpose:
 * - Admin + Moderator:
 *   GET: list images via RPC admin_list_images (existing signature)
 *        + enrich with latest OPEN report per image (reported_at, report_id, reporter_*, reason, details)
 *        + apply visibility/status filtering for admin "Fotky"
 *        + optional reportReason filter (only for newly reported images)
 *        + resolve verifier display name (verified_by -> user_profiles.display_name)
 *
 *   DELETE: delete image using shared helper:
 *        - Inserts moderation event
 *        - Deletes image row + cascades links
 *        - Cleans up empty posts/albums
 *        - Deletes storage objects (best-effort)
 *
 * Notes:
 * - Uses session to gate (admin_get_my_role).
 * - Uses SERVICE ROLE client for destructive operations (via helper).
 * - In GET we DO NOT pass p_report_filter to RPC (your RPC doesn't have it).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { adminDeleteImage } from "@/lib/server/adminDeleteImage";

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

type VisibilityFilter = "all" | "active" | "hidden";
type StatusFilter = "all" | "new_reported" | "verified" | "hidden" | "no_action";

export async function GET(req: Request) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);
  const orderBy = String(url.searchParams.get("orderBy") ?? "uploaded_desc");
  const visibilityFilter = String(url.searchParams.get("visibilityFilter") ?? "active") as VisibilityFilter;
  const statusFilter = String(url.searchParams.get("statusFilter") ?? "all") as StatusFilter;
  const ownerQuery = String(url.searchParams.get("owner") ?? "").trim().toLowerCase();
  const reportReason = String(url.searchParams.get("reportReason") ?? "").trim();
  const admin = getSupabaseAdmin();

  let imageQuery = admin
    .from("images")
    .select(
      "id, uploader_user_id, public_url, public_url_medium, public_url_thumb, taken_at, created_at, verified_at, verified_by, hidden_by_admin, hidden_by_admin_at, hidden_by_admin_by, real_age_years, aw_age_image, avg_guessed_age, guesses_count, include_in_global_aw, comment, photo_category"
    );

  if (statusFilter === "hidden" || visibilityFilter === "hidden") {
    imageQuery = imageQuery.eq("hidden_by_admin", true);
  } else if (visibilityFilter === "active") {
    imageQuery = imageQuery.eq("hidden_by_admin", false);
  }

  if (statusFilter === "verified") {
    imageQuery = imageQuery.not("verified_at", "is", null);
  }

  if (orderBy === "uploaded_asc") imageQuery = imageQuery.order("created_at", { ascending: true });
  else imageQuery = imageQuery.order("created_at", { ascending: false });

  imageQuery = imageQuery.range(offset, offset + limit - 1);

  const { data: rawImages, error } = await imageQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const images = (rawImages ?? []) as any[];
  const imageIds = images.map((x) => Number(x.id)).filter((n) => Number.isFinite(n));

  const ownerIds = Array.from(new Set(images.map((x) => String(x.uploader_user_id ?? "")).filter(Boolean)));
  const ownerNameById = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await admin.from("user_profiles").select("user_id, display_name").in("user_id", ownerIds);
    for (const p of profiles ?? []) ownerNameById.set(String((p as any).user_id), String((p as any).display_name ?? ""));
  }

  const verifierIds = Array.from(new Set(images.map((x) => String(x.verified_by ?? "")).filter((id) => id && id !== "null" && id !== "undefined")));
  const verifierNameById = new Map<string, string>();
  if (verifierIds.length > 0) {
    const { data: vprofs } = await admin.from("user_profiles").select("user_id, display_name").in("user_id", verifierIds);
    for (const p of vprofs ?? []) verifierNameById.set(String((p as any).user_id), String((p as any).display_name ?? ""));
  }

  const tagsByImageId = new Map<number, string[]>();
  if (imageIds.length > 0) {
    const { data: tagRows } = await admin.from("image_tags").select("image_id, tag").in("image_id", imageIds);
    for (const row of tagRows ?? []) {
      const imageId = Number((row as any).image_id);
      if (!Number.isFinite(imageId)) continue;
      const list = tagsByImageId.get(imageId) ?? [];
      list.push(String((row as any).tag ?? ""));
      tagsByImageId.set(imageId, list.filter(Boolean));
    }
  }

  const reportsByImageId = new Map<number, any>();
  if (imageIds.length > 0) {
    const { data: repRows, error: repErr } = await admin
      .from("image_reports_latest_open")
      .select("image_id, report_id, reported_at, reason, details, reporter_user_id")
      .in("image_id", imageIds);

    if (!repErr && Array.isArray(repRows)) {
      const reporterIds = Array.from(new Set(repRows.map((r: any) => r.reporter_user_id).filter(Boolean)));
      const reporterNameById = new Map<string, string>();
      if (reporterIds.length > 0) {
        const { data: profs } = await admin.from("user_profiles").select("user_id, display_name").in("user_id", reporterIds);
        for (const p of profs ?? []) reporterNameById.set(String((p as any).user_id), String((p as any).display_name ?? ""));
      }

      for (const r of repRows) {
        const imgId = Number((r as any).image_id);
        reportsByImageId.set(imgId, {
          report_id: (r as any).report_id,
          reported_at: (r as any).reported_at,
          report_reason: (r as any).reason ?? null,
          report_details: (r as any).details ?? null,
          reporter_user_id: (r as any).reporter_user_id ?? null,
          reporter_display_name: reporterNameById.get(String((r as any).reporter_user_id ?? "")) || null,
        });
      }
    }
  }

  const enriched = images.map((x) => {
    const imageId = Number(x.id);
    const rep = reportsByImageId.get(imageId) ?? null;
    return {
      image_id: imageId,
      uploader_user_id: x.uploader_user_id,
      owner_display_name: ownerNameById.get(String(x.uploader_user_id ?? "")) || null,
      public_url: x.public_url ?? null,
      public_url_medium: x.public_url_medium ?? null,
      public_url_thumb: x.public_url_thumb ?? null,
      taken_at: x.taken_at ?? null,
      created_at: x.created_at,
      verified_at: x.verified_at ?? null,
      verified_by: x.verified_by ?? null,
      verified_by_display_name: verifierNameById.get(String(x.verified_by ?? "")) || null,
      hidden_by_admin: Boolean(x.hidden_by_admin),
      hidden_by_admin_at: x.hidden_by_admin_at ?? null,
      hidden_by_admin_by: x.hidden_by_admin_by ?? null,
      real_age_years: x.real_age_years ?? null,
      aw_age_image: x.aw_age_image ?? null,
      avg_guessed_age: x.avg_guessed_age ?? null,
      guesses_count: x.guesses_count ?? null,
      include_in_global_aw: x.include_in_global_aw ?? null,
      comment: x.comment ?? null,
      photo_category: x.photo_category ?? null,
      tags: tagsByImageId.get(imageId) ?? [],
      reported_at: rep?.reported_at ?? null,
      report_id: rep?.report_id ?? null,
      reporter_user_id: rep?.reporter_user_id ?? null,
      reporter_display_name: rep?.reporter_display_name ?? null,
      report_reason: rep?.report_reason ?? null,
      report_details: rep?.report_details ?? null,
    };
  });

  const filteredByOwner = ownerQuery.length === 0 ? enriched : enriched.filter((x) => String(x.owner_display_name ?? "").toLowerCase().includes(ownerQuery));
  const filteredByStatus = (() => {
    if (statusFilter === "new_reported") return filteredByOwner.filter((x) => Boolean(x.reported_at));
    if (statusFilter === "verified") return filteredByOwner.filter((x) => Boolean(x.verified_at));
    if (statusFilter === "hidden") return filteredByOwner.filter((x) => Boolean(x.hidden_by_admin));
    if (statusFilter === "no_action") {
      return filteredByOwner.filter((x) => !Boolean(x.reported_at) && !Boolean(x.hidden_by_admin) && !Boolean(x.verified_at));
    }
    return filteredByOwner;
  })();
  const filteredByReason =
    statusFilter !== "new_reported" || reportReason.length === 0
      ? filteredByStatus
      : filteredByStatus.filter((x) => String(x.report_reason ?? "") === reportReason);

  const sorted = orderBy === "user_asc"
    ? filteredByReason.sort((a, b) => String(a.owner_display_name ?? "").localeCompare(String(b.owner_display_name ?? ""), "cs"))
    : orderBy === "user_desc"
      ? filteredByReason.sort((a, b) => String(b.owner_display_name ?? "").localeCompare(String(a.owner_display_name ?? ""), "cs"))
      : filteredByReason;

  return NextResponse.json({ images: sorted, total_count: null }, { status: 200 });
}

export async function PATCH(req: Request) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const imageId = Number(body.imageId);
  if (!Number.isFinite(imageId)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const admin = getSupabaseAdmin();

  if (body.hidden !== undefined) {
    const hidden = Boolean(body.hidden);
    const { error } = await admin
      .from("images")
      .update({
        hidden_by_admin: hidden,
        hidden_by_admin_at: hidden ? new Date().toISOString() : null,
        hidden_by_admin_by: hidden ? gate.userId : null,
      })
      .eq("id", imageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.takenAt === "string") patch.taken_at = body.takenAt.slice(0, 10);
  if (body.includeInGlobalAw !== undefined) patch.include_in_global_aw = Boolean(body.includeInGlobalAw);
  if (body.comment !== undefined) patch.comment = String(body.comment ?? "").trim() || null;

  const tags = Array.isArray(body.photoTags) ? body.photoTags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 12) : null;
  if (tags) patch.photo_category = tags[0] ?? null;

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("images").update(patch).eq("id", imageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (tags) {
    const { error: deleteTagErr } = await admin.from("image_tags").delete().eq("image_id", imageId);
    if (deleteTagErr) return NextResponse.json({ error: deleteTagErr.message }, { status: 500 });
    if (tags.length > 0) {
      const { error: insertTagErr } = await admin.from("image_tags").insert(tags.map((tag: string) => ({ image_id: imageId, tag })));
      if (insertTagErr) return NextResponse.json({ error: insertTagErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
export async function DELETE(req: Request) {
  const gate = await getRoleFromSession();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const imageId = Number(body.imageId);
  const noteFromUi = typeof body.note === "string" ? body.note.trim() : "";

  if (!Number.isFinite(imageId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const result = await adminDeleteImage({
      imageId,
      moderatorUserId: gate.userId,
      noteFromUi,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "delete_failed" }, { status: 500 });
  }
}
