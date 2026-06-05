"use client";

/**
 * File purpose
 * - Public password reset request page.
 * - Sends a Supabase password recovery email.
 * - Related APIs, components, or modules
 *   - lib/api/auth.ts
 *   - app/login/page.tsx
 *   - app/reset-password/page.tsx
 */

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/api/auth";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Odkaz se nepodařilo odeslat.";
}

function getEmailValidationMessage(value: string) {
  const email = value.trim();

  if (!email) return "Zadej prosím e-mail.";
  if (/\s/.test(email)) return "E-mail nesmí obsahovat mezery.";
  if (!email.includes("@")) return "E-mail musí obsahovat znak „@“.";

  const parts = email.split("@");
  if (parts.length > 2) return "E-mail může obsahovat jen jeden znak „@“.";

  const [localPart, domainPart] = parts;
  if (!localPart) return "Před znakem „@“ musí být název schránky.";
  if (!domainPart) return "Za znakem „@“ musí být doména, například seznam.cz.";
  if (!domainPart.includes(".")) return "Za znakem „@“ chybí úplná doména, například seznam.cz.";
  if (domainPart.startsWith(".")) return "Doména za znakem „@“ nesmí začínat tečkou.";
  if (domainPart.endsWith(".")) return "Za tečkou v doméně ještě něco chybí.";

  return null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const emailValidationMessage = getEmailValidationMessage(email);
    if (emailValidationMessage) {
      setError(emailValidationMessage);
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
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
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white">Obnova hesla</h1>

          {sent ? (
            <div className="mt-5 space-y-5">
              <p className="text-sm leading-6 text-white/84">
                Pokud u nás tento e-mail existuje, poslali jsme na něj odkaz pro nastavení nového hesla.
              </p>
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-[#32CD32] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black"
              >
                Zpět na přihlášení
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <p className="text-sm leading-6 text-white/80">Zadej e-mail k účtu a pošleme ti bezpečný odkaz pro nastavení nového hesla.</p>

              <label className="block text-sm font-medium text-white/90">
                E-mail
                <input
                  className="mt-2 w-full rounded-lg border border-white/20 bg-white/78 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#32CD32] focus:bg-white focus:ring-2 focus:ring-[#32CD32]/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </label>

              {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#32CD32] py-3 text-base font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Odesílám..." : "Obnovit heslo"}
              </button>

              <p className="text-center text-sm text-white/82">
                <Link href="/login" className="font-semibold text-white/90 underline underline-offset-4 hover:text-[#98f398]">
                  Zpět na přihlášení
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
