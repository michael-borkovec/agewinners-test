"use client";

/**
 * File: components/AuthBar.tsx
 * Description:
 *  Malá lišta pro přihlášení/odhlášení + info o userovi.
 *
 * Fixes:
 * - email state stays in sync (listens to auth changes)
 * - logout redirects using router.replace("/login") + router.refresh()
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { signOut } from "@/lib/api/auth";

export function AuthBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const sync = async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setEmail(data.user?.email ?? null);
    };

    sync();

    const { data: sub } = supabase.auth.onAuthStateChange(() => sync());

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl shadow p-3">
      <div className="text-sm text-gray-600">
        {email ? (
          <>
            Přihlášen: <span className="font-semibold">{email}</span>
          </>
        ) : (
          <>Nepřihlášen</>
        )}
      </div>

      <div className="flex gap-2">
        {!email ? (
          <>
            <a className="text-sm underline" href="/login">
              Login
            </a>
            <a className="text-sm underline" href="/register">
              Register
            </a>
          </>
        ) : (
          <button onClick={handleLogout} className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300">
            Logout
          </button>
        )}
      </div>
    </div>
  );
}