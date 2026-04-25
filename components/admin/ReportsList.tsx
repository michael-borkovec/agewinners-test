/**
 * File: components/admin/ReportsList.tsx
 *
 * Purpose:
 * - Admin inbox list for image reports (filter by status)
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RefreshIconButton from "@/components/RefreshIconButton";
import { adminListImageReports, type AdminReportListItem, type ReportStatus } from "@/lib/api/adminReports";

export default function ReportsList() {
  const [status, setStatus] = useState<ReportStatus>("open");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminReportListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListImageReports({ status, limit: 100, offset: 0 });
      setRows(data);
    } catch (e: unknown) {
      console.warn("ReportsList load failed", e);
      setError(e instanceof Error ? e.message : "Nepodařilo se načíst reporty.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const emptyText = useMemo(() => {
    if (status === "open") return "Žádné otevřené reporty 🎉";
    if (status === "accepted") return "Žádné přijaté reporty.";
    return "Žádné zamítnuté reporty.";
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatus("open")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            status === "open" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Otevřené
        </button>
        <button
          onClick={() => setStatus("accepted")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            status === "accepted" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Přijaté
        </button>
        <button
          onClick={() => setStatus("rejected")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            status === "rejected" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Zamítnuté
        </button>

        <RefreshIconButton onClick={load} className="ml-auto" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Načítám…</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-700">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">{emptyText}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <Link
                key={r.report_id}
                href={`/admin/reports/${r.report_id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{r.reason}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>Reporter: {r.reporter_display_name ?? r.reporter_user_id}</span>
                    <span>Majitel: {r.image_owner_display_name ?? r.image_owner_user_id}</span>
                    <span>Kategorie: {r.image_category ?? "—"}</span>
                  </div>
                </div>

                <div className="shrink-0 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

