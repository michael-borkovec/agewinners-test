/**
 * File purpose
 * - Shared section title with leading menu icon.
 * Main responsibilities
 * - Keep heading/icon alignment consistent across main pages
 * - Render icon at the same visual height as one line of the title
 * Related APIs, components, or modules
 * - app/my-albums/page.tsx
 * - app/network/page.tsx
 * - app/messages/page.tsx
 * - app/notifications/page.tsx
 */

type PageSectionTitleProps = {
  title: string;
  iconPath: string;
  className?: string;
  sizeClassName?: string;
};

export function PageSectionTitle({
  title,
  iconPath,
  className,
  sizeClassName = "text-[1.625rem]",
}: PageSectionTitleProps) {
  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconPath} alt="" className="h-[2.1em] w-[2.1em] shrink-0" />
      <h1 className={["font-semibold leading-tight text-slate-900", sizeClassName].join(" ")}>
        {title}
      </h1>
    </div>
  );
}
