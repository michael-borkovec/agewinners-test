"use client";

/**
 * File purpose
 * - User registration page styled as a public AgeWinners landing form.
 * - Enforces the 16+ age rule before calling Supabase Auth sign-up.
 * - Related APIs, components, or modules
 *   - lib/api/auth.ts
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUpWithEmail } from "../../lib/api/auth";

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

function daysUntil16(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const sixteen = new Date(dob);
  sixteen.setFullYear(dob.getFullYear() + 16);

  const today = new Date();
  return Math.ceil((sixteen.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Registrace se nepovedla.";
}

function normalizeReferralSlug(value: string | null | undefined) {
  const slug = String(value ?? "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 8);
  return slug.length >= 6 ? slug : "";
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const referralSlugFromUrl = useMemo(() => normalizeReferralSlug(searchParams?.get("ref")), [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [referralSlug, setReferralSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (referralSlugFromUrl) {
      setReferralSlug(referralSlugFromUrl);
      window.localStorage.setItem("aw_referral_slug", referralSlugFromUrl);
      return;
    }

    const stored = normalizeReferralSlug(window.localStorage.getItem("aw_referral_slug"));
    if (stored) setReferralSlug(stored);
  }, [referralSlugFromUrl]);

  async function handleRegister(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Prosím vyplň email i heslo.");
      return;
    }

    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }

    if (!dateOfBirth) {
      setError("Prosím zadej datum narození.");
      return;
    }

    const age = calculateAge(dateOfBirth);
    if (age < 16) {
      const days = daysUntil16(dateOfBirth);
      setError(`Age Winners je určen pouze pro starší 16 let, vrať se za ${days} dnů prosím.`);
      return;
    }

    setLoading(true);

    try {
      await signUpWithEmail({ email, password, dateOfBirth, referralSlug: referralSlug || null });
      setRegistered(true);
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <main
        className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat text-white"
        style={{ backgroundImage: "url('/main_background.jpg')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.15)_100%)]" />

        <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-[520px] rounded-lg border border-white/12 bg-black/45 p-6 shadow-2xl shadow-black/45 backdrop-blur-md sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#98f398]">AgeWinners</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">Zkontroluj email</h1>
            <p className="mt-4 text-base leading-7 text-white/86">
              Poslali jsme ti potvrzovací odkaz. Po kliknutí se účet aktivuje a otevře se dokončení
              profilu.
            </p>
            <Link
              className="mt-6 inline-flex rounded-lg bg-[#32CD32] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black"
              href="/login"
            >
              Přejít na přihlášení
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "url('/main_background.jpg')" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.15)_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-10 px-5 py-10 sm:px-8 lg:grid lg:grid-cols-[3fr_2fr] lg:items-center lg:gap-12 lg:px-12 xl:px-16">
        <div className="max-w-[500px] space-y-5 pt-10 lg:pt-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#98f398]">AgeWinners</p>
          <h1 className="text-5xl font-extrabold leading-tight tracking-normal text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.55)] sm:text-6xl">
            Začni svým AW věkem
          </h1>
          <p className="max-w-[500px] text-xl font-medium leading-8 text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-2xl">
            Nahraješ fotku, ostatní tipnou tvůj věk a ty zjistíš, jak působíš podle komunity.
          </p>
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <div className="w-full max-w-[430px] rounded-lg border border-white/12 bg-black/45 p-6 shadow-2xl shadow-black/45 backdrop-blur-md sm:p-7">
            <h2 className="text-2xl font-bold text-white">Vytvořit profil</h2>
            <p className="mt-2 text-sm leading-6 text-white/76">
              Registrace zabere jen chvíli. AgeWinners je pro všechny od 16 do 116 let.
            </p>
            {referralSlug ? (
              <p className="mt-3 rounded-lg border border-[#32CD32]/35 bg-[#32CD32]/12 px-3 py-2 text-sm font-semibold text-white">
                Registrace přes AW pozvánku.
              </p>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleRegister}>
              <label className="block text-sm font-medium text-white/90">
                E-mail
                <input
                  className="mt-2 w-full rounded-lg border border-white/20 bg-white/78 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#32CD32] focus:bg-white focus:ring-2 focus:ring-[#32CD32]/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="tvoje@email.cz"
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
                  placeholder="min. 6 znaků"
                  autoComplete="new-password"
                />
              </label>

              <label className="block text-sm font-medium text-white/90">
                Datum narození
                <input
                  className="mt-2 w-full rounded-lg border border-white/20 bg-white/78 px-4 py-3 text-slate-950 outline-none transition focus:border-[#32CD32] focus:bg-white focus:ring-2 focus:ring-[#32CD32]/40"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  type="date"
                  autoComplete="bday"
                />
              </label>

              {error ? <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#32CD32] py-3 text-base font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Zakládám účet..." : "Zaregistrovat se"}
              </button>

              <p className="text-center text-sm text-white/88">
                Už máš účet?{" "}
                <Link className="font-bold text-[#98f398] underline underline-offset-4 hover:text-white" href="/login">
                  Přihlásit se
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
