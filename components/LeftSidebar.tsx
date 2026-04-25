/**
 * File: components/LeftSidebar.tsx
 *
 * Purpose:
 * - Left sidebar for authenticated users.
 * - Shows user card and route-specific secondary navigation.
 * Main responsibilities:
 * - Default mode: profile links and quick stats.
 * - Messages mode: profile card and conversation folders.
 * Related APIs, components, or modules:
 * - lib/api/messages
 * - components/MyStatsSummary
 * - components/AuthShell.tsx
 */

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MyStatsSummary from "@/components/MyStatsSummary";
import { listMyMessageThreads, type MessageThreadFolder, type MessageThreadListItem } from "@/lib/api/messages";
import { getMyNetworkCounts } from "@/lib/api/network";

type LeftSidebarProfile = {
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
};

type LeftSidebarProps = {
  loadingProfile: boolean;
  profile: LeftSidebarProfile | null;
};

const PROFILE_LINKS = [
  { href: "/profile/basic", label: "Základní profil" },
  { href: "/profile/as-seen", label: "Jak mě vidí ostatní" },
  { href: "/profile/privacy", label: "Soukromí & personalizace" },
  { href: "/notifications/settings", label: "Nastavení upozornění" },
  { href: "/profile/personal", label: "Více o mě" },
] as const;

const STATS_LINKS = [
  { href: "/stats?section=aw-age", section: "aw-age", label: "AW věk" },
  { href: "/stats?section=activity", section: "activity", label: "Aktivita" },
  { href: "/stats?section=posts", section: "posts", label: "Statistiky příspěvků" },
  { href: "/stats?section=traffic", section: "traffic", label: "Návštěvnost" },
  { href: "/stats?section=wellbeing", section: "wellbeing", label: "Wellbeing / Lifestyle" },
  { href: "/stats?section=challenges", section: "challenges", label: "Výzvy" },
  { href: "/stats?section=my-tips", section: "my-tips", label: "Moje přesnost" },
  { href: "/stats?section=aw-score", section: "aw-score", label: "AW skóre" },
  { href: "/stats?section=recommendations", section: "recommendations", label: "Chytré doporučení" },
] as const;

const NETWORK_LINKS = [
  { href: "/network?panel=search", label: "Vyhledat uživatele" },
  { href: "/network?tab=requests&section=incoming", label: "Nové žádosti" },
  { href: "/network?tab=requests&section=outgoing", label: "Moje žádosti" },
  { href: "/network?tab=suggestions", label: "Možná znáš" },
  { href: "/network?tab=connections", label: "Spojení" },
  { href: "/notifications/settings", label: "Nastavení upozornění" },
] as const;

function canSeeAdminMenu(role: string | null | undefined) {
  return role === "admin" || role === "moderator";
}

const UNREAD_GREEN = "rgb(36,149,59)";
const MESSAGE_FOLDERS: Array<{ id: MessageThreadFolder; label: string }> = [
  { id: "inbox", label: "Příchozí" },
  { id: "blocked", label: "Blokované" },
];

function getThreadDisplayNameClass(thread: MessageThreadListItem) {
  if (thread.threadKind === "admin_support") return "text-rose-700";
  if (thread.threadKind === "moderator_outreach") return "text-sky-700";
  return "text-gray-900";
}

