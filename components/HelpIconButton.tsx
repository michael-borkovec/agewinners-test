/**
 * File purpose
 * - Reusable question-mark help button with tooltip and modal
 * - Keep short contextual help consistent across pages
 * - Related APIs, components, or modules
 *   - components/SectionHeaderFilter.tsx
 *   - app/network/page.tsx
 *   - app/notifications/page.tsx
 *   - app/my-albums/page.tsx
 */

"use client";

import { useState } from "react";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";

type HelpIconButtonProps = {
  helpText: string;
  title?: string;
  className?: string;
  iconClassName?: string;
  modalTitle?: string;
  modalOverlayClassName?: string;
};

function normalizeHelpText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\/n/g, "\n");
}

export default function HelpIconButton({
  helpText,
  title = "Nápověda",
  className = "",
  iconClassName = "h-5 w-5",
  modalTitle = "Nápověda",
  modalOverlayClassName = "z-[80]",
}: HelpIconButtonProps) {
  const [open, setOpen] = useState(false);
  const normalizedHelpText = normalizeHelpText(helpText);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-md p-2 hover:bg-slate-100 ${className}`.trim()}
        aria-label={title}
        title={normalizedHelpText}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ui/otaznik.ico" alt={title} className={iconClassName} />
      </button>

      {open ? (
        <div
          className={`fixed inset-0 flex items-end justify-center bg-black/40 p-4 sm:items-center ${modalOverlayClassName}`}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-icon-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="help-icon-modal-title" className="text-base font-semibold text-slate-900">
                {modalTitle}
              </h2>

              <CloseButton onClick={() => setOpen(false)} label="Zavřít nápovědu" />
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{normalizedHelpText}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
