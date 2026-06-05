/**
 * File: components/ReportImageModal.tsx
 *
 * Purpose:
 * - Modal dialog for reporting an image.
 * - Lets user select a reason + optional/required comment.
 */

"use client";

import React, { useMemo, useState } from "react";
import { reportImage, REPORT_REASONS, ReportReason } from "@/lib/api/imageReports";
import AwButton from "@/components/AwButton";
import { awAlert } from "@/components/AwDialog";
import CloseButton from "@/components/CloseButton";
import HelpIconButton from "@/components/HelpIconButton";

export default function ReportImageModal(props: {
  open: boolean;
  imageId: number | null;
  onClose: () => void;
  onReported?: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentRequired = useMemo(
    () => reason === REPORT_REASONS[REPORT_REASONS.length - 1],
    [reason]
  );

  if (!props.open) return null;

  async function onSubmit() {
    if (!props.imageId) return;

    const d = details.trim();
    if (commentRequired && d.length < 3) {
      setError("U volby „Ostatní“ je komentář povinný.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      await reportImage({ imageId: props.imageId, reason, details: d });
      props.onReported?.();
      await awAlert("Děkujeme, nahlášení bylo odesláno.");
      props.onClose();
      setDetails("");
      setReason(REPORT_REASONS[0]);
    } catch (e: any) {
      setError(e?.message ?? "Nahlášení se nepodařilo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Nahlásit fotku</h3>
            <p className="mt-1 text-sm text-slate-600">Napište důvod nahlášení:</p>
          </div>

          <div className="flex items-center gap-1">
            <HelpIconButton
              helpText="Nahlášení použij, když je fotka nevhodná, porušuje pravidla nebo potřebuje kontrolu správcem.\n\nVyber nejbližší důvod a podle potřeby doplň komentář. U volby „Ostatní“ je komentář povinný, aby správci věděli, co mají posoudit.\n\nOdesláním se fotka automaticky nemaže. Nahlášení se předá ke kontrole a správce rozhodne o dalším postupu."
              helpKey="image-report"
              modalTitle="Nápověda - nahlášení fotky"
            />
            <CloseButton onClick={props.onClose} disabled={sending} />
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-800">Důvod</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              disabled={sending}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
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
              placeholder={commentRequired ? "Prosím popište problém…" : "Pokud chcete, doplňte detail…"}
              disabled={sending}
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <AwButton variant="primary" onClick={onSubmit} disabled={sending || !props.imageId}>
              {sending ? "Odesílám…" : "Odeslat nahlášení"}
            </AwButton>
          </div>
        </div>
      </div>
    </div>
  );
}
