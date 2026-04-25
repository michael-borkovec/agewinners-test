/**
 * File purpose
 * - Admin inbox list for message thread reports.
 * Main responsibilities
 * - Filter thread reports by status
 * - Navigate to message report detail
 * Related APIs, components, or modules
 * - lib/api/adminMessageReports.ts
 * - app/admin/message-reports/page.tsx
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RefreshIconButton from "@/components/RefreshIconButton";
import {
  adminListMessageReports,
  type AdminMessageReportListItem,
  type MessageReportStatus,
} from "@/lib/api/adminMessageReports";

export default function MessageReportsList() {
  const [status, setStatus] = useState<MessageReportStatus>("open");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminMessageReportListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListMessageReports({ status, limit: 100, offset: 0 });
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nepodařilo se načíst reporty konverzací.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const emptyText = useMemo(() => {
    if (status === "open") return "Žádné otevřené reporty konverzací.";
    if (status === "accepted") return "Žádné přijaté reporty konverzací.";
    return "Žádné zamítnuté reporty konverzací.";
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["open", "accepted", "rejected"] as MessageReportStatus[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              status === value
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {value === "open" ? "Otevřené" : value === "accepted" ? "Přijaté" : "Zamítnuté"}
          </button>
        ))}

        <RefreshIconButton onClick={() => void load()} className="ml-auto" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-slate-600">Načítám...</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-700">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">{emptyText}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <Link
                key={row.report_id}
                href={`/admin/message-reports/${row.report_id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{row.reason}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>Reporter: {row.reporter_display_name ?? row.reporter_user_id}</span>
                    <span>Účastníci: {row.participant_names.join(" / ") || "-"}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {row.last_message_preview?.trim() || "Bez náhledu poslední zprávy."}
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs text-slate-500">
                  <div>#{row.report_id}</div>
                  <div>{new Date(row.created_at).toLocaleString("cs-CZ")}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

