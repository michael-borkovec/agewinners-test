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

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import CloseButton from "@/components/CloseButton";
import StandardHelpContent from "@/components/help/StandardHelpContent";
import { buildHelpHref, getHelpEntry } from "@/lib/helpCatalog";

type HelpIconButtonProps = {
  helpText: string;
  helpKey?: string;
  customContent?: ReactNode;
  helpBlocks?: Array<{
    iconPath: string;
    secondaryIconPath?: string;
    alt: string;
    title?: string;
    text: string;
  }>;
  title?: string;
  className?: string;
  iconClassName?: string;
  modalTitle?: string;
  modalOverlayClassName?: string;
  helpLinkLabel?: string;
  helpLinkClassName?: string;
  helpHref?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
};

function normalizeHelpText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\/n/g, "\n");
}

function truncateTooltip(text: string, limit = 100) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit).trimEnd()}...`;
}

function PlainHelpContent({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  const [intro, ...details] = paragraphs;

  return (
    <div className="w-full max-w-xl rounded-2xl bg-gradient-to-br from-[#e8fbe8] via-white to-white p-4 text-slate-700 sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title.replace(/^Nápověda\s*[-–]\s*/i, "")}</h3>
        {intro ? <p className="mt-1 text-sm leading-6">{intro}</p> : null}
      </div>

      {details.length > 0 ? (
        <div className="mt-5 grid gap-3 text-sm">
          {details.map((paragraph, index) => (
            <div key={`${paragraph}-${index}`} className="rounded-xl bg-white/90 p-3 leading-6">
              {paragraph}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function HelpIconButton({
  helpText,
  helpKey,
  customContent,
  helpBlocks,
  title = "Nápověda",
  className = "",
  iconClassName = "h-5 w-5",
  modalTitle = "Nápověda",
  modalOverlayClassName = "z-[80]",
  breadcrumbs,
}: HelpIconButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const normalizedHelpText = normalizeHelpText(helpText);
  const tooltipText = truncateTooltip(normalizedHelpText);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const helpParagraphs = normalizedHelpText.split(/\n{2,}/);
  const catalogEntry = getHelpEntry(helpKey);
  const resolvedBreadcrumbs =
    breadcrumbs ??
    (catalogEntry
      ? (() => {
          const crumbs = [
            { label: "Nápověda", href: "/help" },
            { label: catalogEntry.sectionTitle, href: `/help?section=${catalogEntry.sectionId}` },
          ];

          if (catalogEntry.groupTitle && catalogEntry.groupTitle !== catalogEntry.sectionTitle) {
            crumbs.push({
              label: catalogEntry.groupTitle,
              href: `/help?section=${catalogEntry.sectionId}&group=${encodeURIComponent(catalogEntry.groupTitle)}`,
            });
          }

          const previousLabel = crumbs[crumbs.length - 1]?.label;
          if (catalogEntry.title !== previousLabel) {
            crumbs.push({ label: catalogEntry.title, href: buildHelpHref(catalogEntry) });
          }

          return crumbs;
        })()
      : undefined);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-md p-2 hover:bg-slate-100 ${className}`.trim()}
        aria-label={title}
        title={tooltipText}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/action/help.png" alt={title} className={iconClassName} />
      </button>

      {mounted && open ? createPortal(
        <div
          className={`fixed inset-0 flex items-end justify-center overflow-y-auto bg-black/40 p-4 sm:items-center ${modalOverlayClassName}`}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-icon-modal-title"
        >
          <div
            className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-5 pt-12 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="help-icon-modal-title" className="sr-only">
              {modalTitle}
            </h2>
            <CloseButton onClick={() => setOpen(false)} label="Zavřít nápovědu" className="absolute right-4 top-6" />

            {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 ? (
              <nav className="mt-4 flex w-full flex-wrap items-center gap-2 rounded-xl bg-gradient-to-r from-[#e8fbe8] via-white to-white px-3 py-2 text-[16px] italic text-slate-500 shadow-[0_10px_30px_rgba(50,205,50,0.10)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/action/help.png" alt="" className="h-6 w-6 shrink-0 object-contain" />
                {resolvedBreadcrumbs.map((crumb, index) => {
                  const isLast = index === resolvedBreadcrumbs.length - 1;
                  return (
                  <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
                    {index > 0 ? <span className="text-slate-300">›</span> : null}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={isLast ? "font-bold text-emerald-900 hover:text-emerald-800 hover:underline" : "font-normal text-slate-500 hover:text-emerald-800 hover:underline"}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-bold text-emerald-900" : undefined}>{crumb.label}</span>
                    )}
                  </span>
                  );
                })}
              </nav>
            ) : null}

            {customContent ? (
              <div className="mt-4 overflow-y-auto overflow-x-hidden pr-1">{customContent}</div>
            ) : catalogEntry ? (
              <div className="mt-4 overflow-y-auto overflow-x-hidden pr-1">
                <StandardHelpContent entry={catalogEntry} />
              </div>
            ) : helpBlocks && helpBlocks.length > 0 ? (
              <div className="mt-4 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
                {helpBlocks.map((block, index) => (
                  <div key={`${block.iconPath}-${index}`} className={index > 0 ? "pt-4" : ""}>
                    <div className="flex gap-3">
                    <div className="mt-0.5 flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={block.iconPath} alt={block.alt} className="h-8 w-8 object-contain" />
                      {block.secondaryIconPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={block.secondaryIconPath} alt="" className="h-8 w-8 object-contain" />
                      ) : null}
                    </div>
                    <div>
                      {block.title ? <div className="text-sm font-bold text-slate-950">{block.title}</div> : null}
                      <p className="text-sm leading-6 text-slate-700">{block.text}</p>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 overflow-y-auto overflow-x-hidden pr-1">
                <PlainHelpContent title={modalTitle} paragraphs={helpParagraphs} />
              </div>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
