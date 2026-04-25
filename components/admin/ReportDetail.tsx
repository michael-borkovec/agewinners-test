/**
 * File: components/admin/ReportDetail.tsx
 *
 * Purpose:
 * - Admin detail page for one image report (accept/reject)
 */

"use client";

import { useEffect, useState } from "react";
import { adminGetImageReport, adminResolveImageReport, type AdminReportDetail } from "@/lib/api/adminReports";

export default function ReportDetail({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<AdminReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const numericReportId = Number(reportId);
      if (!Number.isFinite(numericReportId) || numericReportId <= 0) {
        throw new Error("Neplatné ID reportu.");
      }

      const r = await adminGetImageReport(numericReportId);
      setRow(r);
    } catch (e: any) {
      console.warn("ReportDetail load failed", e);
      setError(e?.message ?? "Nepodařilo se načíst report.");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function resolve(decision: "accepted" | "rejected") {
    if (!row || row.status !== "open") return;

    setSaving(true);
    try {
      await adminResolveImageReport({
        reportId: row.report_id,
        decision,
        note: note.trim() ? note.trim() : null,
      });
      await load();
    } catch (e: any) {
      console.warn("Resolve failed", e);
      setError(e?.message ?? "Akci se nepodařilo provést.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">Načítám…</div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  if (!row) return <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">Report nenalezen.</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-800">Nahlášená fotka</div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.image_public_url ?? ""} alt="Reported image" className="h-auto w-full object-cover" />
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-600">
          <div>Kategorie: <span className="font-semibold text-slate-800">{row.image_category ?? "—"}</span></div>
          <div>Taken at: <span className="font-semibold text-slate-800">{row.image_taken_at ?? "—"}</span></div>
          <div>Majitel: <span className="font-semibold text-slate-800">{row.image_owner_display_name ?? row.image_owner_user_id}</span></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-800">Report</div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              row.status === "open"
                ? "bg-amber-50 text-amber-700"
                : row.status === "accepted"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {row.status === "open" ? "Otevřený" : row.status === "accepted" ? "Přijatý" : "Zamítnutý"}
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div>
            <div className="text-xs text-slate-500">Důvod</div>
            <div className="font-semibold text-slate-800">{row.reason}</div>
          </div>

          {row.note ? (
            <div>
              <div className="text-xs text-slate-500">Poznámka od reportera</div>
              <div className="text-slate-800">{row.note}</div>
            </div>
          ) : null}

          <div className="pt-2 text-xs text-slate-600">
            Reporter: <span className="font-semibold text-slate-800">{row.reporter_display_name ?? row.reporter_user_id}</span>
            {" • "}
            Vytvořeno: <span className="font-semibold text-slate-800">{new Date(row.created_at).toLocaleString()}</span>
          </div>
        </div>

        {row.status === "open" ? (
          <>
            <div className="mt-6">
              <label className="block text-xs font-semibold text-slate-700">Poznámka k rozhodnutí (volitelné)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-slate-400"
                placeholder="Např. jasné porušení / nedostatek informací…"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => resolve("accepted")}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Přijmout
              </button>
              <button
                onClick={() => resolve("rejected")}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Zamítnout
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div>
              Vyřešeno: <span className="font-semibold">{row.resolved_at ? new Date(row.resolved_at).toLocaleString() : "—"}</span>
            </div>
            {row.resolution_note ? (
              <div className="mt-1">
                Poznámka: <span className="font-semibold">{row.resolution_note}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
