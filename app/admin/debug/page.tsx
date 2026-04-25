/**
 * File: app/admin/debug/page.tsx
 *
 * Purpose:
 * - Debug helper page for admin: calls RPC and shows types of returned fields.
 * - This avoids needing to import TS modules in browser console.
 */

"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDebugPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        const res = await supabase.rpc("admin_list_image_reports", {
          p_status: "open",
          p_limit: 1,
          p_offset: 0,
        });

        if (cancelled) return;

        if (res.error) {
          setErr(res.error.message);
          setPayload(null);
          return;
        }

        const row = res.data?.[0] ?? null;

        setPayload({
          report_id_value: row?.report_id ?? null,
          report_id_type: row ? typeof row.report_id : null,
          image_id_value: row?.image_id ?? null,
          image_id_type: row ? typeof row.image_id : null,
          raw_first_row: row,
        });
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-800">Admin debug</h1>

      {loading ? <div>Načítám…</div> : null}
      {err ? <div className="text-rose-700">Chyba: {err}</div> : null}

      {!loading && !err ? (
        <pre className="overflow-auto rounded-xl bg-slate-50 p-4 text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}

      <p className="text-sm text-slate-600">
        Otevři tuto stránku jako admin: <b>/admin/debug</b>
      </p>
    </div>
  );
}
