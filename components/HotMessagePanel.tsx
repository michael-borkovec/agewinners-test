/**
 * Motivational sidebar message panel
 * Main responsibilities:
 * - Show one compact, personalized sidebar message
 * - Choose the message from daily/streak/upload/Power score aggregates
 * Related APIs, components, or modules:
 * - lib/api/hotMessages
 * - components/LeftSidebar
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DAILY_TIP_TARGET, loadHotMessageStats, type HotMessageStats } from "@/lib/api/hotMessages";
import { useAuth } from "@/components/auth/AuthContext";

type HotMessage = {
  title: string;
  body: string;
  ctaLabel?: string;
  href?: string;
};

const GENERAL_MESSAGES: HotMessage[] = [
  {
    title: "Každý dobrý tip se počítá.",
    body: "Power skóre roste s tvou aktivitou a přesností.",
    ctaLabel: "Tipovat",
    href: "/",
  },
  {
    title: "Tvoje aktivita má efekt.",
    body: "Čím víc tipuješ ostatní, tím větší šanci dostanou tvoje fotky.",
    ctaLabel: "Tipovat",
    href: "/",
  },
  {
    title: "30 hlasů znamená stabilní AW výsledek.",
    body: "80+ hlasů už ukazuje silný konsenzus.",
    ctaLabel: "Tipovat",
    href: "/",
  },
  {
    title: "AW věk je dojem ostatních, ne zdravotní ukazatel.",
    body: "Sleduj hlavně vývoj v čase.",
    ctaLabel: "Můj vývoj",
    href: "/stats",
  },
  {
    title: "Fotky s málo hlasy dostávají ve feedu větší šanci.",
    body: "Pomáháme tak výsledkům rychleji dozrát.",
    ctaLabel: "Tipovat",
    href: "/",
  },
];

function stableIndex(seed: string, length: number) {
  if (length <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function getPriorityMessage(stats: HotMessageStats): HotMessage | null {
  if (stats.revealReadyCount > 0) {
    return {
      title: "Máš připravený nový AW výsledek.",
      body: "Podívej se, jak tvoje fotka působila na ostatní.",
      ctaLabel: "Moje tipy",
      href: "/my-tips",
    };
  }

  if (!stats.streakDoneToday) {
    return {
      title: "Dnešní série ještě čeká.",
      body: "Tipni alespoň jednu fotku a udrž svůj AW rytmus.",
      ctaLabel: "Tipovat",
      href: "/",
    };
  }

  if (stats.tipsGivenToday > 0 && stats.tipsGivenToday < DAILY_TIP_TARGET) {
    const remaining = DAILY_TIP_TARGET - stats.tipsGivenToday;
    return {
      title: "Jsi blízko dnešní dávce.",
      body: `Ještě ${remaining} tipů a máš splněno ${DAILY_TIP_TARGET}.`,
      ctaLabel: "Tipovat",
      href: "/",
    };
  }

  if (stats.dailyTipTargetDone) {
    return {
      title: "Dnešní dávka hotová.",
      body: "Díky, tvoje tipy pomohly posunout výsledky ostatních.",
      ctaLabel: "Moje tipy",
      href: "/my-tips",
    };
  }

  if (stats.tipsReceived30d > stats.tipsGiven30d * 1.5 && stats.tipsReceived30d >= 10) {
    return {
      title: "Tvoje fotky by potřebovaly více hlasů.",
      body: "Dej dnes 10 tipů ostatním a podpoř tím i svoje fotky.",
      ctaLabel: "Tipovat",
      href: "/",
    };
  }

  if (stats.tipsGiven30d >= 30 && stats.uploads30d <= 1) {
    return stats.tipsGiven30d >= 60
      ? {
          title: "Máš dobrý rytmus.",
          body: "Přidej vlastní fotku a nech ostatní hádat tvůj AW věk.",
          ctaLabel: "Nahrát fotku",
          href: "/my-posts",
        }
      : {
          title: "Skvěle tipuješ ostatní.",
          body: "Nahraj novou fotku a zjisti, jak dnes působíš ty.",
          ctaLabel: "Nahrát fotku",
          href: "/my-posts",
        };
  }

  if (stats.ownPhotosBelow30Tips > 0) {
    const closeToStable = typeof stats.closestPhotoTipsToStable === "number" && stats.closestPhotoTipsToStable >= 24;
    return closeToStable
      ? {
          title: "Některé tvoje fotky jsou blízko stabilnímu výsledku.",
          body: "Stačí pár dalších hlasů. Zkus dnes tipnout 10 fotek ostatních.",
          ctaLabel: "Tipovat",
          href: "/",
        }
      : {
          title: "Máš hezky našlápnuto.",
          body: "Tipni dnes pár fotek ostatních a posuň svoje výsledky blíž ke stabilnímu AW věku.",
          ctaLabel: "Tipovat",
          href: "/",
        };
  }

  if (stats.referralBonusActive) {
    return {
      title: "Pozvi aktivní známé do AW.",
      body: "30 dní získáš bonus z jejich Power skóre. Jim se nic neodečítá.",
      ctaLabel: "Pozvat známé",
      href: "/profile/basic",
    };
  }

  return null;
}

function rotateMessages(messages: HotMessage[], seed: string) {
  if (messages.length <= 1) return messages;
  const start = stableIndex(seed, messages.length);
  return [...messages.slice(start), ...messages.slice(0, start)];
}

function buildMessages(stats: HotMessageStats, refreshSeed: string): HotMessage[] {
  const priorityMessage = getPriorityMessage(stats);
  const generalMessages = rotateMessages(GENERAL_MESSAGES, refreshSeed);
  return priorityMessage ? [priorityMessage, ...generalMessages] : generalMessages;
}

export default function HotMessagePanel() {
  const { userId } = useAuth();
  const [stats, setStats] = useState<HotMessageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [refreshSeed] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `${Date.now()}:${Math.random()}`;
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;
    const activeUserId = userId;

    async function load() {
      setLoading(true);
      try {
        const data = await loadHotMessageStats(activeUserId);
        if (!cancelled) setStats(data);
      } catch (error) {
        console.warn("HotMessagePanel load failed", error);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function scheduleInitialLoad() {
      const idleWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

      if (idleWindow.requestIdleCallback) {
        idleCallbackId = idleWindow.requestIdleCallback(() => {
          idleCallbackId = null;
          void load();
        }, { timeout: 1500 });
        return;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        void load();
      }, 900);
    }

    scheduleInitialLoad();

    const handler = () => {
      void load();
    };
    window.addEventListener("aw-hot-message-refresh", handler);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (idleCallbackId != null) {
        const idleWindow = window as Window & { cancelIdleCallback?: (handle: number) => void };
        idleWindow.cancelIdleCallback?.(idleCallbackId);
      }
      window.removeEventListener("aw-hot-message-refresh", handler);
    };
  }, [userId]);

  const messages = useMemo(() => (stats ? buildMessages(stats, refreshSeed) : []), [refreshSeed, stats]);
  const normalizedMessageIndex = messages.length > 0 ? activeMessageIndex % messages.length : 0;
  const message = messages[normalizedMessageIndex] ?? null;
  const progress = Math.max(0, Math.min(100, ((stats?.tipsGivenToday ?? 0) / DAILY_TIP_TARGET) * 100));

  useEffect(() => {
    setActiveMessageIndex(0);
  }, [stats]);

  function showPreviousMessage() {
    setActiveMessageIndex((current) => (messages.length <= 1 ? 0 : (current - 1 + messages.length) % messages.length));
  }

  function showNextMessage() {
    setActiveMessageIndex((current) => (messages.length <= 1 ? 0 : (current + 1) % messages.length));
  }

  if (!userId) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#effdef] via-white to-white p-4 shadow-[0_10px_28px_rgba(50,205,50,0.14)]">
      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          {loading && !message ? (
            <div className="space-y-2">
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ) : (
            <>
              <p className="text-sm font-bold leading-snug text-slate-950">{message?.title ?? "Máš hezky našlápnuto."}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {message?.body ?? "Tipni dnes pár fotek ostatních a posuň svoje výsledky blíž ke stabilnímu AW věku."}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#32CD32] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>{stats?.tipsGivenToday ?? 0}/{DAILY_TIP_TARGET} dnes</span>
          {stats?.currentStreakDays ? <span>Série {stats.currentStreakDays} dny</span> : <span>1 tip udrží sérii</span>}
        </div>
      </div>

      {message?.href && message.ctaLabel ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            href={message.href}
            className="inline-flex rounded-full bg-[#32CD32] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#28b828] focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {message.ctaLabel}
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={showPreviousMessage}
              disabled={messages.length <= 1}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-100 text-base font-bold leading-none text-slate-500 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-default disabled:opacity-30 disabled:hover:border-slate-100 disabled:hover:bg-white disabled:hover:text-slate-500"
              aria-label="Předchozí hláška"
              title="Předchozí hláška"
            >
              ‹
            </button>
            {messages.length > 1 ? (
              <span className="min-w-7 text-center text-[11px] font-semibold text-slate-400">
                {normalizedMessageIndex + 1}/{messages.length}
              </span>
            ) : null}
            <button
              type="button"
              onClick={showNextMessage}
              disabled={messages.length <= 1}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-100 text-base font-bold leading-none text-slate-500 transition hover:border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-default disabled:opacity-30 disabled:hover:border-slate-100 disabled:hover:bg-white disabled:hover:text-slate-500"
              aria-label="Další hláška"
              title="Další hláška"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}



