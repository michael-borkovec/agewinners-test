"use client";

import { useEffect, useState } from "react";
import { getMyActivity50Days, type DailyActivityRow } from "@/lib/api/stats";

export default function UserActivityTable() {
  const [rows, setRows] = useState<DailyActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyActivity50Days();
        setRows(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-600">Načítám aktivitu…</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="p-2 text-left">Den</th>
            <th className="p-2 text-center">Přihlášení</th>
            <th className="p-2 text-center">Fotky</th>
            <th className="p-2 text-center">Alba</th>
            <th className="p-2 text-center">Posty</th>
            <th className="p-2 text-center">Hodnocení</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="border-t">
              <td className="p-2">{r.day}</td>
              <td className="p-2 text-center">{r.login ? "✓" : "—"}</td>
              <td className="p-2 text-center">{r.photos}</td>
              <td className="p-2 text-center">{r.albums}</td>
              <td className="p-2 text-center">{r.posts}</td>
              <td className="p-2 text-center">{r.ratings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}