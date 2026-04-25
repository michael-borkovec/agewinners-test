/**
 * File: app/admin/layout.tsx
 *
 * Purpose:
 * - Client-side admin guard:
 *   - Allow: role admin OR moderator
 *   - Deny: everyone else
 *
 * Why client-side:
 * - Current auth is client-side (session in localStorage), server middleware can't see it.
 *
 * Security note:
 * - Real security still enforced by DB RPC/RLS on admin endpoints.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<string>("Kontroluji přístup…");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setChecking(true);
      setMessage("Kontroluji přihlášení…");

      // 1) Must have session in browser
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        console.warn("AdminLayout: getSession error", error.message);
      }

      const session = data?.session ?? null;
      if (!session?.user) {
        setMessage("Nejsi přihlášen. Přesměrovávám na login…");
        router.replace("/login");
        return;
      }

      // 2) Must be admin OR moderator
      setMessage("Kontroluji oprávnění (admin/moderator)…");

      const { data: canEnter, error: roleErr } = await supabase.rpc("is_admin_or_moderator_current");
      if (cancelled) return;

      if (roleErr) {
        console.warn("AdminLayout: role check RPC error", roleErr.message);
        setMessage(`Chyba kontroly oprávnění: ${roleErr.message}`);
        setChecking(false);
        return;
      }

      if (!canEnter) {
        setMessage("Nemáš oprávnění pro administraci. Přesměrovávám…");
        router.replace("/");
        return;
      }

      // OK
      setChecking(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-slate-800">Admin</div>
          <div className="mt-2 text-sm text-slate-600">{message}</div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-300" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
