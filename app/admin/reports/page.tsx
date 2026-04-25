/**
 * File: app/admin/reports/page.tsx
 *
 * Purpose:
 * - Admin inbox for image reports
 */

import ReportsList from "@/components/admin/ReportsList";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Nahlášené fotky</h1>
          <p className="mt-1 text-sm text-slate-600">Klikni na report pro detail a rozhodnutí.</p>
        </div>
      </div>

      <ReportsList />
    </div>
  );
}
