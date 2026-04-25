"use client";

/**
 * File purpose
 * - Public/help content page for AgeWinners users.
 * - Explains platform basics, content rules, question-mark hints, and admin contact.
 * - Related APIs, components, or modules
 *   - lib/api/adminContact.ts
 *   - components/auth/AuthContext.tsx
 */

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { sendAdminContactMessage } from "@/lib/api/adminContact";

const helpActions = [
  "Sdílet své příspěvky, fotografie a zkušenosti",
  "Nechat ostatní tipovat váš věk a sledovat výsledky",
  "Tipovat věk u ostatních a zlepšovat svou přesnost",
  "Nastavit, kdo váš obsah uvidí",
  "Komentovat a reagovat na obsah ostatních",
  "Budovat síť kontaktů a sledovat zajímavé lidi",
  "Sledovat své statistiky a vývoj v čase",
  "Objevovat inspiraci od lidí různých věkových skupin",
] as const;

const contentRules = [
  "Nesdílejte urážlivý, ponižující nebo diskriminační obsah",
  "Není dovoleno publikovat rasistické, nenávistné nebo jinak nevhodné fotografie",
  "Vyhněte se obsahu se sexuálním nebo explicitně erotickým motivem",
] as const;

const reportReasons = [
  "porušení výše uvedených pravidel",
  "nevhodný nebo urážlivý obsah",
  "fotografie, které znemožňují férové tipování (např. více osob na fotografii, nekvalitní nebo nejasná fotografie)",
] as const;

export default function HelpPage() {
  const { isLoggedIn } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendAdminMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSentMessage(null);
    setSendError(null);

    if (!message.trim()) {
      setSendError("Napište prosím zprávu pro správce.");
      return;
    }

    setSending(true);
    try {
      await sendAdminContactMessage(message);
      setMessage("");
      setSentMessage("Zpráva byla doručena správcům.");
    } catch (error: unknown) {
      setSendError(error instanceof Error ? error.message : "Zprávu se nepodařilo odeslat.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-3xl space-y-7">
        <section className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Nápověda</h1>

          <p className="text-sm leading-6 text-slate-700">Vítejte v AgeWinners.</p>

          <p className="text-sm leading-6 text-slate-700">
            Je to prostor, kde lidé objevují, jak působí na ostatní, a sdílí inspiraci, zkušenosti a radost
            ze života napříč generacemi.
          </p>

          <p className="text-sm leading-6 text-slate-700">
            Nahrajte svou fotku, nechte komunitu tipnout váš věk a sledujte svůj AW věk, tedy na kolik
            let působíte podle ostatních. Získáte hravou, anonymní a férovou zpětnou vazbu, která vám
            pomůže lépe porozumět vlastnímu stylu, energii i dojmu, který zanecháváte.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Co zde můžete dělat</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {helpActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Otazníky v aplikaci</h2>
          <p className="text-sm leading-6 text-slate-700">
            Při používání platformy věnujte pozornost ikonám otazníku.
          </p>
          <p className="text-sm leading-6 text-slate-700">
            Otazník označuje krátkou nápovědu k dané funkci nebo nastavení. Pomůže vám rychle pochopit,
            jak funguje viditelnost obsahu, tipování věku, skóre nebo odhalování informací.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Jak sdílet obsah</h2>
          <p className="text-sm leading-6 text-slate-700">
            Pište autenticky, srozumitelně a s respektem k ostatním. Sdílejte to, co je pro vás užitečné,
            inspirativní nebo osobně důležité.
          </p>
          <p className="text-sm leading-6 text-slate-700">
            AgeWinners stojí na pozitivní energii, důvěře a vzájemné podpoře.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Pravidla obsahu</h2>
          <p className="text-sm leading-6 text-slate-700">
            Aby se tu každý cítil dobře, platí několik jednoduchých pravidel:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {contentRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-slate-700">
            Vzhledem k zaměření platformy je v pořádku sdílet fotografie v plavkách nebo sportovním
            oblečení, pokud jsou přirozené, respektující a v souladu s výše uvedenými pravidly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Nahlášení obsahu a kontakt na správce</h2>
          <p className="text-sm leading-6 text-slate-700">
            Pokud narazíte na obsah, který není v souladu s pravidly, můžete jej jednoduše nahlásit.
          </p>
          <p className="text-sm leading-6 text-slate-700">Důvody pro nahlášení mohou být například:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {reportReasons.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-slate-700">
            Každé nahlášení pomáhá udržovat komunitu bezpečnou a kvalitní pro všechny.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Kontaktování správce</h2>
          <p className="text-sm leading-6 text-slate-700">
            Pokud potřebujete pomoc nebo chcete něco řešit přímo, můžete napsat zprávu správci.
          </p>
          <p className="text-sm leading-6 text-slate-700">
            Vaše zpráva bude doručena přímo do chatu správcům, kteří se jí budou věnovat.
          </p>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                setContactOpen(true);
                setSentMessage(null);
                setSendError(null);
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Napsat správci
            </button>
          ) : (
            <Link href="/login" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Přihlásit se pro kontaktování správce
            </Link>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Když si nejste jistí</h2>
          <p className="text-sm leading-6 text-slate-700">
            Pokud si nejste jistí, jak něco funguje, využijte otazníky přímo v aplikaci. Najdete v nich
            rychlé a praktické vysvětlení.
          </p>
        </section>
      </div>

      {contactOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setContactOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-contact-title"
        >
          <form
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSendAdminMessage}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="admin-contact-title" className="text-base font-semibold text-slate-900">
                Zpráva správci
              </h2>
              <CloseButton onClick={() => setContactOpen(false)} label="Zavřít zprávu správci" />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Napište, s čím potřebujete pomoci. Zpráva se odešle všem správcům.
            </p>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Zpráva
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                maxLength={4000}
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Popište prosím, co potřebujete vyřešit..."
              />
            </label>

            {sendError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{sendError}</p> : null}
            {sentMessage ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{sentMessage}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AwButton variant="tertiary" onClick={() => setContactOpen(false)}>
                Zavřít
              </AwButton>
              <AwButton variant="primary" type="submit" disabled={sending}>
                {sending ? "Odesílám..." : "Odeslat správcům"}
              </AwButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
