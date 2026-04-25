/**
 * File purpose
 * - Admin detail page for one message thread report.
 * Main responsibilities
 * - Render full thread report review UI for moderators
 * Related APIs, components, or modules
 * - components/admin/MessageReportDetail.tsx
 */

import Link from "next/link";
import MessageReportDetail from "@/components/admin/MessageReportDetail";

export default function AdminMessageReportDetailPage({ params }: { params: { reportId: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Detail reportu konverzace</h1>
          <p className="mt-1 text-sm text-slate-600">Moderátor potvrdí nebo zamítne report nad celým vláknem.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/message-reports"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Zpět na reporty konverzací
          </Link>
        </div>
      </div>

      <MessageReportDetail reportId={params.reportId} />
    </div>
  );
}
