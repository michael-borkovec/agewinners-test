/**
 * File purpose
 * - Modal dialog for reporting a comment.
 * Main responsibilities
 * - Let user choose a reason and optional detail, then submit a comment report.
 * Related APIs, components, or modules
 * - lib/api/commentReports.ts
 * - components/PostCard.tsx
 */

"use client";

import { useMemo, useState } from "react";
import { COMMENT_REPORT_REASONS, type CommentReportReason, reportComment } from "@/lib/api/commentReports";
import AwButton from "@/components/AwButton";
import { awAlert } from "@/components/AwDialog";
import CloseButton from "@/components/CloseButton";

export default function ReportCommentModal(props: {
  open: boolean;
  commentId: number | null;
  onClose: () => void;
  onReported?: () => void;
}) {
  const [reason, setReason] = useState<CommentReportReason>(COMMENT_REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentRequired = useMemo(() => reason === COMMENT_REPORT_REASONS[COMMENT_REPORT_REASONS.length - 1], [reason]);

  if (!props.open) return null;

  async function onSubmit() {
    if (!props.commentId) return;

    const trimmed = details.trim();
    if (commentRequired && trimmed.length < 3) {
      setError("U volby „Ostatní“ je komentář povinný.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await reportComment({ commentId: props.commentId, reason, details: trimmed });
      props.onReported?.();
      await awAlert("Děkujeme, nahlášení komentáře bylo odesláno.");
      props.onClose();
      setDetails("");
      setReason(COMMENT_REPORT_REASONS[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nahlášení komentáře se nepodařilo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Nahlásit komentář</h3>
            <p className="mt-1 text-sm text-slate-600">Vyber důvod nahlášení komentáře.</p>
          </div>

          <CloseButton onClick={props.onClose} disabled={sending} />
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Důvod</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CommentReportReason)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              disabled={sending}
            >
              {COMMENT_REPORT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">
              Komentář {commentRequired ? "(povinné)" : "(volitelné)"}
            </span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[96px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder={commentRequired ? "Prosím popiš problém..." : "Pokud chceš, doplň detail..."}
              disabled={sending}
            />
          </label>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="flex items-center justify-end gap-2">
            <AwButton variant="primary" onClick={onSubmit} disabled={sending || !props.commentId}>
              {sending ? "Odesílám..." : "Odeslat nahlášení"}
            </AwButton>
          </div>
        </div>
      </div>
    </div>
  );
}
