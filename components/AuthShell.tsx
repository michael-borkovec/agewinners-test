/**
 * File: components/AuthShell.tsx
 *
 * Purpose:
 * - App shell (header navigation + sidebar + content)
 * - Auth gate: non-auth -> /login
 *
 * NEW:
 * - Provides AuthContext (session/userId) to all pages.
 *   Pages should NOT call supabase.auth.getSession() on their own.
 * - Keeps idle auto-logout after 2 hours (idle = no activity).
 * - Persists last activity timestamp to localStorage so it also works after reload / next day.
 * - Revalidates session on focus/visibility to avoid "login required until refresh".
 *
 * Sticky fix (IMPORTANT):
 * - Exposes CSS var --aw-topbar-h with the current header height.
 * - SectionHeaderFilter uses this var to stick BELOW the navbar (not hidden under it).
 *
 * Auth fix (2026-03):
 * - On initial load, local getSession() is NOT trusted as final truth.
 * - If session exists, validate it via supabase.auth.getUser().
 * - If server says user is not valid, clear local session and show only public auth page.
 */

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import LeftSidebar from "@/components/LeftSidebar";
import { getMyProfile } from "@/lib/api/userProfiles";
import { AuthProvider } from "@/components/auth/AuthContext";
import { AwDialogProvider } from "@/components/AwDialog";
import { getMyAdminAlerts } from "@/lib/api/adminAlerts";
import { getMyUnreadNotificationCount } from "@/lib/api/notifications";
import { getMyUnreadMessageCount } from "@/lib/api/messages";

type AuthShellProps = {
  children: React.ReactNode;
};

type SidebarProfile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  super_user?: boolean | null;
  role?: string | null;
};

type AppNavLinkProps = {
  href: string;
  label: string;
  iconPath: string;
  badgeCount?: number;
  badgeTone?: "emerald" | "rose";
  pathname: string;
  onClick?: () => void;
  compact?: boolean;
};

type AppNavItem = {
  href: string;
  label: string;
  iconPath: string;
  badgeKey?: "messages" | "notifications";
  badgeTone?: "emerald" | "rose";
};

const PROFILE_DROPDOWN_LINKS = [
  { href: "/profile/basic", label: "Profilová karta" },
  { href: "/profile/as-seen", label: "Jak mě vidí ostatní" },
  { href: "/profile/privacy", label: "Soukromí" },
  { href: "/notifications/settings", label: "Nastavení upozornění" },
  { href: "/profile/social", label: "Sociální sítě" },
  { href: "/profile/security", label: "Účet a bezpečnost" },
  { href: "/profile/personal", label: "O mně" },
] as const;
const INFO_LINKS = [
  { href: "/about", label: "O nás" },
  { href: "/help", label: "Nápověda" },
  { href: "/privacy-terms", label: "Soukromí & podmínky" },
] as const;
const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Feed", iconPath: "/icons/nav/feed.png" },
  { href: "/my-posts", label: "Moje posty", iconPath: "/icons/nav/posts.png" },
  { href: "/my-tips", label: "Moje tipy", iconPath: "/icons/nav/tips.png" },
  { href: "/my-albums", label: "Moje výzvy", iconPath: "/icons/nav/challenges.png" },
  { href: "/network", label: "Moje síť", iconPath: "/icons/nav/network.png" },
  { href: "/messages", label: "Zprávy", iconPath: "/icons/nav/messages.png", badgeKey: "messages" },
  { href: "/notifications", label: "Upozornění", iconPath: "/icons/nav/notifications.png", badgeKey: "notifications", badgeTone: "rose" },
  { href: "/stats", label: "Můj vývoj", iconPath: "/icons/nav/stats.svg" },
];

function canSeeAdminMenu(role: string | null | undefined) {
  return role === "admin" || role === "moderator";
}

const IDLE_LOGOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
const IDLE_CHECK_EVERY_MS = 30_000;
const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "pointerdown"] as const;
const IDLE_LAST_ACTIVE_KEY = "aw:lastActiveAt";

