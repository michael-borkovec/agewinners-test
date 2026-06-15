"use client";

/**
 * File purpose
 * - Handles Supabase email confirmation redirects.
 * - Exchanges successful confirmation codes for a browser session.
 * - Shows clear Czech messages for expired or invalid confirmation links.
 * Related APIs, components, or modules
 * - lib/supabaseClient.ts
 * - lib/api/auth.ts
 * - app/register/page.tsx
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CallbackState = "checking" | "success" | "error";

function getCallbackParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  function read(key: string) {
    return searchParams.get(key) ?? hashParams.get(key);
  }

  return {
    code: read("code"),
    error: read("error"),
    errorCode: read("error_code"),
    errorDescription: read("error_description"),
  };
}

function getReadableErrorMessage(errorCode: string | null, errorDescription: string | null) {
  if (errorCode === "otp_expired") {
    return "Potvrzovací odkaz už není platný. Odkaz v e-mailu lze použít jen omezenou dobu a obvykle pouze jednou.";
  }

  if (errorDescription) {
    try {
      return decodeURIComponent(errorDescription.replace(/\+/g, " "));
    } catch {
      return errorDescription.replace(/\+/g, " ");
    }
  }

  return "Potvrzení e-mailu se nepodařilo. Zkuste prosím použít nejnovější e-mail s potvrzovacím odkazem.";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>("checking");
  const [message, setMessage] = useState("Ověřujeme potvrzovací odkaz...");

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      const { code, error, errorCode, errorDescription } = getCallbackParams();

      if (error || errorCode) {
        if (!active) return;
        setState("error");
        setMessage(getReadableErrorMessage(errorCode, errorDescription));
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (!active) return;

        if (exchangeError) {
          setState("error");
          setMessage(getReadableErrorMessage(null, exchangeError.message));
          return;
        }

        setState("success");
        setMessage("E-mail je potvrzený. Za chvíli vás přesměrujeme do profilu.");
        window.setTimeout(() => router.replace("/profile/basic"), 900);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session) {
        setState("success");
        setMessage("E-mail je potvrzený. Za chvíli vás přesměrujeme do profilu.");
        window.setTimeout(() => router.replace("/profile/basic"), 900);
        return;
      }

      setState("error");
      setMessage("V odkazu chybí potvrzovací údaje. Otevřete prosím nejnovější potvrzovací e-mail z AgeWinners.");
    }

    void handleCallback();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "url('/main_background.jpg')" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.15)_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[520px] rounded-lg border border-white/12 bg-black/45 p-6 shadow-2xl shadow-black/45 backdrop-blur-md sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#98f398]">AgeWinners</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white">
            {state === "success" ? "E-mail potvrzen" : state === "error" ? "Odkaz neplatí" : "Potvrzení e-mailu"}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/86">{message}</p>

          {state === "error" ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex justify-center rounded-lg bg-[#32CD32] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-[#98f398] focus:ring-offset-2 focus:ring-offset-black"
              >
                Zkusit registraci znovu
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center rounded-lg bg-white/95 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#98f398]"
              >
                Přejít na přihlášení
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
