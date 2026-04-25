/**
 * File purpose
 * - Modal dialog for reporting a whole message thread.
 * Main responsibilities
 * - Collect reason and optional/required comment
 * - Submit report through the messaging API helper
 * Related APIs, components, or modules
 * - lib/api/messages.ts
 * - app/messages/page.tsx
 */

"use client";

import { useMemo, useState } from "react";
import {
  MESSAGE_THREAD_REPORT_REASONS,
  reportMessageThread,
  type MessageThreadReportReason,
} from "@/lib/api/messages";
import AwButton from "@/components/AwButton";
import { awAlert } from "@/components/AwDialog";
import CloseButton from "@/components/CloseButton";

export default function ReportThreadModal(props: {
  open: boolean;
  threadId: number | null;
  onClose: () => void;
  onReported?: () => void;
}) {
  const [reason, setReason] = useState<MessageThreadReportReason>(MESSAGE_THREAD_REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentRequired = useMemo(
    () => reason === MESSAGE_THREAD_REPORT_REASONS[MESSAGE_THREAD_REPORT_REASONS.length - 1],
    [reason]
  );

  if (!props.open) return null;

  async function handleSubmit() {
    if (!props.threadId) return;

    const cleanDetails = details.trim();
    if (commentRequired && cleanDetails.length < 3) {
      setError("U volby Ostatní je komentář povinný.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await reportMessageThread({
        threadId: props.threadId,
        reason,
        details: cleanDetails,
      });
      props.onReported?.();
      props.onClose();
      setDetails("");
      setReason(MESSAGE_THREAD_REPORT_REASONS[0]);
      await awAlert("Děkuji, nahlášení konverzace bylo odesláno.");
    } catch (e: any) {
      setError(e?.message ?? "Nahlášení konverzace se nepodařilo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Nahlásit konverzaci</h3>
            <p className="mt-1 text-sm text-slate-600">
              Nahlášení půjde moderátorům ke schválení nebo zamítnutí.
            </p>
          </div>

          <CloseButton onClick={props.onClose} disabled={sending} />
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Důvod</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as MessageThreadReportReason)}
              disabled={sending}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {MESSAGE_THREAD_REPORT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">
              Komentář {commentRequired ? "(povinný)" : "(volitelný)"}
            </span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              disabled={sending}
              className="min-h-[96px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder={commentRequired ? "Prosím popiš problém..." : "Volitelně doplň detaily..."}
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <AwButton variant="primary" onClick={() => void handleSubmit()} disabled={sending || !props.threadId}>
              {sending ? "Odesílám..." : "Odeslat nahlášení"}
            </AwButton>
          </div>
        </div>
      </div>
    </div>
  );
}
