/**
 * File purpose
 * - Shared inbox UI for admin/moderator message threads.
 * - Used by Admin zprávy and Moderátor zprávy pages.
 * - Related APIs, components, or modules
 *   - lib/api/staffMessages.ts
 *   - lib/api/messages.ts
 *   - components/admin/AdminSectionNav.tsx
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { awAlert } from "@/components/AwDialog";
import CloseButton from "@/components/CloseButton";
import { useAuth } from "@/components/auth/AuthContext";
import {
  listThreadMessages,
  markThreadRead,
  sendThreadMessage,
  type ThreadMessage,
} from "@/lib/api/messages";
import {
  getOrCreateAdminSupportThread,
  getOrCreateModeratorOutreachThread,
  listStaffThreads,
  searchStaffInboxUsers,
  type StaffInboxUserOption,
  type StaffThreadListItem,
  type StaffThreadScope,
} from "@/lib/api/staffMessages";
import AdminSectionNav from "@/components/admin/AdminSectionNav";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("cs-CZ");
}

function initialFromName(name: string | null | undefined) {
  const safe = (name ?? "").trim();
  return safe ? safe.charAt(0).toUpperCase() : "U";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function StaffInbox(props: {
  scope: StaffThreadScope;
  title: string;
  description: string;
  navActive: "admin_messages" | "moderator_messages";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const selectedThreadParam = Number(searchParams.get("thread") ?? 0) || null;
  const draftParam = searchParams.get("draft") ?? "";

  const [threads, setThreads] = useState<StaffThreadListItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(selectedThreadParam);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userOptions, setUserOptions] = useState<StaffInboxUserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );
  const unreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    [threads]
  );

  async function loadThreads(preferredThreadId?: number | null) {
    setThreadsLoading(true);
    try {
      const rows = await listStaffThreads(props.scope);
      setThreads(rows);
      const nextThreadId = preferredThreadId ?? selectedThreadParam ?? selectedThreadId ?? rows[0]?.threadId ?? null;
      setSelectedThreadId(nextThreadId);
    } catch (error) {
      await awAlert(getErrorMessage(error, "Inbox se nepodařilo načíst."));
    } finally {
      setThreadsLoading(false);
    }
  }

  async function loadMessages(threadId: number) {
    setMessagesLoading(true);
    try {
      const rows = await listThreadMessages(threadId, 200);
      setMessages(rows);
      await markThreadRead(threadId);
      await loadThreads(threadId);
      window.dispatchEvent(new Event("aw-messages-changed"));
    } catch (error) {
      await awAlert(getErrorMessage(error, "Zprávy se nepodařilo načíst."));
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    void loadThreads(selectedThreadParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.scope, selectedThreadParam]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    if (!draftParam.trim()) return;
    setDraft(draftParam);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("draft");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [draftParam, router, searchParams]);

  async function handleSend() {
    if (!selectedThreadId || !draft.trim()) return;
    setSending(true);
    try {
      await sendThreadMessage({ threadId: selectedThreadId, body: draft.trim() });
      setDraft("");
      await loadMessages(selectedThreadId);
      window.dispatchEvent(new Event("aw-messages-changed"));
    } catch (error) {
      await awAlert(getErrorMessage(error, "Zprávu se nepodařilo odeslat."));
    } finally {
      setSending(false);
    }
  }

  function openThread(threadId: number) {
    setSelectedThreadId(threadId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread", String(threadId));
    params.delete("draft");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  async function openThreadForUser(userId: string) {
    setOpeningUserId(userId);
    try {
      const threadId =
        props.scope === "admin_support"
          ? await getOrCreateAdminSupportThread(userId)
          : await getOrCreateModeratorOutreachThread(userId);

      setComposerOpen(false);
      setUserQuery("");
      setUserOptions([]);
      openThread(threadId);
      await loadThreads(threadId);
      await loadMessages(threadId);
    } catch (error) {
      await awAlert(getErrorMessage(error, "Konverzaci se nepodařilo otevřít."));
    } finally {
      setOpeningUserId(null);
    }
  }

  useEffect(() => {
    if (!composerOpen) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setUsersLoading(true);
      try {
        const rows = await searchStaffInboxUsers(userQuery, 12);
        if (!cancelled) setUserOptions(rows);
      } catch (error) {
        if (!cancelled) {
          setUserOptions([]);
          await awAlert(getErrorMessage(error, "Uživatele se nepodařilo načíst."));
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [composerOpen, userQuery]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Administrace</h1>
          <p className="text-sm text-slate-600">{props.description}</p>
        </div>

        <div className="mt-5">
          <AdminSectionNav active={props.navActive} />
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span>{props.title}</span>
              {unreadCount > 0 ? (
                <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white ${props.scope === "admin_support" ? "bg-rose-600" : "bg-sky-600"}`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Napsat zprávu
            </button>
          </div>
          {threadsLoading ? (
            <div className="text-sm text-slate-500">Načítám vlákna…</div>
          ) : threads.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Zatím tu nejsou žádná vlákna.</div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => {
                const isActive = thread.threadId === selectedThreadId;
                const hasUnread = thread.unreadCount > 0;
                return (
                  <button
                    key={thread.threadId}
                    type="button"
                    onClick={() => openThread(thread.threadId)}
                    className={[
                      "w-full rounded-2xl border px-3 py-3 text-left transition",
                      isActive ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {thread.subjectDisplayName ?? thread.subjectUserId}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {thread.lastMessageBody?.trim() || "Bez poslední zprávy."}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">{formatDateTime(thread.lastMessageCreatedAt)}</div>
                      </div>
                      {hasUnread ? (
                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                          {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selectedThread ? (
            <div className="flex min-h-[540px] items-center justify-center p-6 text-sm text-slate-500">
              {threadsLoading ? "Načítám…" : "Vyberte vlákno vlevo."}
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                    {selectedThread.subjectAvatarUrl ? (
                      <img
                        src={selectedThread.subjectAvatarUrl}
                        alt={selectedThread.subjectDisplayName ?? "Uživatel"}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-700">{initialFromName(selectedThread.subjectDisplayName)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">{selectedThread.subjectDisplayName ?? selectedThread.subjectUserId}</div>
                    <div className="text-xs text-slate-500">
                      {props.scope === "admin_support" ? "Sdílené vlákno adminů" : "Sdílené vlákno moderátorů a adminů"}
                    </div>
                  </div>
                  {selectedThread.subjectUserId ? (
                    <Link href={`/users/${selectedThread.subjectUserId}`} className="ml-auto text-sm font-medium text-sky-700 hover:underline">
                      Otevřít profil
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="min-h-[380px] space-y-3 overflow-y-auto bg-white px-5 py-4">
                {messagesLoading ? (
                  <div className="text-sm text-slate-500">Načítám zprávy…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-500">Ve vlákně zatím nejsou žádné zprávy.</div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderUserId === userId;
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isMine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                          <div className={`mb-2 text-xs font-semibold ${isMine ? "text-emerald-50" : "text-slate-600"}`}>
                            {message.senderDisplayName ?? message.senderUserId}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{message.body}</div>
                          <div className={`mt-2 text-[11px] ${isMine ? "text-emerald-50/80" : "text-slate-500"}`}>{formatDateTime(message.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-col gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    placeholder="Napiš odpověď…"
                    className="min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={sending || !draft.trim()}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? "Odesílám…" : "Odeslat"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {composerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-16" onClick={() => setComposerOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Napsat zprávu</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {props.scope === "admin_support"
                      ? "Vyber uživatele pro sdílené admin vlákno."
                      : "Vyber uživatele pro sdílené moderátorské vlákno."}
                  </div>
                </div>
                <CloseButton onClick={() => setComposerOpen(false)} label="Zavřít" />
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Hledat uživatele podle jména"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {usersLoading ? (
                <div className="text-sm text-slate-500">Načítám uživatele…</div>
              ) : userOptions.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Žádný uživatel neodpovídá hledání.
                </div>
              ) : (
                <div className="space-y-2">
                  {userOptions.map((user) => (
                    <button
                      key={user.user_id}
                      type="button"
                      onClick={() => void openThreadForUser(user.user_id)}
                      disabled={openingUserId === user.user_id}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.display_name ?? "Uživatel"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm font-bold text-slate-700">{initialFromName(user.display_name)}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{user.display_name ?? user.user_id}</div>
                        <div className="truncate text-xs text-slate-500">{user.user_id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