export default function LeftSidebar({ loadingProfile, profile }: LeftSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messageThreads, setMessageThreads] = useState<MessageThreadListItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [activeFolder, setActiveFolder] = useState<MessageThreadFolder>("inbox");
  const [networkCounts, setNetworkCounts] = useState({ incomingRequests: 0, outgoingRequests: 0 });

  const displayName = useMemo(() => {
    const value = (profile?.display_name ?? profile?.displayName ?? "").trim();
    return value.length ? value : "AgeWinners uživatel";
  }, [profile?.display_name, profile?.displayName]);

  const bio = useMemo(() => {
    const value = (profile?.bio ?? "").trim();
    return value.length ? value : "Zatím bez bio.";
  }, [profile?.bio]);

  const avatarUrl = profile?.avatar_url ?? profile?.avatarUrl ?? null;
  const role = profile?.role ?? null;
  const showProfileMenu = Boolean(pathname?.startsWith("/profile"));
  const showMessagesSidebar = pathname === "/messages";
  const showNetworkMenu = pathname === "/network";
  const showStatsMenu = pathname === "/stats";
  const activeThreadId = Number(searchParams?.get("thread") ?? 0) || null;
  const networkTab = String(searchParams?.get("tab") ?? "connections");
  const networkSection = String(searchParams?.get("section") ?? "");
  const networkPanel = String(searchParams?.get("panel") ?? "");
  const activeStatsSection = String(searchParams?.get("section") ?? "aw-age");
  const profileLinks = canSeeAdminMenu(role)
    ? [...PROFILE_LINKS, { href: "/admin", label: "Administrace" as const }]
    : PROFILE_LINKS;

  useEffect(() => {
    if (!showMessagesSidebar) return;

    let cancelled = false;

    async function loadThreads() {
      setLoadingThreads(true);
      try {
        const rows = await listMyMessageThreads();
        if (!cancelled) setMessageThreads(rows);
      } catch {
        if (!cancelled) setMessageThreads([]);
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    }

    void loadThreads();

    const handler = () => {
      void loadThreads();
    };

    window.addEventListener("aw-messages-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("aw-messages-changed", handler);
    };
  }, [showMessagesSidebar]);

  useEffect(() => {
    if (!showNetworkMenu) return;

    let cancelled = false;

    async function loadNetworkCounts() {
      try {
        const counts = await getMyNetworkCounts();
        if (!cancelled) {
          setNetworkCounts({
            incomingRequests: counts.incomingRequests ?? 0,
            outgoingRequests: counts.outgoingRequests ?? 0,
          });
        }
      } catch {
        if (!cancelled) {
          setNetworkCounts({ incomingRequests: 0, outgoingRequests: 0 });
        }
      }
    }

    void loadNetworkCounts();
    return () => {
      cancelled = true;
    };
  }, [showNetworkMenu]);

  const visibleThreads = useMemo(
    () => messageThreads.filter((thread) => thread.threadFolder === activeFolder),
    [activeFolder, messageThreads]
  );

  return (
    <aside className="w-full shrink-0 bg-white px-4 py-5">
      <div className="hidden md:block">
        {loadingProfile ? <UserCardSkeleton /> : <UserCard displayName={displayName} avatarUrl={avatarUrl} bio={bio} />}
      </div>

      <div className="mt-6 hidden md:block">
        <MyStatsSummary />
      </div>

      {showMessagesSidebar ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Konverzace</div>

          <div className="mt-3 flex gap-2 rounded-2xl bg-slate-100 p-1">
            {MESSAGE_FOLDERS.map((folder) => {
              const count = messageThreads.filter((thread) => thread.threadFolder === folder.id).length;
              const isActive = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolder(folder.id)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {folder.label} {count > 0 ? `(${count})` : ""}
                </button>
              );
            })}
          </div>

          {loadingThreads ? (
            <div className="mt-3 text-sm text-gray-500">Načítám konverzace...</div>
          ) : visibleThreads.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">
              {activeFolder === "blocked" ? "Zatím tu nejsou žádné blokované konverzace." : "Zatím tu nejsou žádné konverzace."}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleThreads.map((thread) => {
                const isActive = activeThreadId === thread.threadId;
                const hasUnread = thread.unreadCount > 0;

                return (
                  <Link
                    key={thread.threadId}
                    href={`/messages?thread=${thread.threadId}`}
                    className={`block rounded-2xl border px-3 py-3 transition ${
                      isActive ? "border-slate-300 bg-slate-50" : hasUnread ? "bg-white" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    style={
                      hasUnread
                        ? { borderColor: UNREAD_GREEN, boxShadow: `0 0 0 1px ${UNREAD_GREEN}` }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`truncate text-sm font-semibold ${getThreadDisplayNameClass(thread)}`}>
                            {thread.otherDisplayName ?? thread.otherUserId}
                          </div>
                          {thread.isStarred ? <span className="text-amber-500">★</span> : null}
                        </div>
                        <div className="mt-1 truncate text-xs text-gray-500">
                          {thread.lastMessageBody?.trim() ? thread.lastMessageBody : "Zatím bez textu."}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                          {thread.isMuted ? <span>Ztlumeno</span> : null}
                          {thread.otherIsOnline ? <span className="font-semibold text-emerald-700">Online</span> : null}
                        </div>
                      </div>

                      {hasUnread ? (
                        <span
                          className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white"
                          style={{ backgroundColor: UNREAD_GREEN }}
                        >
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {showProfileMenu ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Můj profil</div>

          <nav className="mt-3 flex flex-col gap-1">
            {profileLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active ? "bg-gray-50 text-gray-900" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}

      {showStatsMenu ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Statistiky</div>

          <nav className="mt-3 flex flex-col gap-1">
            {STATS_LINKS.map((item) => {
              const active = activeStatsSection === item.section;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}

      {showNetworkMenu ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Moje síť</div>

          <nav className="mt-3 flex flex-col gap-1">
            {NETWORK_LINKS.map((item) => {
              const itemUrl = new URL(`https://agewinners.local${item.href}`);
              const itemTab = itemUrl.searchParams.get("tab") ?? "";
              const itemSection = itemUrl.searchParams.get("section") ?? "";
              const itemPanel = itemUrl.searchParams.get("panel") ?? "";
              const active =
                pathname === "/network" &&
                ((itemPanel && networkPanel === itemPanel) || (!itemPanel && networkTab === itemTab && networkSection === itemSection));
              const badgeCount =
                itemSection === "incoming"
                  ? networkCounts.incomingRequests
                  : itemSection === "outgoing"
                    ? networkCounts.outgoingRequests
                    : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active ? "bg-gray-50 text-gray-900" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  {badgeCount > 0 ? (
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </aside>
  );
}

function UserCard({ displayName, avatarUrl, bio }: { displayName: string; avatarUrl: string | null; bio: string }) {
  const initial = (displayName || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 text-left md:flex-col md:items-center md:text-center">
      <Link
        href="/profile/basic"
        aria-label="Upravit profil"
        title="Upravit profil"
        className="group flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-300 md:h-20 md:w-20"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover transition group-hover:opacity-95" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-lg font-semibold text-gray-600">{initial}</span>
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href="/profile/basic"
          className="rounded-md text-sm font-semibold text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Upravit profil"
          title="Upravit profil"
        >
          {displayName}
        </Link>

        <p className="mt-1 line-clamp-2 text-xs text-gray-600 md:line-clamp-3">{bio}</p>
      </div>
    </div>
  );
}

function UserCardSkeleton() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="h-20 w-20 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-52 animate-pulse rounded bg-slate-100" />
      <div className="mt-1 h-3 w-48 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
