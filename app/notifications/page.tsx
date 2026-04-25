/**
 * File purpose
 * - Render in-app notifications for connection requests and their responses.
 * Main responsibilities
 * - Load notification list, mark unread notifications as read, and allow quick request actions.
 * Related APIs, components, or modules
 * - lib/api/notifications
 * - lib/api/network
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HelpIconButton from "@/components/HelpIconButton";
import { PageSectionTitle } from "@/components/PageSectionTitle";
import RefreshIconButton from "@/components/RefreshIconButton";
import { awAlert, awPrompt } from "@/components/AwDialog";
import { getMyAdminAlerts, type AdminAlertSummary } from "@/lib/api/adminAlerts";
import {
  listMyNotifications,
  markMyNotificationsRead,
  type AppNotification,
} from "@/lib/api/notifications";
import { acceptConnectionRequest, declineConnectionRequest } from "@/lib/api/network";

async function promptOptionalMessage(title: string) {
  return awPrompt({
    title: "Volitelná zpráva",
    message: title,
    confirmLabel: "Pokračovat",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("cs-CZ");
}

function actorName(notification: AppNotification) {
  const name = (notification.actor?.display_name ?? "").trim();
  if (name) return name;
  return notification.actor_user_id ?? "Uživatel";
}

function notificationText(notification: AppNotification) {
  const actor = actorName(notification);

  if (notification.type === "connection_request_received") {
    return `${actor} ti poslal(a) žádost o spojení.`;
  }
  if (notification.type === "connection_request_accepted") {
    return `${actor} přijal(a) tvoji žádost o spojení.`;
  }
  if (notification.type === "connection_request_declined") {
    return `${actor} zamítl(a) tvoji žádost o spojení.`;
  }
  if (notification.type === "connection_removed") {
    return `${actor} tě odstranil(a) ze spojení.`;
  }
  if (notification.type === "follow_started") {
    return `${actor} tě začal(a) sledovat.`;
  }
  if (notification.type === "follow_stopped") {
    return `${actor} tě přestal(a) sledovat.`;
  }
  if (notification.type === "comment_replied") {
    return `${actor} odpověděl(a) na tvůj komentář.`;
  }
  return `${actor} okomentoval(a) tvoji fotku.`;
}

function notificationImageHref(notification: AppNotification) {
  if (!notification.entity_bigint_id) return null;
  if (notification.type !== "photo_commented" && notification.type !== "comment_replied") return null;

  const basePath =
    notification.image_owner_user_id && notification.image_owner_user_id === notification.user_id
      ? "/my-posts"
      : "/my-tips";

  return `${basePath}?focusImage=${notification.entity_bigint_id}&comments=1`;
}

function formatCountWord(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

function adminAlertActorName(summary: AdminAlertSummary) {
  const name = (summary.latest_actor?.display_name ?? "").trim();
  if (name) return name;
  return summary.latest_actor?.user_id ?? "Uživatel";
}

function adminAlertText(summary: AdminAlertSummary) {
  const actor = adminAlertActorName(summary);

  if (summary.kind === "admin_support") {
    if (summary.user_count <= 1 && summary.total_count <= 1) return `${actor} poslal(a) zprávu správcům.`;
    if (summary.user_count <= 1) {
      return `${actor} poslal(a) správcům ${summary.total_count} ${formatCountWord(summary.total_count, "zprávu", "zprávy", "zpráv")}.`;
    }
    return `${summary.user_count} ${formatCountWord(summary.user_count, "uživatel", "uživatelé", "uživatelů")} poslali správcům ${summary.total_count} ${formatCountWord(summary.total_count, "zprávu", "zprávy", "zpráv")}.`;
  }

  if (summary.kind === "moderator_outreach") {
    if (summary.user_count <= 1 && summary.total_count <= 1) return `${actor} odpověděl(a) moderátorům.`;
    if (summary.user_count <= 1) {
      return `${actor} poslal(a) moderátorům ${summary.total_count} ${formatCountWord(summary.total_count, "zprávu", "zprávy", "zpráv")}.`;
    }
    return `${summary.user_count} ${formatCountWord(summary.user_count, "uživatel", "uživatelé", "uživatelů")} poslali moderátorům ${summary.total_count} ${formatCountWord(summary.total_count, "zprávu", "zprávy", "zpráv")}.`;
  }

  if (summary.kind === "image_report") {
    if (summary.user_count <= 1 && summary.total_count <= 1) return `${actor} nahlásil(a) fotku.`;
    if (summary.user_count <= 1) {
      return `${actor} nahlásil(a) ${summary.total_count} ${formatCountWord(summary.total_count, "fotku", "fotky", "fotek")}.`;
    }
    return `${summary.user_count} ${formatCountWord(summary.user_count, "uživatel", "uživatelé", "uživatelů")} nahlásili ${summary.total_count} ${formatCountWord(summary.total_count, "fotku", "fotky", "fotek")}.`;
  }

  if (summary.user_count <= 1 && summary.total_count <= 1) return `${actor} nahlásil(a) konverzaci.`;
  if (summary.user_count <= 1) {
    return `${actor} nahlásil(a) ${summary.total_count} ${formatCountWord(summary.total_count, "konverzaci", "konverzace", "konverzací")}.`;
  }
  return `${summary.user_count} ${formatCountWord(summary.user_count, "uživatel", "uživatelé", "uživatelů")} nahlásili ${summary.total_count} ${formatCountWord(summary.total_count, "konverzaci", "konverzace", "konverzací")}.`;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertSummary[]>([]);

  async function loadAll() {
    setLoading(true);
    try {
      const [items, adminAlertsResult] = await Promise.all([
        listMyNotifications(50),
        getMyAdminAlerts().catch(() => null),
      ]);
      setNotifications(items);
      setAdminAlerts(adminAlertsResult?.summaries ?? []);

      const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
      if (unreadIds.length > 0) {
        await markMyNotificationsRead(unreadIds);
        setNotifications((prev) =>
          prev.map((item) =>
            unreadIds.includes(item.id)
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
        window.dispatchEvent(new Event("aw-notifications-changed"));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upozornění se nepodařilo načíst.";
      await awAlert(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function handleAccept(notification: AppNotification) {
    if (!notification.entity_id) return;
    setBusyKey(`accept-${notification.id}`);
    try {
      await acceptConnectionRequest(notification.entity_id);
      window.dispatchEvent(new Event("aw-notifications-changed"));
      await loadAll();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Žádost se nepodařilo přijmout.";
      await awAlert(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDecline(notification: AppNotification) {
    if (!notification.entity_id) return;
    const message = await promptOptionalMessage("Chceš přidat zprávu k zamítnutí žádosti? Můžeš nechat prázdné.");
    if (message === null) return;
    setBusyKey(`decline-${notification.id}`);
    try {
      await declineConnectionRequest(notification.entity_id, message);
      window.dispatchEvent(new Event("aw-notifications-changed"));
      await loadAll();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Žádost se nepodařilo zamítnout.";
      await awAlert(message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="flex items-end justify-between gap-3">
          <div>
            <PageSectionTitle
              title="Upozornění"
              iconPath="/ui/Menu-upozorneni.ico"
              sizeClassName="text-[1.95rem]"
            />
            <p className="mt-1 text-sm text-slate-600">Přehled žádostí, reakcí v síti i komentářů k tvým fotkám.</p>
          </div>

          <div className="flex items-center gap-2">
            <HelpIconButton
              helpText="Upozornění shrnují síťové události i komentáře k tvým fotkám. Nastavení typů upozornění najdeš v samostatné sekci, ale tady stále rychle vyřídíš příchozí žádosti a otevřeš profil autora události."
              modalTitle="Nápověda – Upozornění"
            />
            <Link
              href="/network?tab=requests"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zobrazit všechny žádosti
            </Link>
            <Link
              href="/notifications/settings"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Nastavení upozornění
            </Link>
            <RefreshIconButton
              onClick={() => void loadAll()}
              disabled={loading || busyKey !== null}
              activeIconPath="/ui/refresh-rot.gif"
              activeDurationMs={5000}
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Načítám upozornění...</div>
        ) : notifications.length === 0 && adminAlerts.length === 0 ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Zatím tu nic není.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {adminAlerts.map((summary) => (
              <Link
                key={summary.kind}
                href={summary.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-amber-200 bg-amber-50/60 p-4 transition hover:bg-amber-50"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-amber-100">
                      {summary.latest_actor?.avatar_url ? (
                        <img
                          src={summary.latest_actor.avatar_url}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-amber-700">{adminAlertActorName(summary).charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{adminAlertText(summary)}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(summary.latest_at ?? "")}</div>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs font-semibold text-amber-700">Otevřít v administraci</div>
                </div>
              </Link>
            ))}

            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.is_read ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50/40"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                      {notification.actor?.avatar_url ? (
                        <img
                          src={notification.actor.avatar_url}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-600">{actorName(notification).charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{notificationText(notification)}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(notification.created_at)}</div>

                      {notification.type === "connection_request_received" && notification.request_message?.trim() ? (
                        <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-slate-700">
                          {notification.request_message.trim()}
                        </div>
                      ) : null}

                      {notification.actor_user_id ? (
                        <Link href={`/users/${notification.actor_user_id}`} className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline">
                          Otevřít profil
                        </Link>
                      ) : null}

                      {notificationImageHref(notification) ? (
                        <Link
                          href={notificationImageHref(notification) ?? "#"}
                          className="mt-2 ml-3 inline-block text-xs font-medium text-emerald-700 hover:underline"
                        >
                          Otevřít fotku a komentáře
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {notification.type === "connection_request_received" && notification.entity_id && notification.entity_status === "pending" ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDecline(notification)}
                        disabled={busyKey === `decline-${notification.id}` || busyKey === `accept-${notification.id}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Zamítnout
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAccept(notification)}
                        disabled={busyKey === `decline-${notification.id}` || busyKey === `accept-${notification.id}`}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Přijmout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Jaké typy upozornění chceš dostávat, upravíš v{" "}
          <Link href="/notifications/settings" className="underline">
            Nastavení upozornění
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
