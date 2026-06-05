import type { ReactNode } from "react";

export default function SoftEmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#e8fbe8] via-white to-white p-5">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

