/**
 * File purpose
 * - Admin inbox for message thread reports.
 * Main responsibilities
 * - Show report list and route moderators to detail review
 * Related APIs, components, or modules
 * - components/admin/MessageReportsList.tsx
 */

import MessageReportsList from "@/components/admin/MessageReportsList";
import AdminSectionNav from "@/components/admin/AdminSectionNav";

export default function AdminMessageReportsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Reporty konverzací</h1>
          <p className="mt-1 text-sm text-slate-600">Klikni na report pro detail a rozhodnutí moderátora.</p>
        </div>
        <AdminSectionNav active="message_reports" />
      </div>

      <MessageReportsList />
    </div>
  );
}
