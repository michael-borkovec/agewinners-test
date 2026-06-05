"use client";

/**
 * File: app/login/page.tsx
 * Description:
 * - Login/signup landing page with a conversion-focused hero.
 * - Authenticates users through Supabase Auth.
 * - Redirects successful login to the home feed.
 * - Uses public/main_background.jpg as the hero background.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "../../lib/api/auth";

const LOGIN_ATTEMPT_MESSAGES = [
  "Tipuj raději věk, heslo ale potřebujeme přesně 🙂",
  "👉\nSnaha se cení, ale zatím to nesedí 😉",
  "👉\nPořád to není ono. Nechceš si heslo obnovit?",
  "👉\nPošli si nové heslo a pojďme dál 👍",
] as const;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Přihlášení se nepovedlo.";
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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  async function handleLogin(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);

    const emailValidationMessage = getEmailValidationMessage(email);
    if (emailValidationMessage) {
      setError(emailValidationMessage);
      return;
    }

    if (!password) {
      setError("Zadej prosím heslo.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail({ email: email.trim(), password });
      setFailedAttempts(0);
      router.replace("/");
    } catch (e: unknown) {
      console.error(e);
      const message = getErrorMessage(e);

      if (message.toLowerCase().includes("email not confirmed")) {
        setError("Nejdříve prosím potvrď svůj email.");
      } else {
        const nextFailedAttempts = Math.min(failedAttempts + 1, LOGIN_ATTEMPT_MESSAGES.length);
        setFailedAttempts(nextFailedAttempts);
        setError(LOGIN_ATTEMPT_MESSAGES[nextFailedAttempts - 1]);
      }
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

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-10 px-5 py-10 sm:px-8 lg:grid lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-12 lg:px-12 lg:translate-x-[5vw] lg:-translate-y-[31vh] xl:px-16">
        <div className="max-w-[500px] space-y-6 pt-10 lg:pt-0">
          <div className="space-y-4">
            <h1 className="max-w-[11ch] text-5xl font-extrabold leading-tight tracking-normal text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
              Na kolik let tipnou tebe?
            </h1>

            <p className="max-w-[500px] text-xl font-medium leading-8 text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-2xl">
              Přidej fotku, nech ostatní hádat tvůj věk
              <br />
              a sleduj, jak se tvůj AW věk mění v čase.
            </p>

            <p className="text-base font-medium tracking-normal text-white/80 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-lg">
              Porovnávej se, inspiruj se, zlepšuj se.
            </p>
          </div>

          <Link
            href="/register"
            className="inline-flex rounded-lg bg-[#32CD32] px-8 py-4 text-lg font-bold text-white shadow-xl shadow-black/30 transition hover:-translate-y-0.5 hover:bg-[#28b828] hover:shadow-[#32CD32]/35 focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black"
          >
            Zjistit svůj AW věk
          </Link>
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <div className="w-full max-w-[430px] rounded-lg border border-white/12 bg-black/45 p-6 shadow-2xl shadow-black/45 backdrop-blur-md sm:p-7">
            <h2 className="text-2xl font-bold text-white">Už máte účet?</h2>

            <form className="mt-6 space-y-5" onSubmit={handleLogin} noValidate>
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

              <label className="block text-sm font-medium text-white/90">
                Heslo
                <input
                  className="mt-2 w-full rounded-lg border border-white/20 bg-white/78 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#32CD32] focus:bg-white focus:ring-2 focus:ring-[#32CD32]/40"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>

              {error ? (
                <div className="space-y-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100">
                  <p className="whitespace-pre-line">{error}</p>
                  {failedAttempts >= 4 ? (
                    <Link
                      href="/forgot-password"
                      className="inline-flex rounded-lg bg-white/95 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#98f398]"
                    >
                      Obnovit heslo
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#32CD32] py-3 text-base font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Přihlašuji..." : "Přihlásit se"}
              </button>

              <p className="text-center text-sm text-white/88">
                Nemáš účet?{" "}
                <Link href="/register" className="font-bold text-[#98f398] underline underline-offset-4 hover:text-white">
                  Vytvořit profil
                </Link>
              </p>

              <p className="text-center text-sm text-white/82">
                <Link href="/forgot-password" className="font-semibold text-white/90 underline underline-offset-4 hover:text-[#98f398]">
                  Klikni zde pro obnovení hesla
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
