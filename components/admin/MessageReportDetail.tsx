/**
 * File purpose
 * - Admin detail page for one message thread report.
 * Main responsibilities
 * - Show report metadata and thread transcript
 * - Let moderator accept or reject the report with a note
 * Related APIs, components, or modules
 * - lib/api/adminMessageReports.ts
 * - app/admin/message-reports/[reportId]/page.tsx
 */

"use client";

import { useEffect, useState } from "react";
import {
  adminGetMessageReport,
  adminResolveMessageReport,
  type AdminMessageReportDetail,
} from "@/lib/api/adminMessageReports";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("cs-CZ");
}

export default function MessageReportDetail({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<AdminMessageReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const report = await adminGetMessageReport(Number(reportId));
      setRow(report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nepodařilo se načíst detail reportu.");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function resolve(action: "confirm" | "reject") {
    if (!row || row.status !== "open") return;
    setSaving(true);
    try {
      await adminResolveMessageReport({
        reportId: row.report_id,
        action,
        adminNote: note.trim() ? note.trim() : null,
      });
      window.dispatchEvent(new Event("aw-notifications-changed"));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Akci se nepodařilo provést.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">Načítám...</div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  if (!row) return <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">Report nenalezen.</div>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-800">Shrnutí reportu</div>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div>
            <div className="text-xs text-slate-500">Důvod</div>
            <div className="font-semibold text-slate-900">{row.reason}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Reporter</div>
            <div>{row.reporter_display_name ?? row.reporter_user_id}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Účastníci</div>
            <div>{row.participant_names.map((item) => item.display_name).join(" / ") || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Vytvořeno</div>
            <div>{formatDateTime(row.created_at)}</div>
          </div>
          {row.details ? (
            <div>
              <div className="text-xs text-slate-500">Komentář reportéra</div>
              <div className="whitespace-pre-wrap break-words">{row.details}</div>
            </div>
          ) : null}
          <div>
            <div className="text-xs text-slate-500">Poslední zpráva</div>
            <div className="whitespace-pre-wrap break-words">{row.last_message_preview ?? "-"}</div>
          </div>
        </div>

        {row.status === "open" ? (
          <>
            <div className="mt-6">
              <label className="block text-xs font-semibold text-slate-700">Poznámka moderátora</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-slate-400"
                placeholder="Napište výsledek nebo kontext..."
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void resolve("confirm")}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Potvrdit report
              </button>
              <button
                type="button"
                onClick={() => void resolve("reject")}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Zamítnout report
              </button>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div>Vyřešeno: <span className="font-semibold">{formatDateTime(row.reviewed_at)}</span></div>
            <div className="mt-1">Moderátor: <span className="font-semibold">{row.reviewed_by_display_name ?? row.reviewed_by ?? "-"}</span></div>
            {row.admin_note ? (
              <div className="mt-1 whitespace-pre-wrap break-words">
                Poznámka: <span className="font-semibold">{row.admin_note}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold text-slate-800">Průběh konverzace</div>
        <div className="mt-4 space-y-3">
          {row.messages.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Vlákno zatím nemá žádné zprávy.</div>
          ) : (
            row.messages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{message.sender_display_name ?? message.sender_user_id}</span>
                  <span>{formatDateTime(message.created_at)}</span>
                  <span>#{message.id}</span>
                </div>
                {message.reply_to_body ? (
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <div className="font-semibold">Odpověď na zprávu</div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{message.reply_to_body}</div>
                  </div>
                ) : null}
                <div className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-900">{message.body}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