function BrandLogo({
  pathname,
  mobileMenuOpen,
  onMobileToggleMenu,
}: {
  pathname: string;
  mobileMenuOpen: boolean;
  onMobileToggleMenu: () => void;
}) {
  const activeItem = getActiveNavItem(pathname);

  return (
    <div className="flex min-w-0 flex-1 flex-col md:flex-none">
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          onClick={onMobileToggleMenu}
          className="flex w-[58px] shrink-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-center text-emerald-800 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 md:hidden"
          aria-label={mobileMenuOpen ? "Skrýt hlavní menu" : "Zobrazit hlavní menu"}
          title={mobileMenuOpen ? "Skrýt hlavní menu" : "Zobrazit hlavní menu"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeItem.iconPath} alt="" className="h-7 w-7" />
          <span className="mt-0.5 w-full truncate text-[10px] font-semibold leading-none">{activeItem.label}</span>
          <span className={`mt-0.5 text-slate-500 transition ${mobileMenuOpen ? "rotate-180" : ""}`}>
            <ChevronDownIcon />
          </span>
        </button>

        <Link href="/" className="hidden items-center gap-2 transition hover:opacity-90 md:-ml-3 md:flex">
          <Image src="/Logo.png" alt="AgeWinners logo" width={90} height={90} priority className="translate-y-2" style={{ width: "auto", height: "auto" }} />
          <span className="text-[1.88rem] font-semibold text-slate-800">AgeWinners</span>
        </Link>

        <div className="min-w-0 translate-x-1.5 pt-0.5 md:hidden">
          <div className="truncate text-[1.25rem] font-semibold leading-tight text-slate-800 min-[380px]:text-[1.45rem]">AgeWinners</div>
          <nav className="mt-0.5 flex flex-nowrap items-center gap-2 whitespace-nowrap text-[9px] italic leading-none text-slate-600">
            {INFO_LINKS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "font-semibold text-slate-900" : "transition hover:text-slate-900"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <nav className="ml-[90px] mt-[-6px] hidden flex-nowrap items-center gap-2 whitespace-nowrap text-[9.2px] italic leading-none text-slate-600 md:flex">
        {INFO_LINKS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "font-semibold text-slate-900" : "transition hover:text-slate-900"}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isNavItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveNavItem(pathname: string) {
  return APP_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href)) ?? APP_NAV_ITEMS[0];
}

function isAuthEntryRoute(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

function isPublicStandaloneRoute(pathname: string) {
  return (
    isAuthEntryRoute(pathname) ||
    pathname === "/auth/callback" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  );
}

function isProfileSidebarRoute(pathname: string | null | undefined) {
  return Boolean(pathname?.startsWith("/profile") || pathname === "/notifications/settings");
}

function initialsFromName(name: string | null | undefined) {
  const n = (name ?? "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

function addCacheBust(url: string | null, bust: number) {
  if (!url) return null;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${bust}`;
}

function HeaderAvatar({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string | null }) {
  const initials = initialsFromName(displayName);

  if (avatarUrl) {
    return <img src={avatarUrl} alt="Profil" className="h-[34px] w-[34px] rounded-full object-cover" referrerPolicy="no-referrer" />;
  }

  return <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">{initials}</div>;
}

function NotificationsNavLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Link className="relative rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/notifications">
      Upozornění
      {unreadCount > 0 ? (
        <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function MessagesNavLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Link className="relative rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/messages">
      Zprávy
      {unreadCount > 0 ? (
        <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#32CD32] px-1.5 py-0.5 text-[11px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function AppNavLink({ href, label, iconPath, badgeCount = 0, badgeTone = "emerald", pathname, onClick, compact = false }: AppNavLinkProps) {
  const isActive = isNavItemActive(pathname, href);
  const badgeClass = badgeTone === "rose" ? "bg-rose-600 text-white" : "bg-[#32CD32] text-white";
  const layoutClass = compact
    ? "min-w-0 flex-row gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs"
    : "min-w-[84px] flex-col gap-1 rounded-xl px-3 py-2 text-center text-sm";
  const iconClass = compact ? "h-5 w-5" : "h-[2.1em] w-[2.1em]";
  const badgePositionClass = compact ? "right-1 top-1" : "right-2 top-2";

  return (
    <Link
      onClick={onClick}
      className={`relative inline-flex items-center justify-center font-medium transition ${layoutClass} ${
        isActive ? "bg-[#effdef] text-emerald-800 shadow-[0_10px_24px_rgba(50,205,50,0.14)]" : "text-slate-700 hover:bg-slate-100"
      }`}
      href={href}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconPath} alt="" className={`${iconClass} shrink-0`} />
      <span className="truncate leading-tight">{label}</span>
      {badgeCount > 0 ? (
        <span className={`absolute ${badgePositionClass} inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.512a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function forceClearSupabaseLocalSession() {
  try {
    if (typeof window === "undefined") return;

    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith("sb-") && k.includes("auth-token")) window.localStorage.removeItem(k);
    }
    for (const k of Object.keys(window.sessionStorage)) {
      if (k.startsWith("sb-") && k.includes("auth-token")) window.sessionStorage.removeItem(k);
    }
  } catch (e) {
    console.warn("forceClearSupabaseLocalSession failed", e);
  }
}

function safeReadLastActive(): number {
  try {
    const raw = window.localStorage.getItem(IDLE_LAST_ACTIVE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

function safeWriteLastActive(ts: number) {
  try {
    window.localStorage.setItem(IDLE_LAST_ACTIVE_KEY, String(ts));
  } catch {
    // ignore
  }
}

function safeClearLastActive() {
  try {
    window.localStorage.removeItem(IDLE_LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

function redirectToLogin(router: ReturnType<typeof useRouter>) {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
    return;
  }

  router.replace("/login");
  router.refresh();
}

export default function AuthShell({ children }: AuthShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<SidebarProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [avatarBust, setAvatarBust] = useState<number>(() => Date.now());

  const isLoggedIn = !!session?.user;

  const headerRef = useRef<HTMLElement | null>(null);
  const [topbarH, setTopbarH] = useState<number>(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      const h = Math.ceil(el.getBoundingClientRect().height || 0);
      setTopbarH((prev) => (prev === h ? prev : h));
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }

    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [authLoading, isLoggedIn]);

  const lastActiveRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const idleLogoutInProgressRef = useRef<boolean>(false);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    safeWriteLastActive(now);
  }, []);

  const getIdleForMs = useCallback(() => {
    const lastActive = safeReadLastActive();
    lastActiveRef.current = lastActive;
    return Date.now() - lastActive;
  }, []);

  const isIdleExpired = useCallback(() => getIdleForMs() >= IDLE_LOGOUT_MS, [getIdleForMs]);

  const runIdleLogout = useCallback(async () => {
    if (idleLogoutInProgressRef.current) return;
    idleLogoutInProgressRef.current = true;

    try {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (e) {
        console.warn("AuthShell idle signOut(local) rejected", e);
      }
      forceClearSupabaseLocalSession();
      safeClearLastActive();

      setSession(null);
      setProfile(null);
      setLoadingProfile(false);

      redirectToLogin(router);
    } finally {
      idleLogoutInProgressRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      lastActiveRef.current = safeReadLastActive();
    }

    function onVisibilityMarkActive() {
      if (document.visibilityState !== "visible") return;

      if (isLoggedIn && isIdleExpired()) {
        void runIdleLogout();
        return;
      }

      markActive();
    }

    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityMarkActive);

    if (isLoggedIn) {
      const idleFor = getIdleForMs();
      if (idleFor >= IDLE_LOGOUT_MS) {
        void runIdleLogout();
      }
    }

    idleTimerRef.current = window.setInterval(async () => {
      if (!isLoggedIn) return;
      const idleFor = getIdleForMs();
      if (idleFor >= IDLE_LOGOUT_MS) await runIdleLogout();
    }, IDLE_CHECK_EVERY_MS) as unknown as number;

    return () => {
      IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, markActive as any));
      document.removeEventListener("visibilitychange", onVisibilityMarkActive);
      if (idleTimerRef.current) window.clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [getIdleForMs, isIdleExpired, isLoggedIn, markActive, runIdleLogout]);

  useEffect(() => {
    if (isLoggedIn) {
      const now = Date.now();
      lastActiveRef.current = now;
      safeWriteLastActive(now);
    }
  }, [isLoggedIn]);

  const refreshProfileForSession = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await getMyProfile();
      if ((res as any)?.errorMessage) {
        console.warn("AuthShell: getMyProfile error", (res as any).errorMessage);
        setProfile(null);
        return;
      }

      const p: any = (res as any)?.data ?? res;
      if (!p) {
        console.warn("AuthShell: getMyProfile returned empty data");
        setProfile(null);
        return;
      }

      if ((p.accountStatus ?? p.account_status) === "suspended") {
        console.warn("AuthShell: suspended account, signing out");
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (e) {
          console.warn("AuthShell suspended signOut(local) rejected", e);
        }
        forceClearSupabaseLocalSession();
        safeClearLastActive();
        setSession(null);
        setProfile(null);
        setLoadingProfile(false);
        redirectToLogin(router);
        return;
      }

      setProfile({
        display_name: p.displayName ?? p.display_name ?? null,
        avatar_url: p.avatarUrl ?? p.avatar_url ?? null,
        bio: p.bio ?? null,
        super_user: (p.superUser ?? p.super_user ?? null) as any,
        role: (p.role ?? null) as string | null,
      });

      setAvatarBust(Date.now());
    } catch (e) {
      console.warn("AuthShell: getMyProfile failed", e);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [router]);

  const refreshUnreadNotifications = useCallback(async (activeSession?: Session | null) => {
    if (!activeSession?.user) {
      setUnreadNotifications(0);
      return;
    }

    try {
      const count = await getMyUnreadNotificationCount();
      if (profile?.role === "admin") {
        const adminAlerts = await getMyAdminAlerts();
        const extra =
          adminAlerts.counts.adminSupportUnread +
          adminAlerts.counts.moderatorOutreachUnread +
          adminAlerts.counts.imageReportsOpen +
          adminAlerts.counts.messageReportsOpen;
        setUnreadNotifications(count + extra);
        return;
      }
      if (profile?.role === "moderator") {
        const adminAlerts = await getMyAdminAlerts();
        const extra =
          adminAlerts.counts.moderatorOutreachUnread +
          adminAlerts.counts.imageReportsOpen +
          adminAlerts.counts.messageReportsOpen;
        setUnreadNotifications(count + extra);
        return;
      }
      setUnreadNotifications(count);
    } catch (e) {
      console.warn("AuthShell: unread notifications load failed", e);
    }
  }, [profile?.role]);

  const refreshUnreadMessages = useCallback(async (activeSession?: Session | null) => {
    if (!activeSession?.user) {
      setUnreadMessages(0);
      return;
    }

    try {
      const count = await getMyUnreadMessageCount();
      setUnreadMessages(count);
    } catch (e) {
      console.warn("AuthShell: unread messages load failed", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.warn("AuthShell: getSession error", error.message);

        const initialSession = data.session ?? null;

        if (initialSession) {
          const { data: userData, error: userErr } = await supabase.auth.getUser();

          if (!mounted) return;

          if (userErr || !userData?.user) {
            console.warn("AuthShell: initial session invalid on server, clearing local auth state");

            forceClearSupabaseLocalSession();
            safeClearLastActive();

            setSession(null);
            setProfile(null);
            setLoadingProfile(false);
            setAuthLoading(false);

            if (pathname && !isPublicStandaloneRoute(pathname)) {
              router.replace("/login");
            }
            return;
          }
        }

        setSession(initialSession);
        setAuthLoading(false);

        if (initialSession) {
          if (isIdleExpired()) {
            await runIdleLogout();
            return;
          }

          lastActiveRef.current = safeReadLastActive();
          refreshProfileForSession(initialSession);
        } else {
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      } catch (err) {
        if (!mounted) return;
        console.warn("AuthShell: getSession exception", err);
        setSession(null);
        setProfile(null);
        setLoadingProfile(false);
        setAuthLoading(false);
      }
    };

    const revalidate = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.warn("AuthShell: revalidate getSession error", error.message);

        setSession(data.session ?? null);

        if (data.session) {
          if (isIdleExpired()) {
            await runIdleLogout();
            return;
          }
        } else {
          if (pathname && !isPublicStandaloneRoute(pathname)) {
            setProfile(null);
            setLoadingProfile(false);
            router.replace("/login");
          }
        }
      } catch (e) {
        if (!mounted) return;
        console.warn("AuthShell: revalidate exception", e);
      }
    };

    initialLoad();

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      router.refresh();

      if (event === "SIGNED_IN" && newSession) {
        markActive();
        setTimeout(() => refreshProfileForSession(newSession), 0);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoadingProfile(false);
        safeClearLastActive();
        setUnreadNotifications(0);
        setUnreadMessages(0);
      }
    });

    const onFocus = () => {
      void revalidate();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void revalidate();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, refreshProfileForSession, pathname, markActive, isIdleExpired, runIdleLogout]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setUnreadNotifications(0);
      return;
    }

    void refreshUnreadNotifications(session);
  }, [authLoading, session, refreshUnreadNotifications]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) return;
    void refreshUnreadNotifications(session);
  }, [authLoading, session, profile?.role, refreshUnreadNotifications]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setUnreadMessages(0);
      return;
    }

    void refreshUnreadMessages(session);
  }, [authLoading, session, refreshUnreadMessages]);

  useEffect(() => {
    if (authLoading) return;
    if (isLoggedIn) return;

    const p = pathname || "/";
    if (!isPublicStandaloneRoute(p)) router.replace("/login");
  }, [authLoading, isLoggedIn, pathname, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) return;

    const p = pathname || "/";
    if (isAuthEntryRoute(p)) {
      router.replace("/");
    }
  }, [authLoading, isLoggedIn, pathname, router]);

  useEffect(() => {
    const handler = () => refreshProfileForSession(session);
    window.addEventListener("aw-profile-updated", handler);
    return () => window.removeEventListener("aw-profile-updated", handler);
  }, [refreshProfileForSession, session]);

  useEffect(() => {
    const handler = () => {
      void refreshUnreadNotifications();
    };
    window.addEventListener("aw-notifications-changed", handler);
    return () => window.removeEventListener("aw-notifications-changed", handler);
  }, [refreshUnreadNotifications]);

  useEffect(() => {
    if (authLoading || !session?.user) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshUnreadNotifications(session);
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [authLoading, session, refreshUnreadNotifications]);

  useEffect(() => {
    const handler = () => {
      void refreshUnreadMessages();
    };
    window.addEventListener("aw-messages-changed", handler);
    return () => window.removeEventListener("aw-messages-changed", handler);
  }, [refreshUnreadMessages]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  const showSidebarOnMobile =
    pathname === "/messages" || pathname === "/network" || pathname === "/stats" || isProfileSidebarRoute(pathname);
  const isAdminRoute = Boolean(pathname?.startsWith("/admin"));

  async function handleLogout() {
    setLogoutLoading(true);

    try {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (e) {
        console.warn("AuthShell: signOut(local) rejected", e);
      }
      forceClearSupabaseLocalSession();
      safeClearLastActive();

      setSession(null);
      setProfile(null);

      redirectToLogin(router);
    } finally {
      setLogoutLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!isLoggedIn) {
    if (!isPublicStandaloneRoute(pathname || "/")) {
      return (
        <AwDialogProvider>
          <AuthProvider session={null}>
            <div className="mx-auto max-w-6xl px-4 py-10">
              <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </AuthProvider>
        </AwDialogProvider>
      );
    }

    return (
      <AwDialogProvider>
        <AuthProvider session={null}>{children}</AuthProvider>
      </AwDialogProvider>
    );
  }

  if (isAuthEntryRoute(pathname || "/")) {
    return (
      <AwDialogProvider>
        <AuthProvider session={session}>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
        </AuthProvider>
      </AwDialogProvider>
    );
  }

  if (isPublicStandaloneRoute(pathname || "/")) {
    return (
      <AwDialogProvider>
        <AuthProvider session={session}>{children}</AuthProvider>
      </AwDialogProvider>
    );
  }

  const avatarUrlBusted = addCacheBust(profile?.avatar_url ?? null, avatarBust);
  const profileForSidebar: SidebarProfile | null = profile ? { ...profile, avatar_url: avatarUrlBusted } : null;
  const isPrivilegedViewer = Boolean(profile?.super_user) || profile?.role === "moderator" || profile?.role === "admin";
  const profileMenuLinks = canSeeAdminMenu(profile?.role ?? null)
    ? [...PROFILE_DROPDOWN_LINKS, { href: "/admin", label: "Administrace" as const }]
    : PROFILE_DROPDOWN_LINKS;
  const navItemsWithCounts = APP_NAV_ITEMS.map((item) => ({
    ...item,
    badgeCount: item.badgeKey === "messages" ? unreadMessages : item.badgeKey === "notifications" ? unreadNotifications : 0,
  }));

  return (
    <AwDialogProvider>
      <AuthProvider session={session} isPrivilegedViewer={isPrivilegedViewer}>
        <div className="min-h-screen bg-slate-50" style={{ ["--aw-topbar-h" as any]: `${topbarH}px` }}>
        <header ref={headerRef as any} className="sticky top-0 z-50 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 min-[380px]:gap-3 min-[380px]:px-4 md:gap-4 md:py-3">
            <BrandLogo
              pathname={pathname || "/"}
              mobileMenuOpen={mobileNavOpen}
              onMobileToggleMenu={() => setMobileNavOpen((v) => !v)}
            />

            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="inline-flex w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 min-[380px]:w-[78px]"
                aria-label="Můj profil"
                title="Můj profil"
                aria-expanded={profileMenuOpen}
              >
                <HeaderAvatar avatarUrl={avatarUrlBusted} displayName={profile?.display_name ?? null} />
                <span className="w-full truncate text-[10px] font-medium leading-tight text-slate-700 min-[380px]:text-[11px]">
                  {profile?.display_name ?? "Můj profil"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium leading-none text-slate-500">
                  <ChevronDownIcon />
                </span>
              </button>

              {profileMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-2xl bg-white p-2 shadow-xl">
                  {profileMenuLinks.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setProfileMenuOpen(false)}
                        className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="my-2 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleLogout();
                    }}
                    disabled={logoutLoading}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {logoutLoading ? "Odhlašuji…" : "Odhlásit"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 md:ml-8 md:flex">
              <nav className="flex items-center gap-2">
                {navItemsWithCounts.map((item) => (
                  <AppNavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    iconPath={item.iconPath}
                    badgeCount={item.badgeCount}
                    badgeTone={item.badgeTone}
                    pathname={pathname || "/"}
                  />
                ))}
              </nav>

              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="inline-flex min-w-[92px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Můj profil"
                  title="Můj profil"
                  aria-expanded={profileMenuOpen}
                >
                  <HeaderAvatar avatarUrl={avatarUrlBusted} displayName={profile?.display_name ?? null} />
                  <span className="inline-flex items-center gap-1 text-xs font-medium leading-tight text-slate-700">
                    Můj profil
                    <ChevronDownIcon />
                  </span>
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-2xl bg-white p-2 shadow-xl">
                    {profileMenuLinks.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setProfileMenuOpen(false)}
                          className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                    <div className="my-2 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void handleLogout();
                      }}
                      disabled={logoutLoading}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {logoutLoading ? "Odhlašuji…" : "Odhlásit"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 md:hidden">
            <div className="mx-auto max-w-6xl px-3 py-1.5 min-[380px]:px-4">
              {mobileNavOpen ? (
                <div className="grid grid-cols-2 gap-1.5 pb-1.5 min-[420px]:grid-cols-3">
                  {navItemsWithCounts.map((item) => (
                    <AppNavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      iconPath={item.iconPath}
                      badgeCount={item.badgeCount}
                      badgeTone={item.badgeTone}
                      pathname={pathname || "/"}
                      onClick={() => setMobileNavOpen(false)}
                      compact
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className={`mx-auto grid grid-cols-1 gap-6 px-4 py-6 ${isAdminRoute ? "max-w-[1600px]" : "max-w-6xl md:grid-cols-[288px_minmax(0,1fr)]"}`}>
          {!isAdminRoute ? (
            <aside className={`${showSidebarOnMobile ? "block" : "hidden"} space-y-4 overflow-x-hidden md:sticky md:block md:top-24 md:h-[calc(100vh-160px)] md:overflow-auto`}>
              <LeftSidebar loadingProfile={loadingProfile} profile={profileForSidebar} />
            </aside>
          ) : null}

          <main className="min-w-0">{children}</main>
        </div>
        </div>
      </AuthProvider>
    </AwDialogProvider>
  );
}


