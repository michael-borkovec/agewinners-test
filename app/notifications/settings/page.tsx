/**
 * File purpose
 * - Render the standalone notification settings page.
 * Main responsibilities
 * - Reuse the shared notification settings panel and provide a route fallback.
 * - Keep the page usable from both Notifications and My Profile navigation.
 * Related APIs, components, or modules
 * - components/NotificationSettingsPanel.tsx
 * - app/notifications/page.tsx
 * - components/LeftSidebar.tsx
 */

"use client";

import Link from "next/link";
import NotificationSettingsPanel from "@/components/NotificationSettingsPanel";
import { PageSectionTitle } from "@/components/PageSectionTitle";

export default function NotificationSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl bg-white p-5 shadow">
        <PageSectionTitle title="Nastavení upozornění" iconPath="/icons/nav/notifications.png" sizeClassName="text-[1.85rem]" />
        <div className="mt-2">
          <NotificationSettingsPanel />
        </div>
        <div className="mt-6">
          <Link href="/notifications" className="text-sm font-medium text-emerald-700 hover:underline">
            Zpět na upozornění
          </Link>
        </div>
      </div>
    </div>
  );
}
