/**
 * File purpose
 * - Shared visual shell for structured contextual help
 * Main responsibilities
 * - Render concise intro, meaning cards, and optional practical tip
 * Related APIs, components, or modules
 * - lib/helpCatalog.ts
 * - components/HelpIconButton.tsx
 * - app/help/page.tsx
 */

import type { HelpEntry } from "@/lib/helpCatalog";

function CardMark({ kind }: { kind?: HelpEntry["cards"][number]["kind"] }) {
  if (kind === "diagonal") {
    return (
      <span className="relative mt-1.5 h-5 w-10 shrink-0" aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-0.5 w-10 -translate-y-1/2 rotate-[-45deg] rounded-full bg-slate-400" />
      </span>
    );
  }

  if (kind === "dashed") {
    return <span className="mt-2 h-0.5 w-10 shrink-0 border-t-2 border-dashed border-emerald-600" aria-hidden="true" />;
  }

  if (kind === "line" || kind === "solid") {
    return <span className="mt-2 h-0.5 w-10 shrink-0 rounded-full bg-[#32CD32]" aria-hidden="true" />;
  }

  return null;
}

export default function StandardHelpContent({ entry, hideTitle = false }: { entry: HelpEntry; hideTitle?: boolean }) {
  return (
    <div className="w-full max-w-2xl rounded-2xl bg-gradient-to-br from-[#e8fbe8] via-white to-white p-4 text-slate-700 sm:p-5">
      {entry.overviewTitle && entry.overviewText ? (
        <div className="mb-5">
          <h3 className="text-base font-semibold text-slate-950">{entry.overviewTitle}</h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-6">{entry.overviewText}</p>
        </div>
      ) : null}

      <div>
        {!hideTitle ? <h3 className="text-base font-semibold text-slate-950">{entry.title}</h3> : null}
        <p className={`${hideTitle ? "text-sm leading-6" : "mt-1 text-sm leading-6"} whitespace-pre-line`}>{entry.intro}</p>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        {entry.cards.map((card) => (
          <div key={card.title} className="flex items-start gap-3 rounded-xl bg-white/90 p-3">
            <CardMark kind={card.kind} />
            <div>
              <div className="font-semibold text-slate-950">{card.title}</div>
              <p className="leading-6">{card.text}</p>
            </div>
          </div>
        ))}
      </div>

      {entry.tip ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-white/90 p-3 text-sm leading-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/action/bulb.png" alt="" className="mt-0.5 h-10 w-10 shrink-0 object-contain" />
          <div>
            <div className="font-semibold text-emerald-900">Tip</div>
            <p>{entry.tip}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}



