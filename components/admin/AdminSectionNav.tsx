/**
 * Admin section navigation.
 * Shared top tabs for admin dashboard and report/staff inbox pages.
 * Uses admin/me to show admin-only tabs only to admins.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyAdminAlerts } from "@/lib/api/adminAlerts";
import type { DbUserRole } from "@/types/db";

type AdminSection =
  | "users"
  | "images"
  | "settings"
  | "message_reports"
  | "moderator_messages"
  | "admin_messages";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TabLink(props: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      className={cx(
        "inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition",
        props.active ? "bg-blue-950 text-white shadow-sm" : "text-slate-700 hover:bg-white hover:text-slate-950"
      )}
    >
      {props.children}
    </Link>
  );
}

export default function AdminSectionNav({ active }: { active: AdminSection }) {
  const [role, setRole] = useState<DbUserRole | null>(null);
  const [adminUnread, setAdminUnread] = useState(0);
  const [moderatorUnread, setModeratorUnread] = useState(0);
  const [imageReportCount, setImageReportCount] = useState(0);
  const [messageReportCount, setMessageReportCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted) setRole((data?.role ?? "user") as DbUserRole);
      })
      .catch(() => {
        if (mounted) setRole("user");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUnreadCounts() {
      try {
        const { counts } = await getMyAdminAlerts();
        if (cancelled) return;
        setAdminUnread(counts.adminSupportUnread);
        setModeratorUnread(counts.moderatorOutreachUnread);
        setImageReportCount(counts.imageReportsOpen);
        setMessageReportCount(counts.messageReportsOpen);
      } catch {
        if (cancelled) return;
        setAdminUnread(0);
        setModeratorUnread(0);
        setImageReportCount(0);
        setMessageReportCount(0);
      }
    }

    void loadUnreadCounts();

    const handler = () => {
      void loadUnreadCounts();
    };

    window.addEventListener("aw-messages-changed", handler);
    window.addEventListener("aw-notifications-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("aw-messages-changed", handler);
      window.removeEventListener("aw-notifications-changed", handler);
    };
  }, []);

  const isAdmin = role === "admin";

  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
      <TabLink href="/admin/message-reports" active={active === "message_reports"}>
        Reporty konverzací
        {messageReportCount > 0 ? (
          <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {messageReportCount > 99 ? "99+" : messageReportCount}
          </span>
        ) : null}
      </TabLink>
      <TabLink href="/admin/moderator-messages" active={active === "moderator_messages"}>
        Moderátor zprávy
        {moderatorUnread > 0 ? (
          <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-sky-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {moderatorUnread > 99 ? "99+" : moderatorUnread}
          </span>
        ) : null}
      </TabLink>
      {isAdmin ? (
        <TabLink href="/admin/admin-messages" active={active === "admin_messages"}>
          Admin zprávy
          {adminUnread > 0 ? (
            <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {adminUnread > 99 ? "99+" : adminUnread}
            </span>
          ) : null}
        </TabLink>
      ) : null}
      {isAdmin ? (
        <TabLink href="/admin?tab=users" active={active === "users"}>
          Uživatelé
        </TabLink>
      ) : null}
      <TabLink href="/admin?tab=images" active={active === "images"}>
        Fotky
        {imageReportCount > 0 ? (
          <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
            {imageReportCount > 99 ? "99+" : imageReportCount}
          </span>
        ) : null}
      </TabLink>
      {isAdmin ? (
        <TabLink href="/admin?tab=settings" active={active === "settings"}>
          Ostatní nastavení
        </TabLink>
      ) : null}
    </nav>
  );
}
