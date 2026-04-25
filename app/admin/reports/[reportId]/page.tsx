/**
 * File: app/admin/reports/[reportId]/page.tsx
 *
 * Purpose:
 * - Admin report detail page
 */

import Link from "next/link";
import ReportDetail from "@/components/admin/ReportDetail";

export default function AdminReportDetailPage({ params }: { params: { reportId: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Detail reportu</h1>
          <p className="mt-1 text-sm text-slate-600">Rozhodni: přijmout / zamítnout.</p>
        </div>

        <Link
          href="/admin/reports"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Zpět na seznam
        </Link>
      </div>

      <ReportDetail reportId={params.reportId} />
    </div>
  );
}
