"use client";

/**
 * File purpose
 * - Public password update page opened from Supabase recovery links.
 * - Saves a new password through the active Supabase recovery session.
 * - Related APIs, components, or modules
 *   - lib/api/auth.ts
 *   - app/forgot-password/page.tsx
 */

import { useState } from "react";
import Link from "next/link";
import { signOut, updatePassword } from "@/lib/api/auth";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Heslo se nepodařilo změnit.";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Nové heslo musí mít alespoň 6 znaků.");
      return;
    }

    if (password !== passwordAgain) {
      setError("Hesla se neshodují.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      await signOut();
      setDone(true);
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "url('/main_background.jpg')" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.15)_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[430px] rounded-lg border border-white/12 bg-black/45 p-6 shadow-2xl shadow-black/45 backdrop-blur-md sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#98f398]">AgeWinners</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white">Nastavit nové heslo</h1>

          {done ? (
            <div className="mt-5 space-y-5">
              <p className="text-sm leading-6 text-white/84">Heslo je změněné. Teď se můžeš bezpečně přihlásit.</p>
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-[#32CD32] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black"
              >
                Přejít na přihlášení
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-white/90">
                Nové heslo
                <input
                  className="mt-2 w-full rounded-lg border border-white/20 bg-white/78 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#32CD32] focus:bg-white focus:ring-2 focus:ring-[#32CD32]/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="min. 6 znaků"
                  autoComplete="new-password"
                />
              </label>

              <label className="block text-sm font-medium text-white/90">
                Nové heslo znovu
                <input
                  className="mt-2 w-full rounded-lg border border-white/20 bg-white/78 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#32CD32] focus:bg-white focus:ring-2 focus:ring-[#32CD32]/40"
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  type="password"
                  placeholder="zopakuj heslo"
                  autoComplete="new-password"
                />
              </label>

              {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#32CD32] py-3 text-base font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Ukládám..." : "Uložit nové heslo"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
