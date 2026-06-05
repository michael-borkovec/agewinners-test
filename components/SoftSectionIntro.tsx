import type { ReactNode } from "react";
import { PageSectionTitle } from "@/components/PageSectionTitle";

export default function SoftSectionIntro({
  title,
  iconPath,
  description,
  actions,
  sizeClassName = "text-[1.625rem]",
}: {
  title: string;
  iconPath: string;
  description?: string;
  actions?: ReactNode;
  sizeClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#e8fbe8] via-white to-white p-5 shadow-[0_12px_30px_rgba(50,205,50,0.10)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <PageSectionTitle title={title} iconPath={iconPath} sizeClassName={sizeClassName} />
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}



